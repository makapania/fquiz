# TODO: Password Reset Functionality

## Overview
Users who forget their FQuiz account password currently have no way to reset it. This feature needs to be implemented.

## Current State
- ✅ Users can create accounts with email/password
- ✅ Password verification works (returns "Incorrect password" error)
- ❌ No password reset mechanism exists
- ⚠️ UI shows "Password reset coming soon" message

## Implementation Plan

### Option 1: Email-based Reset (Recommended)
**Pros:**
- Standard industry practice
- Secure - only email owner can reset
- No additional security questions needed

**Cons:**
- Requires email sending service (SendGrid, Mailgun, etc.)
- Additional cost for email service
- Complexity in managing reset tokens

**Implementation:**
1. Add `password_reset_token` and `password_reset_expires` columns to `users` table
2. Create `/api/auth/forgot-password` endpoint:
   - Generate secure random token
   - Store hashed token + expiration (24 hours)
   - Send email with reset link
3. Create `/reset-password/[token]` page:
   - Verify token is valid and not expired
   - Allow user to set new password
   - Clear token after successful reset
4. Add email service integration:
   - Configure SendGrid/Mailgun/Resend
   - Create email template for reset link

### Option 2: Security Questions
**Pros:**
- No email service required
- Works offline
- Lower cost

**Cons:**
- Less secure than email
- Users forget answers
- Additional UX friction during signup

**Implementation:**
1. Add `security_question` and `security_answer_hash` to `users` table
2. Update signup flow to collect security question/answer
3. Create reset flow that verifies security answer
4. Allow password update if answer matches

### Option 3: Admin Reset (Interim Solution)
**Pros:**
- Simple to implement
- No additional services
- Can be done now

**Cons:**
- Requires manual intervention
- Not scalable
- Poor user experience

**Implementation:**
1. Create admin panel page (password protected)
2. Allow admin to manually update user passwords
3. Notify user via email (manual or automated)

## Recommended Approach

**Phase 1 (Immediate):**
- Option 3: Admin reset for now
- Add clear instructions on how to contact support

**Phase 2 (Next sprint):**
- Option 1: Implement proper email-based reset
- Use Resend.com (generous free tier)
- Add migration to support reset tokens

## Migration Required

```sql
-- For email-based reset
ALTER TABLE users
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP;

CREATE INDEX idx_password_reset_token ON users(password_reset_token);
```

## Files to Modify

### For Email Reset:
- `supabase/migrations/0006_password_reset.sql` (new)
- `app/api/auth/forgot-password/route.ts` (new)
- `app/api/auth/reset-password/route.ts` (new)
- `app/reset-password/[token]/page.tsx` (new)
- `app/guest/checkin/page.tsx` (add "Forgot password?" link)
- `src/lib/email.ts` (new - email sending logic)

### Environment Variables Needed:
```
RESEND_API_KEY=<api-key>
EMAIL_FROM=noreply@fquiz.app
```

## Testing Checklist
- [ ] User can request password reset
- [ ] Reset email is received within 1 minute
- [ ] Reset link works and loads page
- [ ] Expired tokens are rejected (>24 hours)
- [ ] Used tokens cannot be reused
- [ ] Password is successfully changed
- [ ] User can sign in with new password
- [ ] Old password no longer works

## Security Considerations
- Tokens must be cryptographically secure (use `crypto.randomBytes`)
- Store hashed tokens in database, not plain text
- Set short expiration (24 hours max)
- Rate limit reset requests (max 3 per hour per email)
- Don't reveal if email exists in system (prevent user enumeration)
- Log all password reset attempts for security monitoring

## Cost Estimate
**Resend (recommended):**
- Free tier: 3,000 emails/month
- $20/month: 50,000 emails/month
- Should be sufficient for small to medium apps

**Alternatives:**
- SendGrid: Free tier 100 emails/day
- Mailgun: Free tier 5,000 emails/month
- AWS SES: $0.10 per 1,000 emails

## Priority
**Medium** - Not blocking but improves UX significantly

## Created
2025-10-28

## Status
🟡 Planned - Not yet implemented
