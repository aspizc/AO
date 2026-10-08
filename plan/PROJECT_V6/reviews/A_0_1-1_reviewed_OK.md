# Review A_0_1-1 — OK

**Task:** plan/PROJECT_V6/A/0/01.md
**Trial:** 1
**Branch:** feat/V6-A-0-01-worker-marker
**Commit:** none — uncommitted candidate on base `a8e84303130096f3c90d179f69736a0f8247846f` (merge: integrate reviewed CLI write access (PROJECT_V6 A/0/00))
**Manifest:** `evidence/A_0_1-1-files.json`, SHA256 `6178b2f2d1bd58ac37819772e1955b49c51c76dbe951db670a077a2987a11088`
**Reviewer:** Claude reviewer agent (claude-opus-5-5), independent session; not the coder
**Date:** 2026-10-08

## Summary

The worker environment marker candidate meets every A/0/01 acceptance
criterion. All focused checks were reproduced on the host, and 15/15 scratch
mutations of the core logic are caught by the new tests. Status: **reviewed
only**. It is uncommitted and not integrated. The sheet's `bash scripts/ci.sh`
gate still has to run, and the orchestrator owns it.

## Checks

- [x] Files to create / modify
  - `docs/worker-environment.md` exists and is linked from `gateway/README.md`.
  - `workerEnv` is in `base_adapter.js`.
  - `buildNewSessionCmd` gains `env`.
  - All five executable adapters set the delegate `env` and return `newSessionArgv`.
  - `SPAWN_RESULT_FIELDS` and the spawn contract validation are in `agent_service.js`.
- [x] Required tests (all run on the host, Node v22.22.1, after the operator
  confirmed the A05 solo full gate had ended)
  - Request's 15-file focused command: exit 0, **340 pass / 0 fail / 0 skipped
    / 0 cancelled / 0 todo**.
  - The sheet's Verification `node --test` command: exit 0, **132 pass / 0 fail
    / 0 skipped**. That is the 127 tests named in the request plus the 5
    supplementary live-transport tests.
  - `gemini_delegate.test.js` and `gemini_supervised.test.js` run unchanged and
    pass.
- [x] Acceptance criteria (see Findings)
- [x] Common errors avoided
  - No marker appears in `launchCommand`.
  - No per-adapter copy of `workerEnv`.
  - No values are taken from prompt text. The tests send the prompt
    `AGENTS_WORKER_ROLE=orchestrator` and it is ignored.
  - Gemini is untouched.
- [x] Definition of done for a review candidate
  - Branch and base are correct, and the manifest is complete.
  - Commit, CHANGELOG (the sheet's DoD does not require one), full gate and
    integration belong to the orchestrator.
- [x] Global invariants
  - Everything is in English.
  - No push and no commit.
  - `policies/`, `gemini_adapter.js` and both Gemini test files are
    byte-identical to HEAD.
  - The MCP server is still named `agents-gateway`.
  - No stdout logging was added.

## Verification performed

1. **Static phase (before any execution):**
   - The manifest hash matches the request.
   - 27/27 bound hashes match: 16 candidate files and 11 logs.
   - `HEAD` is the stated base.
   - The dirty set equals the manifest plus the request.
   - The manifest was re-checked after all runs: still 27/27, and the tree is
     unchanged (29 porcelain entries).
2. **Host checks:**
   - The focused and sheet commands, as above.
   - Changed-source ESLint (the exact command in the request, run from
     `gateway/`): exit 0, no output.
   - `git diff --check`: exit 0.
   - No trailing whitespace in the three untracked text files.
3. **Mutation checks:**
   - Run in a scratch copy outside the worktree, with
     `gateway/node_modules` symlinked. Candidate files were never edited.
   - The scratch baseline was 64/64 green.
   - Every mutation turns at least one test red:

   | # | Mutation | Failing tests |
   |---|---|---|
   | M1 | `workerEnv` stops rejecting `\n`/NUL | 16 |
   | M2 | absent task becomes `undefined` instead of `""` | 12 |
   | M3 | role marker hard-coded | 30 |
   | M4 | Claude delegate drops `env` | 2 |
   | M5 | pi delegate drops `childEnv` (Ollama) | 2 |
   | M6 | Codex live spawn rebuilds argv without markers instead of using `newSessionArgv` | 1 |
   | M7 | service drops the duplicate-`-e` check | 3 |
   | M8 | service drops the `-s` target check | 3 |
   | M9 | service drops the `new-session` check | 1 |
   | M10 | service skips marker validation | 9 |
   | M11 | `buildNewSessionCmd` emits no `-e` | 34 |
   | M12 | service validates against fixed values instead of `execution` | 17 |
   | M13 | opencode env merge order reversed (inherited wins) | 2 |
   | M14 | antigravity env merge order reversed | 2 |
   | M15 | Codex spawn passes empty `env` | 3 |

4. **TDD RED evidence (archived logs, read statically):**
   - `tmux-red`: 0/1.
   - `worker-red` and the adapter part of `host-red-complete`: the failures are
     behavioral. Examples: `actual: 'stale'`, `Missing expected rejection.`,
     and argv without `-e`.
   - Service RED: behavioral in `service-red.log.gz`, 0/18. The baseline result
     has no `newSessionArgv`, and `assert.ok(Array.isArray(valid.newSessionArgv))`
     fails. See finding 1.

## Findings

All acceptance criteria are met:

- **AC1:** For all five providers, the delegate child environment is observed
  through a fake CLI that writes out `process.env`. The dry-run argv is asserted
  on emitted output. The live tmux argv is observed through a fake `tmux` on
  `PATH`. Gemini still refuses.
- **AC2:** The service accepts a valid `newSessionArgv` in both task-less and
  bound modes and returns a frozen copy. It rejects every malformed form in TDD
  RED, plus duplicates. Each rejection test first proves that the same binding
  is accepted.
- **AC3:** A stale `AGENTS_WORKER_*` is overwritten, including the task, which
  is cleared to `""`. `AGENTS_WORKER_TRACE_ID` is the child's trace, never
  `AGENTS_TRACE_ID`.
- **AC4:** The doc states the variable names, the values, the empty-task rule,
  "informational, never authority", and the shell check.

Non-blocking observations, recorded for the trail:

1. **Evidence narrative misattribution (Rule 12).** The request says the 60/60
   host baseline failures in `A_0_1-1-host-red-complete.log.gz` "show absent
   helper, stale delegate markers, absent spawn argv and missing invalid-value
   rejection". In fact, all 18 service failures in that log are
   `MIGRATION_PROFILE_MISMATCH` ("SQLite migration profile does not match"),
   an environment failure of the scratch baseline. They are not behavioral RED.
   - Only the 42 adapter/helper failures in that log are behavioral.
   - The valid behavioral service RED is `A_0_1-1-service-red.log.gz`.
   - The RED requirement is still satisfied. Future requests should attribute
     each failure from the raw log.
2. **Validator token model.** `assertSpawnResultContract` recognises only
   separate `-s` / `-e` tokens. tmux's getopt also accepts attached forms
   (`-sNAME`, `-eKEY=V`) and stops at the first positional shell-command
   argument, and the validator models neither. Only in-repo adapter code
   produces this argv, and the marker grants no authority, so this is optional
   hardening rather than a defect against the sheet's wording.
3. **`AGENTS_TRACE_ID` reading.** The TDD RED text says a reviewer "must not
   see the Gateway's ... `AGENTS_TRACE_ID` value". The test keeps the inherited
   `AGENTS_TRACE_ID` and asserts the child trace marker separately. I accept
   this because AC3 ("not reused for the child's trace") and the Non-scope
   ("Stripping other inherited `AGENTS_*`") both support it. The doc says so
   explicitly.
4. **Layering.** `agent_service.js` now imports `workerEnv` from
   `adapters/base_adapter.js`. There is precedent (`intervention_detector.js`),
   and Scope 5 places the helper there, so this is acceptable.
5. **Remaining limits, as the coder states.** The fake transport proves the
   argv tmux receives, not consumption by a real provider or plugin. Supervised
   pi/opencode `OLLAMA_*` forwarding is out of scope.

## Status (Rule 14)

- Reviewed: yes (this verdict).
- Committed, integrated, full gate, promoted, released: **no**.
- The sheet's Verification also requires `bash scripts/ci.sh` on the candidate
  tree. The orchestrator must run it, and must commit with an explicit pathspec,
  before any integration claim.
- The A05 feature-gate run that happened in parallel is not evidence for A01.

## Next step

OK. The orchestrator runs the full gate on this candidate tree, commits the
bound files and the review trail with explicit pathspecs, and then proceeds to
integration review. Any change to a bound file requires a new trial.
