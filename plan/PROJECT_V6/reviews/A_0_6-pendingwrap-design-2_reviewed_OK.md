# Review A_0_6-pendingwrap-design-2 — OK

**Task:** `plan/PROJECT_V6/A/0/06-pending-wrap.md` (design only; request `A_0_6-pendingwrap-design-2_to_review.md`)
**Trial:** 2
**Branch:** `feat/V6-A-0-06-live-fix`
**Commit:** `f2436c4` (`f2436c4a03de46584e48ceab977c800a50d1bc04`). The design's SHA-256 `a9cfbae2e5bc262f202393ddec8f11fce90ce7e4518c1e425524cb7ef7ce9862` matches the request, the working file and the HEAD blob.
**Contract:** corrections 1–5 of `52ea29a:plan/PROJECT_V6/reviews/A_0_6-pendingwrap-design-1_reviewed_KO.md`.
**Reviewer:** fresh independent Claude Code reviewer session (Opus 5.5), brief `workspace/briefs/a06-pendingwrap-design-reviewer-2.md`. I did not author the design and did not review trial 1. No sub-agents were used, and no coder material counts as verdict evidence.
**Date:** 2026-10-09

## Verdict

**OK.** All five trial-1 corrections are carried, and I found no blocking defect.

The design is still the minimal change:

- the C predicate `cx >= width` becomes `cx > width` (old patch line 191);
- the JS x comparison at `session_prompt.js:69` becomes `>`;
- the version suffix (old patch line 42) and the exact runtime pins move to `.4`, with no `.3` fallback;
- every other C and JS guard, the composer bound and the capture extension stay unchanged.

What I did:

- re-checked every upstream citation against the 3.6a release source;
- re-ran both pin searches;
- built the candidate and both C over-relaxation mutants in reviewer scratch, and drove them on private sockets.

The planned C range test catches both mutants with real bytes. The planned JS and composer tests catch theirs by construction.

I found no path where x == width lets a key reach a pane that is not showing the approved, recognized prompt.

This OK authorizes implementation of exactly design `a9cfbae2…` and nothing else. It is design approval only: it authorizes and evidences no code, patch, manifest, binary, integration, promotion or release. The notes at the end clarify how the implementation trial will be checked against this design; they add no scope.

## Corrections 1–5 (acceptance bar)

| # | Required by trial 1 | Where trial 2 carries it | Reviewer check |
| --- | --- | --- | --- |
| 1 | Correct the upstream claim; C x range is load-bearing; real x>width test; two C mutants | §1 `:23` (alternate-screen shrink: `window.c:1094`, `screen.c:304,318-336`, `format.c:1709-1715`); §3 `:44` ("load-bearing, not redundant"); §5 `:246` (x=81 shrink test asserting observed `cursor_x > pane_width`, exit 1, consumed buffer, zero bytes; no-shrink control; x=90 case); §5 `:248` (deleted and `cx > width + 1` mutants must deliver) | False sentence removed. Reproduced below: both mutants deliver at x=81, and x=90 alone misses `+ 1` |
| 2 | Isolate the JS x predicate | §5 `:221` (x=width+1: detail `geometry_unavailable`, no `agents-submit-v1`/`send-keys`, no `attempting`, via `assertRefusal`; both JS mutants must fail even with a binding-enforcing mock) | Holds by construction (below) |
| 3 | Test the composer bound that C no longer backs | §5 `:228-234` (general Codex `301-333`, pi `335-344`, opencode `345-362`, paneState `260-268`; ready and guard-observation tests with zero load/paste/submit/send-keys; line-420 deletion mutant) | Citations exact; holds by construction; see note 2 |
| 4 | Complete the active pin inventory | `gateway/README.md` row adds bare suffixes `100-101` with exact `.4` and `.3`-and-older refusal; bare-suffix search §4 `:66-72`; Darwin digest `:5`, Linux `:6` | Re-run below |
| 5 | Binary reproducibility and provenance | §4 `:54` (clean A/B builds compared with `cmp`, full SHA-256, provenance ledger including the `.3` RED and mutant hashes, `/proc/<server pid>/exe` for live); §5 `:238` (`git diff -M` from `bbab86b`: rename, exactly old lines 42 and 191; 7 headers and 12 hunks kept) | Reproduced below |

The trial-1 non-blocking notes are also applied:

- the C RED test is named, with the full `.3` hash (`:240`, `:262`);
- LF/RI stale-y and BS/CHA stale-x tests (`:222`);
- fixture pane state instead of the intercept (`:220`);
- the `:69` and `:18-27` citation fixes;
- the three equality origins, plus "provenance is not authority" and live-only provider evidence (`:9`, `:21-23`, `:266`);
- all three watcher prompt kinds (`:242`).

**Operator decisions, recorded faithfully.**

- **Pending-wrap decision.** Line 7 and §5 match `76b250b:plan/PROJECT_V6/reviews/A_0_6_pending_wrap_decision.md:18-27`: accept exactly `cx == width`, re-verify at submit, no other relaxation, design first.
- **Cutover decision.** §7 matches `6212f72:plan/PROJECT_V6/reviews/A_0_6_pending_wrap_cutover_decision.md:9-15`:
  - manual restart of a running `.3` server only when no sessions are live;
  - until then a `.4` Gateway sends no prompt answer, composer submit or relay handshake;
  - no automatic restart;
  - linux/amd64 only, with Darwin `.4` excluded from the 1.1.0 claim until a native build exists.
- **Live state.** The quoted state `1926680|%0|1926681|80|24|80|23|0` equals `workspace/a06-live/run-170128/geometry.txt`. The pending-wrap fixture is byte-identical to `command-prompt-geometry.txt` (`d6328f9116c3af6c8bba4f0ebf231e2ae0b0b1ea4b51b7f400c51f51ad4d4fd1`).

## What I verified

### 1. Upstream semantics (tmux 3.6a release source)

The archive SHA-256 `b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759` matches the manifest. I extracted it into reviewer scratch. Every cited range matches the source:

- **Screen and setter.**
  - `tmux.h:956-964,1070-1071`;
  - `screen-write.c:85-106`: x greater than width is clamped to width-1, equality is kept, and y is clamped below height.
- **Writes and pending wrap.** `screen-write.c:2065-2073`, `1842-1900` (including `1890-1892`), `1904-1946`, `1994-2004`.
- **Cursor movement.**
  - CR: `screen-write.c:1527-1532`;
  - LF: `1451-1464`;
  - CUU/CUD: `916-917`, `943-944`;
  - BS: `1010`;
  - RI keeps x: `1399-1400`.
- **Input and format.** `input.c:1332-1341`, `1873-1874`, `1965-1966`; `format.c:1666-1675`, `1709-1715`; `input-keys.c:404-425`, `638-645`.
- **Resize.** `window.c:1094` (no reflow in the alternate screen); `screen.c:304,318-336` (old x kept); `screen.c:357-408` (y re-clamped).
- **Patch anchors.** `options-table.c:372` is the `exit-empty` default (patch `:34-36`); `tmux.c:346` is the version string (patch `:42`).

Two observations. Neither is a defect: the design words its origin lists as non-exhaustive, and the guard does not depend on provenance.

- **Main-screen reflow also yields equality.** `grid.c:1504-1505,1529-1532` place a cursor that sits past the line content at the last row's `cellused`. I observed this on `.3`: an 80-cell line with the cursor at `100|80|4` (width|x|y, main screen) became `80|80|4` after `resize-window -x 80`.
- **x > width needs a no-reflow resize.**
  - CUP and DECRC clamp through `screen_write_cursormove` (`screen-write.c:1370-1371`, `input.c:851`).
  - `screen.c:686-691,714-717` clamp x to width-1 on alternate-screen exit.

### 2. Reviewer reproduction (observed, not declared)

**Binaries.**

- **Retained `.3`.** SHA-256 `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`, which I re-hashed.
- **Three reviewer-scratch `.4` builds.**
  - **How they were built.** From a scratch copy of `gateway/vendor/tmux-agents/`, using the unchanged offline flow: pinned image present locally, `--pull never`, `--network none`, digest checks, zero-fuzz patch, generated-parser check and version assertion.
  - **Builder diff.** The scratch builder copies differ from `build-offline.sh` only in the patch digest, patch filename, version assertion and output filename, exactly as §4 states.
  - **Patch diff.** Each scratch patch differs from the `.3` patch at `bbab86b` in exactly lines 42 and 191.
  - **Rename criterion.** A throwaway-repository `git diff -M` of the candidate shows a rename at 98% similarity, 2 insertions and 2 deletions, in hunks at old lines 39 and 188. So §5's criterion is checkable as written.

| Scratch build | Patch SHA-256 | Binary SHA-256 |
| --- | --- | --- |
| candidate `cx > width` | `785a1df2c91e05448a60d69b1ae8fab52f2f3088bc730be3b74da678e7ebd02d` | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` (two clean builds, `cmp` identical) |
| mutant: x range deleted | `98b66323bcd60fdbd9f759b68ae36f36888290eb1bb240dfdd037f6add9e983b` | `e0c69ef87c78759b57ca31c0727a413bc1106950a281a6425bb7e1f8b78932a3` |
| mutant: `cx > width + 1` | `129b1098b8d9f9bdabc02a67e92923d119407bbd6fd4f4bb9d852210a3cc8712` | `7682e067df266e3f2358306b68a4b138540cfcbaf546dad9d02842896f4be730` |

**Harness.**

- **Child.** A raw, no-echo Python PTY child that records every input byte to a file and emits further output only on a driver trigger.
- **Sockets.** Each run used a private relative socket in reviewer scratch with `-f /dev/null`, and every server was killed afterwards. One server was left over by a truncated pipe; I killed it through its own socket. No repository or user server was touched.
- **Submit.** Each submit bound the freshly observed `#{pid}|#{pane_id}|#{pane_pid}|width|height|cursor_x|cursor_y` and a fresh `capture-pane -N -T` evidence buffer. Every buffer was consumed.

**Alternate screen with bracketed paste in a 100x30 pane** (state shown as width|height|x|y):

| Case | Observed state | `.3` | candidate | mutant: deleted | mutant: `+ 1` |
| --- | --- | --- | --- | --- | --- |
| x=81, then `resize-window -x 80` | `80\|30\|81\|0` | refused, 0 bytes | refused, 0 bytes | **one `0d` delivered** | **one `0d` delivered** |
| x=90, then shrink to 80 | `80\|30\|90\|0` | refused | refused | `0d` | refused |
| control: x=81, no shrink | `100\|30\|81\|0` | `0d` | `0d` | `0d` | `0d` |
| x=80, then shrink to 80 (stale-cursor equality) | `80\|30\|80\|0` | refused | `0d` | `0d` | `0d` |

**Pending wrap in an 80x24 pane** (observed `80|24|80|23`, cursor hidden):

| Construction | `.3` | candidate |
| --- | --- | --- |
| last-column write: 80 printable characters on row 24 | refused, 0 bytes | exactly one `0d` |
| trial-1 LF shape: 41-cell footer on row 24, full row 23, bare LF | refused, 0 bytes | exactly one `0d` |
| live redraw: fixture rows, 80 characters on row 23, `CSI 2 K` at x=80, bare LF | refused, 0 bytes | exactly one `0d` |

The live-redraw construction's `capture-pane -p -N -T` is byte-identical to `codex-0.162-pending-wrap-command.txt` (`d6328f91…`). So the command-kind watcher test can use a genuinely rendered capture equal to the live one, at the live geometry.

**Stale cursor at equality (candidate).** Each case binds state and evidence, makes the child emit cursor-only output, and then submits. The control submits the new state with the same old evidence.

| Output after binding | Cursor change | Old arguments | Control |
| --- | --- | --- | --- |
| BS | x 80→79 (y 23) | refused, 0 bytes | one `0d` |
| LF on an interior row | x stays 80, y 4→5 | refused, 0 bytes | one `0d` |
| RI on an interior row | x stays 80, y 4→3 | refused, 0 bytes | one `0d` |
| CUU | x 80→79 and y 4→3 | — | confirms CUU cannot isolate y |

The controls prove the grid was unchanged and only the cursor binding refused.

**What this shows.**

- The x=81 shrink test isolates the load-bearing range predicate, with every binding field matching.
- A test using only x=90 would miss `cx > width + 1`, as `:246` says.
- RED on `.3` and GREEN on the candidate for equality are real-byte results, not declared state.
- A stale cursor at x == width refuses.
- Two clean builds are byte-identical.

**Status of these binaries.** They are reviewer evidence about the design's semantics only. They are not build A or B, not canonical, not pins, and not evidence for any implementation trial. The implementation must build, hash and record its own binaries. If its final patch bytes equal `785a1df2…`, the same binary hash is expected; a mismatch is a reproducibility finding.

### 3. JS and composer predicates (by construction; Node was not run)

**JS x comparison.** Take x=81 at width 80. Deleting the x comparison, or widening it to `> width + 1`, lets the request through `session_prompt.js:69`. It then reaches evidence capture, `authorize` (the `attempting` CAS and audit at `session_prompt_service.js:121-132`) and `agents-submit-v1`. The post-attempt outcome carries no detail (`session_prompt.js:89`). The planned `assertRefusal(fx, "geometry_unavailable")` (`session_prompt_diagnostics.test.js:49-64`) therefore fails on the detail, the audit and the call, however the mock models C. Reverting `>` to `>=` fails the equality GREEN.

**Composer bound.** Deleting the x comparison at `base_adapter.js:420`, or relaxing it to `>`, lets an x == width observation reach classification. General Codex, pi and opencode do not bound x. So:
- a ready fixture with empty text proceeds to load and paste;
- a guard-only x == width fixture proceeds to `agents-submit-v1`.

Both planned tests fail. The bounds for Claude Code (`:370`), post-turn (`:183`), warning-footer (`:298`) and queue-footer (`:316`) are independent and unchanged.

### 4. Pin inventory, re-run at `f2436c4`

**Full-version search** (§4 `:63`): 190 lines in 126 files. Compared with the trial-1 snapshot of 124 files and 183 lines, the differences are exactly:

- 5 lines in the design itself (`:25,36,63,93,272`);
- 1 line in the trial-1 KO (`:131`);
- 1 new line in the review index (`README.md:11`); the index's old `:45` is now `:46`.

All 19 active files match the active table line for line, and every historical row matches.

**Bare-suffix search** (§4 `:69`): exactly `gateway/README.md:100-101`.

**Wider search.** Outside `plan/`, I also searched for `agents` followed by any version spelling, and for bare `.3` near runtime words. It found no other active runtime pin. The remaining `.1` and `.2` mentions are historical prose or old-runtime refusal fixtures (`prompt_submission.test.js:444,528`).

**Digest constants:** `build-offline.sh:6`, `build-offline-darwin.sh:5`, `manifest.json:11`.

### 5. Local citations and evidence

These hold against the baseline candidate:

- `session_prompt.js:28-42,49-52,62-108`;
- `tmux_client.js:73-81`;
- `session_prompt_service.js:70-92,100-133,140-142`;
- `base_adapter.js:183,260-268,298,301-362,370,405,413-420`;
- `process_supervisor_helper.py:4333`;
- `cmd-agents-capture.c:176-195`, which has no x guard;
- patch `:112-124,155-160,169-186,188-196,198-212,214-216,218`;
- `process_supervisor_session_port_relay.test.js:1880-1890`; the two-line edit keeps 7 headers and 12 hunks;
- builders `build-offline.sh:4-7,34-48,53-70` and `build-offline-darwin.sh:5,20-25,35-46`;
- `session_prompt_diagnostics.test.js:69,168-179`.

Evidence files:

- The RED `A_0_6-livefix-1c-red.txt.gz` refuses at `geometry_unavailable`, exit 1.
- The historical Gateway totals 2172/2116/36/20 match `A_0_6-livefix-1b-gateway.txt.gz`. The design does not waive them.

### 6. Binding: no x == width path to an unapproved pane

- **Callers.** Only two callers send `agents-submit-v1`:
  - `session_prompt.js:91`, behind the watcher permit;
  - `base_adapter.js:442`, behind the `:420` bound.

  No other path relied on C's old `x < width`. The Python relay pins the version only and sends no submit.
- **Prompt path.** The watcher grants capability only for a recognized capture (`session_prompt_service.js:152-156`); it never consults geometry. At answer time the Gateway:
  1. re-reads identity and state;
  2. captures fresh evidence;
  3. requires `samePromptCapture` with the approved capture;
  4. re-recognizes the prompt.

  C then compares, in the one command that writes the single CR:
  - the live grid byte for byte with that evidence;
  - live `s->cx/s->cy` with the observed values.

  x is never a cell index. So input reaches the pane only while it shows the approved, recognized capture.
- **Accepted states.** Equality is accepted whatever its origin, including the stale alternate-screen cursor observed delivering at `80|30|80|0` and the reflow case. This is the design's stated consequence ("provenance is not authority"). The same class of states was already accepted at x < width under `.3`.
- **Cutover.** A `.4` Gateway refuses a `.3` server through exact `#{version}` checks at `session_prompt.js:52`, `base_adapter.js:405` and `process_supervisor_helper.py:4333`. The patch's `exit-empty` default of 0 justifies the manual-restart rule.

## Non-blocking notes for the implementation trial

1. **Erratum in §7, last paragraph.** "The trial-2 request records the pre-decision design hash" is stale. At `f2436c4` the request records `a9cfbae2…`, which is the reviewed design including §7. This verdict fixes the reviewed identity; the sentence has no implementation effect.
2. **Composer fixtures must isolate the bound.**
   - **The trap.** Placeholder text becomes "" only at cursorX 2 (Codex, `base_adapter.js:311`) or 3 (opencode, `:359`). A placeholder fixture at x == width therefore fails `requireComposer(ready, "")` for the wrong reason, and the line-420 mutant would survive.
   - **Required construction.** Use empty-text composer rows. Pair each branch's x == width case with an x = width-1 control that reaches load and paste.
   - **Mutants.** Run the deletion mutant, and a `>=`→`>` relaxation at `:420`, against each of the three branches.
3. **C RED must fail at delivery.** The RED against `6487f795…` must fail on its refusal or zero-byte assertion, not on a `.4` version-pin assertion. Parameterize the pin for that run. The reverted-predicate `.4` mutant gives the same-reason RED.
4. **Mutant provenance.** For each rebuilt mutant, record:
   - its one-line patch diff against the canonical `.4` patch;
   - the builder-copy diff (digest, filename, version and output only);
   - its binary hash.

   Build mutants outside the repository's vendor directory.
5. **Re-run both inventory searches at the implementation candidate.**
   - New matches must be plan or review history only.
   - After the edit, active `.3` occurrences must be only deliberate refusal fixtures, the README refusal wording and dated status prose.
6. **Name the runbook.** `docs/tmux-runtime.md:49-52` (runtime deployment) is the natural home for the manual-cutover rule and the linux/amd64-only scope.
7. **Relay `.3` refusal evidence.** It rests on exact string inequality plus a source regex (`process_supervisor_session_port_relay.test.js:1870,1922`). A behavioral refusal test is optional, but it would match the operator decision more directly.
8. **Wording.**
   - Add the main-screen reflow origin to the residuals.
   - `docs/ci-contract.md:215-233` says `infrastructure_unavailable`, not "DEFERRED".
   - The LF/RI/BS/CHA techniques at `:222` belong to the real-tmux tests; Node mocks change values directly.

## Review process

- **Read-only.** Apart from this single file, no repository file, index or Git state was changed. Indexing this verdict in `plan/PROJECT_V6/reviews/README.md` is left to the orchestrator, because the brief allows exactly one file.
- **Scratch work.** The scratch builds, sockets and the throwaway Git simulation stayed in the reviewer scratchpad.
- **Not run.** No Node test, gate or live run was executed.
- **Budget breach.** This review exceeded the AGENTS.md Rule 6 per-session budget: about 290k tokens against 150k, mostly spent on source verification and the real-tmux reproduction. I am surfacing it here rather than hiding it.

## Status

A/0/06 pending-wrap design: **reviewed OK** at `f2436c4` (`a9cfbae2…`).

- The `.4` implementation, build, gate and live acceptance remain **PLANNED**.
- This verdict implements, integrates, promotes and releases nothing.
- The baseline live-fix candidate is still uncommitted and has no verdict (`A_0_6-livefix-1_to_review.md` only). The implementation trial must hand off that candidate together with the `.4` change.

That trial needs:

- a fresh orchestration trace;
- immutable RED/GREEN, mutation and provenance evidence;
- a separately assigned independent reviewer.
