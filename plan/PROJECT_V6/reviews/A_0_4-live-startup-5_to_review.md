# A/0/04 — second-turn post-Enter confirmation, trial 5

Independent Opus review requested. Uncommitted candidate on
`3504b498b58c8ba98d3321da57ad77a305a4e65f`, same branch/session.
Candidate `base_adapter.js` SHA256:
`bc039cb5fbdbb29dc6bd90cba66c0596043acc70a934201b04184dd10b3699e7`.
The [binding](evidence/A_0_4-live-startup-5-binding.json),
[file map](evidence/A_0_4-live-startup-5-files.json) and
[seal](evidence/A_0_4-live-startup-5-handoff-seal.json) identify the exact bytes.
No commit, staging, push, delegation or self-review. Root owns fresh independent
review, full gate and repeat live A05 acceptance. All 54 prior trial-1–4
handoff/verdict/evidence files in the entry map remain byte-identical.

## Evidence and exact rejection phase

The operator reports the byte-identical trial-4 candidate passed the first
ask, Gateway SIGTERM restart and explicit same-principal/repo/session reattach.
The second ask sent exactly one guarded Enter and produced the exact reversed
nonce ACK, but Gateway reported `acceptance_uncertain`. The operator reports
exact-owned cleanup and unchanged protected inventory. These live assertions
were not reproduced by the coder.

The coder inspected five supplied raw `tmux capture-pane -p -N -T` files:
readiness plus four post-second-Enter captures. Each has 41 split rows including
the final empty row. The static notice/header remains at 0–12; old prompt,
reply and completion remain at 15, 18 and 20. The new prompt appears at 23.
Capture 0 has `• Working` at 33, empty placeholder composer36, clipped `R…`
status38 and shortcuts/2-warnings footer39. Capture 1 has only the literal
`• ACK:` prefix at 26 and no completion. Captures 2 and 3 are byte-identical:
new reply26, completion28, no Working, unchanged empty composer/footer/status.
Raw SHA256 values, without private filenames, are in the fixture and binding.

On 3504b49, `codexUpdateWelcomeWork` requires all history except first echo15
and Working33 to be blank, so echo23 invalidates that witness.
`codexPostTurnPane` requires history except 15/18/20 to be blank, so it also
refuses. The shifted-header draft check refuses the clipped status variant;
the observation is `unknown_state`. After the already successful
`guardedSubmit`, the existing confirmation path cannot accept it and throws
`acceptance_uncertain`. This is post-Enter confirmation failure, not failure
to paste or authorize Enter. No manual Enter, warmup or new timing is used.

## Provenance and source binding

`codex_0_160_1_second_turn_confirmation.json` retains raw row positions, lengths,
U+0020 padding and final LF. The 87-character cwd in rows10/38 and private
prompts/replies in rows15/18/23/26 are replaced with equal-length synthetic
fields. Partial response26 retains the literal six-character prefix and its
63 trailing spaces. Greeting and completion clocks remain raw. Sanitization
is deterministic and does not copy private paths, nonces or credentials.

The raw files do not attest modes, cursor or server/pane/process metadata.
Those fields are explicit reconstructions: cursor36/2, 120×40, normal modes,
synthetic stable server/PID/pane. Draft and repeated guard are hypothetical
reconstructions from ready: row36 contains the new 84-character ASCII prompt,
row39 warning-only footer, cursorX86; all other bytes remain identical.
`sourceKind` states these limits. No old fixture or prior review artifact was
touched, including trial-1 provenance as clarified in trial 3.

Pinned `rust-v0.160.1` sources were read and hash-bound:

- `history_cell/messages.rs`: `UserHistoryCell` prefixes user cells with `› `;
  assistant/streaming history prefixes the first line with `• `.
- `history_cell/separators.rs`: `FinalMessageSeparator` produces the indented
  elapsed-work and clock label with the ` • ` separator.
- `chatwidget/completion.rs`: the completion cell uses the turn duration and
  completion timestamp, with live fallback and per-thread turn-ID deduplication.
- Trial-4 pinned status/clipping sources remain referenced in binding JSON.

The row positions come from measured raw panes, not inferred source geometry.
The visible `R…` persists even in capture 0 with Working33 and therefore is
not an acceptance signal. No ordering is inferred from clock comparisons.
These are rendered-cell proofs bound to the guarded ask, not authenticated
turn IDs or executable/version attestations.

## Surgical GREEN and limits

Added only `freshCodexSecondTurn` and its three-line Codex confirmation call
following the existing Enter/observation. It requires attempt zero, inherited
warning-draft markers, same server/pane/PID/geometry, normal modes and exact
cursor36/2. The existing trial-4 ready profile must match; it pins the
notice/version/header/cwd/greeting/status/geometry/footer and completed first
turn. Every ready/pending/guard prefix through row22 must match the new pane
byte-for-byte. There must be one exact new prompt echo at row23 and no prior
history echo of that prompt. Composer/status/footer/final LF must equal ready.
All rows must fit 120 columns.

Only two new-history shapes confirm submission:

- Working33 with all other new history rows24–35 containing U+0020 only;
- one nonempty printable ASCII assistant cell26 and bounded source-shaped
  `Worked for <seconds>s • HH:MM` completion28, with all other new history
  rows24–35 containing U+0020 only.

The completion check requires both new cells; old reply18/completion20 cannot
confirm the new ask. Reply content is lexical ASCII, not ACK semantics. A fresh
assistant reply may contain the same words as an older answer; exact ACK
validation remains the live harness's responsibility. This does not authenticate
screen text against arbitrary output from a malicious process.

The helper grants no initial readiness. Partial reply without completion,
changed old history, different/duplicate prompt, menus, misplaced/extra cells,
malformed clock, non-space/tab padding, over-width rows, process/pane/cursor/
mode/geometry drift and unknown layouts remain closed. First-turn layouts
cannot borrow this witness. The profile is limited to the measured single-line
second turn; scrolling, wrapped/Unicode replies, other clocks/layouts and a
third turn are unsupported. If the existing observation catches only the
partial frame, `acceptance_uncertain` remains the correct result. There is no
polling extension, extra observation, Enter, retry or recovery/policy change.

Removing exactly the new helper and call from the candidate reproduces the
3504b49 adapter byte-for-byte (asserted in binding generation). Thus all
classification/readiness, pre-Enter guards, atomic guarded submission,
`freshCodexWork`, transport, delay and retry logic remain unchanged.

## TDD RED / GREEN

Tests were added before production changes. Initial corrected scoped RED on
3504b49 had 5 tests, 4 pass and one intended acceptance failure. An initial
helper mistake compared against trial-3 prompt bytes; it was corrected before
that behavioral RED. The archived final RED below is the reproducible evidence,
not the initial unarchived run.

[Final RED](evidence/A_0_4-live-startup-5-red-final.log.gz) combines the exact
3504b49 adapter with final tests/fixtures in an isolated copy: **166 tests,
164 pass, 2 intended failures, 0 skipped**:

- `startup5 fresh second echo with measured Working or new completed reply confirms one guarded Enter`
- `startup5 first welcome cannot borrow second-turn confirmation and clocks remain source bounded`

The latter's positive completed variant initially exceeded 120 columns due to
incorrect test padding. Operator identified the single focused-suite failure;
it was corrected to `.padEnd(120, " ")`. The prior-prompt echo guard was never
removed. No production change was used to accommodate the invalid test row.

[Final focused GREEN](evidence/A_0_4-live-startup-5-green-complete.log.gz):
**315 pass, 0 fail, 0 skipped/cancelled/todo** with pinned tmux `.3`.
The complete command is in checks JSON. It covers adapters, supervised Codex,
guarded paste/submit, real captured synthetic composers, first-prompt and
error/projection contracts. Startup5 tests assert the exact bracketed paste,
one atomic guarded CR and no owned-buffer leak, including refusal cases after
Enter. Initial unsupported confirmation frames receive no paste.

## Mutations and other gates

The isolated [runner](evidence/A_0_4-live-startup-5-checks-runner.py) reproduces
baseline RED and 24 mutants with the final test file. Results and all full
mutation TAP logs are preserved in mutations JSON and mutation-logs JSON.gz.
**17 killed; 7 single-removal survivors retained and disclosed**:

- `capture`: exact ready tail and prefix comparisons overlap row-count/final-LF
  protection; removing capture plus tail is killed.
- `new-echo`, `unique-echo`, `prior-echo`: exact new row, strict blank slots,
  immutable prefix and prior-echo/unique-echo checks overlap. Removing new-echo
  plus unique-echo is killed by changed-payload/missing-echo tests; removing
  prior-echo plus unique-echo is killed by the old-identical-prompt test.
- `attempt`, `warning-binding`, `prompt-ascii`: inherited trial-4 draft and
  attempt-zero Enter guards constrain the call. Their individual removals
  survive this submission suite.

This is a coverage limit, not a claim that these guards are globally redundant.
All are preserved for independent assessment. Other mutants distinguish
process/modes/cursor, ready-profile scope, literal-space width, immutable
history, composer/status/footer, Working, assistant/completion and blank slots.

Exit 0: Gateway lint; inventory refresh and validate-only (each executes
**0 suite tests**, inventory unchanged); public hygiene; `git diff --check`.
New files and decompressed logs are additionally screened for exact private
cwd/prompts/replies/nonces. Prior evidence hashes match. The full root-owned
`ci.sh`, independent review and live A05 acceptance were not run by this coder.

## Exact changed files

Functional changes:

- `gateway/src/adapters/base_adapter.js` — new bounded confirmation only.
- `tests/gateway/prompt_submission.test.js` — eight startup5 tests; no prior assertion edited.
- `tests/gateway/fixtures/codex_0_160_1_second_turn_confirmation.json` — five sanitized raw frames, reconstructed draft/metadata.
- `gateway/README.md` — bounded recognition/provenance/live boundary.

This new immutable handoff and the explicitly enumerated
`A_0_4-live-startup-5-*` evidence paths are in files JSON; files JSON and its seal
are excluded from their own recursive map. No policy, A05 recovery, status,
release, review-index or prior-trial changes. No integration or release claim.
