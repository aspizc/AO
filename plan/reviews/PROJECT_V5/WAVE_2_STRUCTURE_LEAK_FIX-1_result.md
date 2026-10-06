# Project V5 Wave 2 structure leak fix Trial 1 — independent review result

Review id: `WAVE_2_STRUCTURE_LEAK_FIX-1`

Verdict: `reviewed_OK`

This is a result-only review of the structure-suite process-leak defect. It
does not integrate or promote the candidate and does not make a Wave 2 gate
claim for a combined tree.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None |
| P1 | 0 | None |
| P2 | 0 | None |

## Candidate identity and scope

- Accepted Wave 2 base: `96091cb`.
- RED characterization: `ea24e90`.
- GREEN fixture correction: `db3008a`.
- Review handoff / reviewed HEAD: `40dea88`.
- `96091cb..40dea88` changes exactly:
  - `tests/structure/test_ci_suite_manifest.py`;
  - `tests/structure/test_h001_bootstrap.py`; and
  - `plan/reviews/PROJECT_V5/WAVE_2_STRUCTURE_LEAK_FIX-1_to_review.md`.
- The technical range is exactly 32 added lines in the supervisor
  characterization and eight added lines in the H/0/01 fixture.
- No coordination, session-port, fitness, migration, `ci/**`,
  `plan/PROJECT_V5/**`, production source, or other tracked path changed.
- The pre-existing untracked `gateway/node_modules` item was not modified or
  staged.
- `git diff --check 96091cb..40dea88` passed.

`scripts/ci_gate.py` is unchanged. Its Git blob is
`1270850d2624ef203a09ed7245df5a595f79585f` both at `96091cb` and at reviewed
HEAD; its SHA-256 is
`bd0028c29167555839e8776767f5c55b6065c6310c96dde2f6722343632ebccc`.
The exact-HEAD disposable copy used for the detector proof had the same
SHA-256.

Scope is clean for this defect.

## Identification ruling

The identification is real. I independently reproduced the claimed process
shape in an exact-HEAD disposable archive after removing only the four
fixture-local no-maintenance settings.

I ran the named H/0/01 test through the real
`_execute_command_serial` containment while recording process-only `strace`
events and the final owned `/proc` domain. The test itself passed, but the
supervisor returned `process_tree_leak`.

| Field | Independently observed value |
|---|---|
| fixture `git commit` PID | `1827264` |
| maintenance executable PID | `1827265` |
| maintenance argv | `/usr/lib/git-core/git maintenance run --auto --quiet --detach` |
| detached child cloned by maintenance | `1827266` |
| parent at containment detection | `1827118`, the supervisor/subreaper |
| process group at detection | `1827266` |
| state and comm at detection | `Z`, `git` |
| root command result | return code `0`; nested pytest `1 passed in 0.77s` |
| supervisor result | `process_tree_leak` |

The same trace tied the identities together: commit PID `1827264` cloned
`1827265`; PID `1827265` executed the maintenance argv, cloned `1827266`, and
exited; the supervisor then received `SIGCHLD` for and observed exact PID
`1827266` as its adopted zombie. This independently confirms the handoff's
diagnosis rather than merely inferring it from a green gate.

## Fix-level ruling

The fix is at the correct level. The test creates a synthetic Git repository
only to exercise bootstrap behavior; detached repository maintenance is not
part of the bootstrap contract. Supplying `gc.auto=0`,
`gc.autoDetach=false`, `maintenance.auto=false`, and
`maintenance.autoDetach=false` only to the fixture commit makes that setup
hermetic without changing production Git behavior or the gate.

I searched the remaining test and fixture Git use. The other Git-writing
structure fixture, `test_release_candidate_contract.py`, already routes every
Git command through the same four no-maintenance settings. The release
candidate implementation also uses those controls. Remaining test Git
operations are read-only or `git init` only. I found no untreated
Git-writing fixture with the same detached-maintenance hazard.

## Leak detection remains effective

This was the primary adversarial proof.

Before mutating the H/0/01 fixture, I added a disposable probe outside the
archived source tree. Its root command returned zero after deliberately
starting a TERM-resistant child in a new session and exiting without waiting.
The exact reviewed gate reported:

| Observation | Result |
|---|---|
| root return code | `0` |
| deliberate child PID | `1674172` |
| gate classification | `process_tree_leak` |
| child present after bounded gate cleanup | no |
| gate stdout / stderr | empty / empty |

Thus a successful root command cannot hide a detached descendant: the
unchanged supervisor still detects the leak, reclassifies the outcome, and
removes the process. The candidate did not weaken, bypass, or relax leak
detection.

## Characterization mutation

The committed characterization is load-bearing.

All mutations were confined to
`/tmp/fxlek-independent-review.AUb5SV/repo`; the review worktree source and
tests were not changed.

| State | Characterization result |
|---|---|
| Exact reviewed HEAD | exit `0`; `1 passed in 1.16s` |
| Only the four fixture no-maintenance settings removed | exit `1`; `1 failed in 1.13s` |

The mutated failure was the intended assertion:

```text
assert 'process_tree_leak' == 'completed'
```

This is a direct RED for the original defect, not a failure caused by the
inner test: the named inner test returned zero.

## Full gate

I ran `bash scripts/ci.sh` exactly once from reviewed HEAD with
`/tmp/agents-orchestrator-v5-wave2-integration/.venv/bin` first on `PATH`.
The command exited `1` and reported this exact aggregate:

```text
2237 tests: 2224 passed / 1 failed / 12 skipped
```

The exact relevant suite result was:

```text
test.structure: passed; 410 passed / 0 failed / 0 skipped of 410
410 passed in 43.71s
errors: []
```

Neither the machine report nor the complete gate stderr contained
`process_tree_leak`, `owned process group`, or `command left processes`.
The structure-suite gate leak is closed.

The complete per-suite accounting was:

| Suite | Status | Passed | Failed | Skipped | Tests |
|---|---|---:|---:|---:|---:|
| `lock.python` | passed | 1 | 0 | 0 | 1 |
| `release.candidate` | passed | 1 | 0 | 0 | 1 |
| `lint.python` | passed | 1 | 0 | 0 | 1 |
| `lint.gateway` | passed | 1 | 0 | 0 | 1 |
| `test.structure` | passed | 410 | 0 | 0 | 410 |
| `test.gateway` | failed | 1360 | 1 | 9 | 1370 |
| `test.e2e` | passed | 25 | 0 | 0 | 25 |
| `smoke.mcp` | passed | 1 | 0 | 0 | 1 |
| `policy.registry` | passed | 1 | 0 | 0 | 1 |
| `test.cli` | passed | 342 | 0 | 0 | 342 |
| `test.langgraph` | infrastructure unavailable | 81 | 0 | 3 | 84 |
| `test.redis-live` | infrastructure unavailable | 0 | 0 | 0 | 0 |
| `test.real-agents` | infrastructure unavailable | 0 | 0 | 0 | 0 |

The one aggregate failure is not new and is not in this candidate. It is the
unchanged Gateway test
`tests/gateway/tool_orchestration_task.test.js::orchestration lifecycle tools
update status`, whose stale immediate-cancellation assertion received
`undefined` instead of `cancelled`. That test's blob is
`f234a82e75effa2effea327b6a95a00a5582bc4a` both at `96091cb` and at reviewed
HEAD. The separate live lifecycle lane corrects that exact assertion in
`3824ba8`, which is not present in this review branch.

Accordingly, this run proves that the reviewed structure fix passes its
required suite and introduced no new gate failure. It does not prove or claim
that this uncombined branch is globally green.

## What I did and did not verify

I verified the complete candidate path set and gate-file identity; inspected
the characterization, fixture, supervisor, subreaper, and process-leak logic;
searched adjacent Git fixtures; ran the fixed characterization; mutation-
proved the characterization; independently correlated the leak zombie to
Git's detached maintenance argv; injected an unrelated deliberate detached
process and proved the detector still catches and cleans it; and ran the full
CI gate exactly once with the required virtualenv first on `PATH`.

The process-containment proofs and full gate used approved unsandboxed
execution because the managed sandbox rejected the supervisor's stream-fd
creation. I did not modify source, tests, sheets, prior review artifacts, CI
logic, or the disposable archive's gate. I did not test another Git version
or operating system, exercise opt-in live PostgreSQL, Redis, Temporal,
Gateway-integration, or real-agent services, or run a combined Wave 2 tree. I
make no integration, promotion, release, or combined-gate claim.

## Final verdict

`reviewed_OK`

The candidate fixes the reproduced fixture-owned Git maintenance leak, the
new characterization turns RED when that fixture fix is removed, and an
independent deliberately leaking process proves the unchanged gate remains
fully capable of detecting the class of failure it previously reported.
