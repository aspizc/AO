# Review Submission — V5 E1/S04 (Trial 2)

## Correction

- Replaced the widened detector with the exact checked-in
  `secret.token` character semantics.
- Added a parity test that loads `policies/sanitization-rules.json` and checks
  service rejection/acceptance for matching, short, differently labelled, and
  `+`/`/`/`=`-containing samples.
- The correction does not alter classification, byte limits, fences, dedupe,
  or audit behavior.

## Verification

- RED: the parity test exposed the false positive with
  `token=abc+def/ghi=jkl`.
- GREEN: `node --test tests/gateway/coordination_service_send.test.js` — 9
  tests passed.
- scoped `git diff --check` — passed.

## Review request

Recheck the trial-1 policy-parity blocker and confirm the corrected detector
matches the canonical `secret.token` rule without broadening coordination
policy.
