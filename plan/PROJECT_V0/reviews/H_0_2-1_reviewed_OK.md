# Review H_0_2-1 — OK

**Task:** `plan/H/0/02.md`
**Trial:** 1
**Branch:** `feature/H-0-2-base-adapter-cwd-guard`
**Commit:** `aee40e5` — `feat(adapters): add base adapter cwd guard (H/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`assertSafeCwd` (TM-04 cwd guard) and the `BaseAdapter` contract landed. The guard is **robust against every adversarial vector I threw at it** — symlink escape, `..` traversal, sibling-prefix (`repo-evil` vs `repo`), empty/unreachable roots — all default-deny via `realpath` + separator-anchored prefix match. 228 total gateway tests pass. Task H/0/2 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/base_adapter.js`, `tests/gateway/base_adapter.test.js` (8 tests).
- [x] Tests requeridos — cwd outside fails, symlink escape rejected, BaseAdapter not-implemented, empty allowlist rejects; plus bonuses (sibling-prefix, dotdot, null roots, missing cwd path). All green.
- [x] Criterios de aceptacion — every item satisfied (live adversarial probe below).
- [x] Errores comunes evitados — `realpath` **before** comparison (symlinks/`..` resolved); `startsWith(root + path.sep)` (not bare prefix → `/repo/foo` ≠ `/repo/foo-evil`); **default-deny** when allowlist empty/null/unreachable.
- [x] Definition of done — commit on `feature/H-0-2-base-adapter-cwd-guard`; CHANGELOG line for H/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · ADR-003 (guard before spawn): the guard is the gate adapters call before any spawn — contract in place.

## Findings
All-green. Live verifications on the working tree at `aee40e5`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 228 # pass 228 # fail 0`; `==> All checks passed.` exit 0.
- **Adversarial cwd-guard probe** (independent of the committed tests):

  | scenario | result |
  |---|---|
  | cwd inside root | PASS (returns realpath) |
  | cwd outside root | BLOCKED `CwdViolation` |
  | symlink inside → points outside | BLOCKED `CwdViolation` |
  | `root/../<sibling>` (dotdot escape) | BLOCKED `CwdViolation` |
  | `repo-evil` vs allowed `repo` (prefix attack) | BLOCKED `CwdViolation` |
  | empty allowlist | BLOCKED `CwdViolation` |
  | unreachable allowed root | BLOCKED `CwdViolation` |

  Every TM-04 vector is closed; the only PASS is a genuine in-root path.
- `realpathOrViolation` fails closed for both an unreachable `cwd` **and** an unreachable allowed root (the spec sample would have let a bad root throw a raw error; the coder wraps both into `CwdViolation` with details — better).
- `BaseAdapter.{delegate,spawn,ask,view,kill}` all reject with `adapter <id> must implement <m>` — verified by `assert.rejects`.
- `git show --stat aee40e5` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- Unreachable allowed roots fail closed (don't silently drop) — important: a misconfigured root can't widen the allowlist by being skipped. Coder flagged this. Strong choice.
- `BaseAdapter` is a pure contract (every method throws until overridden). Correct for H/0/2; the real adapters (I/O/P stages) implement them. The guard `assertSafeCwd` is a standalone export those adapters must call before spawning (ADR-003).

## Stage H status
- [x] H/0/0 Port tmux client
- [x] H/0/1 Session naming helpers
- [x] H/0/2 Base adapter + cwd guard — **closed by this task**
- [ ] H/0/3 pending (last task of Stage H)

The two filesystem-boundary threats are now both closed with verified guards: TM-03 (artifact store path-traversal, L/0/0) and TM-04 (adapter cwd escape, this task).

## Next step
OK → coder advances to **H/0/3** (`plan/H/0/03.md`), the last task of Stage H. New branch `feature/H-0-3-*` cut from `develop`. **Reminder for the I/O/P adapters that subclass `BaseAdapter`:** every `spawn`/`delegate` implementation must call `assertSafeCwd(cwd, config.repoRoots)` AND `policy_engine.evaluate(...)` before launching a subprocess (ADR-003) — the guard exists now, but it only protects if the adapters actually invoke it.
