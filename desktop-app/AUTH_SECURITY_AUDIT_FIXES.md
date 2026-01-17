# Authentication Security & Code Quality Audit Report

Generated: January 2025

## Executive Summary

Three comprehensive audits (code-review, UI/UX, security) were conducted on thePhotoCrm's login and signup process. This document contains all findings and detailed remediation steps for future implementation.

---

# PART 1: SECURITY AUDIT FINDINGS

## CRITICAL Vulnerabilities

### 1. Cookie Security: Missing `secure` Flag Enforcement
**File**: `/home/runner/workspace/server/cookie-auth.ts:14`
**Severity**: CRITICAL

**Current Code**:
```typescript
secure: process.env.NODE_ENV === 'production',
```

**Issue**: The `secure` flag is only set when `NODE_ENV === 'production'`. However, the app is deployed on Replit/Railway which may not set this environment variable correctly. If `NODE_ENV` is undefined or set to anything other than 'production', authentication cookies will be transmitted over HTTP, exposing JWT tokens to man-in-the-middle attacks.

**Attack Scenario**:
1. Attacker intercepts HTTP traffic on public WiFi
2. Steals photographer's JWT token from unencrypted cookie
3. Uses token to impersonate photographer and access all client data

**Fix**:
```typescript
// Change line 14 from:
secure: process.env.NODE_ENV === 'production',

// To:
secure: true, // Always secure - we only run on HTTPS in all environments
```

---

### 2. Password Policy: No Validation on Registration
**File**: `/home/runner/workspace/server/routes.ts` (registration endpoint ~line 1379)
**Severity**: CRITICAL

**Issue**: The registration endpoint accepts ANY password length. Password reset validates minimum 6 characters at line 2448, but registration has NO validation. Users can set passwords like `1`, `a`, or empty strings.

**Attack Scenario**:
1. Attacker brute-forces weak passwords
2. Gains access to photographer account with full multi-tenant data access
3. Accesses all client projects, payment info, contracts, and galleries

**Fix** - Add after email normalization in registration endpoint:
```typescript
// Validate password
if (!password || password.length < 8) {
  return res.status(400).json({ message: "Password must be at least 8 characters long" });
}

// Optional: Add complexity requirements
const hasUppercase = /[A-Z]/.test(password);
const hasLowercase = /[a-z]/.test(password);
const hasNumber = /[0-9]/.test(password);

if (!hasUppercase || !hasLowercase || !hasNumber) {
  return res.status(400).json({
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  });
}
```

---

### 3. No Email Format Validation on Registration
**File**: `/home/runner/workspace/server/routes.ts` (registration endpoint)
**Severity**: CRITICAL

**Issue**: The registration endpoint at line 1379 directly uses `email.toLowerCase().trim()` without validating it's a properly formatted email. Compare to magic link endpoint which uses Zod validation.

**Fix** - Add email validation:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email.trim())) {
  return res.status(400).json({ message: "Please provide a valid email address" });
}

const normalizedEmail = email.toLowerCase().trim();
```

---

### 4. Registration Endpoint Lacks Rate Limiting
**File**: `/home/runner/workspace/server/routes.ts`
**Severity**: CRITICAL

**Issue**: `/api/auth/register` has no rate limiting, unlike login (lines 1536-1568) and magic link (1979-1995). An attacker could spam account creation attempts.

**Fix** - Add at top of file with other rate limit maps:
```typescript
// Registration rate limiting (add near line 55 with other Maps)
const registrationRateLimit = new Map<string, { count: number; resetTime: number }>();
const REGISTRATION_RATE_LIMIT_MAX = 5; // 5 registrations per 15 minutes per IP
const REGISTRATION_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
```

**Fix** - Add to registration endpoint (at beginning of handler):
```typescript
// Rate limiting for registration
const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
const ipKey = `reg_${clientIp}`;
const now = Date.now();
const ipRateData = registrationRateLimit.get(ipKey);

if (ipRateData && now < ipRateData.resetTime) {
  if (ipRateData.count >= REGISTRATION_RATE_LIMIT_MAX) {
    console.log(`🚫 Registration rate limit exceeded for IP: ${clientIp}`);
    return res.status(429).json({
      message: "Too many registration attempts. Please try again in 15 minutes."
    });
  }
  registrationRateLimit.set(ipKey, { count: ipRateData.count + 1, resetTime: ipRateData.resetTime });
} else {
  registrationRateLimit.set(ipKey, { count: 1, resetTime: now + REGISTRATION_RATE_LIMIT_WINDOW });
}
```

---

### 5. Magic Link Tokens Can Be Reused
**File**: `/home/runner/workspace/server/storage.ts` (validatePortalToken method)
**Severity**: CRITICAL

**Issue**: Magic link tokens can be reused unlimited times until expiration (30 minutes). If a client forwards their login link email, recipient can access their account multiple times.

**Schema Change Required** - Add `used` column to portalTokens:
```typescript
// In shared/schema.ts, add to portalTokens table:
used: boolean('used').default(false).notNull(),
```

**Migration**:
```sql
ALTER TABLE portal_tokens ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false NOT NULL;
```

**Fix** - Update validatePortalToken in storage.ts:
```typescript
async validateAndConsumePortalToken(tokenString: string): Promise<PortalToken | undefined> {
  // Find valid, unused token
  const [token] = await db.select().from(portalTokens)
    .where(and(
      eq(portalTokens.token, tokenString),
      gte(portalTokens.expiresAt, new Date()),
      eq(portalTokens.used, false)
    ))
    .limit(1);

  if (token) {
    // Mark as used immediately (atomic operation)
    await db.update(portalTokens)
      .set({ used: true })
      .where(eq(portalTokens.id, token.id));
  }

  return token;
}
```

**Fix** - Update routes.ts to use new method:
```typescript
// Change validatePortalToken calls to validateAndConsumePortalToken
const token = await storage.validateAndConsumePortalToken(tokenString);
```

---

### 6. OAuth State Validation Explicitly Disabled
**File**: `/home/runner/workspace/server/services/googleAuth.ts:65-69`
**Severity**: CRITICAL

**Current Code**:
```typescript
const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
  pkce: false,
  expectedNonce: undefined,
  expectedState: undefined,  // ← STATE VALIDATION DISABLED
});
```

**Issue**: While state validation exists in routes.ts (lines 1691-1696), the `exchangeCodeForClaims` function explicitly disables state validation in the OAuth library.

**Attack Scenario**:
1. Attacker initiates OAuth flow, captures authorization code
2. Tricks victim into visiting malicious link with attacker's code
3. Code is exchanged for victim's Google account access token
4. Attacker creates photographer account under victim's email

**Fix**:
```typescript
// Remove expectedState: undefined to use library default validation
const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
  pkce: false,
  expectedNonce: undefined,
  // Let library validate state automatically
});
```

---

## HIGH Severity Issues

### 7. Account Enumeration via Registration Response
**File**: `/home/runner/workspace/server/routes.ts:1390-1391`
**Severity**: HIGH

**Current Code**:
```typescript
if (existingUser) {
  return res.status(400).json({ message: "User already exists" });
}
```

**Issue**: This directly confirms whether an email is registered, allowing attackers to enumerate valid accounts.

**Attack Scenario**:
1. Attacker automates account enumeration via `/api/auth/register`
2. Builds list of valid photographer emails
3. Launches targeted phishing attacks with credible context

**Fix Option 1** - Generic response (simple):
```typescript
if (existingUser) {
  // Return generic message - don't reveal if email exists
  // Add small delay to match timing of successful registration
  await new Promise(resolve => setTimeout(resolve, 500));
  return res.status(200).json({
    message: "If this email is available, check your inbox for next steps.",
    requiresVerification: true
  });
}
```

**Fix Option 2** - Send email to existing user (better UX):
```typescript
if (existingUser) {
  // Send email to existing user warning them
  await sendEmail({
    to: existingUser.email,
    subject: "Registration Attempt - thePhotoCrm",
    body: `Someone tried to create an account using your email address. If this was you, you can login at ${loginUrl}. If not, you can safely ignore this email.`
  });

  // Return same response as new registration
  return res.status(200).json({
    message: "Check your email for next steps.",
    requiresVerification: true
  });
}
```

---

### 8. Branding Mismatch in Password Reset Email
**File**: `/home/runner/workspace/server/routes.ts:2378`
**Severity**: HIGH

**Current Code**:
```typescript
subject: 'Password Reset Request - Lazy Photog'
```

**Issue**: Email subject says "Lazy Photog" but the product is "thePhotoCrm". This creates confusion and looks unprofessional.

**Fix**:
```typescript
subject: 'Password Reset Request - thePhotoCrm'
```

Also check the email body for any other "Lazy Photog" references.

---

### 9. Debug Logging in Production
**File**: `/home/runner/workspace/server/middleware/auth.ts:15-27`
**Severity**: HIGH

**Issue**: Auth middleware logs all cookies, headers, and origins regardless of environment. This exposes sensitive data in production logs.

**Current Code** (approximate):
```typescript
console.log('🍪 Auth Debug - Cookies:', req.cookies);
console.log('🔑 Auth Debug - Headers:', req.headers.authorization);
console.log('🌐 Auth Debug - Origin:', req.headers.origin);
```

**Fix** - Wrap in environment check:
```typescript
const DEBUG_AUTH = process.env.NODE_ENV !== 'production' && process.env.DEBUG_AUTH === 'true';

if (DEBUG_AUTH) {
  console.log('🍪 Auth Debug - Cookies:', Object.keys(req.cookies || {}));
  console.log('🔑 Auth Debug - Has Auth Header:', !!req.headers.authorization);
  console.log('🌐 Auth Debug - Origin:', req.headers.origin);
}
```

---

### 10. Password Reset Link Uses Wrong Domain
**File**: `/home/runner/workspace/server/routes.ts:2369`
**Severity**: HIGH

**Current Code**:
```typescript
const resetLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
```

**Issue**: Uses REPLIT_DOMAINS which may not be correct for production (Railway deployment).

**Fix**:
```typescript
// Use APP_URL if available, fallback to REPLIT_DOMAINS
const baseUrl = process.env.APP_URL ||
                process.env.REPLIT_DOMAINS?.split(',')[0] ||
                'https://app.thephotocrm.com';
const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
```

---

### 11. Google OAuth Creates Accounts Without Stripe Subscription
**File**: `/home/runner/workspace/server/routes.ts:1770-1780`
**Severity**: HIGH

**Issue**: When `BETA_MODE` is not enabled, Google OAuth creates photographers without `stripeCustomerId` or `subscriptionId`, unlike the regular registration flow which creates Stripe subscription first (lines 1419-1476).

**Fix** - Add Stripe subscription creation for OAuth users:
```typescript
// After creating user via OAuth, create Stripe subscription if not in beta mode
if (!isBetaMode && role === 'PHOTOGRAPHER') {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email: normalizedEmail,
    name: businessName,
    metadata: { userId: newUser.id }
  });

  // Create subscription with trial
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID }],
    trial_period_days: 14,
  });

  // Update user with Stripe IDs
  await storage.updatePhotographer(newUser.id, {
    stripeCustomerId: customer.id,
    subscriptionId: subscription.id,
    subscriptionStatus: 'trialing'
  });
}
```

---

### 12. In-Memory Rate Limiting Won't Scale
**File**: `/home/runner/workspace/server/routes.ts:55`
**Severity**: HIGH (Scalability)

**Issue**: Both `loginRateLimit` and `magicLinkRateLimit` are in-memory Maps. These won't work in multi-instance deployments and reset on server restart.

**Current Code**:
```typescript
const loginRateLimit = new Map<string, { count: number; resetTime: number }>();
const magicLinkRateLimit = new Map<string, { count: number; resetTime: number }>();
```

**Long-term Fix** - Use Redis:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(key: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  return current <= maxAttempts;
}

// Usage in login endpoint:
const allowed = await checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000);
if (!allowed) {
  return res.status(429).json({ message: "Too many login attempts" });
}
```

---

### 13. No Session Invalidation on Logout
**File**: `/home/runner/workspace/server/routes.ts:1628-1631`
**Severity**: MEDIUM

**Current Code**:
```typescript
app.post("/api/auth/logout", (req, res) => {
  clearAuthCookies(res, req);
  res.json({ message: "Logged out successfully" });
});
```

**Issue**: Logout only clears cookies client-side. The JWT remains valid until expiration (7 days). If an attacker stole the token before logout, they maintain access.

**Fix** - Implement token blacklist with Redis:
```typescript
// Add token to blacklist on logout
app.post("/api/auth/logout", async (req, res) => {
  const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { exp: number };
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(`blacklist:${token}`, ttl, '1');
      }
    } catch (e) {
      // Token already invalid, ignore
    }
  }

  clearAuthCookies(res, req);
  res.json({ message: "Logged out successfully" });
});

// Add to auth middleware:
const isBlacklisted = await redis.get(`blacklist:${token}`);
if (isBlacklisted) {
  return res.status(401).json({ message: "Session has been logged out" });
}
```

---

### 14. No Password Change Notification
**File**: `/home/runner/workspace/server/routes.ts:2473`
**Severity**: MEDIUM

**Issue**: When password is changed via reset, no email notification is sent to the user. If account was compromised, user won't know.

**Fix** - Add notification email:
```typescript
// After successful password reset:
await sendEmail({
  to: user.email,
  subject: 'Your password was changed - thePhotoCrm',
  body: `Your thePhotoCrm password was just changed. If you did this, you can ignore this email. If you didn't change your password, please contact support immediately at support@thephotocrm.com.`
});
```

---

### 15. JWT Algorithm Not Explicitly Specified
**File**: `/home/runner/workspace/server/services/auth.ts:29, 34`
**Severity**: MEDIUM

**Current Code**:
```typescript
return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
return jwt.verify(token, JWT_SECRET) as JwtPayload;
```

**Issue**: JWT library defaults to HS256, but algorithm is not explicitly specified. Could be vulnerable to algorithm confusion attacks.

**Fix**:
```typescript
// Sign with explicit algorithm
return jwt.sign(payload, JWT_SECRET, {
  expiresIn: '7d',
  algorithm: 'HS256'
});

// Verify with explicit algorithm
return jwt.verify(token, JWT_SECRET, {
  algorithms: ['HS256']
}) as JwtPayload;
```

---

# PART 2: CODE REVIEW FINDINGS

## Strengths Identified

- Multi-tenant isolation enforced correctly
- Dual rate limiting on login (email + IP based)
- CSRF protection on OAuth flow
- Magic link anti-enumeration (returns success for non-existent emails)
- Password reset anti-enumeration
- Secure token generation using `crypto.randomBytes(32)`
- OAuth account linking requires password confirmation
- Role-based lookup prevents cross-role access
- HttpOnly cookies with secure flag (when NODE_ENV is production)

## Additional Code Quality Issues

### 16. No Account Lockout After Rate Limit
**Issue**: Rate limiting returns 429 but doesn't persist lockout state. If server restarts, the in-memory Map is cleared.

**Fix**: Track failed attempts in database and lock account after N failures.

### 17. Sequential Database Inserts for Availability Templates
**File**: `/home/runner/workspace/server/routes.ts:1492-1497`
**Issue**: 7 database inserts done sequentially in a loop.

**Fix**: Use batch insert:
```typescript
const templates = Array.from({ length: 7 }, (_, i) => ({
  photographerId: newUser.id,
  dayOfWeek: i,
  startTime: '09:00',
  endTime: '17:00',
  isAvailable: i !== 0 && i !== 6
}));

await db.insert(availabilityTemplates).values(templates);
```

### 18. Linking Request Table Never Cleaned Up
**Issue**: `createLinkingRequest` creates records that are marked as used but never deleted. Table will grow unbounded.

**Fix**: Add cleanup job or delete after use.

---

# PART 3: UI/UX AUDIT FINDINGS

## What Works Well

- Dual-context design system (photographer CRM vs client portal)
- Password visibility toggle with Eye/EyeOff icons
- Split-screen desktop layout with photography imagery
- Magic link flow for clients (passwordless)
- Loading states with button text changes
- Forgot password flow complete with success states
- Google OAuth placement below primary auth
- Responsive approach with mobile/desktop implementations
- Extensive data-testid attributes for testing

## Usability Issues to Fix

### 19. No Inline Validation Feedback
**Files**: `login.tsx`, `register.tsx`
**Issue**: Email and password fields provide no real-time validation. Users only discover errors after submission.

**Fix**:
```tsx
const [emailError, setEmailError] = useState<string | null>(null);

const validateEmail = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!value) {
    setEmailError('Email is required');
  } else if (!emailRegex.test(value)) {
    setEmailError('Please enter a valid email address');
  } else {
    setEmailError(null);
  }
};

<Input
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    validateEmail(e.target.value);
  }}
  className={emailError ? 'border-red-500' : ''}
/>
{emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
```

### 20. No Password Strength Indicator
**File**: `register.tsx`
**Issue**: No visual feedback on password quality during registration.

**Fix** - Add strength indicator component:
```tsx
const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return { label: 'Weak', color: 'bg-red-500' };
  if (strength <= 4) return { label: 'Fair', color: 'bg-yellow-500' };
  return { label: 'Strong', color: 'bg-green-500' };
};

// In JSX:
<div className="mt-2">
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`h-1 flex-1 rounded ${
          i <= strengthLevel ? strength.color : 'bg-gray-200'
        }`}
      />
    ))}
  </div>
  <p className="text-sm text-gray-600 mt-1">{strength.label}</p>
</div>
```

### 21. Magic Link Modal Requires Extra Click
**Issue**: Client portal users must click button to open modal, then re-enter email.

**Fix**: Pre-populate modal email field from main form, or make magic link the primary CTA with password as secondary option.

### 22. No "Remember Me" Option
**File**: `login.tsx`
**Issue**: Photographers logging into CRM daily would benefit from persistent sessions.

**Fix**:
```tsx
const [rememberMe, setRememberMe] = useState(false);

// In form:
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
  />
  <span className="text-sm">Remember me for 30 days</span>
</label>

// In login request:
const response = await loginMutation.mutateAsync({
  email,
  password,
  rememberMe
});

// In backend, adjust token expiry:
const expiresIn = rememberMe ? '30d' : '7d';
const token = jwt.sign(payload, JWT_SECRET, { expiresIn, algorithm: 'HS256' });
```

## Visual/Aesthetic Issues

### 23. Inconsistent Border Radius
**Issue**: Login uses rounded-2xl, Register uses rounded-xl, Client portal uses rounded-lg.

**Fix**: Standardize on one radius across all auth pages (recommend `rounded-xl`).

### 24. Generic Gradient Button
**Issue**: RGB gradient button feels like generic SaaS, not photography-specific.

**Fix**: Use brand colors or photography-appropriate palette (deep blacks, warm golds, refined neutrals).

### 25. Weak Typography Hierarchy
**Issue**: "Welcome back" heading and subheading have minimal size differentiation.

**Fix**: Increase size difference (h1 at 2.5rem, subtitle at 1rem).

---

# PART 4: IMPLEMENTATION CHECKLIST

## Immediate (Critical Security)
- [ ] Force `secure: true` on cookies unconditionally
- [ ] Add password validation on registration (min 8 chars)
- [ ] Add email format validation on registration
- [ ] Add rate limiting to registration endpoint
- [ ] Make magic link tokens single-use
- [ ] Enable OAuth state validation

## High Priority
- [ ] Fix branding in password reset email
- [ ] Prevent account enumeration on registration
- [ ] Disable debug logging in production
- [ ] Fix password reset link domain
- [ ] Fix Google OAuth Stripe subscription creation

## Medium Priority
- [ ] Add inline form validation
- [ ] Add password strength indicator
- [ ] Add "Remember Me" option
- [ ] Implement Redis-based rate limiting
- [ ] Add JWT blacklist for logout
- [ ] Add password change notification

## Low Priority (Polish)
- [ ] Standardize border radius
- [ ] Improve typography hierarchy
- [ ] Remove decorative input icons
- [ ] Add loading skeletons
- [ ] Pre-populate magic link email

---

# APPENDIX: Environment Variables Needed

```bash
# Required for security fixes
APP_URL=https://app.thephotocrm.com
NODE_ENV=production

# Optional for enhanced security
REDIS_URL=redis://...  # For distributed rate limiting
DEBUG_AUTH=false       # Disable auth debug logging
```

---

*This document was generated from automated security, code quality, and UI/UX audits. Review each fix carefully before implementing.*
