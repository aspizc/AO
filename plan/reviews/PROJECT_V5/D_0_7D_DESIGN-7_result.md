# Project V5 D/0/07d Design Trial 7 — independent review result

## Formal disposition

| Property | Adjudicated value |
|---|---|
| Review id | `D_0_7D_DESIGN-7` |
| Formal verdict | `reviewed_KO` |
| Candidate commit | `f2b19488b267f6b94ae570c4acba148464d38774` |
| Candidate tree | `644f458030051981a152c45500db26f6bfbfb166` |
| Request commit reviewed | `2152ef674f2cd368ef6707b59a89eb81cac345ff` |
| Sheet blob / SHA-256 | `a9e0ec74df9abf19ea7c8f0b5b24ce85d290c73d` / `60ef16700cb971f2382496f74ac2209e2c181002d449118f6ada1e7f426384d9` |
| Independent reviewer | fresh Claude `claude-fable-5` session, branch `review/V5-D-0-07d-design-t7-fable-c` |
| Request trace | `tr-v5-d007d-design-t7-7e448e92-917f-4497-ad19-986b54de2bd5` |

Candidate `f2b1948` is formally **`reviewed_KO`** for Design Trial 7 under the
conjunctive rule: one authenticated P0 and one authenticated P1 make the plan
non-executable without a hidden human choice. Two earlier reviewer sessions for
this trial stopped without a verdict or repository write; they have zero
authority and contributed no evidence to this result.

## Authentication

Verified directly against the repository, not the request text: `2152ef6` adds
only this request file plus one `reviews/README.md` index line; its sole parent
`f2b1948` changes only `plan/PROJECT_V5/D/0/07d.md` (1,864 insertions, 231
deletions); tree, sheet blob id, and sheet SHA-256 match the frozen values
above. Current integration root at review time: `main` =
`07556feb30aafe4040382993bc199bb9fe0bcd97`.

## P0 — Checkpoint 1 prerequisite is unsatisfiable and self-contradictory

Sheet lines 5602–5609 ("Exact prerequisite") gate all Checkpoint 1 work on:

> Work begins only after `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-5_result.md`
> records independent OK for this corrected Trial 5 plan candidate. Trials 1–4
> are immutable KO evidence … The checkpoint branch contains the Trial 5 result …

Deterministic facts: `D_0_7D_DESIGN-5_result.md` records **`reviewed_KO`** for
candidate `1a433e4e`; the sheet's own status line (line 5) declares Trial 5 and
Trial 6 immutable `reviewed_KO` and says Checkpoint 1 is blocked "unless a
fresh Design Trial 7 receives independent OK"; the sheet's own immutability
rule (lines 5592–5593) makes a KO permanent under the next trial number. The
prerequisite as written can therefore never be satisfied — the file it names
can never record OK. Executing Checkpoint 1 requires the coder to silently
substitute the Trial 7 result for the named Trial 5 result, a hidden human
choice the review contract forbids. The same staleness poisons the authority
chain at lines 5682–5685, which direct the reviewer to extract the "exact
Trial 5 spec, oracle/attack driver, and fd-seal artifacts from the
independently approved design blob": the Trial 5 design blob was rejected, not
approved, so the designated authority source for the reviewer-custody
RED/GREEN run is a KO'd artifact mislabeled as approved. "Trials 1–4 are
immutable KO evidence" (line 5607) likewise omits the KO Trials 5 and 6.

## P1 — Frozen inventory contract is stale against the integration root

Sheet lines 5639–5643 freeze the sole permitted `ci/suites.json` change:
`test.gateway.inventorySha256` moves from "the exact 123-path digest"
`sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5` to
"the exact 124-path digest"
`sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`,
with "No other `ci/suites.json` value changes."

Deterministic facts: at the declared baseline
`d0bf521799b16f7d3300163ce40bd7dfca49864d` the `test.gateway` digest is
`sha256:132a5af3…`, but at the current integration root `07556fe` it is
`sha256:f6bf19a001a01341c9dad63ab55f21bfd7b68571565b061f42b4a0e097f3922e`
(and `lint.gateway` moved `24c63e60…` → `854bc480…`). The sheet's frozen
from-value no longer exists on `main`, and the frozen to-digest is computed
over the baseline inventory plus one path, so it cannot equal any digest
derived from the current inventory. The sheet's own requirement that the
checkpoint branch "proves its product/test paths still match the declared
baseline before RED" (lines 5608–5609) is unsatisfiable from `main`, and a
branch cut from the stale baseline produces a Checkpoint 1 that cannot splice
without renegotiating both digests off-sheet. The exact expanded path counts
(123/124 vs. current) were not independently recounted; the digest divergence
alone is decisive.

## Scope not adjudicated

Per the stop-on-blocker rule, once the two findings above were authenticated
no further substantive seams were examined. Explicitly **not adjudicated**:
the `D007C_TEST_TMUX_PATH` file-vs-directory contract, the 80/80 gate-total
provenance, and the seven Trial 6 P0/P1 seams listed in the request. No
finding here endorses those seams; Trial 8 must still close them or present
them for fresh adjudication. No candidate, product, test, script, dependency,
workflow, or policy path was edited. This result claims no implementation,
integration, promotion, release, or support state; the sheet remains
`planned` and `D_0_1_SPLICE` remains blocked.

## Next required correction

Trial 8 must (1) rewrite the Checkpoint 1 "Exact prerequisite" and the
lines 5682–5685 authority-source language to gate on the immutable result of
the trial actually under review — naming `D_0_7D_DESIGN-7` KO history and the
prospective Trial 8 result file explicitly — with no reference to a KO'd trial
as "approved"; and (2) re-freeze the baseline and the
`test.gateway`/`lint.gateway` inventory digests against the real integration
root (`07556fe` or its successor), stating the exact current from-digest, the
recomputed to-digest, and the path count, or explicitly re-baseline the sheet
and prove the `07a–c` bytes survive under the new root.
