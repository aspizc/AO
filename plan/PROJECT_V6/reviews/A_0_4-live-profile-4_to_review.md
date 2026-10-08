# A/0/04 bounded live-profile correction — trial 4 handoff

Status: implemented, uncommitted, awaiting fresh independent review.
No independent verdict, integration, full gate, sheet closure or live acceptance
is claimed.

Same bounded coder ownership as assignment
`ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, with the operator's trial 4 follow-up.
Base HEAD: `88724c7c8b675fce0cd400a5c55e9499a4b0bc93`, containing the
[immutable trial 3 KO](A_0_4-live-profile-3_reviewed_KO.md).

The task entered on the still-dirty trial 3 source/tests/docs and untracked
trial 3 fixture. All four inherited paths matched their trial 3 manifest before
editing. All tracked prior trial artifacts remain byte-identical to HEAD; the
untracked trial 3 fixture retains SHA-256
`d701b65bc77723c63d3de28cf520720e082e255218df61f4ae4b518dc3f48bbf`.
No prior handoff, verdict, fixture or evidence was overwritten.

## KO and exact observation boundary

The KO confirmed that trial 3's 22-character queue-footer equality could not
match the Gateway's actual `capture-pane -N -T` output. The current ignored root
`workspace/root-a04-live-acceptance-result.json` was read locally only, with
those same capture flags and observed `preAskState`/`errorState` metadata.
It was not changed or published.

The Codex error observation is 120x40, cursor (57,36), with mode/input-off/
synchronized zero. Its queue row is **119 characters: 22 footer characters
plus 97 trailing literal spaces**. The status row also has one trailing space.
Trial 3's fixture omitted the queue padding; its preservation claim was wrong.
That fixture and handoff are left immutable as required; trial 4 provides the
correct observation and superseding evidence.

[New sanitized fixtures](../../../tests/gateway/fixtures/a04_live_profiles_trial4.json)
preserve the observed relevant row text/padding, line positions and cursor
metadata. Every row's trailing literal-space count is retained, including
sensitive history rows whose text is removed. The fixture records those counts
in `observedTrailingSpacesByRow`, and a test verifies them against the actual
published snapshot. Sensitive history/account/quota text is blanked; paths
become `/workspace/project`, local status identity becomes `user@host`, and
the prompt marker becomes benign ASCII of the same length. Redaction changes
private text lengths but never the observed trailing-space count. No token,
session/account or policy-resolution value is published.

The current Claude error observation follows **one Enter**, then the root
returned `acceptance_uncertain`. Its composer row contains the measured
pointer/separator plus 61 literal spaces, cursor (2,36). This is retained as
failure evidence, not acceptance. The intermediate Claude pasted draft was
not captured; the corresponding test explicitly simulates that intermediate
step. Claude's footer has no trailing padding and its existing `.trim()`
comparison needs no correction in this task.

## Minimal source correction

The queue-footer constant becomes the anchored expression
`/^  tab to queue message *$/`, and all six equality call sites use that same
matcher. It permits **only trailing literal ASCII spaces**; leading indentation
remains exactly two spaces. Tabs, nonbreaking spaces, changed wording and extra
non-space text refuse. There is no whole-pane or draft trimming.

[Source delta against inherited trial 3](evidence/A_0_4-live-profile-4-source-delta.patch)
is exactly that constant and those call-site replacements; this was verified
programmatically against the inherited source hash. The draft-phase gate,
nonempty/ASCII/cursor/status/geometry/trailing-row checks, decisions, retry
bounds and acceptance logic are unchanged. No provider inference, policy or
transport/runtime behavior was added.

The inherited trial 3 phase and Claude footer changes are still part of the
candidate requiring fresh review: the KO explicitly stopped at the padding
blocker and did not approve the remaining trial 3 scope.

## TDD RED

Five trial 4 groups were added before editing the matcher. The initial run
exposed the old equality blocker in three behavioral groups; its first group's
padding assertion also counted Claude's nonbreaking-space separator incorrectly
because it used `trimEnd()`. That assertion was corrected to count literal
spaces only. The preliminary run is not the authoritative RED evidence.

The corrected tests were rerun on an isolated copy of the inherited trial 3
source, whose SHA-256 is exactly
`a0d957544f2f7e542ce0d833c35c8cd83d83f1844aca1747d2c96cd5a5515245`.
No production files were reverted or overwritten for that reproduction.
Host command, from the isolated copy:

```bash
node --test tests/gateway/prompt_submission.test.js
```

Exit 1: **83 tests, 79 passed, 4 failed, 0 skipped/cancelled/todo**.
[Sanitized authoritative RED log](evidence/A_0_4-live-profile-4-red.txt).
The failures now reach behavioral assertions:

- `trial4 exact observed capture padding and cursor identify the queue draft`
- `trial4 padded queue draft reaches guarded Enter without false acceptance`
- `trial4 queue padding allows trailing literal spaces only with exact indentation and phase`
- `trial4 padded queue draft retains status cursor busy decision and unknown refusals`

The unchanged Claude uncertainty test passes on inherited source.

## GREEN and verification

Final host command:

```bash
node --test tests/gateway/base_adapter.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js
```

Exit 0: **158 passed, 0 failed, 0 skipped/cancelled/todo**. The prompt-submission
subset has 83 tests. [Sanitized GREEN log](evidence/A_0_4-live-profile-4-green.txt).
`git diff --check` passed.
[Candidate hashes](evidence/A_0_4-live-profile-4-files.json) bind source, tests,
new fixture, README, both logs and the bounded source delta.

Tests assert exact captured queue padding and measured cursor; original and
padded queue rows match only in draft phase; malformed indentation/whitespace
and footer text refuse. Emitted bytes are one framed paste and at most two CRs
ending `not_submitted`; disappearance after one CR is uncertainty, not success.
Busy/status/cursor/trust guard changes receive one paste and zero CRs; an initial
queue draft receives zero input and no prompt buffer. Existing decision/trust/
busy/unknown zero-input tests and phase/placeholder checks also pass.
The measured Claude failure pane remains unknown and produces uncertainty after
one simulated submit, without retry or success.

The new fixture, logs and source delta were scanned against actual raw token/
session values locally and for raw operator paths, identity and account markers.
No such private values remain.

## Stop boundary

Stop for a fresh separately assigned independent reviewer. Review the bounded
padding fix and the still-unapproved inherited trial 3 phase/Claude scope;
reproduce focused tests and inspect padding-preserving fixtures and metadata.
No providers, policies, subagents, staging, commit or push were invoked.
Root retains live acceptance and the solo full gate; `bash scripts/ci.sh` was
not run by this bounded task. Claude live acceptance remains unconfirmed.
