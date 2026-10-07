# V7 A/0/01 — Root candidate and final gate binding

Date: 2026-10-07. Status: implemented candidate, independent review pending.
Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`. Branch: `feat/V7-A-0-01-shared-capacity`.
Fresh review trace: `tr-r1-v7-a01-review-2e3268c8-abf5-46ce-beb4-f04ea0e7515e`.
Root assigns an independent reviewer; the coder supplies no verdict.

## Final verification

The final full gate includes the budget schema/parity test and root CLI
registration. Its final report has **2721 passed, 0 failed, 12 skipped,
2733 total**, errors empty, aggregate `infrastructure_unavailable`.
Structure456; Gateway1632 with9 PostgreSQL skips; E2E25; CLI436;
LangGraph143 with2 live-Gateway and1 Temporal skips; Redis22;
seven required command lanes passed. Optional live providers did not run.
The infrastructure skips are declared omissions, not completed live checks.

Raw final output is preserved losslessly in
`A_0_1-1-full-gate-final.txt.gz`; uncompressed SHA-256
`5ec1022a78b6b9120fc2a40373eebba5a8b6aa524cf4254ebb5e07b48935e526`.
The original host exec handle became unavailable after the environment changed;
the complete final JSON report above is present. No exit-code observation is
invented for that lost handle. The gate ran with Node22.22.1, Python3.11.15,
owned Redis7.2 and isolated tmux3.6a-agents.1 before that transition.
No additional host/provider verification is claimed.

Earlier full gate `A_0_1-1-full-gate-failed.txt.gz` is retained as failure:
2578passed,1failed,9skipped; LangGraph's owned-process group leaked its
multiprocessing tracker. Corrected test ownership is documented separately.
Its correct uncompressed hash is
`61cb09237c1900e17b46b6e65e10b28811e98ca218df7c89e0f94647749f7f1c`.
The immutable owned-runtime note's different hash sampled a reused log during
a rerun and does not bind that failure. The later schema-correction note
records this correction. `A_0_1-1-full-gate.txt.gz` preserves the intermediate
2720passed/0failed/12skipped run before the schema artifact was added.
Root registration RED/GREEN archives preserve the missing command then
79 passing focused tests; schema correction finishes at80 focused passes.

## Root integration scope

Root registered `agent-run wave budget-init` in the real CLI and added its
intent test; refreshed suite inventories; added the bounded capacity guide,
README/CHANGELOG entries and precise V7 candidate status/ownership paths.
These additions are part of this review. V6 remains one integrated leaf and
six unfinished leaves. V7 capacity does not implement automatic waves, OS
memory enforcement, token spending limits, or V5 authority guarantees.

Frozen file manifest: `/tmp/ao-v7-a01-review-candidate.json`, SHA-256 per file
and Git blob hashes calculated without object writes. The current environment
makes `.git` read-only, so root has not invented a candidate tree/commit,
performed a commit, integrated the candidate, or created a release tag.
The manifest's exact path/blob set plus base identifies the review content;
root must verify identical bytes when a candidate tree can be written.
Raw `.txt` evidence copies are excluded; their exact `.txt.gz` archives are
included. Prior requests/verdicts are immutable. Review this final binding
alongside the original request and both additive correction checkpoints.
