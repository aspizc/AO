# Review A_0_6-operator-2 — OK

**Task:** plan/PROJECT_V6/A/0/06-operator-response.md (option 1)
**Trial:** 2
**Branch:** feat/V6-A-0-06-operator-response
**Commit:** uncommitted candidate on HEAD 156cee3
**Reviewer:** Claude reviewer agent (independent Opus 5.5 session `ffb5f4fc-e36e-46b4-be45-b195b7d01ad6`; did not write this code or review trial 1; no coder material reused as verdict evidence)
**Date:** 2026-10-09

## Summary
Both trial-1 corrections are in place and do what the KO asked:

1. **Re-read after a lost timeout CAS.** The test at
   `session_prompt_external.test.js:334` has the owner finalize `answered/sent`
   inside the CLI's intercepted UPDATE. The named mutant (re-read only when the
   CAS won) turns it red; the unmutated copy is green.
2. **The Node script's own exit predicate.** It is now observed directly:
   - the dead-owner test asserts the script's exit 1 (`:86-88`);
   - a granted `answered/refused` row must make the script exit 1 (`:90`).

   Deleting `approval-respond.mjs:29-30` turns both red. The status-only
   mutant of `:30` turns `:90` red.

Other results:
- Source and docs are byte-identical to trial 1. None of the trial-1 checks I
  re-ran regressed.
- The two formerly hanging mutants now fail in 15.3 s, and no owner process is
  left behind.
- The import reorder is reverted. `test_approve.py` differs from trial 1 only
  in that import block.
- Both focused lanes pass.

**OK.** No blocking finding. This OK is bound to the 9 SHA-256 values below. It
is not integration, promotion or release.

## Checks
- [x] Manifest:
  - All 9 SHA-256 values match the trial-2 handoff table, and the 6
    source/doc values equal the trial-1 table.
  - The working tree contains exactly those 9 paths (7 modified, 2
    untracked), and the index is empty. `git diff --check` is clean.
  - `343c4a7..156cee3` only adds 20 new files under `plan/PROJECT_V6/reviews/`
    and modifies no trial-1 file. `89225f5..156cee3` touches only
    `plan/PROJECT_V6/reviews/`.
  - `policies/`, `gateway/src/core/request_context.js` and
    `gateway/src/tools/` are unchanged against HEAD.
- [x] Correction 1: the new assertions exist, and the named mutant is RED
  against a green control.
- [x] Correction 2(a) and 2(b): the new assertions exist, and both named
  mutants are RED against a green control.
- [x] Source and docs byte-identical to trial 1. 14 of trial 1's 39 mutants
  re-run against the new tests: all red, so no regression.
- [x] Bounded waits: both formerly hanging mutants fail at 15.33 s, and no
  fixture process is left. The fixture's own 30 s deadline also ends an
  orphaned owner.
- [x] `tests/cli/test_approve.py`: the import reorder is reverted, and nothing
  else changed since trial 1.
- [x] Focused lanes: Node 52/52, CLI 28/28.
- [ ] Definition of done: the full gate, live acceptance and commit are still
  open (see last sections).

## Candidate (reviewer-computed SHA-256)
| File | SHA-256 | Since trial 1 |
| --- | --- | --- |
| `gateway/src/services/approval_service.js` | `83fcfbf6a4d611c115d6deb51977f507cfe20751156dec5485ad60ef7c04b326` | identical |
| `gateway/src/services/session_prompt_service.js` | `11f0c7cebab578e9fa195e7878f2d92e53a4f13d63a3763fdde6f83a600cd58d` | identical |
| `gateway/scripts/approval-respond.mjs` | `c64f46f2080d5866ee8486d03fa1eb123d57b635105c1dea83b240383362da01` | identical |
| `gateway/src/core/repositories/approval_repo.js` | `5e95dd6aef0f2ce9dcd7aaae72dc4f4bbcc2b3d0ea31a718b594434379686993` | identical |
| `cli/src/agents_cli/main.py` | `467d88b3246c9f7a50e56e14460aa5a3b3c8d9f16b8150f0a7273a8048e15359` | identical |
| `docs/operator-guide.md` | `a1f865f155da1b14933061bd95a3b3c005e90f71af6a5395646298dae0f06e13` | identical |
| `tests/gateway/session_prompt_external.test.js` | `92ca6c8358b63500a5bbd8f3ca591d02bc10dbe433e5cf036d74756771f368c6` | changed (was `ea4f9cd0…`) |
| `tests/gateway/session_prompt_external_owner.mjs` | `a4fb722ea187186a9f060c77a2b5fae61f6849e19963bcda20770b610936721b` | changed (was `2d4a0ada…`) |
| `tests/cli/test_approve.py` | `9a8ea4db1ff5c855e237d0aeaab74953f06298a235f343265a3ae5ab3090d493` | changed (was `9585c15f…`) |

## Reproduction (reviewer-run, this session)
Environment:
- All 13 inherited `AGENTS_*` and `TMUX*` variables unset (checked: 0 left).
- `PATH` prefixed with `/home/carase/git/personal/AO/.venv/bin`.
- `TMPDIR` in reviewer scratch; node v22.22.1; venv Ruff 0.15.22.
- With `PYTHONPATH=<tree>/cli/src` (which `fresh()` sets), `agents_cli.main`
  and its `APPROVAL_RESPOND` resolve inside the tree under test. I checked this
  for the scratch tree.

The worktree itself was only read and tested. `git status --porcelain --ignored`
is identical before and after all runs, the index is empty, and HEAD is
`156cee3`.

| Target (worktree) | Result |
| --- | --- |
| `node --test tests/gateway/session_prompt_external.test.js tests/gateway/session_prompt.test.js tests/gateway/session_prompt_crash.test.js` | 52 tests, 52 pass, 0 fail/cancelled/skipped, exit 0, 22.9 s. These are trial 1's 50 plus the 2 new tests (`:90`, `:334`). |
| `PYTHONPATH=cli/src /home/carase/git/personal/AO/.venv/bin/pytest -q tests/cli/test_approve.py` | 28 passed, exit 0 |
| `node --test tests/gateway/tool_projection_contract.test.js` | 11/11, exit 0 |
| `ruff check --no-cache cli/src/agents_cli/main.py tests/cli/test_approve.py` (venv) | passes |

Scratch setup:
- **Tree.** `git archive 156cee3` plus the 9 candidate files (hash-checked),
  sharing `gateway/node_modules` by symlink. All scratch runs used the
  environment above.
- **Mutation driver.** It applied each mutant as an exact single-occurrence
  replacement. After every case it restored all 9 files and SHA-256-checked
  them.
- **Trial-1 baseline.** Copies of the three trial-1 test files were found by
  SHA-256 in the trial-1 reviewer's scratch directory. All three hashes equal
  the trial-1 handoff table, so the diffs below compare against the exact
  trial-1 files.

## Trial 1 → trial 2 test changes
**`tests/cli/test_approve.py`.** The only difference from trial 1 is the
import block (lines 7–10): `from agents_cli.main import app` is back in its own
first-party group. Lines 1–13 are now byte-identical to HEAD. The diff against
HEAD is only the appended trial-1 tests (lines 109–152). Trial-1 note 4 is
resolved.

**`tests/gateway/session_prompt_external.test.js`.** All changes are additions,
except the owner-race harness. No trial-1 assertion was removed or weakened.
Added:
- the Node script exit check in the dead-owner test (`:86-88`);
- the `answered/refused` test (`:90-100`);
- the bounded `next()` and the SIGKILL-and-await teardown (`:216-239`);
- the owner exit assertion `{ code: 0, signal: null }` (`:260`);
- the finalized lost-CAS test (`:334-364`).

Trial-1 line references map as follows: `:87→:101`, `:99→:113`,
`:120→:134`, `:131→:145`, `:149→:163`, `:168→:182`, `:195→:209`,
`:226→:263`, `:238→:275`, `:251→:288`, `:260→:297`, `:270→:307`.

**`tests/gateway/session_prompt_external_owner.mjs`.** The per-input 20 s
deadline is replaced by one module-level 30 s deadline. It is checked in two
places:
- the interval that waits for a grant, which exits 1 with a diagnostic;
- the blocked transport.

## Correction checks (scratch copy)
| Case | Result | Wall |
| --- | --- | --- |
| Control: `:307` + `:334` (`--test-name-pattern='external timeout rereads'`) | 2/2 pass, exit 0 | 0.31 s |
| Correction 1 mutant: `const won = repo.timeoutUnattemptedPrompt(latest); if (won) {…}` plus `const finalRow = won ? repo.getApproval(args.approvalId) : latest;` | `:334` RED at `:360` (`'uncertain'` vs `'answered'`). `:307` still passes, as it did in trial 1. | 0.31 s |
| Control: `:75` + `:90` | 2/2 pass, exit 0 | 10.92 s |
| Correction 2(a): delete `approval-respond.mjs:29-30` | `:75` RED at `:88` ("the Node script itself must reject undelivered grants", `0 !== 1`), after its Python assertions passed. `:90` RED at `:99`. | 10.83 s |
| Correction 2(b): `:30` reduced to `!(result.promptAnswer?.status === "answered")` | `:90` RED at `:99` ("answered alone is not proof of delivery", `0 !== 1`). `:75` passes. | 10.83 s |

Both corrections follow the trial-1 wording.

Correction 1 (`:334`):
- Inside the intercepted `run`, before the CLI's statement executes, the owner
  consumes the approval and records `answered/sent` with its token.
- The test asserts `changes === 0`, `answered`, `sent`, and equality with
  `promptAnswerResult(getApproval(id))`.
- The in-flight case `:307` is kept.
- The `changes === 0` guard makes the test fail, not pass silently, if its
  interceptor stops matching the SQL. Under the drop-`payload = ?` mutant
  below, `:334` fails with `undefined !== 0`.

Correction 2(a) runs on an already-terminal row, so it adds no second 10 s wait.

## Bounded waits and cleanup (scratch copy)
After every case, a `/proc` scan looked for `node` processes whose argv ends
in `session_prompt_external_owner.mjs` or `approval-respond.mjs`. Positive
control: the scan reported a decoy process with that argv while it ran, and
nothing after it exited.

| Case | Result | Wall | Left over |
| --- | --- | --- | --- |
| Control: owner race `:209` alone, 6 runs | pass, exit 0 | 10.52–10.63 s | none |
| `!external` removed (`approval_service.js:134`), `:209` alone | RED: `owner IPC timeout`, exit 1 | 15.33 s | none |
| tick `answer` removed (`session_prompt_service.js:160-162`), `:209` alone | RED: `owner IPC timeout`, exit 1 | 15.33 s | none |
| `!external` removed, whole external file | 13/16. RED: `:56` (`1 !== 0`), `:75` (`expired` vs `granted`), `:209`. Exit 1. | 16.43 s | none |
| tick `answer` removed, whole external file | 14/16. RED: `:56` (`1 !== 0`), `:209`. Exit 1. | 36.66 s | none |
| Orphan probe: owner spawned and never granted; the parent disconnects and exits without killing it | the owner exits by itself; stderr `owner fixture overall deadline exceeded` | 30.20 s after spawn | none |
| Orphan probe: grant observed and owner blocked in the transport after `in_flight`; the parent exits without killing it | the owner exits by itself; same diagnostic | 30.25 s after spawn | none |

The orphan probes cover the case trial 1 actually hit: a killed parent never
runs `t.after`, and the owner now ends itself within 30 s.

## Trial-1 checks re-run (scratch copy)
Whole external file unless noted. Control: 16/16, 22.94 s.

| Mutant | Trial 1 | Trial 2 |
| --- | --- | --- |
| poll loop treats `in_flight` as terminal | RED `:195` | RED `:209` (`'in_flight'` vs `'uncertain'`) |
| final read treats `in_flight` as terminal | RED `:195`, `:270` | RED `:209`, `:307` |
| timeout CAS without `payload = ?` | RED `:168` | RED `:182`. `:307` and `:334` also fail explicitly, because their interceptor no longer matches. |
| pre-check without `promptAnswer` | RED `:168` | RED `:182` (in-flight fixture) |
| re-read removed entirely | RED `:75`, `:131` | RED `:75`, `:145`, `:334` |
| rearm guard without `status` | RED `:149` | RED `:163` |
| reserved-decider check removed | RED `:87` | RED `:101` |
| Node predicate without the denial exemption | RED `:120` | RED `:134` (`1 !== 0`) |
| Python `delivered` status-only (CLI lane; control 28/28) | RED | RED: 2 failed, 26 passed (`answered/refused`, text and JSON) |

The first two mutants depend only on the reworked owner-race harness. They
show the bounded `next()` does not mask them.

In total I re-ran 14 of trial 1's 39 mutants:
- the 3 Finding survivors, now red;
- the 2 formerly hanging mutants;
- the 9 above.

The other 25 were not re-run. They rely on byte-identical source and unchanged
assertions, which the diff above shows.

## Defect-class checks
1. **Declared-not-observed.**
   - Handoff claims I observed:
     - the three named REDs and their controls;
     - the bounded failures (15.33 s; the handoff says 15.31 s);
     - the owner deadline: the handoff reports 30.36 s with the parent
       waiting; I measured 30.20 s and 30.25 s with the parent gone;
     - focused 52/0/0 and CLI 28.
   - Claims not observed:
     - full `npm --prefix gateway test` 2069/59/20;
     - eslint;
     - the system Ruff 0.16.0 I001 report;
     - the coder's `/proc` cleanup scan (I ran my own).
2. **Authenticated-then-written-unbound.** There is no source change since
   trial 1, so trial 1's analysis holds by hash identity. The new tests write
   only to their temporary DBs.
3. **Recorded-as-done-without-running.** The new tests assert real exit codes
   and stored values. The finalize test cannot pass unless its interception
   fires (`changes === 0`).

Source and docs are byte-identical, so trial 1's Security invariants and Docs
sections hold unchanged. I re-observed three of their points:
- the MCP schema and default-context test (`:263`) passes in the focused lane;
- the doc contract passes 11/11;
- the protected paths are unchanged.

## Findings (blocking)
None.

## Non-blocking notes
1. **The 10 s CLI bound is observed but not pinned.**
   - Raising both the default and the clamp in `respondExternal` to 20 s leaves
     the whole external file green: 16/16 in 42.99 s, against 22.94 s.
     `docs/operator-guide.md` states 10 s.
   - `run()` (`:43-52`) has no kill timeout either. A CLI-side regression that
     removed the deadline could therefore hang the tests that await the CLI
     instead of failing them (reasoned, not run).
   - This gap dates from trial 1 and is outside Corrections 1–2. One option is
     to assert an upper bound on the dead-owner CLI's elapsed time and to bound
     `run()`.
2. **Trial-1 notes carried forward, unaddressed.** These were outside the
   trial-2 scope:
   - note 2: equivalent rearm-cleanup mutants;
   - note 3: dict-guard survivor;
   - note 5: `agent.view` can deliver a prompt;
   - note 6: the restart case does not model a crash;
   - note 7: the guide does not say an external timeout leads to a new
     approval ID that needs a new decision;
   - note 8: audit events are not asserted.

   Notes 1 and 4 are resolved.

## Human-gated items (not decided by this review)
1. **Exit code when the stored decision differs from the requested one**
   (trial-1 item 1). Unchanged; still the operator's choice.
2. **Same-account residual.** It was accepted in
   `A_0_6_operator_response_decision.md` and is documented. This review neither
   grants nor revisits it.

## Not verified by this review (root/operator-owned)
- Full gate:
  - **Not run:** `bash scripts/ci.sh` (excluded by the brief), the full
    `npm --prefix gateway test` and `npm --prefix gateway run lint`.
  - **Not reproduced:** the coder's 2069/59/20 (exit 1) and the orchestrator's
    report that the failure set equals the base's.
  - **Still open:** the pinned `tmux 3.6a-agents.3` gate.
- Real tmux transport and real-provider acceptance: **not run**. All delivery
  evidence still comes from the deterministic transport fixture.
- Two Gateway watchers on one session at the same time: not exercised.
- 25 of trial 1's 39 mutants: not re-run (see above). The CLI hang regression in
  non-blocking note 1: reasoned, not run.
- The coder's scratch tree and gz logs: not used as evidence.
- `plan/PROJECT_V6/reviews/README.md`: not indexed, because the brief allows
  this review to write only one file.
- Commit, integration, promotion and release: none performed or implied.

## Next step
OK for the exact 9-file candidate in the SHA-256 table. The status becomes
`reviewed` for that content only. Remaining steps:
1. The orchestrator commits those 9 paths with an explicit pathspec and checks
   the committed blobs against the table. Any difference needs a new trial.
2. The orchestrator indexes this verdict in `reviews/README.md`.
3. The host full `bash scripts/ci.sh` with the pinned tmux and the
   real-provider acceptance must pass before any supported or release claim.
   The acceptance runs with an operator-owned exact temporary scope.

The human-gated items stay with the operator.
