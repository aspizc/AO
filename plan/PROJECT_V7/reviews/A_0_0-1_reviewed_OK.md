# V7 A/0/00 Trial 1: independent review verdict, OK (implementation)

Reviewer: separately assigned Claude Opus 5.5 at medium effort (not
downgraded), 2026-10-07. I made no production or policy edits, commits,
subagent calls or provider launches. This verdict follows the interim note
`A_0_0-1-review-notes-pending-gate.md`.

**Verdict: OK for implementation review only.** The full gate is **not
green**: exit 1, `infrastructure_unavailable`, with a required lane not
executed. This verdict does not claim integration, promotion, release or a
supported state (Rule 14).

## Candidate binding

- Base commit `b1e4fed5181431ec3c4769a078d016f0318c5b6a`, base tree
  `d5d1a3b8f94c908d506da5e819abffc4a43b76c3`.
- `A_0_0-1_candidate_manifest.json` SHA-256 is
  `1561a9175f12bdceec24bdbe4213f8c5caf2c4a875d8610b4a87ba4ad28c8a2e`. I
  re-hashed all 46 listed files: 0 missing, 0 mismatched.
- The root supplement matches `workspace/root-registration-manifest.json`:
  - `cli/src/agents_cli/main.py` is
    `6bb869b68619b7a8e9bf8d4a96e27ed3ca33437a3cf1801ea9427a35f5b134d8`
    (two additive lines registering `project_app` as `project`).
  - `ci/suites.json` is
    `f90e5dc79f610bf9af87738da828782df9e8644523fba30f4927bbf6addbbbb9`
    (only the three `inventorySha256` values changed).
- I recorded no frozen candidate commit or tree. Root must bind one when it
  integrates.

## Full gate (root-run; evidence read, not re-run)

The marker is `workspace/root-v7-a00-gate-finished.json`, which archives
`A_0_0-1-root-full-gate.txt.gz` (log SHA-256 `2f1c0a36…6d1dd8`).

- **Totals:** 2743 tests: **2731 passed, 0 failed, 12 skipped**. Exit code 1,
  status `infrastructure_unavailable`, `errors: []`.
- **Lanes that did not pass:**
  - `test.gateway` (required): 1636 passed and 9 skipped. All 9 skips are live
    Postgres contract tests, reported as infrastructure unavailable.
  - `test.langgraph` (required): 165 passed and 3 skipped. Two skips are
    gateway-integration smokes and one is the Temporal crash-recovery test.
  - `test.redis-live` (required): **not executed (0 tests). This is not a
    pass.**
  - `test.real-agents` (optional-service): not executed.
- **Inventory:** the new test files fall under `test.cli`
  (`tests/cli/test_project_command.py`), `test.langgraph`
  (`orchestrator-langgraph/tests/test_project_profile.py`) and `test.gateway`
  (`tests/gateway/project_preflight.test.js`). `scripts/ci_gate.py` enforces
  `inventorySha256`, and the gate reported no inventory errors, so the
  refreshed hashes match the emitted selection.
  - **Limit:** the gate log does not name the files, so I inferred this from
    the gate's hash enforcement rather than reading it in the output.
  - **Limit:** the gate did not report the 12 skips against a skip budget, and
    `ci/suites-contract.json` was not changed.
- The first gate attempt was cancelled (exit 143, tmux path problem). It is not
  counted.

## Independent focused tests (run by this reviewer)

- `pytest orchestrator-langgraph/tests/test_project_profile.py tests/cli/test_project_command.py`
  (venv Python, `PYTHONPATH=cli/src:orchestrator-langgraph/src`):
  **28 passed**, 0 failed or skipped.
- `node --test tests/gateway/project_preflight.test.js tests/gateway/request_context.test.js tests/gateway/request_context_boundary.test.js`:
  **25 passed**, 0 failed or skipped.
- Running `project --help` through the production `agents_cli.main.app` exits 0
  and lists `validate` and `preflight`, so the root registration works.

## Adversarial checks

I copied the python-cli example into the scratchpad, filled in the real root
and called `load_project_profile`:

| Case | Result |
|---|---|
| Baseline example | accepted |
| Write leaf is a symlink pointing outside the root | `PROFILE_PATH_DENIED` |
| Absent leaf under a symlinked parent pointing outside | `PROFILE_PATH_DENIED` |
| Dangling symlink as write leaf | `PROFILE_PATH_DENIED` |
| Absent leaf with an absent parent | `PROFILE_PATH_DENIED` (stricter than the sheet requires) |
| NUL in write path | `PROFILE_INVALID` |
| `"."` as write path, runtime root inside the project root | `PROFILE_PATH_DENIED` (runtime overlap) |
| `"."` as write path, runtime root outside | **accepted**: the write scope is the whole project root |
| A directory (`src`) as write path | accepted |

Interim item 7 is resolved as **not a defect**. Sheet A/0/00 only requires
write paths to stay inside the task cwd, project root and allowed roots, and
outside the runtime/control paths. It does not forbid directory or root-wide
write scopes. Every escape attempt was rejected.

## Source review summary

- `_read`: `O_NOFOLLOW`, regular files only, reads bounded at limit+1, strict
  UTF-8, rejects duplicate keys.
- `_relative`: rejects absolute paths, `..`, backslashes and control
  characters; resolves strictly; enforces containment in the root, allowed
  roots and task cwd.
- The CLI calls the Node helper with an argv list and no shell, a 10 s timeout,
  stderr discarded, stdout capped at 16 KiB, and checks the response's key set,
  status and selection count.
- The helper only checks whether provider binaries exist (`accessSync` and
  `statSync`) and never runs them. It reuses the canonical
  registry/policy/selection code.
- `request_context.js`: the new export `resolveRegisteredRepositoryCwd` only
  composes existing functions. It creates no context, trace or session, and
  existing exports are unchanged. The request_context Node tests pass.

## Findings that remain (none block the implementation)

1. **Low:** the helper's stdout goes to an unbounded temp file before the
   16 KiB read. Memory is bounded; disk use is bounded only by the 10 s
   timeout.
2. **Note:** `"."` and directory write paths give a task a broad write scope.
   That is allowed as specified, but operators should know about it.
3. **Integration risk:** A05 edits `gateway/src/core/request_context.js` in
   another worktree. Root must merge the two one at a time and re-run the Node
   request_context and project_preflight suites afterwards.

## Limits

- The required `test.redis-live` lane was not executed, and the required Postgres
  and Temporal tests were skipped as infrastructure unavailable. This is **not a
  green gate**. No supported or release claim is allowed until those lanes run
  on a bound candidate tree.
- I did not re-run the full gate; its numbers are root's. I did not exercise
  real providers, credential login, Doctor isolation or OS containment.
- Preflight on remote filesystems and non-Linux hosts was not tested.
