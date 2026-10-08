# Review A_0_0-1 — KO

**Task:** plan/PROJECT_V6/A/0/00.md
**Trial:** 1
**Branch:** feat/V6-A-0-00-cli-write-access (uncommitted candidate on base `e42818c2b9d72eebc88d858965fafa45c0fa1417`)
**Commit:** none (candidate is working-tree only, as the handoff states)
**Reviewer:** Claude reviewer session (claude-opus-5-5), independent of the coder; no subagent used
**Date:** 2026-10-08

## Summary

The production change is sound: one policy predicate, per-call Codex sandbox
with ceiling, read-only flags for Claude/pi/opencode, fail-closed antigravity,
exact-field `writeAccess` validation in the service, and audit recording. RED
and GREEN reproduce. The verdict is **KO** because one acceptance criterion
has no test or evidence: the kya-profile reviewer keeps write flags. The
handoff justifies the omission with a false claim. Base-policy launch coverage
is also incomplete.

## Bound inputs

- `A_0_0-1_to_review.md` sha256 `f288c2d8cf39deb9de00b23c5d8bf4429362387e9734bc5d7a1cb6a768fa76b5`.
- `evidence/A_0_0-1-files.json` sha256 `e24abe2c3607e0d1ff3f9d58fd74e0ca359f45ec29e57a867093b1cd80cb964c`.
  I recomputed all 21 listed hashes. Each one matches the working tree:
  - 12 source and doc files: `docs/adapters/{antigravity,claude-code,codex,opencode,pi}.md`,
    five adapters, `policy_engine.js` and `agent_service.js`.
  - 3 test files.
  - 6 evidence files.
- `HEAD` = `e42818c2b9d72eebc88d858965fafa45c0fa1417`. `git status` shows exactly
  the 15-path pathspec plus the review/evidence files. Nothing else is touched.
- `git diff e42818c --quiet` holds for these paths, so they are byte-identical to base:
  - `policies/`
  - `gateway/src/adapters/gemini_adapter.js`
  - `tests/gateway/gemini_delegate.test.js`
  - `tests/gateway/gemini_supervised.test.js`
- `git diff --check` is clean.

## Checks

- [x] Files to create/modify: all 15 listed paths are present with the
      expected role; there is no Gemini adapter change and no `policies/` change.
- [x] Required tests ran (host, `PATH=/usr/bin:/bin`, node v22.22.1):
  - **GREEN:** the full sheet Verification `node --test` list (10 files) gave
    226 tests, 226 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo, exit 0.
  - **RED:** the two new suites ran against a scratch `git archive e42818c`
    export of `gateway/ policies/ tests/` with only the new test files copied in.
    Result: 24 tests, 1 pass, 23 fail, exit 1. The one pass is the read-only
    ceiling case, which already held at base, as the handoff says.
- [ ] Acceptance criteria: AC5 is unmet. AC2's base-policy part is only
      partially evidenced. See the findings.
- [x] Common errors avoided:
  - There is no new role-name branch. `git grep -n '"reviewer"\|"coder"' gateway/src/adapters`
    returns nothing (exit 1). No added source line mentions a role name.
  - `--permission-mode plan` is not used for Claude, and `dontAsk` is kept headless.
- [ ] Definition of done: not applicable to an uncommitted candidate. Root
      owns commit, full gate and integration.
- [x] Global invariants: English only, no push, no `policies/` edit, server
      naming unchanged, no stdout logging added.

## Verified behaviour

- **Predicate.** `policy_engine.js:359` gives
  `evaluate(... "code.write").decision === "allow"`, so both `deny` and
  `require_approval` yield `false`. I ran the base `policies/` for all five
  providers:
  - coder resolves to `allow` (repo `agents-orchestrator` and no repo).
  - reviewer, planner and editor resolve to `deny` (`role.deny_action`).
  - Base planner may delegate, but `agent.spawn` is `deny` for it. The sheet
    does not change that.
- **Codex.** Both the delegate (`codex_adapter.js:261`) and the spawn (`:397`)
  use `writeAccess ? codexSandbox(config) : "read-only"`, so `-s` is emitted
  in the exec argv and in the launch command. The configured `read-only`
  ceiling holds for writers, and the test covers it. Service checks
  (`agent_service.js:572-599`):
  - It computes the per-call expected sandbox and passes it to the existing
    delegate contract check.
  - A non-writer result claiming `workspace-write` is rejected (tested).
- **Claude, pi, opencode.** Non-writers get the read-only flags in both
  builders:
  - Claude: `--disallowedTools Edit Write NotebookEdit`.
  - pi: `--tools read,grep,find,ls`.
  - opencode: `--agent plan`, with `--auto` suppressed even when auto is on.

  The tests assert this on real fake-child argv and on the supervised
  `launchCommand`.
- **Antigravity.**
  - The probe exited 2 because `agy --print` consumed `--mode` as its prompt.
    That is inconclusive, and the handoff reports it honestly.
  - Both operations call `assertPolicyAllowed(evaluate(code.write))` for
    non-writers. This happens after selection/preflight but before
    `assertSafeCwd`, before `SESSION_STARTED`, and before any child or tmux
    launch, dry-run included. The test asserts there is no argv witness file
    and no `SESSION_STARTED`.
  - Writers keep the opt-in `--dangerously-skip-permissions`.
- **Service.**
  - `writeAccess` is added to `SPAWN_RESULT_FIELDS` and to the five executable
    providers' `delegate` lists; `gemini-cli` has no entry, unchanged.
  - Missing, `null`, `"false"`, `0` and inverted values are rejected with
    `EFFECTIVE_SELECTION_INVALID`.
  - A wrong model is still rejected. Bound and unbound paths are both
    exercised.
- **Audit.** `SESSION_STARTED.writeAccess` is recorded on all 10
  adapter/operation paths and asserted for the non-refused ones.
- **Docs.** Each of the five adapter docs states the flags, the derivation
  rule and the residual. Only Codex `read-only` is called an OS sandbox.
- **Lint.** I ran
  `gateway/node_modules/.bin/eslint --config eslint.config.js` from
  `gateway/` on the 7 production files. It exits 0 with no findings.

## Findings

1. **Blocking: AC5 and the TDD item `kya reviewer keeps write access` are
   missing, and the handoff's stated reason is false.**
   - The handoff says `policies/profiles/kya/roles.json` "does not exist at
     this base following A/0/02". In fact it is tracked at `e42818c` (blob
     `17a2c315373310b17fa231f2c9119172002aa355`), and the coder's own
     `evidence/A_0_0-1-anchor-reverification.json` records
     `"baseExists": true` for it.
   - A/0/02 (`3f7d78a`) removed only *repository registrations* from the
     profiles' `repositories.json`. The kya profile's roles and agents remain.
   - The kya reviewer still allows `code.write` (`roles.json:57-67`). I loaded
     `loadRegistries({ policiesDir: "policies/profiles/kya" })`, and
     `resolveCliWriteAccess` returns `true` for `role: "reviewer"` on all five
     providers with repo `agents-orchestrator`, `sample-apps` or none.
   - So the implementation probably behaves correctly. But the criterion is
     neither tested nor evidenced, and the synthetic registries do not replace
     a test the sheet requires on a profile that exists.

2. **Blocking: AC2 ("under base policies … each of the five executable
   providers launches with that provider's read-only flags; coder/writer
   children launch unchanged") is evidenced only partly.**
   - The base-policy test `cli_write_access.test.js` ("base
     reviewer/planner/editor cannot write") checks the predicate for
     `claude-code` only.
   - Every emitted-argv and launch test uses synthetic `registry()` overrides
     (`getRole` and `getAgent` replaced), not `policies/`.
   - The sheet names `codex reviewer delegate runs -s read-only under
     workspace-write config` and `claude coder argv is unchanged` as base
     behaviours. Rule 9 requires the structure check to assert emitted output
     under the stated policy.

3. Non-blocking: the sheet's TDD RED asks for extensions to the existing
   adapter suites. The coder put all new cases in
   `cli_write_access.test.js` instead, and the existing suites are unchanged.
   That is acceptable because the coverage is equivalent, but say so
   explicitly in the next handoff.

4. Non-blocking evidence gap: `evidence/A_0_0-1-lint.txt` is empty (sha256 of
   the empty string) and records no command or exit code. The two new test
   files are outside the `gateway/` ESLint base path ("File ignored because
   outside of base path"), so "scoped ESLint … passed" for them has not been
   demonstrated. Record the exact command and exit code.

## Required corrections (KO only)

1. **Add a kya-profile test** in `tests/gateway/cli_write_access.test.js`.
   Load `loadRegistries({ policiesDir: path.resolve("policies/profiles/kya") })`
   and use `role: "reviewer"` with a repo the profile registers (e.g.
   `agents-orchestrator`) or none. For each of the five providers, assert:
   - `resolveCliWriteAccess(...) === true`;
   - delegate and spawn both report `writeAccess: true`;
   - the emitted argv and `launchCommand` keep writer flags:
     - Codex: `-s workspace-write` under a `workspace-write` config.
     - Claude: no `--disallowedTools`.
     - pi: no `--tools read,grep,find,ls`.
     - opencode: no `--agent plan`, and `--auto` present when `opencode auto`
       is on.
     - antigravity: launches (no `POLICY_DENIED`), with
       `--dangerously-skip-permissions` when auto is on.

   State in a one-line comment why it matters: the decision follows policy,
   not the role string. In the next handoff, withdraw the incorrect "Kya
   profile is stale" claim.

2. **Add base-policy emitted-output tests** using
   `loadRegistries({ policiesDir: path.resolve("policies") })` without
   `getRole`/`getAgent` overrides. Use a temp cwd as a repo root; leave out
   `repo` or override only `getRepo` `excludedPaths` the way the service
   suite does. For each of the five providers:
   - `reviewer` and `editor` delegate and spawn emit that provider's
     read-only flags. For antigravity, both must reject with `POLICY_DENIED`
     with no child and no `SESSION_STARTED`.
   - `planner` delegate emits the read-only flags, and `planner` spawn is
     rejected by the existing `agent.spawn` denial.
   - `coder` delegate and spawn emit the unchanged writer argv: compare to the
     builder output without any read-only flag, and include
     `--permission-mode dontAsk` for Claude.
3. **Re-run and record** the sheet Verification `node --test` list, plus the
   RED of the new cases against base production files. Add a lint evidence
   file containing the exact ESLint command(s) and exit code(s), and say
   whether the test files are covered by any lint config. Then write
   `A_0_0-2_to_review.md` with a fresh SHA-256 manifest.

## Risks and notes (not part of this KO)

- **Antigravity argv.** The probe error says `agy` 1.3.0 `--print` takes the
  prompt as its value. The pre-existing headless builder emits
  `--print --output-format json … <prompt>`, so live antigravity writer
  delegation may hit the same parsing failure. This predates the sheet and is
  outside its scope; flag it for a follow-up. The sheet's own Verification
  step 3 probe command has the same defect, and a later probe should use
  `--print='<prompt>'`.
- **Codex spawn sandbox.** The service asserts the sandbox only on delegate
  results. On spawn, the `-s` value lives in `launchCommand` and is covered by
  adapter tests, not by a service assertion. That matches the sheet text.
- **Sandbox default divergence (pre-existing).** The service's
  `configuredCodexSandbox` ignores `AGENTS_CODEX_SANDBOX`, while the adapter's
  `codexSandbox` reads it. If they ever diverge, the service would reject a
  writer's delegate as invalid, which is a fail-closed outcome.
- **Not live-tested.** Residuals hold as documented: Claude, opencode and pi
  restrictions are tool-level, not OS sandboxes. No live provider or tmux
  enforcement was exercised by the coder or by this review.

## Scope of this verdict

This verdict covers only the bound working-tree bytes listed above at base
`e42818c`. It is not a full-gate claim: `bash scripts/ci.sh` was not run by
the coder (operator-deferred) or by this review, and root owns it. The broader
Gateway suite was not run, and `agent-run policy validate` was not
re-executed (the coder's evidence shows OK with 6 agents, 6 repositories and
10 roles). Nothing is reviewed OK, integrated, promoted or released.

## Next step

KO: the coder applies corrections 1–3 and submits
`A_0_0-2_to_review.md`. Production source changes are not expected unless the
new tests expose a defect.
