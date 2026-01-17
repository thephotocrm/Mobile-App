# Smart Files System Architecture

**thePhotoCrm Smart Files** is a drag-and-drop proposal and invoice builder that enables wedding photographers to create professional, interactive documents combining package selection, add-ons, contracts with e-signatures, payment processing, and scheduling—all in one seamless client experience.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Model](#data-model)
3. [Page Types](#page-types)
4. [API Endpoints](#api-endpoints)
5. [Client Flow & Status Lifecycle](#client-flow--status-lifecycle)
6. [Payment System](#payment-system)
7. [E-Signature System](#e-signature-system)
8. [Automation Triggers](#automation-triggers)
9. [Frontend Components](#frontend-components)
10. [Developer Guide](#developer-guide)

---

## System Overview

Smart Files operate on a **template → instance** model:

```
┌──────────────────────────────────────────────────────────────────┐
│                        PHOTOGRAPHER SIDE                          │
│                                                                    │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│  │ Smart File  │───▶│ Smart File   │───▶│ Project Smart File   │ │
│  │ Template    │    │ Pages        │    │ (Instance sent to    │ │
│  │             │    │ (7 types)    │    │  specific client)    │ │
│  └─────────────┘    └──────────────┘    └──────────────────────┘ │
│        │                   │                      │               │
│        │                   │                      │               │
│        ▼                   ▼                      ▼               │
│  Name, description,   Page content          Snapshot of pages,   │
│  default deposit %    stored as JSON        client selections,   │
│                                             signatures, payments  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                │ Send to Client
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                               │
│                                                                    │
│  Client receives unique token URL: /smart-file/{token}           │
│                                                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ View    │─▶│ Select  │─▶│ Sign    │─▶│ Choose  │─▶│ Pay     │ │
│  │ Proposal│  │ Package │  │ Contract│  │ Schedule│  │         │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Core Tables

#### `smart_files` - Template Library
```typescript
{
  id: string (UUID),
  photographerId: string,        // Photographer who owns this template
  name: string,                  // "Wedding Collection Proposal"
  description: string | null,
  projectType: string | null,    // "WEDDING", "PORTRAIT", etc.
  status: "ACTIVE" | "ARCHIVED",
  defaultDepositPercent: number, // Default 50%
  allowFullPayment: boolean,     // Allow pay-in-full option
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `smart_file_pages` - Page Content
```typescript
{
  id: string (UUID),
  smartFileId: string,           // Parent Smart File template
  pageType: "TEXT" | "PACKAGE" | "ADDON" | "CONTRACT" | "PAYMENT" | "FORM" | "SCHEDULING",
  pageOrder: number,             // Display order (0-indexed)
  displayTitle: string,          // "Welcome", "Choose Your Package", etc.
  content: JSON,                 // Type-specific content (see Page Types section)
  createdAt: timestamp
}
```

#### `project_smart_files` - Client Instances
```typescript
{
  id: string (UUID),
  projectId: string,             // Linked project
  smartFileId: string,           // Source template
  photographerId: string,
  clientId: string,              // Contact receiving this proposal
  
  // Snapshot (frozen at send time)
  smartFileName: string,
  pagesSnapshot: JSON,           // Full copy of pages at send time
  
  // Status Tracking
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DEPOSIT_PAID" | "PAID",
  sentAt: timestamp | null,
  viewedAt: timestamp | null,
  acceptedAt: timestamp | null,
  paidAt: timestamp | null,
  
  // Client Selections
  selectedPackages: JSON,        // [{pageId, packageId, name, priceCents}]
  selectedAddOns: JSON,          // [{pageId, addOnId, name, priceCents, quantity}]
  formAnswers: JSON,             // {pageId: {questionId: answer}}
  
  // Pricing
  subtotalCents: number,
  taxCents: number,
  feesCents: number,
  tipCents: number,
  totalCents: number,
  depositPercent: number | null,
  depositCents: number | null,
  amountPaidCents: number,       // Cumulative payments
  balanceDueCents: number,       // Remaining balance
  
  // Payment Schedule
  paymentScheduleMode: "SIMPLE" | "CLIENT_CHOICE" | "CUSTOM" | null,
  paymentScheduleConfig: JSON,   // {maxInstallments, allowPayInFull, payInFullDiscountPercent}
  paymentSchedule: JSON,         // [{id, description, dueDate, amountCents, percentOfTotal, status}]
  
  // Autopay
  autopayEnabled: boolean,
  autopayPaymentMethodId: string | null,
  autopayEnabledAt: timestamp | null,
  lastAutopayAttemptAt: timestamp | null,
  lastAutopayError: string | null,
  
  // Stripe
  stripePaymentIntentId: string | null,
  stripeChargeId: string | null,
  paymentType: "DEPOSIT" | "FULL" | "BALANCE" | null,
  
  // Contract Signatures
  clientSignatureUrl: string | null,        // Data URL of signature image
  photographerSignatureUrl: string | null,
  clientSignedAt: timestamp | null,
  photographerSignedAt: timestamp | null,
  clientSignedIp: string | null,            // Legal audit trail
  clientSignedUserAgent: string | null,
  contractSnapshotHtml: string | null,      // Rendered HTML at signature time
  contractPdfUrl: string | null,            // Generated PDF
  
  // Access
  token: string (UUID),          // Unique access token for client URL
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `payment_transactions` - Payment History
```typescript
{
  id: string (UUID),
  projectSmartFileId: string,
  projectId: string,
  photographerId: string,
  clientId: string | null,
  
  amountCents: number,
  paymentType: "DEPOSIT" | "INSTALLMENT" | "BALANCE" | "FULL" | "CUSTOM",
  paymentMethod: "CARD" | "ACH" | "CASH" | "CHECK" | null,
  
  stripePaymentIntentId: string | null,
  stripeChargeId: string | null,
  
  installmentId: string | null,          // Links to specific schedule installment
  installmentDescription: string | null,
  
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
  failureReason: string | null,
  notes: string | null,
  metadata: JSON | null,
  
  createdAt: timestamp,
  processedAt: timestamp | null
}
```

### Entity Relationships

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────────┐
│  photographers  │───┐   │   smart_files    │       │  smart_file_pages   │
│                 │   │   │                  │───────│                     │
└─────────────────┘   │   └──────────────────┘       └─────────────────────┘
                      │            │
                      │            │
                      │            ▼
                      │   ┌──────────────────┐       ┌─────────────────────┐
                      ├──▶│project_smart_files│───────│ payment_transactions│
                      │   └──────────────────┘       └─────────────────────┘
                      │            │
┌─────────────────┐   │            │
│    projects     │───┘            │
│                 │────────────────┘
└─────────────────┘
         │
         │
┌─────────────────┐
│    contacts     │
│   (clients)     │
└─────────────────┘
```

---

## Page Types

Smart Files support 7 page types, each with specific content structures:

### 1. TEXT Page
Rich content page with hero sections and flexible block layouts.

```typescript
type TextPageContent = {
  hero?: {
    backgroundImage?: string,
    title?: string,
    description?: string
  },
  sections?: Array<{
    id: string,
    columns: 1 | 2,
    blocks: Array<{
      id: string,
      type: "HEADING" | "TEXT" | "SPACER" | "IMAGE" | "FORM_FIELD",
      content: any,
      column?: 0 | 1  // For 2-column layouts
    }>
  }>
}
```

### 2. PACKAGE Page
Package selection with single-choice radio buttons.

```typescript
type PackagePageContent = {
  heading: string,           // "Choose Your Package"
  description: string,       // Instructional text
  packageIds: string[]       // References to packages table
}
```
Packages are pulled dynamically from the `packages` table with their items and pricing.

### 3. ADDON Page
Add-on selection with quantity controls.

```typescript
type AddOnPageContent = {
  heading: string,           // "Enhance Your Experience"
  description: string,
  addOnIds: string[]         // References to add_ons table
}
```

### 4. CONTRACT Page
Legal contract with signature requirements.

```typescript
type ContractPageContent = {
  heading: string,                    // "Photography Agreement"
  description: string,
  contractTemplate: string,           // HTML with {{variables}}
  requireClientSignature: boolean,    // Default: true
  requirePhotographerSignature: boolean // Default: true
}
```

**Contract Variables:**
- `{{clientFirstName}}`, `{{clientLastName}}`, `{{clientEmail}}`
- `{{photographerName}}`, `{{businessName}}`
- `{{projectTitle}}`, `{{eventDate}}`
- `{{packageName}}`, `{{totalAmount}}`, `{{depositAmount}}`
- `{{todayDate}}`, `{{clientAddress}}`

### 5. PAYMENT Page
Payment configuration and checkout.

```typescript
type PaymentPageContent = {
  heading: string,              // "Complete Your Booking"
  description: string,
  depositPercent: number,       // 10-100%
  paymentTerms: string,         // "Balance due 30 days before event"
  acceptOnlinePayments: boolean,
  paymentScheduleMode?: "SIMPLE" | "CLIENT_CHOICE" | "BIWEEKLY" | "MONTHLY" | "CUSTOM",
  paymentScheduleConfig?: {
    maxInstallments?: number,           // 2-6 for CLIENT_CHOICE
    allowPayInFull?: boolean,
    payInFullDiscountPercent?: number   // e.g., 3% discount
  },
  customInstallments?: Array<{
    description: string,
    dueDate: string,
    percentOfTotal: number
  }>
}
```

### 6. FORM Page
Custom questionnaire/intake form.

```typescript
type FormPageContent = {
  hero?: HeroSection,
  sections?: Array<{
    id: string,
    columns: 1 | 2,
    blocks: Array<{
      id: string,
      type: "FORM_FIELD",
      content: {
        fieldType: "TEXT_INPUT" | "TEXTAREA" | "MULTIPLE_CHOICE" | "CHECKBOX" | "DATE" | "EMAIL" | "NUMBER",
        label: string,
        placeholder?: string,
        required: boolean,
        options?: string[]  // For MULTIPLE_CHOICE/CHECKBOX
      }
    }>
  }>
}
```

### 7. SCHEDULING Page
Appointment booking integration.

```typescript
type SchedulingPageContent = {
  heading: string,              // "Schedule Your Session"
  description: string,
  durationMinutes: number,      // 30, 60, 90, 120
  bufferBeforeMinutes: number,  // Buffer time before
  bufferAfterMinutes: number,   // Buffer time after
  bookingType: string,          // "CONSULTATION", "ENGAGEMENT", "WEDDING"
  allowRescheduling: boolean
}
```

---

## API Endpoints

### Authenticated Routes (Photographer)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/smart-files` | List all Smart File templates |
| `POST` | `/api/smart-files` | Create new Smart File template |
| `GET` | `/api/smart-files/:id` | Get Smart File with pages |
| `PATCH` | `/api/smart-files/:id` | Update Smart File |
| `DELETE` | `/api/smart-files/:id` | Delete Smart File |
| `POST` | `/api/smart-files/:id/pages` | Add page to Smart File |
| `PATCH` | `/api/smart-files/:id/pages/:pageId` | Update page |
| `DELETE` | `/api/smart-files/:id/pages/:pageId` | Delete page |
| `POST` | `/api/smart-files/:id/pages/reorder` | Reorder pages |
| `GET` | `/api/projects/:id/smart-files` | Get Smart Files attached to project |
| `POST` | `/api/projects/:projectId/smart-files` | Attach Smart File to project |
| `POST` | `/api/projects/:projectId/smart-files/:id/send` | Send Smart File to client |
| `POST` | `/api/projects/:projectId/smart-files/:id/photographer-sign` | Photographer signs contract |
| `DELETE` | `/api/projects/:projectId/smart-files/:id` | Remove Smart File from project |
| `POST` | `/api/projects/:projectId/smart-files/:id/send-sms` | Send via SMS |

### Public Routes (Client Access)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/public/smart-files/:token` | View Smart File |
| `GET` | `/api/public/smart-files/:token/packages` | Get fresh package data |
| `GET` | `/api/public/smart-files/:token/add-ons` | Get fresh add-on data |
| `PATCH` | `/api/public/smart-files/:token/accept` | Accept and save selections |
| `POST` | `/api/public/smart-files/:token/reset-selections` | Reset to edit selections |
| `PATCH` | `/api/public/smart-files/:token/sign` | Save client signature |
| `PATCH` | `/api/public/smart-files/:token/payment-schedule` | Save payment schedule |
| `PATCH` | `/api/public/smart-files/:token/form-answers` | Save form answers |
| `POST` | `/api/public/smart-files/:token/create-checkout` | Create Stripe checkout |
| `POST` | `/api/public/smart-files/:token/create-payment-intent` | Create PaymentIntent |
| `POST` | `/api/public/smart-files/:token/confirm-payment` | Confirm payment |
| `GET` | `/api/public/smart-files/:token/payment-history` | Get transaction history |
| `GET` | `/api/public/smart-files/:token/payment-schedule` | Get installments |
| `POST` | `/api/public/smart-files/:token/create-installment-payment` | Pay next installment |
| `POST` | `/api/public/smart-files/:token/create-setup-intent` | Save card for later |
| `POST` | `/api/public/smart-files/:token/save-payment-method` | Save payment method |
| `GET` | `/api/public/smart-files/:token/saved-payment-methods` | List saved cards |
| `DELETE` | `/api/public/smart-files/:token/payment-methods/:id` | Delete saved card |
| `POST` | `/api/public/smart-files/:token/set-default-payment-method` | Set default card |
| `POST` | `/api/public/smart-files/:token/toggle-autopay` | Enable/disable autopay |
| `GET` | `/api/public/smart-files/:token/booking` | Get scheduling booking |
| `POST` | `/api/public/smart-files/:token/booking` | Create booking |

---

## Client Flow & Status Lifecycle

### Status State Machine

```
                    ┌────────────┐
                    │   DRAFT    │  Initial state when attached to project
                    └─────┬──────┘
                          │ Photographer clicks "Send"
                          ▼
                    ┌────────────┐
                    │    SENT    │  Email/SMS sent to client
                    └─────┬──────┘
                          │ Client opens link
                          ▼
                    ┌────────────┐
                    │   VIEWED   │  First view recorded
                    └─────┬──────┘
                          │ Client confirms selections
                          ▼
                    ┌────────────┐
                    │  ACCEPTED  │  Selections locked, ready for payment
                    └─────┬──────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
    ┌─────────────────┐       ┌────────────────┐
    │  DEPOSIT_PAID   │──────▶│      PAID      │
    │ (partial pay)   │       │ (fully paid)   │
    └─────────────────┘       └────────────────┘
```

### Client Journey

1. **Receive Link** - Client gets email/SMS with unique `/smart-file/{token}` URL
2. **View Proposal** - Navigate through pages, status becomes `VIEWED`
3. **Select Package** - Choose primary package from PACKAGE page
4. **Add Extras** - Select add-ons with quantities from ADDON page
5. **Complete Form** - Fill questionnaire if FORM page exists
6. **Sign Contract** - Draw signature on CONTRACT page (if present)
7. **Choose Payment Plan** - Select installment count if CLIENT_CHOICE mode
8. **Make Payment** - Pay deposit or full amount via Stripe
9. **Schedule Session** - Book appointment if SCHEDULING page exists

---

## Payment System

### Stripe Connect Integration

Smart Files use **Stripe Connect** for split payments:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Client    │────▶│   Stripe    │────▶│  Photographer   │
│   (Payer)   │     │  (Platform) │     │ (Connected Acct)│
└─────────────┘     └─────────────┘     └─────────────────┘
                          │
                          │ Platform Fee
                          ▼
                    ┌─────────────┐
                    │ thePhotoCrm │
                    │  (Platform) │
                    └─────────────┘
```

### Payment Schedule Modes

| Mode | Description |
|------|-------------|
| `SIMPLE` | Deposit + balance (traditional) |
| `CLIENT_CHOICE` | Client chooses 2-6 installments |
| `BIWEEKLY` | Auto-generated bi-weekly schedule |
| `MONTHLY` | Auto-generated monthly schedule |
| `CUSTOM` | Photographer-defined installments |

### Payment Schedule Utilities

Located in `shared/paymentScheduleUtils.ts`:

```typescript
// Generate schedule from event date
calculateScheduleFromEventDate(options: GenerateScheduleOptions): PaymentInstallment[]

// Generate client-choice schedule (HoneyBook style)
generateClientChoiceSchedule(
  totalCents: number,
  numberOfPayments: number,
  eventDate: Date,
  startDate?: Date
): PaymentInstallment[]

// Get allowed installment counts based on time to event
getAllowedInstallmentCounts(eventDate: Date, startDate?: Date): number[]

// Apply payment to schedule
applyPaymentToSchedule(schedule: PaymentInstallment[], paymentAmountCents: number): PaymentInstallment[]

// Get next due installment
getNextDueInstallment(schedule: PaymentInstallment[]): PaymentInstallment | null
```

### Autopay System

Clients can enable autopay for scheduled payments:

1. Client saves card via SetupIntent
2. Toggles autopay on for Smart File
3. Cron job checks due installments daily
4. Charges saved payment method automatically
5. Sends receipt emails on success

---

## E-Signature System

### Signature Capture Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     CONTRACT PAGE                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │             Contract HTML with Variables                  │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  Photographer: {{businessName}}                          │ │
│  │  Client: {{clientFirstName}} {{clientLastName}}          │ │
│  │  Event Date: {{eventDate}}                               │ │
│  │  Package: {{packageName}} - ${{totalAmount}}             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐                │
│  │ Photographer     │     │ Client           │                │
│  │ Signature        │     │ Signature        │                │
│  │ ┌──────────────┐ │     │ ┌──────────────┐ │                │
│  │ │  [Signed]    │ │     │ │ Draw here... │ │                │
│  │ └──────────────┘ │     │ └──────────────┘ │                │
│  │ Signed: 12/28/24 │     │                  │                │
│  └──────────────────┘     └──────────────────┘                │
└────────────────────────────────────────────────────────────────┘
```

### Signature Pad Component

Located in `client/src/components/signature-pad.tsx`:

```typescript
interface SignaturePadProps {
  onSave: (dataUrl: string) => void;  // Base64 PNG data URL
  onCancel?: () => void;
  existingSignature?: string;
  label?: string;
}
```

Features:
- HTML5 Canvas-based drawing
- Touch and mouse support
- High-DPI scaling (devicePixelRatio)
- Clear and save functionality
- Outputs PNG data URL

### Legal Audit Trail

When client signs, the system captures:

| Field | Description |
|-------|-------------|
| `clientSignatureUrl` | Base64 PNG of drawn signature |
| `clientSignedAt` | Timestamp of signature |
| `clientSignedIp` | IP address at signature time |
| `clientSignedUserAgent` | Browser/device info |
| `contractSnapshotHtml` | Exact rendered HTML at signature |
| `contractPdfUrl` | Generated PDF for records |

### Photographer Pre-Signing

Before sending, photographers can pre-sign contracts:

1. Click "Sign & Send" on project Smart File card
2. Photographer signature dialog opens
3. Draw signature
4. Signature stored in `photographerSignatureUrl`
5. Smart File becomes sendable

---

## Automation Triggers

Smart Files integrate with the automation system via business event triggers:

### Available Triggers

| Trigger | Fires When |
|---------|------------|
| `SMART_FILE_SENT` | Status changes to SENT |
| `SMART_FILE_ACCEPTED` | Client accepts selections |
| `ANY_PAYMENT_MADE` | Any payment processed |
| `DEPOSIT_PAID` | Deposit payment completed |
| `FULL_PAYMENT_MADE` | Full balance paid |
| `CONTRACT_SIGNED` | Client signs contract |

### Example Automation

**"Move to Booked when deposit paid"**

```json
{
  "name": "Auto-move to Booked stage",
  "triggerType": "ANY_PAYMENT_MADE",
  "stageId": null,
  "steps": [{
    "stepType": "MOVE_STAGE",
    "targetStageId": "booked-retainer-paid-stage-id"
  }]
}
```

### Event Dispatch

In `server/routes.ts`, after status changes:

```typescript
// After payment confirmation
await automationService.handleBusinessEvent({
  type: 'ANY_PAYMENT_MADE',
  projectId: project.id,
  photographerId: photographer.id,
  metadata: { amountCents, paymentType }
});
```

---

## Frontend Components

### Smart File Builder

**Location:** `client/src/pages/smart-file-builder.tsx`

The drag-and-drop editor for creating Smart File templates:

- Page type palette (7 types)
- Reorderable page list
- Page-specific editors for each type
- Live preview panel
- Auto-save functionality

### Public Smart File Viewer

**Location:** `client/src/pages/public-smart-file.tsx`

Client-facing proposal viewer:

- Multi-step navigation
- Package selection with pricing
- Add-on quantity controls
- Contract renderer with signature pad
- Payment schedule selector
- Embedded Stripe payment form
- Scheduling calendar integration

### Supporting Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `SignaturePad` | `components/signature-pad.tsx` | Canvas signature capture |
| `ContractRenderer` | `components/contract-renderer.tsx` | Variable interpolation |
| `EmbeddedPaymentForm` | `components/embedded-payment-form.tsx` | Stripe Elements wrapper |
| `PaymentPlanCard` | `components/payment-plan-card.tsx` | Installment display |
| `PaymentHistory` | `components/payment-history.tsx` | Transaction list |
| `SchedulingCalendar` | `components/scheduling-calendar.tsx` | Booking calendar |

---

## Developer Guide

### Creating a New Smart File

```typescript
// 1. Create template
const smartFile = await storage.createSmartFile({
  photographerId: "...",
  name: "Wedding Collection 2025",
  projectType: "WEDDING",
  defaultDepositPercent: 35
});

// 2. Add pages
await storage.createSmartFilePage({
  smartFileId: smartFile.id,
  pageType: "TEXT",
  pageOrder: 0,
  displayTitle: "Welcome",
  content: { sections: [...] }
});

await storage.createSmartFilePage({
  smartFileId: smartFile.id,
  pageType: "PACKAGE",
  pageOrder: 1,
  displayTitle: "Choose Your Package",
  content: { heading: "...", packageIds: [...] }
});
```

### Sending to Client

```typescript
// 1. Attach to project (creates projectSmartFile)
const projectSmartFile = await storage.attachSmartFileToProject({
  projectId: project.id,
  smartFileId: smartFile.id,
  photographerId: photographer.id,
  clientId: contact.id,
  smartFileName: smartFile.name,
  pagesSnapshot: smartFile.pages,
  token: nanoid(32),
  status: 'DRAFT'
});

// 2. Sign if needed (photographer)
await storage.updateProjectSmartFile(projectSmartFile.id, {
  photographerSignatureUrl: dataUrl,
  photographerSignedAt: new Date()
});

// 3. Send to client
await storage.updateProjectSmartFile(projectSmartFile.id, {
  status: 'SENT',
  sentAt: new Date()
});

// 4. Email client with link
await sendEmail({
  to: contact.email,
  subject: "You have a new proposal",
  html: `<a href="${APP_URL}/smart-file/${projectSmartFile.token}">View Proposal</a>`
});
```

### Processing Payment

```typescript
// Public endpoint: /api/public/smart-files/:token/confirm-payment

// 1. Verify payment with Stripe
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

// 2. Record transaction
await storage.createPaymentTransaction({
  projectSmartFileId: projectSmartFile.id,
  projectId: project.id,
  photographerId: photographer.id,
  clientId: contact.id,
  amountCents: paymentIntent.amount,
  paymentType: "DEPOSIT",
  stripePaymentIntentId: paymentIntentId,
  status: "COMPLETED"
});

// 3. Update Smart File
await storage.updateProjectSmartFile(projectSmartFile.id, {
  amountPaidCents: newTotalPaid,
  balanceDueCents: newBalance,
  status: newBalance === 0 ? "PAID" : "DEPOSIT_PAID"
});

// 4. Fire automation trigger
await automationService.handleBusinessEvent({
  type: 'ANY_PAYMENT_MADE',
  projectId,
  photographerId
});
```

### Adding a New Page Type

1. **Define content type** in `smart-file-builder.tsx`:
```typescript
type NewPageContent = {
  heading: string,
  // ... custom fields
};
```

2. **Add to PAGE_TYPES constant**:
```typescript
NEWTYPE: {
  icon: SomeIcon,
  label: "New Type",
  color: "bg-cyan-500"
}
```

3. **Create editor component**:
```typescript
function NewTypePageEditor({ page, onUpdate }) {
  // Editor UI
}
```

4. **Add to page type switch** in builder and public viewer

5. **Update schema** if needed for typed validation

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Database table definitions |
| `shared/paymentScheduleUtils.ts` | Payment schedule calculations |
| `shared/contractVariables.ts` | Contract variable parsing |
| `server/storage.ts` | Database CRUD operations |
| `server/routes.ts` | API endpoints |
| `server/services/stripe.ts` | Stripe integration |
| `server/services/automation.ts` | Automation triggers |
| `server/utils/pdf-generator.ts` | Contract PDF generation |
| `client/src/pages/smart-file-builder.tsx` | Template editor |
| `client/src/pages/public-smart-file.tsx` | Client viewer |
| `client/src/components/signature-pad.tsx` | Signature capture |
| `client/src/components/contract-renderer.tsx` | Variable interpolation |

---

*Last updated: December 2024*
