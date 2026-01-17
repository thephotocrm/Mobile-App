### Overview
thePhotoCrm is a comprehensive multi-tenant CRM system tailored for wedding photographers. It operates with a triple-domain architecture: `app.thephotocrm.com` for photographers, `{photographer-slug}.tpcportal.co` for client portals, and `thephotocrm.com` for the marketing site. The platform aims to streamline photographer workflows from inquiry to project completion by offering contact management, automated communication, a Smart Files proposal/invoice builder, payment processing, and scheduling, all secured with magic link authentication for client portal access.

### Port Conflict Fix
If you see "EADDRINUSE" errors on port 5000, run:
```bash
pkill -f "tsx|node.*server|vite"
```
Then restart the development workflow.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

**UI/UX Decisions:**
*   **Design System:** React with Vite, Wouter for routing, Shadcn/ui (Radix UI-based) components, and Tailwind CSS for styling.
*   **Dashboard:** Widget-based layout with stat cards and quick actions.
*   **Projects Page:** Horizontal pipeline view with table, filtering, and search.
*   **Automations UI:** Professional design with visual hierarchy, color-coded badges, and a timeline display. The automation wizard features a 5-step creation flow (Getting Started → Trigger → Action → Configure → Review) with auto-generated names based on trigger/action/timing, explicit timing selection (immediate vs delayed), persistent trigger breadcrumb, and editable name field in the Review step.
*   **Navigation:** Phase-based collapsible sidebar (Work, Client Delivery, Marketing, Get Leads, Business Tools).
*   **Project Detail Page:** Hero section, participant bar, action buttons, tabbed content, and activity feed sidebar.
*   **Client Portal UI:** HoneyBook-style design with conditional sidebar styling, light gray sidebar, dusty rose active navigation, and professional cover photo hero sections.

**Technical Implementations:**
*   **Multi-Tenant Architecture:** Strict data isolation per photographer, using photographer-scoped CLIENT accounts.
*   **Authentication & Authorization:** Three-tier role system (PHOTOGRAPHER, CLIENT, ADMIN) with stateless JWT authentication, role-based middleware, and domain-aware login. Google OAuth is available for photographers. Includes dual rate limiting on login (5 per email + 10 per IP per 15min) and magic link (3 per photographer+email per 15min) endpoints for brute-force protection.
*   **Subdomain Architecture:** `app.thephotocrm.com` for CRM, wildcard DNS for `*.tpcportal.co` for client portals. Cross-subdomain authentication uses domain-scoped cookies.
*   **Magic Link Portal System:** Passwordless client authentication for one-click portal access via secure, time-limited email/SMS links with smart routing.
*   **Smart Files System:** Drag-and-drop invoice/proposal builder with templates, various page types, integrated Stripe checkout, and e-signing.
*   **Simplified Pipeline Stages:** New photographers and project types receive a streamlined 5-stage default pipeline: New Inquiry → Consultation / Discovery → Proposal Sent → Booked / Paid → Completed. Default stages auto-populate when creating new project types.
*   **Automation System:** Event-driven engine for scheduled tasks, supporting stage-based triggers, dynamic content, and multi-channel delivery. Features booking-relative timing with anchor types (STAGE_ENTRY, BOOKING_START, BOOKING_END) that allow automations to fire before/after scheduled bookings using negative/positive delay minutes (e.g., -1440 = 24h before booking start, 60 = 1h after booking end). Includes "No Show" and "Call Cancelled" stages with re-engagement templates. Booking lifecycle handlers automatically cancel/reschedule pending automations when bookings are created, updated, or cancelled. Discovery Call templates use booking-relative timing (confirmation on stage entry, prep 24h before call, reminder 1h before, thank you 1h after, proposal nudge 24h after). Includes a centralized automation templates service (`server/services/automationTemplates.ts`) that provides pre-configured automation sequences for each pipeline stage. The UI shows "Apply Recommended Automations" buttons in empty stage states. **Business Event Triggers:** Supported trigger types include ANY_PAYMENT_MADE, DEPOSIT_PAID, FULL_PAYMENT_MADE, PROJECT_BOOKED, CONTRACT_SIGNED, SMART_FILE_ACCEPTED, SMART_FILE_SENT, EVENT_DATE_REACHED, PROJECT_DELIVERED, CLIENT_ONBOARDED, APPOINTMENT_BOOKED, and GALLERY_SHARED. The SMART_FILE_SENT trigger fires when a Smart File is sent to a client (status is SENT, VIEWED, or later), enabling automated stage changes like "Move to Proposal Sent when Smart File is sent". The ANY_PAYMENT_MADE trigger fires when any payment is made (deposit, partial, or full), enabling flexible "Move to Booked when any payment is made" automation that works regardless of payment structure. **Proposal Sent Stage Templates:** Includes follow-up emails at 24 hours, 3 days, and 7 days, plus a stage-change automation to move to "Booked / Retainer Paid" when ANY_PAYMENT_MADE. **Photographer Appointment Reminders:** Photographers can enable email reminders for upcoming bookings via Settings > Automation tab, with configurable timing (15 min to 24 hours before). The cron job processes reminders within a 10-minute window and marks them as sent to prevent duplicates.
*   **Email Marketing Platform:** Drip campaign system with templates, 3-phase timing, and a block-based visual email builder.
*   **Two-Way SMS Communication:** Twilio integration for SMS/MMS, including message logging and Cloudinary for MMS image hosting.
*   **Client Portal Messaging:** HoneyBook-style inline email composer at the top of the Activity tab with professional email cards in the activity feed. The Overview page includes a "Send Message" CTA that navigates to Activity and auto-focuses the composer. After sending, messages are delivered via email to photographers (using photographer.emailFromAddr with fallback to user.email), the form clears, and the feed auto-scrolls to show the newest message. Email activity cards display From/To headers, subject, body, and timestamp. SMS messages remain photographer-only and are not visible to clients.
*   **Gmail Email Threading:** HoneyBook-style email reply capture where clients can reply to portal messages via their email app, with replies automatically threaded back into the project activity feed. Uses Gmail API push notifications with HMAC signature verification for security, custom tracking headers (X-TPC-Project, X-TPC-Contact, X-TPC-Signature), and automatic Gmail watch renewal via daily cron job. Email threads are displayed chronologically with both outbound and inbound messages.
*   **Payment Processing:** Stripe Connect integration with configurable platform fees, featuring a flexible payment schedule system (HoneyBook-style) with CLIENT_CHOICE mode allowing clients to select 2-6+ installments. Payment schedules are persisted to the database and rehydrated on page load. The schedule serves as a guide rather than a rigid requirement, with automatic final payment scheduling 30 days before the event date. Includes saved payment methods (cards on file) with client portal management for viewing, deleting, and setting default cards. Autopay is project-specific (tied to Smart Files) and can be enabled when making payments with either new or saved cards.
*   **Contract & E-Signature System:** Honeybook-style contract generation with dual signature capture and dynamic templates.
*   **Google Integration:** OAuth for Calendar, Meet, and Gmail API for email sending and reply capture.
*   **Native Gallery System:** Integrated photo gallery platform using Cloudinary for CDN, featuring chunked/resumable uploads, watermarks, privacy settings, and client favorites.
*   **AI Integrations:** OpenAI GPT-5 powered chatbot for client support and GPT-4o-mini for conversational AI automation building.
*   **Domain-Aware Routing System:** Production-grade dual-domain routing supporting split deployment (Replit for CRM, Railway for client portals) with server-side domain detection and security.
*   **Client Portal Meta Tag Injection:** Server-side Open Graph meta tag injection for client portal subdomains to enable branded social media previews.
*   **Onboarding System:** Multi-step wizard for new photographers with persistent progress tracking.
*   **Lead Management System:** Includes a Revenue Estimator, Lead Hub dashboard, and multi-form lead capture.
*   **Beta Mode:** Environment variable `BETA_MODE=true` enables pre-launch beta testing. When enabled, new photographer signups (both email/password and Google OAuth) skip Stripe subscription creation and receive `subscriptionStatus: 'unlimited'` and `galleryPlanId: 'beta_unlimited'` for full feature access without payment. Set `BETA_MODE=false` or remove the variable to return to normal paid subscription flow. Beta users retain their unlimited status even after the switch.

**System Design Choices:**
*   **Backend:** Node.js with Express.js, Drizzle ORM for PostgreSQL.
*   **Database Design:** Photographer-tenant model with key entities like Photographers, Users, Contacts, Stages, Smart Files, and Automations.
*   **Drizzle ORM Pattern:** CRITICAL - When using `leftJoin` in Drizzle queries, NEVER use nested objects in `.select()` (e.g., `clientData: { id: contacts.id, ... }`). When the join returns null, this causes "Cannot convert undefined or null to object" errors. Instead, flatten all columns (e.g., `clientDataId: contacts.id`) and reconstruct nested objects in JavaScript (e.g., `client: row.clientDataId ? { id: row.clientDataId, ... } : null`). All affected queries in `server/storage.ts` have been fixed with this pattern.

### External Dependencies

**Communication Services:**
*   **Gmail API:** Email sending and conversation tracking.
*   **Twilio:** SMS/MMS messaging.
*   **Cloudinary:** CDN for image hosting (MMS, galleries, logos).

**Payment Processing:**
*   **Stripe:** Payment infrastructure and Stripe Connect.

**Database Infrastructure:**
*   **Neon Database:** PostgreSQL hosting.
*   **Drizzle Kit:** Database migration and schema management.

**Development & Deployment:**
*   **Replit:** Development environment.
*   **Railway:** Production deployment with wildcard SSL.
*   **Vite:** Frontend build tool.

**UI & Design System:**
*   **Radix UI:** Unstyled, accessible component primitives.
*   **Tailwind CSS:** Utility-first CSS framework.
*   **Lucide React:** Icon library.