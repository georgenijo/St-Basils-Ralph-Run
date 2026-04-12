# Code Review — Issue #153: Server actions: donations

## VERDICT: APPROVED

## Summary

Clean, well-structured implementation that follows existing codebase patterns precisely. The server action handles validation, auth, family lookup, and payment insertion with correct RLS compliance. No security gaps, no logic errors, no unnecessary complexity.

## Plan Compliance

COMPLETE — All 3 plan steps implemented exactly as specified. No deviations.

## Findings

### Critical (must fix before merge)

None.

### Suggestions (non-blocking)

- **[src/actions/donations.ts:22]** The `note` field is passed as `formData.get('note') || ''` which converts `null` to empty string before Zod sees it. This is fine because the schema accepts `.or(z.literal(''))`, but it means a missing note field and an empty note field are indistinguishable at the Zod level. This matches the pattern used in `rsvp.ts:26` (`formData.get('notes') || null`), just with a different falsy default — acceptable.
- **[src/actions/donations.ts:62-64]** The composed note format `[type] note` is a convention that downstream consumers (#159) will need to be aware of. Consider documenting this convention in the plan for issue #159. Not blocking for this PR.

### Approved Files

- `src/actions/donations.ts` — clean server action, correct structure, proper RLS-compliant insert
- `src/lib/validators/member.ts` — donation_type enum added correctly with descriptive error message
- `src/lib/validators/member.test.ts` — existing tests updated, 2 new edge case tests added, all 33 tests pass

## Verification

- Lint: checked (0 errors)
- TypeScript: checked (compiles clean)
- Tests: checked (196/196 pass)
