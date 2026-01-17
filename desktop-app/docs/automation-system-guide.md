# thePhotoCRM Automation System Guide

## Overview

The automation system allows photographers to set up automated workflows that trigger based on various events. Automations can send emails, SMS messages, or automatically move projects between pipeline stages.

---

## Automation Types

### 1. COMMUNICATION Automations
Send automated emails or SMS messages to clients.

**Use cases:**
- Welcome email when a new inquiry comes in
- Reminder 1 hour before a discovery call
- Follow-up email 24 hours after sending a proposal
- Thank you message after a call ends

### 2. STAGE_CHANGE Automations
Automatically move projects between pipeline stages when business events occur.

**Use cases:**
- Move to "Discovery Call Scheduled" when an appointment is booked
- Move to "Proposal Sent" when a Smart File is sent
- Move to "Booked / Retainer Paid" when any payment is made

### 3. COUNTDOWN Automations
Send messages relative to a project's event date (wedding date, session date, etc.).

**Use cases:**
- Send prep questionnaire 30 days before wedding
- Send timeline reminder 7 days before event
- Send delivery expectation email 3 days after event

---

## Trigger Types

### Stage-Entry Triggers
Fire when a project enters a specific stage.

**Timing options:**
- `delayMinutes`: Minutes after entering the stage (e.g., 60 = 1 hour later)
- `delayDays` + `sendAtHour`: Days after entry at a specific time (e.g., 1 day at 9:00 AM)

### Booking-Relative Triggers
Fire relative to a scheduled appointment/booking.

**Anchor types:**
- `STAGE_ENTRY`: Traditional - fires after entering the stage
- `BOOKING_START`: Fires relative to when a booking starts
- `BOOKING_END`: Fires relative to when a booking ends

**Timing examples:**
- `-1440` minutes with `BOOKING_START` = 24 hours BEFORE the call
- `-60` minutes with `BOOKING_START` = 1 hour BEFORE the call
- `60` minutes with `BOOKING_END` = 1 hour AFTER the call ends

### Business Event Triggers
Fire when specific business events occur (for STAGE_CHANGE automations).

| Trigger Type | Description |
|-------------|-------------|
| `ANY_PAYMENT_MADE` | Any payment received (deposit, partial, or full) |
| `DEPOSIT_PAID` | Deposit payment specifically received |
| `FULL_PAYMENT_MADE` | Project is fully paid |
| `CONTRACT_SIGNED` | Client or photographer signs a contract |
| `SMART_FILE_SENT` | Smart File is sent to client |
| `SMART_FILE_ACCEPTED` | Client accepts a Smart File |
| `APPOINTMENT_BOOKED` | Client books an appointment |
| `PROJECT_BOOKED` | Project is officially booked |
| `GALLERY_SHARED` | Gallery is shared with client |
| `PROJECT_DELIVERED` | Project is marked as delivered |
| `CLIENT_ONBOARDED` | Client completes onboarding |
| `EVENT_DATE_REACHED` | Project's event date arrives |

---

## Email Builder Content Blocks

For COMMUNICATION automations, emails can be built using the visual email builder. Content is stored as an array of blocks:

```json
[
  {
    "id": "unique-id-1",
    "type": "HEADING",
    "content": "Welcome to Our Studio!"
  },
  {
    "id": "unique-id-2", 
    "type": "TEXT",
    "content": "Hi {{client_first_name}}, thank you for reaching out..."
  },
  {
    "id": "unique-id-3",
    "type": "BUTTON",
    "content": "View Your Portal",
    "url": "{{portal_link}}"
  }
]
```

### Block Types
- `HEADING`: Large text header
- `TEXT`: Paragraph content (supports markdown/HTML)
- `BUTTON`: Call-to-action button with URL
- `IMAGE`: Image block
- `DIVIDER`: Visual separator

### Template Variables
Use double curly braces for dynamic content:
- `{{client_first_name}}` - Client's first name
- `{{client_email}}` - Client's email
- `{{photographer_name}}` - Photographer's business name
- `{{project_title}}` - Project/event title
- `{{event_date}}` - Event date
- `{{portal_link}}` - Client portal URL
- `{{booking_link}}` - Scheduling link

---

## Database Schema

### automations table
Main automation record:
- `id`: Unique identifier
- `photographerId`: Owner of the automation
- `name`: Display name
- `automationType`: COMMUNICATION, STAGE_CHANGE, or COUNTDOWN
- `stageId`: Which stage this automation belongs to
- `channel`: EMAIL or SMS (for COMMUNICATION)
- `targetStageId`: Destination stage (for STAGE_CHANGE)
- `enabled`: Whether automation is active

### automation_steps table
Individual steps within an automation:
- `automationId`: Parent automation
- `stepIndex`: Order of execution
- `delayMinutes`: When to fire (can be negative for before-booking)
- `actionType`: EMAIL, SMS, or SMART_FILE
- `templateId`: Email/SMS template to use
- `anchorType`: STAGE_ENTRY, BOOKING_START, or BOOKING_END

### automation_business_triggers table
Business event triggers for STAGE_CHANGE automations:
- `automationId`: Parent automation
- `triggerType`: The business event (e.g., ANY_PAYMENT_MADE)
- `enabled`: Whether this trigger is active

### templates table
Email/SMS template content:
- `name`: Template name
- `subject`: Email subject line
- `htmlBody`: Rendered HTML for sending
- `textBody`: Plain text version
- `contentBlocks`: JSON array of editor blocks

---

## How Automations Execute

### Cron Job Processing
A background job runs every minute checking for:

1. **Stage-entry automations**: Projects that entered a stage and are due for messages
2. **Booking-relative automations**: Upcoming/past bookings that trigger messages
3. **Business event automations**: Checks if conditions are met (payment made, contract signed, etc.)

### Execution Flow
1. Find all enabled automations for the photographer
2. For each automation, find projects that match criteria
3. Check if execution is due based on timing
4. Execute action (send email, send SMS, or change stage)
5. Log execution in `automation_executions` table

### Preventing Duplicates
- Each execution is logged with project ID, automation ID, and step index
- Before executing, the system checks if this specific step already ran for this project
- `effectiveFrom` field ensures only projects entering stage after automation creation are processed

---

## Creating Modern Automations

When creating or updating automations, ensure:

1. **Use contentBlocks**: Always include content blocks for the visual email builder
2. **Set useEmailBuilder**: Mark `useEmailBuilder: true` on the automation
3. **Include htmlBody and textBody**: These are used for actual email delivery
4. **Add business triggers**: For STAGE_CHANGE automations, attach the appropriate trigger

### Example: Creating a Modern COMMUNICATION Automation

```javascript
const automation = {
  name: "Send follow-up email 24 hours after proposal sent",
  automationType: "COMMUNICATION",
  stageId: proposalSentStageId,
  channel: "EMAIL",
  enabled: true,
  useEmailBuilder: true
};

const step = {
  stepIndex: 0,
  delayDays: 1,
  sendAtHour: 9,
  sendAtMinute: 0,
  actionType: "EMAIL",
  templateId: followUpTemplateId,
  anchorType: "STAGE_ENTRY"
};

const template = {
  name: "Proposal Follow-Up",
  subject: "Just checking in about your proposal",
  htmlBody: "<p>Hi {{client_first_name}}...</p>",
  textBody: "Hi {{client_first_name}}...",
  contentBlocks: [
    { id: "1", type: "TEXT", content: "Hi {{client_first_name}}..." }
  ]
};
```

### Example: Creating a STAGE_CHANGE Automation with Business Trigger

```javascript
const automation = {
  name: "Move to Booked when any payment is made",
  automationType: "STAGE_CHANGE",
  stageId: proposalSentStageId,
  targetStageId: bookedStageId,
  enabled: true
};

const businessTrigger = {
  automationId: automation.id,
  triggerType: "ANY_PAYMENT_MADE",
  enabled: true
};
```

---

## Pipeline Stage Templates

Each pipeline stage has recommended automation templates:

### New Inquiry
- Immediate welcome email
- SMS notification (1 min delay)
- Follow-up sequence (6h, 24h, 48h, 4 days, 7 days, 14 days)
- Stage change: Move to Discovery Call when appointment booked

### Discovery Call Scheduled
- Confirmation email (immediate)
- Prep questions (24h before call)
- Reminder (1h before call)
- Thank you (1h after call)
- Proposal nudge (24h after call)
- Stage change: Move to Proposal Sent when Smart File sent

### Proposal Sent
- Follow-up email (24h after)
- Reminder email (3 days after)
- Final follow-up (7 days after)
- Stage change: Move to Booked when any payment made

### No Show / Call Cancelled
- Check-in email (immediate)
- Reschedule offer (2-3 days later)

---

## Troubleshooting

### Automation not firing?
1. Check `enabled` is true on both automation and step
2. Verify `effectiveFrom` date is before project's stage entry
3. Check `automation_executions` table for existing runs
4. Ensure business trigger conditions are met (for STAGE_CHANGE)

### Email not showing in builder?
- Ensure template has `contentBlocks` array populated
- Check blocks have valid `id`, `type`, and `content` fields

### Stage change not happening?
- Verify business trigger is attached and enabled
- Check trigger condition (e.g., amountPaidCents > 0 for payments)
- Review logs for "Checking trigger condition" messages

---

## Future Improvements

- [ ] Multi-condition triggers (AND/OR logic)
- [ ] A/B testing for email content
- [ ] Analytics dashboard for automation performance
- [ ] Conditional branching based on client responses
- [ ] Integration with external tools (Zapier, etc.)
