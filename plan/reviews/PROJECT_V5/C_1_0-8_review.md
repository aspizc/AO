# C/1/00 Trial 8 — review request

Trial 8 is **pending independent review**. C/1/00 remains
`in_progress; Trials 1-7 KO; Trial 8 review pending`. This submission does not
claim an `OK`, integration, promotion, release, or full-CI result.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Original technical base:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071`.
- Trial 7 technical commit:
  `f8e5b2b098670749808c42b1e66a2f33078300ed`.
- Trial 7 request commit:
  `5f3052167e7adc7740733cbac9cadface14ed0e8`.
- Trial 7 independent `KO` / Trial 8 correction base:
  `5a9aa4fe5b465c8ffbb9de507828333d5255c05e`.
- Trial 8 technical commit:
  `ec141c209387c645b4ca9825c53f9c8c6b90281a`.
- Trial 8 technical tree:
  `eea520d4edaa9ecee4dd765e99a68cac3d6b2ada`.
- Trial 8 base tree:
  `dea9d829f9f476b3a79f6a6ccbbc7f96b2bbf0c4`.
- Original base tree:
  `2ead6bb8d02bc019c994190b2485fb654851b6af`.
- Trial 8 correction range:
  `5a9aa4fe5b465c8ffbb9de507828333d5255c05e..ec141c209387c645b4ca9825c53f9c8c6b90281a`.
- Cumulative technical range:
  `11d5245ef312dd02ad7cd59d66ab0b9cce181071..ec141c209387c645b4ca9825c53f9c8c6b90281a`.

The Trial 8 technical candidate is the direct child of the authoritative
Trial 7 independent verdict. The correction contains nine files, 602
insertions, and 114 deletions. The cumulative technical range contains 69
files, 8,792 insertions, and 446 deletions. This append-only request is a
separate evidence file and is not part of the technical tree under review.

## Trial 7 KO correction

Trial 7 correctly carried the service-owned absolute deadline into all three
concrete headless adapters. Its synchronous boundary still relied on
`spawnSync`'s default `SIGTERM`, however. A provider that ignored that signal
blocked the event loop until its natural exit, and killing only the direct
child could leave a descendant alive.

Trial 8 replaces that cooperative timeout behavior at the shared
deadline-aware boundary:

- `spawnSyncWithDeadline` still rejects an already-expired deadline, floors a
  positive fractional remainder to one millisecond, caps it by the configured
  launch timeout, and rechecks the same absolute deadline after the process
  primitive returns.
- Deadline-aware calls launch one fixed executable runner with
  `detached=true` on POSIX and `shell=false`. The provider command, argument
  vector, replacement environment, and input are absent from the launched
  runner's command line and initial environment.
- A versioned, NUL-delimited standard-input protocol carries those provider
  fields. The fixed runner parses the fields into a Bash array and invokes
  that array directly; it does not use `eval`, `bash -c`, or constructed
  command text. The unread payload tail becomes provider standard input.
- The runner places the provider in its own process group. When the native
  synchronous timeout sends `SIGTERM` to the runner, its trap sends
  non-cooperative `SIGKILL` to the provider group, falls back to the direct
  PID if necessary, waits to reap the provider, then terminates itself for the
  Node parent to reap.
- Normal descendants remain in the provider group and are killed with the
  direct child. A descendant that explicitly creates a new session or process
  group remains outside this narrow guarantee and belongs to the asynchronous
  supervision work in `D/0/01`.
- Both thrown and returned native `ETIMEDOUT` forms retain the established
  lifecycle `TIMEOUT` code and exact
  `agent.delegate timed out after <agentTimeoutMs>ms` message. A signal without
  timeout evidence remains a non-timeout process result.
- Calls without a service deadline retain the previous direct
  `spawnSync`/`adapterTimeoutMs` fallback path.

No reducer command, lifecycle transition, event-ownership boundary, or kill
idempotency path changed in Trial 8.

## Deterministic TDD evidence

The direct non-cooperative RED command was:

```bash
node --test --test-concurrency=1 \
  --test-name-pattern='concrete delegates bound SIGTERM-resistant headless process primitives' \
  tests/gateway/lifecycle_service_ordering.test.js
```

The test uses every real Codex, Claude, and Gemini adapter class with
`dryRun=false`, but replaces each provider binary with a disposable local
120-millisecond executable:

```sh
trap '' TERM
exec sleep 0.12
```

With `agentTimeoutMs=20`, all three pre-correction cases failed the
100-millisecond ceiling:

```text
codex       131.4 ms
claude-code 126.8 ms
gemini-cli  125.6 ms
```

The separate process-tree RED wrote the shell PID and a background child PID,
ignored `SIGTERM`, waited for the child, and wrote a completion marker only
after that wait. It failed before production changes at:

```text
codex       130.4 ms
claude-code 127.1 ms
gemini-cli  126.0 ms
```

That test always runs defensive direct-PID cleanup from `finally`, including
when an assertion fails. The generated PID text is accepted only when it is a
strict safe positive integer different from the test process PID.

A unit RED separately required provider arguments and environment to travel
only through runner standard input. Before the correction it observed the
provider path itself as the launched command. During GREEN hardening, an
initial Node runner passed the first focused runs but later produced real
101.3- and 118.9-millisecond ceiling failures because starting another Node
runtime consumed most of the bound. That implementation was discarded before
the technical commit. The tightened fixed-runner contract was returned to RED:

```text
expected command matching sync_process_runner.sh
actual command /usr/bin/node
```

The final runner removes that startup variance while retaining structured,
non-evaluated input and process-group ownership.

## Focused GREEN outcome

The final provider probe was repeated five consecutive times:

```bash
for trial_run in 1 2 3 4 5; do
  node --test --test-concurrency=1 \
    --test-name-pattern='concrete delegates (bound synchronous|bound SIGTERM-resistant|terminate SIGTERM-resistant)' \
    tests/gateway/lifecycle_service_ordering.test.js
done
```

Each run passed 12/12 reported tests: the parent contract plus Codex, Claude,
and Gemini subtests for cooperative, non-cooperative direct-child, and
non-cooperative process-tree cases. The final service elapsed range was
**20.978–28.174 milliseconds**, below both the 100-millisecond ceiling and the
approximately 120-millisecond provider duration.

For every tree case:

- both parent and descendant PID markers were present and valid;
- both marked processes were gone after timeout;
- the post-wait completion marker was absent; and
- a post-run process-table scan found no matching synthetic provider.

Every direct and tree timeout also proves:

- the first call returns the exact configured `TIMEOUT`;
- the concrete adapter path is invoked once;
- the session settles once to `error`, version one;
- the task returns to `pending`, version two;
- session and task each retain exactly two evidence rows and exactly one
  `launch_failed` row;
- exactly one service `ERROR` is recorded;
- neither `SESSION_STARTED` nor `SESSION_CLOSED` is published; and
- an exact retry returns `LIFECYCLE_LAUNCH_FAILED` without another launch or
  evidence row.

The focused helper passed **7/7** and the complete lifecycle-ordering file
passed **29/29** reported tests. The accepted concrete executable path still
preserves stdout, zero status, `session=closed`, `task=running`, one ordered
`SESSION_STARTED, SESSION_CLOSED` pair, and replay without relaunch.

A separate provider-free protocol probe passed a literal
`$(touch should-not-run)` argument, a replacement environment containing
spaces, and provider standard input. It received the literal argument, exact
environment, exact stdin/stdout, and three zero statuses; no text was
evaluated.

The retained Trial 6 deterministic stress remains green:

- **60/60 expired delegates** settle once and publish zero lifecycle events;
- **60/60 accepted delegates** publish exactly one ordered lifecycle pair and
  no pair on exact retry; and
- **60/60 concurrent exact-kill pairs** share one adapter call, one durable
  transition, and one server-owned close event.

## Safe expanded verification

With live integration variables removed, the lifecycle bundle was:

```bash
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
```

Result: **183 total, 174 passed, nine exact live-PostgreSQL skips, and zero
failed**.

The explicit audit/message/catalog/artifact compatibility superset passed
**77/77**:

```bash
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
```

Additional gates:

- Gateway lint passed. Its existing npm boundary now also runs `bash -n` on
  the executable runner.
- The `lint.gateway` inventory includes `gateway/package.json` and Gateway
  shell sources; its refreshed digest is
  `sha256:a308151e85249e5c9ca50cca71bd2cb45d70079352faf507ac771682388785c4`.
- `python scripts/ci_gate.py --validate-only` passed with no errors.
- The structure suite with locked `pytest==9.0.3` and `PyYAML==6.0.3` passed
  **222/222**.
- `git diff --check` passed for the Trial 8 correction and cumulative
  technical ranges.
- Redacted `gitleaks detect --pipe` passed for both ranges with no leaks.

The author lane did not run `scripts/ci.sh`, the complete Gateway suite,
`tmux_client` execution, an MCP server/smoke, Redis tests, live database
tests, network services, or real-agent/provider tests. Those integration
gates remain with the integration owner. No full-CI claim is made.

## Compatibility, declared scope, and isolation

- Trial 5's supervised event-acceptance boundary, Trial 6's delegate
  event-acceptance boundary, and concurrent exact-kill idempotency remain
  service-owned and green.
- Pending and late-resolving/rejecting launches, invalid results, nonzero
  delegates, PostgreSQL `BIGINT` compatibility, reducer/CAS ownership, atomic
  launch bundles, terminal monotonicity, cross-scope denial, and
  running-session lifetime separation remain covered.
- `gateway/package.json` changes only the lint script; dependency
  declarations and lockfiles are unchanged.
- `gateway/src/core/audit.js`, policies, coordination transport, the
  `agents:events` contract, `plan/PROJECT_V5/D/0/00.md`, and
  `plan/PROJECT_V5/D/0/01.md` are unchanged.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`;
  no `message.*` schema, handler, persistence, or public catalog behavior
  changed.
- The only executable provider substitutes were disposable local shell
  scripts. No real agent/provider, `tmux`, MCP, Redis, network service, or live
  database was used.
- Trial 8 covers a bounded synchronous provider process and normal descendants
  in its process group. Long-lived asynchronous supervision and deliberately
  self-detaching descendants remain `D/0/01` work and are not claimed here.

## Requested independent review

Please return `OK` or `KO` against the exact technical candidate and verify,
in particular:

1. the fixed runner receives no provider argument or provider-specific
   environment secret through its command line or initial environment, and
   its structured Bash array handling performs no command evaluation;
2. the provider receives the positive remaining absolute budget and starts in
   a distinct process group whose normal descendants are covered;
3. native expiry kills that process group non-cooperatively, reaps the direct
   provider and runner, and leaves neither PID marker nor completion marker;
4. thrown/returned native timeouts and post-call expiry preserve the exact
   lifecycle `TIMEOUT`, while a signal without timeout evidence is not
   misclassified;
5. direct and tree timeouts settle session/task exactly once, publish one
   service error and zero lifecycle events, and exact retry cannot relaunch or
   duplicate evidence;
6. accepted concrete launches, direct no-deadline fallback behavior, and Trial
   5/6 event ownership plus concurrent-kill stress remain intact;
7. the lint command, CI inventory contract, structure gate, compatibility
   superset, diff checks, and redacted secret scans match the recorded
   evidence; and
8. self-detaching descendants, asynchronous supervision, `message.*`,
   `agents:events`, dependencies, policy, Redis, MCP, D/0/00, and D/0/01 scope
   remain unchanged or explicitly non-scope.

---
