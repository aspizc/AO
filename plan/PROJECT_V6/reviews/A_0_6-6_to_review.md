# V6 A/0/06 — Trial 6 investigation and review request

Committed base: `7ac9438172be74661273c0aaa76b5cfb451fa6e9`.
The sole implementation delta is wording in `gateway/README.md`. This is a
coder handoff, not an independent verdict. The full gate was not rerun.
An additional candidate runtime regression remains unresolved below; this
handoff does not claim a green candidate or complete acceptance.

## First full gate: retained failure

Root-owned full gate on the committed candidate exited **1**:
**3,303 passed, 6 failed, 12 skipped; 3,321 total**.
Gateway: 2,181 passed, 5 failed, 9 skipped. E2E: 24 passed, 1 failed,
0 skipped. Required Redis lane: **22 passed, 0 failed, 0 skipped**.
LangGraph accounts for the remaining three skips; its lane reported
`infrastructure_unavailable`. Optional real-agent infrastructure was unavailable
and contributed zero tests. These are the recorded gate totals, not new runs.

[Original full log](/tmp/ao-v6-a06-gate-7ac9438.log) SHA256:
`b8704bacb3040a7e86121dd950f1b57d9e665b542b010163bc55dbdeeb465164`.
The log remains unchanged. No Redis container or full CI was started for this
investigation.

## Targeted host reproduction and attribution

The approved host commands ran with the repository `.venv`, pinned
`/tmp/a06-test-bin/tmux` (`3.6a-agents.3`), separate temporary tmux directories,
`D007C_RUN_REAL_TMUX_PROBE=1` and
`D007C_TEST_TMUX_PATH=/tmp/a06-test-bin`. The child environment retained all
other inherited variables. Only names beginning `AGENTS_WORKER_` were removed;
no secret values were printed. The reported removed-name list was **`[]`**.
Therefore this run cannot support a claim that removing worker metadata fixes
the first gate: no matching variables were present, and the failures persisted.

```bash
node --test --test-concurrency=1 \
  tests/gateway/otel_tool_spans.test.js \
  tests/gateway/registry_overlay.test.js \
  tests/e2e/mcp_two_agent_workflow.test.js
node --test tests/gateway/request_context_reattach.test.js
```

The same commands were then approved and executed on a disposable `git archive`
snapshot of pre-A06 commit `c0405b1dc9c19c505a61ed48e4244b4e0228baaf`, sharing
installed dependencies and using the same environment treatment. The candidate
worktree and Git index were not changed by that comparison.

| Target | Candidate | Pre-A06 baseline |
| --- | --- | --- |
| MCP/E2E three files | 21 tests: 17 pass, 4 fail, 0 skip; exit 1 | 21 tests: 17 pass, same 4 fail, 0 skip; exit 1 |
| Reattachment file | 125 reported tests: 124 pass, 1 file-level fail, 0 skip; exit 1 | 124 tests: 124 pass, 0 fail/skip; exit 0 |

MCP/E2E failures match the first gate: two telemetry response assertions with
missing expected goals, overlay task assignment with an invalid/missing trace
ID, and E2E missing the expected effective selection. Because the identical
failures reproduce before A06 under the same inherited environment, they are
not introduced by this candidate. The precise cause of the inherited-environment
failures is not established here, and the worker-variable hypothesis is not
confirmed. No additional environment filtering or runtime fix was applied.

Reattachment is different: all 124 subtests pass, then Node reports asynchronous
activity after `spawn accepted settles only its observed child after durable
publication`, raising `state not initialized; call initState first`. The original
full gate also reported this after `spawn record-failure`. The pre-A06 snapshot
has no such asynchronous exception. This is a reproduced **candidate regression**.

Source inspection explains the likely path: `agent_service.js` starts the new
prompt watcher after supervised spawn; the fixture resets state in its after
hook without closing that service. The watcher's timeout catches an observation
error, but `reportError` queries the already-reset state again, and its subsequent
`live` check is also outside the observation catch. This attribution combines
the controlled baseline difference with source inspection; no runtime change
or green reattachment result is claimed. The operator requested no code changes
in this lane, so watcher teardown remains a blocker for a future authorized fix.

[Candidate host results](evidence/A_0_6-6-host-command-results.json) and
[baseline host results](evidence/A_0_6-6-baseline-command-results.json) retain exact
argument vectors, exit codes, scratch paths and removed variable names.
Their logs and parsed counts are bound in the manifest and
[investigation summary](evidence/A_0_6-6-investigation-summary.json).

## README defect: targeted RED and GREEN

Before editing, the existing projection contract test reproduced the four
non-canonical tool references in the candidate README. Its validator scans
all dotted identifiers; adding only a prose qualifier to the literal names
would still fail. The wording now defines the policy action name by joining
`session`, `prompt` and the kind with dots, distinguishes these identifiers
from MCP tools, and refers to each kind's policy action in scope instructions.
The action names and runtime code are unchanged; the README still explains
how to construct the exact existing identifiers for policy configuration.

```bash
node --test --experimental-test-isolation=none \
  tests/gateway/tool_projection_contract.test.js
```

- [README RED](evidence/A_0_6-6-docs-red.log): **10 tests, 9 pass, 1 fail,
  0 skipped; exit 1**, before the wording edit.
- [README GREEN](evidence/A_0_6-6-docs-green.log): **10 tests, 10 pass, 0 fail,
  0 skipped; exit 0**, after the wording edit.
- [Diff check](evidence/A_0_6-6-diff-check-green.log): `git diff --check` exit 0.

## Bound candidate and outstanding work

All 24 Trial 5 candidate hashes match the committed base. Relative to that
base, only `gateway/README.md` changed; the other 23 files remain identical.
The Git index is empty. Prior bound evidence and review artifacts remain
unchanged. Full gate and integration receive no green credit from the docs fix.

README SHA256:
`4c1dd291634c3a964c3d36a7bae7866c8a7a66752748b2bec04260bad36ecda6`.

[Trial 6 candidate/evidence manifest](evidence/A_0_6-6-candidate-and-evidence-sha256.json)
SHA256: `177e8c305566deabe77b40b70b384ef111223b08202ae0768a9170e048ee4c8b`.
It binds all 24 candidate files, 10 new evidence files, the original full-gate
log hash and historical Trial 5 bindings. This handoff and the new evidence
were exclusively created and made read-only.

No policies edits, runtime code edits, commit, push, subagents, self-review or
full CI rerun occurred. Independent review of the README correction, an
explicitly authorized watcher lifecycle correction, and eventual root-owned
full-gate/live acceptance remain outstanding.
