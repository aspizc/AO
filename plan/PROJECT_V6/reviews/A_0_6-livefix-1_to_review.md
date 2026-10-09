# A/0/06 live-fix — complete trial 1 coder handoff

Branch: `feat/V6-A-0-06-live-fix`. HEAD: `5ae13b4dbce9853ac8aafa956159fa61cc0eadcc` (approved design verdict); original live-fix base `1248f68bd848ec79ce6673c9f86aa6cc46620e77`. Candidate: uncommitted working tree plus the new vendor patch and fixtures identified below. Status: F1, diagnostics and pending-wrap F2 fix implemented; independent implementation review and host-owned full CI/live acceptance remain pending. This is coder evidence, not a verdict, integration, promotion or release.

Authority: `a06-pendingwrap-impl-1.md`, design SHA-256 `a9cfbae2e5bc262f202393ddec8f11fce90ce7e4518c1e425524cb7ef7ce9862`, and `5ae13b4:plan/PROJECT_V6/reviews/A_0_6-pendingwrap-design-2_reviewed_OK.md`. All eight implementation notes apply. The stale design sentence about the trial-2 request's pre-decision hash is superseded by that verdict's reviewed identity; no design/review verdict was edited here. Operator cutover/platform decision: `6212f72:plan/PROJECT_V6/reviews/A_0_6_pending_wrap_cutover_decision.md`.

No commit, push, sub-agent, self-review, policy write, capture-extension change, composer-bound change, builder-logic change, CHANGELOG/ci-directory edit, `scripts/ci.sh` execution or production server restart. `.github/workflows/ci.yml` changes only the designed binary-output pin. No live-provider success is claimed.

## F1 — observed cause and correction

The base recognizer tests the persistent option against exactly one pane row.
The captured `command-prompt.txt` splits that option after `/home/carase/`,
with the rest and `(p)` on a five-space-indented continuation row. Therefore
its single-row persistent check fails, and the expected two-option denial
row does not match. The final-fixture base test observes `null` rather than
the required command recognition.

The correction consumes only five-space-indented, nonblank continuations of
an unfinished backtick-delimited `commands that start with` option, requires
its complete closing backtick and `(p)`, and adjusts the denial row index.
All existing command, context, selected first option, denial and footer
checks remain. Command rows retain their rendered line breaks. The transport
is unchanged: only a one-time guarded CR is sent, never `p`.

RED test: `live Codex 0.162 persistent option wraps without changing exact command or selecting p`.
`A_0_6-livefix-1-verified-f1-red-final.txt.gz`: base recognizer, final tests,
1 pass / 1 fail, exit 1; failure is the recognition assertion.
GREEN: `A_0_6-livefix-1-verified-f1-green.txt.gz`, 3/3, exit 0.
Tests also cover three-row wrapping, exact command output, one send across
repeated observations, malformed indentation, blank continuation, missing
closing backtick, altered key, injected continuation, denial number,
unselected menu, command indentation and unexpected footer.

Every new/changed control predicate has a deletion or weakening check in an
isolated scratch tree with a passing control. The five `verified-mutant-*`
logs each report 3 pass / 1 fail, exit 1: delete the start check, remove the
continuation loop, weaken its indentation, delete the complete-option check,
and restore the old denial-index expression. These are coder mutation
checks, not independent review.

The F1 fixtures copy the operator-saved pane files. The wrapped fixture
replaces `/home/carase` with equal-length `/home/tester`; other saved bytes
and row breaks are preserved. The short fixture matches `detect-snap.txt`.

## Diagnostics — implementation and historical TDD

The follow-up 1b stage reporting remains implemented. Historical evidence below describes that addition before pending-wrap implementation; it does not supersede the new cause-specific RED/GREEN and gate results later in this request.

### Diagnostic addition

`answerSessionPrompt` sets a fixed stage before each existing pre-attempt
check or operation; its existing catch/outcome behavior is unchanged. The
approval-bound authorizer supplies its finer fixed stage through an internal
callback. The stage is passed with the outcome to the existing finalizer,
which stores `promptAnswer.detail` and puts the same detail in the terminal
`SESSION_PROMPT_ANSWER_ATTEMPT` event. Unknown-menu and initial policy refusal
also receive a fixed stage without changing their original reasons.

The stage is cleared immediately before the atomic input attempt. Successful
answers and atomic guard refusals therefore have no pre-attempt stage. No
keys, outcome values, reasons, CLI exit rules, policy rules, consumption CAS,
write-ahead audit ordering, cleanup or guard predicates were changed. There
is still no `p` input. Only literal stage identifiers enter `detail`; no
pane, command, path, transport stderr or exception message is used as a code.

| Stage | Existing refusal/check identified |
| --- | --- |
| `invalid_response` | Invalid one-time response or authorizer |
| `transport_unavailable` | Runtime version/guard command availability |
| `target_unavailable` | Initial target state/identity |
| `geometry_unavailable` | Initial geometry and numeric constraints |
| `evidence_unavailable` | Evidence capture/save/decode |
| `state_changed` | Identity or geometry recheck |
| `capture_mismatch` | Transport or authorizer exact captured binding |
| `authorization_refused` | Fallback for a false/throwing authorizer without its own stage |
| `recognizer_mismatch` | Current recognition differs from approved recognition |
| `approval_not_granted` | Authorizer's latest decision lookup/status |
| `approval_binding_mismatch` | Approval trace or action differs |
| `session_not_live` | Session/task/trace liveness at authorization |
| `policy_denied` | Initial or authorization-time role/policy rejection |
| `payload_mismatch` | JSON parse or exact payload binding |
| `consume_lost` | Approval consumption fails or loses its CAS |
| `audit_failed` | Write-ahead attempt audit fails |
| `unknown_prompt` | Initial unrecognized menu refusal |

No valid permit means there is no bound terminal answer to enrich; the
existing false return and lack of input/audit authority remain. Existing
nonterminal watcher returns and session invalidation semantics remain.
Diagnostic reporting still depends on the existing terminal CAS and audit
write succeeding; this change does not repair state/audit failure.

### TDD and assignment deletion evidence

New file: `tests/gateway/session_prompt_diagnostics.test.js`.
The stage tests are named `pre-attempt diagnostic <stage> persists and audits
the exact stage without input`, with separate tests for the authorizer's
capture check, write-ahead audit failure, low-level invalid response/fallback,
and initial unknown/policy refusal. They assert the returned and stored
`detail`, exact terminal audit detail, unchanged refusal status/outcome/reason,
zero input and atomic guard calls, cleaned buffers, no answered audit and no
retry. The invalid-response/fallback tests observe the low-level outcome
callback directly; those stages cannot be issued by the normal watcher.

RED: `A_0_6-livefix-1b-red.txt.gz`: 17 failures / 1 passing successful-delivery
control, exit 1, before diagnostics implementation. The failures are exact
missing-stage assertions. Initial unknown/policy RED was captured separately
before restoring their assignments: `A_0_6-livefix-1b-initial-refusal-red.txt.gz`,
2 failed / 0 passed, exit 1.

GREEN: `A_0_6-livefix-1b-green.txt.gz`: **21/21**, exit 0 (19 refusal diagnostic
cases and 2 success/attempted-refusal controls).

`A_0_6-livefix-1b-mutations.txt.gz` records **23 deletion mutants, all RED**,
against 21/21 GREEN controls before and after restoration. Every adapter stage
assignment, every authorizer stage assignment (including its independently
exercised capture check), the two initial refusal assignments, the stage
callback assignment, durable/audit detail assignments and success clearing
are individually deleted. All 21 tests execute in each case; no harness
startup failure counts as mutation evidence. The source guards are not
mutated by this diagnostic check. Candidate source remains unchanged.
Runner: `/tmp/a06-livefix-1b-mutations.py`; scratch:
`/tmp/a06-1b-mutants-fb0xncep`. These are coder checks, not an independent review.

## F2 — observed root cause and approved .4 correction

The operator's live attempt 2 (`9d9119f:plan/PROJECT_V6/reviews/A_0_6-operator-live-2.md`) recorded `geometry_unavailable` with `1926680|%0|1926681|80|24|80|23|0`. The saved command pane is byte-identical to `codex-0.162-pending-wrap-command.txt` (SHA-256 `d6328f9116c3af6c8bba4f0ebf231e2ae0b0b1ea4b51b7f400c51f51ad4d4fd1`). Unlike the earlier inference from consumed=true, this evidence identifies the JS geometry refusal. The retained .3 binary also refuses the actually observed equality at its C guard, as the new raw-byte RED shows.

The active patch is renamed to `tmux-3.6a-agents.4.patch`. Against the .3 patch at `bbab86b`, exactly old line 42 changes the version suffix and old line 191 changes `cx >= width` to `cx > width`. The isolated-index `git diff -M` shows the rename and two changed lines; no shared Git index or commit was created. Patch hash: `785a1df2c91e05448a60d69b1ae8fab52f2f3088bc730be3b74da678e7ebd02d`.

The JS session-prompt x comparison changes to `>`; y remains `>=`. Integer syntax/ranges, exact live x/y, PID/dimensions/grid binding, unread/unparsed-output, mode/input/synchronization/framing checks and single direct CR remain. There is no cursor normalization, extra key, send-keys fallback or .3 fallback. The capture extension remains SHA-256 `4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`. The composer receives only the exact .4 version-pin change and retains its strict x<width bound.

The manifest, both offline builders, active documentation, CI output path and named test/runtime fixtures now pin .4. Builder changes are only digest/filename/version/output substitutions. The retained .3 artifacts remain versioned outside the active vendor package and in Git history. No hot upgrade occurs. `docs/tmux-runtime.md` is the manual-cutover runbook: operator restart only when no sessions are live; no automatic restart; until cutover, prompt answers, composer submits and retained handshake fail closed against .3. AO 1.1.0 .4 claims are linux/amd64 only; Darwin is excluded until a native build exists. Updated Darwin pins are not platform evidence.

Equality can follow last-column writes, LF/RI, alternate-screen shrink or main-screen reflow. Cursor provenance is binding metadata, not approval authority. The actual x>width state after alternate-screen shrink is reachable; the retained C range predicate is load-bearing even when all exact binding fields match. Constructed fixtures prove tmux behavior, not Codex's exact output sequence. Only a new operator live run can close provider acceptance.

## Pending-wrap TDD and mutation evidence

Logs use `A_0_6-livefix-1-*.txt.gz` in this review directory; each run log includes its exact command, exit and selected executable SHA-256. All mutations use scratch copies, never candidate source. Negative assertions check emitted calls/bytes, not fixture declarations.

- `pendingwrap-node-red-unsandboxed`: 205 tests, 193 pass / 12 fail, exit 1, before production changes. Equality tests fail on not_answered/geometry refusal; .4 composer cases fail on the old runtime pin. Boundary/nonprompt controls pass. The first `pendingwrap-node-red` sandbox run failed at test-worker startup and is VOID as behavioral RED.
- `pendingwrap-c-red`: retained .3 binary, 6 tests, 3 pass / 3 fail, exit 1. Named test `real tmux pending-wrap guarded submit delivers exactly one CR for the bound observed cursor` fails on C refusal (status 1 rather than 0), not a .4 pin assertion. LF/RI current-cursor controls also fail at equality delivery; BS and invalid boundary refusals pass.
- `pendingwrap-node-green`: 205/205, exit 0. Pure Node mocks, not real-binary evidence. The observed `80|24|80|23` now resides in fixture pane state; the mock consumes buffers and enforces exact PID/target/dimensions/cursor/grid binding. Equality forwards -c 80/-l 23 unchanged. x=81 and y=24 assert geometry_unavailable, no submit/send-keys and no attempting audit; old .3/stock/prefix .40 are refused. A width-equality nonprompt has no capability or input.
- `pendingwrap-c-green`: 28/28, exit 0, canonical .4. The raw/noecho child observes one 0d without cursor reset; output CR resets x=0 at unchanged y, and a subsequent printable consumes wrap. Real alternate-screen shrink observes x=81 and x=90 at width 80, submits freshly bound metadata/grid, and refuses with consumed buffer and zero additional input; no-shrink controls deliver. BS changes only x; interior LF/RI change only y at x=width; stale binding refuses while current-cursor controls deliver with an unchanged grid. Invalid x=width+1/y=height refuse. Command/trust/permission watcher fixtures genuinely render x=width and receive exactly one approved CR; changed captures and replay remain no-input. Private foreground owned servers are retired/reaped by the existing helper.
- `pendingwrap-node-mutants`: canonical 205/205 control. JS x deletion and widening to >width+1 each fail 2 boundary-stage tests; reversion to >= fails both equality tests. Composer x deletion and >=→> relaxation each fail all six ready/guard observations across general Codex, pi and opencode. Empty-text rows isolate the bound, and each width-minus-one control reaches load/paste. Node mocks change values directly; LF/RI/BS techniques belong to real-terminal tests.
- `pendingwrap-mutant-delete-range`: 0/2 pass, both resize tests catch additional 0d bytes. `pendingwrap-mutant-widen-range`: 1/2 pass; x=81 catches extra input while x=90 refuses, demonstrating why width+1 must be tested.
- `pendingwrap-mutant-revert-range`: .4 version with old C >= predicate, 3/6 pass, RED on the same equality delivery refusal as .3. `pendingwrap-mutant-delete-cursor`: 0/3 pass; BS, LF and RI drift each deliver forbidden 0d when exact cursor checks are deleted.

The pin searches and exactly-two-line rename, clean-build cmp, unchanged extension hash, all mutant patch diffs and builder-copy diffs are recorded in `pendingwrap-provenance`. Mutant copies differ from the canonical builder only in the patch digest; canonical filename/version/output pins remain .4. The patch/command structure remains 7 diff headers and 12 hunks. These are coder checks, not independent verdicts.

## Binary provenance and reproducibility

Pinned archive SHA-256: `b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759`. Pinned offline image: `node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9`. Builds use preexisting image, --pull never, --network none, zero-fuzz patch and generated-parser equality. Each Docker/build command was separately submitted for supervised approval outside the sandbox. No reviewer scratch binary was reused as implementation evidence.

Build directories are `/home/carase/git/personal/AO/workspace/tmux-pinned/a06-impl-1-<name>/`; each contains `tmux-3.6a-agents.4-linux-amd64`. A and B are two independent clean offline builds; `cmp` exit 0, byte-identical. Their hash also matches the earlier independent design-review build, but this handoff relies on its own A/B evidence.

| Binary | Full SHA-256 | Evidence use |
| --- | --- | --- |
| Retained .3 | `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386` | C RED and rollback identity |
| A | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` | Canonical C GREEN, focused/gate tests |
| B | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` | Independent clean build/cmp |
| delete-range | `e0c69ef87c78759b57ca31c0727a413bc1106950a281a6425bb7e1f8b78932a3` | Range-deletion mutation |
| widen-range | `7682e067df266e3f2358306b68a4b138540cfcbaf546dad9d02842896f4be730` | Width+1 mutation |
| revert-range | `fc8202fd4c0aba9df20508234ddfe44e21229c4eb863eedfcaac205671b3b41f` | Equality-delivery RED on .4 |
| delete-cursor | `d645e1df0380f013ac0f7203640a799e9d4483072353da1d8022583dc8a05762` | Exact cursor-binding mutation |

The corrected probe PATH uses `/tmp/a06-runtime-bin/tmux`, a test-only symlink to build A; A04_TEST_TMUX selects that file and D007C_TEST_TMUX_PATH its directory, with D007C_RUN_REAL_TMUX_PROBE=1. Hashes are recorded per run. No running live-provider server was measured here; `/proc/<server pid>/exe` hashing remains required for the operator's live acceptance, along with marker/stored/audit agreement.

## Required gates and limits

Environment: Node 22.22.1, clean inherited AGENTS_*/TMUX* test variables, AO Python venv on PATH, canonical .4 test-only tmux symlink. Exact commands are in the logs. No skip is counted as a pass.

| Gate | Result |
| --- | --- |
| Focused Node lanes, `pendingwrap-focused-pinned` | 485 tests; 485 pass, 0 fail/cancelled/skipped, exit 0 |
| `npm --prefix gateway test`, `pendingwrap-gateway-pinned` | 2201 tests; 2157 pass, 25 fail, 0 cancelled, 19 skipped, 0 todo; exit 1 |
| `npm --prefix gateway run lint`, `pendingwrap-lint` | exit 0 |
| `git diff --check`, `pendingwrap-diff-check` | exit 0 |

The full npm gate remains RED. All failed titles and exact skip IDs/reasons follow and are also recorded in `pendingwrap-gateway-failure-index`. Registry-loading failures include npm's gateway working directory resolving policies beneath gateway/policies; no out-of-scope registry repair or policy edit was made. The corrected runtime-focused lane passes the retained/reattach probes. Required Redis tests with no AGENTS_TEST_REDIS_URL remain unverified; `infrastructure_unavailable`/conditional skips must be treated according to the host CI contract, not waived here. The host owns full CI, skip-budget evaluation and live provider acceptance; this brief forbids running scripts/ci.sh. No current RED gate is represented as release readiness.

Failure titles (final pinned full npm run):

- `not ok 9 - marker-bearing spawn result is accepted and returned with newSessionArgv (task-less)`
- `not ok 10 - marker-bearing spawn result is accepted and returned with newSessionArgv (bound)`
- `not ok 11 - service rejects missing newSessionArgv against the server-owned binding`
- `not ok 12 - service rejects nonArray newSessionArgv against the server-owned binding`
- `not ok 13 - service rejects nonString newSessionArgv against the server-owned binding`
- `not ok 14 - service rejects wrongCommand newSessionArgv against the server-owned binding`
- `not ok 15 - service rejects wrongTarget newSessionArgv against the server-owned binding`
- `not ok 16 - service rejects missingTarget newSessionArgv against the server-owned binding`
- `not ok 17 - service rejects duplicateTarget newSessionArgv against the server-owned binding`
- `not ok 18 - service rejects missing AGENTS_WORKER_ROLE newSessionArgv against the server-owned binding`
- `not ok 19 - service rejects wrong AGENTS_WORKER_ROLE newSessionArgv against the server-owned binding`
- `not ok 20 - service rejects duplicate AGENTS_WORKER_ROLE newSessionArgv against the server-owned binding`
- `not ok 21 - service rejects missing AGENTS_WORKER_TRACE_ID newSessionArgv against the server-owned binding`
- `not ok 22 - service rejects wrong AGENTS_WORKER_TRACE_ID newSessionArgv against the server-owned binding`
- `not ok 23 - service rejects duplicate AGENTS_WORKER_TRACE_ID newSessionArgv against the server-owned binding`
- `not ok 24 - service rejects missing AGENTS_WORKER_TASK_ID newSessionArgv against the server-owned binding`
- `not ok 25 - service rejects wrong AGENTS_WORKER_TASK_ID newSessionArgv against the server-owned binding`
- `not ok 26 - service rejects duplicate AGENTS_WORKER_TASK_ID newSessionArgv against the server-owned binding`
- `not ok 4 - ../tests/gateway/agent_service_write_access.test.js`
- `not ok 21 - ../tests/gateway/cli_write_access.test.js`
- `not ok 1243 - test_preflight_uses_canonical_selection_and_rejects_registry_drift`
- `not ok 1244 - preflight rejects unknown provider effort tier and repository/cwd mismatch without echo`
- `not ok 1245 - bounded stdin and missing SDK fail safely without config state`
- `not ok 1246 - presence probe respects the adapter executable binding without invoking it`
- `not ok 158 - ../tests/gateway/worker_env.test.js`

Skip IDs/reasons (final pinned full npm run):

- `ok 567 - required Redis 7 lane serializes repeated equal and conflicting sends # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 568 - required Redis 7 lane fences replacement, failure, reclaim, and ACK races # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 604 - Redis ACK is atomic, retry-bounded, recipient-scoped, and frees capacity # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 605 - public service ACK accepts multibyte optional IDs at the UTF-16 boundary # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 632 - persistent Redis lanes reuse connections and bounded close cancels a live block # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 645 - late metadata XADD failure cannot partially register or unregister presence # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 658 - Redis receive reclaims, post-fences blocking reads, and rejects deleted pending IDs # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 667 - Redis send preserves dedupe, backpressure, and best-effort metadata # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 744 - two independent services coordinate end to end through Redis 7 # SKIP AGENTS_TEST_REDIS_URL is not set`
- `ok 1090 - live postgres repository contract: create and read repository aggregate # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1091 - live postgres repository contract: status updates report one changed row # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1092 - live postgres repository contract: foreign key violation fails # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1093 - live postgres repository contract: policy decisions are append only # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1094 - live postgres literals round-trip adversarial strings # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1095 - live postgres literals preserve NULL separately from string null # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1096 - live postgres literals support named and positional params # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1097 - live postgres reports changes for insert update and delete # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1098 - live postgres rejects non-finite numeric literals before execution # SKIP set AGENTS_PG_INTEGRATION=1 (or legacy AGENTS_TEST_DB=postgres) and provide psql plus a reachable Postgres`
- `ok 1948 - required Redis lane leaves no test coordination namespaces behind # SKIP AGENTS_TEST_REDIS_URL is not set`

## Evidence validity and remaining work

`pendingwrap-focused` and `pendingwrap-gateway` are superseded setup runs: the versioned build output had no executable named tmux in the bounded probe directory, so some lanes picked host tmux 3.6. They are not current gate evidence. The first focused setup run also named the nonexistent external-response filename; `pendingwrap-focused-pinned` uses the real session_prompt_external.test.js and supersedes it. Its 485/485 result is the current focused evidence. The corrected full npm run is current and its failures remain visible.

Original F1 unprefixed/isolated scratch logs are VOID where source/contract/migration resources were missing; only the historical verified-* F1 logs count. Original 1-* / 1b-* gates are historical and superseded by current pinned gates. The valid 1b mutation log and diagnostic RED/GREEN remain historical evidence of diagnostics. The original 1c RED captures the observed pending-wrap blocker and is superseded for the final bound fixture by the new RED/GREEN logs. No earlier evidence artifact was overwritten; this trial handoff rewrite is expressly authorized.

Both pin inventory searches were rerun at the candidate. Outside plan/review history, full-version .3 matches are the dated docs/project-status.md observation and deliberate old-runtime refusal fixtures; bare suffixes are deliberate README refusal and manual-cutover prose. New matches introduce no active .3 runtime allowance. Historical plan/review snapshots stay unchanged.

Still required outside this coder brief: independent implementation verdict, host full CI with required Redis and exact skip budget, new operator live acceptance (trust/short command/long wrapped command/pending-wrap, denied/no-grant/changed/replay cases), running-server executable hash and exact approval/audit/marker evidence. Manual operator cutover and linux/amd64-only release scope apply. Do not replay consumed/uncertain approvals on cutover or rollback; reobserve and obtain fresh bindings. This candidate is not integrated, promoted or released.

## Every changed candidate file and SHA-256

Relative to HEAD, including inherited F1/diagnostics and new fixtures; deleted-path hash is the baseline bytes. The handoff itself is excluded from its own recursive digest table. Evidence hashes are listed separately below.

| File | SHA-256 |
| --- | --- |
| `.github/workflows/ci.yml` | `2a777697937febd1261d5eaa5684226fcc9bf0a31bdec640dbcbbab5f2518a38` |
| `docs/tmux-runtime.md` | `dd9a958412db1bf3ec272226dbeece0a2168903d0be14fe5ceda2090e0c7f308` |
| `gateway/README.md` | `7ef34d00136ad8068de8a4a78d6b6a8cea129de21c14acf0e0ca87cb2e942ef9` |
| `gateway/src/adapters/base_adapter.js` | `90abf434a0a922ca0f73f28071615c52d10457629510a25e7f41a3ff550fd382` |
| `gateway/src/adapters/codex_adapter.js` | `4f89c1087c5b635211f3dbbe4f55be59fa1302ac5424c000b6f93ec4e10b2720` |
| `gateway/src/adapters/process_supervisor_helper.py` | `793251987c1690abf6946fe56a2ecdb0083972f138a9d4a5df226b1970e3a51a` |
| `gateway/src/adapters/session_prompt.js` | `80aec89fd133bf29ddf4e4d9fb9a44072691a7257a26bb1ae278c72a4efd5439` |
| `gateway/src/services/session_prompt_service.js` | `4e25fbf784d53a7682cae14c03360e26042825744c3ba2fdc3543026c853374d` |
| `gateway/vendor/tmux-agents/README.md` | `b06af11ed44c0293fc0b1c4773b86f8cd183878f34474cc899ff594bb74ef1c2` |
| `gateway/vendor/tmux-agents/build-offline-darwin.sh` | `48228cae9f2fcddae5b5c020c2359c8329f79b0d3d92e1763cac6c0f793a8d3c` |
| `gateway/vendor/tmux-agents/build-offline.sh` | `1de93be58bb9c99ea218e2a02f45ef63a6da649518267128a41ad3668b2814c2` |
| `gateway/vendor/tmux-agents/manifest.json` | `e77ed2ce83371aa0cfd922aa3b5521d81fcabe890c619e839a4e79c6ff1b870f` |
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.3.patch` | `e8139a40bc2badcc95475d003158906444d2b33a7ad8553dcae1e9371b97955d (deleted; baseline)` |
| `tests/gateway/claude_first_prompt.test.js` | `ec2e84bf33038afc475f150014c1738b6dc95deae2c670184ff2869ce8fcd8fc` |
| `tests/gateway/guarded_paste_fixture.py` | `ea5b0edcbdf4df09683d99a996b3e45c78a1741b87c9f4389bb8e64373dd0825` |
| `tests/gateway/guarded_submit.test.js` | `4394e8acf7e2f720aa7bd77af4676dacbdf0fc46f572c73a0c33380504fd45cf` |
| `tests/gateway/process_supervisor_session_port_fixture.py` | `0a5342944aa65cb6f8f579716f06174e27b5b7dd8bd3bf4e9442bad63b82a6c7` |
| `tests/gateway/process_supervisor_session_port_relay.test.js` | `1f5ff99a4c4d6e51148fed362640e2629656154e5ff7b48a57343087112db1f5` |
| `tests/gateway/prompt_submission.test.js` | `e0009c04f6997f747942ec7e407142a318f08b6453f624277d476a11d12887e7` |
| `tests/gateway/request_context_reattach.test.js` | `06a6f48fa42f765a919e29a401c031743fe59e4d565a76b59d74000c1c5a2a7e` |
| `tests/gateway/session_prompt.test.js` | `cbc6ddd6a46bc0492f0c6a97b3573bc175fbe3ccd9ef497928e7d6514117bc83` |
| `tests/gateway/session_prompt_guard.test.js` | `fefc71783601850f3995e4cc26fbcd6ef26d90ccc44f3e0eee862472cb6b33be` |
| `tests/gateway/session_prompt_race_fixture.py` | `470e3cef6e4bcf9aedad9a3242d60a47b8e9ee490a83c2338dc1281bd44972b8` |
| `tests/gateway/session_prompt_transport_fixture.js` | `83424aac1aa0131e3652bfb6af6230dfd9e1a65eddc50bf6fa803273d1db1be4` |
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.4.patch` | `785a1df2c91e05448a60d69b1ae8fab52f2f3088bc730be3b74da678e7ebd02d` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-command.txt` | `195fc0cd6087d0ff44d4e1714c99a0bfd138f9779ae27b9b6e9539f6ccc85dfa` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-pending-wrap-command.txt` | `d6328f9116c3af6c8bba4f0ebf231e2ae0b0b1ea4b51b7f400c51f51ad4d4fd1` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-wrapped-command.txt` | `499ad0532bcfe00896ea2b9b86f0091a4eccc6467698d6dc837f2cd8c4daf584` |
| `tests/gateway/session_prompt_diagnostics.test.js` | `30c9468517d9ef9466db29ac926cd0b9c534ff06705990c2db0ecc3b8ccff76c` |

## Immutable evidence artifacts (SHA-256)

Validity is governed above; retention alone is not a pass.

| File | SHA-256 |
| --- | --- |
| `A_0_6-livefix-1-build-A.txt.gz` | `b61e4b33b8fc6351a991f05fc0c0fab3267a39c97363c3791e4658576f49fefa` |
| `A_0_6-livefix-1-build-B.txt.gz` | `20a6778101d3d5704fc124cd027d34a19f47528dc71b8b172d33ea51473b432a` |
| `A_0_6-livefix-1-build-delete-cursor.txt.gz` | `57cee1e4b8450bbcbf58041197e224147ab89957187f17b6f744cbbda36c3801` |
| `A_0_6-livefix-1-build-delete-range.txt.gz` | `6ba54d6843ceff221fa889caf386e4f84f30af0ffd6639bc0e101346bb92d842` |
| `A_0_6-livefix-1-build-revert-range.txt.gz` | `2c5498ebb33b9fcf5bff3a9e2e1d035890f9529d32489bad7d88eaf1eb6cf9b0` |
| `A_0_6-livefix-1-build-widen-range.txt.gz` | `a83234f829161986057536ec101272827520bd34346067ba711489913e980c1c` |
| `A_0_6-livefix-1-diff-check.txt.gz` | `b6c6847097ba3fbdbcbaef5c8e8d3564ea6785de0dc2fe4eb951e5b7e518cdb1` |
| `A_0_6-livefix-1-f1-green.txt.gz` | `503bde45439e931da667a642fb0793541d3c63f7a3d80d36721a5c6c1c491a39` |
| `A_0_6-livefix-1-f1-red-final.txt.gz` | `c5853b895eb28b7c129d3ead2842d5c5ce9603856d05532c8782b0960c78198e` |
| `A_0_6-livefix-1-f1-red.txt.gz` | `3e9d23e864f7d61d9e184bb866c6ce1b38828f5f6d51998de915dc1f98e6d3f9` |
| `A_0_6-livefix-1-f2-base-replay.txt.gz` | `7e7f550bfd9708885f714ac007816cb591bb84c46a71fdaae23973467a8f2ecb` |
| `A_0_6-livefix-1-final-diff-check.txt.gz` | `602e5bf76567363f0103566fb3040301c98517e898c080d43b8671af33937346` |
| `A_0_6-livefix-1-final-focused.txt.gz` | `e66762e10707a18472c308c3b93e1b39d21ec650236b96f5e7b4afaaac077f66` |
| `A_0_6-livefix-1-final-gateway.txt.gz` | `be486e06a2dda71c249161060b6666b4b190bc5d3bb0f2cfaf1bcc844ae9dd1c` |
| `A_0_6-livefix-1-final-lint.txt.gz` | `7978023a7d758758fbfd2c133a71b0238a73b98fd605adee4d2324c036fdbece` |
| `A_0_6-livefix-1-focused.txt.gz` | `625b4d73d334db825d8de8355ccaa1a8f3ef0e6baa9eaf88cc4f149eb4f6caa5` |
| `A_0_6-livefix-1-gateway-failure-index.txt.gz` | `7a26f2274b935f2a430d10559267ab06cb8115071d016e191688959408ffcb76` |
| `A_0_6-livefix-1-gateway.txt.gz` | `2335e23f8f1ad25ef111d6c3268f2d0cebb1627e002cdcef236f81f1ff4b0bf8` |
| `A_0_6-livefix-1-isolated-f1-green.txt.gz` | `931c7eb6bbc1169898a9081f74c9338af6f926f216b5c3d6a8179c66136873f5` |
| `A_0_6-livefix-1-isolated-f1-red-final.txt.gz` | `55d5874c768d9137bdc78dec29deb35a10e72a2e2873ba60fca6a476c2268c2a` |
| `A_0_6-livefix-1-isolated-f2-base-replay.txt.gz` | `60a7caacd5e7f6ca7661292282308210f5c023e242660fc03b9d002952518994` |
| `A_0_6-livefix-1-isolated-mutant-delete-adjusted-deny-index.txt.gz` | `3103e5833e15819f4c2a3cab93b66ab678c2f36405eb52f87e15665abe468dc5` |
| `A_0_6-livefix-1-isolated-mutant-delete-complete-option-check.txt.gz` | `4ffbd9c48db0f8336790b45f59b16aaac655a5f17e9dae5fe40a4f926b77a053` |
| `A_0_6-livefix-1-isolated-mutant-delete-continuation-loop.txt.gz` | `3c6e688857520f88a87cbbda5d38daca90107da398f8a811eddcc2206f00fa70` |
| `A_0_6-livefix-1-isolated-mutant-delete-start-check.txt.gz` | `5990fe153b765d5004c57de27aec1f57e3a38d6c992c553b2a21b35b98ec309a` |
| `A_0_6-livefix-1-isolated-mutant-relax-continuation-indent.txt.gz` | `0a257a637ad903fb33185b0b167a1ed831618dfcbd3bf0ea5c09c4ab1459958c` |
| `A_0_6-livefix-1-lint.txt.gz` | `eaa48ab7334f3a3a0d84740ba194ccc0d04efe5c663e993f4a4fe38050867613` |
| `A_0_6-livefix-1-mutant-delete-adjusted-deny-index.txt.gz` | `feb947ef8bd23032de1dbfd49103127597bbf1aaa03d86e31c23503bc652bb8b` |
| `A_0_6-livefix-1-mutant-delete-complete-option-check.txt.gz` | `916c1468cc60f9ce5c3ceafd6f3be92673ec15ce10ab1fec3ff6edb0abd16669` |
| `A_0_6-livefix-1-mutant-delete-continuation-loop.txt.gz` | `91c1969af958c9e6d1739fb80c09e357b16a7ebcd69419f1b35fd97da121a642` |
| `A_0_6-livefix-1-mutant-delete-start-check.txt.gz` | `940ff04305fdc232507a20096f346ae06867a1e06b2d4fc8882e3ad9393a5251` |
| `A_0_6-livefix-1-mutant-relax-continuation-indent.txt.gz` | `e8f928d485f62dc045a5af038667eb619083e9f204950ef4d1bcea7991d98e44` |
| `A_0_6-livefix-1-pendingwrap-c-green.txt.gz` | `9381b859c3cafc521873810ab9bf3bb25e8c84a05652db82eb505e814e3e2772` |
| `A_0_6-livefix-1-pendingwrap-c-red.txt.gz` | `6c71c6620baec3cf485eb9a01a210b22b8dc80b6af9697579f285431806ee076` |
| `A_0_6-livefix-1-pendingwrap-diff-check.txt.gz` | `f8d7d01195a7e475ad8897fdd30e564ed697488be3dc120620f698d563cc7cbc` |
| `A_0_6-livefix-1-pendingwrap-focused-pinned.txt.gz` | `fcd84532ab6c58cc872bf10b9cbba3b85f98e1575593b87852dfbaac3d519a78` |
| `A_0_6-livefix-1-pendingwrap-focused.txt.gz` | `a757b9d946732de7dbc99590d014272ed802dc1ee055045053fc2f1314c9b6dd` |
| `A_0_6-livefix-1-pendingwrap-gateway-failure-index.txt.gz` | `449e4a54aca3e58a92755f330b29436e002a7260e669f3d51c3f64ba60392272` |
| `A_0_6-livefix-1-pendingwrap-gateway-pinned.txt.gz` | `7762989188bd9f1a8b43e79f2ab87f1f1ac311a41308a1da026bd5b71bafa13e` |
| `A_0_6-livefix-1-pendingwrap-gateway.txt.gz` | `07b736c545f5504f0f958bf73dbb8d3ad72a536995c6333983c068b04b072a73` |
| `A_0_6-livefix-1-pendingwrap-lint.txt.gz` | `835034ce43be77378e47764903b97f17e9239e62ddaca3e8fe9d5f46fa040251` |
| `A_0_6-livefix-1-pendingwrap-mutant-delete-cursor.txt.gz` | `249733410f6be8a64a856cfce1775f71718fd6ed39098c41eac1b688c81c18ce` |
| `A_0_6-livefix-1-pendingwrap-mutant-delete-range.txt.gz` | `dfe7b6e2e3cd942728d6f71addb66d9cf0a883f1441afdb0f0962cac5fa8a6ef` |
| `A_0_6-livefix-1-pendingwrap-mutant-revert-range.txt.gz` | `29fa07d2e09a9752d264b5126a548031990dee741067c5a1e6c9552eae13531a` |
| `A_0_6-livefix-1-pendingwrap-mutant-widen-range.txt.gz` | `28f118a50dc6273195d0a7e143f3a1503276b739ae17ed7821215d1cfba950f4` |
| `A_0_6-livefix-1-pendingwrap-node-green.txt.gz` | `88fac172fedaadf52eba731ee08512d05d4fa87ba58d30d26783d2b52339d0b7` |
| `A_0_6-livefix-1-pendingwrap-node-mutants.txt.gz` | `f383d007fe570e5002e9304cb2364d62ba7c216b1cb9558acdd97ebaf6801702` |
| `A_0_6-livefix-1-pendingwrap-node-red-unsandboxed.txt.gz` | `a9d119072cee191455a1196d663ac0d8e6ddd052b4dec14cba6372a4c8be99cf` |
| `A_0_6-livefix-1-pendingwrap-node-red.txt.gz` | `f72af3215616f9c48cdf7d524200cfd95ce2b5515f081b11acd14ac7c8974680` |
| `A_0_6-livefix-1-pendingwrap-provenance.txt.gz` | `e8908631330b2d50e4f2484fc3639d8b562c2bfc1003256140953cd7f1127b87` |
| `A_0_6-livefix-1-verified-f1-green.txt.gz` | `864666befb82eb37f281a290109380c5f0529fcbdd0ef960c93084a4c0d4feca` |
| `A_0_6-livefix-1-verified-f1-red-final.txt.gz` | `2fcef5798271707c533f05e8fa85461d24e75123fa1472973ed7b2b1a308cb5c` |
| `A_0_6-livefix-1-verified-f2-base-replay.txt.gz` | `cdefd9cb86948e66818324cfd5d92e838b40853bfd4162b1c94921c469a91353` |
| `A_0_6-livefix-1-verified-mutant-delete-adjusted-deny-index.txt.gz` | `ccd195373882780f307977f740469c0e1f0ceb9bee7303ec9eebdcbc22e05b39` |
| `A_0_6-livefix-1-verified-mutant-delete-complete-option-check.txt.gz` | `e13918d5725b7a7594ecf32f43fd4950f6a6c17ee6460120e96fd0d3471e3e4c` |
| `A_0_6-livefix-1-verified-mutant-delete-continuation-loop.txt.gz` | `37073ecea7ffb82788d9be0b5606ea7f9cf89203a3bed79c07fa445678cba3fc` |
| `A_0_6-livefix-1-verified-mutant-delete-start-check.txt.gz` | `25b246bf3dd303a049f204ae35cb19faef23fbfcf2b1e77c93e5c049d7eeeb8b` |
| `A_0_6-livefix-1-verified-mutant-relax-continuation-indent.txt.gz` | `48e0327e3f805fadb28b9ca75603316e6a0ec2c23978dcf92d436d96d964cbe4` |
| `A_0_6-livefix-1b-diff-check.txt.gz` | `41c4589a666da2be7dd63c3363180b71f3cd2196eb74caddfd4baed6cda428ca` |
| `A_0_6-livefix-1b-failure-comparison.txt.gz` | `3a7249a250983b60ec3c640cc0348517e621baf05b8c8e84bc72059be14c1e75` |
| `A_0_6-livefix-1b-focused.txt.gz` | `55d38467bcd4cdf1e443c9716f914f1a69ba6afe8a2507f2f69bfd97f73a9200` |
| `A_0_6-livefix-1b-gateway.txt.gz` | `2c431a1c9b2e5a4236d452421dedd29c6699d6e12a8a71c18d77d0e8dbf36d54` |
| `A_0_6-livefix-1b-green.txt.gz` | `29e5a09503696ef89edd1f6713c684b50d060e7343ee5de7c928d4fa65774531` |
| `A_0_6-livefix-1b-initial-refusal-red.txt.gz` | `d561c4095b046ac84b84334fe271b17140c0973fae59eccac26102b2f59db4b7` |
| `A_0_6-livefix-1b-lint.txt.gz` | `0e50e2dc88e39883ac445cecc98c6c5365deedf3eb229c847ba7b3d6f2cb189e` |
| `A_0_6-livefix-1b-mutations.txt.gz` | `eeda5421d7357395c1c2deb8d23155b03c01b6ee222fcba8682bb5998e2cd6ff` |
| `A_0_6-livefix-1b-red.txt.gz` | `a4bb48a80ef2b3bb8cd6d01f93c03a852e72223fe064c50e65901a2381f9163c` |
| `A_0_6-livefix-1c-red.txt.gz` | `815d4026f50db3d8f91df6fb6c49abedb8236d89375ae342f58243c3e94395ec` |
