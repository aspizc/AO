# C/1/00 Trial 9 — independent review request

Status: **Pending independent review**.

C/1/00 remains
`in_progress; Trials 1-8 KO; Trial 9 review pending`. This request does not
claim an `OK`, integration, promotion, or release. The reviewer must remain
independent of the author and publish any verdict in a separate append-only
result file.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 8 `KO` / Trial 9 base:
  `d204732064a4348b658c6d1fcb4ff24e11168b81`.
- Base tree:
  `1ae77232faa471563a29d4280e2c59324371f06b`.
- Trial 9 technical commit:
  `48eab7c82893f761def9041411872b317d0eb144`.
- Trial 9 technical tree:
  `99b2d540ea962352f76ffc9f6b109a823abdbc73`.
- Correction range:
  `d204732064a4348b658c6d1fcb4ff24e11168b81..48eab7c82893f761def9041411872b317d0eb144`.
- Range size: 21 files, 1,849 insertions, 160 deletions.

The technical commit is the direct child of the authoritative Trial 8 verdict.
This request is a separate request-only commit and is not part of the technical
tree under review.

## Required independent review scope

Review the implementation, tests, documentation, and failure evidence rather
than accepting the author gate summaries alone. At minimum verify:

1. Trial 8's three P1 findings are closed with real execution:
   exact environment entries including `=`, `1START`, `A-B`, `A.B`,
   `BASHOPTS`, `SHELLOPTS`, and `UID`; exact non-zero-offset `DataView` bytes;
   real `SIGTERM`/`SIGKILL` fidelity distinct from numeric exits 143/137 and
   without runner stderr noise.
2. Provider argv, effective environment, and stdin enter the fixed runner only
   through its length-prefixed stdin protocol. Its initial argv is fixed and
   its initial environment is limited to the Gateway interpreter-resolution
   `PATH`. No shell or evaluated provider text is used.
3. The Linux/WSL child-subreaper, provider `setsid`/PGID, `waitid(WNOWAIT)`,
   identity-preserving kill/reap critical section, parent-death signal, and
   runner-owned absolute timer contain the complete in-group provider tree.
4. A coincident native `SIGTERM` and absolute `SIGALRM` cannot hard-stop the
   runner before provider cleanup. The stable alarm handler must repeat
   idempotent cleanup for an old/pending alarm and permit self-kill only after
   the monotonic emergency grace.
5. Native timeout remains the existing public `TIMEOUT` contract, runner-owned
   deadline evidence maps to the same result, and native `ENOBUFS` remains
   authoritative.
6. Missing and reported-failed runner paths expose only the stable safe
   `SYNC_RUNNER_UNAVAILABLE` / `SYNC_RUNNER_FAILED` surfaces. Provider values
   must not enter runner errors, control metadata, stderr, or logs.
7. Calls without an absolute lifecycle deadline retain the direct
   compatibility path. Codex, Claude, and Gemini still share the same
   service-owned deadline and lifecycle settlement.
8. macOS deliberately retains fork/setsid/raw-exec/PGID/status fidelity
   without Linux `prctl`; native Windows remains unsupported. Confirm ADR-009
   and operator/product documentation match the real boundary.
9. `gateway/src/tools/message.js`, `message.*`, `agents:events`, coordination
   Redis namespaces, policies, dependency locks, and shared MCP/Redis
   configuration remain outside this correction.

## TDD and failure evidence

Trial 8's Bash runner was first characterized with real processes. The RED
proved that it rejected or rewrote Node-supported environment names, lost a
`DataView` byte range, and converted provider signals into numeric shell exits
with diagnostics. Those tests are retained in the submitted focal file.

A direct-provider replacement then passed focal tests but failed the
authoritative CI subreaper because cleanup happened after descendants could be
adopted externally. That candidate was discarded.

The first Python runner exposed two further real REDs:

- one native `spawnSync` timeout failed to deliver `SIGTERM`; the runner and
  provider remained blocked for 86.2 seconds until an exact manual signal
  entered the cleanup path;
- a later 500-deadline stress left four provider leaders alive after their
  runners had exited.

Independent tagged syscall tracing reproduced 11 survivors in 500
collision-prone rounds. In the representative ordering, native `SIGTERM`
arrived about 0.19 milliseconds before the absolute alarm, the runner changed
the `SIGALRM` handler, the pending alarm arrived, and the runner self-killed
without any group or direct-provider kill. A deterministic seam reproduced
that exact unsafe order before the correction.

The submitted runner now:

- carries the same absolute deadline in the private protocol and arms
  `ITIMER_REAL`;
- explicitly unblocks `SIGTERM` and `SIGALRM`;
- keeps one `SIGALRM` handler while deadline signals can collide;
- kills the provider group before arming the 100-millisecond emergency
  hard-stop;
- uses a monotonic `hard_stop_at` so an immediate pending alarm repeats cleanup
  instead of killing the runner;
- validates and installs Linux `PR_SET_PDEATHSIG(SIGTERM)`; and
- blocks both control signals across the leader identity kill/reap critical
  section.

The first full-CI attempt also found a regression-harness defect: under the CI
subreaper, a dead runner zombie could not disappear from `/proc` until the
Gateway command ended. The test now creates a nested disposable subreaper,
kills the identity-checked Node wrapper, reaps the adopted runner locally, and
then proves wrapper, runner, provider leader, and child identities absent. The
same probe under an additional outer subreaper reported no adopted child.

## GREEN evidence

- Synchronous boundary focal file: **23/23 passed**.
- Lifecycle/config/concrete-adapter package: **118/118 passed**.
- Strict local deadline stress: **1,000/1,000** 20-millisecond expiries,
  followed by a zero-process scan.
- Combined lifecycle/race stress: eight consecutive **118/118** rounds
  (**944** reported passes), followed by a zero-process scan.
- Independent collision-prone stress on the submitted runner behavior:
  **500/500** provider starts at a 50-millisecond deadline, zero PGID
  mismatches, maximum elapsed 52.533 milliseconds, zero runs at or above
  100 milliseconds, and zero live runner/provider/child identities across
  1,500 checks.
- Parent-death probe: exact Node-parent `SIGKILL`, identity checks using
  PID/PGID/start time, local subreaper reaping, and all four process identities
  absent.
- Structure suite: **222/222 passed**.
- Gateway lint, Python AST parsing, CI inventory validation, and
  `git diff --check`: passed.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- Redacted staged gitleaks scan: no leaks.

## Consecutive complete CI

From the final executable/test source state, the isolated command was run
twice consecutively with Redis variables removed:

```bash
env -u AGENTS_REDIS_URL \
  -u AGENTS_COORDINATION_REDIS_URL \
  -u AGENTS_REDIS_STREAM \
  PATH=/tmp/agents-orchestrator-v5-wave2.O6mXiN/ci-venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  bash scripts/ci.sh
```

Both runs exited zero and reported the same authoritative result:

```text
tests=1170 passed=1158 skipped=12 failed=0
structure=222/222
gateway=797 passed, 9 allowlisted live-PostgreSQL skips
e2e=24/24
cli=29/29
langgraph=81 passed, 3 allowlisted integration skips
```

Both runs included the disposable local `smoke.mcp` and policy validation.
They did not connect to shared Redis, a live database, or a real provider.
Each immediate process scan contained zero matching runner/provider processes.
Transient log hashes were:

```text
CI green 1  2cb709320fa32bcc56f0657a24f22765f446d4a57e0454f67cdff75a58da0432
CI green 2  b9503bb82de5f467e9ee877bc1b70eca5c71b6eb44bb24fddfba805e13117c45
empty scan   e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

The 12 skips are the same explicitly allowlisted infrastructure contracts:
nine live PostgreSQL tests and three opt-in Gateway/Temporal integration tests.
Optional live Redis and real-provider suites remained unavailable, not passed.

## Requested reviewer output

Please review read-only and publish either:

- `plan/reviews/PROJECT_V5/C_1_0-9_result.md` with an independent `OK` or `KO`,
  evidence, exact commit/tree identities, and any blocking findings; or
- the repository's equivalent append-only result path if the orchestrator
  assigns one explicitly.

Do not amend the technical commit or this request. A reviewer `OK` is still
only authorization for the orchestrator's integration gate; it is not itself
an integration, promotion, or release.
