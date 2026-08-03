# Review W_0_2-1 — OK

**Task:** plan/W/0/02.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 5c8d574 — feat(policies): add MVP2 codex enable profile (W/0/2)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
A complete alternate policies profile `policies/profiles/mvp2/` enables Codex
(`unrestricted`/`internal` only) via `AGENTS_POLICIES_DIR`, while the base
registry keeps Codex disabled. Restricted repos stay denied under the profile.
All acceptance criteria met; both policy dirs validate; full CI green. Verdict:
**OK**. Closes Stage W.

## Checks
- [x] Archivos a crear / modificar — `policies/profiles/mvp2/{agent-capabilities,repositories,roles,sanitization-rules}.json` (complete set), `tests/gateway/codex_enable_profile.test.js`, `docs/adapters/codex.md` (profile activation), CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/gateway/codex_enable_profile.test.js` → 4/4; `agent-run policy validate` → OK for **both** `policies` and `policies/profiles/mvp2`; `./scripts/ci.sh` → all green, 350 gateway / 16 E2E / smoke OK). Cases: base disabled, profile enables unrestricted, profile still denies restricted, default `gpt-5`/`medium`.
- [x] Criterios de aceptacion — MVP2 profile enables Codex only for `["unrestricted","internal"]`; base keeps `codex.enabled=false`; restricted denied with profile active; `policy validate` passes for base and profile; tests green.
- [x] Errores comunes evitados — base not flipped to enabled; restricted not opened to Codex in the profile; profile registries are **complete and coherent** (repositories/roles/sanitization byte-identical to base; agent-capabilities differs only in `codex.enabled` + notes).
- [x] Definition of done — commit on branch, conventional message references W/0/2, CHANGELOG line, codex docs document profile activation. PR draft deferred (project no-push pattern). **Closes Stage W.**
- [x] Global invariants — English; no push; no `orchestrator/` dir; no restricted paths; safe default preserved (Codex off unless operator opts in).

## Findings
Clean, minimal, and safe. The complete-alternate-directory approach (via `AGENTS_POLICIES_DIR`) is one of the two options the spec explicitly allowed; the coder chose it to keep registry validation deterministic and recorded the rationale. Verified independently:
- `policies/agent-capabilities.json` diff base↔profile is **only** `codex.enabled false→true` and its `notes` — nothing else changed.
- `repositories.json`/`roles.json`/`sanitization-rules.json` are identical to base, so no incoherence.
- Restricted denial does not depend on the profile (Codex `allowedClassifications` excludes restricted in both), and the test confirms it under the active profile.

Security posture for enabling real code execution is sound: off by default, explicit operator opt-in, restricted always denied, `workspace-write` sandbox + cwd allowlist from W/0/0–W/0/1. The W README now also records the operator-validated real `codex`/`codex exec` commands (codex-cli 0.133.0), closing the earlier operator-validation flag.

`plan/W/` specs still carry uncommitted working-tree edits — left untouched per operator decision.

## Next step
- OK → Stage W complete: Codex is a real coder (headless + supervised), disabled by default, enableable via the MVP2 operator profile, never on restricted. Per the MVP2.0 roadmap, Stage X (generic launcher/profile) and Stage Y (real E2E + gate) are next.
