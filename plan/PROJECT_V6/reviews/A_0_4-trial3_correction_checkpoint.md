# A/0/04 trial 3 correction checkpoint

Status: uncommitted candidate corrections; independent review pending.
Assigned task: `ts-1cacc78d-bc9b-498d-961b-61537d2b6e6a`.
Base/HEAD: `7bbe6e479194b31b326fefa75d04535d2ad98fe5`.
Date: 2026-10-08. The existing dirty candidate was preserved.

## Read contract and bounded changes

Read committed trial-2 KO at `7bbe6e4`, CP3 in `A/0/04-transport.md`,
its final-submit plan trial-6 OK, the sheet, stage README, `plan/README.md`,
trial-2 request and build-5 checkpoint before editing. Scope: F1–F3 and
manifest F5 only. No runtime patch, provider classifier, policy, shared CI
inventory, review verdict, review index, commit or push was changed here.
Gemini remains unchanged; root reports its Gateway refusal tests passed 2/2.
This task did not rerun or infer Gemini/provider acceptance.

Changed implementation/test/doc paths in this correction:

- `gateway/src/adapters/base_adapter.js`: record successful guarded CR delivery.
  Later operation errors become `acceptance_uncertain`; cleanup failures also
  become uncertain after delivery. First-attempt pre-CR mappings remain.
  The deliberate `not_submitted` outcome after two positively unchanged
  post-CR composer observations remains as required by CP3 §7.
- `tests/gateway/prompt_submission.test.js`: six distinguishing post-CR
  capture/metadata/UTF-8 regressions, covering after and retry guard. Each
  asserts fixed code/message, uncertain reason, exactly one CR, one guarded
  submit invocation and owned-buffer cleanup. Existing post-CR cleanup test
  now requires uncertainty. Existing pre-CR, fixed-refusal and not-submitted
  tests remain in scoped GREEN.
- `tests/gateway/guarded_submit.test.js`: separate first/retry framing and
  respawned-PID cases. Framing captures fresh evidence after parsed mode-off;
  all metadata/grid predicates match. Respawn uses fresh grid/cursor/size
  evidence and substitutes only the previous PID. Each flow has a positive
  current-framing/current-PID control that observes exactly one additional CR.
  Mode updates publish complete files by rename to avoid a concurrent read
  of an empty/truncated value by the fixture.
- `gateway/README.md`: describe the candidate `agents-submit-v1`, pending
  independent source review and provider-internal residual; no acceptance claim.

## TDD RED

F1 command, before implementation correction:

```bash
node --test --test-name-pattern='post_cr_|cleanup attempts' tests/gateway/prompt_submission.test.js
```

Host result: **0 passed, 7 failed, 0 cancelled/skipped/todo**, exit 1.
Named regressions:
`post_cr_capture_failure_is_uncertain_without_retry`,
`post_cr_invalid_metadata_is_uncertain_without_retry`,
`post_cr_invalid_utf8_is_uncertain_without_retry`,
`post_cr_retry_guard_capture_failure_is_uncertain_without_retry`,
`post_cr_retry_guard_metadata_failure_is_uncertain_without_retry`,
`post_cr_retry_guard_utf8_failure_is_uncertain_without_retry`, plus the
existing cleanup failure test. The inherited candidate returns pre-delivery
reasons rather than uncertainty. Sandbox runner failure is retained separately
and is not counted as behavioral RED.

F2 predicate-specific mutation RED, with final test bytes:

```bash
A04_TEST_TMUX=/tmp/ao-a04-trial3/mutant-pid/tmux node --test --test-name-pattern='respawned_pane_pid' tests/gateway/guarded_submit.test.js
A04_TEST_TMUX=/tmp/ao-a04-trial3/mutant-framing/tmux node --test --test-name-pattern='framing_drift_' tests/gateway/guarded_submit.test.js
```

Each host command: **0 passed, 2 failed, 0 cancelled/skipped/todo**, exit 1.
Both first/retry tests fail at `refusal delivers zero CR`, observing exactly
one extra `0x0d` when only their named predicate is removed. Mutants derive
from the prior freshly patched `.3` source in disposable `/tmp` directories;
production runtime/patch unchanged. `evidence/A_0_4-trial3-mutation-proof.json`
binds the exact source replacements, original source hash, binary hashes and
isolated offline Docker build command. These mutation failures, rather than
unsupported-command failures on `.2`, distinguish the individual predicates.

## Scoped GREEN and failures retained

Final host command:

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/prompt_submission.test.js tests/gateway/guarded_submit.test.js tests/gateway/guarded_paste.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/tmux_client.test.js tests/gateway/tool_error_serialization.test.js
```

**77 passed, 0 failed/cancelled/skipped/todo**, exit 0.
`npm --prefix gateway run lint`: exit 0.
`git diff --check`: exit 0 before handoff packaging.
Binary SHA-256:
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
Owned foreground servers use private sockets and await exit/reaping; no
serving Gateway or user server was restarted/replaced.

Earlier scoped runs passed 74/74 and 77/77. The cleanup catch initially
triggered ESLint `no-unsafe-finally` (2 errors); mapping moved into the
cleanup helper, and final lint passes. A subsequent scoped run passed 76/77:
framing positive-control mode update lost its fixture pane (`no current
 target`). The mode writer truncated a concurrently read file; the fixture
splits its contents into exactly two fields and can exit on a partial read.
Publishing by rename removes that race. Final GREEN and final mutation RED
were run after this correction. The failed lint and 76/77 logs are retained,
not erased or presented as passes.

Durable gzip evidence uses `evidence/A_0_4-trial3-`:
`f1-red.log.gz` (sandbox infrastructure failure), `f1-red-host.log.gz`,
`f2-pid-red.log.gz`, `f2-framing-red.log.gz`,
`f2-pid-red-final.log.gz`, `f2-framing-red-final.log.gz`,
`scoped-green-final2.log.gz` (76/77), `scoped-green-final3.log.gz` (77/77),
`lint.log.gz` (two errors), `lint-final.log.gz`, `lint-final2.log.gz`.

## Manifest F5 and review limits

Fresh path/hash manifest includes the deleted
`gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch` as JSON `null`.
It binds the complete inherited candidate path set, current dirty/new files,
this checkpoint and trial-3 durable evidence. It excludes itself and the
handoff to avoid a cyclic hash binding; the handoff records the manifest hash.
Root-owned changes already present on entry (including CI inventory) are
bound as candidate bytes, not credited as coder work in this task.

No independent verdict or full sheet acceptance is issued. Trial-2 reviewer
coverage limits remain for the fresh independent reviewer, including its
"Not examined" list. Pending-output/unparsed-input/stalled-control cases
remain NOT EXECUTED here (trial-2 source-review disposition is historical).
Live Codex/Claude/Antigravity acceptance, markers/versions/timing, positive
Antigravity profile, native Darwin, root solo full gate with Redis 7 and
unchanged skips, inventory acceptance and sheet closure remain root-owned
and unverified by this task. Scoped GREEN grants no integration, promotion,
release or replay authority. Stop for fresh independent review.
