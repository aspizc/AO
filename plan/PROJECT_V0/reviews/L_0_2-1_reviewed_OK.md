# Review L_0_2-1 — OK

**Task:** `plan/L/0/02.md`
**Trial:** 1
**Branch:** `feature/L-0-2-artifact-get-policy`
**Commit:** `82e7330` — `feat(artifacts): enforce artifact get policy (L/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`artifact.get` is now policy-gated: requester identity is required, the C policy engine decides, `POLICY_DECIDED` is audited, and any non-`allow` (including `allow_with_sanitization`) returns no content until M/0/2 adds the sanitized fallback. Live decision matrix confirms TM-01/TM-02 boundaries hold. 179 total gateway tests pass. **This task closes Stage L.** One non-blocking note on a redundant `roles.json` edit.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/tools/artifact.js` (policy-gated get), `gateway/src/tools/index.js` (registries injected), `tests/gateway/artifact_get_policy.test.js` (3 tests), `policies/roles.json` (+1 line — see note), tool-artifact tests updated for requester identity.
- [x] Tests requeridos — orchestrator denied raw restricted, gemini restricted-coder allowed, non-raw internal allowed. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — requester identity **required** (schema `z.string()`, missing → `INVALID_INPUT`, not a default `unknown`); deny returns no content; `allow_with_sanitization` returns no content (TODO comment marks the M/0/2 fallback); `POLICY_DECIDED` audited.
- [x] Definition of done — commit on `feature/L-0-2-artifact-get-policy`; CHANGELOG line for L/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `82e7330`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 179 # pass 179 # fail 0`; `==> All checks passed.` exit 0.
- **`artifact.get` policy matrix** against a stored `raw_diff` / `restricted` artifact (content `"SECRET"`):
  - `claude-code` / `orchestrator` → **DENIED** (`deny`), content withheld ✅ (TM-01: orchestrator can't read raw restricted)
  - `gemini-cli` / `restricted-coder` → **ALLOW**, content `"SECRET"` returned ✅ (the agent permitted raw restricted)
  - `claude-code` / `reviewer` → **DENIED** (`allow_with_sanitization` treated as deny pre-M), content withheld ✅
  - missing requester identity → `INVALID_INPUT` ✅ (default-deny via schema, never a silent `unknown`)
- `POLICY_DECIDED` audit event written per found-artifact get (with `context`, `decision`, `ruleId`).
- `git show --stat 82e7330` → the tool change + registry injection + the registry edit + 3 tests + tool-artifact test updates + CHANGELOG.

### Non-blocking note — the `roles.json` edit is redundant (not harmful)
The commit adds `"artifact.get.raw_restricted"` to `restricted-coder.allowActions`. The coder's stated reason ("so the Gemini restricted-coder raw restricted allow case is expressible") is **not actually required**: the C/0/4 `roleHasRawRestrictedAccess` helper already returns `true` for `restricted-coder` because it possesses `code.read.raw_restricted` (and `artifact.put.raw_restricted`). I verified live that `gemini-cli`/`restricted-coder` → `ALLOW` — which would have held without the edit.

Why it's still **OK (not KO)**:
- It changes no decision outcome (allowActions isn't used for denial; `roleHasRawRestrictedAccess` was already satisfied), so no security regression and no behavior change.
- No test asserts the exact `restricted-coder.allowActions` list, so nothing breaks (CI green confirms).
- It is semantically coherent: a role that may `code.read.raw_restricted` and `artifact.put.raw_restricted` reasonably may also `artifact.get.raw_restricted`.

**Action for the coder (informational, no re-trial needed):** the addition was unnecessary — the existing `code.read.raw_restricted` already drives the allow. Keep this in mind so future tasks don't add registry permissions to "fix" cases that already pass. If you prefer a minimal registry, the line could be reverted without effect; leaving it is also fine.

## Stage L status — CLOSED
- [x] L/0/0 Filesystem artifact store
- [x] L/0/1 Artifact MCP tools
- [x] L/0/2 `artifact.get` policy — **closed by this task**

Artifact-mediated communication is now policy-gated end-to-end: store (path-safe), MCP tools (no path leak), and policy-checked reads (raw-restricted denied to the wrong roles, sanitization contract recognized but withheld until M).

## Next step
OK → per `plan/README.md` MVP order, the `F + J + L` block is complete. Next is **M + N** (sanitization + visibility matrix). Coder advances to **M/0/0** (`plan/M/0/00.md`). New branch `feature/M-0-0-*` cut from `develop`.

> Operator — **now is the moment** to resolve `C_0_4-1_to_check_by_human.md` (orchestrator-sanitization data-driven field): Stage M builds the sanitizer and M/0/2 wires the `allow_with_sanitization` fallback that L/0/2 currently stubs as deny. The orchestrator-vs-reviewer distinction (currently a hardcoded role name) becomes load-bearing here.
