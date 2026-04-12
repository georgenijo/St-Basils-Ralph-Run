# Implementation Plan — Issue #153: Server actions: donations

## Approach Summary

Create a `recordDonation` server action in `src/actions/donations.ts` that validates input (donation type, amount, optional note), authenticates the member, looks up their family, and inserts a payment record with `type='donation'`. The existing `recordDonationSchema` in `member.ts` needs a `donation_type` field added since the issue requires constraining donation types (general, car_blessing, christmas_caroling, event_specific, other). The donation type and user note will be composed into the payment's `note` column as a structured string (e.g., `"[general] Sunday offering"` or `"[car_blessing]"` if no note), avoiding a schema migration while keeping the data human-readable and parseable.

## Prerequisites

- Payments table migration exists (`20260409000003_create_payments.sql`) — CONFIRMED
- Zod validators file exists (`src/lib/validators/member.ts`) — CONFIRMED
- RLS INSERT policy on payments allows members to insert donations for own family — CONFIRMED

## Steps

### Step 1: Add `donation_type` field to `recordDonationSchema`

**Files:**

- `src/lib/validators/member.ts` — modify

**What to do:**
Add a `donation_type` field to `recordDonationSchema` (line 47) as a `z.enum` with values `['general', 'car_blessing', 'christmas_caroling', 'event_specific', 'other']`. The field is required. Place it before the `amount` field. Also export a `RecordDonationData` type (already exported at line 92 — confirm it picks up the new field automatically via `z.infer`).

**Pattern to follow:**
`src/lib/validators/member.ts:74` — `recordPaymentSchema` uses `z.enum` for `type` and `method` fields with custom error messages.

**Verify:**

```bash
npx tsc --noEmit
```

**Done when:**

- `recordDonationSchema` validates a `donation_type` field with the 5 allowed values
- TypeScript compiles without errors

### Step 2: Update `recordDonationSchema` tests

**Files:**

- `src/lib/validators/member.test.ts` — modify

**What to do:**
Update the `recordDonationSchema` test block (lines 150-184) to include `donation_type` in all test cases:

1. Update "passes with amount and note" to include `donation_type: 'general'`
2. Update "passes with note omitted" to include `donation_type: 'car_blessing'`
3. Update "fails when amount is zero or negative" to include `donation_type: 'general'`
4. Update "fails when amount has more than 2 decimal places" to include `donation_type: 'general'`
5. Add new test: "fails when donation_type is missing" — parse without donation_type, expect failure
6. Add new test: "fails when donation_type is invalid" — parse with `donation_type: 'tithe'`, expect failure

**Pattern to follow:**
`src/lib/validators/member.test.ts:223-283` — `recordPaymentSchema` tests validate enum fields.

**Verify:**

```bash
npm test -- --reporter=verbose src/lib/validators/member.test.ts
```

**Done when:**

- All existing tests pass with the new `donation_type` field
- New tests for invalid/missing donation_type fail correctly
- `npm test` passes

### Step 3: Create `recordDonation` server action

**Files:**

- `src/actions/donations.ts` — create

**What to do:**
Create `src/actions/donations.ts` with a `recordDonation` server action:

1. `'use server'` directive at top
2. Import `revalidatePath` from `next/cache`
3. Import `createClient` from `@/lib/supabase/server`
4. Import `recordDonationSchema` from `@/lib/validators/member`
5. Define `ActionState` type: `{ success: boolean; message: string; errors?: Record<string, string[]> }`
6. Export `async function recordDonation(prevState: ActionState, formData: FormData): Promise<ActionState>`

Action logic:

1. **Validate with Zod** — parse `donation_type`, `amount`, `note` from formData using `recordDonationSchema.safeParse()`. Return validation errors if failed.
2. **Auth check** — `const supabase = await createClient()`, get user via `supabase.auth.getUser()`. Return `'Unauthorized'` if no user.
3. **Profile + family lookup** — `supabase.from('profiles').select('family_id').eq('id', user.id).single()`. Return error if no profile or no family_id (member must belong to a family).
4. **Compose note** — Build note string: if user provided a note, `[${donation_type}] ${note}`; otherwise just `[${donation_type}]`.
5. **Insert payment** — `supabase.from('payments').insert({ family_id: profile.family_id, type: 'donation', amount: parsed.data.amount, note: composedNote, recorded_by: user.id })`. The `recorded_by = user.id` is critical for RLS INSERT policy to pass.
6. **Handle errors** — if insert fails, return `{ success: false, message: 'Failed to record donation' }`.
7. **Revalidate** — `revalidatePath('/member')`.
8. **Return success** — `{ success: true, message: 'Donation recorded successfully' }`.

**Pattern to follow:**
`src/actions/rsvp.ts` — same structure: Zod parse → auth check → profile lookup → DB insert → revalidate → return.

**Verify:**

```bash
npx tsc --noEmit && npm run lint
```

**Done when:**

- `src/actions/donations.ts` exists with a working `recordDonation` action
- TypeScript compiles without errors
- Lint passes

## Acceptance Criteria (Full)

- [ ] `recordDonationSchema` validates donation_type (5 constrained values), amount (positive, 2dp max), and optional note
- [ ] `recordDonation` server action authenticates the user and requires family membership
- [ ] Payment record is inserted with `type='donation'`, correct `family_id`, and `recorded_by = user.id`
- [ ] `revalidatePath('/member')` is called after successful insert
- [ ] All existing tests pass, new donation_type tests pass
- [ ] TypeScript compiles, lint passes

## RLS Policy Plan

| Table      | Policy                                  | Rule                                                                                                                                                                 |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments` | "Insert payments" (existing)            | Members can insert where `type = 'donation'` AND `family_id` matches their profile AND `recorded_by = auth.uid()`. Admins can insert any type. No new policy needed. |
| `payments` | "Select payments" (existing)            | Members see own family's payments. No change needed.                                                                                                                 |
| `profiles` | "Users can read own profile" (existing) | Used to look up `family_id`. No change needed.                                                                                                                       |

## Risk Mitigation

| Risk                                          | Mitigation                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `recordDonationSchema` missing `type` field   | Step 1 adds it before the action is created                                                       |
| RLS policy rejection if `recorded_by` not set | Step 3 explicitly sets `recorded_by: user.id` — matches the RLS WITH CHECK clause                 |
| Member without a family tries to donate       | Step 3 checks `profile.family_id` exists before insert, returns clear error                       |
| Donation sub-types not stored in DB column    | Stored in `note` field with `[type]` prefix convention — readable and parseable without migration |

## Out of Scope

- UI for recording donations (will be part of #159 Member portal: Payments tab)
- Admin confirmation of donations (part of #162 Admin: record payments)
- New migration for donation sub-type column (can be added later if needed)
- E2E tests for the action (no E2E test pattern for server actions exists yet)

## Estimated Complexity

low — Single server action file, minor validator update, follows well-established patterns in the codebase.
