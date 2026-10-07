# A/0/04 bounded live-profile correction — trial 2 handoff

Status: implemented, uncommitted, awaiting fresh independent review.
No independent verdict, integration, sheet closure or live acceptance is claimed.

Same bounded coder ownership as assignment
`ts-7cadea16-5cf9-4fcf-aa4e-82e5a23d4a49`, with the operator's trial 2 follow-up.
Base HEAD: `83a5bbae39ba67372545a0ddbad2ad84b3a50154`, containing the
[trial 1 source-only OK](A_0_4-live-profile-1_reviewed_OK.md).
All six tracked trial 1 handoff/verdict/evidence/fixture paths are byte-identical
to that base. No prior review or evidence file was overwritten.

## Observation and privacy boundary

The ignored root `workspace/root-a04-live-acceptance-result.json` was read
locally only and not edited or published. Root live acceptance failed:

- Codex 0.160.1's actual padded footer had `1 warning`, while trial 1 matched
  only `warnings`; pre-ask classification refused `unknown_state`.
- Claude 2.1.293's pre-ask composer classified. After paste, the row immediately
  after the bottom border contained a local status line, and the following
  auto-mode footer lost its agents suffix. The draft guard refused
  `unknown_state`, without Enter.

Both pre-ask metadata records show 120x40 panes, cursor (2,36), and mode,
input-off and synchronized zero. The raw result contains **no post-paste pane
metadata**. The Claude post-paste fixture inherits geometry and mode from
pre-ask, takes the visible composer row position, and derives cursorX as
2 plus ASCII draft length. These are explicitly labeled test values, not a
claim of observed post-paste metadata.

[New sanitized fixtures](../../../tests/gateway/fixtures/a04_live_profiles_trial2.json)
contain only the relevant ready/draft observation surfaces. They preserve exact relevant rendered rows, footer padding
and line positions, with these deliberate privacy transformations:

- history/account/quota rows before the composer neighborhood become blank;
- local directory text becomes `/workspace/project`;
- the local status identity becomes `user@host`;
- the root prompt marker becomes benign ASCII of exactly the same length.

The published fixtures/logs were scanned against the actual raw token/session
values locally and against home paths, operator identity and account markers.
No such raw values remain. Raw captures or policy-resolution metadata are not
included in the review evidence.

## Minimal correction

Codex's existing anchored warning-footer expression now accepts singular or
plural labels (`warnings?`), preserving numeric count, padding, the exact
measured status-row requirement, 120x40 geometry and composer checks.

Claude preserves the existing blank-gap/full-auto-footer profile and adds
only the observed ASCII `user@host:/absolute/path` status-row shape paired with
the exact shorter auto-mode footer. The fixed 120x40 geometry, two borders,
composer pointer, ASCII exact-draft/cursor checks, trailing blank rows and
blank-editor refusal remain. Unrecognized status rows, relative paths,
unknown overlays and mismatched footer pairs refuse. The status row is only
rendering evidence; it grants no provider, path, account or approval authority.

Acceptance logic, retry bounds, active decisions, transport, runtime and policy
are unchanged. Neither auto-mode layout classifies as busy or establishes
acceptance. No provider process/request, policy invocation/edit, subagent,
staging, commit or push was performed.

## TDD RED

The final six trial 2 test groups were appended before production edits.
Host command:

```bash
node --test tests/gateway/prompt_submission.test.js
```

Exit 1: **68 tests, 64 passed, 4 failed, 0 skipped/cancelled/todo**.
[Sanitized RED evidence](evidence/A_0_4-live-profile-2-red.txt).
A direct sandbox run also exposed the same four assertion failures:

- `trial2 Codex observed singular warning and variable padding preserve readiness`
- `trial2 Claude observed pre-ask and post-paste layouts retain exact draft and composer identity`
- `trial2 Claude status row allows guarded Enter on the unchanged draft without false acceptance`
- `trial2 observed layouts keep menus trust busy and unknown states closed before input`

After GREEN, the near-miss group gained one status/full-footer mismatch case,
and the post-paste unknown-status refusal case was refined to use the derived
end-of-draft cursor, avoiding a confounding cursor error. No test group or
behavioral RED failure was removed.

## GREEN and review checks

Final host command:

```bash
node --test tests/gateway/base_adapter.test.js tests/gateway/prompt_submission.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/tool_error_serialization.test.js
```

Exit 0: **143 passed, 0 failed, 0 skipped/cancelled/todo**. The prompt-submission
subset has 68 tests. [Sanitized GREEN evidence](evidence/A_0_4-live-profile-2-green.txt).
`git diff --check` passed.
[Candidate hashes](evidence/A_0_4-live-profile-2-files.json) bind the source,
test, new fixture, README and both logs.

The added tests verify observed ready/draft classification and unchanged
composer identity, singular/plural count and padding variants, and an emitted
framed paste followed by at most two guarded CRs ending in `not_submitted`.
Disappearance after one CR produces `acceptance_uncertain` without retry or
success. Menu/trust/busy/unknown checks assert no input or prompt buffer before
refusal. Post-paste decision or unknown status produces one paste and zero CRs.
Direct classifier tests reject near misses, cursor drift, pane modes, changed
height and wrong explicit provider. Negative panes, derived metadata and retry
sequences are simulations, not newly observed live provider behavior.

## Stop boundary

Stop here for a fresh, separately assigned independent review. Reproduce the
focused command and inspect the sanitized fixtures and bounded diff.
Root still owns successful live Codex/Claude submission, post-paste/acceptance
metadata and busy rendering, acceptance timing and the solo full gate.
`bash scripts/ci.sh` was not run for this bounded correction; no full-gate or
sheet-completion claim is made. Existing trial 1 evidence remains immutable.
