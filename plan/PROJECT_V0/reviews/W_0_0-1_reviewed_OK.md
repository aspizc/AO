# Review W_0_0-1 — OK

**Task:** plan/W/0/00.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 2295d54 — feat(codex): implement headless delegate execution (W/0/0)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
`CodexAdapter.delegate` now performs real headless execution via `codex exec`
with the policy-resolved model/effort and the `workspace-write` sandbox, while
every guard (registry enable, policy preflight, cwd allowlist) runs **before**
the process. Codex stays disabled by default. All acceptance criteria met; full
CI green and stable. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/codex_adapter.js` (real `delegate`, `buildCodexExecArgs`), `gateway/src/config.js` (`codexBin`/`codexSandbox`), `tests/gateway/codex_adapter.test.js`, `config_paths.test.js`, `docs/adapters/codex.md`, `README.md`, CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/gateway/codex_adapter.test.js` → 10/10; `./scripts/ci.sh` → all green, 340 gateway / 16 E2E / smoke OK, stable). All required cases present: disabled error, dry-run reports model/effort/sandbox/cwd, real invokes fake `codex exec` with flags, cwd-outside-allowlist denied before process, restricted denied before process, disallowed model denied before process.
- [x] Criterios de aceptacion — real `delegate` builds `codex exec -m <model> -c model_reasoning_effort="<effort>" -s workspace-write -C <cwd> <prompt>`; Codex stays `enabled: false` and is denied on `restricted`; model/effort resolved from policy (registry default `gpt-5`/`medium`); cwd allowlist enforced; fake-binary tests green.
- [x] Errores comunes evitados — Codex not enabled by default; not allowed on restricted; sandbox is `workspace-write` (not `danger-full-access`/bypass); CI uses a fake binary, never real `codex`; resolved model passed (no fallthrough to CLI default).
- [x] Definition of done — commit on branch, conventional message references W/0/0, CHANGELOG line, codex adapter docs + README env vars updated. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; no `orchestrator/` dir; no restricted paths; guards (enable/policy/cwd) all precede `spawnSync`; errors via `auditAdapterError` (no stack leak).

## Findings
Solid real-execution path. Order is correct: `checkEnabled()` → `preflight` (policy incl. model/effort, which denies restricted and disallowed models before any process) → `assertSafeCwd` → `SESSION_STARTED` → spawn → `SESSION_CLOSED`. `effectiveModel`/`effectiveReasoningEffort` take the policy-resolved values, so the registry default (`gpt-5`/`medium`) flows through.

Notes (non-blocking):
- The `-c model_reasoning_effort="${effort}"` arg is built verbatim per the spec, with literal quotes inside a single argv element (no shell). This is exactly the spec's format; as the spec/to_review state, the real `codex exec` invocation still needs **operator validation** outside CI (the codex binary isn't exercised in CI). Flagged, not blocking.
- `plan/W/` specs (incl. this task's `plan/W/0/00.md`) carry uncommitted working-tree edits — the coder's ongoing WIP for W/0/1–W/0/2. Reviewed against the working-tree spec; left untouched per operator decision.

## Next step
- OK → coder advances to W/0/1 (Codex supervised spawn/ask/view/kill) and W/0/2 (enable Codex). Operator: validate the real `codex exec` argv against the installed codex CLI before enabling.
