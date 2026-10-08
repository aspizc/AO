# A/0/04 bounded spinner correction — trial 6 handoff

Status: implemented, uncommitted, awaiting fresh independent review.
Assignment: `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49` (trial 6 follow-up).
Entry HEAD: `3c74d3fb36dad0b29aa2218f20c300572d7a2357`.
No live tool success, full gate, integration or sheet closure is claimed.

## Scope and inherited review boundary

Read [trial 5 KO](A_0_4-live-profile-5_reviewed_KO.md). It found that the
single admitted `⠦` frame rejects the newly captured `⠼` frame and stopped
before reviewing the remaining candidate. This trial fixes that blocker on
the inherited dirty trial 5 candidate. The fresh-prompt witness, README,
privacy and remaining source/tests still need complete independent review.
The [candidate manifest](evidence/A_0_4-live-profile-6-files.json) binds this
working tree; [trial 6 source delta](evidence/A_0_4-live-profile-6-source-delta.txt)
shows the two changed production lines relative to inherited trial 5.

No providers, policies, commits, pushes or subagents were invoked. Existing
trial 1–5 handoffs, verdicts and evidence remain byte-identical to HEAD (31
tracked artifacts checked); the inherited untracked trial 5 fixture also
retains its handoff hash. No previous review artifact was edited.

## Pinned primary source, finite frame set

The exact pinned primary [Codex 0.160.1 frame table](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/chatwidget/status_surfaces.rs#L31-L36)
defines ten frames: `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`. The
[frame selector](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/chatwidget/status_surfaces.rs#L1029-L1034)
indexes that table at 100 ms intervals. The
[status-line thread-title renderer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/chatwidget/thread_title_status.rs#L20-L49)
also uses the table for pending title progress (or its first frame without
animation). Source was downloaded from the same `rust-v0.160.1` raw GitHub
paths; [source provenance](evidence/A_0_4-live-profile-6-source.json) records
URLs, file hashes and the exactly verified table. The general motion helper
uses bullets and was not used to infer a braille range.

The anchored status matcher now admits precisely these ten explicit glyphs
with the same leading indentation, measured model/status prefix, path shape
and literal trailing-space tolerance. No Unicode range is inferred. Unknown
glyphs, tabs, extra text and altered indentation stay closed. Rendering
progress alone never establishes accepted work: the inherited positive path
still requires fresh exact prompt echo plus active Working, stable identity,
unchanged preceding viewport, no stale Working/echo and no intervening user
turn. The phase gate, guarded Enter protocol and maximum two Enter bound are
unchanged; this fixture path uses one Enter and refuses replay on uncertainty.

## Latest observation and privacy

The ignored root result was read locally only. Its fingerprint was retained
locally and rechecked at evidence sealing; it did not change during this task.
[Trial 6 sanitized fixtures](../../../tests/gateway/fixtures/a04_live_profiles_trial6.json)
contain the latest pre-ask, error and later snapshots for both providers.
All six captures retain the exact row counts and every literal trailing-space
count from `capture-pane -N -T`, including padded placeholder and footer rows.
Tokens use consistent same-length benign ASCII; paths and local identity are
redacted. Other private history/account/quota text is blanked while retaining
its trailing-space counts. No raw token, account, session or operator path is
published. Root records state metadata for all six captures now; this is not
inferred from trial 5. All observed cursors are `(2, 36)` at `120x40`.

Latest Codex error has prompt echo at row 17, Working at row 32, placeholder
at row 36, status ending `· ⠼` at row 38 and warnings at row 39. Working
reads 1s. Its later capture has the completed answer, without active Working;
that is not a positive marker. Claude error and later already show the
completed answer and blank padded composer; both remain uncertain. The root
calls returned `acceptance_uncertain` despite answering their markers. Fixture
simulation success is not successful live `agent.ask` execution.

The root evidence still lacks the actual pre-Enter guard snapshot and
monotonic stage timestamps. Tests simulate the intermediate draft explicitly;
its queue footer retains 97 literal trailing spaces, not a new observed draft.
The default observation delay is 1500 ms; the diagnostic later capture follows
an additional 7000 ms wait. These delays and the renderer clock do not establish
precise completion timing. The existing
[Claude operator evidence request](A_0_4-live-profile-5_operator-evidence-request.md)
remains open: record pre-CR guard and post-CR monotonic snapshots with stable
pane identity, and establish the pinned Claude fresh-turn renderer contract.
Recorded later cursor metadata alone does not resolve that request.

## TDD RED and GREEN

Before changing production code, added 22 trial 6 tests and ran:

```text
node --test tests/gateway/prompt_submission.test.js
```

[RED](evidence/A_0_4-live-profile-6-red.txt): 114 tests, 104 passed, 10 failed,
0 skipped. Nine per-frame busy/fresh-acceptance cases failed on `unknown_state`
(all frames except inherited `⠦`, including live `⠼`); the literal padded
`⠼` positive case also failed. Production source still matched the trial 5
handoff hash at RED. The test names begin `trial6 pinned frame … refuses busy
input and confirms only fresh prompt plus Working after one Enter`.

Each frame also tests zero-input busy refusal, spinner-only initial refusal,
spinner-only post-Enter uncertainty, missing/stale echo uncertainty and one
Enter without replay. Negative glyphs `⠿`, `⣿`, `*`, tab/extra-text/doubled
suffixes and changed indentation refuse. Completed later panes for both
providers remain uncertain with their actual recorded metadata. Inherited
menu/trust/decision, phase, byte-preservation and stale-work tests remain in
the focused suite.

```text
node --test tests/gateway/base_adapter.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/prompt_submission_capture.test.js
```

[Focused GREEN](evidence/A_0_4-live-profile-6-green.txt): 189 passed, 0 failed,
0 skipped. [Native captured-prompt test](evidence/A_0_4-live-profile-6-capture.txt):
1 passed, 0 failed, 0 skipped, covering 14 provider-labelled terminal-fixture
payloads on an owned tmux server with exact bytes and one guarded Enter. It
starts no provider. `git diff --check` passed. Full gate and disposable live
retry remain root-owned and were not run here.

Stop for a fresh independent reviewer to assess the complete inherited
candidate and this bounded correction. This file is a coder handoff, not a
verdict or authorization to integrate.
