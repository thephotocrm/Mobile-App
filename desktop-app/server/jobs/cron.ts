import cron from "node-cron";
import {
  processAutomations,
  processPaymentReminders,
  processPhotographerAppointmentReminders,
  processDripCampaigns,
} from "../services/automation";
import { renewExpiringWatches } from "../services/gmail-watch";
import { storage } from "../storage";
import { sendEmail } from "../services/email";

export function startCronJobs() {
  // Run every 1 minute for testing
  cron.schedule("* * * * *", async () => {
    try {
      // Temporarily disabled during client/project separation migration
      // Only log when there's actual work to do

      // Get all photographers
      const photographers = await storage.getAllPhotographers();

      // Process automations for each photographer
      for (const photographer of photographers) {
        await processAutomations(photographer.id);
        await processPaymentReminders(photographer.id);
        await processPhotographerAppointmentReminders(photographer.id);
      }

      // Process drip campaign emails (runs globally, not per-photographer)
      await processDripCampaigns();
    } catch (error) {
      console.error("Cron job error:", error);
    }
  });

  // Run daily at 2 AM to renew expiring Gmail watches
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("Running Gmail watch renewal job");
      await renewExpiringWatches();
    } catch (error) {
      console.error("Gmail watch renewal cron job error:", error);
    }
  });

  // Run daily at 9 AM to send expiration reminder emails
  cron.schedule("0 9 * * *", async () => {
    try {
      console.log("Running Smart File expiration reminder job");
      await processExpirationReminders();
    } catch (error) {
      console.error("Expiration reminder cron job error:", error);
    }
  });

  console.log("Cron jobs started");
}

// Process Smart File expiration reminders
async function processExpirationReminders() {
  // Get proposals expiring within 3 days that haven't had a reminder sent
  const expiringSmartFiles = await storage.getExpiringSmartFiles(3);

  console.log(
    `Found ${expiringSmartFiles.length} proposals expiring within 3 days`,
  );

  for (const psf of expiringSmartFiles) {
    try {
      // Get related data
      const [contact, photographer, smartFile, project] = await Promise.all([
        storage.getContact(psf.clientId),
        storage.getPhotographer(psf.photographerId),
        storage.getSmartFile(psf.smartFileId),
        storage.getProject(psf.projectId),
      ]);

      if (!contact || !photographer || !smartFile || !project) {
        console.log(`Skipping reminder for ${psf.id} - missing related data`);
        continue;
      }

      if (!contact.email || !contact.emailOptIn) {
        console.log(`Skipping reminder for ${psf.id} - no email or opted out`);
        continue;
      }

      // Calculate days until expiration
      const now = new Date();
      const expiresAt = new Date(psf.expiresAt!);
      const daysUntilExpiration = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Build expiration message based on mode
      let expirationMessage = `expires on ${expiresAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;
      if (psf.expirationMode === "UNLESS_PAYMENT") {
        expirationMessage += " unless payment is received";
      } else if (psf.expirationMode === "UNLESS_BOOKING") {
        expirationMessage += " unless you schedule your session";
      } else if (psf.expirationMode === "UNLESS_SIGNED") {
        expirationMessage += " unless you accept and sign";
      }

      const smartFileUrl = `${process.env.VITE_APP_URL || "https://thephotocrm.com"}/smart-file/${psf.token}`;

      // Send reminder email
      const emailResult = await sendEmail({
        photographerId: photographer.id,
        clientId: contact.id,
        projectId: project.id,
        to: contact.email,
        subject: `Reminder: Your proposal from ${photographer.businessName} ${daysUntilExpiration === 1 ? "expires tomorrow" : `expires in ${daysUntilExpiration} days`}`,
        html: `
          <h2>Your Proposal is Expiring Soon</h2>
          <p>Hi ${contact.firstName},</p>
          <p>Just a friendly reminder that your proposal "${smartFile.name}" from ${photographer.businessName} ${expirationMessage}.</p>
          ${daysUntilExpiration <= 1 ? "<p><strong>This is your last chance to respond!</strong></p>" : ""}
          <p>Review and complete your proposal before it expires:</p>
          <p><a href="${smartFileUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Proposal</a></p>
          <p>If you have any questions, please contact ${photographer.businessName} directly.</p>
          <p>Best regards,<br>${photographer.businessName}</p>
        `,
        text: `Reminder: Your proposal is expiring soon!\n\nHi ${contact.firstName},\n\nYour proposal "${smartFile.name}" from ${photographer.businessName} ${expirationMessage}.\n\nView and complete your proposal at: ${smartFileUrl}\n\nBest regards,\n${photographer.businessName}`,
      });

      // Only mark as sent if email was actually successful
      if (!emailResult.success) {
        console.error(
          `Failed to send expiration reminder for ${psf.id}: ${emailResult.error}`,
        );
        // Don't update the flag - will retry on next cron run
        continue;
      }

      // Update reminder sent timestamp only after confirmed send
      await storage.updateProjectSmartFile(psf.id, {
        expirationReminderSentAt: new Date(),
      });

      console.log(
        `✅ Sent expiration reminder for proposal ${psf.id} to ${contact.email}`,
      );
    } catch (error) {
      console.error(`Error sending expiration reminder for ${psf.id}:`, error);
    }
  }
}
