# Independent Review Result — V5 C/1/00 Trial 8

## Verdict

**KO — three P1 blockers.**

Requested reviewer configuration: **GPT-5.6 Sol with ultra reasoning;
Priority/Fast requested**. The effective service tier cannot be independently
confirmed from this review session.

The non-cooperative direct-child and normal-descendant deadline correction
works under the required 20-millisecond service timeout, including concurrent
lint/structure load. Process groups are terminated, the direct provider is
reaped, synthetic descendants disappear, lifecycle settlement remains singular,
and exact retry is side-effect free. However, the fixed Bash runner is not a
transparent `spawnSync` boundary for three explicitly requested contracts:
environment replacement, supported binary standard input, and real
non-timeout signal results.

## Candidate identity and scope

- Authoritative Trial 7 `KO` parent:
  `5a9aa4fe5b465c8ffbb9de507828333d5255c05e`.
- Trial 8 technical commit:
  `ec141c209387c645b4ca9825c53f9c8c6b90281a`.
- Verified technical tree:
  `eea520d4edaa9ecee4dd765e99a68cac3d6b2ada`.
- Request-only commit:
  `f50d2994c5b47f386fc937944a83af575b21b361`.
- Verified request tree:
  `badce08fc7ab1ad6bd67e2ddbfafacc7129818fc`.
- The technical commit is the direct child of the stated parent.
- The request commit is the direct child of the technical commit and adds only
  `plan/reviews/PROJECT_V5/C_1_0-8_review.md`.
- The technical correction changes the declared nine files: 602 insertions
  and 114 deletions.
- The cumulative technical range contains the declared 69 files, 8,792
  insertions, and 446 deletions.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- Audit core, lockfiles, dependency declarations, policies, coordination code,
  and `D/0/00` plus `D/0/01` are unchanged in the Trial 8 correction.

The code review was read-only. No author code, tests, plan text, request file,
or implementation commit was modified or amended.

## Blocking findings

### P1 — replacement environments are rejected or silently changed by Bash

`gateway/src/adapters/sync_process_runner.sh:36` accepts only names that are
valid Bash identifiers. `gateway/src/adapters/sync_process_runner.sh:76-82`
then implements replacement by unsetting exported shell variables and
exporting the requested values inside Bash.

That is narrower than the environment object accepted by Node's direct
`spawnSync` boundary. An independent real-runner probe used these valid
environment entries:

```text
1START=digit
A-B=hyphen
A.B=dot
```

Direct `spawnSync("/usr/bin/env", ["-0"], { env })` returned status zero and
all three exact entries. `spawnSyncWithDeadline` returned status 125, empty
stdout, and:

```text
sync process runner failed
```

Even shell-identifier names are not sufficient. With:

```text
BASHOPTS=requested-bashopts
SHELLOPTS=requested-shellopts
UID=424242
NORMAL=requested-normal
```

the direct child received all four exact values. The runner returned status
zero, but the provider received Bash's own `BASHOPTS`, `SHELLOPTS`, and `UID`
values instead. Runner diagnostics were also injected into provider stderr:

```text
sync_process_runner.sh: line 81: BASHOPTS: readonly variable
sync_process_runner.sh: line 81: SHELLOPTS: readonly variable
sync_process_runner.sh: line 81: UID: readonly variable
```

This is not only an unsupported edge reported as a failure: the second case
silently launches the provider with a different environment while preserving a
successful status. It violates the requested exact replacement contract and
can change provider configuration or credentials.

Required correction:

1. Preserve every replacement-environment entry supported by the underlying
   Node process API, including names and values that Bash cannot assign.
2. Preserve the exact provider environment without adding runner diagnostics
   to provider stderr.
3. Add real-runner tests for non-shell identifiers and Bash readonly names;
   a mocked payload decoder is insufficient.

### P1 — supported `DataView` input is silently discarded

`gateway/src/adapters/sync_process.js:35-43` converts every non-string input
with `Buffer.from(input)`. For a `DataView`, that produces an empty buffer
instead of the view's byte range.

An independent comparison passed a `DataView` over bytes
`[1, 2, 127, 128]` to `/bin/cat`:

```text
direct spawnSync:         status=0 stdout=[1,2,127,128]
spawnSyncWithDeadline:    status=0 stdout=[]
```

Both calls report success, so the provider cannot distinguish the corruption
from intentionally empty stdin. Node supports `DataView` as synchronous child
input, and exact stdin was an explicit review requirement.

Required correction:

1. Preserve the byte offset and byte length of every supported binary input
   type, especially `DataView`.
2. Add an actual runner integration test with a non-zero-offset view and
   binary bytes, not only a `Buffer` or string.

### P1 — real provider signals become numeric exits and can alter stderr

`gateway/src/adapters/sync_process_runner.sh:91-94` waits for the provider and
exits with Bash's numeric wait status. That collapses real signal termination
into `128 + signal`, so the Node caller no longer receives the provider's
`signal` field. Job-control diagnostics can also be appended to stderr.

Independent direct-versus-runner results were:

```text
provider outcome   direct spawnSync                 deadline runner
SIGTERM            status=null signal=SIGTERM       status=143 signal=null
SIGKILL            status=null signal=SIGKILL       status=137 signal=null
```

The direct SIGKILL stderr was empty. The runner added a Bash
`Killed (...)` diagnostic. Neither wrapped result was misclassified as
`TIMEOUT`, so the timeout discriminator itself passes, but the provider result
does not retain exact signal/status/stderr semantics. The existing
`runner signal without a timeout error` unit test supplies a synthetic result
from a mocked `spawnSyncImpl`; it never exercises this real runner behavior.

Required correction:

1. Preserve a real provider signal distinctly from a normal numeric exit while
   retaining `ETIMEDOUT` as the only native-timeout signal.
2. Do not add runner/job-control diagnostics to provider stderr.
3. Add real-runner SIGTERM and SIGKILL regressions rather than only a mocked
   result object.

## Passing independent process and lifecycle evidence

### Three concrete adapters and three executable classes

A reviewer-only harness used every real adapter class—Codex, Claude, and
Gemini—with disposable local executables and `dryRun=false`. It exercised:

- a cooperative 120-millisecond process;
- a direct provider that ignored `SIGTERM`; and
- a provider plus normal descendant where both ignored `SIGTERM`.

The service timeout was 20 milliseconds and the independent elapsed ceiling
was 100 milliseconds. The harness ran 144 cases:

- nine initial cases;
- 45 cases over five baseline rounds; and
- 90 cases over ten rounds while Gateway lint and all 222 structure tests ran
  concurrently.

All 144 passed. The baseline elapsed range was **21.576–38.041 ms**. Under
concurrent lint/structure load the range was **21.235–28.760 ms**.

Every case independently proved:

- exact `TIMEOUT` and configured message on the first call;
- exactly one concrete adapter invocation;
- `session=error@1` and `task=pending@2`;
- two evidence rows per entity and exactly one `launch_failed` per entity;
- exactly one service `ERROR`;
- zero `SESSION_STARTED` or `SESSION_CLOSED` events;
- exact retry returning `LIFECYCLE_LAUNCH_FAILED` without relaunch, evidence,
  error, or lifecycle-event duplication;
- a dead marked provider PID;
- for the tree case, a dead marked descendant PID and no completion marker;
  and
- no matching synthetic provider in the process table.

The accepted executable characterization in the submitted suite also passed:
status/stdout were retained, the session closed, the task remained
non-terminal/running, exactly one ordered lifecycle pair was published, and
exact replay did not relaunch.

### Process group, trap race, reap, and unrelated-process safety

An accepted real-runner probe read `/proc/self/stat` inside the provider. Its
process group equalled its own PID and differed from both the runner parent and
the reviewer process, confirming a distinct provider PGID.

A separate reviewer race probe ran 270 timeouts across one- through
20-millisecond budgets, including windows where the provider marker existed
but the descendant marker did not yet exist:

```text
budget   attempts   parent markers   child markers
1 ms           30                0               0
2 ms           30                0               0
3 ms           30                0               0
4 ms           30                0               0
5 ms           30               11               6
6 ms           30               24              23
8 ms           30               30              30
10 ms          30               30              30
20 ms          30               30              30
```

Every marked process was gone, every completion marker was absent, and the
post-run scan was empty. A detached, unrelated sentinel process remained alive
through all 270 attempts and was cleaned up by the reviewer afterward. This
supports the `provider_pid=0`/`jobs` fallback and shows no observed foreign
process kill. The direct provider and synchronous runner were reaped before
their respective `spawnSync` calls returned.

### Structured protocol and initial launch surface

The versioned NUL-delimited protocol passed a normal real-runner probe with:

- literal metacharacters including `$(touch ...)`, semicolon, glob, quotes,
  and backslash;
- replacement values containing spaces and metacharacters;
- binary `Buffer` stdin;
- exact provider stdout and stderr; and
- normal exit status 37.

The metacharacters remained literal and the touch marker did not exist.
Static inspection confirms quoted array expansion and no `eval`, `source`,
`bash -c`, `sh -c`, or constructed provider command text. A malformed version
failed generically with status 125, and NUL-bearing arguments/environment
values were rejected before launch.

An injected launch-surface probe observed only the fixed runner path, an empty
runner argument vector, no explicit runner environment, `shell=false`,
`detached=true` on this POSIX host, `SIGTERM` as the native timeout signal, and
the positive remaining deadline. Synthetic provider argument and environment
secrets appeared only in the structured stdin payload, not in runner argv,
explicit initial environment, or logs.

`gateway/src/adapters/sync_process_runner.sh` is executable with mode 755 and
passes `bash -n`.

## Retained suites and gates

- Shared synchronous helper: **7/7 passed**.
- Complete lifecycle-ordering file: **29/29 reported tests passed**.
- Safe lifecycle/schema/migration/service/adapter bundle:
  **183 total, 174 passed, nine exact live-PostgreSQL skips, zero failed**.
- Explicit audit/message/catalog/artifact compatibility superset:
  **77/77 passed**.
- Retained Trial 6 deterministic stress:
  - **60/60 expired delegates** settled once with zero lifecycle events;
  - **60/60 accepted delegates** published exactly one ordered pair and none
    on retry; and
  - **60/60 concurrent exact-kill pairs** used one adapter call, one durable
    transition, and one server-owned close event.
- Gateway lint passed, including `bash -n` for the runner.
- Structure suite with locked `pytest==9.0.3` and `PyYAML==6.0.3`:
  **222/222 passed**.
- `python scripts/ci_gate.py --validate-only`: `status=passed`, no errors.
- Independent `lint.gateway` inventory calculation includes
  `gateway/package.json` and `gateway/src/adapters/sync_process_runner.sh`;
  computed and recorded values match at
  `sha256:a308151e85249e5c9ca50cca71bd2cb45d70079352faf507ac771682388785c4`.
- `git diff --check` passed for the Trial 8 correction, cumulative technical
  range, and request-only range.
- Redacted `gitleaks detect --pipe` passed for both technical ranges with no
  leaks.

## Commands reproduced

```bash
node /tmp/c100-review8.wqGyVA/review8_probe.mjs \
  /tmp/agents-orchestrator-v5-c100.bz4ftg/worktree 5

# Run concurrently with Gateway lint and structure:
node /tmp/c100-review8.wqGyVA/review8_probe.mjs \
  /tmp/agents-orchestrator-v5-c100.bz4ftg/worktree 10
npm --prefix gateway run lint
/home/carase/git/personal/agents-orchestrator/.venv/bin/python \
  -m pytest -q -rs tests/structure

node /tmp/c100-review8.wqGyVA/race_probe.mjs \
  /tmp/agents-orchestrator-v5-c100.bz4ftg/worktree
node /tmp/c100-review8.wqGyVA/boundary_probe.mjs \
  /tmp/agents-orchestrator-v5-c100.bz4ftg/worktree

node --test --test-concurrency=1 \
  tests/gateway/sync_process_deadline.test.js
node --test --test-concurrency=1 \
  tests/gateway/lifecycle_service_ordering.test.js
node --test --test-concurrency=1 \
  --test-name-pattern='^(concrete delegates publish no lifecycle events when the startup deadline expires|accepted concrete delegates publish exactly one lifecycle pair|concurrent exact kills invoke each concrete adapter and close lifecycle only once)$' \
  tests/gateway/lifecycle_service_ordering.test.js

env -u AGENTS_DB_URL \
  -u AGENTS_TEST_DB_URL \
  -u AGENTS_PG_INTEGRATION \
  -u AGENTS_TEST_DB \
  -u AGENTS_REDIS_URL \
  -u AGENTS_TEMPORAL_ADDRESS \
  node --test --test-concurrency=1 \
  tests/gateway/agent_errors.test.js \
  tests/gateway/lifecycle_reducer.test.js \
  tests/gateway/lifecycle_repository.test.js \
  tests/gateway/lifecycle_service_ordering.test.js \
  tests/gateway/sync_process_deadline.test.js \
  tests/gateway/lifecycle_postgres_contract.test.js \
  tests/gateway/sqlite_migrations.test.js \
  tests/gateway/postgres_state.test.js \
  tests/gateway/orchestration_service.test.js \
  tests/gateway/task_service.test.js \
  tests/gateway/tool_session_attach_info.test.js \
  tests/gateway/schemas.test.js \
  tests/gateway/codex_adapter.test.js \
  tests/gateway/codex_supervised.test.js \
  tests/gateway/claude_adapter.test.js \
  tests/gateway/gemini_delegate.test.js \
  tests/gateway/gemini_policy_audit.test.js \
  tests/gateway/gemini_supervised.test.js

node --test --test-concurrency=1 \
  tests/gateway/audit_reader.test.js \
  tests/gateway/audit_writer.test.js \
  tests/gateway/message_repo.test.js \
  tests/gateway/tool_message.test.js \
  tests/gateway/tool_catalog.test.js \
  tests/gateway/tool_schema_projection.test.js \
  tests/gateway/tool_artifact.test.js \
  tests/gateway/artifact_get_policy.test.js \
  tests/gateway/artifact_share_service.test.js \
  tests/gateway/artifact_store.test.js \
  tests/gateway/artifact_visibility_matrix.test.js \
  tests/gateway/tool_artifact_share.test.js

/home/carase/git/personal/agents-orchestrator/.venv/bin/python \
  scripts/ci_gate.py --validate-only

git diff --check \
  5a9aa4fe5b465c8ffbb9de507828333d5255c05e..ec141c209387c645b4ca9825c53f9c8c6b90281a
git diff --check \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..ec141c209387c645b4ca9825c53f9c8c6b90281a

git diff --no-ext-diff --unified=0 \
  5a9aa4fe5b465c8ffbb9de507828333d5255c05e..ec141c209387c645b4ca9825c53f9c8c6b90281a \
  | gitleaks detect --pipe --redact --no-banner
git diff --no-ext-diff --unified=0 \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..ec141c209387c645b4ca9825c53f9c8c6b90281a \
  | gitleaks detect --pipe --redact --no-banner
```

## Scope and isolation

No real agent/provider, MCP server, Redis client/service, network service,
`tmux` session, or live database was used. Executable probes were local,
disposable synthetic processes only. Review-only temporary workspaces and
processes were removed, and the final runner/provider scan was empty.

Self-detaching descendants and long-lived asynchronous supervision remain
explicit `D/0/01` non-scope. The Trial 8 correction does not modify that sheet
or claim those capabilities. That declared non-scope does not invalidate the
passing normal-process-group deadline behavior; the `KO` is instead caused by
the three in-scope synchronous boundary fidelity failures above.

## Final status

Task `V5 C/1/00`, Trial 8: **reviewed KO**. Trial 9 must preserve exact
environment, binary-input, and non-timeout signal/result semantics while
retaining the verified process-group deadline, lifecycle settlement, retry,
event-ownership, and isolation behavior.
