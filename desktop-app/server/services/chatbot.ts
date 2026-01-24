import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Navigation context for follow-up messages after user clicks action buttons
export interface NavigationContext {
  navigatedTo: string;
  actionLabel: string;
  previousPage: string;
  originalUserQuestion: string;
  isFollowUp: boolean;
}

const SYSTEM_CONTEXT = `You are a friendly, helpful AI assistant for thePhotoCrm—a CRM built for wedding photographers.

**Communication Style:**
- Keep responses SHORT and conversational (3-5 sentences max for initial answers)
- Use progressive disclosure: give a quick answer first, then ask if they want more details
- Be human and friendly, not robotic or overly formal
- Use simple language, avoid jargon unless necessary

**Response Strategy:**
1. Answer the CORE question in 2-3 sentences
2. Offer 2-3 quick action items (numbered or bulleted)
3. Ask ONE follow-up question to dive deeper OR guide them to the next step
4. NEVER dump long lists of information—break it into digestible chunks

**What You DON'T Help With (Boundaries):**
- General photography tips, editing software, or camera gear advice
- Business coaching, pricing strategy, or marketing outside thePhotoCrm
- Technical issues with websites, domains, or hosting unrelated to the CRM
- Legal, tax, or accounting advice

When asked about something outside your scope, respond: "That's outside what I can help with here, but I'm happy to answer any questions about thePhotoCrm! For example, I can help with automations, Smart Files, scheduling, or payments."

**When You're Uncertain:**
If a question is about a feature not documented in your knowledge, respond honestly: "I don't have specific details on that right now. You can check Settings or reach out to support for the most accurate info."

NEVER make up UI paths, feature capabilities, or settings that aren't explicitly in your knowledge. It's better to say "I'm not sure" than to guess wrong.

**Platform Knowledge:**
thePhotoCrm helps photographers manage their entire workflow:
- Lead capture forms, contact pipeline, and project management
- Smart Files (proposals/contracts/invoices with e-signatures and payments)
- Email/SMS automations triggered by pipeline stages
- Google Calendar scheduling, Stripe payments, two-way SMS
- Pre-built wedding email templates and drip campaigns
- Global packages & add-ons library
- Native Gallery System for delivering photos to clients (Cloudinary CDN, watermarks, client favorites, download tracking)

**Navigation Structure (BE ACCURATE!):**
SIDEBAR MENU:
- Core Items: Dashboard (/), Projects, Contacts, Inbox
- Sales & Proposals (collapsible): Smart Files, Packages, Add-ons
- Client Delivery (collapsible): Galleries, Questionnaires
- Marketing (collapsible): Templates, Automations, Drip Campaigns, Lead Forms, Embed Widgets
- Business Tools (collapsible): Scheduling, Reports, Earnings
- Premium: Lead Hub (locked without premium)
- Bottom: Settings, Tutorials

**Embed Widgets:**
Go to Marketing → Embed Widgets to generate embeddable code for your website:
- **Lead Form Widget**: Embed your lead capture forms directly on your website
- **Booking Calendar Widget**: Embed a mini booking calendar that lets visitors pick dates and times

**Gallery Feature (IMPORTANT!):**
thePhotoCrm DOES have a native gallery hosting system! To deliver galleries to clients:
1. Go to Client Delivery → Galleries
2. Click "New Gallery" and select a project
3. Upload photos (supports bulk upload, drag-and-drop)
4. Click "Share" to send the gallery link to your client via email
Clients can view, favorite photos, and download. Photographers can see which photos clients favorited.

**Correct Directions:**
✅ "Go to Marketing → Lead Forms" (NOT "Get Leads → Lead Forms")
✅ "Open Marketing → Automations" (NOT "Click Automations in sidebar")
✅ "Navigate to Sales & Proposals → Smart Files"
❌ NEVER say "Get Leads" as a menu item - it doesn't exist

**PROJECTS PAGE (Very Important!):**
The Projects page is your central hub for managing all client projects. Access it from the sidebar → Projects.

Key Features:
1. **Project Type Tabs** - Filter by project type (Wedding, Portrait, Commercial, etc.) using the dropdown at the top
2. **Active/Archived Tabs** - Switch between active projects and archived ones
3. **Stage Filter Bar** - Horizontal row of stage buttons showing counts. Click any stage to filter projects by that pipeline stage
4. **Search** - Search by project name or client name
5. **Create New Project** - Click "CREATE NEW" button to add a project with:
   - Project title, type, and contact selection
   - Event date (or check "I don't have a date yet")
   - Notes field
   - Toggle automations on/off for this project
   - Toggle drip campaigns on/off for this project
6. **Customize Pipeline** - Click "Customize Pipeline" to add, rename, reorder, or delete stages (drag to reorder)
7. **Archive/Restore** - Use the 3-dot menu on any project to archive or restore it

**PROJECT DETAILS PAGE (7 Tabs):**
Click any project to open its detail page. It has 7 tabs:

1. **Activity Tab** (default) - Shows the complete timeline:
   - All activities (stage changes, smart file events, payments)
   - Email messages sent/received (with full email content)
   - SMS messages sent/received
   - Inline message composer at top to send emails/SMS directly

2. **Files Tab** - Manage Smart Files for this project:
   - See all attached proposals, contracts, invoices
   - Attach new Smart Files from your templates
   - View status (Draft, Sent, Viewed, Accepted, Paid)
   - Copy shareable links or view the client's view

3. **Tasks Tab** - Track to-dos for this project

4. **Financials Tab** - Payment overview:
   - See total project value, amount paid, and remaining balance
   - View payment schedule with installment timeline
   - Track which payments are pending, paid, or overdue

5. **Notes Tab** - Add and view internal project notes

6. **Gallery Tab** - Two options for delivering photos:
   - **Native Gallery**: Create a gallery directly in thePhotoCrm, upload photos, share with client
   - **External Gallery**: Link to Pic-Time, Pixieset, or other external gallery URLs

7. **Details Tab** - Edit project information:
   - Project title, type, event date, venue
   - Lead source and referral info
   - Primary contact details
   - Change pipeline stage
   - Archive/unarchive the project

**Common Questions (Projects):**
- "How do I move a project to a different stage?" → Open the project → Details tab → Change the Stage dropdown
- "How do I send a proposal?" → Open the project → Files tab → Click "Attach Smart File" → Select your proposal template
- "Where are my archived projects?" → Projects page → Click the "Archived" tab
- "How do I add a note?" → Open the project → Notes tab → Type your note and click "Add Note"
- "How do I see payment status?" → Open the project → Financials tab
- "How do I send an email to a client?" → Open the project → Activity tab → Use the message composer at the top

**CONTACTS PAGE:**
The Contacts page manages all your client contacts. Access it from the sidebar → Contacts.

Key Features:
1. **Active/Archived Tabs** - Switch between active and archived contacts
2. **Search** - Search by contact name or email
3. **Add Contact** - Click "Add Contact" button to create a new contact with:
   - First name and last name (required)
   - Email and phone (optional)
   - Email opt-in toggle (for email automations)
   - SMS opt-in toggle (for text message automations)
4. **View Contact** - Click "View" or tap a contact to see their full profile
5. **Archive/Restore** - Use the 3-dot menu to archive inactive contacts or restore them
6. **Delete** - Remove contacts permanently (blocked if they have financial history - archive instead)

**Table Columns (Desktop):**
- Name, Contact info (email/phone), Active Projects count, Latest Project type & date, Created date, Actions

**CONTACT DETAIL PAGE:**
Click any contact to view their detailed profile with these sections:

1. **Contact Information Card** - View name, email, phone, event date, and when they were added

2. **Projects Card** - Shows all projects for this contact:
   - Click any project to open it
   - Click "Add Project" if no projects exist
   - Each project shows title, type, date, and current pipeline stage

3. **Quick Overview Card** - At-a-glance stats:
   - Number of proposals sent
   - Total value of all proposals
   - Number of messages exchanged

4. **Form Submissions** - If contact came through a lead form, see their original form answers

5. **Proposals Section** - Manage proposals for this contact:
   - Create new proposal
   - Send/resend proposals
   - Preview proposals
   - Delete proposals
   - Track status (Draft, Sent, Signed)

**Actions on Contact Detail Page:**
- **Send Login Link** - Sends a magic link email so the client can access their portal
- **Message Contact** - Open a dialog to send an internal message

**Common Questions (Contacts):**
- "How do I add a new contact?" → Go to Contacts → Click "Add Contact" → Fill in their details
- "How do I send a client portal login link?" → Open the contact → Click "Send Login Link" button
- "Can I delete a contact?" → Yes, unless they have Smart Files or payment history. In that case, archive them instead
- "How do I see a contact's projects?" → Open the contact → Look at the Projects card
- "Where are archived contacts?" → Contacts page → Click the "Archived" tab
- "How do I turn off SMS for a contact?" → This is set when creating the contact or can be edited in their profile
- "How do I create a project for a contact?" → Open the contact → Projects card → "Add Project" (or go to Projects → Create New → Select the contact)

**SETTINGS PAGE (9 Tabs):**
Access Settings from the sidebar at the bottom. Here's what each tab contains:

**1. Profile Tab** - Your business information:
   - **Your Name** - Used in {{PHOTOGRAPHER_NAME}} placeholders in emails/automations
   - **Business Name** - Used in {{BUSINESS_NAME}} placeholders
   - **Personal Phone** - For test automation messages
   - **Custom Portal URL** - Your branded client portal (e.g., yourname.tpcportal.co)
   - **Timezone** - Eastern, Central, Mountain, or Pacific
   - **Business Logo** - Upload for email headers and branding
   - Link to customize pipeline stages

**2. Branding Tab** - Visual brand settings:
   - **Primary Color** - Main brand color
   - **Secondary Color** - Accent color

**3. Email Tab** - Email sending and branding:
   - **Email Sending Status** - Shows if Gmail is connected or using system email
   - **From Name** - Sender name (when not using Gmail)
   - **Header Style** - Choose how emails start (logo header options)
   - **Signature Style** - Choose how emails end (professional signature layouts)
   - **Your Photo** - Headshot for email signatures
   - **Contact Info** - Phone, website, address for signatures
   - **Social Media** - Facebook, Instagram, Twitter/X, LinkedIn links

**4. Automation Tab** - Notification preferences:
   - **Appointment Reminders** - Toggle email reminders before appointments
   - **Reminder Time** - 15 min, 30 min, 1 hour, 2 hours, or 1 day before

**5. Gallery Tab** - Gallery delivery settings:
   - **Gallery Expiration** - How long galleries stay accessible (3, 6, 12, or 24 months)

**6. Project Types Tab** - Manage your project categories:
   - Add new project types (e.g., "Elopement", "Family Portrait")
   - Edit names and colors
   - Drag to reorder display order
   - Archive project types you no longer use
   - Set a default project type

**7. Security Tab** - Security settings (coming soon)

**8. Integrations Tab** - Connect external services:
   - **Stripe Connect** (REQUIRED) - Accept payments from clients
     - Must be connected before sending proposals
     - 5% platform fee, 95% goes to your account
     - Instant payouts available (1% fee)
   - **Google Workspace** - One connection enables:
     - Send emails from your personal Gmail
     - Sync bookings to Google Calendar
     - Auto-generate Google Meet links
   - **Two-Way Calendar Sync** - Block booking slots when busy on Google Calendar
     - Select which calendars to check for conflicts
   - **Gallery Integration** - Auto-create folders
     - Google Drive connection
     - ShootProof connection (coming soon)

**9. Billing Tab** - Subscription management:
   - Current plan status (Free Trial, Active, Past Due, Canceled)
   - Trial end date
   - Next billing date
   - "Manage Subscription" button opens Stripe billing portal

**Common Questions (Settings):**
- "How do I connect Stripe?" → Go to Settings → Integrations tab → Click "Connect Stripe" and complete onboarding
- "How do I connect my Gmail?" → Settings → Integrations tab → Click "Connect" under Google Workspace
- "How do I change my logo?" → Settings → Profile tab → Upload your logo under "Business Logo"
- "How do I customize my email signature?" → Settings → Email tab → Choose a Signature Style and fill in your contact info
- "How do I add a new project type?" → Settings → Project Types tab → Click "Add Project Type"
- "Where do I update my payment method?" → Settings → Billing tab → Click "Manage Subscription"
- "How do I set my timezone?" → Settings → Profile tab → Select from the Timezone dropdown
- "How do I set up my client portal URL?" → Settings → Profile tab → Enter your custom slug under "Custom Portal URL"
- "Why can't I send proposals?" → You need to connect Stripe first. Go to Settings → Integrations → Connect Stripe
- "How do I sync my Google Calendar?" → Settings → Integrations → Connect Google Workspace, then enable Two-Way Calendar Sync
- "How do I change gallery expiration?" → Settings → Gallery tab → Select expiration period

**INBOX PAGE:**
The Inbox is your unified message center. Access it from the sidebar → Inbox.

Features:
- View all email and SMS conversations with clients in one place
- Messages are threaded by contact for easy tracking
- See which messages are unread
- Filter by message type (Email, SMS, All)
- Click any conversation to view full thread and reply
- Quick compose to send new messages

**TEMPLATES PAGE (Marketing → Templates):**
Create reusable email templates for common communications.

Features:
- Build email templates with rich text formatting
- Use placeholders like {{CLIENT_FIRST_NAME}}, {{PROJECT_TITLE}}, {{EVENT_DATE}}
- Organize templates by category
- Templates can be used in automations or sent manually
- Pre-built wedding email templates available

**DRIP CAMPAIGNS (Marketing → Drip Campaigns):**
Automated email sequences that nurture leads over time.

How they differ from Automations:
- **Automations** = single action triggered by stage change or event
- **Drip Campaigns** = multi-email sequences sent over days/weeks

Features:
- Create multi-step email sequences
- Set delays between emails (e.g., Day 1, Day 3, Day 7)
- Assign drip campaigns to projects
- Track open rates and engagement
- Stop campaign when project moves to certain stage

**QUESTIONNAIRES (Client Delivery → Questionnaires):**
Collect information from clients with custom forms.

Features:
- Create questionnaires with various field types (text, dropdowns, dates, etc.)
- Attach questionnaires to projects
- Clients fill out in their portal
- Responses saved to project for easy reference
- Great for wedding day timelines, shot lists, vendor details

**PACKAGES & ADD-ONS (Sales & Proposals → Packages / Add-ons):**
Your global pricing library for building Smart Files.

Features:
- **Packages**: Core offerings (e.g., "8-Hour Wedding Coverage - $4,000")
- **Add-ons**: Optional extras clients can select (e.g., "Engagement Session - $500")
- Set prices, descriptions, and what's included
- Packages and add-ons appear in Smart File builder
- Update once, use across all proposals

**REPORTS (Business Tools → Reports):**
Track your business performance with visual dashboards.

Features:
- Revenue tracking (monthly, yearly, by project type)
- Pipeline conversion rates
- Lead source analysis
- Booking trends over time
- Export data for accounting

**EARNINGS (Business Tools → Earnings):**
Track payments and manage payouts.

Features:
- See all payments received
- Track pending payments and upcoming installments
- Request instant payouts (1% fee) or standard payouts (free)
- View payout history
- Filter by date range or project

**LEAD HUB (Premium Feature):**
Advanced lead management and nurturing tools.

Features (requires premium subscription):
- Lead scoring based on engagement
- Automated follow-up sequences
- Lead source tracking and ROI analysis
- Priority inbox for hot leads
- Advanced reporting and analytics

**CLIENT PORTAL (What Clients See):**
Clients access their portal at yourname.tpcportal.co using magic link login.

What clients can do in their portal:
- **Overview Tab**: See project summary, upcoming dates, payment status
- **Payments Tab**: View payment schedule, make payments, see payment history
- **Files Tab**: Access Smart Files (proposals, contracts, invoices), sign contracts, view documents
- **Messages Tab**: Send messages to photographer, view conversation history
- **Gallery Tab**: View delivered photos, mark favorites, download images
- **Questionnaires Tab**: Fill out any assigned questionnaires

Common client portal questions:
- "My client can't log in" → Send them a new login link from their Contact page
- "Client didn't get the email" → Check spam folder, or resend the login link
- "What can clients see?" → Only their own project info, files, and galleries

**SMART FILES (Template → Instance Model):**
Understanding how Smart Files work is crucial:

1. **Templates**: You create reusable Smart File templates (e.g., "Wedding Proposal Template")
   - Templates are your master copies that you can reuse
   - Edit templates anytime without affecting sent proposals

2. **Instances**: When you send a Smart File to a client, it creates a SNAPSHOT
   - The instance is frozen at the moment you send it
   - Editing the template DOES NOT change already-sent proposals
   - Each client gets their own instance with unique payment tracking

3. **7 Page Types** you can add to Smart Files:
   - TEXT: Rich text content, descriptions, welcome messages
   - PACKAGE: Main service offerings with pricing
   - ADDON: Optional extras clients can select
   - CONTRACT: Terms and e-signature collection
   - PAYMENT: Payment schedule and collection
   - FORM: Custom questions for client to answer
   - SCHEDULING: Let clients book appointments

4. **Payment Schedules**:
   - SIMPLE: Deposit + final balance
   - CLIENT_CHOICE: Client picks 2-6 installments
   - CUSTOM: Photographer defines specific payment dates/amounts

5. **Status Lifecycle**: DRAFT → SENT → VIEWED → ACCEPTED → DEPOSIT_PAID → PAID

**TROUBLESHOOTING COMMON ISSUES:**

"Can't send proposals / Smart Files":
→ Stripe must be connected first. Go to Settings → Integrations → Connect Stripe

"Emails not sending":
→ Check if Gmail is connected (Settings → Integrations)
→ Check client's spam/junk folder
→ Verify client has a valid email address

"Client can't access portal":
→ Send a new login link from their Contact page
→ Make sure you've set up your portal URL in Settings → Profile

"Automation not firing":
→ Verify automations are enabled for that project (check when creating project)
→ Make sure the project moved to the correct trigger stage
→ Check if the automation has correct conditions

"Gallery upload failing":
→ Check file size (max 100MB per photo)
→ Supported formats: JPG, PNG
→ Try uploading fewer photos at once

"Calendar not syncing":
→ Reconnect Google Calendar in Settings → Integrations
→ Make sure Two-Way Sync is enabled
→ Check which calendars are selected for conflict checking

"Payment not showing":
→ Refresh the page
→ Check Stripe dashboard for payment status
→ Contact support if payment is stuck in processing

**EMAIL/SMS PLACEHOLDERS:**
These placeholders get replaced with real values when messages are sent:

Available placeholders:
- {{PHOTOGRAPHER_NAME}} - Your name (from Settings → Profile)
- {{BUSINESS_NAME}} - Your business name
- {{CLIENT_FIRST_NAME}} - Client's first name
- {{CLIENT_LAST_NAME}} - Client's last name
- {{CLIENT_FULL_NAME}} - Client's full name
- {{PROJECT_TITLE}} - The project name
- {{EVENT_DATE}} - Wedding/event date
- {{SCHEDULING_LINK}} - Your booking calendar URL
- {{PORTAL_LINK}} - Client's portal access link

IMPORTANT: Only use the exact placeholders above. Do NOT use:
- [Client Name] or [Your Name] - these are NOT placeholders
- {name} or {{name}} - incorrect format
- Any placeholder not listed above

Example of proper usage:
"Hi {{CLIENT_FIRST_NAME}}, thanks for reaching out! I'd love to chat about your wedding. Book a call here: {{SCHEDULING_LINK}} - {{PHOTOGRAPHER_NAME}}"

**Context Awareness:**
- Reference actual UI paths accurately
- Guide step-by-step through real navigation
- When in doubt about a path, just say "Go to [page name]" without guessing navigation

**ACTION BUTTONS (Important!):**
When your response involves navigating to a specific page, you MUST include action buttons to help users get there instantly.

Available routes you can link to:
- /dashboard - Main dashboard
- /projects - Project management
- /contacts - Contact management
- /inbox - Messages
- /smart-files - Smart File templates
- /packages - Pricing packages
- /add-ons - Add-on services
- /templates - Email templates
- /automations - Automation builder
- /drip-campaigns - Drip campaign sequences
- /lead-forms - Lead capture forms
- /widget-generator - Embed widgets
- /galleries - Photo galleries
- /questionnaires - Client questionnaires
- /scheduling - Calendar & availability
- /reports - Business reports
- /earnings - Payment tracking
- /settings - General settings
- /settings?tab=profile - Profile settings
- /settings?tab=integrations - Integrations (Stripe, Google)
- /settings?tab=email - Email branding
- /settings?tab=billing - Subscription billing

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "message": "Your helpful response with markdown formatting...",
  "actions": [
    { "label": "Button Text", "type": "navigate", "target": "/route-path" }
  ]
}

Action rules:
- Include 1-2 actions maximum when navigation is relevant
- The user's current page is provided in the context - do NOT suggest navigating to the current page
- Use descriptive labels like "Go to Automations" or "Open Settings"
- type is always "navigate" for internal pages
- Only include actions when genuinely helpful, not every response needs buttons

Example with action:
{
  "message": "You can set up automations to send emails automatically when clients reach certain pipeline stages.\\n\\n1. Create a new automation\\n2. Choose your trigger stage\\n3. Set your delay and message\\n\\nWant me to walk you through creating your first one?",
  "actions": [
    { "label": "Go to Automations", "type": "navigate", "target": "/automations" }
  ]
}

Example without action (answering a concept question):
{
  "message": "Smart Files are your all-in-one proposals that combine packages, contracts, and payments. When you send one to a client, it creates a snapshot - so editing the template later won't change what they received.\\n\\nWould you like to know how to create one?"
}

**Examples of Good Responses:**

Bad: [Long paragraph with 10 bullet points explaining everything about lead generation]

Good: "The fastest way to get more leads is through lead capture forms. Go to Marketing → Lead Forms and click 'Create Form' to set one up with name, email, phone, and date fields."

**Remember:**
- Short answers > long explanations
- Questions > info dumps  
- Actionable steps > theory
- Natural conversation > formal documentation
- Give clear, accurate navigation directions`;

// Define tools for OpenAI function calling
const CHATBOT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_lead_form",
      description:
        "Creates a new lead capture form for the photographer. Use this when the user confirms they want a form created.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the lead form (e.g., 'Wedding Inquiry Form')",
          },
          description: {
            type: "string",
            description: "Brief description of the form's purpose",
          },
          projectType: {
            type: "string",
            enum: ["WEDDING", "PORTRAIT", "COMMERCIAL"],
            description: "Type of photography project this form is for",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_contact",
      description:
        "Adds a new contact to the photographer's CRM. Use this when the user confirms they want to add a contact.",
      parameters: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "Contact's first name",
          },
          lastName: {
            type: "string",
            description: "Contact's last name",
          },
          email: {
            type: "string",
            description: "Contact's email address",
          },
          phone: {
            type: "string",
            description:
              "Contact's phone number (with country code, e.g., +15551234567)",
          },
          projectType: {
            type: "string",
            enum: ["WEDDING", "PORTRAIT", "COMMERCIAL"],
            description: "Type of photography project",
          },
        },
        required: ["firstName", "email"],
      },
    },
  },
];

// Response type with optional action buttons
export interface ChatbotAction {
  label: string;
  type: "navigate" | "external";
  target: string;
}

export interface ChatbotResponseWithActions {
  message: string;
  actions?: ChatbotAction[];
}

// Helper to build contextual prompt for navigation follow-ups
function buildNavigationFollowUpPrompt(navContext: NavigationContext): string {
  const pageDescriptions: Record<string, string> = {
    "/automations":
      "the Automations page where they can create automated email/SMS sequences triggered by pipeline stages",
    "/smart-files":
      "the Smart Files page where they manage proposals, contracts, and invoices",
    "/templates":
      "the Email Templates page for creating reusable email content",
    "/projects": "the Projects page showing all their client projects",
    "/contacts": "the Contacts page with their client database",
    "/galleries": "the Galleries page for sharing photos with clients",
    "/scheduling":
      "the Scheduling page for managing availability and online bookings",
    "/settings": "the Settings page for account configuration",
    "/lead-forms": "the Lead Forms page for creating inquiry capture forms",
    "/packages": "the Packages page for defining pricing packages",
    "/add-ons": "the Add-ons page for optional service extras",
    "/drip-campaigns":
      "the Drip Campaigns page for multi-email nurture sequences",
    "/questionnaires":
      "the Questionnaires page for collecting client information",
    "/inbox": "the Inbox for viewing all client messages",
    "/reports": "the Reports page for business analytics",
    "/earnings": "the Earnings page for tracking payments and payouts",
  };

  const targetPath = navContext.navigatedTo.split("?")[0];
  const pageDescription =
    pageDescriptions[targetPath] ||
    `the ${navContext.actionLabel.replace("Go to ", "")} page`;

  return `**Navigation Follow-Up Context:**
- User originally asked: "${navContext.originalUserQuestion}"
- User was on: ${navContext.previousPage || "the previous page"}
- User clicked: "${navContext.actionLabel}" button
- User is now on: ${pageDescription}

Your job: Craft a brief, helpful follow-up that acknowledges they've arrived and guides them to their next step based on what they originally asked about.`;
}

export async function getChatbotResponse(
  message: string,
  context: string = "general",
  photographerName?: string,
  history: ChatMessage[] = [],
  photographerId?: string,
  navigationContext?: NavigationContext,
): Promise<ChatbotResponseWithActions> {
  try {
    // Handle navigation follow-up (special case when user clicks action button)
    if (navigationContext?.isFollowUp) {
      const followUpPrompt = buildNavigationFollowUpPrompt(navigationContext);

      const followUpSystemMessage = `You are a friendly, helpful AI assistant for thePhotoCrm.

${followUpPrompt}

**IMPORTANT RULES FOR FOLLOW-UP:**
- Keep your response SHORT (1-2 sentences max)
- Sound natural, like you're walking alongside them: "Here we are!" or "Perfect!" or "Great!"
- Reference what they were originally asking about
- Offer ONE helpful next step or question
- Do NOT include navigation buttons - they're already on the page
- Be encouraging and conversational

**Response Format (JSON):**
{
  "message": "Your brief, friendly follow-up message here..."
}

**Example follow-ups:**
- "Here we are! I see you wanted to create an automation. Are you looking to send a welcome email to new inquiries, or something else?"
- "Perfect! This is where you'll manage your Smart Files. Want to create a new proposal or work with an existing template?"
- "Great, you're on the right page! To add a contact, click the 'Add Contact' button in the top right. Need help with anything specific?"`;

      const followUpMessages: ChatMessage[] = [
        { role: "system", content: followUpSystemMessage },
        ...history.slice(-6), // Less history for follow-ups
        {
          role: "user",
          content: `[User navigated to ${navigationContext.navigatedTo}]`,
        },
      ];

      const followUpResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: followUpMessages as any,
        max_tokens: 200, // Shorter responses for follow-ups
        response_format: { type: "json_object" },
      });

      const followUpContent =
        followUpResponse.choices[0]?.message?.content || "";

      try {
        const parsed = JSON.parse(followUpContent);
        return { message: parsed.message || followUpContent };
      } catch {
        return {
          message:
            followUpContent || "Here we are! How can I help you from here?",
        };
      }
    }

    // Regular chatbot response (not a follow-up)
    // Build context-aware system message
    let systemMessage = SYSTEM_CONTEXT;

    if (photographerName) {
      systemMessage += `\n\nThe photographer's name is ${photographerName}.`;
    }

    if (context !== "general") {
      systemMessage += `\n\nIMPORTANT: The user is currently on the "${context}" page. Do NOT suggest navigating to this page.`;
    }

    // Prepare messages for OpenAI
    const messages: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as any,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    if (
      !response.choices ||
      !response.choices[0] ||
      !response.choices[0].message
    ) {
      console.error("Invalid OpenAI response structure:", response);
      return {
        message: "I'm sorry, I couldn't generate a response. Please try again.",
      };
    }

    const aiResponse = response.choices[0].message.content || "";

    // Log raw response for debugging
    if (!aiResponse) {
      console.error(
        "OpenAI returned empty response. Full response:",
        JSON.stringify(response, null, 2),
      );
      return {
        message: "I'm sorry, I couldn't generate a response. Please try again.",
      };
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        message: parsed.message || aiResponse,
        actions: parsed.actions || undefined,
      };
    } catch (parseError) {
      // Fallback: if AI doesn't return valid JSON, use raw response as message
      console.warn(
        "Chatbot response was not valid JSON, using as plain text. Raw:",
        aiResponse.substring(0, 200),
      );
      return { message: aiResponse };
    }
  } catch (error: any) {
    console.error("Chatbot error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw new Error("Failed to get chatbot response");
  }
}

async function executeAction(
  action: any,
  photographerId: string,
): Promise<string> {
  const { storage } = await import("../storage");

  switch (action.type) {
    case "CREATE_LEAD_FORM": {
      const {
        name,
        description,
        projectType = "WEDDING",
        fields = [],
      } = action.params;

      const defaultConfig = {
        title: name || "Wedding Inquiry Form",
        description:
          description || "Let's discuss your wedding photography needs",
        primaryColor: "#3b82f6",
        backgroundColor: "#ffffff",
        buttonText: "Send Inquiry",
        successMessage: "Thank you! We'll be in touch soon.",
        showPhone: true,
        showMessage: true,
        showEventDate: true,
        redirectUrl: "",
        customFields:
          fields.length > 0
            ? fields
            : [
                {
                  id: "firstName",
                  type: "text",
                  label: "First Name",
                  placeholder: "Jane",
                  required: true,
                  isSystem: true,
                  width: "half",
                },
                {
                  id: "lastName",
                  type: "text",
                  label: "Last Name",
                  placeholder: "Smith",
                  required: true,
                  isSystem: true,
                  width: "half",
                },
                {
                  id: "email",
                  type: "email",
                  label: "Email",
                  placeholder: "jane@example.com",
                  required: true,
                  isSystem: true,
                  width: "full",
                },
                {
                  id: "phone",
                  type: "phone",
                  label: "Phone",
                  placeholder: "(555) 123-4567",
                  required: true,
                  isSystem: false,
                  width: "full",
                },
                {
                  id: "eventDate",
                  type: "date",
                  label: "Wedding Date",
                  required: false,
                  isSystem: false,
                  width: "half",
                },
                {
                  id: "venue",
                  type: "text",
                  label: "Venue Name",
                  placeholder: "e.g. The Grand Hotel",
                  required: false,
                  isSystem: false,
                  width: "half",
                },
                {
                  id: "message",
                  type: "textarea",
                  label: "Tell us about your wedding",
                  placeholder: "Share any details...",
                  required: false,
                  isSystem: false,
                  width: "full",
                },
                {
                  id: "optInSms",
                  type: "checkbox",
                  label: "I agree to receive SMS updates",
                  required: false,
                  options: ["Yes, text me updates"],
                  isSystem: false,
                  width: "full",
                },
              ],
      };

      const leadForm = await storage.createLeadForm({
        photographerId,
        name: name || "Wedding Inquiry Form",
        description: description || "AI-generated wedding inquiry form",
        projectType: projectType as any,
        config: defaultConfig,
        status: "ACTIVE",
      });

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "";
      return `✅ Done! I created "${leadForm.name}" for you. View it in Marketing → Lead Forms, or share this link: ${domain}/f/${leadForm.publicToken}`;
    }

    case "CREATE_CONTACT": {
      const {
        firstName,
        lastName,
        email,
        phone,
        projectType = "WEDDING",
      } = action.params;

      if (!firstName || !email) {
        return "❌ I need at least a first name and email to create a contact.";
      }

      const stages = await storage.getStagesByPhotographer(photographerId);
      const firstStage = stages.find((s) => s.orderIndex === 1) || stages[0];

      if (!firstStage) {
        return "❌ You need to set up your pipeline stages first before I can add contacts.";
      }

      const contact = await storage.createContact({
        photographerId,
        firstName,
        lastName: lastName || "",
        email,
        phone: phone || null,
        stageId: firstStage.id,
        projectType: projectType as any,
        leadSource: "AI_ASSISTANT",
      });

      return `✅ Added ${firstName} ${lastName || ""} to your ${firstStage.name} stage! View in Contacts page.`;
    }

    default:
      return "❌ Unknown action type.";
  }
}

// Zod schema for automation extraction
const AutomationStep = z.object({
  type: z.enum(["EMAIL", "SMS", "SMART_FILE"]),
  delayDays: z.number().min(0).max(365),
  delayHours: z.number().min(0).max(23).default(0),
  subject: z.string().nullish(),
  content: z.string(),
  recipientType: z.enum(["CONTACT", "PHOTOGRAPHER"]),
  smartFileTemplateName: z
    .string()
    .nullish()
    .describe("Name of the smart file template to send (for SMART_FILE type)"),
});

const AutomationExtraction = z.object({
  name: z.string().describe("A short descriptive name for this automation"),
  description: z
    .string()
    .describe("A brief description of what this automation does"),
  triggerType: z
    .enum(["STAGE_CHANGE", "SPECIFIC_STAGE"])
    .describe("What triggers this automation"),
  triggerStageId: z
    .string()
    .nullish()
    .describe("The stage ID if trigger is SPECIFIC_STAGE"),
  projectType: z.enum(["WEDDING", "PORTRAIT", "COMMERCIAL"]).default("WEDDING"),
  steps: z
    .array(AutomationStep)
    .min(1)
    .max(10)
    .describe("The sequence of actions to take"),
});

export async function extractAutomationFromDescription(
  description: string,
  photographerId: string,
): Promise<z.infer<typeof AutomationExtraction>> {
  const { storage } = await import("../storage");

  // Get photographer's stages for context
  const stages = await storage.getStagesByPhotographer(photographerId);
  const stagesList = stages.map((s) => `${s.name} (ID: ${s.id})`).join(", ");

  const systemPrompt = `You are an expert at understanding photographer workflow automation requests.

The photographer has these pipeline stages: ${stagesList}

Extract automation parameters from the user's description. Be smart about:
1. Trigger: If they mention "when someone books" or "after booking" → SPECIFIC_STAGE with booking stage
2. Delays: Convert "1 day later" → delayDays: 1, "3 hours" → delayHours: 3, "immediately" → delayDays: 0
3. Action Types:
   - EMAIL: For email messages
   - SMS: For text messages
   - SMART_FILE: When photographer mentions sending "proposal", "invoice", "contract", or "smart file"
     For SMART_FILE type, leave smartFileTemplateName as null - the user will select their template in the UI
4. Content: Write professional, friendly email/SMS content that matches their request
   
   ALLOWED PLACEHOLDERS - These will be replaced with actual values:
   - {{PHOTOGRAPHER_NAME}} - The photographer's name
   - {{BUSINESS_NAME}} - The business/studio name
   - {{SCHEDULING_LINK}} - Booking calendar link (only when photographer specifically requests it)
   
   Use these placeholders naturally in messages. For example:
   - "Thanks for reaching out! - {{PHOTOGRAPHER_NAME}}"
   - "We're excited to work with you! - {{BUSINESS_NAME}}"
   - "Book a time that works for you: {{SCHEDULING_LINK}}"
   
   NEVER use non-functional placeholders like [Your Name], {yourname}, [Business Name], etc.
   Only use the exact placeholders listed above.
   
5. Recipient: Usually CONTACT, but could be PHOTOGRAPHER for internal reminders
6. Subject: Email needs subject, SMS doesn't

Examples:
- "Send thank you email next day after booking" → EMAIL step, delayDays: 1, to CONTACT
- "Text them welcome message right away when they enter inquiry stage" → SMS step, delayDays: 0, SPECIFIC_STAGE trigger
- "Remind me to follow up 3 days after proposal sent" → EMAIL/SMS to PHOTOGRAPHER, delayDays: 3
- "Send SMS with booking link when they enter consultation stage" → SMS with "{{SCHEDULING_LINK}}" in content

BAD message (non-functional placeholder): "Thanks for reaching out! I'll be in touch soon. - [Your Name]"
GOOD message (with proper placeholder): "Thanks for reaching out! I'll be in touch soon. - {{PHOTOGRAPHER_NAME}}"
GOOD message (with scheduling link): "Ready to book your session? Schedule here: {{SCHEDULING_LINK}}"
GOOD message (with business name): "Looking forward to capturing your special day! - {{BUSINESS_NAME}}"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ],
    response_format: zodResponseFormat(AutomationExtraction, "automation"),
    max_completion_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const extracted = JSON.parse(content) as z.infer<typeof AutomationExtraction>;

  if (!extracted) {
    throw new Error("Failed to extract automation parameters");
  }

  return extracted;
}

// Schema for detecting multiple automations in one request
const MultiAutomationDetection = z.object({
  isMultiAutomation: z
    .boolean()
    .describe(
      "True if the request contains multiple separate automation requests",
    ),
  automationCount: z
    .number()
    .describe("Number of separate automations detected"),
  automations: z
    .array(
      z.object({
        summary: z
          .string()
          .describe(
            "Brief summary of this automation (e.g., 'SMS 5 min after inquiry')",
          ),
        triggerStage: z
          .string()
          .nullable()
          .describe("Stage name that triggers this"),
        actionType: z
          .enum(["EMAIL", "SMS", "SMART_FILE"])
          .describe("Type of action"),
        timing: z
          .string()
          .describe(
            "When it should trigger (e.g., '5 minutes', '1 day at 6pm')",
          ),
        purpose: z.string().describe("What this automation does"),
      }),
    )
    .describe("List of detected automations"),
});

/**
 * Detect if a message contains multiple automation requests
 */
export async function detectMultipleAutomations(
  message: string,
  photographerId: string,
): Promise<z.infer<typeof MultiAutomationDetection>> {
  const { storage } = await import("../storage");
  const stages = await storage.getStagesByPhotographer(photographerId);
  const stagesList = stages.map((s) => s.name).join(", ");

  const systemPrompt = `You are analyzing a photographer's automation request to detect if they want to create multiple automations in one message.

Available stages: ${stagesList}

Look for patterns like:
- "send X, then send Y" = 2 automations
- "send X at the same time send Y, and then send Z" = 3 automations  
- "when someone does X, send them Y via email and also send Z via text" = 2 automations
- Sequential actions: "first do X, then do Y, then do Z" = multiple automations

Each separate ACTION (email, SMS, Smart File) = 1 automation, even if they happen at the same time.

Examples:
✅ "send SMS after 5 min and email at same time" → 2 automations (SMS + Email)
✅ "when inquiry comes in, text them and send proposal" → 2 automations (SMS + Smart File)
✅ "send email, then follow up with text next day" → 2 automations
❌ "send them a welcome email" → 1 automation (single action)

Analyze the request and identify each separate automation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    response_format: zodResponseFormat(MultiAutomationDetection, "detection"),
    max_completion_tokens: 1000,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in detection response");
  }

  return JSON.parse(content) as z.infer<typeof MultiAutomationDetection>;
}

// Conversation state schema for building automations
const AutomationInfo = z.object({
  // Automation type
  automationType: z
    .enum(["COMMUNICATION", "STAGE_CHANGE", "COUNTDOWN"])
    .nullable(),

  // COMMUNICATION automation fields (stage-based triggers)
  triggerType: z.enum(["SPECIFIC_STAGE", "GLOBAL"]).nullable(),
  stageId: z.string().nullable(), // Source stage for communication automations
  stageName: z.string().nullable(),
  actionType: z.enum(["EMAIL", "SMS", "SMART_FILE"]).nullable(),
  delayDays: z.number().nullable(),
  delayHours: z.number().nullable(),
  delayMinutes: z.number().nullable(), // 0-59 for minute-level delays
  scheduledHour: z.number().nullable(), // 0-23 for time of day
  scheduledMinute: z.number().nullable(), // 0-59
  subject: z.string().nullable(),
  content: z.string().nullable(),
  smartFileTemplateId: z.string().nullable(),
  smartFileTemplateName: z.string().nullable(),

  // STAGE_CHANGE automation fields (business event triggers)
  businessTrigger: z
    .enum([
      "APPOINTMENT_BOOKED",
      "DEPOSIT_PAID",
      "FULL_PAYMENT_MADE",
      "CONTRACT_SIGNED",
    ])
    .nullable(),
  targetStageId: z.string().nullable(), // Where to move contact
  targetStageName: z.string().nullable(),

  // COUNTDOWN automation fields (event date triggers)
  eventType: z.enum(["WEDDING_DATE", "EVENT_DATE"]).nullable(),
  daysBefore: z.number().nullable(), // Days before event to trigger
});

const ConversationState = z.object({
  status: z.enum(["collecting", "confirming", "complete"]),
  collectedInfo: AutomationInfo,
  nextQuestion: z.string(),
  needsTemplateSelection: z.boolean().nullable(),
  needsStageSelection: z.boolean().nullable(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .nullable(),
  // Multi-automation support
  automationQueue: z.array(AutomationInfo).nullable(), // Queue of automations to create
  currentAutomationIndex: z.number().nullable(), // Which automation we're working on (0-based)
  totalAutomations: z.number().nullable(), // Total count for progress display
});

export type ConversationStateType = z.infer<typeof ConversationState>;

/**
 * Conversational AI automation builder
 * Asks questions progressively to build an automation
 */
export async function conversationalAutomationBuilder(
  userMessage: string,
  conversationHistory: ChatMessage[],
  photographerId: string,
  currentState?: ConversationStateType,
  projectType?: string,
  hasSmartFileTemplates: boolean = true,
): Promise<ConversationStateType> {
  const { storage } = await import("../storage");

  // Get photographer context (unified pipeline)
  const stages = await storage.getStagesByPhotographer(photographerId);
  const stagesList = stages.map((s) => `${s.name} (ID: ${s.id})`).join(", ");

  const smartFiles = await storage.getSmartFilesByPhotographer(photographerId);
  const smartFilesList =
    smartFiles.length > 0
      ? smartFiles.map((sf) => `${sf.name} (ID: ${sf.id})`).join(", ")
      : "(No Smart Files created yet)";

  // MULTI-AUTOMATION DETECTION: Check if this is the FIRST USER MESSAGE (not first message overall)
  // Count only user messages in history to determine if this is the first user input
  const userMessagesInHistory = conversationHistory.filter(
    (m) => m.role === "user",
  ).length;
  console.log(
    `🔍 Multi-automation check: currentState=${!!currentState}, historyLength=${conversationHistory.length}, userMessages=${userMessagesInHistory}`,
  );

  // Run detection if: no current state AND this is the first USER message (count=1 because current msg is already in history)
  if (!currentState && userMessagesInHistory === 1) {
    console.log(
      "🔎 Running multi-automation detection (first user message)...",
    );
    const detection = await detectMultipleAutomations(
      userMessage,
      photographerId,
    );

    if (detection.isMultiAutomation && detection.automationCount > 1) {
      // Multi-automation detected! Set up the queue
      const queue: z.infer<typeof AutomationInfo>[] = detection.automations.map(
        () => ({
          automationType: null,
          triggerType: null,
          stageId: null,
          stageName: null,
          actionType: null,
          delayDays: null,
          delayHours: null,
          delayMinutes: null,
          scheduledHour: null,
          scheduledMinute: null,
          subject: null,
          content: null,
          smartFileTemplateId: null,
          smartFileTemplateName: null,
          businessTrigger: null,
          targetStageId: null,
          targetStageName: null,
          eventType: null,
          daysBefore: null,
        }),
      );

      // Create initial state with queue info
      return {
        status: "collecting",
        collectedInfo: queue[0], // Start with first automation
        nextQuestion: `I can see you want to create ${detection.automationCount} automations here! Let me help you set them up one at a time.\n\n**Automation 1 of ${detection.automationCount}:** ${detection.automations[0].summary}\n\nWhich stage should trigger this first automation?`,
        needsTemplateSelection: null,
        needsStageSelection: true,
        options: stages.map((s) => ({ label: s.name, value: s.id })),
        automationQueue: queue,
        currentAutomationIndex: 0,
        totalAutomations: detection.automationCount,
      };
    }
  }

  // Check if we're in multi-automation mode
  const isMultiMode =
    currentState?.automationQueue && currentState.automationQueue.length > 1;
  const currentIndex = currentState?.currentAutomationIndex ?? 0;
  const totalAutomations = currentState?.totalAutomations ?? 1;
  const progressText = isMultiMode
    ? `\n\n**PROGRESS: Automation ${currentIndex + 1} of ${totalAutomations}**`
    : "";

  // Pre-compute stage options for the AI prompt
  const stageOptionsForPrompt = stages
    .map((s) => `{label: "${s.name}", value: "${s.id}"}`)
    .join(", ");

  // Build Smart File availability message for the prompt
  const smartFileAvailabilityNote = hasSmartFileTemplates
    ? ""
    : '\n**NOTE:** This photographer has NO Smart File templates yet. If they ask for a Smart File/proposal automation, tell them: "You\'ll need to create a Smart File template first. Would you like to send an email or text message instead?"';

  const systemPrompt = `You are helping a photographer create an automation through conversation.

**Available Pipeline Stages:** ${stagesList}
**Available Smart File Templates:** ${smartFilesList}${smartFileAvailabilityNote}
${isMultiMode ? `\n**MULTI-AUTOMATION MODE:** You are working on automation ${currentIndex + 1} of ${totalAutomations}. After this one is confirmed, move to the next.` : ""}

**AUTOMATION TYPES:**
1. **COMMUNICATION** - Send email/SMS/Smart File when contact enters a stage
2. **STAGE_CHANGE** - Move contact to different stage when business event happens (appointment booked, payment made, etc.)
3. **COUNTDOWN** - Send email/SMS before event date (e.g., "7 days before wedding")

**FIRST: Determine automation type from user's message**
- If they mention "send", "email", "text", "SMS" with "when enters stage" → COMMUNICATION
- If they mention "move to", "change stage", "appointment booked", "payment made" → STAGE_CHANGE
- If they mention "days before", "before wedding", "before event" → COUNTDOWN
- If unclear, ask: "What kind of automation do you want? (1) Send a message when someone enters a stage, (2) Move contacts between stages automatically, or (3) Send reminders before an event date?"

**FOR COMMUNICATION AUTOMATIONS (stage-based messaging):**
1. Set automationType: "COMMUNICATION"
2. Ask for trigger stage (stageId, stageName) - REQUIRED
3. Ask when to send (delayDays/Hours/Minutes, scheduledHour/Minute) - can use "immediately" for no delay
4. Ask what to send (actionType: EMAIL/SMS/SMART_FILE)
   - **IMPORTANT:** Only offer SMART_FILE option if Smart File templates are available (check the list above)
5. For EMAIL: Ask for email subject line first, then ask for the email body/message content
   - subject: The email subject line
   - content: The email body text
6. For SMS: Ask for the text message content
   - content: The SMS message text
7. For SMART_FILE: Ask which template to use (smartFileTemplateId, smartFileTemplateName)
   - If no templates exist, DO NOT offer this option

**IMPORTANT - EMAIL CONTENT IS REQUIRED:**
When actionType is EMAIL, you MUST collect both subject and content before confirming:
- First ask: "What should the email subject line be?"
- Then ask: "Great! Now what should the email say?" (the body text)

**FOR STAGE_CHANGE AUTOMATIONS (business event triggers):**
1. Set automationType: "STAGE_CHANGE"
2. Ask what event should trigger it: 
   - "APPOINTMENT_BOOKED" - when appointment is scheduled
   - "DEPOSIT_PAID" - when deposit payment received
   - "FULL_PAYMENT_MADE" - when full payment received
   - "CONTRACT_SIGNED" - when contract is signed
   Set businessTrigger to the event type
3. Ask which stage to move contacts to (targetStageId, targetStageName)
4. Done! Stage change automations don't send messages, they just move contacts

**FOR COUNTDOWN AUTOMATIONS (event date reminders):**
1. Set automationType: "COUNTDOWN"
2. Ask what event date to use (eventType: "WEDDING_DATE" or "EVENT_DATE")
3. Ask how many days before (daysBefore: number)
4. Ask what to send (actionType: EMAIL/SMS)
5. Ask for content (subject, content)

**IMPORTANT STAGE MATCHING:**
- User says "inquiry" → Match to "Inquiry" stage ID from the list
- User says "consultation" or "consult" → Match to "Consultation" stage ID
- User says "booked" or "booking" → Match to "Booked" stage ID
- Always extract the exact stage ID from the Available Pipeline Stages list above

**Conversation Style:**
- Be friendly and conversational
- Ask ONE clear question at a time
- Confirm details before marking complete
- Use natural language, not technical jargon

**CLICKABLE OPTIONS (IMPORTANT!):**
When asking about stages, ALWAYS include options so the user can click to select.
Include the options array with {label, value} pairs for:
- Stage selection: options = [${stageOptionsForPrompt}]
- Action type selection: options = [{label: "Email", value: "EMAIL"}, {label: "Text Message", value: "SMS"}, {label: "Smart File", value: "SMART_FILE"}]
- Automation type: options = [{label: "Send a message", value: "COMMUNICATION"}, {label: "Move to a stage", value: "STAGE_CHANGE"}, {label: "Event countdown", value: "COUNTDOWN"}]
- Yes/No confirmations: options = [{label: "Yes, create it!", value: "yes"}, {label: "No, let me change something", value: "no"}]

**Response Format:**
- status: "collecting" (still gathering info), "confirming" (have everything, asking to confirm), or "complete" (user confirmed)
- collectedInfo: Object with the info gathered so far
- nextQuestion: The next question to ask the user (or confirmation message)
- needsTemplateSelection: true if user needs to pick a Smart File template from dropdown
- needsStageSelection: true if user needs to pick a stage from dropdown
- options: Array of {label, value} options - ALWAYS provide when asking about stages, action types, or automation types!

**CRITICAL - Multi-Automation Queue Preservation:**
${
  isMultiMode
    ? `⚠️ IMPORTANT: You are in MULTI-AUTOMATION MODE. You MUST preserve these fields in EVERY response:
- automationQueue: ${JSON.stringify(currentState?.automationQueue)} (copy this EXACTLY)
- currentAutomationIndex: ${currentState?.currentAutomationIndex}
- totalAutomations: ${currentState?.totalAutomations}
These fields track the queue of automations being created. DO NOT set them to null or omit them!`
    : ""
}

**CONFIRMATION MESSAGE (when status = "confirming"):**
When you have ALL required info, set status to "confirming" and write a friendly summary based on type:

**For COMMUNICATION automations:**
"Okay, I think I've got it! Here's what we'll create${progressText}:

📍 **Trigger:** When a client enters the [Stage Name] stage
⏰ **Timing:** [Wait X days/hours] [at specific time if applicable]
📧/📱/📄 **Action:** Send [email/SMS/Smart File]
✉️ **Message:** [Brief preview of content or "You'll select a template"]

Does this look good? Reply 'yes' to create it, or let me know what to change!"

**For STAGE_CHANGE automations:**
"Okay, I think I've got it! Here's what we'll create${progressText}:

🎯 **Trigger:** When [business event] happens (e.g., appointment is booked)
➡️ **Action:** Move contact from their current stage to [Target Stage Name]

Does this look good? Reply 'yes' to create it, or let me know what to change!"

**For COUNTDOWN automations:**
"Okay, I think I've got it! Here's what we'll create${progressText}:

📅 **Trigger:** [X] days before [event type] (e.g., wedding date)
📧/📱 **Action:** Send [email/SMS]
✉️ **Message:** [Brief preview of content]

Does this look good? Reply 'yes' to create it, or let me know what to change!"

Make it conversational, clear, and easy to understand. Use emojis to make it friendly.${isMultiMode ? "\n\n**IMPORTANT:** After user confirms, you'll move to the next automation in the queue automatically." : ""}

**Examples:**

User: "Send a thank you email 1 day after booking"
Response: {
  status: "collecting",
  collectedInfo: { actionType: "EMAIL", delayDays: 1 },
  nextQuestion: "Got it! I'll send a thank you email 1 day after someone enters a stage. Which stage should trigger this automation?",
  needsStageSelection: true
}

User: "When they enter inquiry"
Response: {
  status: "collecting", 
  collectedInfo: { stageId: "[inquiry-stage-id-from-list]", stageName: "Inquiry", actionType: "EMAIL", delayDays: 1 },
  nextQuestion: "Perfect! What should the email say?",
  needsStageSelection: false
}

User: "Thanks for reaching out! We'll get back to you soon."
Response: {
  status: "confirming",
  collectedInfo: { stageId: "[id]", stageName: "Inquiry", actionType: "EMAIL", delayDays: 1, content: "Thanks for reaching out! We'll get back to you soon." },
  nextQuestion: "Okay, I think I've got it! Here's what we'll create:\n\n📍 **Trigger:** When a client enters the Inquiry stage\n⏰ **Timing:** Wait 1 day\n📧 **Action:** Send email\n✉️ **Message:** \"Thanks for reaching out! We'll get back to you soon.\"\n\nDoes this look good? Reply 'yes' to create it, or let me know what to change!",
  needsTemplateSelection: false
}

User: "yes" (or "looks good" or "create it")
Response: {
  status: "complete",
  collectedInfo: { [same as above] },
  nextQuestion: "Perfect! Creating your automation now...",
  needsTemplateSelection: false
}

Current State: ${JSON.stringify(currentState || {})}
Conversation History: ${JSON.stringify(conversationHistory.slice(-4))} (showing last 4 messages)`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  console.log("🤖 Calling OpenAI for conversational automation...");

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        response_format: zodResponseFormat(ConversationState, "conversation"),
        max_completion_tokens: 1500,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("OpenAI API timeout after 30 seconds")),
          30000,
        ),
      ),
    ]);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    let state = JSON.parse(content) as ConversationStateType;
    console.log("✅ OpenAI response received, status:", state.status);

    // MULTI-AUTOMATION QUEUE HANDLING
    // If user confirmed and we're in multi-automation mode, advance to next automation
    if (state.status === "complete" && isMultiMode && state.automationQueue) {
      const nextIndex = currentIndex + 1;

      if (nextIndex < totalAutomations) {
        // More automations in queue! Move to next one
        console.log(
          `📋 Moving to automation ${nextIndex + 1} of ${totalAutomations}`,
        );

        // Save completed automation in queue
        state.automationQueue[currentIndex] = state.collectedInfo;

        // Reset to start collecting next automation
        state = {
          status: "collecting",
          collectedInfo: state.automationQueue[nextIndex], // Next automation
          nextQuestion: `Great! Automation ${currentIndex + 1} is ready to create.\n\n**Now let's set up Automation ${nextIndex + 1} of ${totalAutomations}**\n\nWhat stage should trigger this automation?`,
          needsTemplateSelection: null,
          needsStageSelection: true,
          options: stages.map((s) => ({ label: s.name, value: s.id })),
          automationQueue: state.automationQueue,
          currentAutomationIndex: nextIndex,
          totalAutomations: totalAutomations,
        };
      } else {
        // Last automation confirmed - mark as truly complete
        console.log(`✅ All ${totalAutomations} automations confirmed!`);
        state.automationQueue[currentIndex] = state.collectedInfo;
      }
    }

    return state;
  } catch (error: any) {
    console.error("❌ OpenAI API error:", error.message);
    throw error;
  }
}
