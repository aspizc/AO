# Review A_0_4-1 — OK

**Task:** `plan/A/0/04.md`
**Trial:** 1
**Branch:** `feature/A-0-4-architecture-docs`
**Commit:** `fa45151` — `docs(arch): add architecture doc and ADRs 001-003 (A/0/4)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Architecture doc and the three ADRs match the spec, fit on one screen, and lock the right invariants (Gateway-only, no orchestrator component, policy-before-spawn). Live pytest: 16/16 pass. Task A/0/4 is closed.

## Checks
- [x] Archivos a crear / modificar — `docs/architecture.md` (61 lines), `docs/adr/ADR-001-gateway-only.md` (24 lines), `docs/adr/ADR-002-no-orchestrator-component.md` (24 lines), `docs/adr/ADR-003-policy-before-spawn.md` (25 lines), `tests/structure/test_architecture_docs.py` all present.
- [x] Tests requeridos — A-T4.1, A-T4.2, A-T4.3, A-T4.4 all present and green (live run).
- [x] Criterios de aceptacion — every item satisfied (see below).
- [x] Errores comunes evitados — architecture doc is short (≤ one screen); ADRs don't contradict ADR-002 (in fact reinforce it); Cursor/Antigravity only mentioned in the "what does not exist" section; every ADR has a `Date: 2026-05-23` and `Status: accepted` header.
- [x] Definition of done — commit on `feature/A-0-4-architecture-docs`; CHANGELOG line for A/0/4 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component (the ADR enforces it): OK.

## Findings
All-green. Live verifications run on the working tree at `fa45151`:

- `.venv/bin/pytest tests/structure tests/cli -v` → **16 passed / 0 failed** (4 new architecture tests + 12 cumulative).
- `wc -l docs/architecture.md docs/adr/ADR-00*.md` → 61 / 24 / 24 / 25 (all comfortably under one screen).
- ADR-002 line 14–15: `"There is NO directory named `orchestrator/`. There is NO long-running orchestrator process."` → explicit ban as required.
- ADR-003 line 14–15: `"Services MUST consult `policy_engine.evaluate(...)` before any adapter `spawn` or `delegate` call."` → policy-first rule is present.
- `architecture.md` contains the "Mapping With gemini-orchestrator (V4 Annex C)" table with 4 rows, exactly mapping `src/tmux-client.js`, `src/tools/delegate.js`, `src/tools/tmux.js`, and `gemini --yolo` to their H/0/0, I/0/0, I/0/1 destinations.
- `git show --stat fa45151` → exactly the 5 files prescribed plus the CHANGELOG entry.

### Minor non-blocking observations
- ADR-003 wording changed "Adapters MUST consult policy" → "Services MUST consult policy". This is **stricter and more correct** than the spec text: per ADR-001 and the architecture lifecycle, the policy gate lives in `services/`, not `adapters/` (adapters stay "narrow" per ADR-001). The change strengthens the invariant; welcome.
- `test_architecture_doc_mentions_gateway_only` accepts either `"no standalone"` or `"does not exist"`; the doc uses `"What Does Not Exist"` heading which matches the second branch ✅.

## Next step
OK → coder advances to **A/0/5 — Local CI and first green scaffold** (`plan/A/0/05.md`). New branch: `feature/A-0-5-first-green-ci`, cut from `develop`. This is the gate that closes Stage A foundations; it must run `./scripts/ci.sh` green.
