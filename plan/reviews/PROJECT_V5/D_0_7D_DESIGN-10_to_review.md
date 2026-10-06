# Project V5 D/0/07d Design Trial 10 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-10`.
- Baseline: `946ede37877b4f2ff6b2af1799bc3ab0a1c6517d`, tree
  `72dae77b7108d7046d59a8f1f395abb41e6b4c3c`.
- Candidate: `95745bd471265080f7d196f0acf2e32fd3c442d4`.
- Candidate tree: `24bd128530969f9a322d2a9544f13a81a2225280`.
- Candidate branch: `plan/V5-D-0-07d-trial10`.
- Candidate range:
  `946ede37877b4f2ff6b2af1799bc3ab0a1c6517d..95745bd471265080f7d196f0acf2e32fd3c442d4`.
- Candidate delta: only `plan/PROJECT_V5/D/0/07d.md`, 211 insertions and
  56 deletions.
- Sheet blob: `7f3776204aaca459ff1fc3ba62d661b1b6cfa184`.
- Sheet size: 6,712 lines / 376,268 bytes.
- Sheet SHA-256:
  `b1e840b05031183e21d983edbe31ad595bd420b62e04397e36275d0dda0c7868`.
- Stable range patch-id:
  `06687f53c49e136da06f087bf0421a23288c4ea3`.

The candidate range contains exactly one commit:

| Commit | Tree | Parent | Exact subject | Sheet delta |
|---|---|---|---|---:|
| `95745bd471265080f7d196f0acf2e32fd3c442d4` | `24bd128530969f9a322d2a9544f13a81a2225280` | `946ede37877b4f2ff6b2af1799bc3ab0a1c6517d` | `docs(plan): close D/0/07d frozen protocol gaps (V5 D/0/07d Design Trial 10)` | `+211/-56` |

A fresh independent reviewer must authenticate this exact range, inspect the
mechanisms below, and author the immutable result. This request, its hashes,
and the author's deterministic transcripts are untrusted inputs, not approval.
The later request/index commit is deliberately outside the candidate range.

This documentation-only candidate claims no implementation, implementation
review, integration, promotion, release, support, host-custody pass, Docker
pass, or final `D_0_7D` result.

## Motivation and immutable implementation boundary

Design Trial 9 is independently `reviewed_OK` at
`cea2c79b2eb77baa239cd12a640749cc098b8ee9` and integrated at the baseline
above. The later CP1 Trial 3 implementation candidate
`289b446babebd1e68320c106b148e914d0b8df0c` (tree
`f682cd15eb77bebc7295ff7eec595ef13cc6815e`) was never submitted for
independent review. It remains paused and is not part of this candidate range.

Its direct child RED 4 commit
`9635baecaf8428fb961858d12e86978e76ff1452` (tree
`f68c9e4c8a43ea2f661e49583a0486a0dcfdff16`) is failing evidence only. It
changes only `tests/gateway/process_supervisor_session_port.test.js`
(`+184/-2`). Its exact focused run records `tests 4`, `pass 0`, `fail 4`,
`skipped 0`, `cancelled 0` for these names:

1. `frozen V4 rejects bailout nonterminal summaries and trailing TAP`;
2. `frozen V4 enforces TAP byte chunk and UTF-8 boundaries`;
3. `frozen V4 resolves candidate identity from the separate authenticated ODB`;
4. `frozen V4 dispatches all eleven bare modes through owner handlers`.

The third RED name describes the detached-candidate symptom; it does not make
ODB lookup normative. The candidate selects a stricter authenticated-parent
binding. RED 4 grants no GREEN, review, integration, or splice authority.

## Candidate correction 1: parent-bound candidate identity

The authenticated parent now inserts exactly one bwrap argv triple
`["--setenv","D007D_CANDIDATE_SHA",bindings.candidateSha]` after
`--clearenv`. The bwrap vector contains that variable exactly once. The
top-level authority process environment remains the exact four-entry frozen
array `LC_ALL=C`, `LANG=C`, `TZ=UTC`, `PATH=/usr/bin:/bin`.

Under `D007D_CANDIDATE_PROTOCOL=D7C2-v3`, the D7C2 wrapper requires a lowercase
40-hex `D007D_CANDIDATE_SHA` and uses those exact bytes in every emitted frame.
It never invokes Git, opens `.git`, resolves an ODB `HEAD`, or accepts another
identity source. Missing or malformed input rejects before a frame is emitted.

Protocol-unset legacy invocation remains explicit: it retains the reviewed
dashed argv and worktree-local
`git -C "$D007D_CANDIDATE_ROOT" rev-parse HEAD`. That legacy derivation is
unreachable under D7C2-v3 and is never a fallback for a missing binding.

## Candidate correction 2: all eleven CP1 handlers

Checkpoint 1 now freezes and implements the complete bare-mode dispatch table:

```text
bootstrap-probe
cp1-unit-custody
cp1-unit-teardown
cp1-unit-stream
cp2-unit
cp3-unit-cancel
cp3-unit-ordering
cp3-unit-matrix
docker-integration
focused
full-ci
```

The sheet freezes exact name sources for every mode: three synthetic names;
exact CP1 custody, teardown, and stream patterns; exact CP2 unit, CP3 cancel,
and CP3 ordering patterns; the `d007d race matrix: ` prefix contract; and the
three-file focused order. The CP1 fake-runner oracle must reach eleven distinct
handlers and frame each handler's own bare mode without fabricating future
CP2/CP3 test evidence.

The wrapper is complete at CP1. CP2 changes only its two declared test/fixture
paths; CP3 never changes the wrapper. A later need to add, alias, replace, or
reinterpret a handler returns to plan review rather than using a conditional
pathset.

## Candidate correction 3: byte-exact terminal TAP

Unit and focused handlers buffer the actual child stdout as bytes and reject
zero bytes or byte 2,097,153 before framing. They decode once with fatal UTF-8,
require byte-for-byte UTF-8 round-trip equality, and split only on Unicode
scalar boundaries into at most 64 nonempty chunks of at most 32,768 encoded
bytes. Reassembly must equal the original buffer; `tapBytes` and `tapSha256`
bind those original bytes, not normalized or replacement-character text.

The parent independently applies the same strict terminal root-TAP grammar. It
rejects `Bail out!`, invalid UTF-8, a second header, duplicate or
non-sequential root ids, plan/result/summary inconsistency, a nonterminal plan
or summary, trailing TAP records, and trailing bytes. After `# todo 0`, only
EOF or one exact final `# duration_ms <nonnegative-decimal>` line plus EOF is
accepted. Candidate totals alone are not evidence.

The regenerated frame selftest accepts two canonical streams and rejects 82
named single mutants, including new duplicate-id, plan mismatch, nonterminal
summary, trailing-header, trailing-byte, bailout, oversized-byte-buffer, and
UTF-8/chunk-boundary cases.

## Candidate correction 4: status and RED-to-GREEN contract

The sheet explicitly records the CP1 Trial 3 candidate as unreviewed and
paused and RED 4 as evidence only. CP1 may resume only after an independent
Design Trial 10 `reviewed_OK`. Its resumed test must preserve the RED 4 blob or
make only the minimum ODB-expectation-to-parent-SHA setup correction, rename
the third case to
`frozen V4 consumes parent candidate SHA without Git or ODB resolution`, and
make the same four-test command GREEN at exactly `4/4/0/0/0`.

## Frozen deterministic evidence

The author extracted the marked fences from sheet blob
`7f3776204aaca459ff1fc3ba62d661b1b6cfa184`, preserving the final LF, parsed
the spec with duplicate-key rejection, compiled the oracle, and ran all three
public deterministic entry points. A reviewer must independently reproduce,
not trust, this table:

| Evidence | Lines / bytes | SHA-256 |
|---|---:|---|
| V4 custody spec | 126 / 5,480 | `01970f6227ab9eb487515201d2811ae6efba9f07023b69884ce4a10384d49639` |
| BWRAP argv V3 | 24 / 1,372 | `75b099560fa13264c7b4428b3e08e81f93d0db0face17fa7d016e2666e7cef09` |
| V4 custody oracle | 3,826 / 181,652 | `3ea37af1b7ed6032a52125e6f1710a04fc2d827ef2e1da5c4147b20091662301` |
| `selftest` stdout | 1 / 58,951 | `ddcfd068467fad9e2b5bd49f902476c2b980c4429cafb52b7720fe8337e3ac79` |
| `owner-proof` stdout | 1 / 53,063 | `ca4d8db9be029e9efcc89dc0621a615a53e2096fe46642a596d03e5c160007b4` |
| `contracts` stdout | 1 / 43,359 | `68284666b7d9a0ce798454479bd02a1fbea3baf0c10b2b3823390904bf592b22` |

The selftest records the exact ordered eleven modes,
`dashedMutantsRejected=33`, `candidateShaEnvironmentExact=true`, and frame
totals `accepted=2`, `rejected=82`. The extracted bwrap fence contains exactly
one `D007D_CANDIDATE_SHA` token, and the spec's `bwrapArgvV3` digest equals the
extracted bwrap digest.

## Author verification and boundary

The author reproduced:

- candidate commit, parent, tree, subject, single-sheet delta, blob, size,
  SHA-256, and stable patch-id;
- LF-exact fence sizes and hashes;
- duplicate-key-rejecting JSON parse and Python compilation;
- successful `selftest`, `owner-proof`, and `contracts` executions;
- exact four-entry outer environment, one SHA bwrap binding, eleven ordered
  modes, 33 rejected dashed mutants, and 2/82 frame decisions;
- local Markdown-link resolution; and
- `git diff --check 946ede3..95745bd` with no output.

No product, test, script, dependency, workflow, or policy path is in the
candidate range. The author did not run `bash scripts/ci.sh`, Docker, the
privileged real-host custody matrix, or CP1 GREEN. Those lanes remain unrun and
cannot be inferred from the deterministic design-oracle checks.

The required Gateway planner spawn was attempted with the configured profile
but denied by policy rule `agent.service_tier.allowed`; no lower-tier helper
was substituted. This operational denial is not candidate evidence and does
not relax independent review.

## Required independent disposition

The reviewer must authenticate the exact range and separately adjudicate:

1. whether the parent-propagated SHA is the sole D7C2-v3 candidate identity,
   with legacy derivation explicit but unreachable as fallback;
2. whether CP1 can implement and fake-runner-prove all eleven exact handlers
   without future test fabrication or later wrapper edits;
3. whether byte limits, fatal UTF-8, scalar-safe chunking, original-byte
   hashing, and terminal root-TAP grammar close every listed laundering path;
4. whether the RED 4/GREEN transition is minimal, reproducible, and preserves
   the unreviewed/paused status boundary; and
5. whether all still-applicable Trial 9 custody, lifecycle, expectation,
   deadline, reconciliation, EOF, and cleanup invariants remain intact.

Write `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-10_result.md`, replace only the
pending Trial 10 index cell with the immutable verdict link, and commit those
two evidence paths explicitly. `reviewed_OK` is available only if all four
corrections are executable without hidden identity, handler, parser, or status
choices. Otherwise issue `reviewed_KO` with exact mechanism evidence and the
smallest required correction. Do not edit the candidate sheet or any
implementation, test, script, dependency, workflow, or policy path.
