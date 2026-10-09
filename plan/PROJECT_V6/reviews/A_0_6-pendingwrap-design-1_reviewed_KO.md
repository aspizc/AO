# Review A_0_6-pendingwrap-design-1 — KO

**Task:** `plan/PROJECT_V6/A/0/06-pending-wrap.md` (design only; request `A_0_6-pendingwrap-design-1_to_review.md`)
**Trial:** 1
**Branch:** `feat/V6-A-0-06-live-fix`
**Commit:** `bbab86b` (`bbab86b42ed613155c979373af4d040bb9633642`). The design's SHA-256 `8aec442a85dfe6c16db51128812b7fad60533fc4ad04035ba3f021ab410e0d8f` matches the request.
**Reviewer:** independent Claude Code reviewer session (Opus 5.5). I did not author the design. No sub-agents were used, and no coder material counts as verdict evidence.
**Date:** 2026-10-09

## Verdict

**KO.** The core design is right and should be kept:

- one C predicate changes, `cx >= width` to `cx > width`;
- the JS x comparison changes the same way, `>=` to `>`;
- every other guard is unchanged;
- the runtime pin is exactly `3.6a-agents.4`, with no `.3` fallback.

The binding survives. `cx != s->cx || cy != s->cy` is still checked against the live screen in the same server command that compares the grid and enqueues the one CR byte. I found no authenticated-then-written-unbound path and no declared-not-observed path.

Two things block an OK:

- **A wrong upstream claim.** The design says upstream cannot ordinarily expose x > width. It can: an alternate-screen shrink leaves the cursor past the pane width (see correction 1).
- **A test plan that does not catch over-relaxation.** The planned tests would still pass if any of these checks were deleted or loosened:
  - the C x range check;
  - the JS x comparison, once the mock models the C guard;
  - the composer's x bound, which after `.4` is enforced only in JS.

Rule 9 and brief item 5 require tests that fail when the predicate is wrong.

Corrections 1–5 below are required in the next trial. Pending-wrap stays **PLANNED**. This verdict authorizes no code, build, vendor or binary change.

## What I verified (holds)

1. **Upstream citations.** I verified the tmux 3.6a archive (SHA-256 `b6d8d9c7…3759`) and extracted it into reviewer scratch. Every cited range matches the release source; no source text is misquoted. The checked ranges:
   - `tmux.h:956-964,1070-1071`;
   - `screen-write.c:85-106`: x greater than width is clamped to width-1, while equality is kept;
   - `screen-write.c:2065-2073`, `1842-1900` (including `1890-1892`), `1904-1946`, `1994-2004`, `1527-1532`;
   - `input.c:1332-1341`, `1873-1874`, `1965-1966`;
   - `format.c:1666-1675` and `1709-1715` (`cursor_x` is the raw `wp->base.cx`);
   - `input-keys.c:404-425`, `638-645`.

   The one wrong inference is covered by correction 1.
2. **Reviewer reproduction (observed, not declared).**

   **Setup.** I used the retained pinned `.3` binary, SHA-256 `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386` (A_0_4-6 found it bit-identical to the binary used for GREEN). It ran on private scratch sockets with `-f /dev/null`. Each child was `sh -c 'stty raw -echo; printf …; exec sleep 300'`. Every server was killed afterwards, and no repository or user server was touched. Results:
   - **Pending wrap.** I wrote 80 printable characters on row 24 of an 80x24 pane, with wrap mode (DECAWM) on and the cursor hidden. The result was `80|24|80|23|cursor_flag=0`, the live shape. `.3` `agents-submit-v1` with the observed values exited 1 with `agents: guarded submit refused`. This confirms the C guard is the blocker.
   - **Output CR.** An output CR from that state gave x=0 with y unchanged at 23, so §1's CR claim holds.
   - **LF after pending wrap.** I wrote a footer on row 24, then a full 80-column row 23 followed by a bare LF. The result was `80|24|80|23`, with a last row of only 41 used cells. This is the same shape as the live sample.
     - Supporting upstream lines:
       - LF keeps x (`screen-write.c:1464`);
       - CUU/CUD cancel pending wrap (`screen-write.c:916-917`, `943-944`);
       - BS moves width to width-1 (`screen-write.c:1010`).
     - The candidate fixture `codex-0.162-pending-wrap-command.txt` is byte-identical to `run-170128/command-prompt-geometry.txt` (SHA-256 `d6328f91…`). Its bottom row also has 41 cells.
3. **Binding.**

   **C guard.**
   - Patch `:188-196` compares the supplied x/y to `s->cx`/`s->cy` after checking exact width and height.
   - x is never used as a cell index: the grid compare at `:198-212` uses `screen_size_x(s)`.
   - The capture flags `-N -T` resolve to grid-string flags 0 (`cmd-capture-pane.c:191-194`), which is exactly what the guard uses.

   **JS side.**
   - The JS values come only from `display-message` (`session_prompt.js:62-71`).
   - They are re-read after the evidence capture (`:83-84`).
   - They are forwarded verbatim (`tmux_client.js:78-81`).
   - The approval binding (`samePromptCapture`) never included geometry, and nothing new is declared.
4. **Composer path.** `base_adapter.js:183,298,316,370,413-420` is untouched. I agree it should stay strict. There is no evidence of a composer at pending wrap, and the `cursorX === text.length + 2` check is ambiguous at x = width. Correction 3 covers the test this now needs.
5. **Supply chain.**
   - **Digests.** The patch (`e8139a40…955d`), extension (`4d80a861…7e27`), source and builder-image digests match `manifest.json` and both builders.
   - **Inventory re-run.** I re-ran the design's `rg` exactly. Excluding the design itself, it returns 124 files and 183 lines. Both tables match it file by file and line by line.
   - **Precedent.** One active patch, no dual-version allowlist, and history kept in Git all follow the `.1`→`.2`→`.3` precedent.
   - **Patch structure.** The two-line edit does not change the structure the relay test asserts at `process_supervisor_session_port_relay.test.js:1880-1890` (7 `diff --git`, 12 `@@`).
6. **Rollback.** Rollback and most residuals are stated honestly. A `.4` Gateway fails closed against a `.3` server, because `#{version}` reports the server's own version string.

## Required corrections

1. **Correct the upstream claim and make the C range predicate tested.**

   **The claim.** §5 (design line 224) says the x=width+1 and y=height arguments fail exact-state binding "because upstream cannot ordinarily expose those states". That is false for x:
   - in the alternate screen, `window_pane_resize` resizes without reflow (`window.c:1094`);
   - `screen_resize_cursor` then keeps the old `s->cx` (`screen.c:304,318-336`);
   - `cursor_x` reports that value (`format.c:1709-1715`).

   **What I observed.** Alternate screen on, bracketed paste on, cursor at column 91 of a 100x30 pane:

   | Case | Observed state | `.3` agents-submit-v1 |
   | --- | --- | --- |
   | Positive control, no resize | x=90 at width 100 | exit 0 |
   | After `resize-window -x 80` | `80\|30\|90\|0` | exit 1, refused |

   Everything else matched in the refused case: identity, size, binding, a fresh grid, framing, no pending output. So the x range check is what refused it. For y the claim holds: `screen.c:357-408` re-clamps y on a height shrink, and I observed y going from 29 to 19 when shrinking from 30 to 20 rows.

   **Consequence.** `cx > width` is the only C barrier for a reachable state. Two C mutants would survive every planned C test and mutation: deleting it, or widening it to `cx > width + 1`.

   **Required:**
   - (a) Correct the sentence, and state in §3 that the C x range check is load-bearing, not redundant with the binding.
   - (b) Add a real-tmux test that builds a real x > width state this way. It must:
     - assert the observed `cursor_x > pane_width` before submitting;
     - invoke `agents-submit-v1` with the observed values;
     - require exit 1, a consumed buffer and zero input bytes.
   - (c) Add the two rebuilt-C mutants above. Each must fail (b).

2. **Isolate the JS x predicate.**

   **The gap.** The mutation list only reverts `>` to `>=`. §5.3 requires the transport fixture to model the C bindings. Once it does, two JS over-relaxations can be masked: a deleted JS x check, or `> width + 1`. The mock refuses after `attempting`, so "refused without input" still passes.

   **Required:**
   - The x=width+1 Node boundary case must assert detail `geometry_unavailable`, no `agents-submit-v1` or `send-keys` call, and no `attempting` audit (as `assertRefusal` in `session_prompt_diagnostics.test.js` already does).
   - Add both JS mutants. Each must fail.

3. **Test the composer bound that C no longer backs.**

   **The gap.** Under `.4`, the shared primitive accepts x == width.
   - Three composer classifier branches do not bound `cursorX`:
     - general Codex (`base_adapter.js:301-333`);
     - pi (`335-344`);
     - opencode (`345-362`).
   - `paneState` (`260-268`) does not bound it either.
   - So `observe()` at `base_adapter.js:420` becomes the only x < width barrier.
   - No test drives `submitPrompt`/`observe` at x == width. Only the classifier-level case at `prompt_submission.test.js:931` exists.

   **Required.** Add `.4`-runtime tests:
   - x == width at the ready observation gives `unknown_state`, with zero load, paste, `agents-submit-v1` and `send-keys` calls;
   - x == width only at the guard observation, after a valid paste, gives no `agents-submit-v1` or `send-keys` call;
   - a mutant that deletes the line-420 x comparison must fail both.

   This is the evidence for the design's claim that the pending-wrap allowance "cannot be reused as composer permission".

4. **Complete the active pin inventory.**

   **Missed pin.** `gateway/README.md:100-101` says the Gateway "probes the same server for exact `.3`" and that "Older runtimes, including `.2`, refuse". This is the active runtime contract, and the `agents.3` grep cannot find it. Add it to the active table: exact `.4`, with `.3` and older refused.

   **Search.** Add a reproducible bare-suffix search over active non-plan files. Today this finds exactly those two lines:

   ```sh
   rg -n -e '`\.3`' -e '`\.2`' --hidden -g '!plan/**' -g '!*.txt.gz' -g '!.git/**' -g '!gateway/node_modules/**' -g '!.venv/**' -g '!workspace/**' .
   ```

   **Citation.** The Darwin builder's patch-digest constant is at `build-offline-darwin.sh:5`, not `:7`. Digest constants are not found by the version grep.

5. **Make binary reproducibility and provenance explicit.**

   **The gap.** Brief item 4 and the precedent require more than "record output binary hashes":
   - `.1`: two clean builds, A and B, were byte-identical (D_0_7C-3);
   - `.3`: an independent rebuild was bit-identical to the tested binary (A_0_4-6).

   **Required:**
   - Two independent clean offline Linux builds must be byte-identical (`cmp`). This can be two coder builds, or a coder build plus an independent reviewer rebuild. Record the full SHA-256.
   - Prove that same hash for every binary used in C RED/GREEN, the mutations, the gate and the live acceptance. For live acceptance, hash the running server's `/proc/<server pid>/exe`; `tmux -V` and `#{version}` are only strings.
   - Replace "contains only the approved guard/version semantic edits" with a checkable criterion. `git diff -M` from the `.3` patch at `bbab86b` to the `.4` patch must show a rename with exactly two changed lines: old patch `:42` (the version suffix) and `:191` (the predicate).

## Non-blocking notes (apply in the same trial)

- **C-level RED.** Name the new real-tmux pending-wrap delivery test. Record it RED first against the retained `.3` binary (`6487f795…`), then GREEN on `.4`.
- **Stale-cursor tests.**
  - Stale y at x == width must use LF or RI, which keep x. CUU/CUD cancel pending wrap, so they would change x as well (`screen-write.c:916-917,943-944`).
  - Stale x can use BS (`:1010`) or CHA.
- **The existing RED test.** `session_prompt_diagnostics.test.js:168-179` declares the geometry by intercepting display output. Once the mock enforces the binding, carry `80|24|80|23` in the fixture's pane state instead, so GREEN proves bound delivery.
- **Citation fixes.**
  - The generic geometry-negative entry is at `:69`, not `:66`.
  - The decision citation should be `:18-27`; the file has 27 lines.
- **Provenance (§1, the Assumption, the residuals).** x == width is reached in three ways:
  - a last-column write;
  - an LF or RI from that state, which matches the live sample's shape;
  - an alternate-screen shrink that leaves a stale cursor. I observed `90|30|90|0` this way; `.3` refused it, and the proposed predicate accepts it.

  The guard does not depend on how x == width arose, and that is acceptable because the cursor is binding metadata, not authority. Say so explicitly. The constructed C fixture proves the semantics, not Codex's exact output sequence. Only the live repeat is provider evidence.
- **All prompt kinds.** Extend the real-tmux watcher pending-wrap case to each recognized kind: command, trust and permission. The JS and C change applies to all three.
- **Rollback identity.** Record the `.3` Linux rollback binary by its full SHA-256 (above), not only by the truncated hash in earlier reviews.

## Human-gated questions (listed, not decided)

1. **Upgrade cutover.** The patch keeps the server alive with no sessions: it sets the `exit-empty` default to 0 (patch `:34-36`). Until the operator deliberately restarts a still-running `.3` default server, a `.4` Gateway refuses three things against it:
   - prompt answers;
   - composer submits;
   - the retained relay handshake.

   Restarting ends the sessions on that server. When and how this happens is the operator's decision. The design should state the impact.
2. **Darwin.** For 1.1.0, either build `.4` natively on each claimed architecture, or explicitly withhold Darwin `.4` support from the release claim.

## Status

A/0/06 pending-wrap is **PLANNED**. This verdict neither authorizes nor evidences any implementation, build, integration, promotion or release. The next trial must carry corrections 1–5. Its re-review needs a fresh orchestration trace and a fresh reviewer session.
