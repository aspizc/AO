# A/0/05 integration reconciliation — review request 1

Date: 2026-10-08. Dedicated worktree: `wt-v6-a05-integration`.
Uncommitted merge candidate; no coder verdict, status update or release claim.
The independent reviewer assesses this candidate before root commits.

## Candidate binding

| Object | Exact SHA |
|---|---|
| Target parent (`HEAD`, release/1.1.0) | `69f222f852c80d299ae562f1f9d6f7bf75ca1a10` |
| Target parent tree | `9077ba004693522f38448b2872d56f91945b4908` |
| Source parent (`MERGE_HEAD`, reviewed A05 feature) | `fbc42932348376fda7b1cb581a0e828f4355cc90` |
| Source parent tree | `df1eb600718736a2159a23c928bf3a34a5c98eb5` |
| Merge base | `b06f1f6b4b0c21799f2ba07631137b055c2a3364` |
| Tested staged tree, before this request and its new evidence | `27515157c51e6036b87f6a19ee09eca61c20cffe` |

[Manifest](A_0_5-integration-1-manifest.json) enumerates all **353** staged
changed paths against the target and binds their working-file SHA-256 values.
The final index adds this request, that manifest and its thirteen new archives
to the tested tree. This avoids a self-referential tree/hash claim.
No other content changes follow the final focused run.

Read AGENTS.md, the orchestration profile, plan/README.md, PROJECT_V6 and
stage A READMEs, A/0/05, the immutable A_0_5-4 and A_0_5-close-1 requests,
verdicts/checkpoint, and trial-4 feature gate/live notes. Existing feature
closure evidence is retained, including its `.1` runtime and manual Enter
limitation; it does not prove integrated `.3` automatic submission.

## Reconciliation and semantic examination

Only these paths required resolution or correction beyond the automatic merge:

- `ci/suites.json`: regenerate the two affected inventory digests from the
  reconciled test content; preserve suite topology and skip declarations.
- `gateway/contracts/mcp-tools-v1.json`: regenerate the projection digest
  from the actual catalog; retain 34 entries and original ordering.
- `plan/PROJECT_V6/reviews/README.md`: retain every row of both parents
  verbatim. The archived index-union check reports no missing parent rows.
- `gateway/src/adapters/tmux_client.js`: A05's private creation observer
  rejected A01's `-e KEY=value` arguments. Accept the detached builder's
  literal environment pairs, rejecting other trailing options and malformed
  pairs. Preserve bounded receipt capture, exact tuple/live Linux identity,
  timeout handling and empty public stdout. A04's guarded paste/submit command
  builders and A01's emitted marker argv remain intact.
- `tests/gateway/request_context_reattach.test.js`: add the distinguishing
  integration test and adapt two launch-witness shims to wait/fail after the
  separate nonliteral Enter, rather than before A04 submits its launch line.
  Keep actual-provider-start and child-cleanup assertions intact.
- `gateway/README.md`: correct the catalog count to 34; retain all inherited
  prompt-submission, worker-marker, recovery and cleanup limits.

The other automatic merges were examined against both parents:

- `request_context.js`: preserve target's registered-repository cwd resolver
  and canonical binding checks together with A05's explicit recovery,
  durable-owner/expiry checks, post-await revalidation and terminal cleanup.
- `agent_service.js`: preserve A00 write-access resolution/result validation
  and role-derived sandbox, A01 marker/argv validation, and A05 launch receipt
  transfer/settlement and ask/view/kill post-await revalidation. The service's
  ask still invokes the existing adapter's A04 guarded submission path.
- `catalog.js`: keep A04's `AGENT_PROMPT_NOT_SUBMITTED` allowlist/message;
  append reattach as tool 34 and preserve strict optional discovery input.
- `tool_catalog.test.js`: retain A04's ask error assertion, change count/order
  to 34 and check the regenerated projection digest.
- `gateway/README.md`: retain the target's complete A04 section and A01
  worker-environment link alongside the source's Linux/SQLite recovery section.

`docs/mcp-tool-catalog.md` was regenerated using `renderToolCatalogMarkdown`;
its merged content was already current. Golden generation used
`catalogProjection` and `catalogProjectionDigest`; action catalog version is 1.
The scope archive confirms every target-only path is byte-identical to HEAD.
The sole source-only correction is the integration test/fixture file above.
The A_0_5-4_* and A_0_5-close-1_* files match MERGE_HEAD byte-for-byte.

## TDD RED and GREEN

Distinguishing test written before any production reconciliation:
`A04 guarded ask after A05 reattach preserves A01 markers and creation receipt`.

```bash
PATH=/tmp/ao-a04-f1-impl/build2/bin:$PATH node --test --test-concurrency=1 --test-name-pattern='A04 guarded ask after A05' tests/gateway/request_context_reattach.test.js
```

- Final RED: exit 1, **0 passed / 1 failed / 0 skipped** on the original
  automatically merged implementation, `unsupported tmux creation observation`.
  [RED](A_0_5-integration-1-red-final.txt.gz).
- GREEN: exit 0, **1 passed / 0 failed / 0 skipped** after the narrow observer
  fix. [GREEN](A_0_5-integration-1-green-final.txt.gz).
- The test uses an owned foreground `.3` server and raw terminal simulation.
  It verifies emitted markers, original receipt PID/pane, pre-reattach denial
  without submission, explicit same-task/session recovery, one guarded CR to
  the original pane, exact bracketed payload bytes, and Working observation.
  Recovery identity/owner observations use the existing controlled fixtures.
- Earlier attempts are preserved: sandbox execution failed; initial host RED
  reached the same observer failure; an intermediate GREEN attempt failed
  because the new ask fixture omitted required `traceId`. The corrected test
  was rerun RED on the original implementation before final GREEN. None of
  those unsuccessful attempts is counted as a pass.

## Focused verification

Node `v22.22.1`; tmux `3.6a-agents.3`, binary SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
Existing `gateway/node_modules` symlink retained; no install or lock changes.
Host execution was required for disposable tmux sockets/processes.

```bash
PATH=/tmp/ao-a04-f1-impl/build2/bin:$PATH node --test --test-concurrency=1 tests/gateway/request_context*.test.js tests/gateway/state_init.test.js tests/gateway/sqlite_migrations.test.js tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/lifecycle_rebaseline_core_repository.test.js tests/gateway/lifecycle_rebaseline_core_service.test.js tests/gateway/tool_catalog.test.js tests/gateway/tool_projection_contract.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tmux_client.test.js tests/gateway/worker_env.test.js tests/gateway/agent_service_worker_env.test.js tests/gateway/agent_service_write_access.test.js tests/gateway/cli_write_access.test.js tests/gateway/prompt_submission*.test.js tests/gateway/guarded_paste.test.js tests/gateway/guarded_submit.test.js tests/gateway/claude_first_prompt.test.js
```

Final exit 0: **633 passed / 0 failed / 0 cancelled / 0 skipped / 0 todo**.
[Final output](A_0_5-integration-1-focused-final.txt.gz).
The first broader run was **627 passed / 6 failed**, exit 1, preserved in
[failed attempt](A_0_5-integration-1-focused-attempt1.txt.gz). All six failures
were the two launch-witness shims rejecting/waiting during A04's literal
command before Enter (four provider publication cases and two adapter-failure
cases). The final run repeats the entire same suite selection after correcting
those witnesses. No assertions were removed or tests skipped.

Additional checks passed:

- `python3 scripts/ci_gate.py --refresh-inventory` and `--validate-only`:
  exit 0, no inventory/schema errors. Validate-only runs zero tests.
- `python3 scripts/check_public_hygiene.py`: exit 0, zero findings.
- Changed production file ESLint: exit 0.
- `git diff HEAD --check` and staged `git diff --cached --check`: exit 0;
  scoped non-review diff check also clean.
- No `policies/` changes, unresolved entries or unstaged tracked changes
  after staging the tested resolution. No commits, tags, pushes, self-review
  agents, A06 edits or product status assertions.

## Known limits and reviewer handoff

This is integration reconciliation evidence only. No full `bash scripts/ci.sh`
was run on this candidate; the focused commands did not use CI's process-tree
supervisor and do not establish its residue gate. Owned fixture exit diagnostics
are retained, but are not a global process-inventory proof. Redis, PostgreSQL,
Temporal, Python and optional real-agent lanes were not run here.

No integrated live Codex restart/reattach/automatic-ask run was performed.
The raw terminal test is transport proof, not real provider acceptance or
actual OS-principal bootstrap provenance. Root/operator still own the exact
merged-commit full `.3` gate and live run without manual Enter.

A05's declared Linux local stdio/SQLite support boundary, unobserved reparented
descendants, PID/tmux identity reuse races, shell-startup containment limits
and possible stale running rows remain as documented. Reattached Claude
sessions do not inherit A04's fresh-launch-only completed-turn eligibility.
The independent reviewer should inspect all six automatic merges, the narrow
observer change, the distinguishing test and both witness corrections against
the named parents and bound tested tree. This request grants no commit,
integration, promotion or release verdict.
