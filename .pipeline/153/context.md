# Context Brief — Issue #153: Server actions: donations

## Issue Summary

Members need a server action to record donations they've made to the church (general, car blessing, Christmas caroling, event-specific, other). The action creates a payment record with type='donation' in the existing `payments` table, linked to the member's family. Admin confirms payment was received separately.

## Type

feature

## Acceptance Criteria

- Members can record a donation for their own family
- Donation types are constrained to: general, car_blessing, christmas_caroling, event_specific, other
- Shows up in the member's payment history (via existing payments table)

## Codebase Analysis

### Files Directly Involved

| File                                | Why                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/actions/donations.ts`          | **Create** — new server action file for `recordDonation`                                                           |
| `src/lib/validators/member.ts`      | **Modify** — `recordDonationSchema` exists but needs a `type` field added (currently only validates amount + note) |
| `src/lib/validators/member.test.ts` | **Modify** — update tests for recordDonationSchema to include type field                                           |

### Database Impact

- Tables affected: `payments` (INSERT), `profiles` (SELECT for family_id lookup)
- New tables needed: None
- Migration dependencies: `20260409000003_create_payments.sql` must exist (it does — CLOSED #148)
- RLS considerations: The INSERT policy on `payments` already allows members to insert donations for their own family (enforces `type = 'donation'`, `family_id` matches profile, `recorded_by = auth.uid()`). No new migration needed.

#### Existing RLS INSERT policy on payments:

```sql
CREATE POLICY "Insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      type = 'donation'
      AND family_id = (SELECT family_id FROM public.profiles WHERE id = (SELECT auth.uid()))
      AND recorded_by = (SELECT auth.uid())
    )
  );
```

This means the server action MUST set `recorded_by = user.id` for the insert to pass RLS.

### Existing Patterns to Follow

| Pattern                                          | Example File                         | Notes                                                                                    |
| ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Server action with Zod + auth + Supabase insert  | `src/actions/rsvp.ts`                | Uses `prevState` + `formData` signature, Zod validation, Supabase client, revalidatePath |
| Server action with auth check and profile lookup | `src/actions/rsvp.ts:68-81`          | Gets user, then fetches profile for family_id                                            |
| ActionState type                                 | `src/actions/events.ts:13-17`        | `{ success: boolean; message: string; errors?: Record<string, string[]> }`               |
| Zod validator with amount field                  | `src/lib/validators/member.ts:47-54` | `recordDonationSchema` already exists with amount + note                                 |

### Test Coverage

- Existing tests that touch this area: `src/lib/validators/member.test.ts` has tests for `recordDonationSchema` (lines 150-184) but only tests amount + note (no type field yet)
- Test gaps: No unit tests for server actions exist in the codebase — actions are tested via E2E only

### Related Issues

| Issue | Relationship                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------- |
| #148  | Dependency — payments table (CLOSED, migration exists)                                         |
| #150  | Dependency — Zod validators for member actions (CLOSED, `src/lib/validators/member.ts` exists) |
| #154  | Touches same area — admin event charges and payment recording (separate action file)           |
| #159  | Downstream — Member portal Payments tab will consume this action                               |
| #162  | Related — Admin record payments (different action, different auth)                             |

## Risks

- The `recordDonationSchema` in `member.ts` currently has no `type` field — the issue explicitly requires donation type validation (general/car_blessing/christmas_caroling/event_specific/other). The schema needs to be updated.
- The `payments` table CHECK constraint only allows `type IN ('membership', 'share', 'event', 'donation')` — the donation sub-types (general, car_blessing, etc.) are NOT a column in the payments table. They need to go in the `note` field or a new approach is needed. **Resolution**: The issue says "type" but the payments table has a fixed `type = 'donation'`. The donation sub-types should be stored in the `note` field or the server action can store them differently. Looking at the issue more carefully: "Validate: type (general/car_blessing/...)" — this is a **donation category**, not the payment type. The server action should validate this field and store it in the `note` field, or we need to examine if there's a better place. Since the payments table has a `note TEXT` field, the donation category can be prepended or stored alongside the user's note.
- **Better approach**: Add a `donation_type` or store as a structured note. But the issue says to create a payment record with `type='donation'`, so the donation sub-type is metadata. The cleanest approach without a migration: include the donation_type in formData, validate it, and store it in the note field as a prefix or as a JSON structure. However, since other issues (#159 Payments tab) will need to display this, a dedicated column would be better — but that requires a migration which is scope creep. The simplest approach matching the issue: validate donation_type, pass it alongside note in the payment record. The `note` field is the natural place.

## Key Conventions

- `'use server'` directive at top of action files
- ActionState type: `{ success: boolean; message: string; errors?: Record<string, string[]> }`
- Zod validation first, then auth check, then DB operation
- `revalidatePath` after mutations
- Supabase client via `createClient()` from `@/lib/supabase/server`
- Auth via `supabase.auth.getUser()` — must check user exists
- Profile lookup for family_id: `supabase.from('profiles').select('family_id').eq('id', user.id).single()`
- RLS is the authorization layer — server action must set correct values so RLS policy passes
- No `git add -A` — stage specific files only
