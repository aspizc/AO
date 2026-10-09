# A/0/06 live-fix — trial 2 coder handoff

Candidate: uncommitted worktree on `feat/V6-A-0-06-live-fix`, HEAD `62ae22edbd8dcea85ae360ef8ff7824fbb9a3b1d`. Status: implemented; independent implementation verdict pending. No integration, promotion or release claim.

Contract: `A_0_6-livefix-1_reviewed_KO.md`, corrections 1–3, and `a06-livefix-coder-2.md`. Approved design remains SHA-256 `a9cfbae2e5bc262f202393ddec8f11fce90ce7e4518c1e425524cb7ef7ce9862`. Trial-1 request, verdict and evidence are unchanged. This handoff supplements their F1, diagnostics, binary and prior gate evidence; it does not rewrite them.

## Corrections

1. Added `pending-wrap unknown menu remains human-only without input` in `tests/gateway/session_prompt_diagnostics.test.js`. It uses the existing unknown menu and actual fixture geometry 80|24|80|23, asserts kind unknown, then calls assertRefusal with unknown_prompt/human_intervention_required. The shared assertions check returned and durable detail, terminal audit, zero input/submit/send-keys, cleaned evidence, no answered event and no authority rearm.
2. Added `pending-wrap approved capture replaced by nonprompt refuses at capture binding` in the same file. It uses the byte-faithful live pending-wrap command pane, fixture geometry 80|24|80|23 and the exact requested save-buffer interception returning shell ready output. It asserts initial kind command and capture_mismatch through assertRefusal. Equality must pass geometry checking so refusal comes from capture binding.
3. Added the pending-wrap contract immediately after the agents-submit-v1 paragraph in `gateway/README.md`: observed x=width accepted, x>width and y>=height refused, exact live cursor/grid/identity re-verification retained, geometry never grants recognition/approval, composer x<width retained.

No source, vendor patch, binary, runtime pin or composer bound changed. Only those two test/doc files, new trial-2 logs and this request were written. All preexisting files outside the two authorized paths were checked against start-of-trial SHA-256 values, including every trial-1 file. No commit, sub-agent, self-review, policy edit, rebuild or scripts/ci.sh execution.

## GREEN and named scratch mutations

`new-tests-green`: both new tests GREEN (2 passed, 0 failed/cancelled/skipped; exit 0). `mutation-control` independently runs both tests in the scratch tree: 2/2 GREEN, exit 0.

`mutant-delete-unknown`: in `/tmp/a06-trial2-mutants` only, deletes `binding.prompt.kind === "unknown" ||` from session_prompt_service.js. The unknown-menu test is RED (0 pass/1 fail, exit 1), with actual reason guard_refused versus required human_intervention_required. This is the named semantic failure required by correction 1, not a harness startup failure.

`mutant-revert-x-bound`: in scratch only, changes the prompt geometry x comparison from > to >= in session_prompt.js. The approved-capture-replaced test is RED (0 pass/1 fail, exit 1), with actual geometry_unavailable versus required capture_mismatch. This proves correction 2 reaches capture binding only when equality is accepted. Both scratch source files are restored after the run; no candidate source was mutated.

The mutation logs include exact commands, scratch path, source hashes, the one-change diff, selected binary hash, output and exit. No production implementation was needed for these tests; the reviewer requested coverage of existing candidate behavior and these named regressions. This is coder evidence, not an independent verdict.

## Focused gates and runtime

Canonical binary: `/tmp/a06-runtime-bin/tmux`, symlink to `/home/carase/git/personal/AO/workspace/tmux-pinned/a06-impl-1-A/tmux-3.6a-agents.4-linux-amd64`; SHA-256 `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`, unchanged. Trial-1 clean builds, cmp and rebuilt-C mutation evidence remain valid for the unchanged vendor/source candidate.

Runs set A04_TEST_TMUX to that binary, D007C_TEST_TMUX_PATH to its directory and D007C_RUN_REAL_TMUX_PROBE=1; remove inherited AGENTS_*/TMUX*/A04_*/D007C_* test variables and put the pinned runtime/AO venv on PATH. Node tests run outside the sandbox with supervised command approval. Exact commands and executable hashes are recorded in logs.

- Focused rerun (`focused`): 528 tests, 528 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo. Includes the prior 11 focused files plus claude_first_prompt.test.js, matching the reviewer's lane coverage, including real .4 guards/relay probes and all three pending-wrap watcher kinds.
- `git diff --check`: exit 0, logged in `diff-check` together with byte-preservation verification.
- Full npm suite and lint were not rerun in this narrowly scoped trial. Trial-1/reviewer full npm evidence remains 2201 tests, 2157 pass, 25 fail, 19 skip, exit 1; this is RED and is not waived. The reviewer attributes all 25 failures to registry/gateway/policies paths. Required Redis/Postgres lanes and host skip-budget evaluation remain unverified here.

## Non-blocking notes and design completeness

No optional test/doc additions from notes 1–5 or 7 were made: this trial makes exactly the three required corrections. Note 8's identity clarification is reflected by recording current HEAD above and keeping the committed trial-1 trail immutable. Note 6's preexisting lint coverage and temporary-directory cleanup issues remain out of scope.

Explicit remaining design items: the C primitive fixture still does not render a recognized menu above its pending-wrap row (literal §5 construction); the real watcher tests already render all three recognized kinds, and the reviewer marks the primitive addition optional. A separate Node cursor-only stale test is still absent; real-tmux BS/LF/RI tests and reviewer rebuilt x/y deletion mutants cover it. The optional behavioral relay .3-refusal test remains absent (exact version/source-regex evidence retained). Optional runbook executable-hash/no-replay instructions, vendor README platform-scope text and operator diagnostic-stage documentation were not added in trial 2.

All three required KO corrections are now implemented. Host-owned full CI/required services and operator live acceptance remain outstanding acceptance work: fresh .4 trust, short/wrapped/pending-wrap command prompts and denied/no-grant/changed/replay cases, `/proc/<server pid>/exe` hash and marker/stored/audit agreement. No live provider success or running-server hash is claimed. Cutover stays manual only with no sessions live; .4 fails closed against .3 without automatic restart. AO 1.1.0 .4 scope stays linux/amd64 only, Darwin excluded. Nothing here grants integration or release authority. Re-review requires a fresh trace and independent reviewer session.

## Updated file SHA-256 values

These replace only the two corresponding candidate rows from trial 1. All other candidate files retain their trial-1 hashes.

| File | SHA-256 |
| --- | --- |
| `tests/gateway/session_prompt_diagnostics.test.js` | `6377c7caf57672ee30a619b6a24509bf92b4623ea712391dcef2f0b16b53a654` |
| `gateway/README.md` | `e4640d68c1066204fb60da064ce48f93d4cb986a47996c57f7dd612606d51a65` |

## Trial-2 evidence SHA-256 values

| File | SHA-256 |
| --- | --- |
| `A_0_6-livefix-2-diff-check.txt.gz` | `88fd4bbb27c88863b81afb89a66105a850ae7ffea233e40c5007a06de396336a` |
| `A_0_6-livefix-2-focused.txt.gz` | `56d41a07d0df84dd7265226fdc9f5a6edd27a3d289a7aac89bbe3fdccaa85e16` |
| `A_0_6-livefix-2-mutant-delete-unknown.txt.gz` | `aba330f383199cf8f6f018a979dd35d4489aca9dd5a8623b807bdd7486974f39` |
| `A_0_6-livefix-2-mutant-revert-x-bound.txt.gz` | `08830aec1c79819050da7dbd244fb1c65fa063a8c507ff097a682d9ef18b9a56` |
| `A_0_6-livefix-2-mutation-control.txt.gz` | `46e43f72d0fe4b327c4cb557d7671953d60d164cc0ddba4c9d30639730b93e79` |
| `A_0_6-livefix-2-new-tests-green.txt.gz` | `f175a0b6b936a598adfe20add5be476d2ab0b93337480171987648ff23dc270d` |
