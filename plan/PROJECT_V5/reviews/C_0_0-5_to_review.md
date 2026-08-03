# Review Submission — Project V5 C/0/00 Identity and Output Correction (Trial 5)

## Status

Trial 5 is **pending independent review**. C/0/00 remains `in_progress`; no
reviewed, integrated, promoted, absorbed, or released state is claimed.
Trials 1–4 and their four KO verdicts remain append-only and unchanged.

## Correction

Commit
`8ff66e377c68c0b4d2fa19097505ef088c007be9`
(`fix(ci): bind cleanup identities and freeze output (V5 C/0/00)`) addresses
both Trial 4 blockers:

- every observed process is bound to PID, PGID, and Linux `/proc` start time;
  exact SIGKILL runs unconditionally after the TERM grace period, independently
  of failed group probing, group signalling, member enumeration,
  `Popen.kill()`, or `Popen.wait()`;
- a fresh direct snapshot proves every observed identity and the complete PGID
  absent; an unreadable identity is unknown, not absent, and PID reuse cannot
  redirect an exact signal;
- `ProcessCleanupError` crosses `_run_suite`, `run_gate`, and `main` without
  becoming a suite or aggregate JSON result, while caller signal handlers and
  the entry mask are restored;
- the output commit primitive performs the final pending-signal drain,
  cancellation application, rerender, and payload/status freeze at one
  documented logical boundary;
- every signal pending before that freeze selects a single `cancelled` JSON and
  exit 130/143; a signal after the freeze is explicitly post-commit even before
  the first kernel byte;
- a partial low-level write is never replayed through a full buffered fallback.

The CI contract and ADR describe the same boundary and fatal-cleanup behavior.

## TDD RED

Before changing production code, the Trial 4 blocker selection reported
**5 failed, 45 deselected**:

- the persistent combination of communication, PGID probe, PGID signal, member
  enumeration, direct kill, and direct wait faults returned while the real
  TERM-resistant runner, descendant, and PGID were alive;
- SIGINT and SIGTERM after the final render and immediately before entering the
  low-level commit each emitted `passed` and returned 0.

A second exact-identity test then demonstrated **1 failed, 4 passed,
50 deselected**: an exception reading a known identity was incorrectly treated
as absence.

## GREEN and regression evidence

- Trial 5 adversarial selection: **10 passed, 45 deselected**.
- Final focused manifest suite: **56 passed in 10.04s**.
- Full structure suite: **201 passed in 10.26s**.
- The combined real-process fault injection proves runner PID, descendant PID,
  and PGID absent before `_run_suite()` returns.
- Exact-identity regressions prove unreadable means unknown and a reused PID is
  never signalled.
- Pre-freeze SIGINT/SIGTERM probes produce one `cancelled` JSON and 130/143;
  the post-freeze `os.write` probe keeps the already frozen `passed`/0 result,
  making the limitation explicit rather than silently moving the boundary.
- A synthetic partial write raises without replaying the complete payload.
- Ruff, Python compilation, and `git diff --check`: passed.
- Full authoritative offline gate, with a private `TMPDIR` and all shared/live
  service opt-ins absent: **1006 accounted checks; 994 passed; 12 exact
  allowlisted infrastructure skips; 0 failed**. Aggregate status was honestly
  `infrastructure_unavailable`, exit 0.

No network, shared Redis, MCP reconnect, Postgres, Temporal, provider,
container, or tmux was used. `message.*` and `agents:events` were not changed.
All Trial 5 temporary paths were removed precisely after verification.

## Review request

Use `gpt-5.6-sol`, reasoning `ultra`, service profile `priority/fast`. Review
the range
`26bacc4eae38f61bd9de6ad1e5d55d29818f68ac..8ff66e377c68c0b4d2fa19097505ef088c007be9`.

Independently repeat the six-way persistent cleanup fault against a real
TERM-resistant runner and descendant. Inject snapshot/read errors, PID reuse,
late descendants, partial group inventory, and failures of exact signalling.
Require every observed PID and the PGID absent before any result; if absence
cannot be proven, require `ProcessCleanupError`, no JSON result, and restored
handlers/mask.

Inject SIGINT and SIGTERM after both preview renders, before the commit
primitive, during its final render/drain, and immediately after the documented
freeze. Require every pre-freeze signal to select exactly one cancelled JSON
and 130/143; require the post-freeze case to preserve the frozen result. Inject
zero-byte, partial, and failing `os.write` outcomes and reject any duplicate
fallback or second JSON.

Re-run focused/structure verification and confirm every Trial 1–4 submission
and verdict artifact is byte-identical. Publish exactly one append-only
`C_0_0-5_reviewed_OK.md` or `C_0_0-5_reviewed_KO.md`; modify no production
file.
