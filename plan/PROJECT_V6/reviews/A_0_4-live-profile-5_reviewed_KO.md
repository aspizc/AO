# A/0/04 bounded live-profile correction 5 — independent review verdict: KO

Review task: `ts-add586d5-28a3-4bf4-b58f-7beb754c8131`.
Handoff: [A_0_4-live-profile-5_to_review.md](A_0_4-live-profile-5_to_review.md)
(correction assignment `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, trial 5 follow-up).
Branch `feat/V6-A-0-04-safe-submit`, HEAD `a5d061c18b9d65ade3cbbd5d120610b39c58af6d`.
The candidate is an uncommitted working-tree diff.
Reviewer: Claude reviewer session, separate from the coder. Date: 2026-10-08.

## Scope

The operator told me to check one blocker first: whether a new real Codex
spinner frame breaks the trial 5 classifier. If it did, I was to record KO
and stop. It did, so this verdict covers only that finding. I did not finish
the rest of the review. I did not check the fresh-echo witness logic, the
README, the full test reproduction or the fixture privacy scan. A KO here
does not mean the rest of the diff passed.

I did not edit any candidate source, test, fixture, policy, prior verdict or
evidence file. I did not stage, commit or push anything. I used no subagents,
provider processes or live panes. I read the ignored root result
`workspace/root-a04-live-acceptance-result.json` locally only. No raw pane
text, token, session, account or path value from it appears in this file.

Candidate binding: the SHA-256 values of `gateway/src/adapters/base_adapter.js`
(`92b154a2…`), `tests/gateway/prompt_submission.test.js` (`b038564b…`),
`tests/gateway/fixtures/a04_live_profiles_trial5.json` (`326ca1d3…`) and
`gateway/README.md` (`f0088526…`) match
[evidence/A_0_4-live-profile-5-files.json](evidence/A_0_4-live-profile-5-files.json).

## Blocking finding — the single admitted spinner frame does not match the real captures

The candidate adds `codexSpinnerStatus`, which matches only the glyph `⠦`:

```js
const codexSpinnerStatus = /^  GPT-6\.1-Sol medium fast · \S+ · ⠦ *$/;
```

That pattern feeds both `codexGap` and the new `modernWork` busy
classification. `freshCodexWork` requires `modernWork` from that
classification for the new Codex acceptance witness.

The ignored root result was rewritten at 02:20:35. That is after the handoff
(02:19:42) and after the candidate hash file (02:19:56). Its current SHA-256 is
`3e268695d3c77462734a998c3c8b3dea0e528e87fb4cfcd68a7de5a66ed10110`. In the new
Codex error capture, the Working row is at row 32, the prompt echo at row 17
and the placeholder composer at row 36. Pane state is `2|36|120|40`, the same
layout as the trial 5 fixture. The status row (row 38) ends in `· ⠼`, not
`· ⠦`. The braille spinner animates, so the captured frame depends on when
the capture happens. Admitting one observed frame is not a stable profile.

Reproduction (scratch script, read-only, no provider): the trial 5 fixture's
Codex error snapshot and pane metadata, with only the spinner glyph replaced,
passed to `classifyProviderPane("codex", …)`:

| Glyph | `ready` phase | `draft` phase |
|---|---|---|
| `⠦` (fixture) | `busy`, `modernWork: true`, `workRow: 32` | same |
| `⠼` (new real root capture) | `unknown_state` | `unknown_state` |
| `⠋`, `⠴` (other frames) | `unknown_state` | `unknown_state` |

Consequences:

1. The handoff says that after one CR, Codex reaches positive acceptance on
   the measured layout. On the newest real capture, the post-CR `draft`
   observation is `unknown_state`, so `freshCodexWork` is never reached.
   `agent.ask` still fails with an uncertain-submission error. The new
   witness only works when the spinner happens to show the one admitted frame.
2. The handoff says busy is classified "with or without the measured spinner
   suffix". That holds only for `⠦` or no suffix. Any other real frame makes
   the pane unknown, not busy. This direction refuses input, so it is safe,
   but the claimed busy classification does not hold.
3. The handoff says "no evidence drift occurred during this task". The root
   result changed one minute after the handoff, so the trial 5 fixture no
   longer represents the latest real capture. This may be a root rerun after
   the coder finished. Either way, the evidence base for trial 5 is stale.

The trial 5 tests pass because the fixture contains only `⠦`. No test
uses another real spinner frame, so a test that should fail on this gap does
not exist (Rule 9).

## Required for the next trial

- Derive the admitted spinner set from the pinned Codex 0.160.1 source
  (the status/spinner frame table), not from one capture. Add a test for
  every frame, plus a test that a non-spinner suffix stays `unknown_state`.
- Re-fingerprint the root result. Sanitize the new `⠼` capture into a fixture,
  using the same marker-replacement and trailing-space rules as before. Run
  the acceptance path on it.
- Keep the spinner as rendering evidence only. It must never become an
  acceptance witness on its own.

## Verdict

**KO.** Trial 5 is not accepted. The remaining review items are unchecked.
Trial 5 artifacts stay immutable; corrections go in trial 6.
