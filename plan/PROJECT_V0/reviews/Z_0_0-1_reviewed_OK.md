# Review Z_0_0-1 — OK

**Task:** plan/Z/0/00.md
**Trial:** 1
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** f0ee806 — feat(policy): add planner review contract (Z/0/0)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The planner role gains `artifact.put.review_notes` (still denied `code.write`
and `agent.spawn`), and this repo (`agents-orchestrator`) is registered as an
`internal` repository allowing `gemini-cli`/`claude-code`, so a Claude coder can
write `plan/*.md`. Restricted repos are untouched. All acceptance criteria met;
tests + policy validate + CI green. Verdict: **OK**.

## Checks
- [x] Archivos a crear / modificar — `policies/roles.json` (planner gains review_notes, version→2), `policies/repositories.json` (`agents-orchestrator` internal, version→2), `tests/gateway/planner_review_contract.test.js`, CHANGELOG.
- [x] Tests requeridos (ran: `node --test tests/gateway/planner_review_contract.test.js` → 5/5; `agent-run policy validate` → OK; `./scripts/ci.sh` → all checks passed). The 6 spec cases are covered (the two planner-deny cases consolidated into one test).
- [x] Criterios de aceptacion — planner can `artifact.put.plan` + `artifact.put.review_notes`; planner still denied `code.write`/`agent.spawn` (verified: deny=`["code.write","agent.spawn"]`); `agents-orchestrator` registered `internal`, claude-code coder can write; restricted repos unchanged (cvision/cvlib still gemini-only); `policy validate` passes.
- [x] Errores comunes evitados — planner not granted `code.write`; repo classified `internal` (not `unrestricted`); Codex not added to `agents-orchestrator`; restricted classifications untouched.
- [x] Definition of done — commit on branch, conventional message references Z/0/0, CHANGELOG line. PR draft deferred (project no-push pattern).
- [x] Global invariants — English; no push; change is within `agents-orchestrator/` (registry files); no `orchestrator/` process; restricted repos unaffected.

## Findings
Correct, minimal policy change exactly per spec. Verified the planner deny list is preserved and restricted repos stay gemini-only.

**Security observation (not blocking — matches the spec's intent).** Registering `agents-orchestrator` as `internal` grants the `coder` role (claude-code) `code.write` **repo-wide**, not path-scoped to `plan/*.md`. The "agents only touch `plan/*.md`, never `gateway/` or `policies/`" guarantee from the Stage Z README is therefore a *workflow* property (planner/coder prompts in Z/0/1 + the human approval gate + running on a branch), not something this policy enforces. That is consistent with how the task is scoped, but the operator should be aware the policy layer alone does not confine self-repo writes to `plan/*.md`. If stronger enforcement is wanted later, a path-level write policy would be the place.

Process note: `plan/README.md` and `plan/W/` carry the coder's uncommitted working-tree edits (Stage Z map / leftover W spec edits) — left untouched per operator decision.

## Next step
- OK → coder advances to Z/0/1 (planner+coder loop system prompts), where the `plan/*.md`-only discipline is expressed in the prompts.
