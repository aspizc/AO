# Integration status documentation — trial 1 reviewed OK

Date: 2026-10-07. Verdict: **OK for the exact documentation candidate below**.
No blocking status or documentation defects found in this bounded review.
This verdict accepts status reporting; it supplies no new implementation,
provider acceptance, integration, promotion or release evidence.

## Independent identity and immutable candidate

- Reviewer: separately root-assigned built-in Codex session
  `/root/review_v6_status`, independent of the documentation author.
- Fresh review trace: `tr-v6-status-46dc8cc0-9b61-449b-8218-18ac2299d411`.
- Operator-authorized built-in fallback after the recorded Gateway
  `REQUEST_CONTEXT_DENIED`; this is not Gateway-spawned or cross-vendor review.
- Checkout branch: `release/1.1.0`.
- Base/HEAD: `7df29bda06aa3a139903dbb0cfc61860029f8159`.
- Exact candidate tree: `b598b112c8c120f20552a9ef4fc67329e4b5ece1`.
- Binding manifest: `/tmp/ao-v6-status-candidate.json`, SHA-256
  `6022b8ded4e4ad87dd83b03e4386b5ea04ecd60de987e02113ac968120d69b26`.
- Scope: exactly 13 changed Markdown paths: twelve documentation/checkpoint
  paths plus the immutable trial 1 request. This new verdict is outside that
  tree. All listed blobs match both the candidate tree and checkout bytes;
  binding was rechecked immediately before writing this verdict.

| Candidate path | Exact blob |
|---|---|
| `README.md` | `33769d728cd4ec2cc1baf340ccf76d92d4627d26` |
| `docs/project-status.md` | `bf0d25a1e99c14a9d61842f842bd6380e29f157e` |
| `plan/README.md` | `8d32bc6fe9c4e4bc42f7bc95e9d473bb78fe3675` |
| `plan/PROJECT_V6/README.md` | `e40efce210add64e5f80cad38549796fe5eacd1a` |
| `plan/PROJECT_V6/SHEETS.md` | `eb32f3ee550e7a2ba07e9594e82574592f34fb0b` |
| `plan/PROJECT_V6/A/README.md` | `ae1426290ce0564fc3c4b77139e479bdfec03874` |
| `plan/PROJECT_V6/A/0/02.md` | `c373f1721daf83ae14a1e01d1c537621afb2aecc` |
| `plan/PROJECT_V6/reviews/README.md` | `77fa861837ace0e3979ec8db479ac65e7a409c43` |
| `plan/PROJECT_V7/README.md` | `37124e26878c346d543dc83167ef007ca58566bd` |
| `plan/PROJECT_V6/reviews/A_0_2_integration_checkpoint.md` | `1a9f0d164b83f6686f2f52b50d3e438c10f84d3d` |
| `plan/PROJECT_V6/reviews/A_0_4-build-1_checkpoint.md` | `625e273eb8f8e934bc9235c2c14c54191f6ab925` |
| `plan/PROJECT_V6/reviews/A_0_4-build-2_checkpoint.md` | `4dfeddd69f8b99ee7dc4b84d7d0a9d8fcfc8c5c4` |
| `plan/PROJECT_V6/reviews/INTEGRATION_STATUS-1_to_review.md` | `68bd2f6f9a04c37f2998f181fed596b6889fe013` |

## Status and evidence mapping

Read `AGENTS.md`, `.claude/orchestration-profile.md`, `plan/README.md`, the
stage and project status documents, A/0/02, the trial 1 request, A/0/02's
immutable trial 2 request/verdict and operator registry decision, V7's plan
trial 2 verdict, and both A/0/04 checkpoints. Reviewed the base-to-candidate
diff without extending this review to runtime implementation.

1. **A/0/02 is reviewed and integrated, without later-state credit.** The
   [independent trial 2 verdict](A_0_2-2_reviewed_OK.md) binds implementation
   tree `a8671d91db77d77237623c0b91fda90f270a69e2`. The authorized registry
   commit `3f7d78a461c09582038fa3611d445966b192aeac` is an ancestor of
   implementation commit `1f1431a1bb06ee956082f31bff48b536f9d3435c`.
   Integration `7df29bda06aa3a139903dbb0cfc61860029f8159` has that
   implementation as its second parent. Compared the reviewed tree to the
   implementation and the implementation to the integration: additions and
   changes are confined to plan/review Markdown. Production, test, manifest
   and example bytes retain the reviewed implementation. The checked
   A/0/02 acceptance boxes map to the prior implementation verdict, rather
   than to tests newly claimed by this documentation review.

2. **Gate totals and unavailable services remain explicit.** Inspected
   `/tmp/ao-v6-a02-gate.log` and independently checked its SHA-256:
   `397b1fed891b77e0f04fd3e09ea7e97f7e213ec2ea0a57478680c4f45cb5ec2c`.
   Its final report has **2651 passed, 0 failed, 12 skipped, 2663 total**,
   `errors: []` and `infrastructure_unavailable`. Exit 0 is recorded in the
   bound implementation verdict. The report contains seven required command
   lanes, correcting the immutable request's prose count of six: lock.python,
   release.candidate, lint.python, lint.gateway, public.hygiene, smoke.mcp
   and policy.registry. The 12 skips are nine PostgreSQL, two live-Gateway
   and one Temporal test. Optional live providers, Darwin and additional
   Node versions remain unverified. No second post-integration full gate
   is claimed.

3. **Refs and release boundary are accurately reported.** HEAD remains the
   named integration on `release/1.1.0`; `main` remains
   `fb937565e7ebf74dbc85032de6162152f33b05a2`. Annotated tag `1.0.0` remains
   object `0d43cf7bf13acc9b28a5d4e9fcb14cc83ea5b5ac`, peeled to
   `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`.
   `1.1.0-dev.1` remains annotated object
   `59be52c893ca36c8d37e519c5b1a009856f78882`, peeled to
   `b3aed7c9365e54587dc4f847f82edff272955bfb`. There is no local final
   `1.1.0` tag, and the V6 integration is not an ancestor of main.
   Current status pages distinguish the prior 1.0.0 release, development
   documentation tag and unreleased A/0/02 integration.

4. **The other six V6 leaves and V7 runtime remain open.** V6's ledger and
   stage registry consistently retain seven executable sheets, with only
   A/0/02 integrated. A/0/00, A/0/01, A/0/03, A/0/04, A/0/05 and A/0/06
   remain unfinished. V7's README correctly credits only
   [plan trial 2 OK](../../PROJECT_V7/reviews/V7_GENERIC_EXECUTION-plan-2_reviewed_OK.md)
   and disclaims runtime implementation, implementation acceptance,
   integration, promotion and release.

5. **A/0/04 copies carry no independent implementation approval.** Both
   copied checkpoints are byte-identical to the corresponding files in
   `workspace/clones/wt-v6-a04/plan/PROJECT_V6/reviews/`. Their SHA-256 values
   are `8991fc61cd6d5721d4a78643c2572d202508cd6bef50dd180addb90360ad726f`
   for checkpoint 1 and
   `b32353e97ff90d15a204fd38524d04b352824436fd5c74212d684131edf02162`
   for checkpoint 2. Each explicitly labels coder observations, unfinished
   acceptance and missing independent review/full gate/live provider evidence.
   Their publication and index links do not approve the candidate runtime.

The documented sibling launcher, AO-local overlay and isolated startup limits
match the earlier operator decision and independent A/0/02 verdict. This
review does not reverify current private configuration or mutate that launcher.

## Independently executed documentation checks and limits

| Check | Observed result |
|---|---|
| Base/tree type, changed-path set and every manifest/tree/checkout blob | PASS; exactly 13 Markdown paths, no unbound candidate changes |
| Relative Markdown file targets in the 13 candidate documents | 203 checked, 0 missing; heading anchors and external URLs not assessed |
| `git diff --check 7df29bda06aa3a139903dbb0cfc61860029f8159 b598b112c8c120f20552a9ef4fc67329e4b5ece1` | exit 0; no output |
| `python3 scripts/ci_gate.py --validate-only` | exit 0; no errors; 0 executed tests |
| `python3 scripts/check_public_hygiene.py --repo-root .` | exit 0; 0 findings on checkout publication inputs |
| A/0/04 source checkpoint comparisons and ref/ancestry checks | PASS as recorded above |

No implementation tests, new full gate, real provider, Claude session or
sub-agent was run. Runtime claims were mapped to prior bound evidence; they
were not newly accepted. This reviewer wrote only this new immutable verdict,
with no candidate/index edit, policy change, staging, commit, merge, tag or
push. Root owns verdict indexing, artifact persistence and the authorized
status-documentation commit. This OK grants no promotion or release authority.
