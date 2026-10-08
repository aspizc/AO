# A/0/04 — live startup draft, trial 1

Independent Opus review requested; no verdict, commit, integration or release
claimed. Candidate is uncommitted on `b4506d26950ce7b9a6af92fc63c8c56db4daea09`.
No policy, A05 recovery, status or release document was edited. No staging,
commit, push, provider warmup, manual challenge Enter or self-review was done.

## Rejection and evidence

Read AGENTS.md, plan/README.md, Stage A README, A04/A05 sheets, the A04 review
index and relevant welcome/working, warning-draft, lint and integration review
trail. Read shared observation/classification/submission, Codex ask and its
agent-service caller, tmux transport and current fixtures before editing.

The recorded pre-ask pane has a static seven-row update notice at rows 0–6,
blank rows 7–8, Codex 0.160.1 header at row 9, cwd at row 10, blank row 11,
greeting at row 12, empty history through row 35, composer at row 36,
blank row 37, idle model/effort/cwd at row 38 and warning footer at row 39.
The pasted draft is intact, 84 ASCII characters. Its footer lacks shortcuts.
The baseline warning-only classifier requires the version header at row 1;
row 1 instead contains the notice's update version line. Replaying this layout
therefore fails `requireComposer(pending, prompt)` at the first post-paste
classification, before guard observation or `guardedSubmit`/Enter.

The private event is an after-call transcript, not a per-observation transport
trace. It establishes the refused rendered layout and pasted text, but cannot
prove every intermediate frame or the atomic runtime's refusal reason. Cursor
X=86/Y=36 and final capture LF are reconstructed from the supplied intact draft
and capture convention; they are NOT recorded fields of that transcript event.
The ready cursor X=2 is also reconstructed. Runtime was operator-reported
pinned tmux 3.6a-agents.3, Codex 0.160.1, gpt-6.1-sol medium, 120×40.

The new fixture preserves all 40 row positions and row lengths, exact notice
and footer bytes, and prompt length; cwd, nonce and process/pane IDs are
synthetic. Same-frame binding relationships are retained, not live attested.
No private pathname, challenge nonce or credential is included in public work.
The fixture and [source binding](evidence/A_0_4-live-startup-1-source-binding.json)
carry the SHA256 of the private evidence file, without its name or contents.
Source URLs and complete fetched-file SHA256 values pin the renderer,
notice history cell, greeting selector and greeting definitions to
`rust-v0.160.1`.

## GREEN scope and safety

Production changes are only in `gateway/src/adapters/base_adapter.js`:

- Recognize this exact static notice, version and shifted header layout only
  as a post-paste warning draft. Pin dimensions, composer/cursor, capture LF,
  blank history/gap, idle status, header/status cwd equality and exact footer.
- Row 12 is the only varying greeting slot. Accept the source's 88 phrases
  with two leading spaces; no arbitrary printable-text or menu regex. The
  greeting remains byte-identical within an ask, as Codex's OnceLock specifies.
  Tests exercise the two real observed greetings “It’s dangerous to code
  alone. Take a prompt.” and “Shall we put some verbs after that cursor?”.
- The shifted header cannot borrow a generic draft/footer profile when the
  exact startup profile fails. Ready must have the captured shortcuts/warnings
  footer and placeholder cursor. Inherited warning-draft checks retain exact
  pending/guard snapshot equality, ready prefix/status equality, server PID,
  pane target/PID and geometry equality, exact payload and first-Enter limit.
- Capability, bracketed paste, `guardedSubmit`, cleanup and acceptance helpers
  are unchanged. Source comparison verified `guardedSubmit` and
  `freshCodexWork` byte-identical to baseline. No delay, retry-budget or
  launch/recovery change.

This proves a conditional safe first submission through the existing atomic
transport when the measured draft is observed stable twice. It does NOT prove
live stability, successful challenge response, or acceptance of the shifted
welcome layout. Tests deliberately return `acceptance_uncertain` after one
Enter on disappearance; a still-pending warning draft never authorizes retry.
No post-Enter frame was captured and none was invented as live evidence.
Acceptance detection was not broadened to compensate for missing evidence.

## TDD RED

Tests preceded production edits. Initial host RED had 5 new tests, 3 pass and
2 intended behavioral failures. The proposed single-tagline edit was canceled
before execution; source was checked unchanged. Operator correction replaced
that design with the full pinned greeting list and two observed greetings.

[Final archived-baseline RED](evidence/A_0_4-live-startup-1-red-final.log.gz)
uses final tests and fixtures with the exact `b4506d2` base adapter in a
throwaway tree: **14 selected tests, 11 pass, 3 fail**, no skips. Failures:

1. `startup exact captured update welcome draft permits one guarded Enter without inventing acceptance`
2. `startup exact update draft is phase bound and never authorizes a retry`
3. `startup spoofed notice history footer version status and cursor variants remain closed`

The third failure distinguishes the inherited generic footer fallback that
this candidate closes for the shifted startup header. The first sandbox test
run produced only a test-process failure and is excluded from behavioral RED.

Reproduce baseline RED and all mutations:

```bash
python3 plan/PROJECT_V6/reviews/evidence/A_0_4-live-startup-1-checks-runner.py
```

## Verification

[Focused GREEN](evidence/A_0_4-live-startup-1-green-final.log.gz): exit 0,
**286 passed, 0 failed, 0 skipped/cancelled/todo**. Node v22.22.1; pinned tmux
3.6a-agents.3. Includes real disposable guarded paste/submit tests, all current
prompt-submission and Claude first-prompt regressions, adapter callers and
public error projection.

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/guarded_paste.test.js tests/gateway/guarded_submit.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
npm --prefix gateway run lint
python3 scripts/ci_gate.py --refresh-inventory
python3 scripts/ci_gate.py --validate-only
python3 scripts/check_public_hygiene.py
git diff --check
```

All exit 0. Inventory refresh leaves `ci/suites.json` unchanged; refresh and
validate-only each execute **0 suite tests**, not a full gate. Hygiene has
0 findings. Supplementary private-literal screening covers new untracked
fixture/evidence/handoff files, which the tracked-file hygiene checker omits.
Full `bash scripts/ci.sh` and new live acceptance are **not run**.

[Mutation results](evidence/A_0_4-live-startup-1-mutations.json): all 13
single-guard removals fail relevant startup/trial17 tests: notice, greeting
membership, cwd/status equality, exact draft footer, ready footer, phase,
cursor, blank history, ASCII, first Enter only, capture equality, process
binding and ready prefix. Scratch trees only; this is coder verification,
not an independent verdict. The first ASCII mutant survived because payload
mismatch masked the intended restriction; a direct classifier assertion was
added, then final mutations and focused GREEN were rerun successfully.

## Exact changed files and review limits

Functional candidate:

- `gateway/src/adapters/base_adapter.js`
- `tests/gateway/prompt_submission.test.js`
- `tests/gateway/fixtures/codex_0_160_1_update_welcome_draft.json`

New immutable review material is this handoff and only the
`evidence/A_0_4-live-startup-1-*` files enumerated in the
[file map](evidence/A_0_4-live-startup-1-files.json) and seal. Earlier trial
files and reviews index are unchanged. No manifest/catalog regeneration delta.

Strict capture equality intentionally refuses harmless rendering transitions.
The supported cwd spelling is a single untruncated ASCII absolute or tilde
path without spaces. The notice pins 0.160.1 → 0.161.0 and its captured border;
other versions, commands, notices or wrapped layouts remain unsupported.
Pane/server PIDs are transport provenance, not Codex executable attestation;
identical forged renderings or changes that revert between captures are not
proven distinguishable. This follows the inherited guard boundary, without
claiming authentication from screen text.

Independent Opus review follows under the operator's separate reviewer
assignment. Live challenge acceptance on this candidate remains unproven;
the operator must capture stable draft/guard and actual post-Enter evidence
before making that claim. Do not mark A05 acceptance or release complete.
