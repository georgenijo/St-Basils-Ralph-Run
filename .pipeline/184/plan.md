# Implementation Plan — Issue #184: Transactional notification emails for payments, membership, and account events

## Approach Summary
Create 10 React Email templates following the existing `payment-rejected.tsx` style, add a shared email footer component, wire email sends into existing server actions, add a `notification_preferences` JSONB column to `profiles`, build a `/member/settings` page for preference management, and create a daily Vercel Cron job for dues reminders. The `FamilyLinked` template will be created but not wired (no admin action exists yet).

## Prerequisites
- Issue #180 (payment flow) — MERGED
- Issue #152 (shares) — MERGED
- Issue #161 (event cost assignment) — MERGED
- Branch `issue/184-transactional-notification-emails-for-payments-membership-and-account-events` is checked out and clean

## Steps

### Step 1: Add notification_preferences column to profiles
**Files:**
- `supabase/migrations/20260412100000_add_notification_preferences.sql` — create

**What to do:**
Create a migration that:
1. Adds `notification_preferences JSONB NOT NULL DEFAULT '{"payments": true, "membership": true, "shares": true, "events": true}'::jsonb` to the `profiles` table.
2. The existing profiles RLS policy for member self-update should already cover this column. The current member update policy on profiles allows members to update their own rows for non-role columns. Verify by checking the migration `20260308000000_create_profiles.sql` and `20260329000001_fix_profiles_rls_recursion.sql`.

**Pattern to follow:**
Follow the ALTER TABLE pattern from `20260412000001_add_directory_visible.sql` and `20260328000000_add_is_active_to_profiles.sql`.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Migration file exists with correct column definition
- Default covers all 4 categories: payments, membership, shares, events

### Step 2: Create shared email layout component
**Files:**
- `src/emails/components/email-layout.tsx` — create

**What to do:**
Create a reusable layout component that wraps all transactional emails with:
1. Dark header (`#253341` bg) with church name
2. Gold divider after heading
3. Content section (children)
4. Footer section with:
   - Church name + address (73 Ellis Street, Newton, MA 02464)
   - "Manage notification preferences" link → `{siteUrl}/member/settings`
   - "View in portal" link → configurable `portalUrl` prop
5. Props: `previewText: string`, `heading: string`, `portalUrl?: string`, `siteUrl?: string`, `children: ReactNode`

Use the style constants from `announcement-broadcast.tsx` (body bg, container, header, heading, goldDivider, footerSection, footerText).

**Pattern to follow:**
`src/emails/announcement-broadcast.tsx` — same dark header + gold divider + footer structure.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Layout component renders header, children, and footer with preference management link
- All transactional emails can use this layout

### Step 3: Create payment lifecycle email templates
**Files:**
- `src/emails/payment-confirmed.tsx` — create
- `src/emails/event-charge-assigned.tsx` — create
- `src/emails/shares-purchased.tsx` — create
- `src/emails/shares-paid.tsx` — create

**What to do:**

**PaymentConfirmed** — props: `paymentType`, `amount`, `method`, `siteUrl?`
- Subject pattern: "Your $75 payment was confirmed"
- Body: "Your {paymentType} payment of {amount} via {method} has been confirmed."
- CTA: "View payments" → `{siteUrl}/member/payments`
- Uses EmailLayout

**EventChargeAssigned** — props: `eventTitle`, `amount`, `siteUrl?`
- Subject pattern: "You've been charged $35 for Family Night"
- Body: "A charge of {amount} has been assigned to your family for {eventTitle}."
- CTA: "View payments" → `{siteUrl}/member/payments`
- Uses EmailLayout

**SharesPurchased** — props: `count`, `totalAmount`, `siteUrl?`
- Subject pattern: "3 shares purchased — pending payment"
- Body: "{count} remembrance share(s) for {totalAmount} have been recorded. Payment is pending."
- CTA: "View shares" → `{siteUrl}/member/shares`
- Uses EmailLayout

**SharesPaid** — props: `count`, `totalAmount`, `siteUrl?`
- Subject pattern: "Your 3 shares ($150) have been confirmed"
- Body: "Payment for {count} share(s) totaling {totalAmount} has been confirmed."
- CTA: "View shares" → `{siteUrl}/member/shares`
- Uses EmailLayout

**Pattern to follow:**
`src/emails/payment-rejected.tsx` for props pattern; `src/emails/announcement-broadcast.tsx` for styled layout.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- All 4 templates compile with no type errors
- Each uses EmailLayout with appropriate portal link

### Step 4: Create membership lifecycle email templates
**Files:**
- `src/emails/dues-reminder.tsx` — create
- `src/emails/membership-expired.tsx` — create
- `src/emails/membership-renewed.tsx` — create

**What to do:**

**DuesReminder** — props: `familyName`, `daysUntilExpiry`, `expiryDate`, `siteUrl?`
- Subject pattern: "Your membership expires in 14 days" (or 3 days)
- Body: "Your family's membership expires on {expiryDate}. Please renew to maintain active status."
- CTA: "Renew membership" → `{siteUrl}/member/membership`
- Uses EmailLayout

**MembershipExpired** — props: `familyName`, `expiryDate`, `siteUrl?`
- Subject pattern: "Your membership expired on April 30"
- Body: "Your family's membership expired on {expiryDate}. Renew now to restore access."
- CTA: "Renew membership" → `{siteUrl}/member/membership`
- Uses EmailLayout

**MembershipRenewed** — props: `familyName`, `newExpiryDate`, `siteUrl?`
- Subject pattern: "Membership extended through May 2027"
- Body: "Your membership has been renewed and is active through {newExpiryDate}."
- CTA: "View membership" → `{siteUrl}/member/membership`
- Uses EmailLayout

**Pattern to follow:**
Same as Step 3.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- All 3 templates compile with no type errors

### Step 5: Create account lifecycle email templates
**Files:**
- `src/emails/welcome-member.tsx` — create
- `src/emails/family-linked.tsx` — create

**What to do:**

**WelcomeMember** — props: `fullName`, `siteUrl?`
- Subject: "Welcome to St. Basil's"
- Body: Warm welcome message, mention service times (Morning Prayer 8:30 AM, Holy Qurbono 9:15 AM on Sundays)
- CTA: "Visit your portal" → `{siteUrl}/member`
- Uses EmailLayout

**FamilyLinked** — props: `fullName`, `familyName`, `siteUrl?`
- Subject: "You've been linked to the Nijo Family"
- Body: "Your account has been linked to the {familyName} family."
- CTA: "View your family" → `{siteUrl}/member/family`
- Uses EmailLayout
- NOTE: Template only — no wiring yet (admin link action doesn't exist)

**Pattern to follow:**
Same as Step 3.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Both templates compile with no type errors

### Step 6: Update existing payment-rejected template with shared footer
**Files:**
- `src/emails/payment-rejected.tsx` — modify

**What to do:**
Refactor `PaymentRejected` to use the `EmailLayout` component from Step 2. This gives it the standard header, gold divider, and footer with "Manage notification preferences" link. Keep all existing props and content. Remove the inline footer that's currently hardcoded.

**Pattern to follow:**
The new templates from Steps 3-5.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- PaymentRejected uses EmailLayout
- All existing props still work
- Footer includes preference management link

### Step 7: Create notification preference helper
**Files:**
- `src/lib/notifications.ts` — create

**What to do:**
Create a helper module with:

1. `NotificationCategory` type: `'payments' | 'membership' | 'shares' | 'events'`

2. `shouldNotify(supabase, userId: string, category: NotificationCategory): Promise<boolean>` — queries the user's `notification_preferences` from `profiles` table, returns `true` if the category is enabled (default true if column is null or missing key).

3. `getFamilyEmails(supabase, familyId: string): Promise<string[]>` — queries profiles by family_id, returns array of non-null emails. This pattern is used in `rejectPayment()` already — extract it as a reusable function.

4. `sendFamilyNotification(supabase, familyId: string, category: NotificationCategory, emailPayload: { subject: string, react: ReactElement }): Promise<void>` — combines getFamilyEmails + shouldNotify per user + sendEmail. Skips users who have the category disabled. Uses FROM address `"St. Basil's Church <noreply@stbasilsboston.org>"`.

**Pattern to follow:**
The email sending pattern in `src/actions/admin-payments.ts:369-389`.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Helper compiles
- `sendFamilyNotification` checks preferences per user before sending
- `getFamilyEmails` is reusable

### Step 8: Wire payment emails into server actions
**Files:**
- `src/actions/admin-payments.ts` — modify

**What to do:**

1. **`confirmPayment()`** (line ~307, after `applyPaymentSideEffects`): Add email send using `sendFamilyNotification()` with category `'payments'` and `PaymentConfirmed` template. Need to fetch the payment data (type, amount, method) which is already available as the `payment` variable.

2. **`rejectPayment()`** (line ~369-389): Refactor existing email sending to use `sendFamilyNotification()` with category `'payments'`. This replaces the manual profile query + loop.

3. **`assignEventCosts()`** (line ~96, after insert): For each unique family_id in the charges, send `EventChargeAssigned` email. Need to fetch the event title first. Use `sendFamilyNotification()` per family with category `'events'`.

4. **`recordPaymentReceived()`** (line ~153, after side effects): When `type === 'membership'` and side effects succeed, send `MembershipRenewed` email. Need to fetch the updated family data (new expiry date). Use `sendFamilyNotification()` with category `'membership'`.

Import `sendFamilyNotification` from `@/lib/notifications` and the relevant email templates.

The `METHOD_LABELS` and `usd` formatter are already defined in this file — reuse them.

**Pattern to follow:**
Existing `rejectPayment()` email sending pattern at line 369-389.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- `confirmPayment` sends PaymentConfirmed email
- `rejectPayment` uses sendFamilyNotification
- `assignEventCosts` sends EventChargeAssigned per family
- `recordPaymentReceived` sends MembershipRenewed for membership payments

### Step 9: Wire shares emails into server actions
**Files:**
- `src/actions/shares.ts` — modify

**What to do:**

1. **`buyShares()`** (line ~90, after insert): Send `SharesPurchased` email to the user's family using `sendFamilyNotification()` with category `'shares'`. The family_id is `profile.family_id`, count is `parsed.data.names.length`, totalAmount is `count * 50`.

2. **`markSharesPaid()`** (line ~176, after payment insert): Send `SharesPaid` email. Group shares by family_id (they should all be same family in practice, but be safe). Use `sendFamilyNotification()` with category `'shares'`.

Import `sendFamilyNotification` from `@/lib/notifications` and `SharesPurchased`/`SharesPaid` from emails.

**Pattern to follow:**
Same as Step 8.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- `buyShares` sends SharesPurchased email
- `markSharesPaid` sends SharesPaid email

### Step 10: Wire welcome email into set-password action
**Files:**
- `src/actions/set-password.ts` — modify
- `src/app/api/auth/callback/route.ts` — read-only reference

**What to do:**

In `setPassword()`, after successful password update (line ~45) and before the redirect (line ~61):
1. Check if this is a first-time setup (the user came through an invite flow). Detect by checking if user's `email_confirmed_at` was recently set or if user metadata has invite indicators. A simpler approach: check if the user has `created_at` within the last hour — if their profile was just created and they're setting password, it's likely an invite completion.
2. Actually, the simplest reliable approach: send the welcome email on every successful `setPassword()` call but make it idempotent — check if the profile already has a `welcomed_at` timestamp. However, adding a column is overhead.
3. Best approach: Always send welcome email from `setPassword()`. Since users only hit `/set-password` from invite or recovery flows, and recovery users have already been welcomed, we can check: if user has NO `password` yet (first time), send welcome. But we can't check that easily from Supabase client.
4. **Simplest correct approach**: Send welcome email unconditionally from `setPassword()`. It's fine if a password-reset user gets a "welcome" email — the content is generic enough. OR: only send if the auth type was `invite`. We can detect this by checking the URL referer or adding a hidden form field.
5. **Chosen approach**: Add a hidden field `flow_type` to the set-password form (set to 'invite' when coming from invite callback). In `setPassword()`, only send welcome email if `flow_type === 'invite'`. This requires also modifying the set-password page to pass the flow type through.

Actually, looking at the callback route: it redirects to `/set-password` for both `type=invite` and `type=recovery`. We can pass a query param `?flow=invite` and read it in the page, then pass it as a hidden field.

**Revised approach**: 
- In `src/app/api/auth/callback/route.ts`: Already sets `redirectUrl.pathname = '/set-password'` for invite/recovery. Modify to also set `redirectUrl.searchParams.set('flow', type)` to pass the flow type.
- In the set-password page: read the `flow` search param and include it as a hidden input.
- In `setPassword()` action: if `formData.get('flow') === 'invite'`, send WelcomeMember email after password is set.

**Files (updated):**
- `src/actions/set-password.ts` — modify (add welcome email send)
- `src/app/api/auth/callback/route.ts` — modify (pass flow type as query param)
- `src/app/(auth)/set-password/page.tsx` — modify (read flow param, add hidden input) — need to verify this file exists

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Invite flow passes `?flow=invite` query param through to set-password form
- Welcome email sends only for invite completions, not recovery

### Step 11: Create Vercel Cron job for dues reminders
**Files:**
- `src/app/api/cron/dues-reminders/route.ts` — create
- `vercel.json` — create

**What to do:**

**Route handler** (`src/app/api/cron/dues-reminders/route.ts`):
1. Export `GET` handler.
2. Verify `CRON_SECRET`: check `request.headers.get('authorization') === \`Bearer ${process.env.CRON_SECRET}\``. Return 401 if invalid.
3. Use Supabase admin client (service role — no RLS needed for batch operations).
4. Get today's date in UTC as `YYYY-MM-DD` string.
5. Query families where `membership_expires_at = today + 14 days` → send 14-day `DuesReminder` email.
6. Query families where `membership_expires_at = today + 3 days` → send 3-day `DuesReminder` email.
7. Query families where `membership_expires_at = yesterday (today - 1 day)` → send `MembershipExpired` email.
8. For each family, fetch all profiles with `notification_preferences->'membership'` not explicitly false, get their emails, and send.
9. Return JSON response with counts: `{ reminders14: n, reminders3: n, expired: n }`.
10. Wrap everything in try/catch — cron should not throw unhandled errors.

**Vercel config** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/dues-reminders",
      "schedule": "0 13 * * *"
    }
  ]
}
```
Schedule: 1:00 PM UTC daily = 9:00 AM ET (reasonable time to send membership reminders).

**Pattern to follow:**
The existing `sendOccurrenceNotification` pattern in `src/actions/event-instances.ts` for batch email sends. Use admin client pattern from `src/lib/supabase/admin.ts`.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Route handler compiles
- Cron secret validation is in place
- Three membership deadline queries (14d, 3d, expired) are implemented
- vercel.json configures daily schedule

### Step 12: Create notification preferences Zod schema and server action
**Files:**
- `src/lib/validators/member.ts` — modify
- `src/actions/notifications.ts` — create

**What to do:**

**Validator** (add to `src/lib/validators/member.ts`):
```typescript
export const updateNotificationPreferencesSchema = z.object({
  payments: z.boolean(),
  membership: z.boolean(),
  shares: z.boolean(),
  events: z.boolean(),
})
```

**Action** (`src/actions/notifications.ts`):
```typescript
'use server'
export async function updateNotificationPreferences(prevState: ActionState, formData: FormData): Promise<ActionState>
```
1. Parse form data with Zod schema (convert string 'true'/'false' to boolean)
2. Auth check — must be logged in
3. Update `profiles.notification_preferences` for the current user
4. `revalidatePath('/member')`
5. Return success

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Zod schema validates all 4 boolean preferences
- Server action updates the user's notification_preferences in profiles
- Auth is enforced

### Step 13: Create member settings page
**Files:**
- `src/app/(member)/member/settings/page.tsx` — create

**What to do:**
Create a server component page that:
1. Fetches current user's notification_preferences from profiles
2. Renders a form with 4 toggle switches (payments, membership, shares, events)
3. Form uses `useActionState` with `updateNotificationPreferences` action
4. Each toggle shows the category name and a brief description:
   - Payments: "Payment confirmations, rejections, and event charges"
   - Membership: "Dues reminders and membership renewal notices"
   - Shares: "Share purchase and payment confirmations"
   - Events: "Event charge assignments"
5. Page title: "Notification Settings"
6. Style with Tailwind, consistent with existing member pages

Since this uses `useActionState` for form handling, the form portion needs to be a client component. Create a small client component inline or in the same directory.

**Pattern to follow:**
Look at existing member pages like `src/app/(member)/member/family/page.tsx` for layout patterns.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Settings page renders at /member/settings
- Toggles reflect current preferences
- Form submits and updates preferences
- Consistent styling with other member pages

### Step 14: Add settings link to member navigation
**Files:**
- Need to find the member layout or navigation component that contains sidebar/nav links

**What to do:**
Add a "Settings" link to the member navigation that points to `/member/settings`. Place it at the bottom of the nav, before any logout link.

**Verify:**
```bash
npx tsc --noEmit
```

**Done when:**
- Settings link appears in member navigation
- Links to /member/settings

### Step 15: Final lint and type check
**Files:** None (verification only)

**What to do:**
Run full verification:
```bash
npm run lint
npx tsc --noEmit
```
Fix any lint or type errors introduced by these changes.

**Verify:**
```bash
npm run lint && npx tsc --noEmit
```

**Done when:**
- Zero new lint errors
- Zero new type errors

## Acceptance Criteria (Full)
- [x] Migration adds notification_preferences JSONB to profiles
- [ ] 10 email templates created (PaymentConfirmed, PaymentRejected updated, EventChargeAssigned, SharesPurchased, SharesPaid, DuesReminder, MembershipExpired, MembershipRenewed, WelcomeMember, FamilyLinked)
- [ ] Shared email layout component with standard header + footer
- [ ] Payment confirmed email sends when admin confirms pending payment
- [ ] Payment rejected email uses shared layout with preferences link
- [ ] Event charge email sends to each affected family
- [ ] Share purchase and payment confirmation emails work
- [ ] Dues reminders send at 14 days, 3 days, and expiry via cron
- [ ] Membership renewal email sends when dues payment confirmed
- [ ] Welcome email sends after invite completion (not recovery)
- [ ] All emails respect notification preferences (checked per user)
- [ ] Every email has manage preferences + portal link in footer
- [ ] Cron job runs daily at 9 AM ET, protected by CRON_SECRET
- [ ] Member settings page at /member/settings with preference toggles
- [ ] Settings link in member navigation

## RLS Policy Plan
| Table | Policy | Rule |
|-------|--------|------|
| profiles | Existing member self-update | Members can update their own `notification_preferences` — existing policy covers this since it allows updating own row for non-admin columns |

No new RLS policies needed. The existing profiles policies allow:
- Members: read own row, update own row (non-role fields)
- Admins: read all rows

The `notification_preferences` column is not a role/admin field, so the existing update policy covers it.

## Risk Mitigation
| Risk | Mitigation |
|------|-----------|
| FamilyLinked trigger doesn't exist | Template created but not wired — clearly marked as "template only" |
| Welcome email on recovery | Pass `flow` param through auth callback to distinguish invite vs recovery |
| RLS on notification_preferences | Verify existing profiles update policy allows it — it should since it's a non-role column |
| Cron secret validation | Use `Bearer` token pattern matching Vercel's documented CRON_SECRET injection |
| Email failures silently breaking actions | All email sends wrapped in try/catch — email failure should not fail the parent action |
| Membership date timezone | Use UTC date comparison in cron (DATE column has no timezone) |

## Out of Scope
- FamilyLinked email wiring (no admin action exists to link profiles to families)
- Email preview/dev server (`react-email dev` — nice to have but not required)
- Email delivery tracking/analytics
- Retry logic for failed sends (Resend handles retries internally)
- Member notification history page

## Estimated Complexity
**medium-high** — 10 templates + shared layout + 4 action modifications + 1 new cron route + 1 new page + 1 migration + 1 helper module = significant breadth but each piece follows established patterns.
