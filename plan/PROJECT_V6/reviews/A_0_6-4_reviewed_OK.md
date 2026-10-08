# Review A_0_6-4 — OK

**Task:** plan/PROJECT_V6/A/0/06.md
**Trial:** 4
**Branch:** feat/V6-A-0-06-permission-prompts (uncommitted candidate on HEAD `c0405b1dc9c19c505a61ed48e4244b4e0228baaf`; implementation baseline `7982e422577ad6dfb37ef0c7b1e3c8433735430a`)
**Commit:** none (working-tree candidate only)
**Reviewer:** independent Claude reviewer session (claude-opus-5-5); no subagent, no code or `policies/` edit, no commit/push
**Date:** 2026-10-08

## Summary

Trial 4 closes the only Trial 3 blocker (KO-1). The required `lint.gateway` lane
(`npm --prefix gateway run lint`) exits 1 with the same 12 errors on the
reconstructed frozen Trial 3 tree and exits 0 on the candidate. The delta is
exactly the three declared files. A differential check found no change in
recognizer behaviour. The focused suite (301/301), the six real pinned-tmux
guard tests and the three crash tests all pass. Verdict: **OK** for the
candidate as reviewed. Full CI and live acceptance remain root-owned and get no
credit here.

## Bound inputs

- `A_0_6-4_to_review.md` sha256
  `eded916cb253b86884d12eb4e5701b5c45bca833d45ad85c3422c7d93a31b58e`
  (read-only, 5419 bytes).
- `evidence/A_0_6-4-candidate-and-evidence-sha256.json` sha256
  `bd5c996404981df407a0324c4e53372c966ed3b9354b51652f773e9fa0ce94ee`, which
  matches the handoff. All 82 bound hashes match the working tree: 23
  candidate files, 7 new evidence files and 52 prior-trial files. The prior
  files include Trial 3 handoff `8b0961e4…7eed`, Trial 3 manifest
  `8973a648…1842` and Trial 3 KO `29a4b0d5…763b`.
- Pinned `/tmp/a06-test-bin/tmux` sha256 `6487f795…c386`.
- The 23 candidate paths match `git status`. Comparing the Trial 3 and Trial 4
  manifests gives the same path set. Only `claude_adapter.js`,
  `codex_adapter.js` and `session_prompt.js` changed, which equals the declared
  `changedFromTrial3`. Test, fixture, README, CI inventory and service hashes
  are unchanged.

## Checks

- [x] Files to create/modify: unchanged from the reviewed Trial 3. The Trial 4
      delta is exactly the three declared adapter and transport files.
- [x] Tests required: lint RED and GREEN reproduced, and behaviour suites
      reproduced GREEN (see below).
- [x] Acceptance, KO-1: the required `lint.gateway` lane is now green on the
      whole candidate, using the real lane command and not a chosen subset of
      files.
- [ ] Full gate `bash scripts/ci.sh` green: not run by this review. It is
      root-owned and gets no credit (see note C).
- [ ] Live check: operator-run and not performed.
- [x] Global invariants: English, `agents-gateway`, async approval,
      deterministic policy, `policies/` untouched (`git status`/`git diff HEAD
      -- policies` empty), no ESLint config change, no suppression, no push.

## Verified

1. **RED on frozen Trial 3.** I built a scratch tree from `git archive HEAD`
   and overlaid the 23 candidate files. I then replaced the three changed files
   with the copies in `/tmp/a06-trial2-frozen`, whose hashes equal Trial 3's
   manifest entries. All 23 files in the tree match the Trial 3 manifest
   (23/23). `npm --prefix gateway run lint` exits 1 with 12 errors, 0
   warnings: 2 `no-control-regex`, 9 `no-regex-spaces` and 1
   `no-useless-assignment`, at the same lines Trial 3 KO-1 listed.
2. **GREEN on the candidate.** `npm --prefix gateway run lint` (eslint over
   `src tests scripts`) exits 0 with no output.
3. **The diff is minimal and keeps behaviour.**
   - Every literal two-space regex run becomes ` {2}`: 2 in claude and 7 in
     codex. No other regex token changed.
   - The control-character regex is replaced by an `Array.from(...).some(...)`
     scan that rejects code units 0–8 and 11–31. The old regex had no `u`
     flag, so it tested UTF-16 code units. `charCodeAt(0)` of an astral
     character returns a surrogate (≥ 0xD800), so the accepted set is
     identical. Tab and LF are still allowed, and CR is still rejected.
     Non-string input still returns `null` before the scan.
   - In `session_prompt.js:46`, `let outcome;` drops the dead initializer.
     Every `try` exit assigns `outcome` through the
     `sent`/`refused`/`uncertain` if/else-if/else chain, or throws into the
     `catch`, which assigns it. `finally` only overrides. So `outcome` is
     always assigned before `onOutcome`.
4. **Differential equivalence.** A scratch harness imported both the old
   (frozen Trial 3) and new `recognizeCodexPrompt` and `recognizeClaudePrompt`
   and compared their JSON results over 460,672 inputs:
   - the three fixtures, all of which are recognized;
   - each fixture with every code unit U+0000–U+FFFF inserted, plus astral
     code points at a stride of 97;
   - every line re-indented with 0–5 spaces or prefixed by a tab;
   - non-string and empty inputs.

   **0 mismatches.**
5. **Focused suite.** I ran the handoff's command with the pinned
   `PATH`/`A04_TEST_TMUX`: 301 tests, 301 pass, 0
   fail/cancelled/skipped/todo.
6. **Real pinned tmux.** `session_prompt_guard.test.js` with
   `A04_TEST_TMUX=/tmp/a06-test-bin/tmux` gives 6/6 pass and 0 skipped. For
   command, trust and permission, a redraw after evidence refuses all bytes,
   and an unchanged selected one-time choice receives exactly one guarded CR.
7. **Crash.** `node tests/gateway/session_prompt_crash.test.js` gives 3/3 pass.
   The diagnostic shows:
   - received hex `0d`;
   - before recovery, `consumed:true` with
     `promptAnswer {status:"in_flight",outcome:"attempting"}`;
   - audit outcomes before recovery `["attempting"]`;
   - after recovery `not_answered`/`uncertain`/`transport_uncertain_after_restart`;
   - 0 replay inputs and 0 answered events.
8. `git diff --check` exits 0.
9. **Handoff honesty (Rule 12).** The handoff states plainly that the Trial 2
   and Trial 3 lint evidence was partial and did not cover the whole lane. It
   claims no credit for full CI or live checks.

## Findings

All green for KO-1. Non-blocking observations:

- A. The scan uses `charCodeAt(0)` per `Array.from` element, but the handoff
  calls the rejected values "code points". This is equivalent for the
  rejected range ≤ 31, as shown above. `codePointAt(0)` would match the
  wording more literally.
- B. As in Trials 1–3 (Trial 3 note E), the `.log` evidence files are
  git-ignored. The manifest binds their hashes, but the committed trail will
  contain only the `.json` evidence.
- C. Trial 3 notes A–D and F remain open and non-blocking, because Trial 4 did
  not change their behaviour. Full `bash scripts/ci.sh` with required Redis,
  and the operator's live Codex and Claude acceptance, were not run. Both
  remain required by the sheet's acceptance criteria before any
  integration claim.

## Status

Trial 4 is **OK**, as an independent review of the uncommitted candidate whose
hashes are bound above. Under the canonical status rule, A/0/06 is now
`reviewed` for this candidate only. It is not committed, integrated, promoted
or released. Root still owns the commit (explicit pathspec), the full gate with
required Redis and its skip budget, and the operator live check.

## Next step

Root commits the bound candidate and this trail, then runs `bash scripts/ci.sh`
on that commit and the operator live check. Any change to a bound file voids
this verdict for that file and needs a new trial.
