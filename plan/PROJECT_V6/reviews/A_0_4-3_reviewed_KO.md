# A/0/04 implementation trial 3 — independent review verdict: KO (partial)

Reviewer task: `ts-530f4ed4-8457-4d6b-aa87-4b91c4007ac5` (fresh session, not the
coder). Handoff: [A_0_4-3_to_review.md](A_0_4-3_to_review.md).
HEAD: `7bbe6e479194b31b326fefa75d04535d2ad98fe5`. Date: 2026-10-08.

This review is **partial**: the 20k-token budget did not cover the full scope.
It is a KO on a confirmed P1 finding. Unexamined areas are listed below and get
no credit either way. No candidate edit, provider invocation, commit, staging
or push was performed.

## Verified

- Manifest `evidence/A_0_4-trial3-candidate-files.json` SHA-256 is
  `c21de3c5499bdf1dc7f24936c29715558d602465491c27edb05b5e2afc7dec4e`. This
  matches the handoff.
- All 60 bound paths match: 59 hashes match on disk, and
  `gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch` is absent as its
  `null` entry requires.
- Every dirty or untracked path (`git status --porcelain -uall`) is in the
  manifest. The only exceptions are the handoff and the manifest, which are
  excluded by design. Ten manifest entries are committed evidence files and
  are unchanged.
- The trial-2 F1 code path (`gateway/src/adapters/base_adapter.js:242–289`)
  now maps post-CR observation failures to `acceptance_uncertain` through
  `delivered` and the outer `catch`. The six new post-CR regressions are
  present at `tests/gateway/prompt_submission.test.js:556–585`.
- Reviewer rerun of `node --test tests/gateway/prompt_submission.test.js`:
  48 tests, 48 passed, 0 failed, cancelled, skipped or todo. This is one file,
  not the 77-test scoped GREEN.
- `git diff --check` is clean.

## Actionable findings

### F1 — P1: cleanup failure overwrites `acceptance_uncertain` from the first guarded submit

**Evidence:** `gateway/src/adapters/base_adapter.js:202–211,266–268,280–283`.

On attempt 0, `guardedSubmit` can fail with something other than the fixed
refusal: the run throws, or it exits with a non-refusal status or stderr. In
that case it throws `acceptance_uncertain`, because the CR may have been
written. But `delivered` is still `false`, so the `finally` block calls
`cleanupOwnedBuffers(..., "transport_failed")`. If a buffer cleanup then fails,
the `finally` throws `transport_failed`. In JavaScript, a throw from `finally`
replaces the error already in flight. The caller sees `transport_failed`,
which reads as replay-safe, even though acceptance is uncertain. That can
duplicate a prompt, the same harm class as trial-2 F1.

Reviewer stub probe: scratch `probe2.test.mjs`, SHA-256
`2eb57eec0dd2a64602d7e944b205f7456256a434ac5dda4e5e2e508293f3a4c8`. It reuses
the candidate test fixture lines 1–82, runs in process, and uses no tmux or
provider. In both cases `agents-submit-v1` records one CR and every
`delete-buffer` returns `status 1, "private cleanup failure"`:

| Case | `agents-submit-v1` result | Public reason |
| --- | --- | --- |
| status2 | `{status: 2, stderr: "server exited"}` | `transport_failed` |
| throws | run throws after the CR is recorded | `transport_failed` |

Expected: `acceptance_uncertain` in both cases.

**Required:** treat any non-refusal `guardedSubmit` outcome as possibly
delivered for the cleanup reason. Alternatively, never let a cleanup failure
downgrade an uncertain error already in flight. Add RED-first regressions for
both rows above. Keep the attempt-0 fixed refusal mapped to `unknown_state`,
and keep cleanup failure after that refusal pre-delivery.

## Not examined (no credit either way; budget exhausted)

- The F2 framing/PID isolation logic and the
  `A_0_4-trial3-mutation-proof.json` mutant reproduction. The rename-based
  mode-file publication race fix.
- The F3 documentation wording.
- Reruns of the 77-test scoped GREEN, the RED logs and scoped lint. The gzip
  evidence was checked only by manifest hash.
- The whole trial-2 "Not examined" list:
  - byte identity of `cmd-send-keys.c`/`cmd-paste-buffer.c` from `.2` to `.3`;
  - the `.1` deletion content and the `.2` evidence SHA record;
  - the Claude and opencode adapter diffs;
  - `tool_error_serialization` and catalog projection;
  - `docs/tmux-runtime.md` and the vendor README;
  - a company/personal content scan of new public files.

Still open regardless: the trial-1 F4 positive Antigravity profile, live
provider acceptance/version/timing, native Darwin, the root full gate and
inventory, and sheet closure.

## Verdict

**KO.** Trial 4 must fix F1. A fresh reviewer must also cover the
"Not examined" list above. This verdict is not integration, promotion or
release evidence.
