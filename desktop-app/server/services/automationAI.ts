import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as crypto from "crypto";
import type { Stage, Automation } from "../../shared/schema";
import {
  getStageAutomationConfig,
  type AutomationTemplate,
  type ContentBlock,
} from "./automationTemplates";

// Generate UUID v4
function uuidv4(): string {
  return crypto.randomUUID();
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Stage Intent Categories
export type StageIntent =
  | "INQUIRY" // Initial contact, lead capture
  | "QUALIFICATION" // Discovery calls, consultations
  | "PROPOSAL" // Proposals sent, awaiting decision
  | "BOOKING" // Booked/paid, contract signed
  | "PRE_EVENT" // Pre-wedding/event preparation
  | "POST_EVENT" // Gallery delivery, editing phase
  | "NURTURE"; // Completed, review requests, referrals

// Classification result for a single stage
export interface StageClassification {
  stageId: string;
  stageName: string;
  orderIndex: number;
  intent: StageIntent;
  confidence: number;
  reasoning: string;
}

// Generated automation preview (before creation)
export interface GeneratedAutomationPreview {
  id: string;
  name: string;
  description: string;
  stageId: string;
  stageName: string;
  stageIntent: StageIntent;
  automationType: "COMMUNICATION" | "STAGE_CHANGE" | "COUNTDOWN";
  channel: "EMAIL" | "SMS" | null;
  triggerType: string | null;
  targetStageId: string | null;
  targetStageName: string | null;
  delayMinutes: number;
  delayDays: number;
  sendAtHour: number | null;
  emailSubject: string | null;
  emailBody: string | null;
  contentBlocks: ContentBlock[] | null;
  smsContent: string | null;
  enabled: boolean;
  hasConflict: boolean;
  conflictAutomationId: string | null;
}

// Zod schema for AI classification
const StageIntentSchema = z.object({
  stageId: z.string(),
  intent: z.enum([
    "INQUIRY",
    "QUALIFICATION",
    "PROPOSAL",
    "BOOKING",
    "PRE_EVENT",
    "POST_EVENT",
    "NURTURE",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const AllStagesClassificationSchema = z.object({
  classifications: z.array(StageIntentSchema),
});

// Project type context for templates
interface ProjectTypeContext {
  eventName: string; // "wedding", "session", "shoot", "event"
  eventNamePlural: string; // "weddings", "sessions", "shoots", "events"
  clientType: string; // "couple", "client", "family"
  timeframe: string; // "big day", "session", "shoot date"
  deliverable: string; // "photos", "images", "gallery"
}

function getProjectTypeContext(projectType: string): ProjectTypeContext {
  const type = projectType.toUpperCase();

  switch (type) {
    case "WEDDING":
      return {
        eventName: "wedding",
        eventNamePlural: "weddings",
        clientType: "couple",
        timeframe: "big day",
        deliverable: "wedding photos",
      };
    case "ENGAGEMENT":
      return {
        eventName: "engagement session",
        eventNamePlural: "engagement sessions",
        clientType: "couple",
        timeframe: "session",
        deliverable: "engagement photos",
      };
    case "PORTRAIT":
    case "PORTRAITS":
      return {
        eventName: "portrait session",
        eventNamePlural: "portrait sessions",
        clientType: "client",
        timeframe: "session",
        deliverable: "portraits",
      };
    case "FAMILY":
      return {
        eventName: "family session",
        eventNamePlural: "family sessions",
        clientType: "family",
        timeframe: "session",
        deliverable: "family photos",
      };
    case "HEADSHOT":
    case "HEADSHOTS":
      return {
        eventName: "headshot session",
        eventNamePlural: "headshot sessions",
        clientType: "client",
        timeframe: "session",
        deliverable: "headshots",
      };
    case "NEWBORN":
      return {
        eventName: "newborn session",
        eventNamePlural: "newborn sessions",
        clientType: "family",
        timeframe: "session",
        deliverable: "newborn photos",
      };
    case "MATERNITY":
      return {
        eventName: "maternity session",
        eventNamePlural: "maternity sessions",
        clientType: "client",
        timeframe: "session",
        deliverable: "maternity photos",
      };
    case "BOUDOIR":
      return {
        eventName: "boudoir session",
        eventNamePlural: "boudoir sessions",
        clientType: "client",
        timeframe: "session",
        deliverable: "images",
      };
    case "COMMERCIAL":
    case "CORPORATE":
      return {
        eventName: "photo shoot",
        eventNamePlural: "photo shoots",
        clientType: "client",
        timeframe: "shoot",
        deliverable: "images",
      };
    case "EVENT":
    case "EVENTS":
      return {
        eventName: "event",
        eventNamePlural: "events",
        clientType: "client",
        timeframe: "event",
        deliverable: "event photos",
      };
    case "SENIOR":
      return {
        eventName: "senior session",
        eventNamePlural: "senior sessions",
        clientType: "senior",
        timeframe: "session",
        deliverable: "senior portraits",
      };
    case "MINI":
    case "MINI_SESSION":
      return {
        eventName: "mini session",
        eventNamePlural: "mini sessions",
        clientType: "client",
        timeframe: "session",
        deliverable: "photos",
      };
    default:
      return {
        eventName: "session",
        eventNamePlural: "sessions",
        clientType: "client",
        timeframe: "session",
        deliverable: "photos",
      };
  }
}

/**
 * Classify all stages by their intent using AI
 */
export async function classifyStageIntents(
  stages: Stage[],
): Promise<StageClassification[]> {
  if (stages.length === 0) {
    return [];
  }

  // First, try to match known templates
  const classifications: StageClassification[] = [];
  const unknownStages: Stage[] = [];

  for (const stage of stages) {
    const knownIntent = getKnownStageIntent(stage.name || "");
    if (knownIntent) {
      classifications.push({
        stageId: stage.id,
        stageName: stage.name || "",
        orderIndex: stage.orderIndex || 0,
        intent: knownIntent.intent,
        confidence: knownIntent.confidence,
        reasoning: knownIntent.reasoning,
      });
    } else {
      unknownStages.push(stage);
    }
  }

  // For unknown stages, use AI classification
  if (unknownStages.length > 0) {
    const aiClassifications = await classifyUnknownStagesWithAI(
      unknownStages,
      stages.length,
    );
    classifications.push(...aiClassifications);
  }

  // Sort by orderIndex
  return classifications.sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Try to match a stage name to a known intent without AI
 */
function getKnownStageIntent(
  stageName: string,
): { intent: StageIntent; confidence: number; reasoning: string } | null {
  const normalized = stageName.toLowerCase().trim();

  // INQUIRY patterns
  if (
    /^(new\s+)?(inquiry|lead|contact|interested|prospect)$/i.test(normalized) ||
    /new\s+(inquiry|lead)/i.test(normalized)
  ) {
    return {
      intent: "INQUIRY",
      confidence: 0.95,
      reasoning: "Stage name indicates initial lead/inquiry stage",
    };
  }

  // QUALIFICATION patterns
  if (
    /consultation|discovery|call|meeting|scheduled|qualification|intro/i.test(
      normalized,
    )
  ) {
    return {
      intent: "QUALIFICATION",
      confidence: 0.92,
      reasoning: "Stage name indicates consultation/discovery stage",
    };
  }

  // PROPOSAL patterns
  if (
    /proposal|quote|estimate|sent|pricing|offer/i.test(normalized) &&
    !/booked|paid|accepted/i.test(normalized)
  ) {
    return {
      intent: "PROPOSAL",
      confidence: 0.93,
      reasoning: "Stage name indicates proposal/quote stage",
    };
  }

  // BOOKING patterns
  if (
    /booked|retainer|deposit|paid|confirmed|signed|contract/i.test(
      normalized,
    ) &&
    !/proposal/i.test(normalized)
  ) {
    return {
      intent: "BOOKING",
      confidence: 0.94,
      reasoning: "Stage name indicates booked/confirmed stage",
    };
  }

  // PRE_EVENT patterns
  if (
    /pre[- ]?(event|wedding|shoot)|planning|prep|timeline|before/i.test(
      normalized,
    )
  ) {
    return {
      intent: "PRE_EVENT",
      confidence: 0.91,
      reasoning: "Stage name indicates pre-event preparation stage",
    };
  }

  // POST_EVENT patterns
  if (
    /gallery|deliver|editing|edit|sneak|post[- ]?(event|wedding)|completed/i.test(
      normalized,
    ) &&
    !/review|referral|nurture/i.test(normalized)
  ) {
    return {
      intent: "POST_EVENT",
      confidence: 0.9,
      reasoning: "Stage name indicates post-event/delivery stage",
    };
  }

  // NURTURE patterns
  if (
    /review|referral|alumni|past|nurture|follow[- ]?up|archive/i.test(
      normalized,
    )
  ) {
    return {
      intent: "NURTURE",
      confidence: 0.88,
      reasoning: "Stage name indicates nurture/completed client stage",
    };
  }

  return null;
}

/**
 * Use AI to classify stages that don't match known patterns
 */
async function classifyUnknownStagesWithAI(
  unknownStages: Stage[],
  totalStages: number,
): Promise<StageClassification[]> {
  const stageData = unknownStages.map((s) => ({
    stageId: s.id,
    stageName: s.name || "",
    orderIndex: s.orderIndex || 0,
    totalStages,
  }));

  const systemPrompt = `You are an expert at understanding photographer CRM workflows.

Classify each pipeline stage into one of these intent categories:
- INQUIRY: First contact, new leads entering the system (typically position 0-1)
- QUALIFICATION: Discovery calls, consultations, getting to know the client
- PROPOSAL: Proposal/quote sent, awaiting client decision
- BOOKING: Client has booked/paid, contract signed, committed
- PRE_EVENT: Preparation phase before the session/event
- POST_EVENT: After the event - editing, gallery delivery, album design
- NURTURE: Completed clients - reviews, referrals, future bookings (typically last positions)

Consider these heuristics:
1. Position 0-1 stages are typically INQUIRY
2. Words like "Discovery", "Consultation", "Call", "Meeting" → QUALIFICATION
3. "Proposal", "Quote", "Sent", "Pending" → PROPOSAL
4. "Booked", "Paid", "Retainer", "Confirmed", "Signed" → BOOKING
5. "Pre-", "Planning", "Timeline", "Prep" → PRE_EVENT
6. "Gallery", "Editing", "Delivered", "Album", "Sneak Peek" → POST_EVENT
7. "Completed", "Review", "Referral", "Alumni", "Past" → NURTURE
8. Later position stages (last 1-2 in pipeline) are often POST_EVENT or NURTURE

Return your classifications with confidence scores (0.0-1.0).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Classify these pipeline stages:\n${JSON.stringify(stageData, null, 2)}`,
        },
      ],
      response_format: zodResponseFormat(
        AllStagesClassificationSchema,
        "stage_classifications",
      ),
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return unknownStages.map((s) =>
        positionBasedClassification(s, totalStages),
      );
    }

    const parsed = JSON.parse(content) as z.infer<
      typeof AllStagesClassificationSchema
    >;
    if (!parsed || !parsed.classifications) {
      return unknownStages.map((s) =>
        positionBasedClassification(s, totalStages),
      );
    }

    return parsed.classifications.map(
      (c: z.infer<typeof StageIntentSchema>) => {
        const stage = unknownStages.find((s) => s.id === c.stageId);
        return {
          stageId: c.stageId,
          stageName: stage?.name || "",
          orderIndex: stage?.orderIndex || 0,
          intent: c.intent as StageIntent,
          confidence: c.confidence,
          reasoning: c.reasoning,
        };
      },
    );
  } catch (error) {
    console.error(
      "AI classification failed, using position-based fallback:",
      error,
    );
    return unknownStages.map((s) =>
      positionBasedClassification(s, totalStages),
    );
  }
}

/**
 * Fallback: classify based on position in pipeline
 */
function positionBasedClassification(
  stage: Stage,
  totalStages: number,
): StageClassification {
  const position = stage.orderIndex || 0;
  const relativePosition = totalStages > 1 ? position / (totalStages - 1) : 0;

  let intent: StageIntent;
  let confidence = 0.6;

  if (relativePosition <= 0.15) {
    intent = "INQUIRY";
  } else if (relativePosition <= 0.3) {
    intent = "QUALIFICATION";
  } else if (relativePosition <= 0.45) {
    intent = "PROPOSAL";
  } else if (relativePosition <= 0.6) {
    intent = "BOOKING";
  } else if (relativePosition <= 0.75) {
    intent = "PRE_EVENT";
  } else if (relativePosition <= 0.9) {
    intent = "POST_EVENT";
  } else {
    intent = "NURTURE";
  }

  return {
    stageId: stage.id,
    stageName: stage.name || "",
    orderIndex: position,
    intent,
    confidence,
    reasoning: `Classified by position in pipeline (${Math.round(relativePosition * 100)}%)`,
  };
}

/**
 * Generate automation previews for a classified stage
 */
export async function generateAutomationsForStage(
  classification: StageClassification,
  existingAutomations: Automation[],
  allStages: Stage[],
  businessName: string = "our studio",
  projectType: string = "WEDDING",
): Promise<GeneratedAutomationPreview[]> {
  const ctx = getProjectTypeContext(projectType);

  // Generate automations based on intent with project type context
  const templates = getTemplatesForIntent(
    classification.intent,
    businessName,
    ctx,
  );
  return convertTemplatesToPreviews(
    templates,
    classification,
    existingAutomations,
    allStages,
    businessName,
  );
}

/**
 * Convert automation templates to preview format
 */
function convertTemplatesToPreviews(
  templates: AutomationTemplate[],
  classification: StageClassification,
  existingAutomations: Automation[],
  allStages: Stage[],
  businessName: string,
): GeneratedAutomationPreview[] {
  return templates.map((template) => {
    const step = template.steps[0];

    // Check for conflicts with existing automations
    const conflict = detectConflict(
      template,
      classification.stageId,
      existingAutomations,
    );

    // Find target stage ID if this is a stage change automation
    let targetStageId: string | null = null;
    let targetStageName: string | null = template.targetStageName || null;
    if (
      template.automationType === "STAGE_CHANGE" &&
      template.targetStageName
    ) {
      // Try multiple matching strategies for flexibility with custom stage names
      const searchTerm = template.targetStageName.toLowerCase();

      // Strategy 1: Exact match (case-insensitive)
      let targetStage = allStages.find(
        (s) => s.name?.toLowerCase() === searchTerm,
      );

      // Strategy 2: Stage name starts with search term (e.g., "Booked" matches "Booked / Paid")
      if (!targetStage) {
        targetStage = allStages.find((s) =>
          s.name?.toLowerCase().startsWith(searchTerm),
        );
      }

      // Strategy 3: Stage name includes search term
      if (!targetStage) {
        targetStage = allStages.find((s) =>
          s.name?.toLowerCase().includes(searchTerm),
        );
      }

      // Strategy 4: Search term matches common synonyms
      if (!targetStage) {
        const synonymMap: Record<string, string[]> = {
          booked: ["booked", "paid", "retainer", "confirmed", "contracted"],
          booking: ["booked", "paid", "retainer", "confirmed", "contracted"],
          consultation: [
            "consultation",
            "discovery",
            "call",
            "meeting",
            "consult",
          ],
          proposal: ["proposal", "quote", "estimate", "pricing", "sent"],
          completed: ["completed", "finished", "done", "delivered", "complete"],
          "pre-event": [
            "pre-event",
            "pre-wedding",
            "planning",
            "preparation",
            "prep",
          ],
          "post-event": [
            "post-event",
            "post-wedding",
            "editing",
            "delivery",
            "post",
          ],
          nurture: ["nurture", "past", "alumni", "referral", "completed"],
        };

        const synonyms = synonymMap[searchTerm] || [];
        if (synonyms.length > 0) {
          targetStage = allStages.find((s) => {
            const name = s.name?.toLowerCase() || "";
            return synonyms.some((syn) => name.includes(syn));
          });
        }
      }

      // Strategy 5: Position-based fallback for common transitions
      if (!targetStage) {
        // Sort stages by order
        const sortedStages = [...allStages].sort(
          (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0),
        );

        if (searchTerm === "consultation" || searchTerm === "discovery") {
          // Usually the 2nd stage
          targetStage = sortedStages[1];
        } else if (searchTerm === "proposal" || searchTerm === "quote") {
          // Usually the 3rd stage
          targetStage = sortedStages[2];
        } else if (searchTerm === "booked" || searchTerm === "booking") {
          // Usually the 4th stage (or 2nd to last)
          targetStage = sortedStages[Math.max(0, sortedStages.length - 2)];
        } else if (searchTerm === "completed" || searchTerm === "done") {
          // Usually the last stage
          targetStage = sortedStages[sortedStages.length - 1];
        }
      }

      targetStageId = targetStage?.id || null;
      targetStageName = targetStage?.name || template.targetStageName;

      if (!targetStageId) {
        console.warn(
          `Could not find target stage for "${template.targetStageName}" among stages: ${allStages.map((s) => s.name).join(", ")}`,
        );
      }
    }

    // Get email content
    const emailSubject =
      step?.template?.subject?.replace(
        /\{\{business_name\}\}/g,
        businessName,
      ) || null;
    const emailBody =
      step?.template?.htmlBody?.replace(
        /\{\{business_name\}\}/g,
        businessName,
      ) || null;
    const smsContent =
      step?.customSmsContent?.replace(/\{\{business_name\}\}/g, businessName) ||
      null;

    return {
      id: uuidv4(),
      name: template.name,
      description: template.description,
      stageId: classification.stageId,
      stageName: classification.stageName,
      stageIntent: classification.intent,
      automationType: template.automationType,
      channel: template.channel || null,
      triggerType: template.triggerType || null,
      targetStageId,
      targetStageName,
      delayMinutes: step?.delayMinutes || 0,
      delayDays: Math.floor((step?.delayMinutes || 0) / 1440),
      sendAtHour: null,
      emailSubject,
      emailBody,
      contentBlocks: step?.template?.contentBlocks || null,
      smsContent,
      enabled: !conflict.hasConflict,
      hasConflict: conflict.hasConflict,
      conflictAutomationId: conflict.conflictId,
    };
  });
}

/**
 * Detect if an automation would conflict with existing ones
 */
function detectConflict(
  template: AutomationTemplate,
  stageId: string,
  existingAutomations: Automation[],
): { hasConflict: boolean; conflictId: string | null } {
  for (const existing of existingAutomations) {
    if (existing.stageId !== stageId) continue;

    if (
      template.automationType === "COMMUNICATION" &&
      existing.automationType === "COMMUNICATION"
    ) {
      if (existing.channel === template.channel) {
        return { hasConflict: true, conflictId: existing.id };
      }
    }

    if (
      template.automationType === "STAGE_CHANGE" &&
      existing.automationType === "STAGE_CHANGE"
    ) {
      if (existing.triggerType === template.triggerType) {
        return { hasConflict: true, conflictId: existing.id };
      }
    }
  }

  return { hasConflict: false, conflictId: null };
}

/**
 * Get automation templates for a specific intent
 */
function getTemplatesForIntent(
  intent: StageIntent,
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  switch (intent) {
    case "INQUIRY":
      return getInquiryTemplates(businessName, ctx);
    case "QUALIFICATION":
      return getQualificationTemplates(businessName, ctx);
    case "PROPOSAL":
      return getProposalTemplates(businessName, ctx);
    case "BOOKING":
      return getBookingTemplates(businessName, ctx);
    case "PRE_EVENT":
      return getPreEventTemplates(businessName, ctx);
    case "POST_EVENT":
      return getPostEventTemplates(businessName, ctx);
    case "NURTURE":
      return getNurtureTemplates(businessName, ctx);
    default:
      return [];
  }
}

// =============================================================================
// INTENT-BASED TEMPLATES (Project Type Aware)
// =============================================================================

function getInquiryTemplates(
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  return [
    {
      name: "Instant welcome email",
      description: "Immediate response to new inquiry",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 0,
          actionType: "EMAIL",
          template: {
            name: "Inquiry - Instant Response",
            channel: "EMAIL",
            subject: `Thanks for reaching out about your ${ctx.eventName}!`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>Thank you so much for reaching out! I'm thrilled to hear from you and would love to learn more about your ${ctx.eventName}.</p>
<p>I specialize in capturing authentic, beautiful moments and would be honored to be part of your ${ctx.timeframe}.</p>
<p>Here's the quickest way to get started - pick a time that works for you to chat:</p>
<p>[[BUTTON:CALENDAR:Book a Call]]</p>
<p>In the meantime, feel free to check out some of my recent ${ctx.eventNamePlural}:</p>
<p>[[BUTTON:GALLERY:View Gallery]]</p>
<p>Looking forward to connecting!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nThank you so much for reaching out! I'm thrilled to hear from you and would love to learn more about your ${ctx.eventName}.\n\nI specialize in capturing authentic, beautiful moments and would be honored to be part of your ${ctx.timeframe}.\n\nLooking forward to connecting!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Quick SMS follow-up",
      description: "Personal text message 1 minute after inquiry",
      automationType: "COMMUNICATION",
      channel: "SMS",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 1,
          actionType: "SMS",
          customSmsContent: `Hey {{first_name}}! This is {{photographer_name}} from ${businessName}. Thanks for reaching out about your ${ctx.eventName}! I just sent you an email with more info. Looking forward to chatting!`,
        },
      ],
    },
    {
      name: "24-hour follow-up",
      description: "Gentle reminder if no response within 24 hours",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 1440,
          actionType: "EMAIL",
          template: {
            name: "Inquiry - 24h Follow-up",
            channel: "EMAIL",
            subject: `Still thinking about your ${ctx.eventName}?`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>Just checking in to see if you had any questions about my ${ctx.eventName} photography services!</p>
<p>I know there's a lot to consider when planning. I'd love to hear more about your vision and what matters most to you for your ${ctx.timeframe}.</p>
<p>Here's my calendar if you'd like to chat:</p>
<p>[[BUTTON:CALENDAR:Book a Call]]</p>
<p>No pressure at all - just here when you're ready!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nJust checking in to see if you had any questions! I'd love to hear more about your vision for your ${ctx.timeframe}.\n\nNo pressure - just here when you're ready!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "48-hour social proof",
      description: "Share testimonials and recent work",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 2880,
          actionType: "EMAIL",
          template: {
            name: "Inquiry - 48h Social Proof",
            channel: "EMAIL",
            subject: "What others are saying...",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I wanted to share what some of my recent ${ctx.clientType}s have said about their experience:</p>
<p><em>"The ${ctx.deliverable} exceeded our expectations! So glad we chose ${businessName}."</em></p>
<p>You can see more reviews and recent work here:</p>
<p>[[BUTTON:TESTIMONIALS:Read Reviews]]</p>
<p>If you'd like to chat about your ${ctx.eventName}, I'm here:</p>
<p>[[BUTTON:CALENDAR:Book a Call]]</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nI wanted to share what some recent clients have said:\n\n"The ${ctx.deliverable} exceeded our expectations!"\n\nIf you'd like to chat, I'm here!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "7-day last chance",
      description: "Final follow-up before closing the inquiry",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 10080,
          actionType: "EMAIL",
          template: {
            name: "Inquiry - 7 Day Final",
            channel: "EMAIL",
            subject: "Should I close your inquiry?",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I wanted to check in one last time before I close out your inquiry. No worries if you've decided to go a different direction!</p>
<p>If you're still looking for a photographer for your ${ctx.eventName}, I'd love to connect. Just grab a time here:</p>
<p>[[BUTTON:CALENDAR:Book a Call]]</p>
<p>Either way, I wish you all the best!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nJust checking in one last time. If you're still looking for a photographer, I'd love to connect!\n\nEither way, wishing you all the best!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    // Pipeline automation: Move to Consultation when they book an appointment
    {
      name: "Move to Consultation on appointment",
      description:
        "Auto-move to Consultation stage when client books an appointment",
      automationType: "STAGE_CHANGE",
      triggerType: "APPOINTMENT_BOOKED",
      targetStageName: "Consultation",
      steps: [],
    },
  ];
}

function getQualificationTemplates(
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  return [
    {
      name: "Call confirmation email",
      description: "Confirm the scheduled consultation",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 0,
          actionType: "EMAIL",
          template: {
            name: "Consultation - Confirmation",
            channel: "EMAIL",
            subject: "Your consultation is confirmed!",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I'm so excited for our upcoming chat! Your consultation is confirmed.</p>
<p>Here's what we'll cover:</p>
<ul>
<li>Your vision and style preferences for your ${ctx.eventName}</li>
<li>Important moments you want captured</li>
<li>Packages and how I can best serve you</li>
</ul>
<p>Before we talk, think about what ${ctx.deliverable} matter most to you and any questions you have!</p>
<p>Talk soon,</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nYour consultation is confirmed! I'm excited to learn about your ${ctx.eventName}.\n\nBefore we talk, think about what moments matter most to you!\n\nTalk soon,\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "SMS confirmation",
      description: "Quick text confirmation",
      automationType: "COMMUNICATION",
      channel: "SMS",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 1,
          actionType: "SMS",
          customSmsContent: `Hey {{first_name}}! Your consultation with {{photographer_name}} is confirmed! I just sent you an email with what we'll cover. Can't wait to chat about your ${ctx.eventName}!`,
        },
      ],
    },
    {
      name: "1-hour reminder SMS",
      description: "Reminder 1 hour before the call",
      automationType: "COMMUNICATION",
      channel: "SMS",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 60,
          actionType: "SMS",
          customSmsContent: `Hey {{first_name}}! Quick reminder - we're chatting about your ${ctx.eventName} in about an hour! Looking forward to it. - {{photographer_name}}`,
        },
      ],
    },
    {
      name: "Post-call thank you",
      description: "Thank you email after consultation",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 120,
          actionType: "EMAIL",
          template: {
            name: "Consultation - Thank You",
            channel: "EMAIL",
            subject: "Great chatting with you!",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>It was wonderful getting to know you! I loved hearing about your ${ctx.eventName} plans.</p>
<p>I'm putting together a custom proposal based on what we discussed. You'll receive it soon!</p>
<p>In the meantime, if you have any questions or thoughts, just reply to this email.</p>
<p>So excited about the possibility of capturing your ${ctx.timeframe}!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nGreat chatting with you! I'm putting together your proposal now.\n\nSo excited about the possibility of working together!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    // Pipeline automation: Move to Proposal when Smart File is sent
    {
      name: "Move to Proposal on quote sent",
      description: "Auto-move to Proposal stage when you send a proposal/quote",
      automationType: "STAGE_CHANGE",
      triggerType: "SMART_FILE_SENT",
      targetStageName: "Proposal",
      steps: [],
    },
  ];
}

function getProposalTemplates(
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  return [
    {
      name: "24-hour proposal follow-up",
      description: "Check in 24 hours after sending proposal",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 1440,
          actionType: "EMAIL",
          template: {
            name: "Proposal - 24h Follow-up",
            channel: "EMAIL",
            subject: "Any questions about your proposal?",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>Just checking in to make sure you received the proposal I sent over for your ${ctx.eventName}!</p>
<p>If you have any questions about the packages, pricing, or anything else, I'm happy to hop on a quick call or answer via email.</p>
<p>No pressure at all - I know there's a lot to consider. Just want to make sure you have everything you need!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nJust checking in about your proposal! Any questions? I'm here to help.\n\nNo pressure - just want to make sure you have what you need!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "3-day value reminder",
      description: "Reinforce value 3 days after proposal",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 4320,
          actionType: "EMAIL",
          template: {
            name: "Proposal - 3 Day Nudge",
            channel: "EMAIL",
            subject: "Still thinking it over?",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I know planning involves so many decisions! Just wanted to share what ${ctx.clientType}s love most about working with me:</p>
<ul>
<li>Stress-free experience - I handle all the photography logistics</li>
<li>Authentic moments - real emotions, not just posed shots</li>
<li>Quick turnaround - sneak peeks within days</li>
</ul>
<p>If anything is holding you back or you'd like to discuss the proposal, I'm here!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nStill thinking about your ${ctx.eventName} photography? Here's what clients love:\n\n- Stress-free experience\n- Authentic moments\n- Quick turnaround\n\nI'm here if you have questions!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "7-day final follow-up",
      description: "Last gentle push 7 days after proposal",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 10080,
          actionType: "EMAIL",
          template: {
            name: "Proposal - 7 Day Final",
            channel: "EMAIL",
            subject: "One more thing...",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I wanted to reach out one last time about the proposal. I completely understand if you've decided to go a different direction!</p>
<p>If you're still interested but need more time, I'm happy to extend the proposal or adjust anything to better fit your needs.</p>
<p>If I don't hear back, I'll assume you've found your perfect photographer - and I genuinely wish you all the best with your ${ctx.eventName}!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nLast check-in about your proposal. If you need more time or adjustments, I'm happy to help!\n\nEither way, wishing you an amazing ${ctx.eventName}!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Move to Booked on payment",
      description: "Auto-move to Booked stage when payment received",
      automationType: "STAGE_CHANGE",
      triggerType: "ANY_PAYMENT_MADE",
      targetStageName: "Booked",
      steps: [],
    },
  ];
}

function getBookingTemplates(
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  return [
    {
      name: "Booking celebration email",
      description: "Welcome the newly booked client",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 0,
          actionType: "EMAIL",
          template: {
            name: "Booking - Celebration",
            channel: "EMAIL",
            subject: `You're officially booked! Let's do this!`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>WOOHOO! I am SO excited - you're officially booked! This is going to be amazing.</p>
<p>Here's what happens next:</p>
<ul>
<li>I'll send you a planning questionnaire closer to your ${ctx.timeframe}</li>
<li>We'll create a timeline together to make sure every moment is captured</li>
<li>I'm here for any questions along the way!</li>
</ul>
<p>Thank you for trusting me with your ${ctx.eventName}. I can't wait to capture your ${ctx.deliverable}!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nWOOHOO! You're officially booked!\n\nI'll be in touch with next steps, but I'm here for any questions in the meantime.\n\nCan't wait!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Welcome SMS",
      description: "Quick celebratory text after booking",
      automationType: "COMMUNICATION",
      channel: "SMS",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 5,
          actionType: "SMS",
          customSmsContent: `{{first_name}}! You're officially booked! I am SO excited to capture your ${ctx.eventName}. Check your email for next steps. Can't wait! - {{photographer_name}}`,
        },
      ],
    },
    {
      name: "Welcome packet follow-up",
      description: "Send helpful resources 1 day after booking",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 1440,
          actionType: "EMAIL",
          template: {
            name: "Booking - Welcome Packet",
            channel: "EMAIL",
            subject: "Some helpful resources for your planning",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>Now that you're officially booked, I wanted to share some resources that might help!</p>
<p>A few things to keep in mind:</p>
<ul>
<li>Share any Pinterest boards or inspiration with me anytime</li>
<li>Let me know about important people or moments to capture</li>
<li>I'll send a detailed questionnaire closer to your date</li>
</ul>
<p>Feel free to reach out anytime with questions. I'm here for you!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nNow that you're booked, a few tips:\n\n- Share any inspiration with me\n- Let me know about important moments\n- I'll send a questionnaire closer to your date\n\nI'm here for any questions!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    // Pipeline automation: Move to Completed on full payment
    {
      name: "Move to Completed on full payment",
      description: "Auto-move to Completed stage when full payment is received",
      automationType: "STAGE_CHANGE",
      triggerType: "FULL_PAYMENT_MADE",
      targetStageName: "Completed",
      steps: [],
    },
  ];
}

function getPreEventTemplates(
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  const isWeddingOrEvent =
    ctx.eventName.includes("wedding") || ctx.eventName.includes("event");
  const daysBefore = isWeddingOrEvent ? 30 : 7;
  const weekBefore = isWeddingOrEvent ? 7 : 3;

  return [
    {
      name: `${daysBefore}-day check-in`,
      description: `Check in ${daysBefore} days before ${ctx.timeframe}`,
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: -(daysBefore * 1440),
          actionType: "EMAIL",
          template: {
            name: "Pre-Event - Check-in",
            channel: "EMAIL",
            subject: `${daysBefore} days out! Let's finalize details`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>Can you believe your ${ctx.eventName} is only ${daysBefore} days away?! I'm getting so excited!</p>
<p>Let's make sure we're all set. A few questions:</p>
<ul>
<li>What time and where should I arrive?</li>
<li>Any last-minute changes to your plans?</li>
<li>Any specific shots or moments you're hoping to capture?</li>
</ul>
<p>Reply with what you have, and we'll create the perfect plan together!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nYour ${ctx.eventName} is ${daysBefore} days away!\n\nLet's finalize details:\n- What time should I arrive?\n- Any changes to plans?\n- Specific shots you want?\n\nReply with your updates!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: `${weekBefore}-day final details`,
      description: `Final prep email ${weekBefore} days before`,
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: -(weekBefore * 1440),
          actionType: "EMAIL",
          template: {
            name: "Pre-Event - Final Details",
            channel: "EMAIL",
            subject: `${weekBefore === 7 ? "One week" : "Almost time"}! Final details`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>Your ${ctx.eventName} is almost here! I'm so excited for you!</p>
<p>Just a few reminders:</p>
<ul>
<li>I have all your details and I'm ready to go!</li>
<li>If anything changes last minute, just text me</li>
<li>Get some rest and enjoy the anticipation!</li>
</ul>
<p>I'll touch base the day before with final confirmation. So excited!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nYour ${ctx.eventName} is almost here!\n\nI'm all set. If anything changes, just text me.\n\nSo excited for you!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Day-before SMS",
      description: "Excited text the day before",
      automationType: "COMMUNICATION",
      channel: "SMS",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: -1440,
          actionType: "SMS",
          customSmsContent: `Hey {{first_name}}! Tomorrow is THE day! I am SO excited for your ${ctx.eventName}. Get some rest tonight - see you tomorrow! - {{photographer_name}}`,
        },
      ],
    },
    {
      name: "Day-of good luck",
      description: "Good luck message day of",
      automationType: "COMMUNICATION",
      channel: "SMS",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: -240,
          actionType: "SMS",
          customSmsContent: `Good morning {{first_name}}! Today is YOUR day! Take a deep breath, enjoy every moment. Can't wait to capture it all. See you soon! - {{photographer_name}}`,
        },
      ],
    },
  ];
}

function getPostEventTemplates(
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  return [
    {
      name: "Thank you email",
      description: "Thank you message after the session",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 0,
          actionType: "EMAIL",
          template: {
            name: "Post-Event - Thank You",
            channel: "EMAIL",
            subject: `What an amazing ${ctx.eventName}!`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>What an AMAZING ${ctx.eventName}! It was such an honor to capture your ${ctx.timeframe}.</p>
<p>I'm already going through the ${ctx.deliverable} and can't wait to share them with you!</p>
<p>Here's what to expect:</p>
<ul>
<li>Sneak peeks within a few days</li>
<li>Full gallery in about 2-3 weeks</li>
<li>I'll email you as soon as everything is ready!</li>
</ul>
<p>Thank you again for trusting me with your memories!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nWhat an amazing ${ctx.eventName}!\n\nI'm already working on your ${ctx.deliverable}. Sneak peeks coming soon!\n\nThank you for trusting me!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Sneak peek email",
      description: "Send sneak peek 2-3 days after",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 2880,
          actionType: "EMAIL",
          template: {
            name: "Post-Event - Sneak Peek",
            channel: "EMAIL",
            subject: "Your sneak peek is here!",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I couldn't wait any longer - here's a sneak peek from your ${ctx.eventName}!</p>
<p>[[BUTTON:GALLERY:View Gallery]]</p>
<p>I'm working on the full gallery now and will have it ready soon. In the meantime, feel free to share these on social media!</p>
<p>So happy with how these turned out!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nHere's your sneak peek!\n\n{{gallery_link}}\n\nFull gallery coming soon. Feel free to share!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Gallery delivery notification",
      description: "Notify when full gallery is ready",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 14400,
          actionType: "EMAIL",
          template: {
            name: "Post-Event - Gallery Ready",
            channel: "EMAIL",
            subject: `Your ${ctx.deliverable} are ready!`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>The moment you've been waiting for - your full gallery is ready!</p>
<p>[[BUTTON:GALLERY:View Gallery]]</p>
<p>You can:</p>
<ul>
<li>View all your ${ctx.deliverable}</li>
<li>Download your favorites</li>
<li>Share with family and friends</li>
<li>Mark favorites for prints or albums</li>
</ul>
<p>I had the best time capturing your ${ctx.eventName}. Thank you for letting me be part of it!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nYour full gallery is ready!\n\n{{gallery_link}}\n\nEnjoy viewing, downloading, and sharing!\n\nThank you for everything!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
  ];
}

function getNurtureTemplates(
  businessName: string,
  ctx: ProjectTypeContext,
): AutomationTemplate[] {
  return [
    {
      name: "Review request",
      description: "Ask for review 1 day after delivery",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 1440,
          actionType: "EMAIL",
          template: {
            name: "Nurture - Review Request",
            channel: "EMAIL",
            subject: "Quick favor?",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I hope you're loving your ${ctx.deliverable}! I had such a wonderful time working with you.</p>
<p>If you have a moment, it would mean the world to me if you could leave a quick review. It really helps other ${ctx.clientType}s find me!</p>
<p>{{review_link}}</p>
<p>Thank you so much for your support!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nHope you're loving your ${ctx.deliverable}!\n\nIf you have a moment, a review would mean so much:\n{{review_link}}\n\nThank you!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Referral request",
      description: "Ask for referrals 2 weeks after",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 20160,
          actionType: "EMAIL",
          template: {
            name: "Nurture - Referral Request",
            channel: "EMAIL",
            subject: `Know anyone planning a ${ctx.eventName}?`,
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I hope you're still enjoying your ${ctx.deliverable}!</p>
<p>If you know anyone planning a ${ctx.eventName} or looking for a photographer, I'd be honored if you'd send them my way.</p>
<p>Word of mouth from amazing ${ctx.clientType}s like you is how I keep doing what I love!</p>
<p>Feel free to share my website or have them reach out directly.</p>
<p>Thank you for being such a wonderful ${ctx.clientType}!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nKnow anyone looking for a photographer?\n\nReferrals mean so much to me! Feel free to share my info.\n\nThank you!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
    {
      name: "Anniversary/milestone check-in",
      description: "Check in around anniversary time",
      automationType: "COMMUNICATION",
      channel: "EMAIL",
      steps: [
        {
          stepIndex: 0,
          delayMinutes: 504000,
          actionType: "EMAIL",
          template: {
            name: "Nurture - Anniversary",
            channel: "EMAIL",
            subject: "Time flies!",
            htmlBody: `<p>Hi {{first_name}},</p>
<p>I can't believe how quickly time flies! I hope you've been enjoying looking back at your ${ctx.deliverable}.</p>
<p>If you're ever interested in another session or have any photo needs, I'd love to work with you again!</p>
<p>Wishing you all the best!</p>
<p>{{photographer_name}}</p>`,
            textBody: `Hi {{first_name}},\n\nTime flies! Hope you've been enjoying your ${ctx.deliverable}.\n\nI'd love to work with you again anytime!\n\nWishing you the best!\n\n{{photographer_name}}`,
          },
        },
      ],
    },
  ];
}
