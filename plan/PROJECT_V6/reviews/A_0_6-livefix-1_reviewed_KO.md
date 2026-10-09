# Review A_0_6-livefix-1 — KO

**Task:** `plan/PROJECT_V6/A/0/06-pending-wrap.md` (approved design, SHA-256 `a9cfbae2e5bc262f202393ddec8f11fce90ce7e4518c1e425524cb7ef7ce9862`, re-hashed) plus the inherited F1 recognizer and diagnostics candidate. Request: `A_0_6-livefix-1_to_review.md` (SHA-256 `7d620b8e444e4a64e6f73441291c95b46a2df7130be7d422b65c56257f85dd2a`).
**Trial:** 1
**Branch:** `feat/V6-A-0-06-live-fix`
**Commit:** uncommitted candidate on HEAD 2f5be73 (`2f5be73ad0a26ed2d488feb0ad20765716cbc67c`, which adds only review files on top of `5ae13b4`)
**Contract:**
- the design above;
- binding notes 1–8 of `A_0_6-pendingwrap-design-2_reviewed_OK.md`;
- live evidence `1248f68:…/A_0_6-operator-live-1.md` and `9d9119f:…/A_0_6-operator-live-2.md`;
- operator decisions `76b250b`, `6212f72`, `A_0_6_human_decision.md` and `A_0_6_operator_response_decision.md`.

**Reviewer:** fresh independent Claude Code reviewer session (Opus 5.5), brief `workspace/briefs/a06-livefix-reviewer-1.md`. I did not write this code or review the design. No sub-agents were used. I inspected the coder's logs and compared against them, but no coder material counts as verdict evidence on its own.
**Date:** 2026-10-09

## Verdict

**KO — three corrections.** The code, patch, pins, binary and fixtures match the design, and I reproduced them:

- the `.4` rebuild;
- RED on `.3` and GREEN on `.4`;
- three C mutants and nine JS mutants;
- the full Gateway suite.

What fails is completeness against the approved design:

- two §5 tests at x=width are missing;
- one `gateway/README.md` disposition is missing;
- the handoff does not report either omission (AGENTS.md Rule 12).

None of the fixes needs a source, vendor-patch, binary or pin change. The `.4` binary `837d0103…7aac` stays valid.

## Required corrections

1. **Add the x=width unknown-menu case** (design §5 item 4, `06-pending-wrap.md:223`: "Add x=width nonprompt and unknown-menu cases"). Only the nonprompt half exists (`session_prompt_diagnostics.test.js:196-201`). The unknown-menu tests run only at the default geometry (`:146`, `session_prompt.test.js:107`).
   - **What to add.** A test in `tests/gateway/session_prompt_diagnostics.test.js`, after line 201, using the existing `fresh` (`:18`) and `assertRefusal` (`:49`).
   - **Setup.** Pass `geometry: { width: "80", height: "24", cursorX: "80", cursorY: "23" }` and an unknown menu, for example the `selectedPane` at `:146`.
   - **Assertions.** `fx.pending.kind === "unknown"`, then `await assertRefusal(fx, "unknown_prompt", "human_intervention_required")`.
   - **Intent.** At the pending-wrap column, geometry never makes an unknown menu answerable.
   - **Mutation evidence.** The test must be GREEN on the candidate and RED when `binding.prompt.kind === "unknown" ||` is deleted from `session_prompt_service.js:88` (the reason becomes `guard_refused`). I prototyped exactly this in reviewer scratch: GREEN on the candidate, RED under that deletion.
2. **Add the x=width approved-capture-replaced-by-nonprompt case** (same item: "replace an approved capture with nonprompt output and require refusal"; design §3 `:48`). Today a changed capture is tested only at geometries where the geometry stage never refused.
   - **What to add.** A test in the same file.
   - **Setup.** Use the live `codex-0.162-pending-wrap-command.txt` pane, the same 80|24|80|23 geometry, and `intercept: (args, result) => args[0] === "save-buffer" ? { ...result, stdout: Buffer.from("shell ready $\n") } : result`.
   - **Assertions.** `fx.pending.kind === "command"`, then `await assertRefusal(fx, "capture_mismatch")`.
   - **Alternative.** A real-tmux redraw variant at 80x24 in `session_prompt_guard.test.js` is also acceptable, if it asserts zero received bytes and no answered event.
   - **Intent.** At x=width the geometry stage no longer refuses, so the capture binding must.
   - **Mutation evidence.** GREEN on the candidate, and RED when the x comparison at `session_prompt.js:69` is reverted to `>=` (the stage becomes `geometry_unavailable`). Prototyped in reviewer scratch: GREEN on the candidate; under that mutant this test fails together with the two existing equality tests.
3. **Document pending-wrap prompt acceptance in `gateway/README.md`.** The design §4 row for this file (`06-pending-wrap.md:85`) says: "Update exact runtime contract to .4, explicitly refuse .3 and older; document pending-wrap prompt acceptance."
   - **Current state.** The first two parts are done (`gateway/README.md:100-101,104,726`). The third exists only in `docs/tmux-runtime.md:71-74`. The README's approval-bound answer section is the Gateway contract.
   - **What to add.** After line 738, the end of the `agents-submit-v1` paragraph, text such as:

     > The answer path accepts an observed cursor at x equal to the pane width (the tmux pending-wrap column; Codex 0.162 leaves its hidden cursor there on command menus). It still refuses x greater than the width and y at or beyond the height, and `agents-submit-v1` re-verifies the exact observed x/y with the grid and identities in the same command. Geometry never establishes a recognized or approved prompt. Composer `submitPrompt` keeps x < width.

**Trial 2** is `A_0_6-livefix-2_to_review.md`, under a fresh trace with a fresh reviewer. It should record:
- new SHA-256 values for the changed files;
- GREEN logs for both new tests;
- the two named mutation logs, run in scratch;
- the focused lanes re-run with `.4` `837d0103…7aac`;
- `git diff --check`;
- an explicit statement of any design item still not implemented.

No rebuild is needed if `gateway/vendor/tmux-agents/` is unchanged.

## What I verified (measured)

**1. Diff scope (brief item 1).** The candidate has 29 entries: 23 modified and 1 deleted tracked path, plus 5 untracked files. All 28 present files match the handoff's SHA-256 table (table below).

- **C patch.**
  - The `.3` patch at `bbab86b` (= HEAD blob `e8139a40…`) and the active `.4` patch differ only at old line 42 (version suffix) and old line 191 (`cx >= width` → `cx > width`).
  - A throwaway-repo `git diff -M` shows a rename at 98% similarity, 2 insertions and 2 deletions, with hunks at old lines 39 and 188.
  - The patch keeps 7 diff headers and 12 hunks.
  - No `.3` patch remains active.
- **JS predicate.** `session_prompt.js:69` x becomes `>`; y stays `>=`; `:52` requires exactly `.4`.
- **Pin-only changes:**
  - `base_adapter.js:405`;
  - `process_supervisor_helper.py:4333`;
  - `manifest.json`: product version, patch file/digest and Darwin outputs (source, extension and image digests kept);
  - Linux builder: digest, filename, version and output;
  - Darwin builder: digest, filenames, version and outputs;
  - `ci.yml:74` symlink;
  - vendor README;
  - test pins.
- **Untouched:**
  - the composer bound at `base_adapter.js:420` (`>=`);
  - `cmd-agents-capture.c` (`4d80a861…`);
  - `tmux_client.js`;
  - `policies/`, `ci/`, `CHANGELOG.md`;
  - the MCP server and tools.
- **Beyond the above,** the diff contains only the F1 recognizer (`codex_adapter.js:37-48`), the diagnostics (`session_prompt.js`, `session_prompt_service.js`), and the test fixtures and harness support.

**2. Binary (brief item 2).**

- **Build.** I ran the candidate's `build-offline.sh` from the candidate vendor directory into reviewer scratch:
  - the pinned image was present locally (`sha256:0625f79a…`), with the builder's `--pull never --network none`;
  - archive, patch and extension digests reported `OK`;
  - 7 files patched with no offset or fuzz message;
  - the parser check and the version assertion passed.
- **Result.** `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`, byte-identical (`cmp`) to coder build A. I re-hashed coder builds A and B (both `837d0103…`) and the retained `.3` (`6487f795…`).

**3. Lanes, RED and mutants (brief item 3).**

Environment:
- `env -i`, so no inherited `AGENTS_*` or `TMUX*` variables;
- Node 22.22.1;
- `A04_TEST_TMUX` set to a scratch `rt-bin/tmux` symlink to my build;
- `D007C_TEST_TMUX_PATH` set to that directory;
- `D007C_RUN_REAL_TMUX_PROBE=1`;
- the AO venv on PATH.

Results:
- **Focused lanes.** The coder's 11 files plus `claude_first_prompt.test.js`: 526/526, 0 skipped. The real probes ran: relay fixtures assert `tmux 3.6a-agents.4`, and every `real …` test passed, including all three watcher kinds at an observed `80|24|80|23`.
- **C RED.** `guarded_submit.test.js` against the retained `.3` (`6487f795…`): 16/19. The named delivery test fails at `success()` (`:52`) with status 1 instead of 0 and `agents: guarded submit refused`; the LF and RI current-cursor controls fail the same way. The file has no version assertion, so this is a delivery RED, not a pin RED. The same lane on `.4` passes 19/19.
- **C mutants I built.** Each uses a scratch package copy whose patch differs only at line 191 and whose builder copy differs only in `patch_sha256`:

| C mutant | Patch SHA-256 | Binary SHA-256 | Real-byte result |
| --- | --- | --- | --- |
| `cx > width + 1` | `129b1098b8d9f9bdabc02a67e92923d119407bbd6fd4f4bb9d852210a3cc8712` | `7682e067df266e3f2358306b68a4b138540cfcbaf546dad9d02842896f4be730` (equals the coder's and the design reviewer's) | x=81 shrink test RED (one CR delivered); x=90 still refused |
| delete `cy != s->cy` | `0f52deeca429a07d7b0822f06d250d0a41882c6918a65496edb16cd82a89a92b` | `67f8856e271b34277021d469a20972254086d44468318b1e195255541b2b9f72` | LF and RI drift tests RED (CR delivered); BS green |
| delete `cx != s->cx` | `c1c8acb73b82941df56fd8ec12b02538e995d37160832d69e4b9fa748e3ac163` | `bff599e71a36291d964feb4b539a2b9d17e6a07dfb0d0ff7cdde9c7615ab37cb` | BS drift test RED (CR delivered), plus the existing cursor-drift test |

- **JS mutants.** In a scratch copy of the tree (control 241/241), every mutant failed its designated test:
  - x reverted to `>=`: 2 RED (pending-wrap delivery refused at `geometry_unavailable`; cursor-80 forwarding).
  - x widened to `> width + 1`, or x deleted: 2 RED each (x=81 no longer refused at `geometry_unavailable`).
  - Composer `:420` deleted, or relaxed from `>=` to `>`: 6 RED each (all three branches, ready and guard); the three width-minus-one controls stayed green.
  - F1 continuation indentation relaxed to `/^\s+\S/`, complete-option check deleted, or old deny index restored: RED each time.
  - Diagnostics `detail = undefined` before the attempt removed: 3 RED.

**4. F1 and diagnostics (brief item 4).**

- **Fixtures.** Each traces to the operator's saved panes:
  - the pending-wrap fixture is byte-identical to `run-170128/command-prompt-geometry.txt` (`d6328f91…`);
  - the short fixture is byte-identical to `run-154702/detect-snap.txt`;
  - the wrapped fixture equals `run-154702/command-prompt.txt` with only three equal-length `/home/carase` → `/home/tester` substitutions;
  - `geometry.txt` is `1926680|%0|1926681|80|24|80|23|0`.
- **F1 recognizer.** I ran 11 adversarial variants of my own. Only the original and a three-row wrap are recognized. These all return `null`:
  - a second `(p)` inside the continuation;
  - a bare trailing backtick;
  - a tab after five spaces, or a six-space continuation;
  - an injected `(p)` row;
  - the deny row folded into the option;
  - a wrapped "this exact command" option;
  - a missing `(p)`;
  - the selection marker moved to option 2.

  The response stays a fixed `Enter`. There is no `p` and no send-keys path.
- **Diagnostics.**
  - Every `detail`/`diagnose` value is a string literal.
  - The split `if`s keep the original order and short-circuiting.
  - `detail` is cleared before `attempted = true`.
  - Outcomes and reasons are unchanged; the CLI exit rule (`cli/src/agents_cli/main.py`) reads only status and outcome.
  - The `recordPromptAnswer` merge adds no stale detail on sent or attempted paths.
  - No stage equals `external_response_timeout`, the observe re-arm key at `session_prompt_service.js:163`.
  - No schema constrains `promptAnswer`.

**5. Invariants and documentation (brief item 5).**

- **Security invariants.**
  - There is no `policies/` change and no session-prompt scope in `policies/`.
  - The watcher passes `autoApproveScopes: []` unless an exact scope resolves to auto (`:186`).
  - There is never a `p`, and no new stdout write.
  - All text is in English, and the MCP surface is untouched.
  - A `.3` server is refused by the exact `#{version}` probe at all three sites before any input.
- **Runbook (`docs/tmux-runtime.md:49-74`).** It states:
  - the linux/amd64-only claim, with Darwin excluded;
  - manual cutover only when no sessions are live;
  - no automatic restart;
  - the `6212f72` fail-closed list.
- **Inventory (note 5).**
  - The full-version search finds 142 lines in 110 files. Outside `plan/`, the only hits are the deliberate refusal fixtures (`session_prompt_diagnostics.test.js:192`, `prompt_submission.test.js:510`) and the dated `docs/project-status.md:101`.
  - The bare-suffix search finds `gateway/README.md:101` and `docs/tmux-runtime.md:58,66`.
- **Hygiene checks.** `npm --prefix gateway run lint` exits 0, `git diff --check` exits 0, and the untracked files have no trailing whitespace.

**6. Full Gateway suite.**

- **Result.** `npm --prefix gateway test` with my `.4` and an isolated `TMUX_TMPDIR`: 2201 tests, 2157 pass, 25 fail, 19 skip, exit 1. The failure names and skip IDs are identical to the coder's index.
- **Cause of the failures.** All 25 are registry or `gateway/policies` path errors (`missing registry file: agent-capabilities.json`; `copyfile …/gateway/policies/roles.json`), not candidate code.
- **Discarded run.** An earlier run without `~/miniconda3/bin` on PATH showed 60 extra `redis-server`/`sqlite3` ENOENT failures. I discarded it as an environment error.
- **Status.** The suite stays RED and is not waived here.

## Non-blocking notes

1. The C primitive test (`guarded_submit.test.js:196`) does not render a recognized menu above the pending-wrap row, as `06-pending-wrap.md:240` describes. The watcher tests do render it for all three kinds. Adding it is optional.
2. A real-tmux pending-wrap redraw variant in `session_prompt_guard.test.js` would be the strongest form of correction 2.
3. There is no Node-level cursor-only stale test. The real-tmux BS/LF/RI tests cover the case, and my C mutants show they isolate x and y.
4. Possible documentation additions:
   - **Runbook:** `/proc/<server pid>/exe` hashing and the rule against replaying approvals on cutover or rollback (design §4 and §6).
   - **Vendor README:** the linux/amd64 scope.
   - **Operator docs:** the `promptAnswer.detail` stage codes.
5. `docs/tmux-runtime.md:68-69` cites the cutover decision by its `release/1.1.0` commit `6212f72`. That file reaches this branch only on integration. Fine as written.
6. Two pre-existing issues, out of scope:
   - `npm run lint` does not cover the repo-level `tests/gateway/` files (eslint reports them "outside of base path");
   - `session_prompt.test.js` `fresh()` never removes its `/tmp/a06-*` directories (over 1,600 on this host).
7. The relay `.3` refusal is still evidenced only by a source regex (design-review note 7, optional).
8. The handoff says HEAD `5ae13b4`; request commit `2f5be73` adds only review files.
   - The design table asked for a new handoff for `.4`. The orchestrator's brief instead completed the trial-1 request, which had never been committed.
   - That request was first committed at `2f5be73`, so no committed trail was overwritten.

## Human-gated (listed, not decided)

1. The full Gateway suite is RED (the 25 failures above), and the required Redis and Postgres lanes were skipped (19 conditional skips). This is for host CI and the skip-budget decision.
2. Operator live acceptance on a fresh `.4` server:
   - prompt cases: trust, short command, wrapped command and pending-wrap;
   - refusal cases: denied, no grant, changed prompt and replay;
   - the `/proc/<pid>/exe` hash and marker/stored/audit agreement;
   - manual cutover per `6212f72`.

## Not measured

- `bash scripts/ci.sh` (host-owned, not run).
- The Redis (`AGENTS_TEST_REDIS_URL`) and Postgres lanes.
- A base-tree full suite; I did not reproduce the orchestrator's check that the 25 failures are a subset of the 59 base failures.
- The coder's delete-range, revert-range and delete-cursor mutants were not rebuilt; I checked their binary hashes only.
- 22 of the 23 diagnostics deletion mutants were not re-run.
- I made one build, not two, and compared it with coder builds A and B.
- Live provider behaviour, the running server's executable hash, and Darwin.
- My focused lanes did not set `TMUX_TMPDIR`; the full-suite runs did. Afterwards the user's default server showed only its own sessions, and `/tmp/tmux-1000` held only `default`.

## Reviewer SHA-256 table (computed by this reviewer)

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
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.4.patch` | `785a1df2c91e05448a60d69b1ae8fab52f2f3088bc730be3b74da678e7ebd02d` |
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.3.patch` (deleted; HEAD blob) | `e8139a40bc2badcc95475d003158906444d2b33a7ad8553dcae1e9371b97955d` |
| `gateway/vendor/tmux-agents/cmd-agents-capture.c` (unchanged) | `4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2` |
| `tests/gateway/claude_first_prompt.test.js` | `ec2e84bf33038afc475f150014c1738b6dc95deae2c670184ff2869ce8fcd8fc` |
| `tests/gateway/guarded_paste_fixture.py` | `ea5b0edcbdf4df09683d99a996b3e45c78a1741b87c9f4389bb8e64373dd0825` |
| `tests/gateway/guarded_submit.test.js` | `4394e8acf7e2f720aa7bd77af4676dacbdf0fc46f572c73a0c33380504fd45cf` |
| `tests/gateway/process_supervisor_session_port_fixture.py` | `0a5342944aa65cb6f8f579716f06174e27b5b7dd8bd3bf4e9442bad63b82a6c7` |
| `tests/gateway/process_supervisor_session_port_relay.test.js` | `1f5ff99a4c4d6e51148fed362640e2629656154e5ff7b48a57343087112db1f5` |
| `tests/gateway/prompt_submission.test.js` | `e0009c04f6997f747942ec7e407142a318f08b6453f624277d476a11d12887e7` |
| `tests/gateway/request_context_reattach.test.js` | `06a6f48fa42f765a919e29a401c031743fe59e4d565a76b59d74000c1c5a2a7e` |
| `tests/gateway/session_prompt.test.js` | `cbc6ddd6a46bc0492f0c6a97b3573bc175fbe3ccd9ef497928e7d6514117bc83` |
| `tests/gateway/session_prompt_diagnostics.test.js` | `30c9468517d9ef9466db29ac926cd0b9c534ff06705990c2db0ecc3b8ccff76c` |
| `tests/gateway/session_prompt_guard.test.js` | `fefc71783601850f3995e4cc26fbcd6ef26d90ccc44f3e0eee862472cb6b33be` |
| `tests/gateway/session_prompt_race_fixture.py` | `470e3cef6e4bcf9aedad9a3242d60a47b8e9ee490a83c2338dc1281bd44972b8` |
| `tests/gateway/session_prompt_transport_fixture.js` | `83424aac1aa0131e3652bfb6af6230dfd9e1a65eddc50bf6fa803273d1db1be4` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-command.txt` | `195fc0cd6087d0ff44d4e1714c99a0bfd138f9779ae27b9b6e9539f6ccc85dfa` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-pending-wrap-command.txt` | `d6328f9116c3af6c8bba4f0ebf231e2ae0b0b1ea4b51b7f400c51f51ad4d4fd1` |
| `tests/gateway/fixtures/session_prompts/codex-0.162-wrapped-command.txt` | `499ad0532bcfe00896ea2b9b86f0091a4eccc6467698d6dc837f2cd8c4daf584` |
| `plan/PROJECT_V6/A/0/06-pending-wrap.md` | `a9cfbae2e5bc262f202393ddec8f11fce90ce7e4518c1e425524cb7ef7ce9862` |
| `plan/PROJECT_V6/reviews/A_0_6-pendingwrap-design-2_reviewed_OK.md` | `8469210ba54ced279cb50fa01f314640706c968851f7c716c5094be6c626c6be` |
| `plan/PROJECT_V6/reviews/A_0_6-livefix-1_to_review.md` | `7d620b8e444e4a64e6f73441291c95b46a2df7130be7d422b65c56257f85dd2a` |

| Executable | SHA-256 | Use |
| --- | --- | --- |
| Reviewer rebuild of `.4` (scratch) | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` | Focused lanes, full suite, C GREEN |
| Coder builds A and B (re-hashed) | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` | `cmp` identical to the reviewer build |
| Retained `.3` (`workspace/tmux-pinned/out/`) | `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386` | C RED |
| Coder mutants (re-hashed only) | delete-range `e0c69ef8…`, widen-range `7682e067…`, revert-range `fc8202fd…`, delete-cursor `d645e1df…` | Match the handoff |
| Reviewer mutants | see the C mutant table above | Never canonical |

## Process

- **Read-only review.** This verdict is the only file written to the repository. There were no edits, commits, staging, stash, reset or checkout. `git status` showed the same 29 entries before and after, and the full-suite runs left `git status --ignored` unchanged.
- **Indexing and commit.** Indexing in `reviews/README.md` and committing this verdict are left to the orchestrator.
- **Scratch work.** Builds, mutant packages, the copied tree, the prototype tests and every log stayed in the reviewer scratchpad. The prototype tests never touched the worktree. Docker ran only through the candidate builder, with the pinned local image, `--pull never` and `--network none`.
- **Budget breach.** This review exceeded the AGENTS.md Rule 6 per-session budget: roughly 300k tokens against 150k. Most of it went on reproduction: four builds, the lanes, 12 mutants and two full-suite runs. I am surfacing it here rather than hiding it.

## Next step

KO. The coder applies corrections 1–3 and writes `A_0_6-livefix-2_to_review.md`. Re-review needs a fresh trace and a fresh reviewer session.

Status: the candidate is **implemented, not reviewed OK**. Nothing is integrated, promoted or released.
