# A/0/04 bounded live-profile correction 2 — independent review verdict: OK (source only)

Review task: `ts-062956ce-3630-4601-a9d1-239ad0abb8d2`.
Handoff: [A_0_4-live-profile-2_to_review.md](A_0_4-live-profile-2_to_review.md)
(correction assignment `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, trial 2 follow-up).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `83a5bbae39ba67372545a0ddbad2ad84b3a50154`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

This is a **source-only** review of the bounded diff. It does not cover the
whole sheet. I did not edit any candidate source, test, fixture, policy, prior
verdict or evidence file. I did not stage, commit or push anything. I used no
subagents, provider processes, provider accounts or live panes. Every result
below comes from this session's own commands.

This verdict does not establish any of the following:

- successful live Codex or Claude submission, post-paste metadata, busy
  rendering or acceptance timing
- the full gate (`bash scripts/ci.sh`), which I did not run
- integration
- closure of A/0/04

The root still owns those items, as the handoff states.

## Candidate identity

- `A_0_4-live-profile-2-files.json` binds six paths. I recomputed SHA-256 on
  disk: 6 of 6 match (`base_adapter.js`, `prompt_submission.test.js`,
  `a04_live_profiles_trial2.json`, `gateway/README.md`, RED log, GREEN log).
- Dirty tracked paths are only `gateway/README.md`,
  `gateway/src/adapters/base_adapter.js` and
  `tests/gateway/prompt_submission.test.js`. Untracked paths are the new
  fixture, the handoff and three evidence files. `policies/` is untouched.
- Trial 1 handoff, verdict, evidence directory and
  `a04_live_ready_profiles.json` show no diff against HEAD.
- `git diff --check` passes.

## Reproduced verification

- Focused command from the handoff, on the host: exit 0,
  **143 tests, 143 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**.
- `node --test tests/gateway/prompt_submission.test.js` alone:
  **68 passed, 0 failed, 0 skipped**. The test diff only appends; no existing
  test changed.
- RED reproduced on a scratchpad copy with the HEAD `base_adapter.js` and the
  candidate tests: **68 tests, 64 passed, 4 failed** — exactly the four named
  trial 2 tests (63–66). This matches the RED log and handoff.

## Mutation probes

Run on a scratchpad copy; the worktree was not modified. Counts are failures in
`prompt_submission.test.js` against the candidate tests.

| Mutation in `base_adapter.js` | Result |
|---|---|
| Revert Codex `warnings?` to `warnings` | 2 fail (caught) |
| Loosen Codex label to `warnings?.*` | 1 fail (caught) |
| Claude status-row regex accepts any row | 2 fail (caught) |
| Claude status-row path allows relative paths | 1 fail (caught) |
| Drop the shorter auto-mode footer check in the status branch | 1 fail (caught) |
| Require the agents suffix in the status branch | 3 fail (caught) |
| Drop the Claude `liveIdle` 120x40 guard | 2 fail (caught) |
| Drop the trailing-blank-rows check | 2 fail (caught) |
| Drop the Claude exact cursor/draft-length check | 2 fail (caught) |

## Source findings

1. **Codex (PASS).** The only change is `warnings` → `warnings?` inside the
   existing anchored footer expression. Numeric count, padding tolerance, the
   measured status-row precondition, 120x40 geometry and composer checks are
   unchanged. Near misses (`warning` without count, `warningz`, `f3`,
   unrecognized status) refuse.
2. **Claude Code (PASS).** The original blank-gap/full-footer branch is kept
   verbatim. The new branch requires, together, an anchored ASCII
   `  user@host:/absolute/path` row directly after the bottom border and the
   exact shorter `⏵⏵ auto mode on (shift+tab to cycle)` footer, still under
   120x40 and the trailing-blank requirement. Mismatched footer pairs,
   relative paths, empty status, unknown overlays, cursor drift, changed height
   and non-zero pane modes refuse. The status row grants no path, account,
   provider or approval authority; provider remains the caller's explicit
   argument (Rule 5).
3. **Submission behavior (PASS).** Acceptance logic, retry bound, decision
   detection, transport and policy are unchanged. Tests assert emitted inputs:
   one framed paste plus at most two guarded CRs ending `not_submitted`;
   disappearance after one CR gives `acceptance_uncertain` with no retry;
   post-paste decision or unknown status yields one paste and zero CRs;
   menu/trust/busy/unknown refuse with no input and no `load-buffer`.
4. **Fixtures and privacy (PASS).** The fixture records provenance and states
   that no post-paste metadata was observed; post-paste `cursorX` is labeled as
   derived. A scan of the fixture, logs and handoff for home paths, operator
   identity, account and token/session markers found nothing. I did not read
   the ignored root raw result.
5. **README (PASS).** Labels the capture as readiness rendering only, states
   derived cursor values and that no live acceptance was observed, and keeps
   A/0/04 open.

## Non-blocking observations

- The Claude status-row character class excludes spaces and `~`; such
  layouts fail closed as `unknown_state`, which is the safe direction.
- The status-row branch is not limited to post-paste, so a pre-ask placeholder
  with that status row would also classify as ready. This only affects
  readiness; acceptance remains unproven and guarded. Root live verification
  should confirm.

## Verdict

**OK — source-only review of the bounded trial 2 live-profile correction.**
Not a live acceptance, full-gate, integration or sheet-closure verdict.
