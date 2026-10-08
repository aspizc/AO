# V6 A/0/06 — Trial 3 review request

Uncommitted candidate in `wt-v6-a06`, branch
`feat/V6-A-0-06-permission-prompts`, HEAD
`1eb871ef50714353b9bbb3a917aaf89c218644b6` (committed independent Trial 2 KO).
Implementation baseline remains `7982e422577ad6dfb37ef0c7b1e3c8433735430a`.
This is a coder handoff, not an independent verdict. Root owns fresh independent
review, actual-provider live acceptance and full CI with required Redis.

Only the four numbered Trial 2 corrections were addressed. No policies edit,
commit, staging, push, subagent, self-review or full `ci.sh` run was performed.
Trials 1–2 remain immutable; all 12 evidence hashes bound by Trial 2 still match.

## Four required corrections

1. **Durable write-ahead attempt.** The approval consumption CAS now writes
   `consumed:true` and `promptAnswer:{status:"in_flight",outcome:"attempting",
   response:"Enter",target,attemptedAt}` together. It returns the exact stored
   payload as the terminal CAS token. Authorization appends
   `SESSION_PROMPT_ANSWER_ATTEMPT` with outcome `attempting`, command, options,
   approval ID, decider and target before invoking the pinned guard. If that
   append throws, no guard or input follows. Terminal completion compares the
   exact granted in-flight payload, preserves attempt metadata, and audits the
   terminal outcome only when its CAS succeeds. `SESSION_PROMPT_ANSWERED`
   requires both confirmed guarded delivery and this caller's committed `sent`
   result. A lost CAS cannot overwrite another terminal result or emit answered.
2. **Crash orphan uncertainty.** An unfinished in-flight marker or legacy
   `consumed:true` without a terminal result is persisted as
   `status:"not_answered",outcome:"uncertain",
   reason:"transport_uncertain_after_restart"`. Recovery through grant without
   a registered responder, watcher answer without a binding, invalidation and
   watcher stop/close uses the durable result and audits uncertainty. Granted
   decision history is preserved. Repeated respond, poll and answer expose the
   same result without transport input. Never-consumed orphans retain the
   existing `prompt_no_longer_bound` semantics. No uncertain attempt is replayed.
3. **Crash-window TDD.** A separate process uses the transport fixture, writes
   one CR to its child-input evidence, and exits with code 75 inside the guard
   callback before `onOutcome`. The parent reopens the same SQLite/audit files
   and creates a fresh watcher. Assertions prove an attempting audit already
   exists, durable recovery is uncertain, no answered event exists, and no
   second input or transport lookup occurs. Additional RED/GREEN cases cover
   exact in-flight CAS, legacy recovery entry points, failed audit append and
   lost terminal CAS. Existing six real pinned-tmux cases remain GREEN.
4. **Documentation and handoff.** `gateway/README.md` documents the marker,
   write-ahead ordering, terminal CAS, crash uncertainty and no automatic
   re-answer. The CI inventory was refreshed for the new crash test. This new
   handoff and its evidence are exclusively created and made read-only.

Relative to the hash-verified Trial 2 candidate, changes are limited to
`approval_repo.js`, `approval_service.js`, `session_prompt_service.js`, the
existing prompt unit tests, two new crash-test files, `gateway/README.md` and
`ci/suites.json`. Recognizers, adapter transport, role/policy defaults, sanitized
fixtures and historical RED evidence are unchanged. Non-blocking review notes
were not expanded into this correction.

## RED on Trial 2 before source corrections

All 21 Trial 2 candidate hashes matched its reviewed manifest before edits.
Those files were frozen under `/tmp/a06-trial2-frozen`; the retained
[Trial 2 input hashes](evidence/A_0_6-3-trial2-input-sha256.json) bind that input.
New tests were run against the original candidate before production edits:

```bash
node tests/gateway/session_prompt_crash.test.js
node --test --experimental-test-isolation=none \
  --test-name-pattern='failed write-ahead|lost in-flight' \
  tests/gateway/session_prompt.test.js
```

- Crash/CAS/recovery: **3 tests, 0 pass, 3 fail, 0 skipped**.
  [Original RED](evidence/A_0_6-3-crash-red.log) and
  [RED with crash diagnostic](evidence/A_0_6-3-crash-red-diagnostic.log).
  The diagnostic proves received hex `0d`, `consumed:true` without an in-flight
  result, no attempting audit, and recovery incorrectly reporting
  `prompt_no_longer_bound`.
- Audit failure/lost terminal CAS: **2 tests, 0 pass, 2 fail, 0 skipped**.
  [Audit/CAS RED](evidence/A_0_6-3-audit-cas-red.log).
  Intended cases: failed write-ahead audit prevents any guard/input; watcher
  stop during delivery prevents an answered event after a lost terminal CAS.

## GREEN after corrections

The same two commands above produce:

- [Crash GREEN](evidence/A_0_6-3-crash-green.log): **3/3 pass**, zero skips.
  Diagnostic: received hex `0d`; pre-recovery marker is in-flight/attempting;
  pre-recovery audit outcomes are `["attempting"]`; recovered outcome is
  uncertain with reason `transport_uncertain_after_restart`; replay input and
  answered-event counts are both zero.
- [Audit/CAS GREEN](evidence/A_0_6-3-audit-cas-green.log): **2/2 pass**, zero skips.

Focused host verification with the pinned runtime:

```bash
PATH="/tmp/a06-test-bin:$PATH" A04_TEST_TMUX=/tmp/a06-test-bin/tmux \
node --test tests/gateway/*prompt*.test.js \
  tests/gateway/autoapprove_mechanism.test.js \
  tests/gateway/approval_service.test.js tests/gateway/tool_agent.test.js \
  tests/gateway/tool_approval.test.js tests/gateway/approval_state.test.js \
  tests/gateway/approval_wait.test.js tests/gateway/tool_catalog.test.js
```

[Focused GREEN](evidence/A_0_6-3-focused-green.log): **301 tests, 301 pass,
0 fail/cancelled/skipped/todo**. This includes all six real pinned-tmux tests
273–278: command/trust/permission redraws receive zero bytes; each unchanged
first one-time choice receives exactly one guarded CR, with no replay or buffer
leak. Guard/runtime code is unchanged from Trial 2; its historical real-tmux
race RED remains in Trial 2 evidence.

Targeted ESLint (gateway working directory):

```bash
node node_modules/eslint/bin/eslint.js --config eslint.config.js \
  src/core/repositories/approval_repo.js src/services/approval_service.js \
  src/services/session_prompt_service.js
```

[Host lint](evidence/A_0_6-3-eslint-green.log): exit 0, no diagnostics. The initial
sandbox invocation exited 0 but emitted stream-permission diagnostics, so it
was repeated on the host for clean evidence. `git diff --check` exited 0
([log](evidence/A_0_6-3-diff-check-green.log)); CI inventory refresh and
`python3 scripts/ci_gate.py --validate-only` exited 0
([validation](evidence/A_0_6-3-inventory-green.log)). Inventory validation runs
zero tests and receives no acceptance-gate credit. Full CI was not run.

## Immutable bindings

- Trial 1 handoff SHA256: `ecafbf16c28cb0812be75ba76d9e9597286ef1bb051ad1720ca5f75a2ece6a80`.
- Trial 2 handoff SHA256: `08e894cd4b3e470710d609f3be2102ab201d0919f81ced7fb9e1cbc5f97ac5df`.
- Trial 2 manifest SHA256: `f29b3e88bbcfb0644aec331eafd3ad739452839a140e659bbdc8cc9d71d9778d`.
- Trial 2 independent KO SHA256: `04a407bdcd5e9883406348a752976bb10381247c9f4d099266f94046fdb9fa3b`.
- Pinned tmux `3.6a-agents.3` SHA256:
  `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
- [Trial 3 candidate/evidence manifest](evidence/A_0_6-3-candidate-and-evidence-sha256.json)
  SHA256: `8973a6484728e5b353a46af8dbc23a275587153e3de4313c53f2209c070a1842`.
  It binds all 23 candidate files and 10 new evidence files, including exact
  source and RED/GREEN hashes and the explicit changes from Trial 2.

No independent acceptance is claimed. Root must run the fresh independent
review and the deferred required-Redis/full-CI and actual-provider live checks.
