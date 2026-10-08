# Review A_0_0-3 — OK

**Task:** plan/PROJECT_V6/A/0/00.md
**Trial:** 3
**Branch:** feat/V6-A-0-00-cli-write-access (uncommitted test-only candidate on HEAD `1f29faf22ba1a0dae25dbad74df5871a43e79b19`; committed reviewed candidate `8c7eb3a97d94fcf351b58b1ee4cfa4d3b23b0cc3`; implementation base `e42818c2b9d72eebc88d858965fafa45c0fa1417`)
**Commit:** none (working-tree candidate, as the handoff states)
**Reviewer:** Claude reviewer session (claude-opus-5-5), fresh session, independent of the coder and of the trial-1/trial-2 reviewers; no subagent used
**Date:** 2026-10-08

## Summary

Trial 3 is a test-only correction for the five Gateway failures in root's RED
feature gate on `8c7eb3a`. I checked each failure against the archived raw log.
All five are attributed correctly: four come from test mocks that lack the new
`writeAccess` result field, and one is a race in the terminal fixture's
mode-file writer. RED, GREEN and lint all reproduce. Mutation runs show that the
changed assertions fail when the logic is broken. Production code, docs,
policies and the trial-1/2 trail are byte-identical. **OK.** Limits are listed
at the end.

## Bound inputs

- `A_0_0-3_to_review.md` sha256 `9ace6b6bb328421041fdec05a101b8697c3c735259fd617940fe1d5476147057`.
- `evidence/A_0_0-3-files.json` sha256 `82b123a00c23543888328b1b59c6436f41a6ebfa90bcb203508cdf7c69a427e7`.
  I recomputed all 25 listed hashes and they all match the working tree.
- `evidence/A_0_0-3-preservation.json` sha256 `775504733cc1bd33f9dd6651f84bb38368eb24804dc0230396ca9f952c04401b`.
  All 18 trial-1/trial-2 hashes match. `git diff --quiet HEAD -- plan/PROJECT_V6/reviews/`
  holds, so no committed review file was modified.
- Other trial-3 evidence (sha256):
  - `contract-red` `efdedec1…a4ee7`
  - `mode-red` `8188a3ce…401b`
  - `attempt1-red` `9c446f0d…b8697`
  - `focused-green` `29ba2785…6b275`
  - `lint` `339726fc…722a`
  - `lint-runner.mjs` `f9c0458e…09d`
- `git diff --quiet 8c7eb3a -- gateway docs policies` holds.
- `git diff --quiet e42818c -- policies` holds.
- `8c7eb3a..HEAD` touches only the root gate note and its log archive.
- The working-tree diff against HEAD covers exactly the three named test files.
- The Gemini refusal tests are unchanged. `git diff --check` is clean.
- Root gate log: the `.gz` hashes to `d00b0752…d50b`, and the decompressed log
  hashes to `4868fbe4…c02d`. Both match `A_0_0-root-feature-gate-red.md`.

## Attribution of the five root failures (checked against the raw log)

1. **`guarded_paste_rechecks_mode_at_write`.** The log shows `no current target`
   at `checked`←`mode` (old line 28, `capture-pane`), called from the test's
   `mode(..., "off")` (old line 79). That means the pane was already gone when
   the fixture polled for its marker after writing the mode file.
   - The fixture calls `read_text()` in a 10 ms loop (`guarded_paste_fixture.py:18-20`).
   - `writeFileSync` truncates the file before writing. If the witness reads
     in that window, `split(":")` raises `ValueError`, the witness exits and
     the pane closes.
   - The rename-based writer matches the pattern already used in
     `tests/gateway/guarded_submit.test.js:30-31`. This fixes one pattern
     rather than mixing two.
   - Limit: the gate run had no `remain-on-exit`, so the raw log cannot show
     the traceback for that specific run. The attribution is an inference from
     the stack trace plus the reproduced mechanism. I find it sound.
2. **and 3. Runtime delegate and spawn selection-identity tests.** Both fail
   with `POLICY_DENIED` from `rejectInvalidSelection`←`assertAdapterSelectionResult`
   (`agent_service.js:458`), which is the exact-field check on the result.
   The mocks lacked `writeAccess`.
4. **Default-model delegate tool test.** The log shows `undefined !== 0` for
   `exitCode`. This is the error result from the same rejection.
5. **Every-provider spawn tool test.** The log shows "antigravity spawn must not
   be rejected". The registered adapter is the mock, so the rejection comes from
   result validation, not from the real adapter's fail-closed check. Root's
   note says "rejected by the new fail-closed rule". The coder's more precise
   diagnosis is correct. The test now uses Antigravity as coder. A new test
   covers the real adapter's refusal of the reviewer seat.

The log also shows that `delegate passes one resolved selection…`,
`spawn passes one resolved selection…` and `claude defaults to Opus 5.5 max…`
passed at `8c7eb3a` even though their results were rejected. That is the
argument-only false pass the handoff describes. Trial 3 now asserts that these
results are accepted and carry `writeAccess`.

## Checks

- [x] Files to create/modify: three test files only. No production, docs,
      policies, Gemini or lint-config change.
- [x] Required tests (host, node v22.22.1, PATH prepended with
      `/tmp/ao-a04-f1-impl/build2/bin`, `tmux -V` = `tmux 3.6a-agents.3`,
      private `TMUX_TMPDIR`). The fixture uses its own `-S` socket and
      foreground server; no user tmux server was addressed.
  - **GREEN:** the exact 13-file focused command gave 283 tests, 283 pass,
    0 fail/cancelled/skipped/todo, exit 0.
  - **Contract RED:** I made a scratch `git archive HEAD` copy with the HEAD
    test files. Running the runtime and tool suites gave 24 tests, 20 pass,
    4 fail. The failures are the four tests named above. With the candidate
    tests in the same copy: 25 tests, 25 pass.
  - **Mode RED:** in a scratch copy of the candidate, I reverted only the
    `mode()` writer to direct `writeFileSync`. The new
    `guarded_paste_mode_update_does_not_expose_partial_control_record` test
    then fails with the witness-alive assertion, and the pane capture shows
    `ValueError: not enough values to unpack (expected 2, got 1)`. With the
    candidate writer it passes (1/1).
  - **Lint:** `node plan/PROJECT_V6/reviews/evidence/A_0_0-3-lint-runner.mjs`
    reports 64 effective rules per file, 0 errors, 0 warnings, exit 0. I read
    the source: it reuses `gateway/eslint.config.js`, rebases only the file
    globs, and disables no rules. It is equivalent to the trial-2 runner.
- [x] Acceptance criteria: unchanged from the trial-2 OK. No production change.
      The changed tests keep the AC4 result contract and the AC7 Antigravity
      fail-closed path covered through the tool layer.
- [x] Common errors avoided:
  - The production refusal was not weakened.
  - No role-name branch was added (production is unchanged).
  - No `policies/` edit.
- [ ] Definition of done: not applicable to an uncommitted candidate. Root
      owns commit, full gate and integration.
- [x] Global invariants: English only, no push/tag/commit by the reviewer,
      naming unchanged, no stdout logging added.

## Assertion and mutation strength (scratch copies)

| Mutation | Result |
|---|---|
| Antigravity adapter fail-closed check removed (both delegate and spawn) | new tool test `Antigravity non-writer is refused…` fails (1 of 9) |
| `resolveCliWriteAccess` returns constant `true` | the Antigravity refusal test and Claude `writeAccess=false` fail (2) |
| `resolveCliWriteAccess` returns constant `false` | both runtime identity tests, default-model, both selection-plumbing and every-provider tests fail (6) |
| Fixture mode writer non-atomic | partial-record regression fails, with traceback |

How the regression test works:

- It patches `fs.writeFileSync` only for the `"3:off"` write in the terminal
  directory.
- The patch truncates the target and holds the empty state for 150 ms, which
  covers more than ten witness poll cycles.
- It asserts that the pane shows no traceback and that the interleaving
  actually ran (`staged === true`).
- It then requires a clean guarded-paste refusal with no bytes written.
- With the rename writer, the truncation lands on `mode-next`, so the record
  the witness reads stays intact. The test discriminates for the right reason.

## Findings (non-blocking)

1. The runtime and tool mocks compute `writeAccess` with the same production
   predicate the service compares against. A wrong predicate therefore cannot
   cause a mismatch rejection in these suites. They catch it only through the
   added literal `true`/`false` assertions, as the mutations above show. The
   independent contract checks (missing, non-boolean or mismatching value)
   remain in `agent_service_write_access.test.js`, which trial 2 verified.
   This is acceptable for selection-identity fixtures.
2. The new Antigravity test name says "through the tool", but its
   `AGENT_MODEL_RESOLVED == 0` assertion also depends on the refusal running
   before the service's model audit. That holds today. Note it if that order
   changes.
3. Root's gate note describes failure 5 as the fail-closed rule. The trial-3
   handoff's attribution (mock result missing `writeAccess`) is the accurate
   one. Root may want to correct the wording in its next gate note. The
   committed note stays immutable.
4. The partial-record test depends on `python3` on PATH for the 150 ms hold.
   The suite already requires `python3` for the witness, so this adds no
   dependency.

## Scope and limits of this verdict

- This verdict covers only the working-tree bytes bound above, on HEAD
  `1f29faf` and candidate `8c7eb3a`.
- **The feature gate is still RED.** I did not run `bash scripts/ci.sh` or the
  broader Gateway suite. Focused GREEN does not supersede root's
  2,993/5/12 result.
- Root owns the full-gate rerun on a committed trial-3 candidate, the
  assessment of the 12 declared skips (nine PostgreSQL, three
  Gateway/Temporal), and integration.
- I did not re-run `agent-run policy validate`; `policies/` is byte-identical
  to base.
- I did not exercise live providers or OS-sandbox enforcement. The residuals
  documented in trial 2 are unchanged.
- I did not check whether the mode race reproduces intermittently in the full
  suite, beyond the controlled interleaving.
- Status: reviewed only. Not committed, integrated, promoted or released.

## Next step

OK. Root may commit the three test files and the trial-3 trail with an explicit
pathspec, then re-run the full gate on that commit with the pinned tmux before
any integration.
