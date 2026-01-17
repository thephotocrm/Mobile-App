# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

thePhotoCrm is a comprehensive multi-tenant CRM system for wedding photographers featuring:
- **Triple-domain architecture**: `app.thephotocrm.com` (photographer CRM), `{slug}.tpcportal.co` (client portals), `thephotocrm.com` (marketing)
- **Tech stack**: React + Vite + Wouter frontend, Express + Drizzle ORM backend, PostgreSQL database
- **Key features**: Smart Files (proposals/invoices/contracts), automation system, drip campaigns, two-way SMS/email messaging, native photo galleries, Stripe Connect payments

## Common Commands

### Development
```bash
npm run dev          # Start development server (frontend + backend)
npm run check        # TypeScript type checking
```

### Build & Deploy
```bash
npm run build        # Build frontend (Vite) and backend (esbuild)
npm start            # Run production server
```

### Database Management
```bash
npm run db:generate  # Generate Drizzle migration files from schema changes
npm run db:push      # Push schema changes directly to database (dev only)
npm run db:migrate   # Run migrations (production)
```

## High-Level Architecture

### Multi-Tenant Data Isolation
- Every database query MUST be scoped by `photographerId`
- Photographer tenants have complete data isolation from each other
- CLIENT role users belong to a photographer and can only access their own projects/data
- Domain-based routing determines tenant context (subdomains for web, headers for mobile)

### Domain Routing System
**Critical middleware**: `server/middleware/domain-routing.ts`
- Web requests: Tenant derived from subdomain (`Host` header)
- Mobile apps: Tenant derived from custom headers (`x-photographer-id`, `x-user-role`)
- Sets `req.domain.photographerId` for downstream middleware to enforce tenant boundaries

**Pattern for all API routes**:
```typescript
// Always get photographerId from user, not from request body
const photographerId = req.user!.photographerId;
// Never trust client-provided photographerId in request body
```

### Drizzle ORM Critical Pattern
**NEVER use nested objects in `.select()` with `leftJoin`**. When the join returns null, nested objects cause "Cannot convert undefined or null to object" errors.

**Wrong**:
```typescript
.leftJoin(contacts, eq(projects.clientId, contacts.id))
.select({
  projectData: { id: projects.id, title: projects.title },
  clientData: { id: contacts.id, name: contacts.firstName } // ERROR when contacts is null
})
```

**Correct**:
```typescript
.leftJoin(contacts, eq(projects.clientId, contacts.id))
.select({
  // Flatten all columns
  projectId: projects.id,
  projectTitle: projects.title,
  clientId: contacts.id,
  clientFirstName: contacts.firstName
})
// Then reconstruct in JavaScript
.then(rows => rows.map(row => ({
  project: { id: row.projectId, title: row.projectTitle },
  client: row.clientId ? { id: row.clientId, name: row.clientFirstName } : null
})))
```

All queries in `server/storage.ts` follow this pattern.

### Authentication
- **JWT-based**: Tokens stored in httpOnly cookies for web, returned in JSON for mobile
- **Three roles**: PHOTOGRAPHER (full CRM access), CLIENT (portal only), ADMIN (platform admin)
- **Google OAuth**: Available for photographers only
- **Magic links**: Passwordless authentication for clients via email/SMS

**Auth middleware**: `server/middleware/auth.ts`
- Checks Bearer tokens (mobile) or cookies (web)
- Sets `req.user` with `userId`, `role`, `photographerId`
- Use `requirePhotographer` or `requireClient` guards in routes

### Smart Files System
**Template → Instance model**: Photographers create reusable templates, then attach instances to specific projects for clients.

**7 Page Types**: TEXT, PACKAGE, ADDON, CONTRACT, PAYMENT, FORM, SCHEDULING

**Status lifecycle**: DRAFT → SENT → VIEWED → ACCEPTED → DEPOSIT_PAID → PAID

**Key files**:
- `client/src/pages/smart-file-builder.tsx` - Template editor
- `client/src/pages/public-smart-file.tsx` - Client-facing viewer
- `shared/paymentScheduleUtils.ts` - Payment schedule calculations
- `shared/contractVariables.ts` - Contract variable interpolation

**Payment schedules**: Supports SIMPLE (deposit + balance), CLIENT_CHOICE (client picks 2-6 installments), CUSTOM (photographer-defined)

**Critical**: Smart Files snapshot all pages at send time - subsequent template edits don't affect sent proposals.

### Automation System
**Event-driven architecture**: Stage-based triggers + business event triggers

**Trigger types**:
- Stage-based: Fire when project enters a specific pipeline stage
- Business events: ANY_PAYMENT_MADE, DEPOSIT_PAID, CONTRACT_SIGNED, SMART_FILE_SENT, etc.
- Booking-relative: Fire before/after scheduled bookings using negative/positive delay minutes

**Key service**: `server/services/automation.ts`
- `handleBusinessEvent()` - Dispatch business events
- `handleStageChange()` - Process stage-based automations
- Booking lifecycle handlers auto-cancel/reschedule pending automations

**Templates**: `server/services/automationTemplates.ts` provides pre-configured automation sequences for each pipeline stage.

### Simplified Pipeline Stages
New photographers get a streamlined 5-stage default pipeline:
1. New Inquiry
2. Consultation / Discovery
3. Proposal Sent
4. Booked / Paid
5. Completed

Default stages auto-populate when creating new project types. Pipeline is managed per `projectType` (WEDDING, ENGAGEMENT, etc.).

### Email & SMS Messaging
**Two-way communication**:
- SMS via Twilio (MMS support with Cloudinary for images)
- Email via Gmail API with reply capture (push notifications + HMAC signature verification)
- Gmail watch renewal via daily cron job

**Client portal messaging**: HoneyBook-style inline composer with automatic threading. Clients can reply via email and responses appear in project activity feed.

**Key files**:
- `server/services/email.ts` - Email sending
- `server/services/sms.ts` - SMS/MMS messaging
- `server/services/gmail-watch.ts` - Gmail push notification setup

### Stripe Payment Processing
**Stripe Connect** for split payments:
- Photographers onboard via Connect flow
- Platform fee configurable per transaction
- Supports saved payment methods (cards on file) with autopay
- Payment schedules: HoneyBook-style CLIENT_CHOICE mode allows clients to select 2-6+ installments

**Autopay system**: Cron job checks due installments daily and charges saved payment methods automatically.

### Gallery System
**Native photo gallery platform** using Cloudinary CDN:
- Chunked/resumable uploads via TUS protocol (`@tus/server`, `@tus/file-store`)
- Watermarks, privacy settings, client favorites
- Download capabilities with expiration

**Upload endpoint**: `/api/tus-uploads/*` handles resumable uploads

### Beta Mode
Set `BETA_MODE=true` in environment to enable pre-launch testing:
- New signups skip Stripe subscription creation
- Beta users get `subscriptionStatus: 'unlimited'` and `galleryPlanId: 'beta_unlimited'`
- Set to `false` or remove variable to return to paid subscription flow

## Important File Locations

### Backend Core
- `server/index.ts` - Express app entry point
- `server/routes.ts` - All API endpoints (718KB - largest file)
- `server/storage.ts` - Database CRUD operations (197KB)
- `server/middleware/auth.ts` - Authentication middleware
- `server/middleware/domain-routing.ts` - Multi-tenant routing
- `server/jobs/cron.ts` - Scheduled tasks (automations, Gmail watch renewal, autopay)

### Database
- `shared/schema.ts` - Drizzle table definitions
- `drizzle.config.ts` - Drizzle Kit configuration
- `migrations/` - Database migration files

### Frontend Core
- `client/src/App.tsx` - Root component with Wouter routing
- `client/src/main.tsx` - React entry point
- `client/src/pages/` - 40+ page components
- `client/src/components/` - Shared UI components (Shadcn/ui + custom)

### Shared Code
- `shared/schema.ts` - Database schema types
- `shared/paymentScheduleUtils.ts` - Payment schedule logic
- `shared/contractVariables.ts` - Contract variable parsing
- `shared/email-branding-shared.ts` - Email template utilities
- `shared/template-utils.ts` - Template variable substitution

### Configuration
- `vite.config.ts` - Frontend build config (path aliases: `@/` → client/src, `@shared/` → shared)
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS config
- `components.json` - Shadcn/ui component settings

## Path Aliases
```typescript
"@/*"       → "client/src/*"
"@shared/*" → "shared/*"
"@assets/*" → "attached_assets/*"
```

## Key External Services

**Required integrations**:
- **Neon Database**: PostgreSQL hosting
- **Stripe**: Payment processing + Connect for photographers
- **Gmail API**: Email sending + reply capture (OAuth required)
- **Twilio**: SMS/MMS messaging
- **Cloudinary**: CDN for images (MMS, galleries, logos)

**Deployment**:
- **Replit**: Development environment
- **Railway**: Production deployment with wildcard SSL for client portal subdomains

## Environment Variables

**Critical environment variables** (see `.env` file):
- `DATABASE_URL` - Neon PostgreSQL connection
- `JWT_SECRET` - Token signing
- `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_CLIENT_ID` - Payments
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Images
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth + Gmail API
- `SENDGRID_API_KEY` - Email sending (fallback)
- `BETA_MODE` - Enable/disable beta testing mode

## Additional Documentation

**Detailed system docs**:
- `SMART_FILES_README.md` - Complete Smart Files architecture (835 lines)
- `MOBILE_API_DOCUMENTATION.md` - Mobile app API guide (2594 lines)
- `BACKFILL_INSTRUCTIONS.md` - Client user data backfill process
- `replit.md` - Comprehensive system overview (68 lines)

## Development Notes

### When Adding New Features
1. **Multi-tenant first**: Always scope queries by `photographerId`
2. **Role-based access**: Check user role before allowing operations
3. **Follow existing patterns**: Look at similar features before implementing
4. **Database changes**: Update `shared/schema.ts`, run `npm run db:generate`, then `npm run db:push`

### When Debugging
- **Check domain routing**: Verify `req.domain.photographerId` is set correctly
- **Verify tenant scope**: Ensure queries filter by `photographerId`
- **Review auth middleware**: Confirm `req.user` has correct role and photographerId
- **Drizzle queries**: Use flat `.select()` with leftJoin (never nested objects)

### TypeScript Patterns
- Use Drizzle's generated types: `InsertUser`, `SelectUser`, etc.
- Shared types in `shared/schema.ts` are imported across frontend and backend
- Zod schemas for validation: `createInsertSchema()` from `drizzle-zod`

### UI Components
- **Shadcn/ui**: Radix UI primitives + Tailwind styling in `client/src/components/`
- **Icons**: `lucide-react` icon library
- **Forms**: `react-hook-form` + `zod` validation
- **Rich text**: TipTap editor for email templates and documents
- **Drag & drop**: `@dnd-kit/core` for Smart Files page builder

### Code Organization
- **Backend**: Express routes → Storage layer → Database
- **Frontend**: Pages → Components → Hooks → API calls via fetch
- **Shared**: Types and utilities used by both frontend and backend
- **No Redux**: Using React Query (`@tanstack/react-query`) for server state
