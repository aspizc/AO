# V6 A/0/06 — Trial 7 review request

Uncommitted candidate on HEAD `85f4f3095a7f4b37eaf888fc7e10371a74cfd497`
(committed independent Trial 6 KO trail). The runtime RED baseline is committed
`7ac9438172be74661273c0aaa76b5cfb451fa6e9`; HEAD's runtime source bytes were
identical to that commit before this correction. This is a coder handoff,
not an independent verdict. Runtime changes were explicitly authorized by the
operator. Root retains independent review, full CI with Redis and live checks.

## All five corrections

1. **Nonthrowing watcher tick.** The whole observation and live/re-arm check
   is inside the timeout's catch boundary. Any error stops the session watcher
   and prevents re-arming. The trace ID is captured at timer creation; error
   reporting no longer queries torn-down state and cannot throw if the audit
   sink fails. Stop clears the timer and removes bindings/responder authority
   before best-effort durable invalidation. Cleanup/audit failures do not
   escape the timer callback.
2. **Watcher only after publication.** `agent_service.spawn` no longer arms
   the timer before protected-tool durable recording. A private one-use
   publication callback travels with the result through the existing launch
   settlement path. `tool_helpers` already records the request-context result
   before accepted settlement; only that accepted settlement starts the
   supervised watcher. Rejection or recording failure discards the callback.
   Headless launches do not publish a supervised watcher. This adds no public
   input or result field and preserves existing owned-child cleanup receipts.
3. **Exact policy action names restored.** `gateway/README.md` is byte-identical
   to its committed `7ac9438` version, including literal
   `session.prompt.command`, `session.prompt.trust`, `session.prompt.permission`
   and `session.prompt.unknown` names. The Trial 6 compositional wording was
   removed. `NON_TOOL_DOTTED_TOKENS` derives the four names from `Actions` in
   `policy_types.js`. A new projection test permits them in prose while
   rejecting each as a callable `mcp-tool-call` tool.
4. **Real-spawn fixture shutdown.** The spawn/delegate matrix registers
   service closure before `fixture(t)` registers state reset, so closure runs
   first. Record-failure asserts zero prompt timers; accepted supervised
   publication asserts exactly one. The separate-process tick tests omit
   service closure and prove product safety independently of fixture cleanup.
5. **Targeted verification.** Results and exact commands are recorded below.
   Full Gateway lint and diff checks pass. MCP/E2E children were run with
   every inherited `AGENTS_*` variable removed, retaining other environment
   variables and the pinned runtime setup. No full CI was run.

Changed tracked files: `request_launch_cleanup.js`, `agent_service.js`,
`session_prompt_service.js`, `contract_projection.js`,
`request_context_reattach.test.js`, `session_prompt.test.js`, and
`tool_projection_contract.test.js`. One new supporting fixture is
`session_prompt_tick_fixture.mjs`. These are eight changed/new candidate paths
relative to HEAD. README restoration introduces no delta relative to HEAD.
The manifest binds the complete 29-file candidate, including unchanged files
from prior trials.

## RED/GREEN evidence and chronology

Tests were written before runtime edits. The new publication and projection
RED tests ran against the unchanged committed runtime before implementation.
The initial sandbox tick runs failed on empty subprocess JSON output, rather
than the required behavior; they are **invalid semantic evidence**. They are
retained under their original names, including the misleading `tick-green`
filename, and receive no RED/GREEN credit. The earlier progress statement that
those runs proved the timer defect was premature.

Definitive tick RED was subsequently replayed on a disposable `git archive
7ac9438` snapshot overlaid only with the new tests/fixture; then the same tests
ran GREEN on the fixed candidate. No frozen product source was edited. This
chronology is explicit so the reviewer can assess the test-first evidence.

| Check | RED | GREEN |
| --- | --- | --- |
| State loss and audit-sink failure after a real watcher tick | [Host RED](evidence/A_0_6-7-tick-host-red.log): 2 tests, 0 pass, 2 fail; exit 1 | [Host GREEN](evidence/A_0_6-7-tick-host-green.log): 2/2 pass; exit 0 |
| Real supervised spawn durable record failure leaves no timer | [RED](evidence/A_0_6-7-spawn-record-red.log): 1 test, 0 pass, 1 fail; exit 1 | [GREEN](evidence/A_0_6-7-spawn-record-green.log): 1/1 pass; exit 0 |
| Policy-action names allowed as references but never tools | [RED](evidence/A_0_6-7-projection-red.log): 1 test, 0 pass, 1 fail; exit 1 | [Full projection GREEN](evidence/A_0_6-7-projection-green.log): 11/11 pass; exit 0 |

Every valid test run above has **zero skipped tests**. Tick RED contains the
actual uncaught `state not initialized; call initState first` and audit-sink
errors, rather than a fixture-output failure. GREEN asserts an empty uncaught
list and zero pending prompt timers after waiting 1,200 ms.

The failing publication RED observed one pending prompt timer where zero was
required. The GREEN real fixture retains the actual durable-record trigger,
owned pinned-tmux child and cleanup proof; it does not credit teardown as the
publication fix.

## Targeted host GREEN

Host setup: repo `.venv` on PATH, `/tmp/a06-test-bin/tmux` version
`3.6a-agents.3`, isolated `TMUX_TMPDIR`, `A04_TEST_TMUX`,
`D007C_RUN_REAL_TMUX_PROBE=1` and `D007C_TEST_TMUX_PATH=/tmp/a06-test-bin`.
Inherited `AGENTS_*` names removed are retained in
[host command results](evidence/A_0_6-7-host-command-results.json) and test logs;
no environment secret values were printed. The list includes inherited
workspace, repository, policy, principal, provider, approval and coordination
configuration. This corrects the pre-existing MCP/E2E environment contamination
identified by independent Trial 6 review without modifying those tests.

```bash
node --test --test-name-pattern='spawn record-failure' \
  tests/gateway/request_context_reattach.test.js
node --test tests/gateway/request_context_reattach.test.js
node --test --test-concurrency=1 tests/gateway/otel_tool_spans.test.js \
  tests/gateway/registry_overlay.test.js tests/e2e/mcp_two_agent_workflow.test.js
node --test tests/gateway/*prompt*.test.js \
  tests/gateway/autoapprove_mechanism.test.js tests/gateway/approval_service.test.js \
  tests/gateway/tool_agent.test.js tests/gateway/tool_approval.test.js \
  tests/gateway/approval_state.test.js tests/gateway/approval_wait.test.js \
  tests/gateway/tool_catalog.test.js
npm --prefix gateway run lint
```

- [Pinned reattachment](evidence/A_0_6-7-reattach-green.log): **124/124 pass**,
  zero skipped; exit 0. The old synthetic file-level failure is gone, so the
  count is 124 rather than the failing run's 125 reported tests.
- [Scrubbed MCP/E2E](evidence/A_0_6-7-mcp-scrubbed-green.log): **21/21 pass**,
  zero skipped; exit 0.
- [Focused prompts/approval/agents](evidence/A_0_6-7-focused-green.log):
  **303/303 pass**, zero skipped; exit 0. Includes all six real pinned-tmux
  prompt guard cases, the crash/CAS tests, and the two new watcher tick tests.
- [Full Gateway lint](evidence/A_0_6-7-full-lint-green.log): exit 0, no ESLint
  errors/warnings. This is the actual required lane, not a partial source list.
- [Diff check](evidence/A_0_6-7-diff-check-green.log): exit 0.
- CI inventory refresh made no manifest change; [inventory validation](evidence/A_0_6-7-inventory-green.log)
  exited 0 with zero tests and is not acceptance-gate evidence.

Projection commands used `node --test --experimental-test-isolation=none`;
the RED additionally selected `prompt policy actions`. Tick host commands and
scratch provenance are retained in
[tick command results](evidence/A_0_6-7-tick-host-command-results.json).
[Exact parsed counts](evidence/A_0_6-7-test-counts.json) retain both valid runs
and the explicitly marked invalid sandbox runs.

## Hashes, risks and handoff boundary

[Candidate/evidence manifest](evidence/A_0_6-7-candidate-and-evidence-sha256.json)
SHA256: `e112b499df6701cb851c431d5ce40f7b8eb37b8f1d107e74210b9eaa063575c2`.
It binds all 29 candidate files, 17 evidence files, committed RED product source
hashes and Trial 6 provenance. Pinned tmux SHA256 remains
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
Trial 6 KO SHA256:
`f4d467a419ec604db60a0f36304b4e7b75fb8891bfe006d5e8d3e35c9dc60b10`.
Prior trial handoffs, verdicts and bound evidence remain unchanged.

The private publication callback touches shared launch settlement; the real
spawn/delegate, record-failure, protected-tool and focused agent tests cover its
ordering. A failed tick stops supervision rather than retrying automatically;
a later valid view/reattachment can resume observation. When state or audit is
already unavailable, error recording and durable invalidation are best effort,
but local responder authority and timers are removed. No policy default,
answer key, prompt guard or one-time consumption rule changed.

This handoff and its evidence were exclusively created and made read-only.
Index empty. No policies edits, self-review, commit, merge, push or full CI.
Independent review, root-owned full gate with scrubbed inherited configuration
and explicit disposable Redis, and actual-provider live acceptance remain
outstanding. No integration, promotion or release is claimed.
