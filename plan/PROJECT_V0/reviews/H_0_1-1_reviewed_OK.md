# Review H_0_1-1 — OK

**Task:** `plan/H/0/01.md`
**Trial:** 1
**Branch:** `feature/H-0-1-session-naming`
**Commit:** `5b41766` — `feat(adapters): add session naming helpers (H/0/1)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`buildTmuxTarget` centralizes tmux session naming: `ag-<traceId>-<agent>-<role>`, sanitized to `[a-z0-9-]`, capped at 96 chars, with required-field enforcement and `-cli`-only suffix stripping. Injection chars are neutralized. 220 total gateway tests pass. Task H/0/1 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/adapters/session_naming.js`, `tests/gateway/session_naming.test.js`.
- [x] Tests requeridos — expected target, `-cli` suffix removal, invalid-char sanitization, required-field throw. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — only `[a-z0-9-]` survives (no injection); `-cli` stripped only for `gemini-cli` (`claude-code` keeps `-code`); target capped at 96 (`slice(0,96)`).
- [x] Definition of done — commit on `feature/H-0-1-session-naming`; CHANGELOG line for H/0/1 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `5b41766`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 220 # pass 220 # fail 0`; `==> All checks passed.` exit 0.
- Naming probe:
  - `gemini-cli` / `restricted-coder` → `ag-tr-abc123-gemini-restricted-coder` (`-cli` removed) ✅
  - `claude-code` / `coder` → `ag-x-claude-code-coder` (`-code` **kept**, only `-cli` is stripped) ✅
  - injection `traceId: "tr/../x; rm -rf /"` → `ag-tr-x-rm--rf-g-c`, matches `/^[a-z0-9-]+$/` ✅ — shell-metacharacters and path-traversal sequences neutralized before they ever reach a tmux arg.
  - empty `traceId` → `TypeError` ✅.
- `git show --stat 5b41766` → exactly the 2 prescribed files plus the CHANGELOG entry.

### Decision review (non-blocking)
- The coder also sanitizes a **custom `prefix`** (not just the input chunks), closing a hole where a caller-supplied prefix could inject unsafe chars. Good defensive extension beyond the spec.
- Adjusted the length test to assert the contract (`<= 96`) instead of a brittle exact length — the coder noted the original expected number was a test-arithmetic mistake. Reasonable; the contract assertion is more robust.

## Stage H status
- [x] H/0/0 Port tmux client
- [x] H/0/1 Session naming helpers — **closed by this task**
- [ ] H/0/2 (cwd guard `assertSafeCwd`, TM-04 — security-critical), H/0/3 pending

## Next step
OK → coder advances to **H/0/2** (`plan/H/0/02.md`). New branch `feature/H-0-2-*` cut from `develop`. **H/0/2 is security-critical (TM-04):** the cwd guard must `realpath`-resolve and check against `AGENTS_REPO_ROOTS` (`repoRoots` from D/0/2 config), rejecting `..`/symlink/absolute escapes **before any spawn** (ADR-003). Expect to scrutinize that one closely.
