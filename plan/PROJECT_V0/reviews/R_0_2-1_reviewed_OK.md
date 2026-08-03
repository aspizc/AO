# Review R_0_2-1 — OK

**Task:** `plan/R/0/02.md`
**Trial:** 1
**Branch:** `feature/R-0-2-session-intervention-note`
**Commit:** `6f147d2` — `feat(sessions): add intervention note tool (R/0/2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`session.intervention_note` MCP tool added: records a `HUMAN_TMUX_INTERVENTION_NOTE` audit event with the operator's note (truncated to 4000 chars), rejects empty notes, defaults `by` to `operator`. Registry now lists 17 tools. 284 total gateway tests pass. **This task closes Stage R.**

## Checks
- [x] Archivos a crear / modificar — `gateway/src/tools/session.js` (+`session.intervention_note`), `tests/gateway/tool_session_intervention_note.test.js`, scaffold/bootstrap/registry test counts updated.
- [x] Tests requeridos — records note returns `{ok:true}`, note appears in audit. All green.
- [x] Criterios de aceptacion — tool listed in MCP; audit carries operator text truncated to 4000.
- [x] Errores comunes evitados — empty note rejected (`z.string().min(1)`); note bounded at write time (`slice(0,4000)`), so validation accepts any non-empty string while storage stays bounded.
- [x] Definition of done — commit on `feature/R-0-2-session-intervention-note`; CHANGELOG line for R/0/2 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verification on the working tree at `6f147d2`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 284 # pass 284 # fail 0`; `==> All checks passed.` exit 0.
- Registry lists **17 tools**; session group is `session.attach_info`, `session.intervention_note`.
- Tool appends `HUMAN_TMUX_INTERVENTION_NOTE` with `sessionId`, `traceId`, `by` (default `operator`), `note` (≤ 4000) and returns `{ ok: true }`; the test confirms the note appears in the audit query by trace.
- `git show --stat 6f147d2` → the tool + the test + scaffold/bootstrap test updates + CHANGELOG.

## Stage R status — CLOSED
- [x] R/0/0 Session attach info
- [x] R/0/1 Intervention detector (best-effort, TM-05)
- [x] R/0/2 Manual intervention notes — **closed by this task**

TM-05 is now covered from both sides: best-effort automatic detection (`HUMAN_TMUX_INTERVENTION`, R/0/1) and deliberate operator notes (`HUMAN_TMUX_INTERVENTION_NOTE`, this task). tmux is observable + annotatable, documented as best-effort.

## Progress snapshot
Closed: A(7)+B(6)+C(6)+D(4)+E(3)+F(4)+G/0/0+T/0/0+T/0/1+J(3)+L(3)+M(4)+N(3)+H(4)+I(3)+Q(5)+R(3) = **61 tasks** (one M/0/3 KO→OK). Gateway 284 / structure 33 / CLI 29, all green.

## Next step
OK → per `plan/README.md` MVP order, after Q+R the next block is **O** (Claude adapter), then **U** (E2E + MVP close). Coder advances to **O/0/0** (`plan/O/0/00.md`) unless the operator re-prioritises. New branch `feature/O-0-0-*` cut from `develop`.

> Note for O (Claude adapter): it should subclass `BaseAdapter` and mirror the Gemini adapter's **double-gating** (policy preflight + `assertSafeCwd`) and audit lifecycle — and remember `claude-code` has **no** `restricted` classification (B/0/0), so a Claude adapter must never be handed a restricted repo.
>
> Operator: 5 human-check items open; `C_0_4` + `N_0_2` (policy vocabulary) are the substantive ones, the other 3 are ahead-of-dependency confirmations. Stage U (`U/0/4` bypass regression) will lean on the `N_0_2` visibility matrix, so resolving `N_0_2`/`C_0_4` before U is worthwhile.
