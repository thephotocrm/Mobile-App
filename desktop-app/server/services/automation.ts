// Production URL fix - December 14, 2025
import { storage } from '../storage';
import { sendEmail, renderTemplate } from './email';
import { sendSms, renderSmsTemplate } from './sms';
import { db } from '../db';
import { contacts, automations, automationSteps, stages, templates, emailLogs, smsLogs, automationExecutions, photographers, projectSmartFiles, smartFiles, smartFilePages, projects, bookings, projectQuestionnaires, dripCampaigns, dripCampaignEmails, dripCampaignSubscriptions, dripEmailDeliveries, automationBusinessTriggers, galleries, shortLinks, users } from '@shared/schema';
import { eq, and, or, gte, lte, isNull, isNotNull, inArray } from 'drizzle-orm';
import { resolvePortalBaseUrl } from '../utils/portal-url';

// resolvePortalBaseUrl is now imported from ../utils/portal-url.ts

/**
 * CRITICAL FIX v2025.12.14.4: Self-healing helper for stale short links
 * Updates any short link with old Replit URLs to the correct production domain
 * This runs EVERY time a short link is looked up, regardless of automation execution status
 */
async function ensureShortLinkUpdated(shortLink: any, correctBaseUrl: string): Promise<void> {
  if (!shortLink || !shortLink.targetUrl) return;
  
  // Check if the short link has a stale Replit URL
  const hasReplitUrl = shortLink.targetUrl.includes('replit.dev') || 
                       shortLink.targetUrl.includes('replit.app') ||
                       shortLink.targetUrl.includes('repl.co');
  
  if (hasReplitUrl) {
    try {
      // Extract the path, query, and hash from the old URL and rebuild with correct domain
      const url = new URL(shortLink.targetUrl);
      const newTargetUrl = `${correctBaseUrl}${url.pathname}${url.search}${url.hash}`;
      
      console.log(`🔧 Self-healing stale short link ${shortLink.shortCode}: ${shortLink.targetUrl} → ${newTargetUrl}`);
      
      // Update database
      await db.update(shortLinks)
        .set({ targetUrl: newTargetUrl })
        .where(eq(shortLinks.id, shortLink.id));
      
      // Update in-memory object so subsequent code uses correct URL
      shortLink.targetUrl = newTargetUrl;
    } catch (error) {
      console.error(`❌ Failed to self-heal short link ${shortLink.shortCode}:`, error);
    }
  }
}

async function getParticipantEmailsForBCC(projectId: string): Promise<string[]> {
  try {
    const participants = await storage.getProjectParticipants(projectId);
    return participants
      .filter(p => p.contact.emailOptIn && p.contact.email)
      .map(p => p.contact.email);
  } catch (error) {
    console.error(`Error fetching participants for project ${projectId}:`, error);
    return [];
  }
}

// Helper to fetch gallery variables for a project
async function getGalleryVariables(projectId: string, photographerId: string, stageEnteredAt: Date | null): Promise<Record<string, string>> {
  try {
    // Fetch linked gallery for this project
    const [linkedGallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.projectId, projectId))
      .limit(1);
    
    // Fetch photographer for expiration settings
    const [photographer] = await db
      .select()
      .from(photographers)
      .where(eq(photographers.id, photographerId))
      .limit(1);
    
    // Use centralized portal URL resolver
    const baseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'getGalleryVariables');
    
    const galleryExpirationMonths = photographer?.galleryExpirationMonths || 6;
    
    // Calculate expiration date if stageEnteredAt is available
    let expirationDateStr = '';
    if (stageEnteredAt) {
      const expirationDate = new Date(stageEnteredAt);
      expirationDate.setMonth(expirationDate.getMonth() + galleryExpirationMonths);
      expirationDateStr = expirationDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return {
      gallery_link: linkedGallery ? `${baseUrl}/client/galleries/${linkedGallery.id}` : '',
      gallery_expiration: `${galleryExpirationMonths} months`,
      expiration_date: expirationDateStr,
      promo_code: 'ALBUM10'
    };
  } catch (error) {
    console.error(`Error fetching gallery variables for project ${projectId}:`, error);
    return {
      gallery_link: '',
      gallery_expiration: '6 months',
      expiration_date: '',
      promo_code: 'ALBUM10'
    };
  }
}

// Bulletproof automation execution tracking with reservation pattern
// Now includes retry logic for stale PENDING records (older than 2 minutes)
async function reserveAutomationExecution(
  projectId: string, 
  automationId: string, 
  automationType: string,
  channel: string,
  stepId?: string,
  triggerType?: string,
  eventDate?: Date,
  daysBefore?: number,
  timezone?: string
): Promise<{ canExecute: boolean; executionId: string | null }> {
  try {
    // First, check if there's an existing record for this execution
    let existingRecord = null;
    
    if (automationType === 'COMMUNICATION' && stepId) {
      // For communication automations with stepId, check by projectId + stepId
      const [existing] = await db.select()
        .from(automationExecutions)
        .where(and(
          eq(automationExecutions.projectId, projectId),
          eq(automationExecutions.automationStepId, stepId)
        ))
        .limit(1);
      existingRecord = existing;
    } else if (automationType === 'COMMUNICATION' && !stepId && channel) {
      // For email builder automations (no stepId), check by projectId + automationId + channel
      const [existing] = await db.select()
        .from(automationExecutions)
        .where(and(
          eq(automationExecutions.projectId, projectId),
          eq(automationExecutions.automationId, automationId),
          eq(automationExecutions.channel, channel)
        ))
        .limit(1);
      existingRecord = existing;
    } else if (automationType === 'STAGE_CHANGE' && triggerType) {
      // For stage change automations, check by projectId + automationId + triggerType
      const [existing] = await db.select()
        .from(automationExecutions)
        .where(and(
          eq(automationExecutions.projectId, projectId),
          eq(automationExecutions.automationId, automationId),
          eq(automationExecutions.triggerType, triggerType)
        ))
        .limit(1);
      existingRecord = existing;
    } else if (automationType === 'COUNTDOWN' && eventDate && daysBefore !== undefined) {
      // For countdown automations, normalize and check
      const photographerTimezone = timezone || 'America/Chicago';
      const eventDateKey = normalizeEventDateKey(eventDate, photographerTimezone);
      const normalizedEventDate = new Date(eventDateKey + 'T00:00:00.000Z');
      
      const [existing] = await db.select()
        .from(automationExecutions)
        .where(and(
          eq(automationExecutions.projectId, projectId),
          eq(automationExecutions.automationId, automationId),
          eq(automationExecutions.eventDate, normalizedEventDate),
          eq(automationExecutions.daysBefore, daysBefore)
        ))
        .limit(1);
      existingRecord = existing;
    }
    
    // If existing record found, check its status
    if (existingRecord) {
      // If already completed successfully, don't retry
      if (existingRecord.status === 'SUCCESS') {
        console.log(`🚫 Automation already completed successfully: ${automationType} for project ${projectId}`);
        return { canExecute: false, executionId: null };
      }
      
      // If PENDING and older than 1 hour, allow retry by updating the record
      // (Changed from 2 minutes to prevent mass-firing on server restart)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const executedAt = existingRecord.executedAt ? new Date(existingRecord.executedAt) : null;

      if (existingRecord.status === 'PENDING' && executedAt && executedAt < oneHourAgo) {
        console.log(`🔄 Retrying stale PENDING automation (was reserved at ${executedAt.toISOString()}): ${automationType} for project ${projectId}`);
        // Update the existing record to reset the timestamp
        await db.update(automationExecutions)
          .set({ executedAt: new Date(), status: 'PENDING' })
          .where(eq(automationExecutions.id, existingRecord.id));
        return { canExecute: true, executionId: existingRecord.id };
      }

      // If PENDING but still within 1 hour window, another process might be working on it
      if (existingRecord.status === 'PENDING') {
        console.log(`⏳ Automation reservation still fresh (within 1 hour), skipping: ${automationType} for project ${projectId}`);
        return { canExecute: false, executionId: null };
      }
      
      // If FAILED, allow retry
      if (existingRecord.status === 'FAILED') {
        console.log(`🔄 Retrying failed automation: ${automationType} for project ${projectId}`);
        await db.update(automationExecutions)
          .set({ executedAt: new Date(), status: 'PENDING' })
          .where(eq(automationExecutions.id, existingRecord.id));
        return { canExecute: true, executionId: existingRecord.id };
      }
    }
    
    // No existing record, create new one
    const executionData: any = {
      projectId,
      automationId,
      automationType,
      channel,
      status: 'PENDING'
    };

    // Add specific fields based on automation type
    if (automationType === 'COMMUNICATION' && stepId) {
      executionData.automationStepId = stepId;
    } else if (automationType === 'STAGE_CHANGE' && triggerType) {
      executionData.triggerType = triggerType;
    } else if (automationType === 'COUNTDOWN' && eventDate && daysBefore !== undefined) {
      // Normalize countdown to date-only key using photographer's timezone to prevent timezone/precision issues
      const photographerTimezone = timezone || 'America/Chicago';
      const eventDateKey = normalizeEventDateKey(eventDate, photographerTimezone);
      executionData.eventDate = new Date(eventDateKey + 'T00:00:00.000Z');
      executionData.daysBefore = daysBefore;
    }

    // Try to insert reservation record - this is the atomic reservation
    const result = await db.insert(automationExecutions).values(executionData).returning({ id: automationExecutions.id });
    
    console.log(`🔒 Automation execution reserved: ${automationType} for project ${projectId}`);
    return { canExecute: true, executionId: result[0].id };
  } catch (error) {
    // If it's a unique constraint violation, automation already reserved/executed
    if (error?.code === '23505') {
      console.log(`🚫 Automation execution already reserved/completed (race condition): ${automationType} for project ${projectId}`);
      return { canExecute: false, executionId: null };
    } else {
      console.error('Error reserving automation execution:', error);
      // On error, prevent execution to avoid duplicates (fail-safe approach)
      return { canExecute: false, executionId: null };
    }
  }
}

async function updateExecutionStatus(executionId: string, status: 'SUCCESS' | 'FAILED'): Promise<void> {
  try {
    await db
      .update(automationExecutions)
      .set({ status })
      .where(eq(automationExecutions.id, executionId));
    console.log(`✅ Updated execution status to ${status} for execution ${executionId}`);
  } catch (error) {
    console.error('Error updating execution status:', error);
  }
}

// Helper function to normalize event date to YYYY-MM-DD format in photographer's timezone
function normalizeEventDateKey(eventDate: Date, timezone: string = 'America/Chicago'): string {
  const dateInTz = getDateInTimezone(eventDate, timezone);
  return `${dateInTz.year}-${String(dateInTz.month + 1).padStart(2, '0')}-${String(dateInTz.day).padStart(2, '0')}`;
}

// Helper function to get date in photographer's timezone
function getDateInTimezone(date: Date, timezone: string): { year: number, month: number, day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  return {
    year: parseInt(parts.find(p => p.type === 'year')!.value),
    month: parseInt(parts.find(p => p.type === 'month')!.value) - 1, // Month is 0-indexed in Date
    day: parseInt(parts.find(p => p.type === 'day')!.value)
  };
}

interface ContactWithStage {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  weddingDate: Date | null;
  stageEnteredAt: Date | null;
  stageId: string | null;
  emailOptIn: boolean;
  smsOptIn: boolean;
  photographerId: string;
}

export async function processAutomations(photographerId: string): Promise<void> {
  try {
    console.log(`Processing automations for photographer: ${photographerId}`);
    // Get all enabled automations for this photographer
    const allAutomations = await db
      .select()
      .from(automations)
      .where(and(
        eq(automations.photographerId, photographerId),
        eq(automations.enabled, true)
      ));
      
    console.log(`Found ${allAutomations.length} enabled automations`);

    for (const automation of allAutomations) {
      try {
        console.log(`Processing automation: ${automation.name} (type: ${automation.automationType})`);
        if (automation.automationType === 'COMMUNICATION') {
          await processCommunicationAutomation(automation, photographerId);
        } else if (automation.automationType === 'STAGE_CHANGE') {
          await processStageChangeAutomation(automation, photographerId);
        } else if (automation.automationType === 'COUNTDOWN') {
          await processCountdownAutomation(automation, photographerId);
        } else if (automation.automationType === 'NURTURE') {
          await processNurtureAutomation(automation, photographerId);
        }
      } catch (error) {
        console.error(`Error processing automation ${automation.name} (${automation.automationType}):`, error);
      }
    }
  } catch (error) {
    console.error('Error processing automations:', error);
  }
}

// Check and trigger immediate OR LESS countdown stage changes when event date is set/updated
export async function checkImmediateCountdownStageChanges(
  projectId: string,
  photographerId: string,
  eventDate: Date
): Promise<void> {
  try {
    console.log(`📅 Checking immediate countdown stage changes for project ${projectId}`);
    
    // Get the project details
    const [project] = await db
      .select({
        id: projects.id,
        stageId: projects.stageId,
        projectType: projects.projectType,
        eventDate: projects.eventDate,
        status: projects.status,
        enableAutomations: projects.enableAutomations
      })
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (!project || project.status !== 'ACTIVE' || !project.enableAutomations) {
      console.log(`📅 Project ${projectId} not eligible for countdown automations`);
      return;
    }
    
    // Get photographer timezone
    const [photographer] = await db
      .select()
      .from(photographers)
      .where(eq(photographers.id, photographerId));
    
    const timezone = photographer?.timezone || 'America/Chicago';
    
    // Get current date in photographer's timezone
    const now = new Date();
    const todayParts = getDateInTimezone(now, timezone);
    const today = new Date(todayParts.year, todayParts.month, todayParts.day);
    
    // Get event date in photographer's timezone
    const eventDateParts = getDateInTimezone(eventDate, timezone);
    const eventDateOnly = new Date(eventDateParts.year, eventDateParts.month, eventDateParts.day);
    
    // Calculate days until event
    const daysFromEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Project ${projectId}: ${daysFromEvent} days from event`);
    
    // Get all COUNTDOWN automations with OR LESS enabled that have a targetStageId
    const orLessAutomations = await db
      .select()
      .from(automations)
      .where(and(
        eq(automations.photographerId, photographerId),
        eq(automations.enabled, true),
        eq(automations.automationType, 'COUNTDOWN'),
        eq(automations.orLess, true),
        isNotNull(automations.targetStageId),
        eq(automations.projectType, project.projectType)
      ));
    
    console.log(`📅 Found ${orLessAutomations.length} OR LESS countdown stage change automations`);
    
    // Sort automations by daysBefore (largest first) so we apply them in proper order
    // This ensures "60 days or less" fires before "30 days or less"
    const sortedAutomations = orLessAutomations.sort((a, b) => (b.daysBefore || 0) - (a.daysBefore || 0));
    
    for (const automation of sortedAutomations) {
      // Check stage condition if specified
      if (automation.stageCondition && project.stageId !== automation.stageCondition) {
        console.log(`📅 Automation ${automation.name} requires stage ${automation.stageCondition}, project is in ${project.stageId}, skipping`);
        continue;
      }
      
      const daysThreshold = automation.daysBefore || 0;
      
      // Check if project is within the threshold
      let shouldTrigger = false;
      if (automation.triggerTiming === 'AFTER') {
        // "X days after OR MORE" - trigger if event is in the past and days since event >= threshold
        const daysSinceEvent = -daysFromEvent;
        shouldTrigger = daysSinceEvent >= daysThreshold;
      } else {
        // "X days before OR LESS" - trigger if days remaining <= threshold (and event is in future)
        shouldTrigger = daysFromEvent >= 0 && daysFromEvent <= daysThreshold;
      }
      
      if (shouldTrigger) {
        console.log(`📅 Triggering immediate countdown stage change: ${automation.name} (${daysThreshold} days or less, actual: ${daysFromEvent})`);
        
        // Create a project object for executeCountdownStageChange
        const projectForChange = {
          id: project.id,
          stageId: project.stageId,
          eventDate: project.eventDate
        };
        
        await executeCountdownStageChange(projectForChange, automation, photographerId, daysFromEvent, timezone);
      }
    }
  } catch (error) {
    console.error(`Error checking immediate countdown stage changes for project ${projectId}:`, error);
  }
}

async function processCommunicationAutomation(automation: any, photographerId: string): Promise<void> {
  // Check if this is a custom email builder automation
  // Note: useEmailBuilder automations may use emailBlocks (legacy) or templateBody (new pattern from bulk-create)
  if (automation.useEmailBuilder) {
    await processEmailBuilderAutomation(automation, photographerId);
    return;
  }

  // Get automation steps for communication (email/SMS)
  const steps = await db
    .select()
    .from(automationSteps)
    .where(and(
      eq(automationSteps.automationId, automation.id),
      eq(automationSteps.enabled, true)
    ))
    .orderBy(automationSteps.stepIndex);

  // Get projects in this stage with automations enabled
  const projectsInStage = await db
    .select({
      id: projects.id,
      contactId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      smsOptIn: contacts.smsOptIn,
      emailOptIn: contacts.emailOptIn,
      photographerId: projects.photographerId,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.stageId, automation.stageId!),
      eq(projects.projectType, automation.projectType), // Only fire for matching project type
      eq(projects.enableAutomations, true) // Only process projects with automations enabled
    ));

  console.log(`Communication automation "${automation.name}" (${automation.id}) - found ${projectsInStage.length} projects in stage`);

  for (const project of projectsInStage) {
    // Process communication steps (email/SMS)
    for (const step of steps) {
      await processAutomationStep(project, step, automation);
    }
    
    // Process questionnaire assignment if configured
    if (automation.questionnaireTemplateId) {
      await processQuestionnaireAssignment(project, automation, photographerId);
    }
  }
}

async function processEmailBuilderAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`📧 Processing email builder automation: ${automation.name}`);
  
  // Get projects in this stage with automations enabled
  const projectsInStage = await db
    .select({
      id: projects.id,
      contactId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      smsOptIn: contacts.smsOptIn,
      emailOptIn: contacts.emailOptIn,
      photographerId: projects.photographerId,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.stageId, automation.stageId!),
      eq(projects.projectType, automation.projectType), // Only fire for matching project type
      eq(projects.enableAutomations, true) // Only process projects with automations enabled
    ));

  console.log(`Email builder automation "${automation.name}" (${automation.id}) - found ${projectsInStage.length} projects in stage`);

  // Fetch automation steps to get delay configuration
  const steps = await db
    .select()
    .from(automationSteps)
    .where(and(
      eq(automationSteps.automationId, automation.id),
      eq(automationSteps.enabled, true)
    ))
    .orderBy(automationSteps.stepIndex);

  const firstStep = steps[0];
  const delayMinutes = firstStep?.delayMinutes || 0;
  console.log(`📧 Email builder automation delay: ${delayMinutes} minutes`);

  for (const project of projectsInStage) {
    try {
      console.log(`Processing email builder step for contact ${project.firstName} ${project.lastName} (${project.email})`);

      // Check email opt-in
      if (!project.emailOptIn) {
        console.log(`📧 Email opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
        continue;
      }

      // Check email address exists
      if (!project.email) {
        console.log(`📧 No email address for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
        continue;
      }

      // Check stage entry date
      if (!project.stageEnteredAt) {
        console.log(`❌ No stageEnteredAt date for contact ${project.firstName} ${project.lastName}, skipping`);
        continue;
      }

      // Calculate timing using delay from automation step
      const stageEnteredAt = new Date(project.stageEnteredAt);
      const shouldSendAt = new Date(stageEnteredAt.getTime() + (delayMinutes * 60 * 1000));
      const now = new Date();
      
      // Check if it's time to send
      if (now < shouldSendAt) {
        console.log(`⏰ Too early to send for ${project.firstName} ${project.lastName}. Should send at: ${shouldSendAt}, now: ${now}`);
        continue;
      }
      
      // Reserve execution atomically
      // For email builder automations, don't pass stepId (uses automation+channel uniqueness)
      const reservation = await reserveAutomationExecution(
        project.id,
        automation.id,
        'COMMUNICATION',
        'EMAIL'
        // No stepId for email builder automations - uniqueness via automationId+channel constraint
      );
      
      if (!reservation.canExecute) {
        console.log(`🔒 Automation already reserved/executed for ${project.firstName} ${project.lastName}, prevented duplicate (bulletproof reservation)`);
        continue;
      }
      
      // Get photographer info for branding and variables
      const [photographer] = await db
        .select()
        .from(photographers)
        .where(eq(photographers.id, project.photographerId));
      
      if (!photographer) {
        console.log(`❌ Photographer not found for ${project.photographerId}`);
        await updateExecutionStatus(reservation.executionId!, 'FAILED');
        continue;
      }
      
      // Use centralized portal URL resolver
      const baseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'processEmailBuilderAutomation');

      // Check if using new templateBody pattern or legacy emailBlocks
      const useTemplateBody = !!automation.templateBody;

      let emailBlocks: any[] = [];
      let smartFileToken: string | undefined;

      if (!useTemplateBody) {
        // Legacy emailBlocks pattern - parse the blocks
        try {
          emailBlocks = typeof automation.emailBlocks === 'string'
            ? JSON.parse(automation.emailBlocks)
            : (automation.emailBlocks || []);
        } catch (error) {
          console.error(`❌ Failed to parse emailBlocks for automation ${automation.name}:`, error);
          await updateExecutionStatus(reservation.executionId!, 'FAILED');
          continue;
        }

        // Check for Smart File links in buttons (legacy emailBlocks only)
        for (const block of emailBlocks) {
          if (block.type === 'BUTTON' && block.content?.linkType === 'SMART_FILE' && block.content?.linkValue) {
            // Create a project Smart File from the template
            const smartFileTemplateId = block.content.linkValue;
          
          if (!smartFileTemplateId) {
            console.error(`❌ Smart File linkValue is null or undefined in button block`);
            continue;
          }
          
          // Check if Smart File already exists for this project
          const existingProjectSmartFile = await db
            .select()
            .from(projectSmartFiles)
            .where(and(
              eq(projectSmartFiles.projectId, project.id),
              eq(projectSmartFiles.smartFileId, smartFileTemplateId)
            ))
            .limit(1);
          
          if (existingProjectSmartFile.length > 0) {
            smartFileToken = existingProjectSmartFile[0].token || undefined;
            console.log(`📄 Using existing Smart File token: ${smartFileToken}`);
          } else {
            // Fetch smart file template to get its name and pages
            const [smartFileTemplate] = await db
              .select()
              .from(smartFiles)
              .where(eq(smartFiles.id, smartFileTemplateId))
              .limit(1);
            
            if (!smartFileTemplate) {
              console.error(`❌ Smart File template not found: ${smartFileTemplateId}`);
              continue;
            }
            
            // Get pages for this smart file
            const pages = await db
              .select()
              .from(smartFilePages)
              .where(eq(smartFilePages.smartFileId, smartFileTemplateId))
              .orderBy(smartFilePages.pageOrder);
            
            // Create new project Smart File with all required fields
            const token = `sf_${Math.random().toString(36).substring(2, 15)}`;
            await storage.createProjectSmartFile({
              projectId: project.id,
              smartFileId: smartFileTemplateId,
              photographerId: project.photographerId,
              clientId: project.contactId,
              smartFileName: smartFileTemplate.name,
              pagesSnapshot: pages,
              token,
              status: 'SENT',
              sentAt: new Date()
            });
            smartFileToken = token;
            console.log(`📄 Created new Smart File with token: ${smartFileToken}`);
          }
          
          break; // Only need one Smart File per automation
          }
        }
      } // End of legacy emailBlocks handling
      
      // Prepare variables for template rendering
      const formatEventDate = (dateValue: any): string => {
        if (!dateValue) return 'Not set';
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return 'Not set';
          return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch (error) {
          return 'Not set';
        }
      };
      
      // Fetch gallery variables
      const galleryVars = await getGalleryVariables(project.id, project.photographerId, project.stageEnteredAt);
      
      const variables = {
        firstName: project.firstName,
        lastName: project.lastName,
        fullName: `${project.firstName} ${project.lastName}`,
        email: project.email || '',
        phone: project.phone || '',
        businessName: photographer?.businessName || 'Your Photographer',
        photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
        eventDate: formatEventDate(project.eventDate),
        weddingDate: formatEventDate(project.eventDate),
        first_name: project.firstName,
        last_name: project.lastName,
        full_name: `${project.firstName} ${project.lastName}`,
        business_name: photographer?.businessName || 'Your Photographer',
        photographer_name: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
        event_date: formatEventDate(project.eventDate),
        wedding_date: formatEventDate(project.eventDate),
        smart_file_link: smartFileToken ? `${baseUrl}/smart-file/${smartFileToken}` : '',
        calendar_link: photographer?.portalSlug 
          ? `${baseUrl}/book` 
          : (photographer?.publicToken ? `${baseUrl}/booking/calendar/${photographer.publicToken}` : ''),
        testimonials_link: `${baseUrl}/reviews/submit/${photographerId}`,
        ...galleryVars
      };
      
      // Generate email content based on pattern used
      let htmlBody: string;
      let textBody: string;

      if (useTemplateBody) {
        // New templateBody pattern - render HTML with variable substitution
        const { generateEmailHeader, generateEmailSignature } = await import('@shared/email-branding-shared');

        // Start with templateBody content, convert to HTML
        let bodyHtml = automation.htmlBody || automation.templateBody
          .split('\n\n')
          .filter((p: string) => p.trim())
          .map((p: string) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
          .join('');

        // Process [[BUTTON:...]] markers
        bodyHtml = bodyHtml.replace(/\[\[BUTTON:([^:]+):([^\]]+)\]\]/g, (_match: string, type: string, label: string) => {
          let href = '#';
          if (type === 'CALENDAR') href = variables.calendar_link || '#';
          else if (type === 'SMART_FILE') href = variables.smart_file_link || '#';
          else if (type === 'TESTIMONIALS') href = variables.testimonials_link || '#';
          else if (type === 'GALLERY') href = (galleryVars as any).gallery_link || '#';
          return `<a href="${href}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">${label}</a>`;
        });

        // Substitute variables
        htmlBody = renderTemplate(bodyHtml, variables);
        textBody = renderTemplate(automation.templateBody, variables);

        // Add header if configured
        if (automation.includeHeader) {
          const headerHtml = generateEmailHeader(photographer as any, automation.headerStyle || 'professional');
          htmlBody = headerHtml + htmlBody;
        }

        // Add signature if configured
        if (automation.includeSignature !== false) {
          const signatureHtml = generateEmailSignature(photographer as any, automation.signatureStyle || 'professional');
          htmlBody = htmlBody + signatureHtml;
        }

        console.log(`📧 Using templateBody pattern for automation: ${automation.name}`);
      } else {
        // Legacy emailBlocks pattern - use generateEmailFromBlocks
        const { generateEmailFromBlocks } = await import('@shared/email-branding-shared');

        // Auto-migrate legacy automations: add missing HEADER/SIGNATURE blocks based on flags
        const hasHeaderBlock = emailBlocks.some((b: any) => b.type === 'HEADER');
        const hasSignatureBlock = emailBlocks.some((b: any) => b.type === 'SIGNATURE');

        if (!hasHeaderBlock && automation.includeHeader) {
          emailBlocks.unshift({
            id: `header-${Date.now()}`,
            type: 'HEADER',
            style: automation.headerStyle || photographer.emailHeaderStyle || 'professional'
          });
        }

        if (!hasSignatureBlock && automation.includeSignature !== false) {
          emailBlocks.push({
            id: `signature-${Date.now()}`,
            type: 'SIGNATURE',
            style: automation.signatureStyle || photographer.emailSignatureStyle || 'professional'
          });
        }

        const result = generateEmailFromBlocks(
          emailBlocks as any,
          variables,
          photographer,
          { baseUrl }
        );
        htmlBody = result.htmlBody;
        textBody = result.textBody;
        console.log(`📧 Using legacy emailBlocks pattern for automation: ${automation.name}`);
      }
      
      // Render subject line
      const subject = automation.emailSubject || 'New Message';
      const renderedSubject = renderTemplate(subject, variables);
      
      // Send email with verified sender address
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
      const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
      const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
      
      try {
        const emailResult = await sendEmail({
          to: project.email,
          from: `${fromName} <${fromEmail}>`,
          replyTo: `${fromName} <${replyToEmail}>`,
          subject: renderedSubject,
          html: htmlBody,
          photographerId: photographer.id,
          clientId: project.contactId,
          projectId: project.id,
          source: 'AUTOMATION'
        });
        
        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Email send failed');
        }
        
        console.log(`✅ Email sent successfully to ${project.firstName} ${project.lastName}`);
        await updateExecutionStatus(reservation.executionId!, 'SUCCESS');
      } catch (error) {
        console.error(`❌ Failed to send email to ${project.firstName} ${project.lastName}:`, error);
        await updateExecutionStatus(reservation.executionId!, 'FAILED');
      }
    } catch (error) {
      console.error(`❌ Error processing email builder for ${project.firstName} ${project.lastName}:`, error);
    }
  }
}

async function processStageChangeAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing stage change automation: ${automation.name}`);
  
  // Load business triggers for this automation from the new table
  const businessTriggers = await db
    .select()
    .from(automationBusinessTriggers)
    .where(and(
      eq(automationBusinessTriggers.automationId, automation.id),
      eq(automationBusinessTriggers.enabled, true)
    ));

  if (businessTriggers.length === 0) {
    console.log(`No enabled business triggers found for automation ${automation.name}, skipping`);
    return;
  }

  console.log(`Found ${businessTriggers.length} enabled business triggers for automation: ${businessTriggers.map(t => t.triggerType).join(', ')}`);
  
  // Get all active projects for this photographer and project type with automations enabled
  // Include projects with NULL status (treat as ACTIVE) and explicitly ACTIVE status
  // Flatten select to avoid Drizzle's nested object issue with table references
  const activeProjectRows = await db
    .select({
      projectId: projects.id,
      projectPhotographerId: projects.photographerId,
      projectClientId: projects.clientId,
      projectTitle: projects.title,
      projectType: projects.projectType,
      projectEventDate: projects.eventDate,
      projectHasEventDate: projects.hasEventDate,
      projectStageId: projects.stageId,
      projectStageEnteredAt: projects.stageEnteredAt,
      projectLeadSource: projects.leadSource,
      projectStatus: projects.status,
      projectSmsOptIn: projects.smsOptIn,
      projectEmailOptIn: projects.emailOptIn,
      projectNotes: projects.notes,
      projectEnableAutomations: projects.enableAutomations,
      projectCreatedAt: projects.createdAt,
      contactId: contacts.id,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
      contactSmsOptIn: contacts.smsOptIn,
      contactEmailOptIn: contacts.emailOptIn
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(projects.photographerId, photographerId),
      eq(projects.projectType, automation.projectType),
      eq(projects.enableAutomations, true), // Only process projects with automations enabled
      or(
        eq(projects.status, 'ACTIVE'),
        isNull(projects.status) // Include NULL status as ACTIVE
      )
    ));

  console.log(`Found ${activeProjectRows.length} active projects to check for business triggers`);

  for (const row of activeProjectRows) {
    // Reconstruct project object from flattened row
    const project = {
      id: row.projectId,
      photographerId: row.projectPhotographerId,
      clientId: row.projectClientId,
      title: row.projectTitle,
      projectType: row.projectType,
      eventDate: row.projectEventDate,
      hasEventDate: row.projectHasEventDate,
      stageId: row.projectStageId,
      stageEnteredAt: row.projectStageEnteredAt,
      leadSource: row.projectLeadSource,
      status: row.projectStatus,
      smsOptIn: row.projectSmsOptIn,
      emailOptIn: row.projectEmailOptIn,
      notes: row.projectNotes,
      enableAutomations: row.projectEnableAutomations,
      createdAt: row.projectCreatedAt
    };
    
    // If automation has a source stage filter, only process projects in that stage
    if (automation.stageId && project.stageId !== automation.stageId) {
      // Project not in the required source stage, skip
      continue;
    }
    
    // Check each business trigger - if any trigger is satisfied, execute the automation
    for (const businessTrigger of businessTriggers) {
      // First check if trigger condition is met (don't reserve if not triggered)
      // Pass effectiveFrom to prevent firing for events that occurred before automation was created
      const effectiveFrom = automation.effectiveFrom ? new Date(automation.effectiveFrom) : undefined;
      const shouldTrigger = await checkTriggerCondition(businessTrigger.triggerType, project, photographerId, effectiveFrom);
      
      if (!shouldTrigger) {
        // Trigger condition not met, try next trigger
        continue;
      }
      
      // Additional constraint checks for business triggers
      if (businessTrigger.minAmountCents && !await checkMinAmountConstraint(project.id, businessTrigger.minAmountCents)) {
        console.log(`Min amount constraint not met for business trigger ${businessTrigger.triggerType}, skipping`);
        continue;
      }
      
      if (businessTrigger.projectType && project.projectType !== businessTrigger.projectType) {
        console.log(`Project type constraint not met for business trigger ${businessTrigger.triggerType}, skipping`);
        continue;
      }

      // 🔒 BULLETPROOF DUPLICATE PREVENTION - Reserve stage change execution atomically (ONLY after trigger confirmed)
      const reservation = await reserveAutomationExecution(
        project.id, // projectId
        automation.id, // automationId
        'STAGE_CHANGE', // automationType
        'SYSTEM', // channel (stage changes are system actions)
        undefined, // stepId (not used for stage change)
        businessTrigger.triggerType // triggerType
      );
      
      if (!reservation.canExecute) {
        console.log(`🔒 Stage change automation already reserved/executed for project ${project.id} (trigger: ${businessTrigger.triggerType}), prevented duplicate`);
        // Try next trigger (maybe a different trigger can still execute)
        continue;
      }
      
      // 🔒 BULLETPROOF ERROR HANDLING - Wrap stage change execution to prevent PENDING reservations on errors
      try {
        // Execute the stage change
        console.log(`✅ Business trigger "${businessTrigger.triggerType}" matched for project ${project.id}, moving to stage ${automation.targetStageId}`);
        await moveProjectToStage(project.id, automation.targetStageId!);
        // 🔒 BULLETPROOF EXECUTION TRACKING - Update stage change reservation status  
        await updateExecutionStatus(reservation.executionId!, 'SUCCESS');
        
        // Break out of trigger loop - automation executed successfully
        break;
      } catch (error) {
        console.error(`❌ Error executing stage change for project ${project.id}:`, error);
        // 🔒 BULLETPROOF ERROR HANDLING - Mark reservation as FAILED on any error to prevent PENDING state
        await updateExecutionStatus(reservation.executionId!, 'FAILED');
        // Continue trying other triggers - don't break on error
      }
    }
  }
}

async function processAutomationStep(project: any, step: any, automation: any): Promise<void> {
  // NOTE: This function receives project data (not contact data), but was historically named 'contact'.
  // project.id = project ID, project.contactId = contact ID, project.firstName/lastName/email = contact details
  const projectId = project.id;
  console.log(`Processing step for ${project.firstName} ${project.lastName} (${project.email}), project: ${projectId}`);
  
  // Determine anchor type (default to STAGE_ENTRY for backward compatibility)
  const anchorType = step.anchorType || 'STAGE_ENTRY';
  
  // For stage-entry based automations, require stageEnteredAt
  if (anchorType === 'STAGE_ENTRY') {
    if (!project.stageEnteredAt) {
      console.log(`❌ No stageEnteredAt date for project ${projectId}, skipping`);
      return;
    }
  }
  
  // For booking-relative automations, fetch the booking
  let anchorTime: Date;
  let booking: any = null;
  
  if (anchorType === 'BOOKING_START' || anchorType === 'BOOKING_END') {
    // Fetch the most recent upcoming or recent booking for this project
    // Note: Excludes CANCELLED bookings, includes CONFIRMED, PENDING, and COMPLETED
    console.log(`📅 Fetching bookings for project ${projectId} with anchor type ${anchorType}`);
    const projectBookings = await db.select()
      .from(bookings)
      .where(and(
        eq(bookings.projectId, projectId),
        or(
          eq(bookings.status, 'CONFIRMED'),
          eq(bookings.status, 'PENDING'),
          eq(bookings.status, 'COMPLETED')
        )
      ))
      .orderBy(bookings.startAt);
    
    if (projectBookings.length === 0) {
      console.log(`📅 No active booking found for project ${projectId}, skipping booking-relative automation`);
      return;
    }
    
    console.log(`📅 Found ${projectBookings.length} booking(s) for project ${projectId}`);
    
    // Use the first upcoming booking, or the most recent one if all are in the past
    const now = new Date();
    booking = projectBookings.find(b => new Date(b.startAt) > now) || projectBookings[projectBookings.length - 1];
    
    if (anchorType === 'BOOKING_START') {
      anchorTime = new Date(booking.startAt);
      console.log(`📅 Using booking start time as anchor: ${anchorTime.toISOString()} (booking: ${booking.id})`);
    } else {
      anchorTime = new Date(booking.endAt);
      console.log(`📅 Using booking end time as anchor: ${anchorTime.toISOString()} (booking: ${booking.id})`);
    }
  } else {
    // Default: use stage entry time
    anchorTime = new Date(project.stageEnteredAt);
  }

  // Check effectiveFrom: only run on projects where stage entry is AFTER automation was created
  if (automation.effectiveFrom && project.stageEnteredAt) {
    const stageEnteredAt = new Date(project.stageEnteredAt);
    const effectiveFrom = new Date(automation.effectiveFrom);
    if (stageEnteredAt < effectiveFrom) {
      console.log(`⏸️ Project entered stage before automation was created (entered: ${stageEnteredAt.toISOString()}, effective: ${effectiveFrom.toISOString()}), skipping`);
      return;
    }
  }

  // Check event date condition
  if (automation.eventDateCondition) {
    if (automation.eventDateCondition === 'HAS_EVENT_DATE' && !project.eventDate) {
      console.log(`📅 ${project.firstName} ${project.lastName} does not have event date (required by automation), skipping`);
      return;
    }
    if (automation.eventDateCondition === 'NO_EVENT_DATE' && project.eventDate) {
      console.log(`📅 ${project.firstName} ${project.lastName} has event date (automation requires no date), skipping`);
      return;
    }
  }

  const now = new Date();
  const stageEnteredAt = anchorTime; // Use anchor time (could be stage entry or booking time)
  
  // Calculate the target send date/time
  let shouldSendAt: Date;
  
  // Helper: Get full date/time components in photographer's timezone
  const getDateTimeInTimezone = (date: Date, timezone: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    return {
      year: parseInt(parts.find(p => p.type === 'year')!.value),
      month: parseInt(parts.find(p => p.type === 'month')!.value) - 1, // 0-indexed
      day: parseInt(parts.find(p => p.type === 'day')!.value),
      hour: parseInt(parts.find(p => p.type === 'hour')!.value),
      minute: parseInt(parts.find(p => p.type === 'minute')!.value)
    };
  };
  
  // Helper: Create UTC Date from local date/time components
  const createUTCFromLocal = (year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date => {
    // Create a date string in ISO format
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    
    // This creates a date in UTC
    const dateStr = `${year}-${monthStr}-${dayStr}T${hourStr}:${minStr}:00`;
    const utcDate = new Date(dateStr + 'Z'); // Z means UTC
    
    // Get what time this would be in the target timezone
    const tzComponents = getDateTimeInTimezone(utcDate, timezone);
    
    // Calculate offset: how many milliseconds do we need to adjust?
    const targetMs = new Date(year, month, day, hour, minute, 0).getTime();
    const tzMs = new Date(tzComponents.year, tzComponents.month, tzComponents.day, tzComponents.hour, tzComponents.minute, 0).getTime();
    const offsetMs = targetMs - tzMs;
    
    // Apply offset to get correct UTC time
    return new Date(utcDate.getTime() + offsetMs);
  };
  
  // MODE 1: Day-based scheduling with specific send time (e.g., "1 day @ 9:00 AM")
  if (step.delayDays && step.delayDays >= 1 && (step.sendAtHour !== null && step.sendAtHour !== undefined)) {
    const photographerTimezone = photographer.timezone || 'America/New_York';
    
    // Get trigger date/time in photographer's timezone
    const triggerInTz = getDateTimeInTimezone(stageEnteredAt, photographerTimezone);
    
    // Add delay days to get target date
    const targetDate = new Date(triggerInTz.year, triggerInTz.month, triggerInTz.day);
    targetDate.setDate(targetDate.getDate() + step.delayDays);
    
    // Create UTC timestamp for target day at specified send time
    shouldSendAt = createUTCFromLocal(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      step.sendAtHour,
      step.sendAtMinute || 0,
      photographerTimezone
    );
    
    console.log(`📅 Day-based scheduling: ${step.delayDays} day(s) @ ${step.sendAtHour}:${String(step.sendAtMinute || 0).padStart(2, '0')} in ${photographerTimezone}`);
    console.log(`   Trigger: ${stageEnteredAt.toISOString()} → Target: ${shouldSendAt.toISOString()}`);
    
    // Edge case: If calculated time is in the past, advance by 1 day
    if (shouldSendAt.getTime() < now.getTime()) {
      console.log(`⚠️ Calculated send time is in the past, advancing by 1 day`);
      targetDate.setDate(targetDate.getDate() + 1);
      shouldSendAt = createUTCFromLocal(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        step.sendAtHour,
        step.sendAtMinute || 0,
        photographerTimezone
      );
    }
  }
  // MODE 2: Exact delay (e.g., "2 hours 30 minutes")
  else if (!step.delayDays || step.delayDays === 0) {
    // Pure offset from trigger time
    const delayMs = step.delayMinutes * 60 * 1000;
    shouldSendAt = new Date(stageEnteredAt.getTime() + delayMs);
  }
  // LEGACY: Backward compatibility for old scheduledHour usage
  else if (step.scheduledHour !== null && step.scheduledHour !== undefined) {
    const delayDays = Math.floor(step.delayMinutes / (24 * 60));
    shouldSendAt = new Date(stageEnteredAt);
    shouldSendAt.setDate(shouldSendAt.getDate() + delayDays);
    shouldSendAt.setHours(step.scheduledHour, step.scheduledMinute || 0, 0, 0);
    
    if (delayDays === 0 && shouldSendAt.getTime() < stageEnteredAt.getTime()) {
      shouldSendAt.setDate(shouldSendAt.getDate() + 1);
    }
  }
  // FALLBACK: Just use delay minutes
  else {
    const delayMs = step.delayMinutes * 60 * 1000;
    shouldSendAt = new Date(stageEnteredAt.getTime() + delayMs);
  }

  // Check if it's time to send
  if (now < shouldSendAt) {
    console.log(`⏰ Too early to send for ${project.firstName} ${project.lastName}. Should send at: ${shouldSendAt}, now: ${now}`);
    return;
  }

  // Check quiet hours
  if (step.quietHoursStart && step.quietHoursEnd) {
    const currentHour = now.getHours();
    const start = step.quietHoursStart;
    const end = step.quietHoursEnd;
    
    // Handle both midnight-crossing and non-midnight-crossing quiet hours
    const inQuietHours = start <= end 
      ? (currentHour >= start && currentHour <= end)  // Non-crossing: 9-17
      : (currentHour >= start || currentHour <= end); // Crossing: 22-6
    
    if (inQuietHours) {
      console.log(`🌙 In quiet hours for ${project.firstName} ${project.lastName}, current hour: ${currentHour}`);
      return; // In quiet hours
    }
  }

  // 🔒 BULLETPROOF PRECONDITION CHECKS - Validate ALL conditions BEFORE reserving execution
  
  // Determine action type from step or fallback to automation channel
  const actionType = step.actionType || automation.channel;
  
  // Check consent FIRST (before any reservation)
  if (actionType === 'EMAIL' && !project.emailOptIn) {
    console.log(`📧 Email opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMS' && !project.smsOptIn) {
    console.log(`📱 SMS opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  // Smart File doesn't require explicit opt-in (it's part of the service agreement)

  // Check contact info EARLY (before reservation)
  if (actionType === 'EMAIL' && !project.email) {
    console.log(`📧 No email address for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMS' && !project.phone) {
    console.log(`📱 No phone number for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  if (actionType === 'SMART_FILE' && !project.email) {
    console.log(`📄 No email address for Smart File notification for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }

  // Check template/Smart File exists BEFORE reservation
  let template: any = null;
  let smartFileTemplate: any = null;
  
  if (actionType === 'SMART_FILE') {
    if (!step.smartFileTemplateId) {
      console.log(`📄 No Smart File template ID for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
      return;
    }
    
    [smartFileTemplate] = await db
      .select()
      .from(smartFiles)
      .where(and(
        eq(smartFiles.id, step.smartFileTemplateId),
        eq(smartFiles.photographerId, project.photographerId)
      ));

    if (!smartFileTemplate) {
      console.log(`📄 Smart File template not found for ${project.firstName} ${project.lastName}, templateId: ${step.smartFileTemplateId}, skipping (no reservation)`);
      return;
    }
  } else {
    // For SMS, allow either template OR custom content
    if (actionType === 'SMS') {
      if (!step.templateId && !step.customSmsContent) {
        console.log(`📝 No template ID or custom SMS content for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
        return;
      }
      
      // Only fetch template if templateId is provided
      if (step.templateId) {
        [template] = await db
          .select()
          .from(templates)
          .where(and(
            eq(templates.id, step.templateId),
            eq(templates.photographerId, project.photographerId)
          ));

        if (!template) {
          console.log(`📝 Template not found for ${project.firstName} ${project.lastName}, templateId: ${step.templateId}, skipping (no reservation)`);
          return;
        }

        // Validate template-channel match BEFORE reservation
        if (template.channel !== actionType) {
          console.log(`❌ Template channel mismatch for automation ${automation.name}: template=${template.channel}, action=${actionType}, skipping (no reservation)`);
          return;
        }
      }
    } else {
      // For EMAIL and other types, template is required
      if (!step.templateId) {
        console.log(`📝 No template ID for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
        return;
      }
      
      [template] = await db
        .select()
        .from(templates)
        .where(and(
          eq(templates.id, step.templateId),
          eq(templates.photographerId, project.photographerId)
        ));

      if (!template) {
        console.log(`📝 Template not found for ${project.firstName} ${project.lastName}, templateId: ${step.templateId}, skipping (no reservation)`);
        return;
      }

      // Validate template-channel match BEFORE reservation
      if (template.channel !== actionType) {
        console.log(`❌ Template channel mismatch for automation ${automation.name}: template=${template.channel}, action=${actionType}, skipping (no reservation)`);
        return;
      }
    }
  }

  // 🔒 BULLETPROOF DUPLICATE PREVENTION - Reserve execution atomically (ONLY after ALL preconditions pass)
  const reservation = await reserveAutomationExecution(
    project.id, // projectId
    automation.id, // automationId
    'COMMUNICATION', // automationType
    automation.channel, // channel
    step.id // stepId
  );
  
  if (!reservation.canExecute) {
    console.log(`🔒 Automation already reserved/executed for ${project.firstName} ${project.lastName}, prevented duplicate (bulletproof reservation)`);
    return;
  }

  // Get photographer info for businessName
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, project.photographerId));
  
  // 🔍 DEBUG v2025.12.14.2: Trace execution AFTER reservation succeeds
  console.log(`🎯 COMM AUTOMATION EXECUTING: actionType=${actionType}, stepId=${step.id}, projectId=${project.id}`);
  
  // Use centralized portal URL resolver for other links
  const baseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'processAutomationStep-legacy');
  
  // v2025.12.15: Clean slug-based booking URL
  // In prod: baseUrl already includes slug subdomain, so just append /book
  // In dev: baseUrl is plain Replit domain, so append /book/{slug} as path
  // Falls back to token-based URL for legacy accounts without portalSlug
  const isRailway = !!process.env.RAILWAY_PROJECT_ID || !!process.env.RAILWAY_ENVIRONMENT_NAME;
  const isProduction = process.env.NODE_ENV === 'production' || isRailway;
  
  // Normalize baseUrl to avoid double slashes
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  
  let schedulingLink = '';
  if (photographer?.portalSlug) {
    if (isProduction) {
      // Production: baseUrl = https://{slug}.tpcportal.co, just append /book
      schedulingLink = `${normalizedBaseUrl}/book`;
    } else {
      // Dev: baseUrl = https://{replit-domain}, append /book/{slug} as path
      schedulingLink = `${normalizedBaseUrl}/book/${photographer.portalSlug}`;
    }
    console.log(`📅 scheduler_link (slug-based): ${schedulingLink}`);
  } else if (photographer?.publicToken) {
    schedulingLink = `${normalizedBaseUrl}/booking/calendar/${photographer.publicToken}`;
    console.log(`📅 scheduler_link (token fallback): ${schedulingLink}`);
  } else {
    console.warn(`⚠️ scheduler_link: No portalSlug or publicToken for photographer ${photographer?.id}`);
  }
    
  // Format event date properly - handle PostgreSQL date strings
  const formatEventDate = (dateValue: any): string => {
    if (!dateValue) return 'Not set';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Not set';
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting event date:', error);
      return 'Not set';
    }
  };

  // Get photographer's public galleries for demo links
  const publicGalleries = await storage.getPublicGalleries(project.photographerId);
  const demoGallery = publicGalleries.find(g => g.id); // Get first available public gallery
  const demoGalleryLink = demoGallery 
    ? `${baseUrl}/client/gallery/${demoGallery.publicToken}`
    : `${baseUrl}/galleries`;

  // Fetch gallery variables
  const galleryVars = await getGalleryVariables(project.id, project.photographerId, project.stageEnteredAt);
  
  // Calculate days until event for template variables
  const calculateDaysUntilEvent = (eventDateValue: any): { days: number, weeks: number, formatted: string } => {
    if (!eventDateValue) return { days: 0, weeks: 0, formatted: 'N/A' };
    try {
      const eventDate = new Date(eventDateValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      const diffMs = eventDate.getTime() - today.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(days / 7);
      // Smart formatting: "2 weeks" or "14 days" or "Just 3 days"
      let formatted = '';
      if (days < 0) {
        formatted = `${Math.abs(days)} days ago`;
      } else if (days === 0) {
        formatted = 'today';
      } else if (days === 1) {
        formatted = '1 day';
      } else if (days < 7) {
        formatted = `${days} days`;
      } else if (weeks === 1) {
        formatted = '1 week';
      } else {
        formatted = `${weeks} weeks`;
      }
      return { days, weeks, formatted };
    } catch (error) {
      return { days: 0, weeks: 0, formatted: 'N/A' };
    }
  };
  
  const eventCountdown = calculateDaysUntilEvent(project.eventDate);
  
  // Prepare variables for template rendering
  const variables = {
    // CamelCase versions
    firstName: project.firstName,
    lastName: project.lastName,
    fullName: `${project.firstName} ${project.lastName}`,
    email: project.email || '',
    phone: project.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    eventDate: formatEventDate(project.eventDate),
    weddingDate: formatEventDate(project.eventDate),
    // Event countdown variables
    daysUntilEvent: String(eventCountdown.days),
    weeksUntilEvent: String(eventCountdown.weeks),
    timeUntilEvent: eventCountdown.formatted,
    // Snake_case versions for template compatibility
    first_name: project.firstName,
    last_name: project.lastName,
    full_name: `${project.firstName} ${project.lastName}`,
    business_name: photographer?.businessName || 'Your Photographer',
    photographer_name: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    event_date: formatEventDate(project.eventDate),
    wedding_date: formatEventDate(project.eventDate),
    days_until_event: String(eventCountdown.days),
    weeks_until_event: String(eventCountdown.weeks),
    time_until_event: eventCountdown.formatted,
    scheduling_link: schedulingLink,
    scheduler_link: schedulingLink, // Alternative spelling
    gallery_link: demoGalleryLink,
    demo_gallery_link: demoGalleryLink,
    testimonials_link: `${baseUrl}/reviews/submit/${project.photographerId}`,
    ...galleryVars,
    // Uppercase versions for AI-generated placeholders
    SCHEDULING_LINK: schedulingLink,
    PHOTOGRAPHER_NAME: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    BUSINESS_NAME: photographer?.businessName || 'Your Photographer',
    DAYS_UNTIL_EVENT: String(eventCountdown.days),
    WEEKS_UNTIL_EVENT: String(eventCountdown.weeks),
    TIME_UNTIL_EVENT: eventCountdown.formatted
  };

  // 🔒 BULLETPROOF ERROR HANDLING - Wrap all send operations to prevent PENDING reservations on errors
  try {
    // Send message or Smart File
    if (actionType === 'SMART_FILE' && smartFileTemplate && project.email) {
      // Create project Smart File from template
      console.log(`📄 Creating Smart File for ${project.firstName} ${project.lastName} from template "${smartFileTemplate.name}"...`);
      
      // Generate unique token for the Smart File
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      const token = generateToken();
      // Use centralized portal URL resolver for Smart File URL
      const sfBaseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'processAutomationStep-smartFile');
      
      // Fetch template pages for snapshot
      const templatePages = await db
        .select()
        .from(smartFilePages)
        .where(eq(smartFilePages.smartFileId, smartFileTemplate.id))
        .orderBy(smartFilePages.pageOrder);
      
      // Create project Smart File with all required fields
      const projectSmartFile = await storage.createProjectSmartFile({
        projectId: project.id,
        smartFileId: smartFileTemplate.id,
        photographerId: project.photographerId,
        contactId: project.contactId,
        smartFileName: smartFileTemplate.name,
        pagesSnapshot: templatePages,
        token,
        status: 'DRAFT',
        depositPercent: smartFileTemplate.defaultDepositPercent || 50
      });

      const smartFileUrl = `${sfBaseUrl}/smart-file/${token}`;
      
      // Send notification email to project contact
      const subject = `${smartFileTemplate.name} from ${photographer?.businessName || 'Your Photographer'}`;
      const htmlBody = `
        <h2>Hi ${project.firstName},</h2>
        <p>${photographer?.businessName || 'Your photographer'} has sent you a ${smartFileTemplate.name}.</p>
        <p>Click the link below to view and respond:</p>
        <p><a href="${smartFileUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View ${smartFileTemplate.name}</a></p>
        <p>Or copy and paste this link: ${smartFileUrl}</p>
        <br/>
        <p>Best regards,<br/>${photographer?.businessName || 'Your Photographer'}</p>
      `;
      const textBody = `Hi ${project.firstName},\n\n${photographer?.businessName || 'Your photographer'} has sent you a ${smartFileTemplate.name}.\n\nView it here: ${smartFileUrl}\n\nBest regards,\n${photographer?.businessName || 'Your Photographer'}`;

      console.log(`📧 Sending Smart File notification email to ${project.email}...`);
      
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
      const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
      const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
      
      const success = await sendEmail({
        to: project.email,
        from: `${fromName} <${fromEmail}>`,
        replyTo: `${fromName} <${replyToEmail}>`,
        subject,
        html: htmlBody,
        text: textBody,
        photographerId: project.photographerId,
        contactId: project.contactId,
        projectId: project.id,
        automationStepId: step.id,
        source: 'AUTOMATION' as const
      });

      console.log(`📄 Smart File ${success ? 'sent successfully' : 'FAILED'} to ${project.firstName} ${project.lastName}`);

      // Log the email attempt
      await db.insert(emailLogs).values({
        clientId: project.contactId,
        projectId: project.id,
        automationStepId: step.id,
        status: success ? 'sent' : 'failed',
        sentAt: success ? now : null
      });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

    } else if (actionType === 'EMAIL' && template && project.email) {
    // Check if automation includes a Smart File template
    let smartFileLink = '';
    if (automation.smartFileTemplateId) {
      console.log(`📄 Automation includes Smart File template: ${automation.smartFileTemplateId}`);
      
      // Fetch the Smart File template
      const [sfTemplate] = await db
        .select()
        .from(smartFiles)
        .where(and(
          eq(smartFiles.id, automation.smartFileTemplateId),
          eq(smartFiles.photographerId, project.photographerId)
        ));
      
      if (sfTemplate) {
        console.log(`📄 Creating Smart File "${sfTemplate.name}" for email automation...`);
        
        // Generate unique token for the Smart File
        const generateToken = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let token = '';
          for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return token;
        };

        const token = generateToken();
        // Use centralized portal URL resolver for Smart File URL
        const sfBaseUrl2 = resolvePortalBaseUrl(photographer?.portalSlug, 'processAutomationStep-emailSmartFile');
        
        // Fetch template pages for snapshot
        const templatePages = await db
          .select()
          .from(smartFilePages)
          .where(eq(smartFilePages.smartFileId, sfTemplate.id))
          .orderBy(smartFilePages.pageOrder);
        
        // Create project Smart File
        const projectSmartFile = await storage.createProjectSmartFile({
          projectId: project.id,
          smartFileId: sfTemplate.id,
          photographerId: project.photographerId,
          contactId: project.contactId,
          smartFileName: sfTemplate.name,
          pagesSnapshot: templatePages,
          token,
          status: 'DRAFT',
          depositPercent: sfTemplate.defaultDepositPercent || 50
        });

        smartFileLink = `${sfBaseUrl2}/smart-file/${token}`;
        console.log(`📄 Smart File created with link: ${smartFileLink}`);
      } else {
        console.log(`⚠️ Smart File template not found: ${automation.smartFileTemplateId}`);
      }
    }
    
    // Add Smart File link to variables if available
    const emailVariables = {
      ...variables,
      smart_file_link: smartFileLink,
      smartFileLink: smartFileLink,
      SMART_FILE_LINK: smartFileLink
    };
    
    const subject = renderTemplate(template.subject || '', emailVariables);
    const htmlBody = renderTemplate(template.htmlBody || '', emailVariables);
    const textBody = renderTemplate(template.textBody || '', emailVariables);

    console.log(`📧 Sending email to ${project.firstName} ${project.lastName} (${project.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(project.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
    // Use environment-configured verified sender
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    console.log(`📧 DEBUG: Using verified sender: ${fromEmail}, reply-to: ${replyToEmail}`);
    
    const success = await sendEmail({
      to: project.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined,
      photographerId: project.photographerId,
      contactId: project.contactId,
      projectId: project.id,
      automationStepId: step.id,
      source: 'AUTOMATION' as const
    });

    console.log(`📧 Email ${success ? 'sent successfully' : 'FAILED'} to ${project.firstName} ${project.lastName}`);

    // Log the attempt
    await db.insert(emailLogs).values({
      clientId: project.contactId,
      projectId: project.id,
      automationStepId: step.id,
      status: success ? 'sent' : 'failed',
      sentAt: success ? now : null
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

    } else if (actionType === 'SMS' && project.phone && (template || step.customSmsContent)) {
    // Use custom SMS content if available, otherwise use template
    const smsContent = step.customSmsContent || template?.textBody || '';
    const body = renderSmsTemplate(smsContent, variables);

    // 🔍 DEBUG: Trace scheduler_link value before SMS send
    console.log(`📱🔍 SMS DEBUG - scheduler_link trace:`, {
      schedulingLink,
      scheduler_link: variables.scheduler_link,
      baseUrl,
      hasPublicToken: !!photographer?.publicToken,
      photographerSlug: photographer?.portalSlug
    });
    console.log(`📱🔍 SMS DEBUG - rendered body preview:`, body.substring(0, 200));
    
    console.log(`📱 Sending SMS to ${project.firstName} ${project.lastName}: ${step.customSmsContent ? 'custom message' : 'template'}`);

    const result = await sendSms({
      to: project.phone,
      body
    });

    // Log the attempt
    await db.insert(smsLogs).values({
      clientId: project.contactId,
      projectId: project.id,
      automationStepId: step.id,
      status: result.success ? 'sent' : 'failed',
      providerId: result.sid,
      sentAt: result.success ? now : null,
      direction: 'OUTBOUND',
      messageBody: body
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update reservation status
      await updateExecutionStatus(reservation.executionId!, result.success ? 'SUCCESS' : 'FAILED');
    }
  } catch (error) {
    console.error(`❌ Error sending communication message to ${project.firstName} ${project.lastName}:`, error);
    // 🔒 BULLETPROOF ERROR HANDLING - Mark reservation as FAILED on any error to prevent PENDING state
    await updateExecutionStatus(reservation.executionId!, 'FAILED');
  }
}

async function checkTriggerCondition(triggerType: string, project: any, photographerId: string, effectiveFrom?: Date): Promise<boolean> {
  console.log(`Checking trigger condition: ${triggerType} for project ${project.id}${effectiveFrom ? ` (effectiveFrom: ${effectiveFrom.toISOString()})` : ''}`);

  switch (triggerType) {
    case 'DEPOSIT_PAID':
      return await checkDepositPaid(project.id, effectiveFrom);
    case 'FULL_PAYMENT_MADE':
      return await checkFullPaymentMade(project.id, effectiveFrom);
    case 'ANY_PAYMENT_MADE':
      return await checkAnyPaymentMade(project.id, effectiveFrom);
    case 'PROJECT_BOOKED':
      return await checkProjectBooked(project);
    case 'CONTRACT_SIGNED':
      return await checkContractSigned(project.id, effectiveFrom);
    case 'SMART_FILE_ACCEPTED':
      return await checkSmartFileAccepted(project.id, effectiveFrom);
    case 'SMART_FILE_SENT':
      return await checkSmartFileSent(project.id, effectiveFrom);
    case 'EVENT_DATE_REACHED':
      return await checkEventDateReached(project);
    case 'PROJECT_DELIVERED':
      return await checkProjectDelivered(project);
    case 'CLIENT_ONBOARDED':
      return await checkClientOnboarded(project);
    case 'APPOINTMENT_BOOKED':
      return await checkAppointmentBooked(project);
    case 'GALLERY_SHARED':
      return await checkGalleryShared(project.id, effectiveFrom);
    default:
      console.log(`Unknown trigger type: ${triggerType}`);
      return false;
  }
}

async function checkDepositPaid(projectId: string, effectiveFrom?: Date): Promise<boolean> {
  // Check if project has Smart Files with deposit payments
  const smartFilesWithDeposit = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      eq(projectSmartFiles.paymentType, 'DEPOSIT')
    ));

  for (const smartFile of smartFilesWithDeposit) {
    if (smartFile.amountPaidCents && smartFile.amountPaidCents > 0) {
      // Only trigger if payment happened AFTER effectiveFrom
      if (effectiveFrom && smartFile.paidAt) {
        if (new Date(smartFile.paidAt) < effectiveFrom) {
          console.log(`⏸️ Deposit paid before automation was created (paid: ${smartFile.paidAt}, effective: ${effectiveFrom.toISOString()}), skipping`);
          continue;
        }
      }
      return true;
    }
  }
  return false;
}

async function checkFullPaymentMade(projectId: string, effectiveFrom?: Date): Promise<boolean> {
  // Check if project has fully paid Smart Files
  const paidSmartFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      eq(projectSmartFiles.status, 'PAID')
    ));

  for (const smartFile of paidSmartFiles) {
    // Only trigger if payment happened AFTER effectiveFrom
    if (effectiveFrom && smartFile.paidAt) {
      if (new Date(smartFile.paidAt) < effectiveFrom) {
        console.log(`⏸️ Full payment made before automation was created (paid: ${smartFile.paidAt}, effective: ${effectiveFrom.toISOString()}), skipping`);
        continue;
      }
    }
    return true;
  }
  return false;
}

async function checkAnyPaymentMade(projectId: string, effectiveFrom?: Date): Promise<boolean> {
  // Check if project has any Smart Files with any amount paid (deposit, partial, or full)
  const smartFilesWithPayments = await db
    .select()
    .from(projectSmartFiles)
    .where(eq(projectSmartFiles.projectId, projectId));

  // Check if any smart file has received any payment
  for (const smartFile of smartFilesWithPayments) {
    if (smartFile.amountPaidCents && smartFile.amountPaidCents > 0) {
      // Only trigger if payment happened AFTER effectiveFrom
      if (effectiveFrom && smartFile.paidAt) {
        if (new Date(smartFile.paidAt) < effectiveFrom) {
          continue; // Skip - payment too old
        }
      }
      return true;
    }
  }

  // Also check for status indicating payment was made
  const paidStatusFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      inArray(projectSmartFiles.status, ['DEPOSIT_PAID', 'PAID'])
    ));

  for (const smartFile of paidStatusFiles) {
    // Only trigger if payment happened AFTER effectiveFrom
    if (effectiveFrom && smartFile.paidAt) {
      if (new Date(smartFile.paidAt) < effectiveFrom) {
        continue; // Skip - payment too old
      }
    }
    return true;
  }
  return false;
}

async function checkProjectBooked(project: any): Promise<boolean> {
  // Check if project has moved beyond initial inquiry stages
  return project.status === 'ACTIVE' && project.stageId !== null;
}

async function checkContractSigned(projectId: string, effectiveFrom?: Date): Promise<boolean> {
  // Check if project has signed Smart Files (client or photographer signature)
  const signedSmartFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(
      eq(projectSmartFiles.projectId, projectId)
    );

  for (const sf of signedSmartFiles) {
    if (sf.clientSignedAt || sf.photographerSignedAt) {
      // Only trigger if signed AFTER effectiveFrom
      const signedAt = sf.clientSignedAt || sf.photographerSignedAt;
      if (effectiveFrom && signedAt) {
        if (new Date(signedAt) < effectiveFrom) {
          console.log(`⏸️ Contract signed before automation was created (signed: ${signedAt}, effective: ${effectiveFrom.toISOString()}), skipping`);
          continue;
        }
      }
      return true;
    }
  }
  return false;
}

async function checkSmartFileAccepted(projectId: string, effectiveFrom?: Date): Promise<boolean> {
  // Check if project has accepted Smart Files
  const acceptedSmartFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      inArray(projectSmartFiles.status, ['ACCEPTED', 'DEPOSIT_PAID', 'PAID'])
    ));

  for (const sf of acceptedSmartFiles) {
    // Use viewedAt as proxy for acceptance time (or paidAt if available)
    const acceptedAt = sf.paidAt || sf.viewedAt;
    if (effectiveFrom && acceptedAt) {
      if (new Date(acceptedAt) < effectiveFrom) {
        continue; // Skip - accepted too old
      }
    }
    return true;
  }
  return false;
}

async function checkSmartFileSent(projectId: string, effectiveFrom?: Date): Promise<boolean> {
  // Check if project has Smart Files that have been sent (status is SENT, VIEWED, ACCEPTED, DEPOSIT_PAID, or PAID)
  const sentSmartFiles = await db
    .select()
    .from(projectSmartFiles)
    .where(and(
      eq(projectSmartFiles.projectId, projectId),
      inArray(projectSmartFiles.status, ['SENT', 'VIEWED', 'ACCEPTED', 'DEPOSIT_PAID', 'PAID'])
    ));

  for (const sf of sentSmartFiles) {
    // Only trigger if sent AFTER effectiveFrom
    if (effectiveFrom && sf.sentAt) {
      if (new Date(sf.sentAt) < effectiveFrom) {
        console.log(`⏸️ Smart File sent before automation was created (sent: ${sf.sentAt}, effective: ${effectiveFrom.toISOString()}), skipping`);
        continue;
      }
    }
    return true;
  }
  return false;
}

async function checkEventDateReached(project: any): Promise<boolean> {
  if (!project.eventDate) return false;
  
  const eventDate = new Date(project.eventDate);
  const now = new Date();
  
  // Trigger if event date is today or in the past
  return eventDate <= now;
}

async function checkProjectDelivered(project: any): Promise<boolean> {
  // This would typically check for file delivery or gallery completion
  // For now, we'll check if project status is COMPLETED
  return project.status === 'COMPLETED';
}

async function checkClientOnboarded(project: any): Promise<boolean> {
  // Check if client has email/phone and has opted in (using project-level opt-in flags)
  return !!(project.emailOptIn || project.smsOptIn);
}

async function checkAppointmentBooked(project: any): Promise<boolean> {
  // Check if project has confirmed bookings in the bookings table
  const confirmedBookings = await db
    .select()
    .from(bookings)
    .where(and(
      eq(bookings.projectId, project.id),
      eq(bookings.status, 'CONFIRMED')
    ));
  return confirmedBookings.length > 0;
}

async function checkGalleryShared(projectId: string, effectiveFrom?: Date): Promise<boolean> {
  // Check if project has a gallery that has been shared (sharedAt is not null, status is either ACTIVE or SHARED)
  const sharedGalleries = await db
    .select()
    .from(galleries)
    .where(and(
      eq(galleries.projectId, projectId),
      isNotNull(galleries.sharedAt)
    ));

  for (const gallery of sharedGalleries) {
    // Only trigger if shared AFTER effectiveFrom
    if (effectiveFrom && gallery.sharedAt) {
      if (new Date(gallery.sharedAt) < effectiveFrom) {
        console.log(`⏸️ Gallery shared before automation was created (shared: ${gallery.sharedAt}, effective: ${effectiveFrom.toISOString()}), skipping`);
        continue;
      }
    }
    return true;
  }
  return false;
}

async function checkMinAmountConstraint(projectId: string, minAmountCents: number): Promise<boolean> {
  // Check if project has estimates with completed payments that meet the minimum amount
  const estimatesWithPayments = await db
    .select({
      id: estimates.id,
      totalCents: estimates.totalCents
    })
    .from(estimates)
    .where(and(
      eq(estimates.projectId, projectId),
      eq(estimates.status, 'SIGNED')
    ));

  for (const estimate of estimatesWithPayments) {
    const completedPayments = await db
      .select()
      .from(estimatePayments)
      .where(and(
        eq(estimatePayments.estimateId, estimate.id),
        eq(estimatePayments.status, 'completed')
      ));
    
    const totalPaid = completedPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
    if (totalPaid >= minAmountCents) {
      return true;
    }
  }
  return false;
}

async function processCountdownAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing countdown automation: ${automation.name} (${automation.daysBefore} days before ${automation.eventType || 'event'})`);
  
  // Validate daysBefore is a non-negative integer (allow 0 for same-day triggers)
  if (automation.daysBefore == null || automation.daysBefore < 0 || !Number.isInteger(automation.daysBefore)) {
    console.log(`❌ Invalid daysBefore value for automation ${automation.name}: ${automation.daysBefore}`);
    return;
  }

  // Validate required fields for new countdown automation structure
  // For stage change countdowns, we only need eventType and targetStageId
  // For communication countdowns, we need eventType and templateId (or email builder content)
  const isStageChangeCountdown = !!automation.targetStageId;
  const hasEmailContent = automation.templateId || (automation.useEmailBuilder && (automation.emailBlocks || automation.templateBody));
  
  if (!automation.eventType) {
    console.log(`❌ Missing eventType for countdown automation ${automation.name}`);
    return;
  }
  
  if (!isStageChangeCountdown && !hasEmailContent) {
    console.log(`❌ Missing required fields for communication countdown automation ${automation.name}: templateId=${automation.templateId}, useEmailBuilder=${automation.useEmailBuilder}`);
    return;
  }
  
  // Build query for active projects based on eventType and optional stage condition
  let whereConditions = [
    eq(projects.photographerId, photographerId),
    eq(projects.projectType, automation.projectType),
    eq(projects.status, 'ACTIVE'),
    eq(projects.enableAutomations, true) // Only process projects with automations enabled
  ];

  // Add stage condition if specified (for conditional event countdown automations)
  if (automation.stageCondition) {
    whereConditions.push(eq(projects.stageId, automation.stageCondition));
    console.log(`Filtering by stage condition: ${automation.stageCondition}`);
  }

  // Get all active projects for this photographer with event dates
  const activeProjects = await db
    .select({
      id: projects.id,
      contactId: projects.clientId,
      eventDate: projects.eventDate,
      stageId: projects.stageId,
      stageEnteredAt: projects.stageEnteredAt,
      smsOptIn: contacts.smsOptIn,
      emailOptIn: contacts.emailOptIn,
      photographerId: projects.photographerId,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(...whereConditions));

  console.log(`Found ${activeProjects.length} active projects to check for countdown automation (stage filter: ${automation.stageCondition || 'none'})`);

  // Get photographer info for timezone
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, photographerId));
    
  const timezone = photographer?.timezone || 'America/Chicago';

  // Get current date in photographer's timezone using proper timezone handling
  const now = new Date();
  const todayParts = getDateInTimezone(now, timezone);
  const today = new Date(todayParts.year, todayParts.month, todayParts.day);

  for (const project of activeProjects) {
    // Get the relevant event date based on eventType
    let eventDate: Date | null = null;
    let isBookingRelative = false;
    
    switch (automation.eventType) {
      case 'BOOKING_START':
      case 'BOOKING_END':
        // For booking-relative automations, fetch the project's booking
        isBookingRelative = true;
        const projectBookings = await db.select()
          .from(bookings)
          .where(and(
            eq(bookings.projectId, project.id),
            or(
              eq(bookings.status, 'CONFIRMED'),
              eq(bookings.status, 'PENDING'),
              eq(bookings.status, 'COMPLETED')
            )
          ))
          .orderBy(bookings.startAt);
        
        if (projectBookings.length > 0) {
          // Use the first upcoming booking, or the most recent one if all are in the past
          const now = new Date();
          const booking = projectBookings.find(b => new Date(b.startAt) > now) || projectBookings[projectBookings.length - 1];
          
          if (automation.eventType === 'BOOKING_START') {
            eventDate = new Date(booking.startAt);
            console.log(`📞 Using booking start time: ${eventDate.toISOString()} (booking: ${booking.id})`);
          } else {
            eventDate = new Date(booking.endAt);
            console.log(`📞 Using booking end time: ${eventDate.toISOString()} (booking: ${booking.id})`);
          }
        } else {
          console.log(`📞 No active booking found for project ${project.id}, skipping booking-relative automation`);
        }
        break;
      case 'EVENT_DATE':
      case 'event_date':
      default:
        eventDate = project.eventDate;
        break;
      // Future support for other event types:
      // case 'DELIVERY_DATE':
      //   eventDate = project.deliveryDate;
      //   break;
    }

    // Check event date condition FIRST (before checking eventDate existence)
    if (automation.eventDateCondition) {
      if (automation.eventDateCondition === 'HAS_EVENT_DATE' && !eventDate) {
        console.log(`📅 Project ${project.id} does not have event date (required by automation), skipping`);
        continue;
      }
      if (automation.eventDateCondition === 'NO_EVENT_DATE' && eventDate) {
        console.log(`📅 Project ${project.id} has event date (automation requires no date), skipping`);
        continue;
      }
    }

    // For countdown automations, we NEED an event date (unless explicitly filtered out by condition above)
    if (!eventDate) {
      console.log(`⏰ No ${automation.eventType || 'event date'} for project ${project.id}, skipping countdown automation`);
      continue;
    }

    // Check effectiveFrom: only run on contacts who entered stage AFTER automation was created
    if (automation.effectiveFrom && project.stageEnteredAt) {
      const stageEnteredAt = new Date(project.stageEnteredAt);
      const effectiveFrom = new Date(automation.effectiveFrom);
      if (stageEnteredAt < effectiveFrom) {
        console.log(`⏸️ Project ${project.id} entered stage before automation was created (entered: ${stageEnteredAt.toISOString()}, effective: ${effectiveFrom.toISOString()}), skipping`);
        continue;
      }
    }

    // Convert event date to photographer's timezone using proper timezone handling
    const eventDateParts = getDateInTimezone(new Date(eventDate), timezone);
    const eventDateOnly = new Date(eventDateParts.year, eventDateParts.month, eventDateParts.day);
    
    // Calculate target date based on triggerTiming (BEFORE/AFTER) and daysBefore
    const targetDate = new Date(eventDateOnly);
    const daysOffset = automation.daysBefore || 0;
    
    if (automation.triggerTiming === 'AFTER') {
      // For "AFTER" timing, add days instead of subtracting
      targetDate.setDate(targetDate.getDate() + daysOffset);
    } else {
      // For "BEFORE" timing (default), subtract days
      targetDate.setDate(targetDate.getDate() - daysOffset);
    }
    
    // Calculate days remaining/elapsed for the project
    const daysFromEvent = Math.ceil((eventDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine if this automation should trigger
    let shouldTrigger = false;
    const isOrLess = automation.orLess === true;
    
    if (automation.triggerTiming === 'AFTER') {
      // For "AFTER" timing: days since event (negative daysFromEvent means past)
      const daysSinceEvent = -daysFromEvent;
      if (isOrLess) {
        // "X days after OR MORE" - trigger if days since event >= threshold
        shouldTrigger = daysSinceEvent >= daysOffset;
      } else {
        // Exact match only
        shouldTrigger = daysSinceEvent === daysOffset;
      }
    } else {
      // For "BEFORE" timing: days until event
      if (isOrLess) {
        // "X days before OR LESS" - trigger if days remaining <= threshold (and event is in future)
        shouldTrigger = daysFromEvent >= 0 && daysFromEvent <= daysOffset;
      } else {
        // Exact match only
        shouldTrigger = daysFromEvent === daysOffset;
      }
    }
    
    if (shouldTrigger) {
      const timingLabel = automation.triggerTiming === 'AFTER' ? 'after' : 'before';
      const orLessLabel = isOrLess ? ' (or less)' : '';
      console.log(`🎯 Countdown trigger for project ${project.id}: ${daysOffset} days ${timingLabel}${orLessLabel} ${eventDateOnly.toLocaleDateString()} (${automation.eventType}, timezone: ${timezone}), days from event: ${daysFromEvent}`);
      
      // Check if this is a stage change automation (has targetStageId) or communication automation
      if (automation.targetStageId) {
        await executeCountdownStageChange(project, automation, photographerId, daysFromEvent, timezone);
      } else {
        await sendCountdownMessage(project, automation, photographerId);
      }
    }
  }
}

async function executeCountdownStageChange(
  project: any, 
  automation: any, 
  photographerId: string, 
  daysFromEvent: number,
  timezone: string
): Promise<void> {
  console.log(`🎯 Executing countdown stage change for project ${project.id}: moving to stage ${automation.targetStageId}`);
  
  // Skip if project is already in the target stage
  if (project.stageId === automation.targetStageId) {
    console.log(`📌 Project ${project.id} is already in target stage ${automation.targetStageId}, skipping`);
    return;
  }
  
  // Calculate event date key for tracking
  const eventDateParts = getDateInTimezone(new Date(project.eventDate), timezone);
  const eventDateKey = `${eventDateParts.year}-${eventDateParts.month}-${eventDateParts.day}`;
  
  // Reserve automation execution to prevent duplicates
  const reservation = await reserveAutomationExecution(
    project.id,
    automation.id,
    'COUNTDOWN_STAGE_CHANGE',
    undefined, // no channel for stage change
    undefined, // stepId
    undefined, // triggerType
    new Date(project.eventDate),
    automation.daysBefore,
    timezone
  );
  
  if (!reservation.canExecute) {
    console.log(`🔒 Countdown stage change already executed for project ${project.id} (event: ${eventDateKey}), skipping`);
    return;
  }
  
  try {
    // Get target stage name for logging
    const [targetStage] = await db
      .select()
      .from(stages)
      .where(eq(stages.id, automation.targetStageId));
    
    const targetStageName = targetStage?.name || 'Unknown Stage';
    
    // Move project to target stage
    await db
      .update(projects)
      .set({
        stageId: automation.targetStageId,
        stageEnteredAt: new Date()
      })
      .where(eq(projects.id, project.id));
    
    // Log activity for the stage change
    await db.insert(activityLogs).values({
      photographerId,
      projectId: project.id,
      activityType: 'STAGE_CHANGE',
      description: `Automatically moved to "${targetStageName}" stage (${automation.daysBefore} days ${automation.triggerTiming === 'AFTER' ? 'after' : 'before'} event${automation.orLess ? ' or less' : ''})`,
      metadata: {
        automationId: automation.id,
        automationName: automation.name,
        targetStageId: automation.targetStageId,
        targetStageName,
        daysFromEvent,
        triggerType: 'COUNTDOWN_STAGE_CHANGE'
      }
    });
    
    // Mark execution as completed
    if (reservation.executionId) {
      await updateAutomationExecutionStatus(reservation.executionId, 'completed', null);
    }
    
    console.log(`✅ Successfully moved project ${project.id} to stage "${targetStageName}" (countdown stage change)`);
    
  } catch (error) {
    console.error(`❌ Error executing countdown stage change for project ${project.id}:`, error);
    if (reservation.executionId) {
      await updateAutomationExecutionStatus(reservation.executionId, 'failed', (error as Error).message);
    }
    throw error;
  }
}

async function sendCountdownMessage(project: any, automation: any, photographerId: string): Promise<void> {
  console.log(`Sending countdown message to ${project.firstName} ${project.lastName}`);
  
  // 🔒 BULLETPROOF PRECONDITION CHECKS - Validate ALL conditions BEFORE reserving execution
  
  // Check consent FIRST (before any reservation)
  if (automation.channel === 'EMAIL' && !project.emailOptIn) {
    console.log(`📧 Email opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  if (automation.channel === 'SMS' && !project.smsOptIn) {
    console.log(`📱 SMS opt-in missing for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }

  // Check contact info EARLY (before reservation)
  if (automation.channel === 'EMAIL' && !project.email) {
    console.log(`📧 No email address for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }
  if (automation.channel === 'SMS' && !project.phone) {
    console.log(`📱 No phone number for ${project.firstName} ${project.lastName}, skipping (no reservation)`);
    return;
  }

  // Get photographer timezone for date calculations
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, photographerId));
    
  const timezone = photographer?.timezone || 'America/Chicago';

  // Check if automation has email content (either template, email blocks, or templateBody) BEFORE reservation
  const hasEmailBlocks = automation.useEmailBuilder && (automation.emailBlocks || automation.templateBody) && automation.emailSubject;
  const hasTemplate = automation.templateId;
  
  if (!hasEmailBlocks && !hasTemplate) {
    console.log(`📝 No email content (template or email blocks) for countdown automation ${automation.name}, skipping (no reservation)`);
    return;
  }
  
  // Get template if using templateId
  let template = null;
  if (hasTemplate) {
    const [templateRecord] = await db
      .select()
      .from(templates)
      .where(and(
        eq(templates.id, automation.templateId),
        eq(templates.photographerId, photographerId)
      ));

    if (!templateRecord) {
      console.log(`📝 Template not found for countdown automation, templateId: ${automation.templateId}, skipping (no reservation)`);
      return;
    }

    // Validate template-channel match BEFORE reservation
    if (templateRecord.channel !== automation.channel) {
      console.log(`❌ Template channel mismatch for countdown automation ${automation.name}: template=${templateRecord.channel}, automation=${automation.channel}, skipping (no reservation)`);
      return;
    }
    
    template = templateRecord;
  }
  
  // Calculate today in photographer's timezone using proper timezone handling
  const now = new Date();
  const todayParts = getDateInTimezone(now, timezone);
  const startOfDay = new Date(todayParts.year, todayParts.month, todayParts.day);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Calculate event date to create unique identifier for this countdown window
  const eventDateParts = getDateInTimezone(new Date(project.eventDate), timezone);
  const eventDateKey = `${eventDateParts.year}-${eventDateParts.month}-${eventDateParts.day}`;
  
  // 🔒 BULLETPROOF DUPLICATE PREVENTION - Reserve countdown execution atomically (ONLY after ALL preconditions pass)
  const eventDateForTracking = new Date(project.eventDate); // FIX: Use project.eventDate directly instead of undefined eventDateInTz
  const reservation = await reserveAutomationExecution(
    project.id, // projectId
    automation.id, // automationId
    'COUNTDOWN', // automationType
    automation.channel, // channel
    undefined, // stepId (not used for countdown)
    undefined, // triggerType (not used for countdown)
    eventDateForTracking, // eventDate
    automation.daysBefore, // daysBefore
    timezone // photographer's timezone for proper normalization
  );
  
  if (!reservation.canExecute) {
    console.log(`🔒 Countdown automation already reserved/executed for ${project.firstName} ${project.lastName} (event: ${eventDateKey}), prevented duplicate (bulletproof reservation)`);
    return;
  }

  // Calculate days remaining using photographer's timezone (reuse existing variables)
  const eventDateInTz = new Date(eventDateParts.year, eventDateParts.month, eventDateParts.day);
  const todayDateInTz = new Date(todayParts.year, todayParts.month, todayParts.day);
  const daysRemaining = Math.ceil((eventDateInTz.getTime() - todayDateInTz.getTime()) / (1000 * 60 * 60 * 24));
  
  // v2025.12.15: Clean slug-based booking URL
  // In prod: baseUrl already includes slug subdomain, so just append /book
  // In dev: baseUrl is plain Replit domain, so append /book/{slug} as path
  // Falls back to token-based URL for legacy accounts without portalSlug
  const baseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'processCountdownAutomation');
  const isRailwayCountdown = !!process.env.RAILWAY_PROJECT_ID || !!process.env.RAILWAY_ENVIRONMENT_NAME;
  const isProductionCountdown = process.env.NODE_ENV === 'production' || isRailwayCountdown;
  
  // Normalize baseUrl to avoid double slashes
  const normalizedBaseUrlCountdown = baseUrl.replace(/\/$/, '');
  
  let schedulingLink = '';
  if (photographer?.portalSlug) {
    if (isProductionCountdown) {
      // Production: baseUrl = https://{slug}.tpcportal.co, just append /book
      schedulingLink = `${normalizedBaseUrlCountdown}/book`;
    } else {
      // Dev: baseUrl = https://{replit-domain}, append /book/{slug} as path
      schedulingLink = `${normalizedBaseUrlCountdown}/book/${photographer.portalSlug}`;
    }
    console.log(`📅 countdown scheduler_link (slug-based): ${schedulingLink}`);
  } else if (photographer?.publicToken) {
    schedulingLink = `${normalizedBaseUrlCountdown}/booking/calendar/${photographer.publicToken}`;
    console.log(`📅 countdown scheduler_link (token fallback): ${schedulingLink}`);
  } else {
    console.warn(`⚠️ countdown scheduler_link: No portalSlug or publicToken for photographer ${photographer?.id}`);
  }
    
  // Format event date nicely for countdown automations
  const formattedEventDate = eventDateInTz.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Fetch gallery variables
  const galleryVars = await getGalleryVariables(project.id, photographerId, project.stageEnteredAt);
  
  // Calculate weeks remaining for smart formatting
  const weeksRemaining = Math.floor(daysRemaining / 7);
  const timeUntilEventFormatted = (() => {
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days ago`;
    if (daysRemaining === 0) return 'today';
    if (daysRemaining === 1) return '1 day';
    if (daysRemaining < 7) return `${daysRemaining} days`;
    if (weeksRemaining === 1) return '1 week';
    return `${weeksRemaining} weeks`;
  })();
  
  // Prepare variables for template rendering
  const variables = {
    firstName: project.firstName,
    lastName: project.lastName,
    fullName: `${project.firstName} ${project.lastName}`,
    email: project.email || '',
    phone: project.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    eventDate: formattedEventDate,
    weddingDate: formattedEventDate, // Backward compatibility
    daysRemaining: daysRemaining.toString(),
    daysBefore: automation.daysBefore.toString(),
    // Standardized countdown variables
    daysUntilEvent: daysRemaining.toString(),
    weeksUntilEvent: weeksRemaining.toString(),
    timeUntilEvent: timeUntilEventFormatted,
    // Snake_case versions
    days_until_event: daysRemaining.toString(),
    weeks_until_event: weeksRemaining.toString(),
    time_until_event: timeUntilEventFormatted,
    scheduling_link: schedulingLink,
    scheduler_link: schedulingLink, // Alternative spelling for template compatibility
    testimonials_link: `${baseUrl}/reviews/submit/${photographerId}`,
    ...galleryVars,
    // Uppercase versions for AI-generated placeholders
    SCHEDULING_LINK: schedulingLink,
    SCHEDULER_LINK: schedulingLink,
    PHOTOGRAPHER_NAME: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    BUSINESS_NAME: photographer?.businessName || 'Your Photographer',
    DAYS_UNTIL_EVENT: daysRemaining.toString(),
    WEEKS_UNTIL_EVENT: weeksRemaining.toString(),
    TIME_UNTIL_EVENT: timeUntilEventFormatted
  };

  // 🔒 BULLETPROOF ERROR HANDLING - Wrap send operations to prevent PENDING reservations on errors
  try {
    // Send message
    if (automation.channel === 'EMAIL' && project.email) {
    // Render email content based on whether using email blocks or template
    let subject: string;
    let htmlBody: string;
    let textBody: string;
    
    if (hasEmailBlocks) {
      // Import email block rendering functions
      const { contentBlocksToHtml, renderTemplate: renderTemplateFn } = await import('@shared/template-utils');
      const { wrapEmailContent } = await import('./email-branding');
      
      // Render subject with variables
      subject = renderTemplateFn(automation.emailSubject || '', variables);
      
      // Prepare photographer branding data for HEADER and SIGNATURE blocks
      const photographerBrandingData = {
        businessName: photographer?.businessName || undefined,
        photographerName: photographer?.photographerName || undefined,
        logoUrl: photographer?.logoUrl || undefined,
        headshotUrl: photographer?.headshotUrl || undefined,
        brandPrimary: photographer?.brandPrimary || undefined,
        brandSecondary: photographer?.brandSecondary || undefined,
        phone: photographer?.phone || undefined,
        email: photographer?.email || undefined,
        website: photographer?.website || undefined,
        businessAddress: photographer?.businessAddress || undefined,
        socialLinks: (photographer?.socialLinksJson as any) || undefined
      };
      
      // Render email blocks to HTML with centralized URL resolver
      const blocksBaseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'processCountdownAutomation-blocks');
      const blocksHtml = contentBlocksToHtml(automation.emailBlocks as any[], {
        baseUrl: blocksBaseUrl,
        brandingData: photographerBrandingData
      });
      
      // Apply branding (headers and signatures) for legacy automations
      const brandingData = {
        includeHeroImage: automation.includeHeroImage || false,
        heroImageUrl: automation.heroImageUrl || undefined,
        includeHeader: automation.includeHeader || false,
        headerStyle: automation.headerStyle || undefined,
        includeSignature: automation.includeSignature !== false, // default true
        signatureStyle: automation.signatureStyle || undefined,
        photographerId
      };
      
      htmlBody = await wrapEmailContent(blocksHtml, brandingData);
      textBody = automation.emailSubject || ''; // Simple text version
    } else if (template) {
      // Use existing template rendering
      subject = renderTemplate(template.subject || '', variables);
      htmlBody = renderTemplate(template.htmlBody || '', variables);
      textBody = renderTemplate(template.textBody || '', variables);
    } else {
      console.error('No email content available (neither blocks nor template)');
      await updateExecutionStatus(reservation.executionId!, 'FAILED');
      return;
    }

    console.log(`📧 Sending countdown email to ${project.firstName} ${project.lastName} (${project.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(project.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
    // Use environment-configured verified sender
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    const success = await sendEmail({
      to: project.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined
    });

    console.log(`📧 Countdown email ${success ? 'sent successfully' : 'FAILED'} to ${project.firstName} ${project.lastName}`);

    // Log the attempt - use null for automationStepId since countdown automations don't have steps
    await db.insert(emailLogs).values({
      clientId: project.clientId,
      projectId: project.id,
      automationStepId: null,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : null
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update countdown reservation status
      await updateExecutionStatus(reservation.executionId!, success ? 'SUCCESS' : 'FAILED');

    } else if (automation.channel === 'SMS' && project.phone) {
    const body = renderSmsTemplate(template.textBody || '', variables);

    console.log(`📱 Sending countdown SMS to ${project.firstName} ${project.lastName} (${project.phone})...`);

    const result = await sendSms({
      to: project.phone,
      body
    });

    console.log(`📱 Countdown SMS ${result.success ? 'sent successfully' : 'FAILED'} to ${project.firstName} ${project.lastName}`);

    // Log the attempt - use null for automationStepId since countdown automations don't have steps
    await db.insert(smsLogs).values({
      clientId: project.clientId,
      projectId: project.id,
      automationStepId: null,
      status: result.success ? 'sent' : 'failed',
      providerId: result.sid,
      sentAt: result.success ? new Date() : null,
      direction: 'OUTBOUND',
      messageBody: body
    });

      // 🔒 BULLETPROOF EXECUTION TRACKING - Update countdown reservation status
      await updateExecutionStatus(reservation.executionId!, result.success ? 'SUCCESS' : 'FAILED');
    }
  } catch (error) {
    console.error(`❌ Error sending countdown message to ${project.firstName} ${project.lastName}:`, error);
    // 🔒 BULLETPROOF ERROR HANDLING - Mark reservation as FAILED on any error to prevent PENDING state
    await updateExecutionStatus(reservation.executionId!, 'FAILED');
  }
}

async function moveProjectToStage(projectId: string, targetStageId: string): Promise<void> {
  try {
    console.log(`Moving project ${projectId} to stage ${targetStageId}`);
    
    await db
      .update(projects)
      .set({
        stageId: targetStageId,
        stageEnteredAt: new Date()
      })
      .where(eq(projects.id, projectId));
      
    console.log(`✅ Successfully moved project ${projectId} to stage ${targetStageId}`);
  } catch (error) {
    console.error(`❌ Failed to move project ${projectId} to stage ${targetStageId}:`, error);
  }
}

async function processQuestionnaireAssignment(project: any, automation: any, photographerId: string): Promise<void> {
  console.log(`Processing questionnaire assignment for ${project.firstName} ${project.lastName} (automation: ${automation.name})`);
  
  if (!automation.questionnaireTemplateId) {
    console.log(`❌ No questionnaire template ID for automation ${automation.name}`);
    return;
  }

  if (!project.stageEnteredAt) {
    console.log(`❌ No stageEnteredAt date for project ${project.id}, skipping questionnaire assignment`);
    return;
  }

  // Check if questionnaire has already been assigned for this project and template
  try {
    const existingAssignments = await db
      .select()
      .from(projectQuestionnaires)
      .where(and(
        eq(projectQuestionnaires.projectId, project.id),
        eq(projectQuestionnaires.templateId, automation.questionnaireTemplateId)
      ));

    if (existingAssignments.length > 0) {
      console.log(`🚫 Questionnaire already assigned to ${project.firstName} ${project.lastName} for this template`);
      return;
    }

    // Create questionnaire assignment
    await db.insert(projectQuestionnaires).values({
      projectId: project.id,
      templateId: automation.questionnaireTemplateId,
      status: 'PENDING'
    });

    console.log(`📋 Successfully assigned questionnaire to ${project.firstName} ${project.lastName}`);
  } catch (error) {
    // 🚫 BULLETPROOF ERROR HANDLING - Don't crash automation system on database schema issues
    if (error?.code === '42703') {
      console.log(`⚠️ Database schema issue for questionnaire assignment (${error.message}). Skipping questionnaire assignment for ${project.firstName} ${project.lastName} to prevent automation system crash.`);
    } else {
      console.error(`❌ Failed to assign questionnaire to ${project.firstName} ${project.lastName}:`, error);
    }
  }
}

export async function processPaymentReminders(photographerId: string): Promise<void> {
  // TODO: Payment reminders not yet implemented
  // This will need to query projectSmartFiles and check payment status
  return;
}

/**
 * Process photographer appointment reminders
 * Sends email reminders to photographers for their upcoming bookings
 */
export async function processPhotographerAppointmentReminders(photographerId: string): Promise<void> {
  try {
    // Get photographer settings
    const [photographer] = await db
      .select()
      .from(photographers)
      .where(eq(photographers.id, photographerId))
      .limit(1);
    
    if (!photographer) return;
    
    // Skip if reminders not enabled
    if (!photographer.appointmentReminderEnabled) return;
    
    const reminderMinutes = photographer.appointmentReminderMinutes || 60;
    const now = new Date();
    
    // Calculate the reminder window
    // We want to send reminders for bookings that are within [reminderMinutes - 5, reminderMinutes + 5] from now
    // This gives a 10-minute window to catch the reminder regardless of cron timing
    // Ensure windowStart is at least 1 minute in the future to avoid past bookings
    const windowBuffer = Math.min(5, reminderMinutes - 1); // Use smaller buffer for short reminder times
    const windowStart = new Date(now.getTime() + Math.max(1, reminderMinutes - windowBuffer) * 60000);
    const windowEnd = new Date(now.getTime() + (reminderMinutes + 5) * 60000);
    
    // Find bookings in the window that haven't had reminders sent
    const upcomingBookings = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.photographerId, photographerId),
        eq(bookings.status, 'CONFIRMED'),
        eq(bookings.photographerReminderSent, false),
        gte(bookings.startAt, windowStart),
        lte(bookings.startAt, windowEnd)
      ));
    
    if (upcomingBookings.length === 0) return;
    
    console.log(`📧 Processing ${upcomingBookings.length} appointment reminder(s) for photographer ${photographerId}`);
    
    // Get photographer's email from users table
    const [photographerUser] = await db.select()
      .from(users)
      .where(eq(users.photographerId, photographerId))
      .limit(1);
    
    if (!photographerUser || !photographerUser.email) {
      console.error(`❌ No email found for photographer ${photographerId}`);
      return;
    }
    
    for (const booking of upcomingBookings) {
      try {
        // Format the time nicely
        const startTime = new Date(booking.startAt);
        const endTime = new Date(booking.endAt);
        
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: photographer.timezone || 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: photographer.timezone || 'America/New_York',
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
        
        const timeStr = timeFormatter.format(startTime);
        const dateStr = dateFormatter.format(startTime);
        const endTimeStr = timeFormatter.format(endTime);
        
        // Build the email
        const subject = `Reminder: ${booking.title} in ${reminderMinutes < 60 ? reminderMinutes + ' minutes' : Math.round(reminderMinutes / 60) + ' hour(s)'}`;
        
        const htmlBody = `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">📅 Upcoming Appointment Reminder</h2>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 16px 0; color: #111;">${booking.title}</h3>
              
              <p style="margin: 8px 0; color: #555;">
                <strong>Date:</strong> ${dateStr}
              </p>
              <p style="margin: 8px 0; color: #555;">
                <strong>Time:</strong> ${timeStr} - ${endTimeStr}
              </p>
              
              ${booking.clientName ? `<p style="margin: 8px 0; color: #555;"><strong>Client:</strong> ${booking.clientName}</p>` : ''}
              ${booking.clientEmail ? `<p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${booking.clientEmail}</p>` : ''}
              ${booking.clientPhone ? `<p style="margin: 8px 0; color: #555;"><strong>Phone:</strong> ${booking.clientPhone}</p>` : ''}
              
              ${booking.googleMeetLink ? `
                <div style="margin-top: 16px;">
                  <a href="${booking.googleMeetLink}" style="display: inline-block; background: #1a73e8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                    Join Google Meet
                  </a>
                </div>
              ` : ''}
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This reminder was sent because you have appointment reminders enabled in your settings.
            </p>
          </div>
        `;
        
        // Send email
        await sendEmail({
          to: photographerUser.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@thephotocrm.com',
          subject,
          html: htmlBody
        });
        
        // Mark reminder as sent
        await db.update(bookings)
          .set({ photographerReminderSent: true })
          .where(eq(bookings.id, booking.id));
        
        console.log(`✅ Sent appointment reminder for booking ${booking.id} to ${photographerUser.email}`);
        
      } catch (error) {
        console.error(`❌ Failed to send appointment reminder for booking ${booking.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error processing appointment reminders for photographer ${photographerId}:`, error);
  }
}

async function processNurtureAutomation(automation: any, photographerId: string): Promise<void> {
  console.log(`Processing nurture automation: ${automation.name}`);
  
  // Find ACTIVE drip campaigns for this photographer and project type
  const activeCampaigns = await db
    .select()
    .from(dripCampaigns)
    .where(and(
      eq(dripCampaigns.photographerId, photographerId),
      eq(dripCampaigns.projectType, automation.projectType || 'WEDDING'),
      eq(dripCampaigns.status, 'ACTIVE'),
      eq(dripCampaigns.enabled, true)
    ));

  console.log(`Found ${activeCampaigns.length} active drip campaigns for project type ${automation.projectType}`);

  for (const campaign of activeCampaigns) {
    await processNurtureCampaign(campaign, photographerId);
  }
}

async function processNurtureCampaign(campaign: any, photographerId: string): Promise<void> {
  console.log(`Processing nurture campaign: ${campaign.name} (${campaign.id})`);

  // 1. Check for new projects that should be subscribed to this campaign
  await subscribeNewProjectsToCampaign(campaign, photographerId);

  // 2. Process existing subscriptions to send next emails
  await processExistingSubscriptions(campaign, photographerId);
}

async function subscribeNewProjectsToCampaign(campaign: any, photographerId: string): Promise<void> {
  // Build stage condition based on campaign type:
  // 1. isGlobal = true: any stage (no filter)
  // 2. targetStageIds array: match any of the listed stages
  // 3. Legacy targetStageId: match single stage
  let stageCondition: any = null;
  
  if (campaign.isGlobal) {
    // Global campaigns fire for any stage - no stage filter needed
    stageCondition = isNotNull(projects.stageId); // Just needs to be in some stage
  } else if (campaign.targetStageIds && Array.isArray(campaign.targetStageIds) && campaign.targetStageIds.length > 0) {
    // Multi-stage: match any of the target stages
    stageCondition = inArray(projects.stageId, campaign.targetStageIds);
  } else if (campaign.targetStageId) {
    // Legacy single stage
    stageCondition = eq(projects.stageId, campaign.targetStageId);
  } else {
    // No stage configuration - skip this campaign
    console.log(`Campaign ${campaign.name} has no stage configuration, skipping`);
    return;
  }

  // Find projects matching the stage condition that aren't already subscribed
  const eligibleProjects = await db
    .select({
      id: projects.id,
      contactId: projects.clientId,
      stageEnteredAt: projects.stageEnteredAt,
      eventDate: projects.eventDate,
      emailOptIn: contacts.emailOptIn,
      // Contact details
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email
    })
    .from(projects)
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .leftJoin(dripCampaignSubscriptions, and(
      eq(dripCampaignSubscriptions.projectId, projects.id),
      eq(dripCampaignSubscriptions.campaignId, campaign.id)
    ))
    .where(and(
      eq(projects.photographerId, photographerId),
      stageCondition,
      eq(projects.status, 'ACTIVE'),
      eq(projects.enableDripCampaigns, true), // Must have drip campaigns enabled
      eq(contacts.emailOptIn, true), // Must have email opt-in
      // Not already subscribed
      isNull(dripCampaignSubscriptions.id)
    ));

  console.log(`Found ${eligibleProjects.length} eligible projects for campaign ${campaign.name}`);

  // NEW: Also check for paused subscriptions that should be resumed
  // (project re-entered target stages after leaving them)
  const pausedSubscriptions = await db
    .select({
      subscriptionId: dripCampaignSubscriptions.id,
      projectId: projects.id,
      projectStageId: projects.stageId,
      firstName: contacts.firstName,
      lastName: contacts.lastName
    })
    .from(dripCampaignSubscriptions)
    .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(dripCampaignSubscriptions.campaignId, campaign.id),
      eq(dripCampaignSubscriptions.status, 'PAUSED'),
      eq(projects.photographerId, photographerId),
      stageCondition, // Project is back in target stages
      eq(projects.status, 'ACTIVE'),
      eq(projects.enableDripCampaigns, true),
      eq(contacts.emailOptIn, true)
    ));

  // Resume paused subscriptions that are back in target stages
  for (const sub of pausedSubscriptions) {
    console.log(`▶️ Resuming paused subscription for project ${sub.projectId} (${sub.firstName} ${sub.lastName}) - back in target stages`);
    await db
      .update(dripCampaignSubscriptions)
      .set({ 
        status: 'ACTIVE',
        nextEmailAt: new Date() // Schedule next email immediately
      })
      .where(eq(dripCampaignSubscriptions.id, sub.subscriptionId));
  }

  for (const project of eligibleProjects) {
    // Check that client has email address
    if (!project.email) {
      console.log(`Project ${project.id} has no email address, skipping subscription`);
      continue;
    }

    // Subscribe project to campaign
    const now = new Date();
    let nextEmailAt: Date;
    
    // Get the first email to determine timing mode
    const firstEmail = campaign.emails?.[0];
    
    if (firstEmail?.delayMinutes !== null && firstEmail?.delayMinutes !== undefined) {
      // Delay-based timing: send X minutes after subscription start
      nextEmailAt = new Date(now.getTime() + (firstEmail.delayMinutes * 60 * 1000));
    } else if (firstEmail?.sendAtHour !== null && firstEmail?.sendAtHour !== undefined) {
      // Schedule-based timing: send on specific day at specific hour
      const firstEmailDays = firstEmail.daysAfterStart || 0;
      nextEmailAt = new Date(now.getTime() + (firstEmailDays * 24 * 60 * 60 * 1000));
      nextEmailAt.setHours(firstEmail.sendAtHour, 0, 0, 0);
      // If that time has already passed, schedule for the next day
      if (nextEmailAt <= now) {
        nextEmailAt = new Date(nextEmailAt.getTime() + (24 * 60 * 60 * 1000));
      }
    } else {
      // Default: use daysAfterStart (or 0 for immediate)
      const firstEmailDays = firstEmail?.daysAfterStart || 0;
      nextEmailAt = new Date(now.getTime() + (firstEmailDays * 24 * 60 * 60 * 1000));
    }

    await db.insert(dripCampaignSubscriptions).values({
      campaignId: campaign.id,
      projectId: project.id,
      clientId: project.contactId,
      startedAt: now,
      nextEmailIndex: 0,
      nextEmailAt: nextEmailAt,
      status: 'ACTIVE'
    });

    console.log(`✅ Subscribed project ${project.id} (${project.firstName} ${project.lastName}) to campaign ${campaign.name}`);
  }
}

async function processExistingSubscriptions(campaign: any, photographerId: string): Promise<void> {
  const now = new Date();
  
  // Find active subscriptions that are ready for their next email (only for projects with drip campaigns enabled)
  // Flatten select to avoid Drizzle's nested object issue with table references
  const readySubscriptionRows = await db
    .select({
      // Subscription fields
      subscriptionId: dripCampaignSubscriptions.id,
      subscriptionCampaignId: dripCampaignSubscriptions.campaignId,
      subscriptionProjectId: dripCampaignSubscriptions.projectId,
      subscriptionClientId: dripCampaignSubscriptions.clientId,
      subscriptionStartedAt: dripCampaignSubscriptions.startedAt,
      subscriptionNextEmailIndex: dripCampaignSubscriptions.nextEmailIndex,
      subscriptionNextEmailAt: dripCampaignSubscriptions.nextEmailAt,
      subscriptionStatus: dripCampaignSubscriptions.status,
      subscriptionCompletedAt: dripCampaignSubscriptions.completedAt,
      // Project fields
      projectId: projects.id,
      projectEventDate: projects.eventDate,
      projectTitle: projects.title,
      projectStatus: projects.status,
      projectStageId: projects.stageId, // For stage-based pause detection
      // Contact fields
      contactId: contacts.id,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
      contactPhone: contacts.phone
    })
    .from(dripCampaignSubscriptions)
    .innerJoin(projects, eq(dripCampaignSubscriptions.projectId, projects.id))
    .innerJoin(contacts, eq(projects.clientId, contacts.id))
    .where(and(
      eq(dripCampaignSubscriptions.campaignId, campaign.id),
      eq(dripCampaignSubscriptions.status, 'ACTIVE'),
      lte(dripCampaignSubscriptions.nextEmailAt, now), // Ready to send
      eq(projects.status, 'ACTIVE'), // Project still active
      eq(projects.enableDripCampaigns, true) // Project has drip campaigns enabled
    ));

  console.log(`Found ${readySubscriptionRows.length} subscriptions ready for next email in campaign ${campaign.name}`);

  for (const row of readySubscriptionRows) {
    // Reconstruct objects from flattened row
    const subscription = {
      id: row.subscriptionId,
      campaignId: row.subscriptionCampaignId,
      projectId: row.subscriptionProjectId,
      clientId: row.subscriptionClientId,
      startedAt: row.subscriptionStartedAt,
      nextEmailIndex: row.subscriptionNextEmailIndex,
      nextEmailAt: row.subscriptionNextEmailAt,
      status: row.subscriptionStatus,
      completedAt: row.subscriptionCompletedAt
    };
    const project = {
      id: row.projectId,
      eventDate: row.projectEventDate,
      title: row.projectTitle,
      status: row.projectStatus,
      stageId: row.projectStageId
    };
    const contact = {
      id: row.contactId,
      firstName: row.contactFirstName,
      lastName: row.contactLastName,
      email: row.contactEmail,
      phone: row.contactPhone
    };
    await processSubscriptionEmail(subscription, campaign, project, contact, photographerId);
  }
}

async function processSubscriptionEmail(subscription: any, campaign: any, project: any, contact: any, photographerId: string): Promise<void> {
  console.log(`Processing subscription email for ${contact.firstName} ${contact.lastName}, next email index: ${subscription.nextEmailIndex}`);

  // NEW: Check if project is still within the target stages
  // If not, pause the subscription (they've exited the campaign's stage range)
  // Note: null stageId means project has no stage, which is considered outside target stages
  if (!campaign.isGlobal) {
    let isInTargetStage = false;
    
    // If project has no stage, it's not in any target stage
    if (project.stageId) {
      if (campaign.targetStageIds && Array.isArray(campaign.targetStageIds) && campaign.targetStageIds.length > 0) {
        // Multi-stage targeting: check if project is in ANY of the target stages
        isInTargetStage = campaign.targetStageIds.includes(project.stageId);
      } else if (campaign.targetStageId) {
        // Legacy single stage
        isInTargetStage = project.stageId === campaign.targetStageId;
      }
    }
    // If stageId is null/undefined, isInTargetStage remains false
    
    if (!isInTargetStage) {
      console.log(`⏸️ Project ${project.id} has left target stages for campaign ${campaign.name}, pausing subscription`);
      await db
        .update(dripCampaignSubscriptions)
        .set({ status: 'PAUSED' })
        .where(eq(dripCampaignSubscriptions.id, subscription.id));
      return;
    }
  }

  // Get the next email in the sequence
  const nextEmail = await db
    .select()
    .from(dripCampaignEmails)
    .where(and(
      eq(dripCampaignEmails.campaignId, campaign.id),
      eq(dripCampaignEmails.sequenceIndex, subscription.nextEmailIndex)
    ))
    .limit(1);

  if (nextEmail.length === 0) {
    console.log(`No more emails in sequence for subscription ${subscription.id}, completing campaign`);
    // Mark subscription as completed
    await db
      .update(dripCampaignSubscriptions)
      .set({ 
        status: 'COMPLETED',
        completedAt: new Date()
      })
      .where(eq(dripCampaignSubscriptions.id, subscription.id));
    return;
  }

  const emailToSend = nextEmail[0];

  // Check if email was already delivered (duplicate prevention)
  const existingDelivery = await db
    .select()
    .from(dripEmailDeliveries)
    .where(and(
      eq(dripEmailDeliveries.subscriptionId, subscription.id),
      eq(dripEmailDeliveries.emailId, emailToSend.id)
    ))
    .limit(1);

  if (existingDelivery.length > 0) {
    console.log(`Email ${emailToSend.sequenceIndex} already delivered for subscription ${subscription.id}, skipping`);
    return;
  }

  // Check if project has event date and if it has passed (stop nurturing after event)
  if (project.eventDate) {
    const eventDate = new Date(project.eventDate);
    const now = new Date();
    if (eventDate <= now) {
      console.log(`Event date has passed for project ${project.id}, completing drip campaign`);
      await db
        .update(dripCampaignSubscriptions)
        .set({ 
          status: 'COMPLETED',
          completedAt: new Date()
        })
        .where(eq(dripCampaignSubscriptions.id, subscription.id));
      return;
    }
  }

  // Check max duration (stop after maxDurationMonths)
  const subscriptionStartDate = new Date(subscription.startedAt);
  const maxDurationMs = campaign.maxDurationMonths * 30 * 24 * 60 * 60 * 1000; // Approximate months to milliseconds
  const now = new Date();
  if (now.getTime() - subscriptionStartDate.getTime() > maxDurationMs) {
    console.log(`Max duration reached for subscription ${subscription.id}, completing campaign`);
    await db
      .update(dripCampaignSubscriptions)
      .set({ 
        status: 'COMPLETED',
        completedAt: new Date()
      })
      .where(eq(dripCampaignSubscriptions.id, subscription.id));
    return;
  }

  // Get photographer info for email personalization
  const [photographer] = await db
    .select()
    .from(photographers)
    .where(eq(photographers.id, photographerId));

  // v2025.12.15: Clean slug-based booking URL
  // In prod: baseUrl already includes slug subdomain, so just append /book
  // In dev: baseUrl is plain Replit domain, so append /book/{slug} as path
  // Falls back to token-based URL for legacy accounts without portalSlug
  const baseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'processDripCampaignEmails');
  const isRailwayDrip = !!process.env.RAILWAY_PROJECT_ID || !!process.env.RAILWAY_ENVIRONMENT_NAME;
  const isProductionDrip = process.env.NODE_ENV === 'production' || isRailwayDrip;
  
  // Normalize baseUrl to avoid double slashes
  const normalizedBaseUrlDrip = baseUrl.replace(/\/$/, '');
  
  let schedulingLink = '';
  if (photographer?.portalSlug) {
    if (isProductionDrip) {
      // Production: baseUrl = https://{slug}.tpcportal.co, just append /book
      schedulingLink = `${normalizedBaseUrlDrip}/book`;
    } else {
      // Dev: baseUrl = https://{replit-domain}, append /book/{slug} as path
      schedulingLink = `${normalizedBaseUrlDrip}/book/${photographer.portalSlug}`;
    }
    console.log(`📅 drip scheduler_link (slug-based): ${schedulingLink}`);
  } else if (photographer?.publicToken) {
    schedulingLink = `${normalizedBaseUrlDrip}/booking/calendar/${photographer.publicToken}`;
    console.log(`📅 drip scheduler_link (token fallback): ${schedulingLink}`);
  } else {
    console.warn(`⚠️ drip scheduler_link: No portalSlug or publicToken for photographer ${photographer?.id}`);
  }

  // Fetch gallery variables
  const galleryVars = await getGalleryVariables(project.id, photographerId, subscription.startedAt);
  
  // Prepare variables for template rendering
  const variables = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: `${contact.firstName} ${contact.lastName}`,
    email: contact.email || '',
    phone: contact.phone || '',
    businessName: photographer?.businessName || 'Your Photographer',
    photographerName: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    eventDate: project.eventDate ? new Date(project.eventDate).toLocaleDateString() : 'Not set',
    scheduling_link: schedulingLink,
    scheduler_link: schedulingLink, // Alternative spelling for template compatibility
    testimonials_link: `${baseUrl}/reviews/submit/${photographerId}`,
    ...galleryVars,
    // Uppercase versions for AI-generated placeholders
    SCHEDULING_LINK: schedulingLink,
    SCHEDULER_LINK: schedulingLink,
    PHOTOGRAPHER_NAME: photographer?.photographerName || photographer?.businessName || 'Your Photographer',
    BUSINESS_NAME: photographer?.businessName || 'Your Photographer'
  };

  // Render email content
  const subject = renderTemplate(emailToSend.subject, variables);
  let htmlBody: string;
  
  // Prepare branding data for both builder and non-builder emails
  const brandingData = {
    businessName: photographer?.businessName,
    photographerName: photographer?.photographerName,
    logoUrl: photographer?.logoUrl,
    headshotUrl: photographer?.headshotUrl,
    brandPrimary: photographer?.brandPrimary,
    brandSecondary: photographer?.brandSecondary,
    phone: photographer?.phone,
    email: photographer?.emailFromAddr || photographer?.email,
    website: photographer?.website,
    businessAddress: photographer?.businessAddress,
    socialLinks: photographer?.socialLinks
  };
  
  // If using email builder, convert email blocks to HTML and add header/signature
  if (emailToSend.useEmailBuilder && emailToSend.emailBlocks) {
    const { contentBlocksToHtml } = await import('../../shared/template-utils.js');
    const { generateEmailHeader, generateEmailSignature } = await import('../../shared/email-branding-shared.js');
    
    try {
      const blocks = typeof emailToSend.emailBlocks === 'string' 
        ? JSON.parse(emailToSend.emailBlocks) 
        : emailToSend.emailBlocks;
      
      // Generate content blocks HTML WITHOUT wrapper (raw block markup only)
      const dripBlocksBaseUrl = resolvePortalBaseUrl(photographer?.portalSlug, 'processDripCampaignEmails-blocks');
      const rawBlocksHtml = contentBlocksToHtml(blocks, {
        baseUrl: dripBlocksBaseUrl,
        photographerToken: photographer?.publicToken,
        includeWrapper: false, // No grey container, just the clean block markup
        brandingData // For HEADER and SIGNATURE blocks
      });
      
      console.log('📧 Email builder content (no wrapper), length:', rawBlocksHtml.length);
      
      // Email builder: Use ONLY its own header/signature settings (NO fallback to photographer settings)
      const shouldIncludeHeader = emailToSend.includeHeader === true;
      const headerStyleToUse = emailToSend.headerStyle;
      
      const shouldIncludeSignature = emailToSend.includeSignature === true;
      const signatureStyleToUse = emailToSend.signatureStyle;
      
      const headerHtml = shouldIncludeHeader && headerStyleToUse
        ? generateEmailHeader(headerStyleToUse, brandingData)
        : '';
      
      const signatureHtml = shouldIncludeSignature && signatureStyleToUse
        ? generateEmailSignature(signatureStyleToUse, brandingData)
        : '';
      
      // Combine header + content + signature in a proper email structure
      // Gmail dark mode protection: use color-scheme meta tag and explicit colors with !important
      htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Email</title>
  <style>
    /* Force light mode colors - Gmail dark mode protection */
    body { background-color: #ffffff !important; }
    * { color-scheme: light only !important; }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; background-color: #ffffff !important;">
  <div style="max-width: 600px; margin: 0 auto;">
    ${headerHtml}
    ${rawBlocksHtml}
    ${signatureHtml}
  </div>
</body>
</html>`;
      
      console.log('📧 Final HTML lengths - Header:', headerHtml.length, 'Blocks:', rawBlocksHtml.length, 'Signature:', signatureHtml.length, 'Total:', htmlBody.length);
      
    } catch (error) {
      console.error('Error parsing email blocks:', error);
      htmlBody = renderTemplate(emailToSend.htmlBody, variables);
    }
  } else {
    // Use the raw HTML body for non-builder emails
    htmlBody = renderTemplate(emailToSend.htmlBody, variables);
    
    // Apply email branding wrapper for non-builder emails
    // Fall back to photographer's global settings if individual email doesn't specify
    const shouldIncludeHeader = emailToSend.includeHeader || (!emailToSend.includeHeader && photographer?.emailHeaderStyle);
    const headerStyleToUse = emailToSend.headerStyle || photographer?.emailHeaderStyle;
    
    const shouldIncludeSignature = emailToSend.includeSignature || (!emailToSend.includeSignature && photographer?.emailSignatureStyle);
    const signatureStyleToUse = emailToSend.signatureStyle || photographer?.emailSignatureStyle;
    
    if (shouldIncludeHeader || shouldIncludeSignature) {
      const { wrapEmailContent } = await import('./email-branding.js');
      htmlBody = wrapEmailContent(
        htmlBody,
        shouldIncludeHeader ? headerStyleToUse : null,
        shouldIncludeSignature ? signatureStyleToUse : null,
        brandingData
      );
    }
  }
  
  const textBody = renderTemplate(emailToSend.textBody || '', variables);

  // Create delivery record first
  const deliveryRecord = await db.insert(dripEmailDeliveries).values({
    subscriptionId: subscription.id,
    emailId: emailToSend.id,
    clientId: contact.id,
    projectId: project.id,
    status: 'PENDING'
  }).returning({ id: dripEmailDeliveries.id });

  const deliveryId = deliveryRecord[0].id;

  try {
    // Send email
    console.log(`📧 Sending drip email to ${contact.firstName} ${contact.lastName} (${contact.email})...`);
    
    // Get participant emails for BCC
    const participantEmails = await getParticipantEmailsForBCC(project.id);
    if (participantEmails.length > 0) {
      console.log(`📧 Including ${participantEmails.length} participants in BCC`);
    }
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'scoop@missionscoopable.com';
    const fromName = photographer?.emailFromName || photographer?.businessName || 'Scoop Photography';
    const replyToEmail = photographer?.emailFromAddr || process.env.SENDGRID_REPLY_TO || fromEmail;
    
    const success = await sendEmail({
      to: contact.email,
      from: `${fromName} <${fromEmail}>`,
      replyTo: `${fromName} <${replyToEmail}>`,
      subject,
      html: htmlBody,
      text: textBody,
      bcc: participantEmails.length > 0 ? participantEmails : undefined,
      photographerId: contact.photographerId,
      clientId: contact.id,
      projectId: project.id,
      automationStepId: null,
      source: 'DRIP_CAMPAIGN' as const
    });

    if (success) {
      // Update delivery status to sent
      await db
        .update(dripEmailDeliveries)
        .set({ 
          status: 'SENT',
          sentAt: new Date()
        })
        .where(eq(dripEmailDeliveries.id, deliveryId));

      // Update subscription for next email
      const nextEmailIndex = subscription.nextEmailIndex + 1;
      
      // Get the next email to determine timing mode
      const nextEmail = campaign.emails?.[nextEmailIndex];
      let nextEmailAt: Date;
      
      if (nextEmail?.delayMinutes !== null && nextEmail?.delayMinutes !== undefined) {
        // Delay-based timing: send X minutes after current send
        nextEmailAt = new Date(now.getTime() + (nextEmail.delayMinutes * 60 * 1000));
      } else if (nextEmail?.sendAtHour !== null && nextEmail?.sendAtHour !== undefined) {
        // Schedule-based timing: calculate based on days after subscription start
        const subscriptionStart = subscription.startedAt || now;
        const emailDays = nextEmail.daysAfterStart || 0;
        nextEmailAt = new Date(subscriptionStart.getTime() + (emailDays * 24 * 60 * 60 * 1000));
        nextEmailAt.setHours(nextEmail.sendAtHour, 0, 0, 0);
        // If adjusted time is in the past, bump forward by 24h until it's in the future
        while (nextEmailAt <= now) {
          nextEmailAt = new Date(nextEmailAt.getTime() + (24 * 60 * 60 * 1000));
        }
      } else {
        // Default: use minimum frequency or daysAfterStart
        const minScheduleTime = new Date(now.getTime() + (campaign.emailFrequencyWeeks * 7 * 24 * 60 * 60 * 1000));
        nextEmailAt = new Date(minScheduleTime);
      }

      await db
        .update(dripCampaignSubscriptions)
        .set({
          nextEmailIndex,
          nextEmailAt
        })
        .where(eq(dripCampaignSubscriptions.id, subscription.id));

      console.log(`✅ Sent drip email ${emailToSend.sequenceIndex} to ${contact.firstName} ${contact.lastName}. Next email scheduled for ${nextEmailAt}`);
    } else {
      // Mark delivery as failed
      await db
        .update(dripEmailDeliveries)
        .set({ status: 'FAILED' })
        .where(eq(dripEmailDeliveries.id, deliveryId));

      console.log(`❌ Failed to send drip email to ${contact.firstName} ${contact.lastName}`);
    }
  } catch (error) {
    console.error(`❌ Error sending drip email to ${contact.firstName} ${contact.lastName}:`, error);
    
    // Mark delivery as failed
    await db
      .update(dripEmailDeliveries)
      .set({ status: 'FAILED' })
      .where(eq(dripEmailDeliveries.id, deliveryId));
  }
}

// =========================================
// BOOKING EVENT HANDLERS
// =========================================

/**
 * Handle booking creation event
 * Called when a new booking is created for a project.
 * This doesn't need to do much since the cron job will pick up the new booking
 * and calculate automations based on the booking time.
 */
export async function onBookingCreated(bookingId: string, projectId: string): Promise<void> {
  console.log(`📅 Booking created: ${bookingId} for project ${projectId}`);
  // The automation cron job will naturally pick up this booking
  // when processing BOOKING_START and BOOKING_END anchor types
}

/**
 * Handle booking update event (time change, reschedule)
 * Called when a booking's start/end time is updated.
 * Cancels any pending automation executions that were scheduled based on the old booking time.
 */
export async function onBookingUpdated(bookingId: string, projectId: string, oldStartAt?: Date, oldEndAt?: Date): Promise<void> {
  console.log(`📅 Booking updated: ${bookingId} for project ${projectId}`);
  
  // Cancel any pending automation executions for this project
  // that might have been scheduled based on the old booking time
  await cancelPendingBookingAutomations(projectId);
  
  console.log(`✅ Cleared pending booking-relative automations for project ${projectId}`);
}

/**
 * Handle booking cancellation event
 * Called when a booking is cancelled or deleted.
 * Cancels all pending automation executions for booking-relative automations.
 */
export async function onBookingCancelled(bookingId: string, projectId: string): Promise<void> {
  console.log(`📅 Booking cancelled/deleted: ${bookingId} for project ${projectId}`);
  
  // Cancel all pending booking-relative automation executions
  await cancelPendingBookingAutomations(projectId);
  
  console.log(`✅ Cancelled pending booking-relative automations for project ${projectId}`);
}

/**
 * Cancel all pending automation executions for booking-relative steps in a project
 */
async function cancelPendingBookingAutomations(projectId: string): Promise<void> {
  try {
    // Find all automation steps that use booking-relative anchors
    const bookingRelativeSteps = await db.select({ stepId: automationSteps.id })
      .from(automationSteps)
      .where(or(
        eq(automationSteps.anchorType, 'BOOKING_START'),
        eq(automationSteps.anchorType, 'BOOKING_END')
      ));
    
    if (bookingRelativeSteps.length === 0) {
      return; // No booking-relative steps to cancel
    }
    
    const stepIds = bookingRelativeSteps.map(s => s.stepId);
    
    // Cancel pending executions for these steps on this project
    for (const stepId of stepIds) {
      await db.update(automationExecutions)
        .set({ 
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: 'Booking changed/cancelled'
        })
        .where(and(
          eq(automationExecutions.projectId, projectId),
          eq(automationExecutions.automationStepId, stepId),
          eq(automationExecutions.status, 'PENDING')
        ));
    }
    
    console.log(`🔄 Cancelled ${stepIds.length} booking-relative automation executions for project ${projectId}`);
  } catch (error) {
    console.error(`❌ Error cancelling booking automations for project ${projectId}:`, error);
  }
}

/**
 * Process all due drip campaign emails
 * This function is called by the cron job to send scheduled drip campaign emails
 */
export async function processDripCampaigns(): Promise<void> {
  try {
    // Get all subscriptions where nextEmailAt is due
    const dueSubscriptions = await storage.getDueDripCampaignSubscriptions();
    
    if (dueSubscriptions.length === 0) {
      return; // Nothing to process
    }
    
    console.log(`📧 Processing ${dueSubscriptions.length} due drip campaign emails`);
    
    for (const subscription of dueSubscriptions) {
      try {
        // Get campaign emails
        const campaignEmails = await storage.getDripCampaignEmails(subscription.campaignId);
        const sortedEmails = campaignEmails.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
        
        // Get the email at the current index
        const currentEmail = sortedEmails[subscription.nextEmailIndex];
        
        if (!currentEmail) {
          // No more emails to send - mark as completed
          console.log(`✅ Drip campaign completed for subscription ${subscription.id}`);
          await storage.updateDripCampaignSubscription(subscription.id, {
            status: 'COMPLETED',
            completedAt: new Date()
          });
          continue;
        }
        
        // Get photographer for email sending
        const photographerId = subscription.campaign.photographerId;
        
        // Get photographer details for from address
        const [photographer] = await db
          .select()
          .from(photographers)
          .where(eq(photographers.id, photographerId))
          .limit(1);
        
        // Get client contact details
        const client = await storage.getContact(subscription.clientId);
        if (!client || !client.email) {
          console.error(`❌ Client ${subscription.clientId} has no email, skipping`);
          continue;
        }
        
        // Get project for template variables
        const project = await storage.getProject(subscription.projectId);
        
        // Render email content with personalization
        const templateVars: Record<string, string> = {
          first_name: client.firstName || '',
          last_name: client.lastName || '',
          client_name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
          project_title: project?.title || '',
          event_date: project?.eventDate ? new Date(project.eventDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : ''
        };
        
        // Render subject and body with template variables
        const renderedSubject = renderTemplate(currentEmail.subject, templateVars);
        const renderedHtml = currentEmail.htmlBody ? renderTemplate(currentEmail.htmlBody, templateVars) : undefined;
        const renderedText = currentEmail.textBody ? renderTemplate(currentEmail.textBody, templateVars) : undefined;
        
        // Helper function to calculate next email timing
        const calculateNextEmailAt = async (nextEmail: typeof currentEmail) => {
          const now = new Date();
          let nextEmailAt = new Date(now);
          
          // Priority: delayMinutes > daysAfterStart > campaign frequency
          if (nextEmail.delayMinutes !== null && nextEmail.delayMinutes !== undefined) {
            nextEmailAt = new Date(now.getTime() + (nextEmail.delayMinutes * 60 * 1000));
          } else if (nextEmail.daysAfterStart !== null && nextEmail.daysAfterStart !== undefined) {
            // Calculate from subscription start date
            nextEmailAt = new Date(subscription.startedAt!);
            nextEmailAt.setDate(nextEmailAt.getDate() + nextEmail.daysAfterStart);
            if (nextEmail.sendAtHour !== null && nextEmail.sendAtHour !== undefined) {
              nextEmailAt.setHours(nextEmail.sendAtHour, 0, 0, 0);
            }
            // If this time is in the past, schedule for today/tomorrow
            if (nextEmailAt <= now) {
              nextEmailAt = new Date(now);
              if (nextEmail.sendAtHour !== null && nextEmail.sendAtHour !== undefined) {
                nextEmailAt.setHours(nextEmail.sendAtHour, 0, 0, 0);
                if (nextEmailAt <= now) {
                  nextEmailAt.setDate(nextEmailAt.getDate() + 1);
                }
              } else {
                nextEmailAt.setMinutes(nextEmailAt.getMinutes() + 5);
              }
            }
          } else {
            // Fallback to campaign frequency
            const campaign = await storage.getDripCampaign(subscription.campaignId);
            if (campaign?.emailFrequencyDays) {
              nextEmailAt.setDate(nextEmailAt.getDate() + campaign.emailFrequencyDays);
            } else if (campaign?.emailFrequencyWeeks) {
              nextEmailAt.setDate(nextEmailAt.getDate() + (campaign.emailFrequencyWeeks * 7));
            } else {
              nextEmailAt.setDate(nextEmailAt.getDate() + 7); // Default to 1 week
            }
          }
          return nextEmailAt;
        };
        
        // Helper function to advance to next email
        const advanceToNextEmail = async () => {
          const nextEmailIndex = subscription.nextEmailIndex + 1;
          const nextEmail = sortedEmails[nextEmailIndex];
          
          if (nextEmail) {
            const nextEmailAt = await calculateNextEmailAt(nextEmail);
            await storage.updateDripCampaignSubscription(subscription.id, {
              nextEmailIndex,
              nextEmailAt
            });
            console.log(`  → Next drip email (index ${nextEmailIndex}) scheduled for ${nextEmailAt.toISOString()}`);
          } else {
            await storage.updateDripCampaignSubscription(subscription.id, {
              status: 'COMPLETED',
              completedAt: new Date(),
              nextEmailIndex
            });
            console.log(`✅ Drip campaign completed for subscription ${subscription.id}`);
          }
        };
        
        // Atomic claim: Insert PENDING delivery record BEFORE sending
        // This prevents duplicate sends from parallel cron executions
        let deliveryId: string;
        try {
          const delivery = await storage.createDripEmailDelivery({
            subscriptionId: subscription.id,
            emailId: currentEmail.id,
            clientId: subscription.clientId,
            projectId: subscription.projectId,
            status: 'PENDING',
            sentAt: new Date()
          });
          deliveryId = delivery.id;
        } catch (claimError: any) {
          // Duplicate key = another worker already claimed this email
          // DO NOT advance - let the original worker handle subscription state
          if (claimError.code === '23505') {
            console.log(`⏭️ Email already claimed by another worker for subscription ${subscription.id}, skipping (no-op)`);
            continue;
          }
          throw claimError;
        }
        
        // Send the email
        console.log(`📤 Sending drip email "${currentEmail.subject}" to ${client.email}`);
        
        // Build from address using photographer's verified sender email
        const fromEmail = photographer?.emailFromAddr || process.env.SENDGRID_FROM_EMAIL || 'info@thephotocrm.com';
        const fromName = photographer?.emailFromName || photographer?.businessName || 'Your Photographer';
        
        const emailResult = await sendEmail({
          to: client.email,
          from: `${fromName} <${fromEmail}>`,
          subject: renderedSubject,
          html: renderedHtml,
          text: renderedText,
          photographerId: photographerId,
          clientId: subscription.clientId,
          projectId: subscription.projectId,
          source: 'DRIP_CAMPAIGN'
        });
        
        // Update delivery record with result
        await storage.updateDripEmailDelivery(deliveryId, {
          status: emailResult.success ? 'SENT' : 'FAILED',
          providerId: emailResult.messageId
        });
        
        if (emailResult.success) {
          console.log(`✅ Drip email sent successfully to ${client.email}`);
        } else {
          console.error(`❌ Failed to send drip email to ${client.email}: ${emailResult.error}`);
        }
        
        // Always advance to next email (whether success or failure)
        await advanceToNextEmail();
        
      } catch (subscriptionError) {
        console.error(`❌ Error processing drip subscription ${subscription.id}:`, subscriptionError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing drip campaigns:', error);
  }
}
