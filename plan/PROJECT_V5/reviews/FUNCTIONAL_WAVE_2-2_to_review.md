# Project V5 functional Wave 2 — review request, trial 2

## Candidate

- Branch: `integration/V5-functional-wave-2`
- Corrected candidate before this request:
  `d23c78bebf93dc2b510c9462f3320422a690d461`
- Trial 1 request: `82f63e02dab06849ca793c7643e803037ce5cd5c`
- Trial 1 independent KO:
  `c09bbd51b47cbd84497c1ab0cac85eb05d48b3a2`
- Trial 2 correction: `d23c78bebf93dc2b510c9462f3320422a690d461`

Trial 1 found one promotion-state contradiction. The implementation and all
runtime gates were green, but `V4_ABSORPTION.md` called M0/4/00 `absorbed`
before this candidate was reachable from `develop` and `main`, while the V4
sheet remained planned.

## Correction

The M0/4/00 exception now says:

- the C/0/00 owner is technically complete, reviewed, and integrated in this
  V5 Wave **candidate**;
- V4 disposition is `partial`; and
- `develop`/`main` promotion plus the exact V4-sheet reconciliation evidence
  remain open.

The Trial 1 request and KO are preserved and linked from the visible review
index. No runtime, schema, policy, tool, message, audit publisher, or shared
service configuration changed.

After an independent Trial 2 `OK`, this candidate may be promoted by
fast-forward. M0/4/00 may be changed to `absorbed` only in a later reviewed
metadata increment that records exact implementation/review references and
proves containment in both branches.

## Required independent review

Use GPT-5.6 Sol with `ultra` reasoning and Fast/Priority execution. Read the
Trial 1 request and verdict, inspect the corrected candidate, and return
explicit `OK` or `KO` in a new append-only verdict file. Do not modify,
integrate, or promote the candidate.

Verify:

1. no V4 task is called complete or absorbed before the ledger's own
   implementation/test/review/promotion rules are satisfied;
2. M0/4/00, C/0/00, the coverage matrix, and sheet registry now distinguish
   technical completion from branch promotion and V4 closure;
3. Trial 1 remains immutable and visible;
4. `develop@85f7ab9` and `main@85f7ab9` can still fast-forward to this
   candidate without force;
5. the functional Wave content and prior green gates are unchanged outside
   the two documentation files in the correction commit; and
6. no secret, credential, token, message body, or shared MCP/Redis mutation is
   introduced.

## Evidence

```text
Trial 1 authoritative offline CI:
  1087 total, 1075 passed, 12 allowlisted infrastructure skips, 0 failed

Trial 2 correction:
  git diff --check: passed
  tests/structure: 222 passed
  exact M0/4/00 disposition: partial; promotion and reconciliation open
  correction paths:
    plan/PROJECT_V5/V4_ABSORPTION.md
    plan/PROJECT_V5/reviews/README.md
  working tree before this request: clean
```

No network, shared MCP, shared Redis, live PostgreSQL, Temporal, or provider
lane was used for this correction.
