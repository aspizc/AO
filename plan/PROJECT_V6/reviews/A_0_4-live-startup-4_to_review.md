# A/0/04 — post-turn clipped Ready, trial 4

Independent Opus review requested. Uncommitted candidate on
`fecc3e510f8aa40ada1b11c69c96df329d46d960`, same session and branch. Read the
trial-3 OK verdict and relevant classifier/submission/source/fixture paths.
No self-review, commit, staging, push, policy, transport, retry, A05 recovery,
status or release edit. Immutable trial-1/2/3 review files match the entry map.
Root owns fresh review, full gate and live A05 test.

## Actual evidence and rejection phase

The operator reports a byte-identical trial-3 live source: first ask returned
the exact response, the same Codex process/session survived Gateway SIGTERM
and explicit reattach, but second ask returned `unknown_state` before paste.
The supplied raw `-N -T` readiness and refusal files are byte-identical; the
operator reports no change after 12 seconds. The coder verified file equality,
not Gateway restart, process continuity or elapsed waiting time.

The raw pane contains the static notice/header at rows 0–12, previous prompt
at 15, reply at 18, `Worked for 5s • 14:23` completion at 20, empty composer
at 36, `· R…` at the end of status row 38 and 2 warnings at 39. All 41 split
rows, trailing padding and final LF are retained. Existing `codexGap` refuses
the status: it matches neither idle cwd-only `codexLiveStatus` nor spinner
status, so `requireComposer(ready, "")` refuses before loading/pasting a buffer.
The Working profile also does not match this completed history.

Pinned `rust-v0.160.1` `status_surfaces.rs::run_state_status_text` emits `Ready`
when idle, with distinct Starting/Working/Waiting/Thinking labels otherwise.
The pinned status-surface renderer calls
`truncate_line_with_ellipsis_if_overflow`; that helper reserves one column for
U+2026. The measured ASCII cwd is 87 characters: the visible status prefix is
115 columns, full ` · Ready` would reach 123, and clipping to 120 yields
exactly ` · R…`. This trial pins only that measured spelling/geometry/cwd
length. Source URLs and SHA256 values are recorded in binding JSON (cached
pinned status files and clipping source fetched during this trial).

## Sanitization and provenance

New `codex_0_160_1_post_turn_ready.json` contains the sanitized raw ready pane,
with equal-length synthetic cwd in rows 10/38, prior prompt in row 15 and
reply in row 18. Other bytes, including greeting, time, completion and blank
padding, are raw. Both private raw hashes are recorded without filenames.

Cursor 36/2, modes and server/pane/PID metadata are reconstructed because the
raw text files contain no metadata. Draft and guard are explicit hypotheses:
new 84-character ASCII prompt at row 36, end cursor 86, warning-only footer,
otherwise unchanged Ready status/history; repeated draft is hypothetical
stability. There is no actual post-paste draft or post-second-Enter capture.
The fixture's `sourceKind` states these limits. Older fixtures and immutable
review files are unchanged. No private path, prompt, reply or credentials are
copied to public material.

## Surgical GREEN

Added `codexPostTurnPane` and one early classifier call after the existing
Working profile, before the shifted-header draft refusal. Scope is Codex only.
The profile requires exact notice/version/header/cwd/greeting predicates,
120×40, row36 cursor, 41 rows/final LF, all rows within width, the measured
87-character cwd and exact header-bound `R…` status. Its history allows only:

- one nonempty printable ASCII `› ` prompt at row 15;
- one nonempty printable ASCII `• ` assistant cell at row 18;
- row20 `Worked for` completion, bounded integer seconds and valid 24-hour clock;
- U+0020-only remaining history and gap rows.

This does not validate the model's prior answer semantics or authenticate
screen text; it recognizes the measured idle/completed composer shape.
Ready phase requires the placeholder, cursor X2 and exact shortcuts/2-warnings
footer. Draft phase requires fully visible single-line ASCII text, exact end
cursor and warning-only footer. Other phases/layouts remain closed.

Draft returns the inherited `warningDraft` marker. The unchanged submission
path consequently requires ready/pending/guard process and geometry binding,
identical pending/guard captures, unchanged ready history prefix/status,
exact requested payload and attempt zero before the atomic guarded Enter.
No retry is authorized if a post-Enter draft remains pending. No old reply,
completion or Ready label is treated as second-ask acceptance.

`submitPrompt`, `guardedSubmit`, `freshCodexWork` and tmux transport remain
byte-identical to the base; delays, polling and retry budget are unchanged.
No recovery or policy authority was added. README describes the supported
shape, source links, reconstructed draft and unobserved acceptance boundary.

## TDD RED

Six startup4 tests preceded production edits. Initial host RED on fecc3e5:
**6 tests, 3 pass, 3 intended failures**, no skips:

- `startup4 completed turn with cwd-bound clipped Ready permits exactly one guarded Enter`
- `startup4 measured empty composer and visible draft are phase and exact cursor bound`
- `startup4 prior response or unchanged draft never confirms a second ask or permits retry`

The existing test helper gained an optional prompt argument so this new ask
uses its distinct challenge without mutating shared fixture state. Prior
callers retain the same default. This was settled before behavioral RED.

Two later tests make clipping length/phase/ASCII and draft-cursor predicates
distinguishing. [Final RED](evidence/A_0_4-live-startup-4-red-final.log.gz)
combines final tests/fixtures with the exact fecc3e5 adapter in scratch:
**158 tests, 155 pass, the same 3 fail**, no skips.

```bash
python3 plan/PROJECT_V6/reviews/evidence/A_0_4-live-startup-4-checks-runner.py
```

## Verification

[Complete final focused GREEN](evidence/A_0_4-live-startup-4-green-complete.log.gz):
**307 pass, 0 fail, 0 skipped/cancelled/todo**, exit 0, Node v22.22.1 and pinned
tmux 3.6a-agents.3. Includes disposable atomic transport tests, all adapter,
submission/Claude regressions and public error/docs checks. The earlier
`green-final.log.gz` was archived while this run was still in progress and is
partial; it is retained for traceability and is NOT counted as completed
verification. The linked complete log was archived only after process exit.

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/guarded_paste.test.js tests/gateway/guarded_submit.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
npm --prefix gateway run lint
python3 scripts/ci_gate.py --refresh-inventory
python3 scripts/ci_gate.py --validate-only
python3 scripts/check_public_hygiene.py
git diff --check
```

All exit 0. Refresh leaves manifest unchanged; refresh/validate execute
**0 suite tests**. Hygiene has 0 findings, supplemented by exact private-literal
screening of new untracked artifacts. Full `bash scripts/ci.sh` and new live
provider runs are not performed by this coder.

[Mutation results](evidence/A_0_4-live-startup-4-mutations.json): all **23**
single-guard removals fail relevant tests, scratch only. New profile mutations
cover geometry, cursor row, capture, width, header, cwd length, Ready status,
prior-prompt/response/completion cells, blank history, gap, ready cursor,
placeholder, ready footer, draft ASCII/cursor/footer and phase. Retained
warning-draft mutations cover first Enter, capture equality, process binding
and ready prefix. No surviving mutant is counted as killed.

Tests assert emitted bracketed paste and exactly one guarded CR, no send-keys,
no leaked buffers, no paste on initial busy/menu/history/shape refusal and no
Enter on changed payload/process/history/padding/footer. A shorter matching
cwd/status pair cannot imitate this clipping profile. Tab/NBSP/over-width,
extra/incomplete history and altered clocks remain closed. The old raw ready
pane or an unchanged draft after Enter remains `acceptance_uncertain`.

## Exact files and remaining limit

- `gateway/src/adapters/base_adapter.js`: post-turn Ready/draft classifier only.
- `gateway/README.md`: supported shape and evidence/acceptance boundary.
- `tests/gateway/prompt_submission.test.js`: optional helper prompt argument and eight startup4 tests.
- `tests/gateway/fixtures/codex_0_160_1_post_turn_ready.json`: sanitized raw ready/refusal binding and reconstructed draft/metadata.

New immutable files are this handoff and `evidence/A_0_4-live-startup-4-*`,
enumerated and hashed in the file map/seal. Binding pins base/candidate source,
private raw hashes, pinned upstream source hashes and unchanged guarded
transport/submission/freshness helpers. Prior review entry hashes remain intact.

This proves conditional safe recognition and one Enter for a matching stable
post-paste draft, not actual second-ask acceptance. A real draft/footer/status
transition after paste remains unobserved and may still refuse. Only one
completed single-line ASCII turn, the specified completion format, exact
notice/greeting/cwd clipping and geometry/footer are supported. Additional
turns, wrapped or non-ASCII history, other cwd lengths/status variants and
completed-only acceptance are not generalized. The profile grants no reattach
authority; root must run the fresh reviewed candidate through real A05 recovery
and second ask. No release, promotion or sheet-status claim is changed.
