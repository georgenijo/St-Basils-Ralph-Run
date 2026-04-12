# Architect Review — Issue #153: Server actions: donations

## VERDICT: APPROVED

## Review Summary

The plan is straightforward and follows established codebase patterns well. It correctly identifies that the payments table and RLS policies already exist, so no migration is needed. The approach of storing donation sub-type in the note field with a `[type]` prefix is pragmatic — not ideal long-term, but appropriate for scope. The critical RLS requirement (`recorded_by = user.id`) is explicitly addressed.

## Detailed Review

### Correctness: PASS

- The plan correctly identifies that `recordDonationSchema` needs a `donation_type` field — the issue explicitly lists 5 donation types but the existing schema only has amount + note.
- Step ordering is correct: schema update → tests → action creation. No dependency issues.
- All 3 acceptance criteria from the issue are addressed: members can record donations (Step 3), types are constrained (Step 1), and they show up in payment history (via existing payments table + SELECT RLS policy).
- The action sets `type: 'donation'` and `recorded_by: user.id`, both required by the RLS INSERT policy.

### Architecture Alignment: PASS

- **RLS is the authorization layer**: The plan relies on existing RLS policies for the actual access control. The server action sets the correct values so RLS passes — it doesn't try to bypass or duplicate RLS checks in application code. The family_id check in the action (Step 3) is a UX guard, not the security boundary.
- **UTC in, local out**: No timestamps are handled by this action — `created_at` defaults to `now()` in the DB. Correct.
- **Sanity for content, Supabase for data**: Payment data goes to Supabase. Correct.
- **Server components by default**: This is a server action (`'use server'`). No client components involved.
- **One ticket per branch**: Scope is contained to the donation action and its validator.

### Database Design: PASS

- No new tables or columns needed. The existing `payments` table and its constraints handle this.
- The `type = 'donation'` CHECK constraint is satisfied.
- The `amount NUMERIC(10,2)` matches the Zod validation of 2 decimal places max.
- The `note TEXT` field will hold the composed donation type + user note.
- Indexes already exist on `family_id`, `type`, and `created_at DESC`.

### Security: PASS

- RLS INSERT policy enforces: member can only insert `type = 'donation'`, only for their own family, and must set `recorded_by` to their own uid. The plan satisfies all three.
- Zod validation is performed before any DB operation.
- Auth check is performed via `supabase.auth.getUser()`.
- Family membership is verified before insert (prevents orphaned donations from users without families).
- No SQL injection risk — using Supabase client's parameterized queries.

### Implementation Quality: PASS

- Steps are atomic and independently verifiable. Each step has a real verify command.
- The pattern references are specific (file paths and line numbers).
- The action follows the exact same structure as `rsvp.ts` — consistent with codebase conventions.

### Risk Assessment: CONCERN

- **Donation sub-type in note field**: This is a pragmatic trade-off. It works for now, but when #159 (Payments tab) needs to filter or display donation types, parsing `[type]` prefixes from the note field will be fragile. This is acceptable for the current scope but should be flagged for future migration consideration. Non-blocking.

## Required Changes (if REJECTED)

N/A

## Recommendations (non-blocking)

- When implementing Step 3, consider making the composed note format consistent: always `[donation_type]` with optional ` note` suffix, never include the brackets in the user-visible note. This makes future parsing reliable.
- The `donation_type` enum values should match exactly what the issue lists: `general`, `car_blessing`, `christmas_caroling`, `event_specific`, `other`.

## Approved Scope

- Modify `src/lib/validators/member.ts` to add `donation_type` field to `recordDonationSchema`
- Modify `src/lib/validators/member.test.ts` to cover the new field
- Create `src/actions/donations.ts` with `recordDonation` server action
- No migrations, no UI components, no admin functionality
