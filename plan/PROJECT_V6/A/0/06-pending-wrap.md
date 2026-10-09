# A/0/06 — Pending-wrap guarded submit design

Status: **PLANNED; design handoff only.** No implementation authorization or independent verdict is claimed. Baseline: `1248f68bd848ec79ce6673c9f86aa6cc46620e77` plus the existing uncommitted A/0/06 live-fix candidate. All local line references below describe that candidate before this design. Upstream references describe the tmux 3.6a release source, not current upstream HEAD.

## Decision and success criteria

The operator selected a vendor fix before 1.1.0, with independent design review before implementation: `76b250b:plan/PROJECT_V6/reviews/A_0_6_pending_wrap_decision.md:18-29` in the main repository. The observed failure is recorded in `9d9119f:plan/PROJECT_V6/reviews/A_0_6-operator-live-2.md`: a Codex 0.162 command approval rendered with state `1926680|%0|1926681|80|24|80|23|0` (server, pane, child, width, height, x, y, cursor visibility). Granting it produced `geometry_unavailable` and no input. Trust-prompt delivery succeeded. The raw observations are under `/home/carase/git/personal/AO/workspace/a06-live/run-170128/`; the candidate fixture `tests/gateway/fixtures/session_prompts/codex-0.162-pending-wrap-command.txt` preserves the command-pane capture.

Assumption: this is tmux's legitimate pending-wrap state, not permission to normalize arbitrary cursor positions or infer a prompt from geometry. Success means an independently reviewed `3.6a-agents.4` candidate delivers exactly one CR for the unchanged, approved, recognized command prompt at x=width; x>width, y>=height, stale identity/cursor/grid, rejected policy, and nonprompt captures remain refused with no input. Default command auto-approval remains zero; operator/manual approval and the existing same-OS-account trust boundary do not change. The full required gate and a new live acceptance must pass before integration/release claims.

## 1. Upstream semantics and Enter

The source archive inspected without modification is `/home/carase/git/personal/AO/workspace/tmux-pinned/src/tmux-3.6a.tar.gz`, SHA256 `b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759`, matching the vendor manifest. The following are release-source line references; GitHub links identify the same `3.6a` tag.

- `tmux.h:956-964,1070-1071` stores unsigned `screen.cx/cy` and defines screen dimensions. [screen-write.c:85-106](https://github.com/tmux/tmux/blob/3.6a/screen-write.c#L85-L106) permits equality when setting x: only an x greater than the width is clamped. Row bounds remain strictly below height.
- With wrapping enabled, [screen-write.c:2065-2073](https://github.com/tmux/tmux/blob/3.6a/screen-write.c#L2065-L2073) advances after writing the last-column cell to x=width. Without wrapping, the maximum stays width-1. The collected ASCII path also produces equality: `screen_write_collect_end`, lines 1842-1900, especially 1890-1892, writes the collected cells and advances x by the collection length.
- Equality is a deferred wrap, not an extra grid column. On the next printable character, the collected path at [screen-write.c:1904-1946](https://github.com/tmux/tmux/blob/3.6a/screen-write.c#L1904-L1946) flushes, marks the row wrapped, linefeeds, and resets x to zero. The normal cell path at lines 1994-2004 similarly consumes the pending wrap before writing. Grid storage still has width columns.
- [screen-write.c:1527-1532](https://github.com/tmux/tmux/blob/3.6a/screen-write.c#L1527-L1532) implements output carriage return by setting x=0 with y unchanged. Output parsing dispatches C0 CR there at [input.c:1339-1341](https://github.com/tmux/tmux/blob/3.6a/input.c#L1339-L1341); LF at 1332-1337 is a separate operation. CR cancels pending wrap without itself linefeeding.
- `format.c:1709-1715` exports the raw `base.cx` as cursor_x, so width is observable. Cursor visibility (`format.c:1666-1675`, `input.c:1873-1874,1965-1966`) is independent of pending wrap and prompt recognition. A hidden cursor is neither a prompt prerequisite nor authorization.

Input Enter and output CR must not be conflated. `input-keys.c:404-425,638-645` enqueues unmodified C0 input for the child. The vendor submit at `tmux-3.6a-agents.3.patch:218` directly enqueues one CR byte. Neither changes `s->cx` itself. If the child echoes/emits CR, the output parser performs the reset above; a raw/noecho child can retain x=width until it redraws. Transport success proves enqueueing, not command execution or a particular post-submit cursor. Live marker evidence must establish execution independently.

## 2. Exact proposed change

Create the active patch `gateway/vendor/tmux-agents/tmux-3.6a-agents.4.patch` by renaming the active .3 patch, updating its version suffix at old patch line 42, and changing one predicate in `cmd_agents_submit_exec`:

```diff
-    cx >= width || cy >= height || cx != s->cx || cy != s->cy ||
+    cx > width || cy >= height || cx != s->cx || cy != s->cy ||
```

Reference: `gateway/vendor/tmux-agents/tmux-3.6a-agents.3.patch:188-196`. Keep integer parsing/ranges at 169-186, buffer-name requirements at 112-124, buffer consumption at 155-160, server and child PID, exact dimensions, pane liveness/input/mode/synchronization and bracketed-paste guards at 188-196, byte-exact visible-grid comparison at 198-212, unread/unparsed-output refusal at 214-216, and the one-byte write at 218 unchanged. x=width is valid cursor metadata; it is not used as an out-of-bounds cell index by the grid comparison. Do not clamp x, move the cursor, insert an extra key, relax row bounds, or add fallback send-keys behavior.

In `gateway/src/adapters/session_prompt.js:69`, change only the x inequality from `>=` to `>`; keep y `>=`, syntax and BigInt ranges at 64-68. Update its exact runtime requirement at 52 to .4. `tmux_client.js:73-80` must continue forwarding the observed x verbatim through `-c`, including 80 at width 80. Preserve the before/after state equality at `session_prompt.js:83-84`, capture equality at 85-86, watcher authorization at 87-88, and fixed Enter/one-shot permit at 28-42,49-50. There is no new prompt-recognition heuristic.

`gateway/vendor/tmux-agents/cmd-agents-capture.c:176-195` checks identity, retained 120x40 dimensions/history, and captures rows. It has no x guard to relax. Leave this extension and its hash unchanged. Update `base_adapter.js:405` and `process_supervisor_helper.py:4333` runtime pins only. The composer-specific x bounds in `base_adapter.js:183,298,316,370,413-420` remain unchanged: this change applies to approved session-prompt submission, not composer eligibility.

## 3. Binding and refusal invariants

The accepted coordinate domain changes from `0 <= x < width` to `0 <= x <= width`, but the command must still compare the supplied value to the actual screen value in the same server command that checks and enqueues input. It therefore does not create an authenticated-then-written-unbound path: the authorization is bound to server/pane/child, live session/trace, exact visible capture and selected captured payload; the write still rechecks server/pane/child, dimensions, cursor and grid. Cursor-only movement from width to width-1 must refuse even if grid bytes have not changed. No reattachment or second target receives the key.

It also does not create a declared-not-observed path. Geometry is obtained from tmux, bounded and checked twice; visible evidence is captured into a fresh named buffer and decoded strictly (`session_prompt.js:62-88`). `session_prompt_service.js:100-133` re-recognizes the exact capture, verifies the granted approval/action/trace/live binding and policy, validates the selected captured payload, performs the decision CAS, and records attempting before input. Exact server checks and the unread/unparsed-output guard remain the last transport checks. The existing uncertain/refused/sent outcome distinction and terminal recording remain (`session_prompt.js:90-108`, `session_prompt_service.js:70-92,140-142`). A diagnostic must not turn refusal into answered or silently retry an uncertain write.

A pane at x=width that is not in a recognized prompt gets no watcher approval capability and no input. Geometry alone never establishes prompt state. A previously approved menu replaced with nonprompt output must fail capture/recognition binding. An unknown menu remains unknown; default command policy remains pending without a grant. The raw guarded tmux primitive is a general one-CR transport primitive, not a semantic prompt detector. An OS-account operator invoking it directly can already send input to that account's pane; this design does not claim protection from that operator. Automated prompt-only authority remains in the watcher and its private permit. The existing output race after the final unread-output check and provider internal state are residual limits, not reasons to weaken the checks.

## 4. Version and supply chain

Product version is exactly `3.6a-agents.4`; do not accept .3 as a fallback or a prefix. Runtime checks, output filenames, manifest assertions and fixtures change consistently. A .3 server must fail closed under the .4 Gateway even if it lists the command. Existing running servers are not hot-upgraded by replacing an executable.

Current patch SHA256 is `e8139a40bc2badcc95475d003158906444d2b33a7ad8553dcae1e9371b97955d`. Compute the new patch SHA256 only after final patch bytes exist; record that same value in manifest.json and both builders. No proposed digest is invented in this design. Keep the source archive digest above and capture extension SHA256 `4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`. Record output binary hashes separately per platform and prove each tested runtime came from that build.

Builder algorithm stays unchanged. `build-offline.sh:4-7,34-48,53-70` retains the pinned image `node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9`, preexisting-image requirement, pull-never/network-none, read-only mounts/root, dropped capabilities, unprivileged UID, input digest checks, zero-fuzz patching, YACC=true and unchanged generated-parser digest. Only the patch hash, patch filename, version assertion and output filename change. `build-offline-darwin.sh:7,20-25,35-46` likewise changes pins/hash only and retains native preprovisioned tooling and offline behavior. Linux success is not Darwin evidence. CI's preparation of dependencies does not redefine the vendor build as an online builder.

Retain .3 source/manifest/build history in Git and existing checksummed .3 binaries in their separate versioned artifact directories for coordinated rollback; do not overwrite them. Do not keep a second active .3 patch alongside .4 or a dual-version allowlist. Historical review artifacts must keep their original .3 observations and hashes. Current project-status observations remain historical; later append .4 evidence after it exists.

The inventory below enumerates every matching file before this design was created. The reproducible search includes plain and regex-escaped version spellings:

```sh
rg -n -F -e 'agents.3' -e 'agents\.3' --hidden -g '!*.txt.gz' -g '!.git/**' -g '!gateway/node_modules/**' -g '!.venv/**' -g '!workspace/**' .
```

This is a checkout text-pin inventory. Dependencies, Git internals, compressed immutable evidence logs and external workspace artifacts are excluded; none is an active source version pin to rewrite. This design's own historical citations are excluded by taking the inventory before its creation. Each table supplies matching line numbers and the future disposition, rather than globally replacing historical evidence.

### Active files and current observations

Search result: **124 files, 183 matching lines**; 19 files in this table and 105 historical/planning files below.

| File | Matching lines | Future disposition |
| --- | --- | --- |
| `.github/workflows/ci.yml` | 74 | Update binary-output/symlink pin to .4; keep preparation and gate behavior. |
| `docs/project-status.md` | 101 | Preserve dated .3 observation; append new .4 acceptance evidence later, never relabel old evidence. |
| `docs/tmux-runtime.md` | 3, 26 | Update active version/build output and symlink instructions to .4. |
| `gateway/README.md` | 104, 726 | Update active runtime contract to .4; document pending-wrap prompt acceptance. |
| `gateway/src/adapters/base_adapter.js` | 405 | Version pin only; composer geometry remains strict. |
| `gateway/src/adapters/process_supervisor_helper.py` | 4333 | Exact version pin only; retained relay behavior unchanged. |
| `gateway/src/adapters/session_prompt.js` | 52 | Exact .4 version; x equality change as specified above. |
| `gateway/vendor/tmux-agents/README.md` | 9, 44, 67, 68 | Update active build and runtime instructions to .4. |
| `gateway/vendor/tmux-agents/build-offline-darwin.sh` | 20, 21, 35, 39, 46 | Update patch filename/digest and exact version/output pins only. |
| `gateway/vendor/tmux-agents/build-offline.sh` | 55, 62, 69, 70 | Update patch filename/digest, exact version and output filename only (hash constant also at line 6). |
| `gateway/vendor/tmux-agents/manifest.json` | 3, 10, 32, 33 | Update productVersion, patch filename/digest and Darwin output pins; preserve source/extension/image digests. |
| `gateway/vendor/tmux-agents/tmux-3.6a-agents.3.patch` | 42 | Rename active file to tmux-3.6a-agents.4.patch; update suffix and only x predicate. |
| `tests/gateway/claude_first_prompt.test.js` | 24 | Update mocked runtime to .4; retain prompt isolation assertions. |
| `tests/gateway/process_supervisor_session_port_fixture.py` | 4162, 4164, 4421, 4423 | Update version/error pins to .4; preserve retained identity semantics. |
| `tests/gateway/process_supervisor_session_port_relay.test.js` | 1789, 1797, 1817, 1818, 1870, 1882, 1922, 1935, 1936, 2123, 2531 | Update active manifest, patch path, output and runtime/source-regex expectations; preserve real build/hash assertions and relay contract. |
| `tests/gateway/prompt_submission.test.js` | 13, 506, 507, 509, 510 | Update fixtures/assertions to .4; wrong prefix .30 becomes .40; explicitly refuse old .3. |
| `tests/gateway/request_context_reattach.test.js` | 173 | Update required runtime to .4; retain reattachment identity assertions. |
| `tests/gateway/session_prompt_guard.test.js` | 46 | Update escaped version regex to .4 and add exact pending-wrap boundary assertions. |
| `tests/gateway/session_prompt_transport_fixture.js` | 2 | Update runtime fixture to .4 and strengthen exact cursor/geometry binding model; mocks are not C evidence. |

### Historical and planning files

Every row below is retained as evidence of its original candidate. Archived code snapshots/manifests and verdicts retain original bytes, even where an embedded .3 pin would fail the future runtime gate. They are not active imports/build inputs. The A/0/04 transport sheet describes its reviewed .3 baseline; future implementation may append a scoped .4 supersession reference to this design without rewriting its prior RED/GREEN contract. The A/0/04 live report and reviews index keep their original descriptions. The current uncommitted A/0/06 handoff must eventually describe the new candidate and gates in a new trial; its original source quotations and refusal observations remain historical. No such edits are authorized by this design-only step.

| File | Matching lines | Future disposition |
| --- | --- | --- |
| `plan/PROJECT_V6/A/0/04-transport.md` | 211, 237, 333, 340 | Preserve reviewed baseline; append scoped supersession reference only in implementation. |
| `plan/PROJECT_V6/A/0/04.md` | 141 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_0-3_reviewed_OK.md` | 84 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_0-3_to_review.md` | 83 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_0-integrated-gate.md` | 17 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_0-root-feature-gate-red.md` | 7 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_0-trial3-feature-gate.md` | 16 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_1-feature-gate.md` | 17 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_1-integrated-gate.md` | 17 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_3-verifier-integrated-gate.md` | 9 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-5_reviewed_KO.md` | 41, 76, 99, 102 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-6_reviewed_OK.md` | 69, 89, 118 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-build-5_f1_checkpoint.md` | 99 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-final-submit-plan-4_reviewed_KO.md` | 150 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-final-submit-plan-5_reviewed_KO.md` | 122 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-final-submit-plan-5_to_review.md` | 87, 108 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-final-submit-plan-6_reviewed_OK.md` | 108 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-integration-1-root-gate.md` | 4 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-integration-1_reviewed_OK.md` | 106, 149 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-lint-1_reviewed_OK.md` | 42 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-lint-1_to_review.md` | 7 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-10_reviewed_KO.md` | 32 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-10_to_review.md` | 84, 86 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-11_reviewed_OK.md` | 72 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-11_to_review.md` | 90 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-12_reviewed_KO.md` | 57 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-12_to_review.md` | 109 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-13_to_review.md` | 129 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-14_reviewed_OK.md` | 86 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-14_to_review.md` | 108 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-15_reviewed_OK.md` | 98, 112 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-15_to_review.md` | 96 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-16_reviewed_OK.md` | 106, 128 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-16_to_review.md` | 108 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-17-operator-live.md` | 4 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-17_reviewed_OK.md` | 98, 116 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-17_to_review.md` | 116 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-profile-18-root-gate.md` | 4 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-1_reviewed_KO.md` | 32, 54 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-1_to_review.md` | 31, 102 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-2_to_review.md` | 94 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-3_reviewed_OK.md` | 59 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-3_to_review.md` | 110 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-4_reviewed_OK.md` | 76 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-4_to_review.md` | 110 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-live-startup-5_reviewed_OK.md` | 92 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-root-full-gate-redis7.md` | 17 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-status-1_reviewed_KO.md` | 35 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_4-status-2_reviewed_OK.md` | 46 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_5-integrated-acceptance.md` | 23 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_5-integration-1_reviewed_OK.md` | 59 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_5-integration-1_to_review.md` | 103 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_5-pre-live-gate.md` | 17 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_5-status-1_reviewed_KO.md` | 58, 70 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_5-trial4-wrong-pin-gate.md` | 7 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-1_reviewed_KO.md` | 41 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-1_to_review.md` | 85 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-2_reviewed_KO.md` | 30 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-2_to_review.md` | 110 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-3_to_review.md` | 132 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-4_to_review.md` | 95 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-6_reviewed_KO.md` | 35, 54 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-6_to_review.md` | 27 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-7_reviewed_OK.md` | 43 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-7_to_review.md` | 87 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-8-full-gate.md` | 10 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-8_reviewed_OK.md` | 45 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-8_to_review.md` | 62 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-livefix-1_to_review.md` | 30 | Preserve current trial evidence; use new trial/candidate handoff for .4; never relabel historical quotations. |
| `plan/PROJECT_V6/reviews/A_0_6-merged-gate.md` | 12 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-1-host-attribution.md` | 9 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-1_reviewed_KO.md` | 256 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-1_to_review.md` | 92 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-2-host-attribution.md` | 13 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-2_reviewed_OK.md` | 266 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-2_to_review.md` | 147 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-live-1.md` | 16, 22 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/A_0_6-operator-merged-gate.md` | 13 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/README.md` | 45 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_0-3-attempt1-red.txt` | 4 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_0-3-focused-green.txt` | 4 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_0-3-mode-red.txt` | 4 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-f1-build5-candidate-files.json` | 2 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-10-entry.patch` | 192 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-10-files.json` | 31 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-11-entry-test.js` | 22 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-12-entry-base_adapter.js` | 206 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-12-entry-claude_first_prompt.test.js` | 22 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-13-entry-base_adapter.js` | 206 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-13-entry-claude_first_prompt.test.js` | 23 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-14-entry-base_adapter.js` | 206 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-14-entry-claude_first_prompt.test.js` | 23 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-15-entry-base_adapter.js` | 206 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-15-entry-claude_first_prompt.test.js` | 24 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-16-entry-base_adapter.js` | 206 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-16-entry-prompt_submission.test.js` | 13, 506, 507, 509, 510 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-17-bound-live.json` | 9 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-17-entry-base_adapter.js` | 212 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-17-entry-prompt_submission.test.js` | 13, 506, 507, 509, 510 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-root-final-gate-redis7.md` | 9 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-trial3-candidate-files.json` | 24 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-trial4-candidate-files.json` | 24 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-trial4-entry-files.json` | 24 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-trial4-preservation.json` | 30 | Preserve original historical evidence; no replacement. |
| `plan/PROJECT_V6/reviews/evidence/A_0_4-trial6-candidate-files.json` | 24 | Preserve original historical evidence; no replacement. |

## 5. TDD and verification plan

Independent design OK is the prerequisite to executing this section. No test/build/live command was executed as part of this design-only task. Implementation must save immutable RED/GREEN outputs, candidate SHA/tree, exact commands, runtime hashes and outcomes in its new review trial; a separate assigned reviewer supplies the verdict.

### Node RED and GREEN

1. Preserve the existing RED `live Codex 0.162 pending-wrap geometry 80|24|80|23 delivers the approved captured command` at `tests/gateway/session_prompt_diagnostics.test.js:168`, whose current result is refusal at geometry_unavailable (`plan/PROJECT_V6/reviews/A_0_6-livefix-1c-red.txt.gz`). This is evidence of the original .3 failure, not .4 GREEN. Maintain the byte-faithful pending-wrap command fixture.
2. Before changing guards, add a boundary matrix with real captured command menus: width 80/height 24, x=79/y=23 baseline accepted, x=80/y=23 accepted after grant, x=81/y=23 refused without input, x=80/y=24 refused without input. Keep negative/malformed/overflow numeric cases. Change the old generic geometry-negative fixture using x=width (`session_prompt_diagnostics.test.js:66`) to x=width+1 so its intent remains invalid-geometry refusal. Never delete it to obtain GREEN.
3. Assert emitted guarded command args include the exact `-c 80` and `-l 23`, with one fixed Enter, no normalization and no persistent selection. Assert attempting precedes sent, answered requires recorded sent, stored and audited refusal diagnostics agree, and approval remains pending/no input without an operator grant. Add cursor-only stale-state tests: capture unchanged but actual x changes to 79; y changes independently. The transport fixture must enforce all geometry/identity bindings, not just grid consumption.
4. Add x=width nonprompt and unknown-menu cases: no capability/approval/no input; replace an approved capture with nonprompt output and require refusal. Preserve command payload/policy mismatch, approval invalidation, changed grid/PID/session/trace, no replay, cleanup failure/uncertain outcomes, fixed Enter and sibling/composer isolation tests. Keep wrapped long-command and short-command recognition tests from the earlier F1/F2 candidate.
5. Move fixture runtime pins to .4 so equality tests reach the geometry guard. Explicitly reject .3, stock 3.6a, prefix .40 and missing command capability. GREEN requires both guards and pins to agree; a JavaScript-only relaxation must not be accepted.

Run the focused prompt/diagnostic/guard/transport/guarded-submit/guarded-paste suites, external response, crash/replay, request-context reattachment and supervisor relay suites. Run Gateway lint and the complete Gateway suite; then run the repository's full required gate from repository root (`bash scripts/ci.sh`) under the documented runtime/Redis configuration. The earlier candidate's full Gateway run reported 2172 tests, 2116 pass, 36 fail and 20 skip; those historical failures cannot be described as a clean gate or waived by this design. Record and resolve current failures according to the actual CI contract; do not silently inherit a baseline waiver.

### Real C guard and build verification

Build .4 using the unchanged offline mechanism and verify source, extension and final patch hashes, zero fuzz, generated-parser equality, exact version and output binary hash. Verify the applied/generated cmd-agents-submit.c contains only the approved guard/version semantic edits; source regex tests alone cannot prove the binary behavior.

Use the built .4 binary on a uniquely named, test-owned tmux socket and a raw/noecho PTY child with observable input bytes. Construct pending wrap deterministically: enable wrapping and bracketed paste, position at row 24/column 1 in an 80x24 pane, write exactly 80 printable ASCII characters without a final CR/LF; render the recognized menu above it. A hidden cursor can reproduce the live case. Wait for output to be parsed and assert actual reported x=80/y=23 and capture bytes before submitting. The fixture must fail setup if it only declares that state. Its rendered last row must fit without unintended wrap/scroll.

Capture a fresh submit buffer and bind observed server/pane/child/dimensions/cursor. Invoke agents-submit-v1 and assert exactly one byte 0x0d received by the child, no extra keys/sibling input. For the raw/noecho child, do not require an automatic tmux cursor reset. Separately make the child emit output CR and assert x=0, same y; the next printable character in a fresh pending-wrap state must exhibit upstream wrap behavior. These distinguish PTY input from output-parser semantics.

Repeat with x=width+1 and y=height arguments and require exit 1/refusal, consumed buffer and zero input. These invalid arguments also fail exact-state binding because upstream cannot ordinarily expose those states; do not claim they independently isolate the range predicate. Exercise valid x=width against actual x=width-1 using cursor-only output that leaves the visible grid unchanged; stale cursor must refuse. Independently exercise stale y, dimension/PID/target/grid drift, input-off, pane mode, synchronization, missing framing and unread/unparsed output per the existing guard contract. Bind assertions to emitted input, not fixture expectations alone.

Mutation checks must show that reverting the JS `>` to `>=` fails the Node equality test; reverting the C predicate and rebuilding fails the real-byte equality test even with JS changed; removing exact x/y re-verification fails the cursor-only drift tests. Preserve immutable RED/GREEN evidence and identify which layer rejected each case. Failed/missing build prerequisites are failures or explicitly blocked verification, never GREEN.

Use the required real-runtime lanes (`D007C_TEST_TMUX_PATH` as the probe directory, `D007C_RUN_REAL_TMUX_PROBE=1`, and `A04_TEST_TMUX` as the full built binary path) according to their existing tests and `docs/ci-contract.md`. Required Redis lanes must run; `docs/ci-contract.md:215-233` distinguishes conditional skips from DEFERRED/required failures. Report exact skip IDs and reasons, required budget and gate output. Do not widen the skip budget. Verify Darwin natively on each claimed architecture using its builder or explicitly withhold that platform's .4 verification claim; Linux is insufficient.

### Live acceptance repeat

After automated gates, repeat operator-owned live acceptance on a fresh .4 server/Gateway session with Codex 0.162: trust prompt, short command F2, long wrapped command F1, and the exact pending-wrap command case. Record actual version/hash, server/pane/child/geometry, raw visible capture, provider version, approval ID, operator grant, stored transport result and audit events. A uniquely scoped approved temporary marker command must produce its marker; CLI exit zero alone does not establish execution. Require stored answered + audit sent/answered + marker evidence for the same live prompt, with no invalidation falsely credited as success.

Repeat refusal/no-input cases for no grant/default policy, denied scope, changed prompt/cursor and replay. No persistent-choice key, automatic command scope or policy-file change is part of this fix. Use fresh approval IDs after invalidation. Integration, promotion and release remain separate from implementation/review; a release claim additionally requires the required gate/skip evidence and main/tag resolving to the same candidate object.

## 6. Rollback and residual risks

Rollback is coordinated: restore the prior Gateway checks, vendor manifest/build pins and .3 binary together from checksummed/versioned artifacts. Stop/restart only the owned Gateway/test sessions and deliberately create a fresh .3 server; do not overwrite a running server executable, kill unrelated servers or assume changing PATH updates an existing server. .3 retains the known fail-closed pending-wrap limitation. A .4 Gateway against .3 must refuse, which is preferable to a mixed-version partial deployment.

Consumed or uncertain approvals must not be replayed after rollback. Retire/invalidate stale bindings; reobserve any still-live prompt and request a fresh bound approval. Preserve all prior traces, marker results, binary hashes and review evidence. Rollback does not authorize command auto-approval or turn a previously refused/uncertain action into answered.

Residuals: visible grid and cursor do not prove the provider's internal semantic state; asynchronous output can arrive after the last unread-output check; enqueue success is not command execution; cursor visibility says nothing about prompt validity. The same-account operator can directly control tmux or replace artifacts, and a version string is not cryptographic attestation. Hash/build provenance and live observed binding supply the intended evidence within that existing trust boundary. The pending-wrap allowance cannot be reused as composer permission. Unsupported/missing platform gates and any full-suite failures must stay visible. Only the independently assigned reviewer may accept this design; code, binary changes and a new review trial remain future work.
