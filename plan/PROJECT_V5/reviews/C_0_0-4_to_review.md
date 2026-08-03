# Review Submission — Project V5 C/0/00 Fail-Closed Finalization (Trial 4)

## Status

Trial 4 is **pending independent review**. C/0/00 remains `in_progress`; no
reviewed, integrated, promoted, absorbed, or released state is claimed.
Trials 1–3 and all three KO verdicts remain append-only and unchanged.

## Correction

Commit
`7029a108fb089498f52e72a758304b52b0b79c08`
(`fix(ci): make cleanup and emission fail closed (V5 C/0/00)`) addresses every
Trial 3 blocker:

- cleanup wraps the PGID probe and adds independent exact `/proc`
  process-group and descendant-tree snapshots; failures in group probe, group
  signalling, member enumeration, communication, direct kill, and
  `Popen.wait()` cannot bypass the direct `waitpid` fallback or leave a known
  owned member alive;
- an owned group which still exists after the bounded kill/reap window raises
  `ProcessCleanupError` rather than being reported as contained;
- SIGINT/SIGTERM are blocked before the first handler transition, pending
  signals are consumed into first-signal state, and both initial installation
  positions are covered;
- final output performs zero-byte buffered `write`/`flush` probes while the
  cancellation handler remains active, so a signal there changes state before
  any report byte is visible;
- original handlers are restored while both signals are blocked; pending
  transition/serialization signals select the one final payload and 130/143
  status before a low-level output commit;
- the caller's exact original handler identities and signal mask are restored
  before `main()` returns.

The CI contract and ADR describe this same behavior.

## TDD RED

Before the Trial 4 production correction, the first adversarial selection
reported **9 failed, 1 passed, 29 deselected**:

- group-probe and group-signal failures returned while real owned PIDs were
  alive;
- SIGINT/SIGTERM after the first initial handler installation produced a
  traceback/no JSON or default termination/no JSON;
- SIGINT/SIGTERM in the first final `write` and in `flush` produced a `passed`
  JSON and exit 0;
- `main()` returned with both `CancellationState.handle` methods still
  installed.

The direct-wait fault was already contained by the Trial 3 fallback and was
the one passing characterization. It remains in the Trial 4 matrix. Exact
member-enumeration failure and the second initial handler position were added
as further regression points while green.

## GREEN and regression evidence

- Final focused manifest suite: **45 passed in 9.28s**.
- Full structure suite in the authoritative gate: **190 passed**.
- Real pytest runner plus SIGTERM in final flush: one `cancelled` JSON, exit
  143, no traceback, and no `agents-ci-junit-*` directory after return.
- Ruff, Python compilation, and `git diff --check`: passed.
- Full authoritative offline gate with the worktree venv first on `PATH` and
  every shared/live-service opt-in empty:
  **995 accounted checks; 983 passed; 12 exact allowlisted infrastructure
  skips; 0 failed**. Aggregate status was honestly
  `infrastructure_unavailable`, exit 0.
- Post-run process scan found no real fixture runner, descendant, PGID, or
  JUnit temporary process/artifact.

No network, shared Redis, MCP reconnect, Postgres, Temporal, provider,
container, or tmux was used. `message.*` and `agents:events` were not changed.

## Review request

Use `gpt-5.6-sol`, reasoning `ultra`, service profile `priority/fast`. Review
the range
`4e6f4a5755cfe016e9a1b7c2bf249603a5975760..7029a108fb089498f52e72a758304b52b0b79c08`.

Independently inject persistent faults in communication, PGID existence,
PGID signalling, member enumeration, direct kill/wait, and combinations of
those faults against a real runner plus descendant. Require exact PID/PGID
absence before any result.

Inject SIGINT and SIGTERM after each initial/restoration handler transition,
during serialization, buffered write, buffered flush, and the low-level output
commit. Require exactly one parseable `cancelled` JSON and exit 130/143 for
every pre-commit signal, no traceback, restored handler identities/mask, no
owned processes, and no JUnit residue. Review the documented output commit
boundary and reject any pre-commit race or false containment.

Re-run focused/structure verification and confirm every Trial 1–3 artifact is
byte-identical. Publish exactly one append-only
`C_0_0-4_reviewed_OK.md` or `C_0_0-4_reviewed_KO.md`; modify no production
file.
