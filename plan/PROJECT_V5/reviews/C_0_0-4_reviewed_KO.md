# Independent Review — Project V5 C/0/00 Fail-Closed Finalization (Trial 4)

## Verdict

**KO.** The scoped candidate
`4e6f4a5755cfe016e9a1b7c2bf249603a5975760..7029a108fb089498f52e72a758304b52b0b79c08`
still has two independent P0 fail-open intervals. One can publish a suite
result while a known owned runner, descendant, and PGID are alive. The other
can publish `passed` with exit 0 for SIGINT or SIGTERM delivered after the
final payload render but before the low-level output commit.

The review submission at
`35e9c82d6fa556e27f207afc335a94a802c99175` was used only to establish the
requested candidate, acceptance boundary, and verification scope. No prior
verdict was relied on.

## Blocking findings

### P0 — Combined cleanup faults can return a result with the owned process group alive

[`_safe_process_group_exists`](../../../scripts/ci_gate.py#L886) treats the
group as absent when the PGID probe raises and the group-member inventory also
fails. The independent descendant snapshot and the previously known exact
member set are not part of that absence decision. Later,
[`_run_suite`](../../../scripts/ci_gate.py#L1172) catches the resulting
`ProcessCleanupError` as an ordinary execution `OSError` and returns a failed
suite result.

An independent real-process injection combined all of these persistent faults:

- `Popen.communicate()`;
- PGID existence probe;
- PGID signalling;
- exact group-member inventory;
- direct `Popen.kill()`; and
- direct `Popen.wait()`.

The real runner and descendant shared PGID `3016772`, ignored SIGTERM, and
remained observable at the instant `_run_suite()` returned:

```text
resultStatus: failed
resultError: direct child 3016772 could not be reaped
runner PID 3016772 running at result: true
descendant PID 3016773 running at result: true
PGID 3016772 exists at result: true
```

Thus the `ProcessCleanupError` did not fail closed: it became the result whose
publication cleanup was supposed to prevent. After recording the observation,
the reviewer killed only PGID `3016772`, reaped the direct runner, and confirmed
that both exact PIDs and the PGID were absent.

Required correction:

- uncertainty from a failed probe or inventory must never mean absence;
- every previously observed exact PID plus the PGID must participate in the
  final absence proof, independently of the helper which failed;
- a cleanup error must not be converted into any final suite/gate result while
  an owned PID or PGID is known or cannot be proven absent; and
- add a persistent combined-fault regression using a real TERM-resistant
  runner and descendant, asserting exact PID and PGID absence before the result
  is obtainable.

### P0 — A pre-commit signal after final rendering is consumed only after a false pass is written

[`_emit_final_output`](../../../scripts/ci_gate.py#L1475) renders twice and then
calls `_write_all()`. A signal arriving after the second render returns but
before `_write_all()` starts remains pending. The only subsequent signal drain
is after output publication, and it does not recalculate either the payload or
the exit status.

The reviewer injected each signal immediately after the second
`_render_final_payload()` returned and before `_write_all()` was entered:

| Signal | Records | JSON status | JSON signal | Exit | Traceback |
|---|---:|---|---|---:|---:|
| SIGINT | 1 | `passed` | absent | 0 | 0 |
| SIGTERM | 1 | `passed` | absent | 0 | 0 |

Both injections were before the low-level commit and before any report byte was
written. A second probe delivered each signal before the first real
`os.write()` byte with the same false-pass result. Handlers and the signal mask
were restored, but the cancellation itself was erased from the observable
contract.

Required correction:

- establish and document one honest low-level commit boundary;
- make every SIGINT/SIGTERM pending before that boundary select the cancelled
  payload and 130/143 exit status; and
- add regressions at the gap after the final render and immediately before the
  first low-level write. A post-commit limitation may be documented, but the
  current failing injections are pre-commit.

## Adversarial evidence that passed

An independent SIGINT/SIGTERM matrix covered all four handler transitions
(both initial installations and both restorations), JSON serialization, the
zero-byte buffered `write`, and the buffered `flush`: all 14 cases emitted
exactly one parseable `cancelled` JSON record, returned 130/143, produced no
traceback, and restored the entry handlers and mask.

A separate in-process probe installed distinct custom SIGINT/SIGTERM handler
objects and an entry mask containing both SIGINT and SIGUSR1. `main()` restored
the exact handler identities and the complete nontrivial mask. The focused
real-pytest final-flush regression also left no `agents-ci-junit-*` residue.

The individual cleanup-fault cases in the focused suite pass. They do not cover
the combined fail-open sequence above.

## Verification

- `.venv/bin/python -m pytest -q tests/structure/test_ci_suite_manifest.py` —
  **45 passed in 8.40s**.
- `.venv/bin/python -m pytest -q tests/structure` —
  **190 passed in 8.51s**.
- `.venv/bin/ruff check scripts/ci_gate.py tests/structure/test_ci_suite_manifest.py`
  — passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py tests/structure/test_ci_suite_manifest.py`
  with `PYTHONPYCACHEPREFIX` inside the private review `TMPDIR` — passed.
- `.venv/bin/python scripts/ci_gate.py --validate-only` — one `passed` JSON,
  exit 0.
- `git diff --check
  4e6f4a5755cfe016e9a1b7c2bf249603a5975760..7029a108fb089498f52e72a758304b52b0b79c08`
  — passed.
- Exact post-probe checks — runner PID, descendant PID, PGID, and JUnit residue
  all absent after the reviewer's precise cleanup.

Every command removed `AGENTS_REDIS_URL`,
`AGENTS_COORDINATION_REDIS_URL`, `AGENTS_TEST_REDIS_URL`, and
`AGENTS_E2E_REAL` from the environment and used the reviewer's private
`TMPDIR` under `/var/tmp`. No Redis, MCP, network, container, tmux, or shared
service was used or restarted.

## Append-only artifact verification

Trials 1–3 remain byte-identical between the Trial 3 verdict tree and the Trial
4 submission tree:

| Artifact | Identical blob |
|---|---|
| `C_0_0-1_to_review.md` | `8fdbe459268406e984c352be82fa1ce6f9b79c15` |
| `C_0_0-1_reviewed_KO.md` | `abb39e496c703f810d1a08eb9582e3362270eae8` |
| `C_0_0-2_to_review.md` | `cfe9d9898ab078be48e95c85a6bbc2fa3fd2f324` |
| `C_0_0-2_reviewed_KO.md` | `7cc5823f038cf7706c7ab87ebab75ee8ce5a3f40` |
| `C_0_0-3_to_review.md` | `2601a27c44a7c8d0ba32fae0ddd87408f966fe93` |
| `C_0_0-3_reviewed_KO.md` | `dd8b8c2d3a07b38f215b0a0bf3363357dd5902e8` |

Trial 4 must remain `in_progress`. Do not promote C/0/00 from this candidate.
