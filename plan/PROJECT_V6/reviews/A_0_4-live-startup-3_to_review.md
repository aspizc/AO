# A/0/04 — startup-notice Working witness, trial 3

Independent Opus review requested. Uncommitted candidate on
`82f8e7455faec213edf054f70e3e47ffab1406a4`, same session and branch. Read the
immutable trial-2 OK verdict and A/0/04 before implementing. No self-review,
commit, staging, push, policy, A05 recovery, status or release edits. Immutable
trial-1/2 review files are byte-identical to the entry map. Root owns fresh
independent review, full gate and real A05 acceptance.

## Evidence and rejection phase

Operator supplied four complete raw `tmux capture-pane -p -N -T` text captures
after a Gateway failure on the byte-identical trial-2 base adapter
`a470283858303e7e4fdd3b21515d4c7ea495662ba3b3399915de34993a05da62`.
Exactly one guarded Enter and exact cleanup were operator-reported. These
captures were read locally; private paths and challenge text are not copied.
Their full-byte SHA256 values bind the new fixture and binding JSON.

Captures 0/1 contain header row 9, cwd row 10, padded greeting row 12, one
challenge echo at row 15, `• Working` at row 33, padded placeholder composer
at row 36, spinner/cwd status at row 38 and shortcuts/warnings at row 39.
They have 41 split rows with a final empty LF slot. Working clocks are 1s/2s.
The trial-2 classifier's early shifted-header check permits only a warning-only
draft. This post-Enter frame is not that draft, so the observation is
`unknown_state` and the caller reports `acceptance_uncertain`. The inherited
welcome Working recognizer independently pins header row 1, so it cannot
recognize the row-9 frame either. The delayed captures establish a renderable
Working layout, not what was visible at the bounded acceptance observation.

Capture 2 has `◦ Working (3s…)`, and capture 3 has a completed assistant
response. Both are negative fixtures in this trial. No completed-only,
circle-glyph, polling, delay, retry or warmup extension is included.

## Sanitized fixture and provenance

New `codex_0_160_1_update_welcome_working.json` retains all four raw snapshots,
row positions, row lengths and final LF. Only cwd in rows 10/38, challenge at
row 15 and completed response at capture-3 row 18 are replaced with equal-length
synthetic text. Notice, header, greeting, blank-cell padding, Working clocks,
spinner glyphs, placeholder and footer remain raw.

Pre-Enter ready/draft/guard are explicitly reconstructed from capture 0:
row 15 is blanked, row 33 cleared, row 38 made idle; the draft composer and
warning-only footer are reconstructed. Repeating the draft for the guard is
hypothetical stability, not a real guard capture. Cursor 36/2 after Enter,
modes and server/pane/PID metadata are reconstructed because capture-pane text
files do not contain those fields. Same-target binding is synthetic. The
fixture's `sourceKind` states these limits. No successful live acceptance on
this candidate is inferred from this reconstruction.

Per the trial-2 reviewer observation, the original trial-1 candidate fixture's
`sourceKind` now explicitly says its transcript-derived reconstruction omitted
raw trailing-space padding, including rows 11/12/38, and is not a raw `-N -T`
capture. No snapshot bytes changed in that original fixture. It is mutable
candidate test data, not an immutable review artifact. Trial-2 fixture and all
old handoff/evidence/verdict files remain unchanged.

## Surgical implementation

`base_adapter.js` adds `codexUpdateWelcomeWork`, evaluated before the
shifted-header draft refusal. It recognizes only:

- 120×40, cursor row 36/X2, 41 rows/final LF, all rows within pane width;
- the exact static notice/version/header/cwd and pinned 88-greeting slot;
- one printable ASCII user-history cell at row 15, strict `• Working` at
  row 33, U+0020-only remaining history/gaps, empty placeholder at row 36;
- source-backed spinner status with the exact header cwd and exact measured
  shortcuts/2-warnings footer.

The common notice/header/greeting predicates move into
`codexUpdateWelcomeHeader`, shared with the unchanged draft semantics. The
new busy classification sets the existing `welcomeWork`/`modernWork` markers
and workRow 33. It then reuses the existing `freshCodexWork` proof: first Enter,
every frame bound to the same server/pane/PID/geometry, no prior Working,
exactly one new exact prompt echo at row 15, blank insertion cell, unchanged
preceding rows, and no intervening history. A matching busy pane refuses
initial input in both phases.

`submitPrompt`, `guardedSubmit`, `freshCodexWork` and tmux transport are
byte-identical to the base. There is no first-Enter, retry, poll, delay,
cleanup or audit change. The tests observe literal bracketed paste and one
`agents-submit-v1`/CR, no `send-keys`, no leaked owned buffers, and no Enter
on pre-submit refusals. Gateway README documents the new recognition boundary
and delayed/reconstructed evidence limits.

## TDD RED

Six startup3 tests preceded production changes. Host RED on 82f8e74:
**6 tests, 4 pass, 2 intended failures**, no skips:

- `startup3 raw fresh update welcome Working confirms the exact prompt after one guarded Enter`
- `startup3 measured Working refuses initial input in every phase`

The remaining negative tests pass on the refusing base and are not credited
as distinguishing RED. After GREEN, direct malformed-envelope/absent-echo
assertions were added for mutation confidence.

[Final baseline RED](evidence/A_0_4-live-startup-3-red-final.log.gz) runs final
tests/fixtures with the exact `82f8e74` base adapter in scratch: **150 tests,
148 pass, the same 2 fail**, no skips. RED source SHA is bound in results.

```bash
python3 plan/PROJECT_V6/reviews/evidence/A_0_4-live-startup-3-checks-runner.py
```

## GREEN and checks

[Final focused GREEN](evidence/A_0_4-live-startup-3-green-final.log.gz):
**299 pass, 0 fail, 0 skipped/cancelled/todo**, exit 0, Node v22.22.1 and
pinned tmux 3.6a-agents.3. Includes real disposable atomic transport tests,
all submission/adapters/Claude regressions and public error/docs checks.

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/guarded_paste.test.js tests/gateway/guarded_submit.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
npm --prefix gateway run lint
python3 scripts/ci_gate.py --refresh-inventory
python3 scripts/ci_gate.py --validate-only
python3 scripts/check_public_hygiene.py
git diff --check
```

All exit 0. Inventory remains unchanged; refresh/validate each run **0 suite
tests**. Hygiene has 0 findings, supplemented by exact private-literal screening
of new untracked fixture/review artifacts. Full `bash scripts/ci.sh` and new
live provider acceptance are not run by this coder.

[Mutation results](evidence/A_0_4-live-startup-3-mutations.json): **18 removals
run, 17 detected, 1 surviving inherited conjunct**, all in scratch. All 13
new layout mutations fail relevant tests: geometry, cursor, capture envelope,
width, header, echo shape, Working, blank history, placeholder, gap, spinner,
cwd/status and footer. Four inherited freshness mutations are killed: after
process binding, first Enter, prior Working and prefix equality.

The isolated inherited `new-echo` removal survives. The strict startup draft
already excludes history, and the blank insertion/prefix checks overlap this
predicate for these layouts. It is **not claimed independently tested or
globally redundant**; it remains byte-identical and is not removed. The first
runner ended with an assertion failure on this survivor. The final runner
explicitly checks and reports that sole survivor rather than counting it as
killed. No production change was made to hide the result.

## Exact changed files and limits

- `gateway/src/adapters/base_adapter.js`: shared header extraction and new busy profile only.
- `gateway/README.md`: profile and verification-boundary paragraph.
- `tests/gateway/prompt_submission.test.js`: eight startup3 tests.
- `tests/gateway/fixtures/codex_0_160_1_update_welcome_working.json`: four sanitized raw post-failure captures and labelled pre-Enter reconstructions.
- `tests/gateway/fixtures/codex_0_160_1_update_welcome_draft.json`: provenance clause only, snapshot bytes unchanged.

New immutable files are this handoff and `evidence/A_0_4-live-startup-3-*`,
enumerated and hashed by the file map/seal. Binding JSON records base/candidate
source SHA, all raw capture hashes and unchanged submission/freshness guards.
The prior-review entry hash map proves old review artifacts are intact.

This is a conditional fixture-level acceptance proof for captures 0/1 if that
layout is observed within the existing window with the required fresh binding.
It does not establish the current candidate's live timing, actual guard frame,
process attestation from screen text, or A05 acceptance. Identical forged
renderings and changes that revert between captures remain outside the
inherited transport provenance guarantee. Circle Working and completed-only
responses remain uncertain. Root owns fresh Opus review and the actual live
A05 acceptance run; no release or sheet-status claim changes here.
