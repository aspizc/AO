# Review C_0_3-1 — OK

**Task:** `plan/C/0/03.md`
**Trial:** 1
**Branch:** `feature/C-0-3-approval-policy`
**Commit:** `36cf735` — `feat(policy): add approval rules (C/0/3)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
Approval layer landed: `evaluateApproval` returns `require_approval` for `git.push` to a protected branch and for actions in `agent.requiresApprovalFor`. Local commits and tests stay routine (no approval fatigue). 6 new approval tests + 75 total gateway tests pass. Task C/0/3 is closed.

## Checks
- [x] Archivos a crear / modificar — `gateway/src/core/policy_engine.js` (+`evaluateApproval` + `matchesProtectedBranch`), `tests/gateway/policy_approval.test.js` (6 tests), plus a 6-line tweak to `policies/agent-capabilities.json` (see Decision review below).
- [x] Tests requeridos — protected push, dependency change, local code write allow, test.run allow, feature-branch push allow. **Plus** bonus `release_branch_push_requires_approval` (wildcard `release/*` coverage).
- [x] Criterios de aceptacion — every item satisfied (live probes below).
- [x] Errores comunes evitados — `git.push` to feature branch stays `allow` (no fatigue); `protectedBranches` is read from registry, not hardcoded; orchestrator's `code.write` denial from C/0/2 still fires first (verified live); `requiresApprovalFor` does not blanket-cover routine actions.
- [x] Definition of done — commit on `feature/C-0-3-approval-policy`; CHANGELOG line for C/0/3 present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK · `evaluate` remains pure.

## Findings
All-green. Live verifications on the working tree at `36cf735`:

- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → `# tests 75 # pass 75 # fail 0` + structure (18) + CLI (8); `==> All checks passed.` exit 0.
- Decision matrix probe (raw shell `node -e ...` against the live engine):
  - `claude-code` / `coder` / `cvision` / `code.read` → `deny` ✅ (TM-02 / TM-03 still closed)
  - `gemini-cli` / `restricted-coder` / `cvision` / `code.write` → `allow` ✅
  - `claude-code` / `orchestrator` / `sample-apps` / `code.write` → `deny` ✅ (TM-01 still closed)
  - `gemini-cli` / `coder` / `cvision` / `git.push` / `main` → `require_approval` ✅
  - `gemini-cli` / `coder` / `cvision` / `git.push` / `feature/x` → `allow` ✅ (no fatigue)
  - `claude-code` / `coder` / `sample-apps` / `dependency.change` → `require_approval` ✅
- `release/*` wildcard correctly matched by `matchesProtectedBranch` (extra bonus test `release_branch_push_requires_approval`).
- Layer composition continues to short-circuit on any non-ALLOW result; engine remains pure (no I/O).
- `git show --stat 36cf735` → exactly the 2 prescribed files plus the registry tweak and CHANGELOG entry.

### Decision review (non-blocking, agreed)
- **`policies/agent-capabilities.json` rename** `git.push` → `git.push.protected` in `requiresApprovalFor` for all three agents. This was necessary because:
  - The spec's branch-aware rule (`matchesProtectedBranch` on `targetBranch`) and the spec's feature-branch test (`push_to_feature_branch_does_not_require_approval`) **only coexist** if the generic `git.push` is *not* in `requiresApprovalFor`. Otherwise the second check `requires.includes("git.push")` would flag every push (including feature branches) and break the test.
  - The spec itself flags the rename: "Caso `git.push` → `git.push.protected`" (line 22). The Actions inventory in C/0/0 also lists both `git.push` and `git.push.protected` separately.
  - B/0/0's `registry_agent_capabilities.test.js` does not assert on the *contents* of `requiresApprovalFor`, so no test regression. Verified by the full suite passing.
- The coder's `What changed` section explicitly mentions the rename and its rationale — exactly the right transparency for a registry edit during a downstream task. Welcome.

## Stage C status
- [x] C/0/0 Policy model
- [x] C/0/1 Classification boundary
- [x] C/0/2 Role and orchestrator rules
- [x] C/0/3 Approval rules — **closed by this task**
- [ ] C/0/4 Sanitization rules — pending (still closes the deferred `reviewer + raw_diff` case from C/0/2)
- [ ] C/0/5 Policy explain — pending

## Next step
OK → coder advances to **C/0/4** (`plan/C/0/04.md`). New branch `feature/C-0-4-*` cut from `develop`. Reminder for C/0/4: cover the `reviewer + artifact.get + raw_diff` case deferred in C/0/2 (`agent: claude-code, role: reviewer, repo: sample-apps, action: artifact.get, artifactKind: raw_diff` must NOT return `allow`).
