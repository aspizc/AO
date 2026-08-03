# Independent Review — Project V5 Functional Wave 2 (Trial 1)

## Verdict

**KO** for technical/integration candidate
`071cb0dbc012c7ad25fdd93d63b6ae9406251946`, submitted by request
`82f63e02dab06849ca793c7643e803037ce5cd5c`.

The final runtime tree passes the authoritative offline gate, the reviewed
contracts remain intact, and the branch is mechanically suitable for a
non-force fast-forward. Promotion is nevertheless blocked by one canonical
state contradiction: the V4 absorption ledger calls M0/4/00 absorbed before
the candidate is reachable from either `develop` or `main`, while the V4 sheet
itself still records that work as planned and contains none of the
reconciliation evidence required by the same ledger.

## Reviewer profile

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Execution profile: Fast/Priority
- Branch: `integration/V5-functional-wave-2`
- Candidate: `071cb0dbc012c7ad25fdd93d63b6ae9406251946`
- Review request: `82f63e02dab06849ca793c7643e803037ce5cd5c`

This was an independent local/offline final-tree review. No shared MCP or
Redis service, live PostgreSQL, Temporal, provider lane, network fetch, tag,
push, integration, or promotion was used.

## Blocking finding

### P0 — M0/4/00 is reported as absorbed before its own promotion gate is true

`plan/PROJECT_V5/V4_ABSORPTION.md:7-9` permits a V4 item to be marked
`absorbed` only after the referenced implementation is committed, tested,
independently reviewed, and reachable from both `develop` and `main`.
Lines 13-18 distinguish `partial`, where a promotion remains open, from
`absorbed`. Lines 67-74 additionally require the affected V4 sheet to record
the exact implementation commits, RED/GREEN evidence, review verdict, and
`develop`/`main` containment proof in the promotion range.

The current-disposition row at
`plan/PROJECT_V5/V4_ABSORPTION.md:31` nevertheless says M0/4/00 is
“absorbed through C/0/00”.

That state is not yet true:

- `main` and `develop` both resolve to
  `85f7ab9d49c14ff9d358e3cb790a41728617afa3`.
- `git merge-base --is-ancestor 071cb0d main` and the equivalent `develop`
  check both exit 1.
- The reverse ancestry checks both exit 0, and each branch is `0` commits
  ahead / `67` behind the candidate. This proves clean fast-forward
  suitability, not completed promotion.
- `plan/PROJECT_V4/M0/4/00.md:6-10` still says
  `planificada para absorción V5` / `Planificada` and does not record the
  immutable implementation, test, review, or containment references required
  by the reconciliation gate.
- The root canonical rule at `plan/README.md:40-44` explicitly separates
  planned, implemented, reviewed, integrated, promoted, and released states;
  review or fast-forward eligibility cannot imply a later state.

Required correction: keep M0/4/00 `partial`/promotion-pending in the candidate
ledger and do not call it absorbed until the reviewed range is actually
contained by both `develop` and `main` and the V4 sheet records the evidence
required by the reconciliation gate. Preserve this KO and submit the
correction in the next append-only trial. Do not promote this candidate.

## Verified non-blocking evidence

### Review history and integrated scope

- The request is the direct child of the stated candidate.
- Every integrated implementation or plan-contract change has a numbered
  request and independent verdict:
  B/0/02 Trial 1 KO then Trial 2 OK; C/0/00 Trials 1-8 KO then Trial 9 OK;
  C/0/01 Trial 1 KO then Trial 2 OK; E/0/03 plan Trial 1 KO then Trial 2 OK;
  and E/0/04 plan Trials 1-4 KO then Trial 5 OK.
- A blob-at-introduction comparison covered 42 request/verdict artifacts for
  those sequences, including the C/0/00 runtime increment: 42 unchanged,
  zero mutations. Every expected request has exactly one verdict.
- The excluded C/0/02 Trial 2 KO ref `b3cc904` and C/1/00 Trial 1 ref
  `e7ae643` are not candidate ancestors. No D runtime implementation is in
  the candidate.

### C/0/00 credible CI contract

- `python scripts/ci_gate.py --validate-only` emitted one `passed` JSON object.
- `scripts/requirements_lock.sh --check-inputs` and
  `--check --offline` passed.
- The independent structure suite passed: **222/222**.
- The authoritative offline `bash scripts/ci.sh` exited 0 with aggregate
  `infrastructure_unavailable`: **1,087 tests / 1,075 passed / 12 exact
  allowlisted infrastructure skips / 0 failed**.
- Required suite split: structure 222/222; Gateway 723 total, 714 passed and
  nine PostgreSQL skips; E2E 24/24; CLI 29/29; LangGraph 84 total, 81 passed
  and three Gateway/Temporal skips. Python/Gateway lint, lock input, MCP stdio
  smoke, and policy registry passed.
- `test.redis-live` and `test.real-agents` were not selected and reported
  `infrastructure_unavailable`; they are not credited as successful live
  evidence.
- Since the reviewed C/0/00 integration tree, the only CI-contract change is
  the two generated `inventorySha256` values in `ci/suites.json`; suite
  topology, policy, runner, lock, and cleanup implementation are unchanged.

### C/0/01 generated contract and compatibility

- The focused final-tree contract selection passed **114/114**, including the
  exact 33-tool order, eight ordered `coordination.*` tools, generated
  projection/documentation parity, finite-number and Unicode-boundary parity,
  safe structured errors, and the exact three legacy `message.*` validation
  envelopes.
- `gateway/src/tools/message.js` is blob-identical to the reviewed base and
  has SHA-256
  `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- `gateway/src/core/audit.js`, including the legacy `agents:events`
  publisher contract, is blob-identical to the reviewed base and has SHA-256
  `39f636110c123b27f95932de1fb401e81478310debd4926739e29933e48e615d`.
- Focused behavior tests proved legacy message stripping/error/audit
  compatibility and that coordination domain/MCP audit remains local-only and
  does not publish to `agents:events`.

### B/0/02 and E plan contracts

- The B/0/02 client/lifecycle/factory/parity selection passed **39/39**.
- The final E/0/04 blob is identical to Trial 5 candidate `a01d3c5` and its
  independent OK `99465eb`.
- E/0/04 remains explicitly `planned`, with 15 unchecked acceptance items and
  no runtime implementation claim.
- Independent semantic checks reproduced 28 ordered reasons, 43 producer
  instruments, the exact five zero-event loss series, and five bounded
  control queues. The manager-owned durable generation is allocated under a
  stable OFD lock before manifest creation, burns on crash, fails closed when
  unavailable/corrupt/exhausted, and is carried as a value rather than a
  label or producer instrument.
- The required same-second golden keeps equal start/value but changes
  generation 41 to 42; generation comparison occurs before subtraction and
  makes the tick invalid, SLO-bad, and alert-firing. It cannot report delta
  zero. G/0/03, H/0/04, I/0/05, and I/0/07 remain planned and retain their
  direct E/0/04 dependency.

### Tree, ancestry, secrets, and hygiene

- The B-I tree contains exactly 50 sheets: **6 complete / 44 planned**.
  All 72 V4 atomic task markers remain planned; the blocker above is the
  premature contradictory ledger disposition.
- `main`, `develop`, the V4 rebaseline, and the final B/C/E reviewed commits
  are ancestors of the candidate. Both branch tips can reach it by ordinary
  fast-forward, but neither contains it yet.
- `git diff --check` passed for the baseline-to-request range and the working
  tree.
- A high-confidence added-line scan found no private key, AWS/GitHub/OpenAI
  credential signature, credential-bearing Redis URL, or concrete operator
  secret. Review/plan references to lease tokens, bodies, and signer paths
  are contract language only, not secret values.
- Offline dependency links and the private temporary gate directory were
  used only for verification and removed before committing this verdict.

No technical runtime blocker was found beyond the canonical state/promotion
contradiction above.
