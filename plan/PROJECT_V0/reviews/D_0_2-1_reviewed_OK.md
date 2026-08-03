# Review D_0_2-1 — OK

**Task:** `plan/D/0/02.md`
**Trial:** 1
**Branch:** `feature/D-0-2-runtime-path-config`
**Commit:** `beae88b` — `feat(config): add runtime path settings (D/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`config.js` extended with `artifactStoreRoot`, `approvalMaxWaitMs`, and `repoRoots`. Relative paths resolve under `AGENTS_WORKSPACE`, absolutes are preserved, defaults stay local to `<repo>/workspace`. README documents all 9 env vars. 7 config tests + 123 total gateway tests pass. Task D/0/2 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/config.js` (+3 fields, +`parseInteger`), `tests/gateway/config_paths.test.js` (7 tests), `README.md` (+Environment Variables section).
- [x] Tests requeridos — relative-under-workspace, absolute-preserved, local-defaults, approval-default-60s, dry-run; plus bonuses (policies-dir resolution, repo-roots colon split). All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — defaults resolve inside `<repo>/workspace` (Gateway doesn't write outside workspace by default); absolute env vars respected; `approvalMaxWaitMs`/`dryRun` correct; README documents each env var.
- [x] Definition of done — commit on `feature/D-0-2-runtime-path-config`; CHANGELOG line for D/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `beae88b`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 123 # pass 123 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0.
- `grep -c "AGENTS_" README.md` → 9 — matches the 9-row Environment Variables table from the spec (`AGENTS_WORKSPACE`, `_POLICIES_DIR`, `_STATE_DB`, `_AUDIT_LOG`, `_ARTIFACT_STORE`, `_TMUX_PREFIX`, `_REPO_ROOTS`, `_APPROVAL_MAX_WAIT_MS`, `_DRY_RUN`).
- `repo_roots_are_colon_separated` confirms `AGENTS_REPO_ROOTS="/repo/a:/repo/b"` → `["/repo/a","/repo/b"]` (the cwd allowlist H/0/2 will consume).
- `git show --stat beae88b` → exactly the prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- `parseInteger` (clamps empty/invalid `AGENTS_APPROVAL_MAX_WAIT_MS` to the 60000 default) is more robust than the spec's `Number(env || 60_000)`, which would have yielded `NaN` on a non-numeric value. Welcome.
- `AGENTS_POLICIES_DIR` resolved via `path.resolve` (not under workspace) — correct: policies are repo metadata, not runtime output. Coder flagged this reasoning explicitly. Endorsed.
- `repoRoots` empty-string → `[]` (via `.filter(Boolean)`), so an unset allowlist is an empty list rather than `[""]`. Correct for the H/0/2 cwd guard.

## Stage D status
- [x] D/0/0 Audit JSONL writer
- [x] D/0/1 Audit reader and filters
- [x] D/0/2 Runtime path configuration — **closed by this task**
- [ ] D/0/3 pending (likely `agent-run audit show` CLI per earlier stub references)

## Next step
OK → coder advances to **D/0/3** (`plan/D/0/03.md`), the last task of Stage D. New branch `feature/D-0-3-*` cut from `develop`.
