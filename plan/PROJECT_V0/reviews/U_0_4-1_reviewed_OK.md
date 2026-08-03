# Review U_0_4-1 — OK

**Task:** `plan/U/0/04.md`
**Trial:** 1
**Branch:** `feature/U-0-4-bypass-regression-suite`
**Commit:** `37a5b8a` — `test(e2e): add bypass regression suite (U/0/4)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The bypass regression suite materializes the threat model: every TM-id (TM-01..TM-11) has ≥1 adversarial test that drives the attack and asserts the control blocks it. **I proved the suite is non-vacuous** by weakening the cwd guard and watching TM-04 tests fail. Bidirectional traceability is test-enforced. One legitimate, traced skip (cross-trace message, Stage S deferred). Full CI green. **This task closes Stage U and seals the MVP.**

## Checks
- [x] Archivos a crear / modificar — `tests/e2e/bypass_regression.test.js` (14 tests, 1 skip), `tests/structure/test_bypass_traceability.py`, `docs/threat-model.md` (Tested-by → bypass suite).
- [x] Tests requeridos — ≥1 case per TM-id present; all green or explicit traced skip; suite in `./scripts/ci.sh`; threat-model ↔ suite in sync.
- [x] Criterios de aceptacion — every item satisfied (verifications below).
- [x] Errores comunes evitados — **no vacuous passes** (proven by regression experiment); every test has a `// threat: TM-XX` comment; the one skip carries a traced TODO.
- [x] Definition of done — commit on `feature/U-0-4-bypass-regression-suite`; CHANGELOG line for U/0/4 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths (temp workspaces) · no `orchestrator/` component: OK.

## Findings
All-green. Live verifications on the working tree at `37a5b8a`:

- `node --test tests/e2e/bypass_regression.test.js` → `# tests 14 # pass 13 # fail 0 # skipped 1`.
- **Non-vacuity proof (the spec's required experiment):** I temporarily replaced the cwd-guard containment check (`resolved === root || startsWith(root+sep)`) with `true`, re-ran the suite → `cwd_outside_allowlist_is_rejected_before_spawn` and `cwd_symlink_escape_is_rejected` **FAILED** (`not ok 5`, `not ok 6`). Restored the file → full CI green again. The bypass tests genuinely catch a broken control, not just always-true assertions.
- **Traceability is test-enforced** (`test_bypass_traceability.py`): for every `### TM-NN` in `docs/threat-model.md`, the suite must contain `// threat: TM-NN` **and** the threat-model section must point at `tests/e2e/bypass_regression.test.js`. All 11 TM-ids satisfy both directions.
- Per-threat coverage exercises **real controls / forces the attack**:
  - TM-01 orchestrator raw read → `POLICY_DENIED` (real artifact.get policy path).
  - TM-08 orchestrator `code.write` → `deny`/`role.deny_action` (policy engine — the real control, no code-write tool exists).
  - TM-02 reviewer shared raw → `allow_with_sanitization`, internal, **secret absent**.
  - TM-03 arbitrary repo file not visible as artifact (`list` empty, unknown id `NOT_FOUND`).
  - TM-04 `/etc` cwd + symlink-to-`/etc` → rejected "outside allowed roots" before spawn.
  - TM-05 `session.intervention_note` → `HUMAN_TMUX_INTERVENTION_NOTE` audited.
  - TM-06 **injected throwing sanitizer** → cross-boundary get `POLICY_DENIED`/`sanitization.missing` + `SANITIZATION_FAILED` audit.
  - TM-07 unknown approval id rejected; grant-then-replay keeps `granted`, exactly 1 `APPROVAL_GRANTED`.
  - TM-09 cross-trace artifact share → `POLICY_DENIED`/`share.cross_trace`.
  - TM-10 stdout smoke → only protocol frames (`MCP smoke OK`).
  - TM-11 `approval.wait` with `serverMaxMs: 10` → `pending` in <500ms, `APPROVAL_WAIT_TIMEOUT timeoutMs: 10`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` (after restore) → gateway 292 / e2e 14 / structure / CLI; `==> All checks passed.` exit 0.
- `git show --stat 37a5b8a` → suite + traceability test + threat-model updates + CHANGELOG.

## Operator decision — `U_0_4-1_to_check_by_human.md` (skipped cross-trace message test)

`cross_trace_message_access_denied` (TM-09 message variant) is `test.skip` with `TODO(U/0/4): enable when Stage S message store is in MVP scope`. **Assessment: acceptable and consistent.** The U/0/4 spec explicitly allows controlled skips with a traced TODO when a threat "cannot be tested today"; Stage S (message store) is deferred by ADR-004 (which I confirmed matches the operative plan in the U/0/2 review), and the MVP has **no message-access API** to exercise — fabricating one just to satisfy the test would test nothing real. The artifact-side of cross-trace (TM-09) **is** tested and passing. Routed to the operator for the formal scope sign-off; on the merits no rework is implied.

## Stage U status — CLOSED
- [x] U/0/0 Restricted-flow E2E
- [x] U/0/1 V4 acceptance checklist
- [x] U/0/2 Final README + MVP scope ADR
- [x] U/0/3 MVP regression gate
- [x] U/0/4 Bypass regression suite — **closed by this task**

## MVP status — SEALED (pending operator sign-off)

All MVP stages are closed: **A B C D E F G(0/0) H I J K-equivalent(agent_service) L M N O Q R T U**, with P (Codex) / S (message store) / V (post-MVP) deferred per ADR-004. The threat model (TM-01..TM-11) is backed by an executable, non-vacuous regression suite wired into the CI gate. Final battery: **structure + gateway (292) + e2e (14, incl. bypass) + MCP stdio smoke + policy validate + CLI (29)** — all green in one `./scripts/ci.sh` run.

## Next step
OK → the implementation backlog for the MVP is complete. Remaining work is **operator-facing, not coder-facing**:
1. **Resolve the human-check items** (`plan/reviews/*_to_check_by_human.md`): the substantive ones are `C_0_4` + `N_0_2` (sanitized-raw policy vocabulary, incl. the `security_reviewer` denial) and the scope confirmations (`U_0_2` Codex/message defer, `O_0_2` AgentService/`taskId`, `U_0_4` message-test skip). The G/J/R items are low-risk ahead-of-dependency confirmations.
2. **Drive `docs/mvp-acceptance-checklist.md` to all-green** — as the reviewer/operator verifies each of the 27 V4 §30 criteria against its now-passing evidence.
3. Optionally pick up the deferred **P/0/0 (Codex)**, **S (message store)**, or **V (post-MVP)** stages if/when their triggers arrive.

There is no further `*_to_review.md` expected from the coder for MVP scope. Congratulations — the restricted-flow MVP is implemented, audited, and bypass-tested end to end.
