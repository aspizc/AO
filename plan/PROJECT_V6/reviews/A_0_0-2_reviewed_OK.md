# Review A_0_0-2 — OK

**Task:** plan/PROJECT_V6/A/0/00.md
**Trial:** 2
**Branch:** feat/V6-A-0-00-cli-write-access (uncommitted candidate; HEAD `ecf3ab37e6c1e952d568e3c99f62682fafef60f9`, implementation base `e42818c2b9d72eebc88d858965fafa45c0fa1417`)
**Commit:** none (working-tree candidate, as the handoff states)
**Reviewer:** Claude reviewer session (claude-opus-5-5), fresh session, independent of the coder and of the trial-1 reviewer; no subagent used
**Date:** 2026-10-08

## Summary

Trial 2 is a test-only correction of the trial-1 KO. It adds 25 `profile
policy ...` cases to `tests/gateway/cli_write_access.test.js`, run on the
actual tracked base and Kya registries without overrides, plus exact lint
evidence. All three required corrections are met. RED, GREEN and lint
reproduce, and fresh mutation runs show that the new emitted-output assertions
fail when the confinement logic is broken. Production code and docs are
byte-identical to trial 1. **OK.** The scope is limited as stated below.

## Bound inputs

- `A_0_0-2_to_review.md` sha256 `0dd763ab795ce6ae10a3f50e9ce225b5207eb2107cdd2fe6fb6a91e97810e1ee`.
- `evidence/A_0_0-2-files.json` sha256 `5316b77faa3f80c08cf1d5226a20fe1fac5de9e63744cfbbbb6ee0f168d9c06a`.
  I recomputed all 27 listed hashes and all of them match the working tree.
- Against the trial-1 manifest (`A_0_0-1-files.json`), only
  `tests/gateway/cli_write_access.test.js` changed. This matches
  `A_0_0-2-preservation.json`.
- `git diff --quiet ecf3ab3` holds for every committed `A_0_0-1*` review and
  evidence file, so the trial-1 trail is unmodified.
- `git diff --quiet e42818c` holds for `policies/`,
  `gateway/src/adapters/gemini_adapter.js`,
  `tests/gateway/gemini_delegate.test.js` and
  `tests/gateway/gemini_supervised.test.js`.
- `e42818c..ecf3ab3` touches only review files.
- `git status` shows the 13 trial-1 modified paths plus the untracked
  trial-1/trial-2 tests and the trial-2 review/evidence files. Nothing else is
  touched.
- `git diff --check` is clean.

## Checks

- [x] Files to create/modify: the 15 trial-1 paths are unchanged except
      `cli_write_access.test.js`. There is no Gemini, `policies/` or lint-config
      change.
- [x] Required tests (host, node v22.22.1):
  - **GREEN:** the exact sheet Verification `node --test` list (10 files) gave
    251 tests, 251 pass, 0 fail/cancelled/skipped/todo, exit 0. This matches
    `A_0_0-2-green.txt`.
  - **RED:** I made my own scratch `git archive e42818c` of `gateway policies
    tests` and copied in only the new test file. Running
    `PATH=/usr/bin:/bin /usr/bin/node --test --test-name-pattern='profile policy'`
    gave 25 tests, 0 pass, 25 fail, exit 1. This matches `A_0_0-2-red.txt`.
- [x] Acceptance criteria: see the corrections and mutation results below.
- [x] Common errors avoided:
  - `git grep -n '"reviewer"\|"coder"' gateway/src/adapters` exits 1, so
    there is no role-name branch.
  - Claude keeps `dontAsk` headless and does not use `--permission-mode plan`.
- [ ] Definition of done: not applicable to an uncommitted candidate. Root
      owns commit, full gate and integration.
- [x] Global invariants: English only, no push, no `policies/` edit, server
      naming unchanged, no stdout logging added.

## Corrections 1–3 against the trial-1 KO

1. **Kya profile (AC5).**
   - `policies/profiles/kya/roles.json` is tracked (`git ls-files`).
   - The test calls `loadRegistries({ policiesDir: "policies/profiles/kya" })`
     with no agent, role or repo override (`cli_write_access.test.js:107,136`).
   - For each of the five providers, the reviewer case asserts
     `resolveCliWriteAccess === true`, plus `writeAccess: true` on both
     delegate and spawn.
   - It also compares the exact fake-child delegate argv and the spawn
     `launchCommand` with the writer shapes (`:109-134`):
     - Codex: `-s workspace-write`.
     - Claude: `dontAsk` with no `--disallowedTools`.
     - pi: no `--tools`.
     - opencode: `--auto` with no `--agent plan`.
     - antigravity: launches with `--dangerously-skip-permissions`.
   - It asserts `SESSION_STARTED.writeAccess` for both operations.
   - The handoff withdraws the false "kya removed" claim.
   - `repo` is omitted, which the KO explicitly allowed.
2. **Base policy, emitted output (AC2).** The real base registry is used
   unchanged for 5 providers × reviewer/editor/planner/coder:
   - **Reviewer and editor:** exact read-only delegate argv and
     `launchCommand` for Codex, Claude, pi and opencode.
   - **Planner:** read-only delegate argv. Spawn is rejected with
     `POLICY_DENIED`/`role.deny_action`, because the existing `agent.spawn`
     denial is unchanged.
   - **Coder:** exact writer argv and launch, including Claude headless
     `--permission-mode dontAsk`.
   - **Antigravity non-writers:** both operations are rejected with
     `POLICY_DENIED`/`role.deny_action`. There is no argv witness file and no
     `SESSION_STARTED` event (`:152-153,166-171`).
   - **Audit:** event counts and `writeAccess` are asserted per path
     (`:173-175`).
3. **Re-run and lint evidence.**
   - RED and GREEN are recorded and reproduced (above).
   - `gateway/node_modules/.bin/eslint --config gateway/eslint.config.js` on
     the 7 production files exits 0 (reproduced).
   - `A_0_0-2-lint-runner.mjs` reuses the existing Gateway config with its
     file globs rebased to `tests/gateway/**`. No rules are disabled; I
     reviewed the source.
   - Both new suites pass with 0 errors and 0 warnings (reproduced).
   - The one `no-useless-assignment` error in the authority suite is
     pre-existing (`let validValue = null` is at base line 706) and is
     reported, not hidden.
   - The handoff states that the root test directory is not covered by the
     repository lint config.

## Intent verification (mutation runs, scratch copy of the candidate)

I ran these against the 25 profile cases unless noted. Unmutated, all 25
pass. Each single-line mutation below makes the cases fail:

| Mutation | Failing cases |
|---|---:|
| Claude launch drops `--disallowedTools` | 2 |
| Claude headless drops `--disallowedTools` | 3 |
| Claude writers always get `--disallowedTools` | 2 |
| Codex sandbox ignores `writeAccess` | 3 |
| opencode launch keeps `--auto` for non-writers | 2 |
| pi headless drops `--tools` | 3 |
| antigravity fail-closed check removed | 3 |
| Codex audit records a constant `writeAccess: true` | 3 |
| Predicate always `true` | 15 |

Other mutations:

- **Predicate `!== "deny"` (approval grants write).** None of the 25 profile
  cases fail, because no real profile requires approval for `code.write`.
  The synthetic `require_approval` test catches it (full file: 1 fail of 39).
- **Service suite:**
  - Dropping the `writeAccess !== expected` check fails 10 of 10 cases.
  - Dropping the per-call Codex sandbox fails 1 case.
  - Dropping only the `typeof writeAccess !== "boolean"` clause fails no
    case. This is an equivalent mutant: the strict `!==` comparison against
    a boolean already rejects non-booleans.

The service result, audit recording and Antigravity fail-closed ordering are
unchanged from trial 1. The fail-closed check runs after selection and before
`assertSafeCwd`, the audit event and any launch, in both delegate and spawn.
In `agent_service.js`, `writeAccess` is computed per call for delegate and
spawn and is in the exact field lists; `gemini-cli` has no entry. I re-read
this code in this session.

## Findings (non-blocking)

1. The handoff says the handoff and manifest "receive separate hashes below",
   but it lists none. I recorded both hashes above. Future handoffs should
   include them.
2. All 25 RED failures happen at the first assertion
   (`resolveCliWriteAccess is not a function`). That alone does not prove the
   argv assertions bite. The mutation runs above do prove it.
3. The Kya cases cover only `repo: undefined`. The `code.write` decision with
   a registered repo was verified ad hoc in trial 1 but is not under test.
4. Carried over from trial 1, outside this sheet's scope:
   - The antigravity headless writer builder's `--print` argument shape may
     not parse with `agy` 1.3.0. Flag it for follow-up.
   - The sheet's probe command has the same defect.

## Scope of this verdict

This verdict covers only the working-tree bytes bound above at HEAD `ecf3ab3`
and base `e42818c`. It is not a full-gate claim: `bash scripts/ci.sh` was not
run by the coder or by this review, and root owns the gate. The broader
Gateway suite was not run. `agent-run policy validate` was not re-run; this is
a test-only correction and `policies/` is byte-identical to base. No live
provider, tmux or OS-sandbox enforcement was exercised. Residuals stay as
documented: Claude, pi and opencode restrictions are tool-level, and only
Codex `read-only` is an OS sandbox. The candidate is reviewed only, not
committed, integrated, promoted or released.

## Next step

OK: root may commit the candidate with an explicit pathspec, run the full gate
on that commit, and integrate it. A/0/01 may then proceed.
