# Review Result — D/0/07c Live-Gate Harness (Trial 1)

Verdict: **reviewed_OK**

## Reviewer identity

- Independent reviewer; did not implement the candidate.
- Orchestration trace: `tr-d007c-live-gate-5dfea75d-bda9-439a-8513-a8c98598de5e`
- Reviewer task: `ts-cbc8d38f-e464-4588-94f9-b0f465bc44db`
- Canonical Gateway spawn failed with TOOL_ERROR; this review ran in the
  documented profile fallback: a supervised direct Claude Code session
  (session `8f1fc2c7-e1ac-4305-bdea-67e9331ffc34`, model `claude-fable-5`),
  cwd `workspace/clones/wt-d007c-live-gate-harness`.

## Reviewed state

- Integrated base: commit `7127583a13d8dd28dc6dec359e0d15ab328cf8a5`,
  tree `b0e9533693bd6c6b6b078f6120978c90e83ea18a`.
- Technical candidate: commit `3e807f216d5dd2004c5b5165bf1ea9dcd941551e`,
  tree `64481fc53f2809779b3db3b7ab37c5f0d3892b7a`, parent `7127583a`.
- Handoff HEAD: commit `6341618659d0dc283d00e3332f1892f89fb0b1bf`,
  tree `6db8f4af66c0e0bab1c1f3ed9c2672789acab943` (docs only:
  `plan/reviews/PROJECT_V5/D_0_7C_GATE_HARNESS-1_to_review.md` +
  index row).
- Exact technical pathset (verified with `git diff --stat 7127583..3e807f2`;
  nothing else changed):
  - `tests/gateway/process_supervisor_caller_fixture.js`
  - `tests/gateway/process_supervisor_caller_harness.py`
  - `tests/gateway/process_supervisor_live.test.js`

## Restricted-path identity (verified at 7127583, 3e807f2, 6341618, worktree)

- `scripts/ci_gate.py` SHA-256
  `bd0028c29167555839e8776767f5c55b6065c6310c96dde2f6722343632ebccc` at all
  four states — byte-identical; the outer gate still classifies every
  adopted child, including an exited zombie, as `process_tree_leak`
  (`_find_known_trees` adoption discovery + `process_tree_leak` statuses,
  `scripts/ci_gate.py:1150`, `:1745`, `:2191`).
- `gateway/src` aggregate
  (`git ls-files -z gateway/src | sort -z | xargs -0 sha256sum | sha256sum`)
  `a1eba71cc61977065b10d37cf1acd9b0c2467a19cb3f5b93300c5c263f76bfed`;
  additionally `git ls-tree -r <commit> gateway/src` listings are identical
  across base → handoff HEAD. No product-code change can mask a defect.
- No path under `policies/`, `ci/`, `plan/` (beyond the handoff docs), no
  manifest/lockfile change. Pre-existing untracked `gateway/node_modules`
  symlink untouched.

## Oracle inspection (falsification attempt)

Read the full harness and fixture/test diffs. Confirmed:

- Signal authority: exact positive supervisor PID only.
  `require_live_identity` rejects pid ≤ 1 and validates PID + startToken
  (`/proc` starttime) + PGID + SID against live `/proc`; the supervisor
  identity is revalidated immediately before the single
  `os.kill(supervisor["pid"], SIGKILL)`
  (`process_supervisor_caller_harness.py:240-248`).
- Adoption oracle: in `supervisor-loss`, any adopted direct child other
  than the exact retained reaper raises — including S, utility/leader,
  escaped descendant (matched by role, "became an adopted direct child"),
  and unknown PIDs — even if it would exit later (lines 267-294). Reaper
  identity drift also raises.
- Wait authority: `waitpid(<exact pid>, WNOHANG)` only, on the retained
  reaper (line 301), owned identities (line 150), and the sentinel
  (line 392); `caller.wait()` reaps the exact spawned caller. No `os.wait()`,
  no negative PID, no `killpg`/process-group, no shell, no tmux, no
  repository/proc-wide scan anywhere in the pathset (grep-verified).
- GREEN requires all of: completion `PROCESS_SUPERVISOR_LOST`, recorded
  adoption exactly `[reaper]`, reaper exit code 0, all five retained
  identities absent, caller exited 0 and reaped, no trailing
  stdout/stderr, direct children exactly `[sentinel]`, sentinel identity
  preserved. The Node test additionally asserts every owned identity and
  the sentinel absent from `/proc` afterwards.
- Deadlines: one monotonic `post_sigkill_deadline` set once before SIGKILL
  (4.0 s = 0.08 grace + 2.0 product horizon + 1.92 slack) shared,
  non-resetting, by the completion read and the adoption/reap loop;
  readiness 4 s; caller exit 2 s; outer `execFile` timeout 12 s. All finite
  and sufficient (observed runs ≈ 3.5 s inner, 8 s for 12 tests).
- Error paths: on any oracle failure the harness kills only the
  identity-revalidated exact caller and exits 2, leaving unproven
  processes unreaped for the unchanged outer gate to reject (fail-closed —
  demonstrated by mutation 2 below). The narrowed abrupt-caller path
  (`reap_exact_owned_children`) raises on any unexpected adopted child, so
  it cannot mask a product cleanup defect either.
- Output hygiene: emitted JSON contains only PIDs/identity tokens, bounds,
  and outcome codes; env scrubbed to `LANG`/`PATH`. No provider, prompt,
  snapshot, source, or credential content escapes.

## Independent verification (all from the exact restored candidate)

| Check | Outcome |
|---|---|
| Named supervisor-loss test through real `scripts.ci_gate._execute_command` | 3/3 consecutive outer `completed`, rc 0 |
| Post-mutation restored rerun through the real outer gate | `completed`, rc 0 |
| Full `tests/gateway/process_supervisor_live.test.js` | 12/12 pass |
| 8 focused outer-gate containment tests (`tests/structure/test_ci_suite_manifest.py -k` timeout-tree, late-detached, fresh-supervisor ownership, cleanup-proof completeness+ordering, entry-subreaper restore, opaque-stat adopted-descendant, h001 detached-maintenance) | 8/8 pass |
| Gateway `npm run lint` (includes ESLint) | pass |
| Ruff on changed harness + `python -m compileall` | pass |
| `git diff --check 7127583..6341618` | pass |

## Mutation evidence (disposable in-place edits, restored with proof)

| Mutation | Outer-gate result |
|---|---|
| Remove `activate_subreaper()` call in `main` | `process_tree_leak`, rc 1 |
| Replace exact `os.waitpid(reaper["pid"], WNOHANG)` with a no-op | `process_tree_leak`, rc 1 |

Both required REDs reproduced independently. Restoration proven:
`sha256sum tests/gateway/process_supervisor_caller_harness.py` =
`773868229a18311da11c19fe6dae2e3982e9cdfee0cf0c0d68cb33c0e21bb993`
before and after; `git diff 6341618` empty; `git status` shows only the
pre-existing `gateway/node_modules` symlink.

## Residual-process checks

`ps` filtered for the probe fixtures after every run: no residual caller,
fixture, supervisor, reaper, or sentinel processes. No signal was ever sent
outside probe-created children; protected PIDs `1019690`/`1020609` never
targeted.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3 (observations, no action required for this verdict):
  1. The two changed JS test files sit outside the gateway ESLint base
     path and are reported as ignored when linted file-by-file; the
     repository `npm run lint` lane passes and Node fully parses both
     files in the 12/12 run, so coverage is adequate but the "explicit
     changed-JavaScript ESLint" claim in the handoff is only satisfiable
     via the lane, not per-file.
  2. `POST_SIGKILL_BOUND_SECONDS` gives 2× headroom over the product
     2 s cleanup horizon; adequate today, worth revisiting if the horizon
     grows.

## Limitations

- Gateway spawn unavailable (TOOL_ERROR); review ran in the documented
  supervised direct-session fallback.
- Full repository CI intentionally not run — the orchestrator owns the
  authoritative outer gate after integration.
- Mutations were applied to the working copy with exact inverse
  restoration (hash-proven) rather than a separate clone.

## Verdict

**reviewed_OK.** The correction is confined to the three test-harness
paths; the authoritative outer gate and product runtime are byte-identical;
the private-subreaper oracle is strict, exact-identity-bounded, finite,
and fail-closed, and both load-bearing mutations flip the CI-contained
probe RED with `process_tree_leak`. This OK authorizes integration of the
supplemental harness correction into the Wave 2 candidate only; it claims
no promotion, release, publication, or global full-gate success.
