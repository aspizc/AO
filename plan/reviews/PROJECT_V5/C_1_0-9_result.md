# Independent Review Result — V5 C/1/00 Trial 9

## Verdict

**KO — three P1 blockers and one P2 contract gap. No P0 was found.**

Execution profile: **GPT-5.6 Sol (`gpt-5.6-sol`), ultra reasoning,
Priority/Fast service tier**.

Trial 8's three reported fidelity defects are closed: raw environment entries,
the selected `DataView` byte range, and real provider signals all survive the
fixed boundary. The submitted Linux containment also passed independent
deadline, collision, inherited-mask, PID/PGID identity, parent-death, and
subreaper probes. The candidate cannot be approved, however, because its
advertised macOS/Python runtime does not implement the wait primitive it calls,
native `ENOBUFS` can still be reclassified as `TIMEOUT`, and failed runner
startup can be returned as if it were a provider outcome. A fourth gap corrupts
the private control channel for supported non-UTF-8 output encodings.

## Candidate identity

- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 8 `KO` / Trial 9 base:
  `d204732064a4348b658c6d1fcb4ff24e11168b81`.
- Verified base tree:
  `1ae77232faa471563a29d4280e2c59324371f06b`.
- Trial 9 technical commit:
  `48eab7c82893f761def9041411872b317d0eb144`.
- Verified technical tree:
  `99b2d540ea962352f76ffc9f6b109a823abdbc73`.
- Request-only commit:
  `985973e42d51f97a56f0c1511d85ac2c10606518`.
- Verified request tree:
  `1ac97263642b01af7d72ea716b6c7414419faf2c`.
- The technical commit is the direct child of the stated base.
- The request commit is the direct child of the technical commit and changes
  only `plan/reviews/PROJECT_V5/C_1_0-9_review.md`.
- The technical range contains 21 files, 1,849 insertions, and 160 deletions.

The implementation, tests, documentation, and request remained unmodified
during review. This result is the only repository file created by the
reviewer.

## Blocking findings

### P1 — the advertised macOS/Python 3.11+ path cannot settle a provider

`gateway/src/adapters/sync_process_runner.py:302-306` unconditionally calls
`os.waitid(..., WNOWAIT)` from the common provider settlement path. That call
is also reached after the Darwin configuration seam deliberately skips Linux
`prctl`. CPython 3.11 explicitly documents `os.waitid` as unavailable on macOS;
the current documentation records that macOS support was added only in Python
3.13:

- [CPython 3.11 `os.waitid` documentation](https://docs.python.org/3.11/library/os.html#os.waitid)
- [Current `os.waitid` change history](https://docs.python.org/3/library/os.html#os.waitid)

Consequently, an advertised Python 3.11 or 3.12 macOS launch raises
`AttributeError`; the generic handler at
`gateway/src/adapters/sync_process_runner.py:426-430` kills the otherwise valid
provider and reports `INTERNAL`. This contradicts:

- `docs/adr/ADR-009-synchronous-provider-boundary.md:28-32`, which requires
  Python 3.11 or newer;
- `docs/adr/ADR-009-synchronous-provider-boundary.md:87-90`, which promises
  the macOS PGID, bounded-wait, and status/signal path;
- `docs/operator-guide.md:9-13,93-99`;
- `gateway/README.md:210-223`; and
- `plan/PROJECT_V5/C/1/00.md:445-449`.

The submitted platform test at
`tests/gateway/sync_process_deadline.test.js:183-303` mocks configuration and
the leader-observation callback; it never executes `wait_without_reaping` with
the advertised Darwin/Python combination.

Independent local seam proof:

```text
delete runner.os.waitid
runner.wait_without_reaping(424242)
=> AttributeError: module 'os' has no attribute 'waitid'
```

Impact: every deadline-bound real Codex, Claude, or Gemini delegate fails on
macOS with Python 3.11/3.12, despite those combinations being documented as
supported.

Minimal correction: either implement a Darwin-compatible non-reaping
observation primitive that preserves the leader identity through the
kill/reap critical section, or raise and consistently enforce the macOS Python
minimum to a version that supplies the required primitive. Exercise an actual
provider settlement on macOS at every documented minimum version; a mocked
platform selector is insufficient.

### P1 — native `ENOBUFS` loses authority when cleanup reaches the deadline

`gateway/src/adapters/sync_process.js:163-171` deliberately avoids replacing
native `ENOBUFS` when runner deadline metadata is present. After that decision,
however, `gateway/src/adapters/sync_process.js:227-231` unconditionally throws
`TIMEOUT` whenever the post-call clock is at or beyond `deadlineAt`.

A deterministic independent seam supplied a native result with
`error.code="ENOBUFS"`, `signal="SIGKILL"`, and valid
`runner_deadline` metadata. With `now()` returning `100` before launch and
`120` after cleanup for `deadlineAt=120`, the public result was:

```json
{
  "threw": "TIMEOUT",
  "message": "agent.delegate timed out after 20ms"
}
```

The retained test at
`tests/gateway/sync_process_deadline.test.js:1134-1176` proves only an overflow
that finishes comfortably before its two-second deadline. It does not cover
the precedence collision. This violates the Trial 9 requirement that native
`ENOBUFS` remain authoritative.

Impact: an output-capacity failure can be persisted and audited as a deadline
failure solely because provider-tree cleanup crosses the same absolute
deadline. Operators and lifecycle retry logic receive the wrong stable
contract.

Minimal correction: preserve a native `ENOBUFS` result before the final
deadline recheck, then add a deterministic clock seam and a real near-deadline
overflow regression proving `ENOBUFS`, `SIGKILL`, empty runner stderr, and zero
provider-tree residue.

### P1 — failed runner startup is returned as a provider outcome

`gateway/src/adapters/sync_process.js:160-178` recognizes only:

1. native runner `ENOENT`, mapped to `SYNC_RUNNER_UNAVAILABLE`; and
2. a valid fd3 `runner_error`, mapped to `SYNC_RUNNER_FAILED`.

Every other failure before the fixed runner can report control metadata falls
through as a normal process result. Independent real probes produced:

```json
{
  "runnerPythonBin": "./gateway/src/adapters/sync_process_runner.py",
  "mode": "0644",
  "returned": true,
  "status": null,
  "error": "EACCES"
}
```

```json
{
  "runnerPythonBin": "/bin/false",
  "returned": true,
  "status": 1,
  "error": null
}
```

The first case is an existing but non-executable configured runtime. The
second represents an incompatible/early-failing configured runtime. Missing
or unreadable runner source, interpreter startup failure, and a crash before
fd3 metadata have the same attribution gap. A raw status is inherently
ambiguous because valid providers may themselves exit 1, 125, or by signal.

This contradicts `plan/PROJECT_V5/C/1/00.md:457-459` and ADR-009's promise at
`docs/adr/ADR-009-synchronous-provider-boundary.md:92-98` that unavailable or
failed runner startup has only stable, provider-data-free runner codes.

Impact: infrastructure/configuration failure is settled as provider launch
failure, and callers may receive raw native runner results instead of
`SYNC_RUNNER_UNAVAILABLE` or `SYNC_RUNNER_FAILED`.

Minimal correction: add an unambiguous positive runner/outcome handshake on
the private control pipe and fail closed when it is absent. Map native
launch-level errors such as `EACCES`/`ENOEXEC` to the stable unavailable
surface, and map early interpreter/runner exits to the stable failed surface.
Regress non-executable runtime, incompatible runtime, missing/unreadable runner
source, pre-handshake crash, and genuine provider exits/signals so runner and
provider attribution cannot collide.

### P2 — output encoding corrupts the private control channel

`gateway/src/adapters/sync_process.js:144-157` applies the provider's
`options.encoding` to all four captured pipes. `controlMetadata` at
`gateway/src/adapters/sync_process.js:90-101` then assumes fd3 is either raw
bytes or an already UTF-8 JSON string.

Independent real missing-provider probes with valid Node encodings returned:

```text
encoding=hex      => SYNC_RUNNER_FAILED / INVALID_CONTROL
encoding=base64   => SYNC_RUNNER_FAILED / INVALID_CONTROL
encoding=utf16le  => SYNC_RUNNER_FAILED / INVALID_CONTROL
```

The expected outcome in all three cases is the provider's native `ENOENT`
shape. Runner-owned deadline evidence can be corrupted by the same path.
Current concrete adapters request UTF-8, so this does not break their present
launch flow; it still violates the shared synchronous-boundary contract.

Minimal correction: keep fd3 as bytes independently of provider output
encoding, then apply the requested encoding only to provider stdout/stderr
while retaining native `spawnSync` shapes. Add real accepted-output, provider
`ENOENT`, provider-signal, and runner-deadline coverage for `hex`, `base64`,
and `utf16le`.

## Passing independent evidence

### Trial 8 blockers and fixed launch surface

An independent real-runner comparison passed:

- seven exact raw environment entries: `=`, `1START`, `A-B`, `A.B`,
  `BASHOPTS`, `SHELLOPTS`, and `UID`, including spaces, equals signs,
  newlines, and shell metacharacters;
- a non-zero-offset `DataView` with exact output bytes
  `[1, 2, 127, 128]`;
- real `SIGTERM` and `SIGKILL` as `{status:null, signal}` with empty stderr;
- ordinary exits 143 and 137 as numeric statuses with `signal:null`; and
- the no-deadline direct compatibility path.

An injected launch-surface probe observed the fixed runner argv
`["-S", "sync_process_runner.py"]`, a `PATH`-only initial environment,
`shell:false`, and four fixed pipes. Four provider secrets appeared exactly
once each in the length-prefixed stdin payload and zero times in runner argv,
initial environment, stable runner errors, or stacks.

### Linux deadline and containment

- Focal synchronous-boundary file: **23/23 passed**.
- Inherited-mask real probe: **30/30** 20-millisecond deadlines passed with
  both `SIGTERM` and `SIGALRM` blocked in the process that execed Node;
  maximum elapsed was **24.208 ms**, below the 100-millisecond service ceiling.
- Collision-prone real stress: **500/500** provider trees started and marked
  at a 50-millisecond deadline. Maximum elapsed was **53.008 ms**; all 500
  native results reported timeout evidence. There were **500 runner**, **500
  provider**, and **500 child** post-return identity checks using PID, PGID,
  and start time, with zero residue and zero completion markers. The corrected
  exact-argv runner scan was also empty.
- Runner-owned timer: the native timeout was deliberately changed to two
  seconds while the protocol deadline remained 150 milliseconds. The call
  returned public `TIMEOUT` in **151.709 ms**, with runner, provider leader,
  and child absent.
- Parent death: the submitted nested-subreaper regression passed while the
  whole test command itself ran beneath an additional independent outer
  subreaper. The outer subreaper reaped only its Node child and adopted zero
  runner/provider residue.
- The focal leader-exit regression retained status zero after killing/reaping
  a long-lived in-group child.
- The focal nominal `maxBuffer` regression retained `ENOBUFS`, `SIGKILL`, and
  empty stderr while reaping the resistant group. The blocker above is the
  uncovered collision with the final absolute-deadline check.
- Static inspection confirmed `waitid(..., WNOWAIT)`, control-signal blocking
  around group kill/reap/identity invalidation, Linux child-subreaping,
  `setsid`, and validated `PR_SET_PDEATHSIG`.

### Complete isolated gate and compatibility

A fresh Python 3.11.15 environment was populated only from the local cache:

```bash
uv pip sync --offline --python <review-venv>/bin/python requirements.lock
uv pip install --offline --no-deps --no-build-isolation \
  --python <review-venv>/bin/python -e cli -e orchestrator-langgraph
```

The complete gate then ran with Redis, PostgreSQL, Temporal, and real-provider
environment variables removed:

```bash
env -u AGENTS_REDIS_URL \
  -u AGENTS_COORDINATION_REDIS_URL \
  -u AGENTS_REDIS_STREAM \
  -u AGENTS_TEST_REDIS_URL \
  -u AGENTS_DB_URL \
  -u AGENTS_TEST_DB_URL \
  -u AGENTS_PG_INTEGRATION \
  -u AGENTS_TEST_DB \
  -u AGENTS_TEMPORAL_ADDRESS \
  -u AGENTS_TEMPORAL_INTEGRATION \
  -u TEMPORAL_ADDRESS \
  -u TEMPORAL_TASK_QUEUE \
  -u AGENTS_E2E_REAL \
  PATH=<review-venv>/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  bash scripts/ci.sh
```

It exited zero with the expected allowlisted infrastructure status:

```text
tests=1170 passed=1158 skipped=12 failed=0
structure=222/222
gateway=797 passed, 9 allowlisted live-PostgreSQL skips
e2e=24/24
cli=29/29
langgraph=81 passed, 3 allowlisted integration skips
```

The gate's disposable local `smoke.mcp` and policy validation passed. The
optional Redis and real-provider suites remained unavailable and did not run.
No shared MCP server, shared Redis, real provider, `tmux` session, live
database, or network service was started or changed by the reviewer.

Additional compatibility evidence:

- `python3 scripts/ci_gate.py --validate-only`: passed.
- `git diff --check` passed for the technical and request-only ranges.
- Redacted `gitleaks detect --pipe` passed for both ranges.
- `gateway/src/tools/message.js` is byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- The Trial 9 technical diff contains no changes to `message.*`,
  `gateway/src/core/audit.js`, policies, dependency locks, coordination
  service/transport, Redis configuration, shared MCP configuration, or
  `D/0/00` and `D/0/01`.
- The complete Gateway and E2E suites retained the legacy `message.*`
  envelopes, `agents:events` isolation, coordination namespace behavior,
  policy behavior, and local MCP stdout contract.

## Scope and final status

All executable review probes used disposable local synthetic processes.
Reviewer-owned temporary files, environments, and exact process identities
were cleaned; no unrelated process was signalled. The worktree was clean
before this result was created.

Task `V5 C/1/00`, Trial 9: **reviewed KO**. This result does not authorize
integration, promotion, or release. A later trial must correct all four
findings while retaining the verified Trial 8 fidelity, Linux collision,
deadline, lifecycle, event-ownership, idempotency, and isolation behavior.
