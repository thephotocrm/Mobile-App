# Account Deletion API Specification

## Overview

This document specifies the backend API endpoint for complete account deletion in thePhotoCRM application. This endpoint allows users to permanently delete their account and all associated data in compliance with privacy regulations (GDPR, CCPA, Apple App Store Guidelines 5.1.1).

---

## Endpoint Details

### DELETE /api/auth/delete-account

Permanently deletes the authenticated user's account and all associated data.

**Authentication Required:** Yes (Bearer token)

---

## Request

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
x-photographer-id: <photographer_id>
x-user-role: <user_role>
```

### Request Body

```json
{
  "confirmation": "DELETE MY ACCOUNT",
  "password": "user_current_password",
  "reason": "optional_deletion_reason"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `confirmation` | string | Yes | Must be exactly "DELETE MY ACCOUNT" |
| `password` | string | Yes | User's current password for verification |
| `reason` | string | No | Optional reason for deletion (for analytics) |

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Account deletion initiated successfully",
  "deletion_id": "del_abc123xyz",
  "estimated_completion": "2024-01-20T12:00:00Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid Confirmation
```json
{
  "success": false,
  "error": "INVALID_CONFIRMATION",
  "message": "Confirmation text must be exactly 'DELETE MY ACCOUNT'"
}
```

#### 401 Unauthorized - Invalid Password
```json
{
  "success": false,
  "error": "INVALID_PASSWORD",
  "message": "Password verification failed"
}
```

#### 401 Unauthorized - Invalid/Expired Token
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired authentication token"
}
```

#### 429 Too Many Requests
```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many deletion attempts. Please try again later.",
  "retry_after": 3600
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "DELETION_FAILED",
  "message": "Account deletion failed. Please contact support.",
  "reference_id": "err_abc123"
}
```

---

## Data Deletion Requirements

### Database Tables to Delete/Update

The following tables must be processed in the specified order to maintain referential integrity:

#### Phase 1: User-Generated Content

| Table | Action | Notes |
|-------|--------|-------|
| `user_photos` | DELETE | All uploaded photos |
| `user_documents` | DELETE | Contracts, invoices, etc. |
| `project_notes` | DELETE | Notes on projects |
| `messages` | DELETE | All sent/received messages |
| `notifications` | DELETE | All notifications |
| `activity_logs` | DELETE | User activity history |

#### Phase 2: Business Data

| Table | Action | Notes |
|-------|--------|-------|
| `invoices` | ANONYMIZE | Keep for financial records, remove PII |
| `payments` | ANONYMIZE | Keep transaction records, remove PII |
| `projects` | DELETE | All photography projects |
| `clients` | DELETE | Client contact information |
| `contracts` | DELETE | Contract templates and signed contracts |
| `questionnaires` | DELETE | Client questionnaire responses |

#### Phase 3: User Configuration

| Table | Action | Notes |
|-------|--------|-------|
| `user_preferences` | DELETE | App settings |
| `user_templates` | DELETE | Email/contract templates |
| `user_packages` | DELETE | Service packages |
| `user_integrations` | DELETE | Third-party integrations |

#### Phase 4: Authentication & Identity

| Table | Action | Notes |
|-------|--------|-------|
| `refresh_tokens` | DELETE | All active sessions |
| `password_reset_tokens` | DELETE | Pending reset tokens |
| `email_verification_tokens` | DELETE | Pending verifications |
| `users` | DELETE | Core user record |

### Anonymization Strategy

For records that must be retained (financial/legal compliance):

```sql
UPDATE invoices
SET
  user_email = 'deleted_user@anonymized.local',
  user_name = 'Deleted User',
  user_phone = NULL,
  user_address = NULL,
  deleted_at = NOW(),
  original_user_id = NULL
WHERE user_id = <user_id>;
```

---

## External Service Cleanup

### Stripe

```javascript
// Cancel all active subscriptions
await stripe.subscriptions.cancel(subscription_id);

// Delete customer (removes payment methods, invoices accessible for 30 days)
await stripe.customers.del(stripe_customer_id);
```

### AWS S3 (Photo Storage)

```javascript
// Delete all objects in user's folder
const objects = await s3.listObjectsV2({
  Bucket: 'photocrm-uploads',
  Prefix: `users/${user_id}/`
}).promise();

await s3.deleteObjects({
  Bucket: 'photocrm-uploads',
  Delete: { Objects: objects.Contents.map(o => ({ Key: o.Key })) }
}).promise();
```

### SendGrid / Email Service

```javascript
// Remove from all marketing lists
await sendgrid.request({
  method: 'DELETE',
  url: `/v3/marketing/contacts?ids=${contact_id}`
});
```

### Firebase / Push Notifications

```javascript
// Remove all device tokens
await admin.messaging().unsubscribeFromTopic(device_tokens, 'all-users');
// Delete user from Firebase Auth if applicable
await admin.auth().deleteUser(firebase_uid);
```

---

## Implementation Pseudocode

```javascript
async function deleteAccount(req, res) {
  const { confirmation, password, reason } = req.body;
  const userId = req.user.id;

  // Step 1: Validate confirmation text
  if (confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_CONFIRMATION',
      message: "Confirmation text must be exactly 'DELETE MY ACCOUNT'"
    });
  }

  // Step 2: Verify password
  const user = await User.findById(userId);
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    await logSecurityEvent('FAILED_DELETION_ATTEMPT', userId);
    return res.status(401).json({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Password verification failed'
    });
  }

  // Step 3: Create deletion job record
  const deletionId = generateDeletionId();
  await DeletionJob.create({
    id: deletionId,
    user_id: userId,
    status: 'pending',
    reason: reason || null,
    created_at: new Date()
  });

  // Step 4: Begin database transaction
  const transaction = await db.beginTransaction();

  try {
    // Phase 1: Delete user-generated content
    await deleteUserPhotos(userId, transaction);
    await deleteUserDocuments(userId, transaction);
    await deleteProjectNotes(userId, transaction);
    await deleteMessages(userId, transaction);
    await deleteNotifications(userId, transaction);
    await deleteActivityLogs(userId, transaction);

    // Phase 2: Handle business data
    await anonymizeInvoices(userId, transaction);
    await anonymizePayments(userId, transaction);
    await deleteProjects(userId, transaction);
    await deleteClients(userId, transaction);
    await deleteContracts(userId, transaction);
    await deleteQuestionnaires(userId, transaction);

    // Phase 3: Delete user configuration
    await deleteUserPreferences(userId, transaction);
    await deleteUserTemplates(userId, transaction);
    await deleteUserPackages(userId, transaction);
    await deleteUserIntegrations(userId, transaction);

    // Phase 4: Delete authentication data
    await deleteRefreshTokens(userId, transaction);
    await deletePasswordResetTokens(userId, transaction);
    await deleteEmailVerificationTokens(userId, transaction);
    await deleteUser(userId, transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    await DeletionJob.update(deletionId, { status: 'failed', error: error.message });

    return res.status(500).json({
      success: false,
      error: 'DELETION_FAILED',
      message: 'Account deletion failed. Please contact support.',
      reference_id: deletionId
    });
  }

  // Step 5: Queue external service cleanup (async)
  await queue.add('cleanup-external-services', {
    deletion_id: deletionId,
    user_id: userId,
    stripe_customer_id: user.stripe_customer_id,
    s3_prefix: `users/${userId}/`
  });

  // Step 6: Update deletion job status
  await DeletionJob.update(deletionId, { status: 'completed' });

  // Step 7: Send confirmation email (to email on file, one-time)
  await sendDeletionConfirmationEmail(user.email);

  return res.status(200).json({
    success: true,
    message: 'Account deletion initiated successfully',
    deletion_id: deletionId,
    estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
}
```

---

## Testing Checklist

### Unit Tests

- [ ] Rejects request without confirmation text
- [ ] Rejects request with incorrect confirmation text
- [ ] Rejects request with invalid password
- [ ] Rejects request with expired token
- [ ] Handles database transaction rollback on failure
- [ ] Generates unique deletion ID
- [ ] Returns correct response format on success

### Integration Tests

- [ ] Deletes all user photos from S3
- [ ] Cancels Stripe subscription
- [ ] Deletes Stripe customer
- [ ] Removes user from email marketing lists
- [ ] Invalidates all active sessions
- [ ] Anonymizes financial records correctly
- [ ] Sends confirmation email

### End-to-End Tests

- [ ] Complete flow: request → verification → deletion → confirmation
- [ ] Verify user cannot log in after deletion
- [ ] Verify user data is not accessible via API
- [ ] Verify external services no longer have user data

### Security Tests

- [ ] Rate limiting prevents brute force attempts
- [ ] Password verification is timing-safe
- [ ] Deletion logs are created for audit trail
- [ ] No PII leakage in error messages

---

## Security Considerations

### Authentication

- Require current password verification
- Invalidate all sessions immediately upon deletion request
- Use timing-safe password comparison to prevent timing attacks

### Rate Limiting

- Max 3 deletion attempts per hour
- Max 5 deletion attempts per day
- Lock account after repeated failures

### Audit Trail

- Log all deletion requests (successful and failed)
- Store anonymized deletion record for compliance (30 days minimum)
- Include IP address, user agent, and timestamp

### Data Retention

- Financial records: Anonymize but retain for 7 years (tax compliance)
- Deletion logs: Retain for 30 days
- Backups: Ensure user data is purged from backups within 30 days

### GDPR Compliance

- Complete deletion within 30 days of request
- Provide deletion confirmation to user
- Document all data locations and deletion procedures
- Support data portability requests before deletion if requested

---

## Rollback Procedure

In case of partial deletion failure:

1. Deletion job marked as `failed` with error details
2. Support team notified via alert
3. Manual review of deletion state
4. Resume deletion from last checkpoint
5. User notified of delay and estimated completion

---

## Monitoring & Alerts

### Metrics to Track

- Deletion request count (daily/weekly)
- Deletion success rate
- Average deletion time
- External service cleanup failures

### Alerts

- Alert if deletion success rate drops below 99%
- Alert if any deletion takes longer than 24 hours
- Alert on external service cleanup failures
- Alert on unusual deletion request volume (potential abuse)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-20 | System | Initial specification |
