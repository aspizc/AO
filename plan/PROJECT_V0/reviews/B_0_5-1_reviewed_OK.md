# Review B_0_5-1 — OK

**Task:** `plan/B/0/05.md`
**Trial:** 1
**Branch:** `feature/B-0-5-policy-validate-command`
**Commit:** `6a478fd` — `feat(cli): real agent-run policy validate via node validator (B/0/5)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`agent-run policy validate` is no longer a stub: it now delegates to a Node helper that reuses the B/0/4 loader. Human and `--json` modes both work; missing/broken registries fail with the right `RegistryError` code. Live CI green; 8 CLI tests pass. **This task closes Stage B.**

## Checks
- [x] Archivos a crear / modificar — `gateway/scripts/validate-registries.mjs`, `cli/src/agents_cli/main.py` (replaced stub), `tests/cli/test_policy_validate.py` (3 tests), `README.md` (validate snippet), plus a justified edit to `tests/cli/test_cli_scaffold.py` swapping the validate-stub assertion for a check-stub assertion (see Decision review).
- [x] Tests requeridos — B-T5.1 success, B-T5.2 missing-registry failure, B-T5.3 `--json` valid all present and green.
- [x] Criterios de aceptacion — every item satisfied (live probes below).
- [x] Errores comunes evitados — validation truth stays in the Node loader (Python only orchestrates the subprocess); `--json` mode emits **only** JSON (uses `json.dumps`, no Rich); `node` absence is handled with exit 2 and clear message; no extra sub-checks were added (E/0/1 / C/0/5 territory).
- [x] Definition of done — commit on `feature/B-0-5-policy-validate-command`; CHANGELOG line for B/0/5 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · MCP server name unchanged (CLI tool, not gateway).

## Findings
All-green. Live verifications on the working tree at `6a478fd`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → structure (18) + gateway (49) + CLI (8) all green; `==> All checks passed.` exit 0.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate` →
  ```
  OK policies dir: /home/carase/git/personal/agents-orchestrator/policies
  agents: 3  repos: 4  roles: 8
  ```
  exit `0` ✅.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate --json | python3 -m json.tool` → valid JSON `{"ok": true, "policiesDir": ..., "counts": {"agents": 3, "repositories": 4, "roles": 8}}` exit `0` ✅.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate --policies-dir /tmp/empty_$$` → `FAIL REGISTRY_MISSING: missing registry file: agent-capabilities.json` exit `1` ✅.
- Node helper at `gateway/scripts/validate-registries.mjs` writes only JSON to stdout in both success and failure paths — matches the spec's "stdout = JSON only" requirement.
- `git show --stat 6a478fd` → exactly the prescribed files plus the CHANGELOG entry and the test-scaffold swap.

### Decision review (non-blocking, agreed)
- **Stub-test swap:** `test_policy_validate_stub_returns_2` was removed and replaced with `test_policy_check_stub_returns_2`. That's the correct call — `policy validate` no longer returns exit 2, so the old assertion would have flipped to fail. `policy check` is still a stub (E/0/1 will make it real) and the assertion already pinned its `(E/0/1)` tag, so the replacement keeps stub coverage where coverage is still meaningful. Welcome.
- `Path | None` typing in `policies_dir` requires PEP-604 (Python 3.10+); `cli/pyproject.toml` requires `>=3.11`, so this is fine. FYI only.
- Python wrapper handles "node not on PATH" and "validator script missing" with explicit exit code 2; the tests skip (not fail) when `node` is absent — keeps the suite portable.

## Stage B status
- [x] B/0/0 Agent capabilities
- [x] B/0/1 Repository classification
- [x] B/0/2 Roles
- [x] B/0/3 Core JSON schemas
- [x] B/0/4 Registry loader
- [x] B/0/5 Registry validation command — **closed by this task**

**Stage B is fully closed.** The whole `(agent, role, repo, action)` data plane is now in place, validated, and exposed to the operator via a real CLI command. Stage C (policy engine) can now consume it.

## Next step
OK → coder advances to **Stage C** starting with **C/0/0** (`plan/C/0/00.md`). Read `plan/C/README.md` for the stage overview. New branch will follow `feature/C-0-0-*` cut from `develop`.
