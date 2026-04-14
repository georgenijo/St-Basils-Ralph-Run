# QA Scenarios — Issue #180: Zero-fee Payment Flow

## Happy Path

| ID | Scenario | Method |
|----|----------|--------|
| S1 | Member payments page loads without 500 (or redirects to login) | Playwright |
| S2 | Admin payments page loads without 500 (or redirects to login) | Playwright |
| S3 | Member sees outstanding items (unpaid charges/shares) with Pay buttons | Visual |
| S4 | Clicking Pay opens SubmitPaymentPanel with correct amount and type | Visual |
| S5 | Zelle tab shows church email with Copy button | Visual |
| S6 | Venmo tab shows deep link with correct URL format | Visual |
| S7 | Cash App tab shows deep link with correct URL format | Visual |
| S8 | Reference memo is auto-generated in correct format and copyable | Visual |
| S9 | "I've sent the payment" submits form and shows pending confirmation | Visual |
| S10 | Admin sees pending payments queue with Confirm/Reject buttons | Visual |
| S11 | Reference memo generates DUES-MON-YY-FAMILY format | Playwright |

## Edge Cases

| ID | Scenario | Method |
|----|----------|--------|
| S12 | Empty outstanding items shows no Pay buttons | Visual |
| S13 | Panel closes on Escape key | Code review |
| S14 | Zod validator rejects cash/check/online as member payment methods | Playwright |
| S15 | Panel body scroll locks when open | Code review |

## Regression

| ID | Scenario | Method |
|----|----------|--------|
| S16 | /login page loads without error | Playwright |
| S17 | Public pages (/, /about, /giving) still load at 200 | Playwright |
| S18 | Member payments page renders on mobile viewport (375px) | Playwright |

## Admin Flows

| ID | Scenario | Method |
|----|----------|--------|
| S19 | Admin payments table shows Status column with badges | Visual |
| S20 | Admin can record payment with Venmo/Cash App methods | Visual |
| S21 | Pending payment count shows in summary cards | Visual |

## Code Quality

| ID | Scenario | Method |
|----|----------|--------|
| S22 | TypeScript compiles cleanly | CLI |
| S23 | All unit tests pass (251+) | CLI |
| S24 | Lint passes with no new errors | CLI |
| S25 | Migration SQL is syntactically valid | Code review |
