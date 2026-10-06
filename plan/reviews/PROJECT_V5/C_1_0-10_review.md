# C/1/00 Trial 10 — independent review request

Status: **Pending independent review**.

C/1/00 remains
`in_progress; Trials 1-9 KO; Trial 10 review pending`. This request does not
claim an `OK`, integration, promotion, release, or local macOS execution. The
reviewer must remain independent of the author and publish the verdict in a
separate append-only result file.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 9 `KO` / Trial 10 base:
  `c3d2e7388bc4d1c4d83c34596811c386c67126c5`.
- Base tree:
  `b66bb1f729f12f51d404a9241a40d564fa898a76`.
- Trial 10 technical commit:
  `e5015370917df3c702ff2237524296f91c4da7e5`.
- Trial 10 technical tree:
  `4bfcd0444c49210355ed498767dc91956dea2142`.
- Correction range:
  `c3d2e7388bc4d1c4d83c34596811c386c67126c5..e5015370917df3c702ff2237524296f91c4da7e5`.
- Range size: 13 files, 1,349 insertions, and 137 deletions.

The technical commit is the direct child of the authoritative Trial 9 verdict.
This request is a separate request-only commit and is not part of the technical
tree under review.

## Required independent review scope

Review the implementation, tests, documentation, workflow contract, and real
failure evidence rather than accepting the author summaries. At minimum:

1. Verify Linux/WSL retains the Trial 9 `waitid(..., WNOWAIT)`, subreaper,
   parent-death, runner-owned deadline, identity-preserving kill/reap, and
   signal-collision behavior without a new fork/exec or cleanup race.
2. Audit the Darwin Python 3.11/3.12 path in detail. The close-on-exec
   READY/RELEASE gate must keep both runner control signals blocked, call
   `setsid`, reset both child dispositions, register kqueue
   `EVFILT_PROC/NOTE_EXIT`, release exactly once, publish `provider_pid`, and
   only then restore the parent mask. The observer must survive through
   observed exit, residual PGID kill, leader reap, and identity invalidation.
3. Exercise or independently seam READY EOF/timeout, kqueue construction and
   registration errors, `EV_ERROR`, wrong PID/filter, missing `NOTE_EXIT`,
   `EINTR`, release `EPIPE`, post-release failure, and close ordering.
   Pre-release failures must kill/reap only the exact gated child; a
   post-release failure must use the reserved PGID. No failure may exec a
   provider without an installed observer.
4. Verify native `ENOBUFS` remains authoritative when the final clock reaches
   or crosses the absolute deadline. Repeat both a deterministic clock
   collision and a real near-deadline overflow; require `ENOBUFS`, `SIGKILL`,
   empty runner stderr, no completion marker, and zero tree residue.
5. Audit the raw fd3 transcript as a state machine, including maximum size,
   fatal UTF-8, exact keys, positive ready, one terminal record, and rejection
   of absent, truncated, duplicate, reordered, malformed, or unknown records.
   Confirm an early runtime/runner exit cannot impersonate provider exit 1,
   125, or a signal.
6. Regress native runner launch `ENOENT`, `EACCES`, and `ENOEXEC` as
   `SYNC_RUNNER_UNAVAILABLE`; incompatible runtime, missing/unreadable runner
   source, and pre-handshake crash as `SYNC_RUNNER_FAILED`; and genuine
   provider `ENOENT`, exits 1/125/137/143, `SIGTERM`, and `SIGKILL` with native
   provider shapes.
7. Confirm fd3 always remains raw while only provider stdout/stderr receives
   Buffer/default, UTF-8, hex, base64, or UTF-16LE decoding. Exercise accepted
   output, provider exec failure, signal, deadline, and max-buffer outcomes.
8. Re-run the 20-millisecond and 50-millisecond process containment stresses.
   Check exact runner/provider/child identities and unrelated-process safety,
   not only process-name scans.
9. Confirm the one canonical CI job preserves both supported Node lines and
   adds complete macOS Python 3.11/3.12 gates without embedding duplicate test
   commands. The local author environment did not execute those remote jobs;
   do not convert planned remote evidence into a local claim.
10. Confirm ADR-009, architecture, Gateway/root READMEs, operator guide,
    MVP2 runbook, and the sheet match the implementation. Verify
    `gateway/src/tools/message.js`, `message.*`, `agents:events`, coordination
    Redis, policies, dependencies, migrations, and shared MCP/Redis
    configuration remain outside the correction.

## TDD and failure evidence

Before production changes, the expanded focal file reported 30 tests:
17 passed and 13 failed. The failures independently exposed all four Trial 9
blockers:

- Darwin had no non-reaping observer available without `os.waitid`.
- native `ENOBUFS` lost authority at the final absolute-deadline check;
- native launch failures and absent/malformed runner transcripts were accepted
  as ordinary results; and
- provider output encoding still transformed the private control pipe.

The first implementation used a direct Darwin kqueue observer. Race analysis
then showed that registering after fork alone left a child-exec window. The
submitted implementation adds two close-on-exec pipes: the child reports READY
after `setsid` and waits for RELEASE, while the parent registers `NOTE_EXIT`
before allowing exec. A deterministic seam verifies the successful order and
READY, deadline, registration, release, and post-release failures. It also
proves `SIGTERM` and `SIGALRM` dispositions are reset before the child restores
its inherited mask.

The first complete sealing attempt added a separate macOS job and duplicated
the focal `node --test` command. Two existing structure tests correctly
rejected that design. The correction uses one canonical matrix and the same
`scripts/ci.sh` entry point everywhere. A second sealing attempt exposed one
additional Node-runtime matrix assertion; that run was stopped once the known
structural failure was recorded. Both structure contracts were updated to
describe the stronger single-matrix behavior before the consecutive green
gates.

## GREEN evidence

- Synchronous boundary focal file: **30/30 passed**.
- Expanded lifecycle/schema/migration/service/adapter bundle: **206 total**,
  **197 passed**, nine exact live-PostgreSQL skips, zero failed.
- Eight consecutive combined lifecycle/synchronous-boundary rounds: passed.
- Strict deadline stress: **1,000/1,000** 20-millisecond expiries,
  **22.348 ms** maximum, zero runs at or above 100 ms, zero residue.
- Collision stress: **500/500** marked 50-millisecond trees,
  **52.434 ms** maximum, zero runs at or above 100 ms, zero PGID mismatch,
  zero completion markers, and zero live identities over **1,500**
  PID/PGID/start-time checks.
- Real delayed near-deadline overflow: native `ENOBUFS`, `SIGKILL`, empty
  stderr, parent and child absent, no completion marker.
- Structure suite: **222/222 passed**.
- Gateway lint, Python AST parsing, YAML parsing, CI inventory validation, and
  `git diff --check`: passed. No suite path changed, so the authoritative
  inventory required no regeneration.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- Redacted staged gitleaks scan: no leaks.

## Consecutive complete CI

From the final technical tree, two consecutive complete gates ran in a fresh
Python 3.11.15 environment with Redis, PostgreSQL, Temporal, configured runner,
and real-provider variables unset. Both exited zero with the same
authoritative result:

```text
tests=1177 passed=1165 skipped=12 failed=0
structure=222/222
gateway=804 passed, 9 allowlisted live-PostgreSQL skips
e2e=24/24
cli=29/29
langgraph=81 passed, 3 allowlisted integration skips
```

Both runs included policy validation and the disposable local `smoke.mcp`.
They did not contact shared Redis, a live database, Temporal, or a real
provider. Immediate exact runner/provider process scans were empty.

The 12 skips are the same explicitly allowlisted infrastructure contracts:
nine live PostgreSQL tests and three opt-in Gateway/Temporal integration tests.
Optional live Redis and real-provider suites remained unavailable, not passed.
The new macOS Python 3.11/3.12 matrix is committed mandatory future-push
evidence; the repository has no configured remote or local macOS executor, so
this request makes no claim that those remote jobs already ran.

## Requested reviewer output

Please review read-only and publish:

- `plan/reviews/PROJECT_V5/C_1_0-10_result.md` with an independent `OK` or
  `KO`, evidence, exact commit/tree identities, and any blocking findings; or
- the equivalent append-only result path only if the orchestrator assigns one
  explicitly.

Do not amend the technical commit or this request. A reviewer `OK` is only
authorization for the orchestrator's integration gate; it is not itself an
integration, promotion, or release.
