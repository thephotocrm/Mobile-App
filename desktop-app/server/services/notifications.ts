import { storage } from "../storage";
import { notificationTypeEnum, notificationPriorityEnum } from "@shared/schema";

type NotificationType = keyof typeof notificationTypeEnum;
type NotificationPriority = keyof typeof notificationPriorityEnum;

interface NotificationData {
  photographerId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  description?: string;
  projectId?: string;
  contactId?: string;
  relatedId?: string;
  relatedType?: string;
  actionUrl?: string;
}

/**
 * Create a notification
 */
export async function createNotification(data: NotificationData) {
  try {
    const notification = await storage.createNotification({
      photographerId: data.photographerId,
      type: data.type,
      priority: data.priority || "MEDIUM",
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      contactId: data.contactId,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      actionUrl: data.actionUrl,
      read: false
    });
    console.log(`[NOTIFICATION] Created: ${data.type} - ${data.title}`);
    return notification;
  } catch (error) {
    console.error("[NOTIFICATION] Error creating notification:", error);
    throw error;
  }
}

/**
 * Notify photographer of a new lead/inquiry
 */
export async function notifyNewLead(params: {
  photographerId: string;
  contactId: string;
  contactName: string;
  projectId?: string;
  source?: string;
}) {
  return createNotification({
    photographerId: params.photographerId,
    type: "LEAD",
    priority: "HIGH",
    title: `New inquiry from ${params.contactName}`,
    description: params.source ? `Via ${params.source}` : "New contact added",
    contactId: params.contactId,
    projectId: params.projectId,
    relatedId: params.contactId,
    relatedType: "contact",
    actionUrl: params.projectId ? `/projects/${params.projectId}` : `/contacts/${params.contactId}`
  });
}

/**
 * Notify photographer of a payment received
 */
export async function notifyPaymentReceived(params: {
  photographerId: string;
  projectId: string;
  contactId: string;
  contactName: string;
  amountCents: number;
  paymentType?: string; // "deposit", "installment", "full"
}) {
  const amount = (params.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });

  return createNotification({
    photographerId: params.photographerId,
    type: "PAYMENT",
    priority: "HIGH",
    title: `Payment received: ${amount}`,
    description: `${params.contactName} made a ${params.paymentType || "payment"}`,
    projectId: params.projectId,
    contactId: params.contactId,
    relatedId: params.projectId,
    relatedType: "project",
    actionUrl: `/projects/${params.projectId}`
  });
}

/**
 * Notify photographer of a contract signature
 */
export async function notifyContractSigned(params: {
  photographerId: string;
  projectId: string;
  contactId: string;
  contactName: string;
  smartFileName?: string;
}) {
  return createNotification({
    photographerId: params.photographerId,
    type: "CONTRACT",
    priority: "HIGH",
    title: `Contract signed by ${params.contactName}`,
    description: params.smartFileName || "Client signed the contract",
    projectId: params.projectId,
    contactId: params.contactId,
    relatedId: params.projectId,
    relatedType: "project",
    actionUrl: `/projects/${params.projectId}`
  });
}

/**
 * Notify photographer when client views a smart file (proposal/contract)
 */
export async function notifySmartFileViewed(params: {
  photographerId: string;
  projectId: string;
  contactId: string;
  contactName: string;
  smartFileName: string;
  smartFileId: string;
}) {
  return createNotification({
    photographerId: params.photographerId,
    type: "SMART_FILE_VIEWED",
    priority: "MEDIUM",
    title: `${params.contactName} viewed your proposal`,
    description: params.smartFileName,
    projectId: params.projectId,
    contactId: params.contactId,
    relatedId: params.smartFileId,
    relatedType: "smartFile",
    actionUrl: `/projects/${params.projectId}`
  });
}

/**
 * Notify photographer when client accepts a smart file (proposal)
 */
export async function notifySmartFileAccepted(params: {
  photographerId: string;
  projectId: string;
  contactId: string;
  contactName: string;
  smartFileName: string;
  smartFileId: string;
}) {
  return createNotification({
    photographerId: params.photographerId,
    type: "SMART_FILE_ACCEPTED",
    priority: "HIGH",
    title: `${params.contactName} accepted your proposal!`,
    description: params.smartFileName,
    projectId: params.projectId,
    contactId: params.contactId,
    relatedId: params.smartFileId,
    relatedType: "smartFile",
    actionUrl: `/projects/${params.projectId}`
  });
}

/**
 * Notify photographer of a new message from client
 */
export async function notifyNewMessage(params: {
  photographerId: string;
  projectId?: string;
  contactId: string;
  contactName: string;
  messagePreview?: string;
  channel: "email" | "sms";
}) {
  return createNotification({
    photographerId: params.photographerId,
    type: "MESSAGE",
    priority: "HIGH",
    title: `New ${params.channel === "sms" ? "text" : "email"} from ${params.contactName}`,
    description: params.messagePreview?.slice(0, 100),
    projectId: params.projectId,
    contactId: params.contactId,
    relatedId: params.contactId,
    relatedType: "contact",
    actionUrl: params.projectId ? `/projects/${params.projectId}` : `/inbox`
  });
}

/**
 * Notify photographer of a new booking/appointment
 */
export async function notifyNewBooking(params: {
  photographerId: string;
  projectId: string;
  contactId: string;
  contactName: string;
  bookingDate: Date;
  bookingType?: string;
}) {
  const dateStr = params.bookingDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  return createNotification({
    photographerId: params.photographerId,
    type: "BOOKING",
    priority: "MEDIUM",
    title: `New booking: ${params.contactName}`,
    description: `${params.bookingType || "Appointment"} scheduled for ${dateStr}`,
    projectId: params.projectId,
    contactId: params.contactId,
    relatedId: params.projectId,
    relatedType: "booking",
    actionUrl: `/projects/${params.projectId}`
  });
}

/**
 * Notify photographer of gallery activity
 */
export async function notifyGalleryActivity(params: {
  photographerId: string;
  projectId: string;
  contactId?: string;
  contactName?: string;
  activityType: "upload_complete" | "favorites_added" | "download";
  galleryName: string;
  count?: number;
}) {
  let title = "";
  let description = "";

  switch (params.activityType) {
    case "upload_complete":
      title = "Gallery upload complete";
      description = `${params.count || 0} photos uploaded to ${params.galleryName}`;
      break;
    case "favorites_added":
      title = `${params.contactName || "Client"} favorited photos`;
      description = `${params.count || 0} photos marked as favorites in ${params.galleryName}`;
      break;
    case "download":
      title = `${params.contactName || "Client"} downloaded photos`;
      description = `Photos downloaded from ${params.galleryName}`;
      break;
  }

  return createNotification({
    photographerId: params.photographerId,
    type: "GALLERY",
    priority: "LOW",
    title,
    description,
    projectId: params.projectId,
    contactId: params.contactId,
    relatedId: params.projectId,
    relatedType: "gallery",
    actionUrl: `/projects/${params.projectId}`
  });
}

/**
 * Notify photographer of automation activity
 */
export async function notifyAutomation(params: {
  photographerId: string;
  projectId?: string;
  contactId?: string;
  automationName: string;
  status: "triggered" | "failed";
  errorMessage?: string;
}) {
  const isError = params.status === "failed";

  return createNotification({
    photographerId: params.photographerId,
    type: "AUTOMATION",
    priority: isError ? "HIGH" : "LOW",
    title: isError ? `Automation failed: ${params.automationName}` : `Automation sent: ${params.automationName}`,
    description: isError ? params.errorMessage : undefined,
    projectId: params.projectId,
    contactId: params.contactId,
    relatedType: "automation",
    actionUrl: params.projectId ? `/projects/${params.projectId}` : `/automations`
  });
}

/**
 * Create a reminder notification
 */
export async function notifyReminder(params: {
  photographerId: string;
  projectId?: string;
  contactId?: string;
  title: string;
  description?: string;
}) {
  return createNotification({
    photographerId: params.photographerId,
    type: "REMINDER",
    priority: "MEDIUM",
    title: params.title,
    description: params.description,
    projectId: params.projectId,
    contactId: params.contactId,
    actionUrl: params.projectId ? `/projects/${params.projectId}` : undefined
  });
}
