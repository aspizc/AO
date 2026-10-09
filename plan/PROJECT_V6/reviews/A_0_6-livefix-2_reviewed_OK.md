# Review A_0_6-livefix-2 — OK

**Task:** `plan/PROJECT_V6/A/0/06-pending-wrap.md` (approved design, SHA-256 `a9cfbae2e5bc262f202393ddec8f11fce90ce7e4518c1e425524cb7ef7ce9862`, re-hashed), live-fix trial 2. Request: `A_0_6-livefix-2_to_review.md` (SHA-256 `db0692f4db52fdb987110c32422933e5feaf1c54d0c1fdaa9c96dcd6f763dc1d`).
**Trial:** 2
**Branch:** `feat/V6-A-0-06-live-fix`
**Commit:** uncommitted candidate on HEAD b56de8f (`b56de8f670a888cbedfbe41c2f5168ae51475fae`, which adds only the trial-2 request and its six `A_0_6-livefix-2-*.txt.gz` logs on top of `62ae22e`)
**Contract:**
- corrections 1–3 of `A_0_6-livefix-1_reviewed_KO.md` (SHA-256 `431ca14fc2931d8386eb401d02a9bf4bb175bd1084d461f539ea4a139f0c3faf`), the acceptance bar;
- the approved design above;
- its verdict `A_0_6-pendingwrap-design-2_reviewed_OK.md` (SHA-256 `8469210ba54ced279cb50fa01f314640706c968851f7c716c5094be6c626c6be`).

**Reviewer:** fresh independent Claude Code reviewer session (Opus 5.5), brief `workspace/briefs/a06-livefix-reviewer-2.md`. I did not write this code, and I did not review trial 1 or the design. No sub-agents were used. I read the coder's logs for comparison only; no coder material counts as verdict evidence.
**Date:** 2026-10-09

## Verdict

**OK.** Trial 2 carries all three corrections, and I reproduced each one:

- the two missing §5 tests at x=width now exist, match the KO's specification, pass on the candidate, and fail under the two named mutations for the named reason;
- the `gateway/README.md` paragraph is in place and every sentence is true of the code;
- the handoff names the design items it did not implement. None of them is a blocking design requirement. Two optional details it does not name are listed in section 5; neither is blocking either.

Everything else in the candidate is byte-identical to the trial-1 candidate. The two changed files differ from their trial-1 bytes only by appended or inserted text. No source, vendor patch, pin, fixture, binary or composer bound changed, so the trial-1 reviewer's rebuild, C RED/GREEN and mutant evidence still applies to the same bytes.

This OK covers exactly the bytes in the SHA-256 table below. It is an implementation review only. It does not waive the RED full Gateway suite or the skipped Redis and Postgres lanes, and it grants no integration, promotion or release. Under design `:9`, the full required gate and a new live acceptance must pass before any integration or release claim.

## Corrections 1–3 (acceptance bar)

| # | KO requirement | Trial 2 | Reviewer check |
| --- | --- | --- | --- |
| 1 | x=width unknown-menu test after `:201`, using `fresh` and `assertRefusal`; geometry `80/24/80/23`; assert `kind === "unknown"`, then `assertRefusal(fx, "unknown_prompt", "human_intervention_required")`; RED when `binding.prompt.kind === "unknown" \|\|` is deleted at `session_prompt_service.js:88` | `session_prompt_diagnostics.test.js:204-211`, test `pending-wrap unknown menu remains human-only without input`, with the same unknown menu as `:146` | GREEN; RED under my deletion mutant, reason `guard_refused` instead of `human_intervention_required` |
| 2 | x=width approved-capture-replaced test: live `codex-0.162-pending-wrap-command.txt` pane, same geometry, the given `save-buffer` intercept; assert `kind === "command"`, then `assertRefusal(fx, "capture_mismatch")`; RED when `session_prompt.js:69` x reverts to `>=` | `:213-223`, test `pending-wrap approved capture replaced by nonprompt refuses at capture binding`; the intercept is the KO's expression, re-wrapped | GREEN; RED under my revert mutant, detail `geometry_unavailable` instead of `capture_mismatch` |
| 3 | Document pending-wrap prompt acceptance in `gateway/README.md` after `:738` | `gateway/README.md:740-745`, the KO's suggested text, re-wrapped | Placement right; each sentence checked against the code (section 3) |

The KO's trial-2 record list is also met: new hashes, GREEN and mutation logs, the focused re-run, `git diff --check`, and an explicit list of design items not implemented. All six trial-2 log hashes match the handoff.

## What I verified (measured)

### 1. Candidate identity (brief item 1)

- **Scope.** `git status` shows 29 entries: 23 modified tracked paths, 1 deleted (`tmux-3.6a-agents.3.patch`), and 5 untracked files.
- **Hashes.** I recomputed SHA-256 for all 28 present files and for the HEAD blob of the deleted patch. A script compared them with the trial-1 table (29 rows) overlaid with the trial-2 two-row update. Result: 0 mismatches, nothing missing, nothing extra.
  - 27 rows equal the trial-1 table.
  - Only `gateway/README.md` and `tests/gateway/session_prompt_diagnostics.test.js` differ, and both equal the trial-2 values.
  - `cmd-agents-capture.c` is still `4d80a861…`.
- **Nature of the two changes.**
  - Lines 1–201 of the diagnostics test hash to the trial-1 value `30c94685…`. Trial 2 only appended lines 202–223: two blank lines and the two tests.
  - The README with lines 740–746 removed hashes to the trial-1 value `7ef34d00…`. Trial 2 only inserted the paragraph and one blank line.
- **Commits.**
  - `b56de8f` adds only the trial-2 request and six logs.
  - `62ae22e` adds only the trial-1 KO and its index row.
  - The handoff's header names `62ae22e` because the request was committed afterwards.

### 2. The two new tests (brief item 2)

**Runtime.**

- `rt-bin/tmux` in my scratchpad is a symlink to `workspace/tmux-pinned/a06-impl-1-A/tmux-3.6a-agents.4-linux-amd64`.
  - SHA-256 `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`, read through the link.
  - `tmux -V` prints `tmux 3.6a-agents.4`.
- Build B re-hashes to the same value and is `cmp`-identical to A.
- The retained `.3` re-hashes to `6487f795…`. I did not use it.

**Environment.** Every Node run used `env -i` with:

- `HOME`, `USER` and `LANG=C.UTF-8`;
- `PATH` = the scratch `rt-bin`, then the AO venv, then `~/miniconda3/bin`, then the system directories;
- `A04_TEST_TMUX` = the scratch `rt-bin/tmux`;
- `D007C_TEST_TMUX_PATH` = the scratch `rt-bin` directory;
- `D007C_RUN_REAL_TMUX_PROBE=1`;
- `TMUX_TMPDIR=/tmp/claude-1000/a06r2`.

An in-run check confirmed those four were the only `AGENTS_*`, `TMUX*`, `A04_*` or `D007C_*` variables. My session inherited 11 `AGENTS_*` variables plus `TMUX` and `TMUX_PANE`; none reached the tests. Node was v22.22.1.

**Reading the tests.**

- **Test 1 (unknown menu).** On the candidate the refusal comes from `session_prompt_service.js:88`, before any transport call. So the test checks that at x=width an unknown menu stays human-only, with:
  - zero input;
  - no `agents-submit-v1` or `send-keys`;
  - cleaned buffers;
  - matching durable detail and audit detail;
  - no answered event;
  - no re-arm (`assertRefusal`, `:49-64`).
- **Under the deletion mutant,** the menu goes to transport, passes the `.4` geometry at x=80, and is refused at `recognizer_mismatch` (`service :103-104`). The reason becomes `guard_refused`.
- **Test 2 (replaced capture).** The fixture state carries the live geometry. The intercept changes only the decoded evidence. The refusal is set at `session_prompt.js:85-86`, after the geometry, evidence and state stages, so the test shows that at x=width the capture binding refuses. The authorizer's own check (`service :101-102`) is a second layer with the same detail.

**GREEN.**

- Both tests, selected by exact name: 2/2, exit 0.
- The whole diagnostics file: 32/32, exit 0.

**Mutations (mine).** I made scratch copies of the full candidate tree: no `.git`, `gateway/node_modules` symlinked, worktree untouched. A helper asserted exactly one occurrence of the target text on the named line.

| Run | One-line change | Mutated file SHA-256 | Diagnostics file | Result |
| --- | --- | --- | --- | --- |
| control | none | service `4e25fbf7…`, adapter `80aec89f…` | 32/32, exit 0 | both new tests GREEN |
| delete-unknown | `session_prompt_service.js:88` `if (binding.prompt.kind === "unknown" \|\| !resolved.allowed` → `if (!resolved.allowed` | `12984b2218b7a9fd852d61b73db4b471112bc822e4ff43996b796f2664a3fc01` | 30/32, exit 1 | Test 1 RED at `assertRefusal` `:53` (called from `:210`): actual `guard_refused`, expected `human_intervention_required`. Test 2 GREEN. Also RED: the existing `initial refusal diagnostic unknown_prompt preserves its original reason`. |
| revert-x-bound | `session_prompt.js:69` `Number(fields[5]) > Number(fields[3])` → `>=` | `f8770efe8b5a34b0899bd02d7a53efeaa9c7539e78e91efe41ed4195c9a95bc9` | 29/32, exit 1 | Test 2 RED at `:54` (called from `:222`): actual `geometry_unavailable`, expected `capture_mismatch`. Test 1 GREEN. Also RED: the existing `live Codex 0.162 pending-wrap geometry 80\|24\|80\|23 delivers…` and `bound prompt cursor 80 forwards…`. |

- Each new test fails only under its own named mutation, and on a semantic assertion, not at harness start-up.
- My revert-x-bound bytes equal the coder's mutant (`f8770efe…`).
- The coder's delete-unknown mutant (`ebdea395…`) differs from mine only by a leftover space (`if ( !resolved.allowed`). The semantics are the same.

### 3. `gateway/README.md` disposition (brief item 3)

**Placement.** The paragraph sits at `:740-745`, right after `:738` (the end of the `agents-submit-v1` paragraph) and before the refused/uncertain paragraph. Its wording is the KO's suggested text.

**Each claim against the code:**

| README claim | Code |
| --- | --- |
| x equal to the width is accepted | `session_prompt.js:69` refuses only `x > width`; `.4` patch `:191` is `cx > width` |
| x > width and y ≥ height are still refused | `session_prompt.js:69` (`Number(fields[6]) >= Number(fields[4])`); patch `:191` (`cy >= height`) |
| `agents-submit-v1` re-verifies the exact x/y with the grid and identities in the same command | patch `:189-196` (server PID, pane PID, dimensions, `cx != s->cx \|\| cy != s->cy`, pane state); `:198-212` byte-exact grid; `:214-216` unread output; `:218` the single `\r` |
| Geometry never establishes a recognized or approved prompt | `captureSessionPrompt` returns only snapshot and identity (`session_prompt.js:13-21`); the watcher recognizes from `capture.snapshot` only (`service :152-156`); `samePromptCapture` compares snapshot, target, server PID and pane PID (`session_prompt.js:23-26`); the authorizer re-recognizes from the snapshot (`service :104`) |
| Composer `submitPrompt` keeps x < width | `base_adapter.js:420` `>=`, unchanged |

The parenthetical (Codex 0.162 leaves its hidden cursor at x=width on command menus) is the operator's recorded observation (`9d9119f:plan/PROJECT_V6/reviews/A_0_6-operator-live-2.md:34-39`, state `…|80|24|80|23|0`). It describes where the cursor was, not how it got there, so it does not contradict design §1 ("provenance remains unproven"). `docs/tmux-runtime.md:71-74` says the same thing.

### 4. Focused lanes and hygiene (brief item 4)

**Focused lanes.** I ran the coder's 12 files in the environment above:

- `session_prompt`, `session_prompt_diagnostics`, `session_prompt_guard`, `session_prompt_transport`;
- `session_prompt_external`, `session_prompt_crash`;
- `guarded_submit`, `guarded_paste`, `prompt_submission`;
- `request_context_reattach`, `process_supervisor_session_port_relay`, `claude_first_prompt`.

Result: 528 tests, 528 pass, 0 fail, cancelled, skipped or todo; exit 0 in 32 s. The TAP plan is `1..526` top-level plus 2 nested subtests. The total matches the coder's, and is trial 1's 526 plus the 2 new tests.

**Real probes ran.** 28 passing tests have "real" in their names, including:

- the C primitive pending-wrap delivery;
- both alternate-screen shrink refusals (x=81 and x=90);
- BS, LF and RI cursor-only drift;
- invalid `-c 81` and `-l 24`;
- the three watcher kinds (command, trust, permission), each rendering a recognized menu at observed `80|24|80|23` and receiving one CR, plus their redraw refusals.

The watcher tests assert `tmux 3.6a-agents.4` (`session_prompt_guard.test.js:47`). The relay probe `runs the pinned custom tmux retained-channel probe under the exact isolated label` passed.

**Hygiene.**

- `git diff --check` exits 0.
- It does not cover untracked files, so I checked the five myself: no trailing whitespace, and each ends with a single LF.
- `npm --prefix gateway run lint` exits 0.
- That script does not reach `tests/gateway/`. So I also ran the Gateway ESLint config directly on `tests/gateway/session_prompt_diagnostics.test.js`: it was linted, not ignored, with 0 errors and 0 warnings.

**Pin inventory** (design §4 searches, re-run):

- **Full-version search, outside `plan/`:** only `docs/project-status.md:101` (dated) and the refusal fixtures `session_prompt_diagnostics.test.js:192` and `prompt_submission.test.js:510`.
- **Bare-suffix search:** only `gateway/README.md:101` and `docs/tmux-runtime.md:58,66`.
- **Totals:** 143 lines in 111 files, including `plan/`. The extra file and line since trial 1 is the committed trial-1 KO's own table row (`A_0_6-livefix-1_reviewed_KO.md:235`).

### 5. Remaining design items (brief item 4)

| Item not implemented | Design | Named in the handoff? | Blocking? | Why |
| --- | --- | --- | --- | --- |
| C primitive test renders no recognized menu above its pending-wrap row | §5 `:240` | yes | no | The primitive is content-agnostic: "a general one-CR transport primitive, not a semantic prompt detector" (§3 `:48`). It compares evidence to the live grid byte for byte, whatever the grid shows. The semantic layer is covered by the real watcher tests for all three kinds at observed `80\|24\|80\|23` (`session_prompt_guard.test.js:42-58`), which I ran GREEN. The trial-1 KO (note 1) also called this optional. |
| The same primitive test does not assert the capture bytes before submitting | §5 `:240` | not separately | no | The "observed, not declared" intent is met: `emit()` waits for and asserts the observed state (`guarded_submit.test.js:68-77`). x=80 after 80 characters shows that the row did not wrap. The C grid comparison binds the captured bytes. |
| No Node-level cursor-only stale test | §5 `:222` | yes | no | Design-review OK note 8 places LF, RI, BS and CHA at the real-terminal layer. `guarded_submit.test.js:216-230` (BS, LF, RI; same grid; the current-cursor control delivers) ran GREEN. The Node fixture enforces `-c` and `-l` (`session_prompt_transport_fixture.js:26-29`), and the JS re-reads state (`session_prompt.js:83-84`). |
| No behavioral relay `.3` refusal test | design-review note 7 | yes | no | Optional there; exact `#{version}` inequality at `process_supervisor_helper.py:4333` |
| Runbook `/proc/<pid>/exe` hashing and no-replay text; vendor README platform scope; diagnostic-stage docs | §4 `:54`, §6, §7.2 | yes | no | §7.2 is met by the runbook (`docs/tmux-runtime.md:49-69`: linux/amd64 only, Darwin excluded, manual cutover). The exe hash is a live-acceptance evidence requirement, not a document. The vendor README makes no Darwin support claim ("A Linux build does not verify either native Darwin artifact"). |
| Scoped `.4` supersession reference in `plan/PROJECT_V6/A/0/04-transport.md` | §4 `:104`, `:108` | no | no | Permissive: "future implementation **may** append". The file is unchanged and not part of the candidate. |
| `.4` evidence appended to `docs/project-status.md` | §4 row `:83` | n/a | no | Future work, after live acceptance; `:101` stays a dated observation, as required. |

The handoff's list is honest about everything it names, and it states the outstanding human-owned work. The two unnamed items are optional or minor details, not design requirements whose absence leaves behaviour untested.

## Non-blocking notes

1. `session_prompt_diagnostics.test.js:202-203` has two consecutive blank lines, the only place in the file. This is cosmetic, and the file lints clean.
2. Test 1's geometry is not consulted on the candidate path, because the unknown refusal comes before transport. The test guards against a change that would let an unknown menu reach transport at x=width, which is exactly what the named mutant shows. It stays GREEN under the x-bound mutant, as it should.
3. The coder's mutation runs used `--test-name-pattern` for one test each. My runs used the whole diagnostics file, which also shows which existing tests each mutant breaks (table above).
4. When this candidate is committed, the committed bytes must equal the table below. Any change needs a new trial.

## Human-gated (listed, not decided)

1. **Full suite and lanes.** The full Gateway suite is RED: trial-1 measurements, not re-run in trial 2, give 2201 tests, 2157 pass, 25 fail and 19 skip. The required Redis lanes and the Postgres lanes were skipped. Host CI (`bash scripts/ci.sh`) and the skip-budget decision belong to the host, before integration.
2. **Operator live acceptance on a fresh `.4` server.**
   - prompt cases: trust, short command, wrapped command and pending-wrap;
   - refusal cases: denied, no grant, changed prompt and replay;
   - the `/proc/<server pid>/exe` hash and marker/stored/audit agreement;
   - manual cutover per `6212f72`.

## Not measured

- `bash scripts/ci.sh` (the brief forbids it).
- The full `npm --prefix gateway test`, which I did not re-run, and the Redis (`AGENTS_TEST_REDIS_URL`) and Postgres lanes.
- No `.4` rebuild, no C mutant rebuild and no `.3` RED re-run. The vendor directory and all sources are byte-identical to trial 1, whose reviewer reproduced them. I re-hashed the binaries only.
- The trial-1 F1, diagnostics, JS-geometry and composer mutants were not re-run, because those sources are unchanged.
- Live provider behaviour, the running server's executable hash, and Darwin.
- The coder's scratch tree `/tmp/a06-trial2-mutants`. I read their logs only.

## Reviewer SHA-256 table (computed by this reviewer)

Full candidate: 23 modified, 1 deleted, 5 untracked.

| File | SHA-256 |
| --- | --- |
| `.github/workflows/ci.yml` | `2a777697937febd1261d5eaa5684226fcc9bf0a31bdec640dbcbbab5f2518a38` |
| `docs/tmux-runtime.md` | `dd9a958412db1bf3ec272226dbeece0a2168903d0be14fe5ceda2090e0c7f308` |
| `gateway/README.md` (changed in trial 2) | `e4640d68c1066204fb60da064ce48f93d4cb986a47996c57f7dd612606d51a65` |
| `gateway/src/adapters/base_adapter.js` | `90abf434a0a922ca0f73f28071615c52d10457629510a25e7f41a3ff550fd382` |
| `gateway/src/adapters/codex_adapter.js` | `4f89c1087c5b635211f3dbbe4f55be59fa1302ac5424c000b6f93ec4e10b2720` |
| `gateway/src/adapters/process_supervisor_helper.py` | `793251987c1690abf6946fe56a2ecdb0083972f138a9d4a5df226b1970e3a51a` |
| `gateway/src/adapters/session_prompt.js` | `80aec89fd133bf29ddf4e4d9fb9a44072691a7257a26bb1ae278c72a4efd5439` |
| `gateway/src/services/session_prompt_service.js` | `4e25fbf784d53a7682cae14c03360e26042825744c3ba2fdc3543026c853374d` |
| `gateway/vendor/tmux-agents/README.md` | `b06af11ed44c0293fc0b1c4773b86f8cd183878f34474cc899ff594bb74ef1c2` |
| `gateway/vendor/tmux-agents/build-offline-darwin.sh` | `48228cae9f2fcddae5b5c020c2359c8329f79b0d3d92e1763cac6c0f793a8d3c` |
| `gateway/vendor/tmux-agents/build-offline.sh` | `1de93be58bb9c99ea218e2a02f45ef63a6da649518267128a41ad3668b2814c2` |
| `gateway/vendor/tmux-agents/manifest.json` | `e77ed2ce83371aa0cfd922aa3b5521d81fcabe890c619e839a4e79c6ff1b870f` |
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.3.patch` (deleted; HEAD blob) | `e8139a40bc2badcc95475d003158906444d2b33a7ad8553dcae1e9371b97955d` |
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.4.patch` (untracked) | `785a1df2c91e05448a60d69b1ae8fab52f2f3088bc730be3b74da678e7ebd02d` |
| `tests/gateway/claude_first_prompt.test.js` | `ec2e84bf33038afc475f150014c1738b6dc95deae2c670184ff2869ce8fcd8fc` |
| `tests/gateway/guarded_paste_fixture.py` | `ea5b0edcbdf4df09683d99a996b3e45c78a1741b87c9f4389bb8e64373dd0825` |
| `tests/gateway/guarded_submit.test.js` | `4394e8acf7e2f720aa7bd77af4676dacbdf0fc46f572c73a0c33380504fd45cf` |
| `tests/gateway/process_supervisor_session_port_fixture.py` | `0a5342944aa65cb6f8f579716f06174e27b5b7dd8bd3bf4e9442bad63b82a6c7` |
| `tests/gateway/process_supervisor_session_port_relay.test.js` | `1f5ff99a4c4d6e51148fed362640e2629656154e5ff7b48a57343087112db1f5` |
| `tests/gateway/prompt_submission.test.js` | `e0009c04f6997f747942ec7e407142a318f08b6453f624277d476a11d12887e7` |
| `tests/gateway/request_context_reattach.test.js` | `06a6f48fa42f765a919e29a401c031743fe59e4d565a76b59d74000c1c5a2a7e` |
| `tests/gateway/session_prompt.test.js` | `cbc6ddd6a46bc0492f0c6a97b3573bc175fbe3ccd9ef497928e7d6514117bc83` |
| `tests/gateway/session_prompt_diagnostics.test.js` (untracked; changed in trial 2) | `6377c7caf57672ee30a619b6a24509bf92b4623ea712391dcef2f0b16b53a654` |
| `tests/gateway/session_prompt_guard.test.js` | `fefc71783601850f3995e4cc26fbcd6ef26d90ccc44f3e0eee862472cb6b33be` |
| `tests/gateway/session_prompt_race_fixture.py` | `470e3cef6e4bcf9aedad9a3242d60a47b8e9ee490a83c2338dc1281bd44972b8` |
| `tests/gateway/session_prompt_transport_fixture.js` | `83424aac1aa0131e3652bfb6af6230dfd9e1a65eddc50bf6fa803273d1db1be4` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-command.txt` (untracked) | `195fc0cd6087d0ff44d4e1714c99a0bfd138f9779ae27b9b6e9539f6ccc85dfa` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-pending-wrap-command.txt` (untracked) | `d6328f9116c3af6c8bba4f0ebf231e2ae0b0b1ea4b51b7f400c51f51ad4d4fd1` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-wrapped-command.txt` (untracked) | `499ad0532bcfe00896ea2b9b86f0091a4eccc6467698d6dc837f2cd8c4daf584` |

Unchanged reference: `gateway/vendor/tmux-agents/cmd-agents-capture.c` `4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`.

Contract and request:

| File | SHA-256 |
| --- | --- |
| `plan/PROJECT_V6/A/0/06-pending-wrap.md` | `a9cfbae2e5bc262f202393ddec8f11fce90ce7e4518c1e425524cb7ef7ce9862` |
| `plan/PROJECT_V6/reviews/A_0_6-pendingwrap-design-2_reviewed_OK.md` | `8469210ba54ced279cb50fa01f314640706c968851f7c716c5094be6c626c6be` |
| `plan/PROJECT_V6/reviews/A_0_6-livefix-1_to_review.md` | `7d620b8e444e4a64e6f73441291c95b46a2df7130be7d422b65c56257f85dd2a` |
| `plan/PROJECT_V6/reviews/A_0_6-livefix-1_reviewed_KO.md` | `431ca14fc2931d8386eb401d02a9bf4bb175bd1084d461f539ea4a139f0c3faf` |
| `plan/PROJECT_V6/reviews/A_0_6-livefix-2_to_review.md` | `db0692f4db52fdb987110c32422933e5feaf1c54d0c1fdaa9c96dcd6f763dc1d` |

Trial-2 coder logs (each equals the handoff's value):

| File | SHA-256 |
| --- | --- |
| `A_0_6-livefix-2-diff-check.txt.gz` | `88fd4bbb27c88863b81afb89a66105a850ae7ffea233e40c5007a06de396336a` |
| `A_0_6-livefix-2-focused.txt.gz` | `56d41a07d0df84dd7265226fdc9f5a6edd27a3d289a7aac89bbe3fdccaa85e16` |
| `A_0_6-livefix-2-mutant-delete-unknown.txt.gz` | `aba330f383199cf8f6f018a979dd35d4489aca9dd5a8623b807bdd7486974f39` |
| `A_0_6-livefix-2-mutant-revert-x-bound.txt.gz` | `08830aec1c79819050da7dbd244fb1c65fa063a8c507ff097a682d9ef18b9a56` |
| `A_0_6-livefix-2-mutation-control.txt.gz` | `46e43f72d0fe4b327c4cb557d7671953d60d164cc0ddba4c9d30639730b93e79` |
| `A_0_6-livefix-2-new-tests-green.txt.gz` | `f175a0b6b936a598adfe20add5be476d2ab0b93337480171987648ff23dc270d` |

| Executable | SHA-256 | Use |
| --- | --- | --- |
| Build A `.4` (`workspace/tmux-pinned/a06-impl-1-A/`), via scratch `rt-bin/tmux` | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` | All runs in this review |
| Build B `.4` (`workspace/tmux-pinned/a06-impl-1-B/`) | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` | `cmp`-identical to A; not run |
| Retained `.3` (`workspace/tmux-pinned/out/`) | `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386` | Re-hashed only |

## Process

- **Read-only review.** This verdict is the only file written to the repository. No edits, commits, staging, stash, reset or checkout. `git status --porcelain=v1` showed the same 29 entries before and after my runs, and the `--ignored` listing digest stayed `51424d7b…`.
- **Scratch work.** The three tree copies, the runner and mutation scripts, and every log stayed in the reviewer scratchpad.
- **tmux isolation.** `TMUX_TMPDIR` was the dedicated `/tmp/claude-1000/a06r2`, which was empty after the runs. `/tmp/tmux-1000` still holds only `default`, and no `.4` tmux process is left. I touched no user or Gateway session.
- **Indexing and commit.** Indexing in `reviews/README.md` and committing are left to the orchestrator.
- **Budget breach.** This review exceeded the AGENTS.md Rule 6 per-session budget: about 250k tokens by the session counter, against 150k. Most of it went on reading the contract, design and handoffs and on reproduction. I am surfacing it here rather than hiding it.

## Status

A/0/06 live-fix, trial 2 (uncommitted candidate on `b56de8f`): **implemented and reviewed OK**. It is not integrated, promoted or released. The full required gate (currently RED) and operator live acceptance remain open, and both must pass before any integration or release claim.
