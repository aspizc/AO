# Independent Review Result — V5 C/1/00 Trial 7

## Verdict

**KO — one P1 blocker.**

Requested reviewer configuration: **GPT-5.6 Sol con razonamiento ultra;
Priority/Fast solicitado**. The effective service tier cannot be independently
confirmed from this review session.

The cooperative 120 ms process probes, lifecycle settlement assertions,
retained Trial 6 stress, compatibility checks, lint, structure tests, CI
inventory, diff checks, and redacted secret scans all pass. However, the shared
synchronous process boundary does not enforce the deadline when the child
ignores the default termination signal. That leaves the event loop and durable
launch reservation blocked beyond the server-owned deadline.

## Candidate identity and scope

- Authoritative parent:
  `a6f6393a5324cb5544f8fc2d75af808d161d63d0`.
- Technical commit:
  `f8e5b2b098670749808c42b1e66a2f33078300ed`.
- Verified technical tree:
  `a52a251bcc6754d52c80bcef6a2b47f5cbbd82c9`.
- Request-only commit:
  `5f3052167e7adc7740733cbac9cadface14ed0e8`.
- The technical commit is the direct child of the stated parent.
- The request commit is the direct child of the technical commit and changes
  only `plan/reviews/PROJECT_V5/C_1_0-7_review.md`.
- The technical correction changes the declared nine files only.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- Audit core, legacy message tool, dependencies, policies, coordination code,
  and `D/0/00` plus `D/0/01` are unchanged in the Trial 7 correction.

The code review was read-only. No author code, tests, plan text, or commits were
modified or amended.

## Blocking finding

### P1 — a child that ignores `SIGTERM` defeats the concrete launch deadline

`gateway/src/adapters/sync_process.js:41` invokes `spawnSync` with a `timeout`
but no non-cooperative termination strategy. The three concrete delegates all
use this boundary:

- `gateway/src/adapters/codex_adapter.js:220`
- `gateway/src/adapters/claude_adapter.js:145`
- `gateway/src/adapters/gemini_adapter.js:95`

The service cannot compensate for this synchronously blocked call. Adapter
invocation starts at `gateway/src/services/agent_service.js:340`, while durable
settlement does not run until `gateway/src/services/agent_service.js:383`.
The JavaScript promise timeout cannot execute while `spawnSync` is blocking.

The submitted positive test uses `sleep 0.12`, which accepts the default
termination signal. An independent local executable with the same 120 ms
runtime but an ignored `SIGTERM` reproduces the missing bound:

```sh
#!/bin/sh
trap "" TERM
exec sleep 0.12
```

Using each real adapter class, a local provider substitute, and
`agentTimeoutMs=20` produced:

```text
codex       TIMEOUT after 128.720 ms
claude-code TIMEOUT after 126.576 ms
gemini-cli  TIMEOUT after 126.674 ms
```

All three exceed the required reasonable ceiling of 100 ms. The helper returns
the expected `TIMEOUT` only after the child exits naturally. A child that does
not exit naturally can therefore block the event loop and keep the launch
reservation in `starting` indefinitely, recreating the availability and
lifecycle-authority failure this correction is meant to close.

Required correction:

1. Make expiry terminate and reap the concrete process without relying on
   cooperative `SIGTERM`; account for the provider process tree as well as the
   direct child.
2. Add a RED/GREEN three-provider regression using a bounded local executable
   that ignores `SIGTERM`.
3. Preserve the current exact `TIMEOUT`, single settlement/error, zero
   lifecycle-event, and retry-without-relaunch assertions under that
   non-cooperative case.

## Passing independent evidence

### Cooperative concrete deadline and settlement

An independent harness used each real Codex, Claude, and Gemini adapter with a
disposable local executable running `exec sleep 0.12`, a 20 ms service
deadline, and a 500 ms independent safety timeout:

| Provider | Elapsed | First result | Retry | Process launches |
|---|---:|---|---|---:|
| Codex | 25.294 ms | `TIMEOUT` | `LIFECYCLE_LAUNCH_FAILED` | 1 |
| Claude | 20.660 ms | `TIMEOUT` | `LIFECYCLE_LAUNCH_FAILED` | 1 |
| Gemini | 23.248 ms | `TIMEOUT` | `LIFECYCLE_LAUNCH_FAILED` | 1 |

For every provider the session was `error@1`, the task was `pending@2`, each
entity had two evidence rows with exactly one `launch_failed`, the audit held
one service `ERROR`, there were zero lifecycle events, and the exact retry
added no launch, evidence, error, or lifecycle event.

The submitted focused contracts also passed:

- Shared synchronous helper: **5/5 passed**.
- Concrete timed-out and accepted headless paths: **2/2 passed**.
- Accepted concrete paths retained one ordered
  `SESSION_STARTED, SESSION_CLOSED` pair and did not relaunch on exact retry.

### Retained Trial 6 stress

The three retained stress tests passed with 20 iterations per provider:

- **60/60 expired delegates** settled once and emitted no lifecycle event.
- **60/60 accepted delegates** emitted exactly one ordered lifecycle pair,
  including no duplicate on exact retry.
- **60/60 concurrent exact-kill pairs** performed one adapter call, one
  transition, and one server-owned close event; the later retry was
  side-effect free.

### Broader checks

- Safe lifecycle/schema/migration/service/adapter bundle:
  **170 total, 161 passed, nine exact live-PostgreSQL skips, zero failed**.
- Explicit audit/message/catalog/artifact compatibility superset:
  **77/77 passed**.
- Gateway ESLint: passed.
- Structure suite with `pytest==9.0.3` and `PyYAML==6.0.3`:
  **222/222 passed**.
- `python scripts/ci_gate.py --validate-only`: `status=passed`, no errors.
- `git diff --check` passed for both the Trial 7 correction and cumulative
  technical ranges.
- Redacted `gitleaks detect --pipe` passed for both ranges with no leaks.

No real agent/provider, network service, shared Redis, live database, or tmux
session was used for the cited evidence.

## Review-lane isolation note

One preliminary compatibility command contained an empty dynamic file
expansion, causing Node's default test discovery to run an unintended local
dry-run MCP stdio test. It used no real provider, network, shared Redis, tmux,
or live database. That run is excluded from all evidence above; the intended
compatibility set was rerun from an explicit file list. This exception is
recorded because the requested review lane prohibited MCP execution.

## Commands reproduced

```bash
node --test --test-concurrency=1 \
  tests/gateway/sync_process_deadline.test.js

node --test --test-concurrency=1 \
  --test-name-pattern='(concrete delegates bound synchronous headless|accepted concrete headless)' \
  tests/gateway/lifecycle_service_ordering.test.js

node --test --test-concurrency=1 \
  --test-name-pattern='^(concrete delegates publish no lifecycle events when the startup deadline expires|accepted concrete delegates publish exactly one lifecycle pair|concurrent exact kills invoke each concrete adapter and close lifecycle only once)$' \
  tests/gateway/lifecycle_service_ordering.test.js

npm --prefix gateway run lint
/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q -rs tests/structure
/home/carase/git/personal/agents-orchestrator/.venv/bin/python scripts/ci_gate.py --validate-only

git diff --check \
  a6f6393a5324cb5544f8fc2d75af808d161d63d0..f8e5b2b098670749808c42b1e66a2f33078300ed
git diff --check \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..f8e5b2b098670749808c42b1e66a2f33078300ed

git diff --no-ext-diff --unified=0 \
  a6f6393a5324cb5544f8fc2d75af808d161d63d0..f8e5b2b098670749808c42b1e66a2f33078300ed \
  | gitleaks detect --pipe --redact --no-banner
git diff --no-ext-diff --unified=0 \
  11d5245ef312dd02ad7cd59d66ab0b9cce181071..f8e5b2b098670749808c42b1e66a2f33078300ed \
  | gitleaks detect --pipe --redact --no-banner
```

## Final status

Task `V5 C/1/00`, Trial 7: **reviewed KO**. Trial 8 must correct the P1
non-cooperative child-process deadline before another independent review.
