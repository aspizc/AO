# Review A_0_6-3 — KO

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 3
**Branch:** feat/V6-A-0-06-permission-prompts (uncommitted candidate on HEAD `1eb871ef50714353b9bbb3a917aaf89c218644b6`; implementation baseline `7982e422577ad6dfb37ef0c7b1e3c8433735430a`)
**Commit:** none (working-tree candidate only)
**Reviewer:** independent Claude reviewer session (claude-opus-5-5); no subagent, no code or `policies/` edit, no commit/push
**Date:** 2026-10-08

## Summary

Trial 3 closes all four Trial 2 corrections. The consume CAS now persists an
`in_flight` marker, and the `attempting` audit is written before the guard
runs. Crash recovery reports `uncertain` and never replays. I reproduced RED
on the hash-verified Trial 2 sources and GREEN on the candidate. I found no
counterexample to the write-ahead, CAS or no-replay logic.

The verdict is still **KO**, because a required CI lane fails on candidate
code. `lint.gateway` (`npm --prefix gateway run lint`, `classification:
"required"` in `ci/suites.json`) exits 1 with 12 ESLint errors. All 12 are in
files this sheet adds or changes. The same command exits 0 on HEAD
`1eb871e`. The handoff's lint evidence covered only three files, and its
claim of clean lint does not hold for the candidate as a whole.

## Bound inputs

- `A_0_6-3_to_review.md` sha256 `8b0961e41676f5ec143f90b623aa915bfe3390260535af8c4ed8c40fa7795eed`.
- `evidence/A_0_6-3-candidate-and-evidence-sha256.json` sha256
  `8973a6484728e5b353a46af8dbc23a275587153e3de4313c53f2209c070a1842`
  matches the handoff. All 33 listed hashes (23 candidate files and 10
  evidence files) match the working tree.
- The 23 candidate paths match `git status`. `policies/` is untouched, and
  no role defines `sessionPromptScopes`.
- The handoff's bindings for Trial 1 and Trial 2 all match: handoffs
  `ecafbf16…6a80` and `08e894cd…c5df`, the Trial 2 manifest `f29b3e88…778d`,
  and the Trial 2 KO `04a407bd…fa3b`. The pinned
  `/tmp/a06-test-bin/tmux` sha256 is `6487f795…c386`.
- `evidence/A_0_6-3-trial2-input-sha256.json` equals the Trial 2 manifest's
  21 candidate hashes. All 21 files in `/tmp/a06-trial2-frozen` match it.
  Relative to Trial 2, the only changed or new paths are the 8 that the
  manifest declares.

## Checks

- [x] Files to create/modify: as in the sheet and Trial 2. The Trial 3 delta
      is limited to the declared repo, service, test, README and CI paths.
- [x] Tests required: RED and GREEN reproduced independently (see below).
- [x] Acceptance, sheet scope items 1–6: the behaviour holds, including the
      write-ahead audit and the uncertain crash recovery.
- [ ] Full gate `bash scripts/ci.sh` green: the required `lint.gateway` lane
      fails deterministically on candidate code (KO-1).
- [x] Global invariants: English, `agents-gateway`, async approval,
      deterministic policy, no `p` or persistent choice, `policies/`
      untouched, no push.

## Verified

1. **RED on Trial 2.** I built the tree from `git archive 1eb871e`, overlaid
   the 21 hash-verified frozen Trial 2 files, and added Trial 3's three test
   files.
   - `node tests/gateway/session_prompt_crash.test.js`: 3 tests, 0 pass,
     3 fail, 0 skipped.
   - The `failed write-ahead|lost in-flight` pattern: 2 tests, 0 pass,
     2 fail.
   - The full unit file: 30 tests, 27 pass, 3 fail (cases 28–30).
2. **The crash runs in a real separate process.** The fixture process
   writes `\r` as the child's input from inside the guard callback, then
   calls `process.exit(75)` before `onOutcome`. The parent reopens the same
   SQLite and audit files with a fresh watcher. The test's diagnostic shows:
   - received hex `0d`;
   - before recovery, `consumed:true` with
     `promptAnswer {status:"in_flight",outcome:"attempting"}`;
   - audit outcomes before recovery `["attempting"]`;
   - after recovery `not_answered`/`uncertain`/`transport_uncertain_after_restart`;
   - zero replay inputs and zero answered events.

   `respond` ×2, `poll` and `watcher.answer` all return the same uncertain
   result.
3. **GREEN.** The handoff's focused command with the pinned runtime gave
   301 tests, 301 pass, 0 fail/cancelled/skipped/todo. The crash file passed
   3/3.
4. **Six real tmux tests.** With
   `A04_TEST_TMUX=/tmp/a06-test-bin/tmux`, `session_prompt_guard.test.js`
   passed 6/6. For each of command, trust and permission, a redraw after the
   evidence capture refused all bytes, and an unchanged first one-time
   choice received exactly one guarded CR.
5. **Write-ahead ordering.** I traced this through
   `session_prompt.js:76-80` and `session_prompt_service.js:98-121`.
   - `authorize` is the last check before `attempted = true` and the
     `agents-submit-v1` call.
   - Inside `authorize`, the order is: `consumePromptApproval` (the
     `status='granted' AND payload=?` CAS, which writes `consumed` and the
     `in_flight` marker), then the synchronous `appendFileSync` of
     `SESSION_PROMPT_ANSWER_ATTEMPT(attempting)`, then `return true`.
   - If the audit append throws, `authorize` throws, `attempted` stays
     false, the outcome is `refused`, no guard runs, and the terminal CAS
     records `refused`.
   - A crash between the CAS and the audit leaves a marker without an audit.
     Recovery then reports `uncertain`, which is conservative and not false.
     I confirmed this with a probe: `APPROVAL_REQUIRED, APPROVAL_AUTO_GRANTED,
     SESSION_PROMPT_INVALIDATED(uncertain)`.
6. **Terminal CAS.** `recordPromptAnswer(..., inFlightPayload)` requires
   the exact stored token, `granted`, and `in_flight`.
   - `SESSION_PROMPT_ANSWERED` needs `sent`, a committed terminal CAS, and
     the `sent` outcome.
   - Any recovery that ran first makes the CAS lose, and a lost CAS emits
     neither a terminal attempt nor answered. Test 30 covers this.
   - `consumePromptApproval` refuses a payload that already has `consumed`
     or a `promptAnswer`.
7. **Recovery entry points.** These paths all map an unfinished `in_flight`
   marker, or a legacy `consumed` row with no result, to `uncertain`:
   - `respond(granted)` with no responder;
   - `watcher.answer` with no binding or after close;
   - `invalidate`;
   - `stop` and `close`.

   A row that was never consumed keeps `prompt_no_longer_bound`. Terminal
   results are never overwritten. `decideApproval` ignores notes for
   `session.prompt.*`, so a note on a deny cannot rewrite the bound payload
   (probed).
8. **Roles and policy.** These are unchanged from the reviewed Trial 2
   behaviour (the adapter, recognizer and policy code hashes are identical):
   - an exact `kind`+`command` scope;
   - `allow` for both the prompt action and the underlying action, and both
     in `allowActions`;
   - the underlying action outside `NEVER_AUTO`;
   - operator auto-approve required;
   - `unknown` is never answered;
   - a human grant still respects role denies.
9. **README.** The new section documents the marker, the write-ahead order,
   the terminal CAS, crash `uncertain`, and no automatic re-answer, next to
   the refusal and uncertainty text.
10. `git diff --check` exits 0. `python3 scripts/ci_gate.py --validate-only`
    exits 0 (zero tests, so no gate credit).

## Blocking defect

**KO-1: the required `lint.gateway` lane is red on candidate code.**

On HEAD `1eb871e`, `npm --prefix gateway run lint` exits 0. On the
candidate it exits 1:

```
src/adapters/claude_adapter.js
  24:39  error  Unexpected control character(s) in regular expression: \x00, \x08, \x0b, \x1f  no-control-regex
  48:34  error  Spaces are hard to count. Use {2}  no-regex-spaces
  48:63  error  Spaces are hard to count. Use {2}  no-regex-spaces
src/adapters/codex_adapter.js
  27:39  error  Unexpected control character(s) in regular expression: \x00, \x08, \x0b, \x1f  no-control-regex
  38:43, 41:29, 42:11, 43:42, 46:36, 57:22, 68:42  error  no-regex-spaces
src/adapters/session_prompt.js
  46:7  error  The value assigned to 'outcome' is not used in subsequent statements  no-useless-assignment
✖ 12 problems (12 errors, 0 warnings)
```

`lint.gateway` is `classification: "required"` with no skip budget. So
`bash scripts/ci.sh` cannot be green, and the sheet's acceptance criterion
cannot be met by this candidate. Root owns the full CI run, but this lane is
deterministic and can be run locally.

The handoff's `A_0_6-3-eslint-green.log` covers only `approval_repo.js`,
`approval_service.js` and `session_prompt_service.js`. Trial 2's "changed
Gateway sources passed ESLint" covered the same unchanged adapter files, so
it did not hold either. Under Rule 12, the handoff must not present partial
lint as clean.

## Required corrections

1. **Make `npm --prefix gateway run lint` exit 0 without changing
   behaviour.**
   - Write the literal double-space runs in the recognizer regexes as
     `" {2}"`.
   - Fix the control-character guard. Either use a regex-free check (for
     example, a code-point scan for U+0000–U+0008 and U+000B–U+001F), or add
     a single-line `// eslint-disable-next-line no-control-regex` with a
     one-line reason. The repository has no existing suppression to follow,
     so prefer the regex-free check.
   - Remove the unused initializer `outcome = "refused"` at
     `session_prompt.js:46`. Keep the catch path's `refused`/`uncertain`
     result exactly as it is.
   - Do not run a blanket `--fix` over unrelated files. Do not change
     `eslint.config.js` and do not relax rules.
2. **Re-verify the unchanged behaviour.** The recognizer and transport
   edits must keep all of the following green:
   - the fixture, recognizer and transport tests;
   - the six real pinned-tmux guard tests;
   - the crash test;
   - the focused 301-test command.

   Record their logs and the full `npm --prefix gateway run lint` output
   (exit 0) as evidence. Lint evidence must be the actual CI lane command,
   not a chosen subset of files.
3. **New handoff.** Bind the new hashes in `A_0_6-4_to_review.md`. Say
   plainly that the Trial 2 and Trial 3 lint evidence was partial. Make no
   other scope changes.

## Non-blocking notes

- A. After a crash, `poll` and `respond(denied)` keep showing the stale
  `{status:"in_flight",outcome:"attempting",attemptedAt}` marker. Only a
  grant, a watcher answer, or an invalidate/stop turns it into `uncertain`
  (probed). This is truthful, because it shows the attempt and its time.
  A startup sweep or a `poll`-time projection to `uncertain` would be
  clearer.
- B. If `recordPromptAnswer` throws inside `finish` (for example
  `SQLITE_BUSY`), `promptAnswer` has already been set in memory. `answer`
  then returns the in-memory outcome, which can be `answered`/`sent`, while
  the row stays `in_flight`. No answered event is emitted, and later
  recovery records `uncertain`. Consider returning `uncertain` when the
  terminal write throws.
- C. A crash after the terminal CAS commits `sent` but before its terminal
  attempt audit leaves the database saying `answered` while the audit has
  only `attempting`. Neither record is false, but the audit is incomplete.
- D. A live in-process stop during delivery, or a second Gateway process,
  records reason `transport_uncertain_after_restart` even though nothing
  restarted. The outcome `uncertain` is honest. Only the reason name is
  imprecise, and the README covers this case.
- E. The handoff's evidence `.log` files are git-ignored. The manifest binds
  their hashes, but the committed trail will not contain them. This is the
  same as in Trials 1 and 2.
- F. Trial 1 notes A and B and Trial 2 notes A, B and D (scope validation,
  the unknown-pane payload, the reviewer role and `code.write`, and the
  missing cross-process lease) remain open and non-blocking.
- G. Full `bash scripts/ci.sh` with required Redis, and the operator's live
  Codex and Claude acceptance, were not run. They remain root-owned, and
  this review gives them no credit.

## Status

Trial 3 is **KO**. The only blocking defect is KO-1. A/0/06 remains
`planned`/unimplemented under the canonical status rule. Nothing is reviewed
OK, integrated, promoted or released. Trial 4 needs new immutable
`A_0_6-4_*` files, a fresh orchestration trace and a fresh reviewer session.
