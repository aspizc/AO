# A/0/04 bounded live-profile correction 3 — independent review verdict: KO

Review task: `ts-db57ec50-7481-4bdc-9753-2727f0cf587d`.
Handoff: [A_0_4-live-profile-3_to_review.md](A_0_4-live-profile-3_to_review.md)
(correction assignment `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, trial 3 follow-up).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `0edb75e5d06d3e4a16f78cebe404a4bffbedd5c7`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

The operator scoped this review to one check first: the trailing-space blocker
in `tmux capture-pane -N -T`. If that blocker was confirmed, the instruction was
to record KO and stop. It was confirmed, so this verdict is limited to that
one blocking finding. I did not complete the rest of the review: phase wiring,
the full test reproduction, and the privacy scan of the fixture were not
checked. A KO here does not mean the rest of the diff passed.

I did not edit any candidate source, test, fixture, policy, prior verdict or
evidence file. I did not stage, commit or push anything. I used no subagents,
provider processes or live panes. I read the ignored root result
`workspace/root-a04-live-acceptance-result.json` locally only. No raw pane
text, token, session or account value from it is reproduced here.

Candidate binding: SHA-256 of `gateway/src/adapters/base_adapter.js` is
`a0d957544f2f7e542ce0d833c35c8cd83d83f1844aca1747d2c96cd5a5515245` and of
`tests/gateway/fixtures/a04_live_profiles_trial3.json` is
`d701b65bc77723c63d3de28cf520720e082e255218df61f4ae4b518dc3f48bbf`.
Both values match `evidence/A_0_4-live-profile-3-files.json`.

## Blocking finding — the queue footer match cannot match a real capture

**Code path.** The submit observation captures panes with
`capture-pane -b <buffer> -N -T` (`gateway/src/adapters/tmux_client.js:48`).
`-N` keeps trailing spaces in the capture. The candidate recognizes the Codex
queue footer by exact string equality,
`rows[footer] === codexQueueFooter`, where the constant is
`"  tab to queue message"` (22 chars). The same exact equality is used in
`codexGap`, `activeDecision` and `classifyProviderPane`.

**Observed data.** In the root's raw Codex `errorPane` (tmux 3.6a, 120x40),
row 39 contains the queue footer text followed by 97 trailing spaces, for a row
length of 119. The trial 3 fixture stores that row trimmed to exactly 22 chars.
The handoff says the fixture "retain[s] exact relevant row positions and footer
text/padding", but for this row it does not keep the padding.

**Reproduction** (local probe script, not committed). I called
`classifyProviderPane("codex", snapshot, pane, "draft")` with the trial 3
fixture's `error` observation:

- fixture as committed (row 39 trimmed): `{"state":"composer", ...}`
- the same fixture with row 39 padded to 119 chars, as observed:
  `{"state":"unknown_state"}`

**Impact.** On the real captured pane, the queue footer is never recognized.
The post-paste `draft` observation still refuses with `unknown_state`, which is
the exact live failure this trial was meant to fix. The new tests pass only
because the fixture deviates from the observed capture, so they would not catch
this defect (AGENTS.md Rule 9). The Codex correction is unverified against its
own evidence, and the handoff's claim about preserved padding is inaccurate
(Rule 12).

**Required correction (next trial).**

- Keep the observed trailing padding in the sanitized fixture row. This should
  apply to every row where the raw capture has trailing spaces, unless the
  handoff gives a reason to drop them.
- Match the footer tolerantly of trailing spaces only. For example, test
  `row.trimEnd() === "  tab to queue message"`, or use an anchored regex with
  `\s*$` like the existing `codexContextFooter`. Leading indentation must stay
  exact.
- Add a test that fails on the current exact-equality code with the
  observed-padding row.

Also check whether the Claude full auto-mode footer branch is affected the same
way. In the raw Claude panes the footer row has no trailing spaces, and that
branch compares `.trim()`, so I found no defect there. I did not check it beyond
that.

## Verdict

**KO.** The next correction goes in trial 4 (`A_0_4-live-profile-4_to_review.md`).
This verdict covers the source only. It makes no claim about integration, the
full gate, live acceptance or closure of A/0/04.
