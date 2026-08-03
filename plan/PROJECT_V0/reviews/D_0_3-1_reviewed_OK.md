# Review D_0_3-1 — OK

**Task:** `plan/D/0/03.md`
**Trial:** 1
**Branch:** `feature/D-0-3-audit-cli`
**Commit:** `c7f9fcf` — `feat(cli): add audit show command (D/0/3)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
`agent-run audit show` is real: it shells out to a Node helper (`query-audit.mjs`) that reuses the D/0/1 reader. Filters `--trace-id`/`--type`/`--limit`, `--json` mode, `(no events)` empty case, and `!CORRUPT` display for corrupt lines all verified live. 4 CLI tests + full CI (123 gateway / 18 structure / 12 CLI) green. **This task closes Stage D.**

## Checks
- [x] Archivos a crear / modificar — `gateway/scripts/query-audit.mjs`, `cli/src/agents_cli/main.py` (real `audit show`), `tests/cli/test_audit_show.py` (4 tests), scaffold test updated (audit-show stub assertion removed since the command is now real).
- [x] Tests requeridos — empty → `(no events)`, `--trace-id`, `--type`, `--json` valid. All green.
- [x] Criterios de aceptacion — every item satisfied (live verifications below).
- [x] Errores comunes evitados — delegates to Node reader (no duplicated parsing); inherits env so `AGENTS_WORKSPACE`/`AGENTS_AUDIT_LOG` work; corrupt lines surfaced as `!CORRUPT`; `--json` emits only JSON.
- [x] Definition of done — commit on `feature/D-0-3-audit-cli`; CHANGELOG line for D/0/3 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `c7f9fcf`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → 123 gateway / 18 structure / 12 CLI; `==> All checks passed.` exit 0.
- Live end-to-end with a seeded audit file containing one valid event + one corrupt line:
  ```
  2026-01-01T00:00:00.000Z  POLICY_DECIDED            trace=tr-1              aaaaaaaa
  !CORRUPT  {not json}
  ```
  exit `0` ✅ — human output formats the valid event and flags the corrupt line, exactly per spec.
- `agent-run audit show --json` over the same file → valid JSON array with the event object and `{ "_corrupt": true, "raw": "{not json}" }`. ✅
- `test_audit_show_trace_id` confirms `--trace-id t2` shows `t2`, hides `t1`; `test_audit_show_type_filter` confirms `--type` isolation; `test_audit_show_empty` confirms `(no events)`.
- `git show --stat c7f9fcf` → the 3 prescribed files + scaffold test update + CHANGELOG.

### Decision review (non-blocking)
- The spec's example test helper `_seed_audit` had a real bug (`audit.read_text() if audit.exists() else "" + json.dumps(e)` — operator precedence makes the `else` branch concatenate wrongly). The coder replaced it with a clean `_write_audit` that joins `f"{json.dumps(event)}\n"`. Correct fix; the spec snippet should not have been copied verbatim. Welcome.
- CLI shells out to Node, consistent with the `policy validate` pattern from B/0/5 — keeps audit parsing single-sourced in the gateway core. Endorsed.
- `audit show` guards both "node missing" and "query script missing" with exit 2 and clear messages, mirroring `policy validate`.

## Stage D status — CLOSED
- [x] D/0/0 Audit JSONL writer
- [x] D/0/1 Audit reader and filters
- [x] D/0/2 Runtime path configuration
- [x] D/0/3 `agent-run audit show` — **closed by this task**

Audit log (write + read + CLI) and runtime config are complete. The operator can now inspect any orchestration's events by `traceId`/`type` from the terminal — directly useful for the U-stage E2E verification.

## Next step
OK → per `plan/README.md` MVP ordering (A+B+C+D+E first), coder advances to **Stage E** starting with **E/0/0** (`plan/E/0/00.md`). New branch `feature/E-0-0-*` cut from `develop`.

> Operator reminder (still open): `plan/reviews/C_0_4-1_to_check_by_human.md` awaits a decision on the orchestrator-sanitization design before Stage M.
