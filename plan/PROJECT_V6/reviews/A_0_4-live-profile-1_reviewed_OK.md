# A/0/04 bounded live-profile correction 1 — independent review verdict: OK (source only)

Review task: `ts-1a1b070b-dab2-4927-9342-fa0a4901b9e9`.
Handoff: [A_0_4-live-profile-1_to_review.md](A_0_4-live-profile-1_to_review.md)
(correction assignment `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `50815b4cf4cf111ab3746bfe52c06a7fde7f738e`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

This is a **source-only** review of the bounded diff. It does not cover the
whole sheet. I did not edit any candidate source, test, fixture, policy, prior
verdict or evidence file. I did not stage, commit or push anything. I used no
subagents, provider processes, provider accounts or live panes. Every result
below comes from this session's own commands.

This verdict does not establish any of the following:

- successful live Codex or Claude submission, busy rendering or acceptance timing
- the full gate (`bash scripts/ci.sh`)
- integration
- closure of A/0/04

The root still owns those items, as the handoff states.

## Candidate identity

- `A_0_4-live-profile-1-files.json` binds six paths. I recomputed SHA-256 for
  all six on disk and found 6 of 6 matches:
  - `base_adapter.js`
  - `prompt_submission.test.js`
  - `a04_live_ready_profiles.json`
  - `gateway/README.md`
  - the RED log
  - the GREEN log
- The only dirty tracked paths are `gateway/README.md`,
  `gateway/src/adapters/base_adapter.js` and
  `tests/gateway/prompt_submission.test.js`. The untracked paths are the
  fixture, the handoff and three evidence files. `policies/` is untouched.
- `git diff --check` passes.

## Reproduced verification

- I ran the focused command from the handoff on the host. Result: exit 0,
  **137 tests, 137 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**.
- I ran `node --test tests/gateway/prompt_submission.test.js` alone. Result:
  **62 tests, 62 passed, 0 failed, 0 skipped**. The test diff only appends
  tests; no existing test was changed.
- The RED log ends with 60 tests, 55 passed and 5 failed. This matches the
  handoff's TDD RED claim.

## Mutation probes

I ran these on a scratchpad copy. The worktree was not modified.

| Mutation in `base_adapter.js` | `prompt_submission` result |
|---|---|
| Remove the Codex warnings-footer 120x40 geometry guard | 1 fail (caught) |
| Remove the requirement that the row before the warnings footer is the measured status row | 1 fail (caught) |
| Remove the Claude `liveIdle` 120x40 geometry guard | 1 fail (caught) |
| Remove the Claude check that rows after the auto-mode footer are blank | 1 fail (caught) |
| Remove the Claude check that the gap row is blank | 1 fail (caught) |
| Drop the inner `codexLiveStatus.test(row)` term in `codexGap` | 0 fail — **equivalent mutant**: the guard on the first line already requires `rows[footer-1]` to be the status row whenever the warnings footer is present |

## Source findings

1. **Codex (PASS).**
   - `codexGap` widens the post-cursor gap in only one case: the exact
     warnings footer plus the exact `GPT-6.1-Sol medium fast · <path>` row
     directly above it.
   - When the context footer is present, the predicate is exactly the old
     condition that every row is blank.
   - `activeDecision` and the composer classifier use the same predicate.
   - The warnings-footer layout is refused unless the pane is 120x40.
   - The status row is matched only as rendering. Provider is still the
     caller's explicit argument, so there is no provider or policy inference
     (Rule 5).
   - Busy detection and the placeholder rule are unchanged.
2. **Claude Code (PASS).**
   - `liveIdle` requires all of the following:
     - a 120x40 pane
     - an empty row right after the bottom border
     - the exact auto-mode footer string
     - blank rows after that footer
   - The existing composer, cursor, ASCII, placeholder and blank-editor
     checks still run.
   - The source profile's trailing-blank check is kept for `? for shortcuts`
     and for busy panes.
   - `busy` needs the footer `esc to interrupt`, while `liveIdle` needs an
     empty footer row. So the new layout can never be classified as `busy`.
     This means `submitPrompt` cannot report success from this layout. It can
     only return `composer`, then `not_submitted` or `acceptance_uncertain`.
     A false acceptance claim is therefore impossible here.
3. **Fixture and documentation (PASS).**
   - The fixture holds only sanitized rows and metadata. A grep for home
     paths, user name, email, `sk-`, token, session id and quota found
     nothing in the fixture or the logs.
   - The README addition labels the captures as readiness only and says that
     live submission, busy rendering and timing are still unverified. This
     labels built versus unverified explicitly, as Rule 14 requires.
4. **Invariants (PASS).**
   - Everything is in English.
   - No stdout logging was added.
   - The approval flow is untouched.
   - No `orchestrator/` component was added.
   - The MCP server name is unchanged.
   - Nothing was pushed.

## Non-blocking observations (not corrections)

- **Pre-input busy check in the measured Claude layout is unproven.** Before
  input, the new layout is refused as busy only if a busy Claude 2.1.293 also
  changes the auto-mode footer. That is true in the source profile, but
  nobody has measured it for this layout. If busy Claude kept the exact
  auto-mode footer with a placeholder, the pre-input check would classify the
  pane as `composer` and paste. After the CR, the result can only be
  `not_submitted` or `acceptance_uncertain`, never false success.
- **The Claude "busy" case in the new test is not a busy version of the
  measured layout.** It rewrites the pane into the source-profile busy layout
  (`esc to interrupt` footer). The handoff discloses this.

The root's live busy and acceptance capture should confirm or close both
observations.

## Verdict

**OK** for the bounded live-profile source correction, source-only scope.
The root keeps live acceptance, the full gate, integration and closure of
A/0/04.
