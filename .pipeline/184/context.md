# Context Brief — Issue #184: Transactional notification emails for payments, membership, and account events

## Issue Summary
Add 10 transactional email templates (payment lifecycle, membership lifecycle, account lifecycle) using existing React Email + Resend infrastructure. Wire sends into existing server actions, add a daily cron for dues reminders, add notification preferences to profiles, and create a member settings page for preference management.

## Type
feature

## Acceptance Criteria
- Payment confirmed/rejected emails send when admin acts on pending payment
- Event charge email sends to each affected family
- Share purchase and payment confirmation emails work
- Dues reminders send at 14 days, 3 days, and expiry
- Membership renewal email sends when dues payment confirmed
- Welcome email sends after invite completion
- All emails respect notification preferences
- Every email has manage preferences + portal link in footer
- Cron job runs daily, protected by CRON_SECRET

## Codebase Analysis

### Files Directly Involved

| File | Why |
|------|-----|
| `src/emails/payment-rejected.tsx` | Existing template — already wired in `rejectPayment()`. Needs footer update for preferences link. |
| `src/emails/announcement-broadcast.tsx` | Style reference — dark header, gold divider, burgundy CTA pattern to follow |
| `src/emails/newsletter-confirmation.tsx` | Footer pattern reference |
| `src/actions/admin-payments.ts` | `confirmPayment()` needs email send; `assignEventCosts()` needs email send; `recordPaymentReceived()` needs membership renewal email |
| `src/actions/shares.ts` | `buyShares()` needs email send; `markSharesPaid()` needs email send |
| `src/actions/set-password.ts` | Welcome email trigger — send after successful password set on invite flow |
| `src/actions/family.ts` | No existing admin family-link action — FamilyLinked email trigger doesn't exist yet |
| `src/actions/users.ts` | `inviteUser()` — could be where FamilyLinked is triggered if admin sets family_id during invite |
| `src/lib/email.ts` | Core `sendEmail()` function — no changes needed |
| `src/lib/resend.ts` | Resend client — no changes needed |
| `src/lib/validators/member.ts` | May need notification preference validator |
| `supabase/migrations/` | Need new migration for `notification_preferences` column on profiles |

### Database Impact
- Tables affected: `profiles` (add `notification_preferences` JSONB column)
- New tables needed: None
- Migration dependencies: Must come after `20260412000001_add_payment_status_and_methods.sql` (latest migration)
- RLS considerations: Members should read/update their own notification_preferences. Existing profiles RLS allows self-read and self-update of non-admin columns.

### Key Schema Details
- `profiles`: id, email, full_name, role, family_id, is_active, phone, avatar_url
- `families`: id, head_of_household, family_name, membership_status, membership_type, membership_expires_at
- `payments`: id, family_id, type, amount, method, status (pending/confirmed/rejected), reference_memo, related_event_id, related_share_id
- `shares`: id, family_id, person_name, year, amount (always 50), paid
- `event_charges`: id, event_id, family_id, amount, paid

### Existing Patterns to Follow

| Pattern | Example File | Notes |
|---------|-------------|-------|
| React Email template | `src/emails/payment-rejected.tsx` | Simple template with inline styles, church footer |
| Styled email with header | `src/emails/announcement-broadcast.tsx` | Dark header, gold divider, burgundy CTA — use for branded templates |
| Email sending in action | `src/actions/admin-payments.ts:369-389` | Fetch family profiles, filter emails, call `sendEmail()` |
| Batch email to family | `src/actions/admin-payments.ts:369-389` | Query profiles by family_id, send to all emails |
| Server action pattern | All actions | Zod parse → auth check → DB mutation → revalidatePath → return ActionState |
| FROM address | All emails | `"St. Basil's Church <noreply@stbasilsboston.org>"` |
| USD formatting | `src/actions/admin-payments.ts:254` | `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` |
| Method labels | `src/actions/admin-payments.ts:245-252` | `METHOD_LABELS` record for display names |

### Test Coverage
- Existing tests: E2E smoke tests cover page loads, nav, forms. CI tests cover admin CRUD, email broadcast, newsletter flow.
- Test gaps: No tests for payment email sends. Mock email sink exists at `.e2e/mailbox/` and `sendEmail()` supports `EMAIL_TRANSPORT=mock` — can verify emails were queued.

### Related Issues
| Issue | Relationship |
|-------|-------------|
| #180 | Dependency — payment flow (confirm/reject triggers) — MERGED |
| #152 | Dependency — shares actions (purchase/paid triggers) — MERGED |
| #161 | Dependency — event cost assignment trigger — MERGED |
| #179 | Dependency — auth callback (welcome email trigger) — set-password flow exists |
| #186 | Unrelated — Every.org payments integration |

### No Member Settings Page Exists
Currently `/member` has: dashboard, directory, family, membership, payments, shares. No `/member/settings` page for notification preferences.

### No Cron Infrastructure Exists
No `vercel.json`, no `/api/cron/` routes. This will be the first cron job.

### No Admin Family-Link Action Exists
The issue requests a `FamilyLinked` email when "admin links profile to family." No such server action currently exists. The `profiles.family_id` column exists but there's no dedicated action to set it. This template should be deferred or scoped to when that action is built.

## Risks
- **FamilyLinked trigger doesn't exist**: No admin action to link a profile to a family. Template can be created but cannot be wired yet.
- **WelcomeMember placement**: The `setPassword` action redirects after success. Email must be sent before the redirect.
- **RLS on notification_preferences**: Current profiles RLS allows members to update their own non-admin-field rows. Need to verify `notification_preferences` is covered by the existing update policy or add a specific one.
- **Cron secret**: Vercel injects `CRON_SECRET` automatically for Vercel Cron Jobs. Must verify header name and validation pattern.
- **Email volume**: ~300/month estimated, well under Resend free tier (3,000/month).
- **Membership expiry timezone**: `membership_expires_at` is a `DATE` column (no timezone). Cron job comparison should use UTC date.

## Key Conventions
- FROM: `"St. Basil's Church <noreply@stbasilsboston.org>"`
- Email style: inline CSS, `-apple-system` font stack, `#f6f6f6` body bg, `#ffffff` container, `#352618` heading color
- Server actions: Zod → auth → DB → revalidate → return ActionState
- RLS is the authorization layer
- UTC in, local out
- Server components by default
- One ticket per branch, one PR per ticket
