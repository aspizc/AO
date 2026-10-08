# A/0/04 bounded live-profile correction — independent review handoff 1

Status: implemented, uncommitted, independent review pending. This is not an
independent verdict, integration, sheet closure or successful live acceptance.

Assignment: `ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`.
Base HEAD: `50815b4cf4cf111ab3746bfe52c06a7fde7f738e`.

## Scope and observation boundary

The root's ignored `workspace/root-a04-live-acceptance-result.json` was read
locally only. The raw file was not changed or copied into review evidence.
Only sanitized ready-pane rows and mode/cursor/size metadata were published in
`tests/gateway/fixtures/a04_live_ready_profiles.json`. All rows before the
composer neighborhood are blanked without moving row indices. Local directory
text is replaced with `/workspace/project`; history, account/quota information,
identities, session IDs, tokens and policy resolution metadata are excluded.
Versions are root-observed Codex 0.160.1 and Claude Code 2.1.293; both panes
were 120x40, cursor (2,36), mode/input-off/synchronized all zero.

The root observed ready panes, but its asks failed `unknown_state` before input.
These captures therefore prove ready rendering, not successful acceptance.
No provider process, provider request or policy operation was performed by this
correction task. There was no staging, commit or push, and no review agent was
created. The separately assigned independent reviewer must issue the verdict.

## Changes

- Codex recognizes the measured shortcuts/warnings footer together with the
  exact measured `GPT-6.1-Sol medium fast` status-row shape and composer/cursor
  checks at 120x40. The status row does not select or infer a provider/model;
  provider remains the caller's explicit argument. Both decision exclusion and
  composer classification use the same measured gap predicate.
- Claude retains the source profile and adds only the measured 120x40 layout:
  default single-line composer, one blank row after its lower border, then the
  exact auto-mode footer. Existing ASCII draft, cursor and placeholder checks
  remain. Custom status-line rows and other footer layouts stay unverified and
  refuse; the raw error-pane status-line variant is not added by inference.
- Documentation separates measured readiness from still-unverified successful
  live submission, loading rendering and acceptance timing.

No provider inference, approval policy, transport, runtime, public error or CI
inventory behavior changed.

## TDD RED

Tests were added before production changes. Host command:

```bash
node --test tests/gateway/prompt_submission.test.js
```

Result: exit 1, 60 tests, 55 passed, 5 failed, 0 skipped/cancelled/todo.
[Sanitized RED log](evidence/A_0_4-live-profile-1-red.txt).
The five assertion failures were:

- `codex observed 120x40 ready profile preserves the empty composer`
- `codex observed ready layout retains exact draft checks without claiming live acceptance`
- `codex observed profile still refuses focused menu trust busy and unknown states before input`
- `claude-code observed 120x40 ready profile preserves the empty composer`
- `claude-code observed ready layout retains exact draft checks without claiming live acceptance`

The sandbox `node --test` attempt yielded only an opaque file-level failure and
is not counted as behavioral RED. A direct sandbox test run and the host run
both exposed the behavioral assertions. The final fixture removes additional
irrelevant history rows from the initial sanitized RED fixture, preserving all
composer/footer rows and metadata. Two additional near-miss test groups were
added during GREEN to reject missing/changed status/footer, nonempty gaps,
trailing overlays, unmeasured height and nonzero pane modes.

## TDD GREEN and verification

Final host command:

```bash
node --test tests/gateway/base_adapter.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js
```

Exit 0: **137 passed, 0 failed, 0 skipped/cancelled/todo**.
The prompt-submission subset has 62 tests.
[Sanitized GREEN log](evidence/A_0_4-live-profile-1-green.txt).
`git diff --check` passed. The sanitized fixture and published logs were scanned
for home paths, operator identity, raw session/token names and quota data; none
remain. [File hashes](evidence/A_0_4-live-profile-1-files.json) bind the four
candidate files and two logs.

The added negative menu/trust/busy screens and draft sequences are deterministic
mutations of the measured ready layout, not live observations of those states.
They assert no paste, no decision key and no prompt buffer before refusal.
The unchanged-draft sequence tests emitted framed text and two bounded CRs,
then `not_submitted`, without manufacturing successful live acceptance.
Wrong explicit providers still return `unknown_state` on the observed fixtures.

## Remaining root/reviewer work

Independently review this bounded diff and reproduce the focused command.
Root retains ownership of successful live Codex/Claude submission, loading and
acceptance captures, timing, Antigravity evidence, and the solo full gate.
The full `bash scripts/ci.sh` was not run by this bounded correction task; no
full-gate or sheet-completion claim is made. Existing review verdicts and CI
inventory are unchanged. Stop here for independent review.
