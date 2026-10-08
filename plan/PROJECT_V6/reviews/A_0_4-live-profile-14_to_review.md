# A/0/04 — trial 14 pre-assistant transient refinement

Status: implemented; fresh independent **Opus 5.5 medium** review pending.
Candidate remains dirty and uncommitted on HEAD
`2ca00213171d85e68c468765f13562987998e856`, branch
`feat/V6-A-0-04-safe-submit`. No independent verdict, integration, promotion
or release is claimed.

Contract: the user's root-owned live observation and request for a minimal
first-ask refinement. [Trial13 independent OK](A_0_4-live-profile-13_reviewed_OK.md)
remains valid for its historical scope. AGENTS.md, resolved profile, sheet,
stage/plan README and caller/shared transport readings from prior trials
continue to govern. Reviewed the current helper, submitPrompt caller and
first-prompt tests before editing. No policies, subagents, self-review,
push/tag, full gate or live provider session. Root owns commit/integration
and subsequent full-gate/live verification.

## Fresh live evidence and sanitized fixture

Read the updated private `workspace/root-a04-live-acceptance-result.json`.
The root-owned disposable Claude Code 2.1.294 run returned uncertain 1765 ms
after preAsk. Row 6 echoed the exact unique prompt; row 8 was empty, row 33
was `* Proofing…` with no parenthetical, and the composer was blank. A later
capture 7010 ms after the uncertain observation showed the exact reply in
row 8 and a Cooked completion row. The header and server/pane PID/geometry
were unchanged in the three captures. This observation proves the trial13
false negative; it does not establish successful refined-candidate acceptance.

[Non-identifying summary](evidence/A_0_4-live-profile-14-observation-summary.json)
and [new sanitized fixture](../../../tests/gateway/fixtures/claude_2_1_294_pre_assistant.json)
retain only the relevant layout. The fixture uses synthetic prompt/reply,
process identities and cwd; the completion clock is also synthetic. No raw
home path, prompt token, session identity or live PID is copied. The prior
trial13 fixture and every trial13 artifact remain byte-identical to entry.

## Minimal production delta

Only the working-row branch inside `freshClaude294Response` changes. It now
recognizes exactly two combinations:

- Empty assistant row 8 plus a bare standard-glyph/strict-word spinner.
- Existing `●` assistant row plus the existing seconds/tokens parenthetical.

Bare spinner with `●`, or parenthetical spinner without the assistant cell,
remains unproven and fails closed. The pre-assistant frame authorizes only
observation, never successful acceptance. The function returns the same verb
value as the existing witness, so the existing per-ask `workingVerb` equality
check enforces word stability through a bare-to-assistant transition while
allowing glyph animation. Completion still requires the exact reply layout
and version-bound completion set.

The submit loop itself is unchanged: first ask, fresh process provenance,
attempt 0, blank prior history, exact unique prompt echo, matching identity,
geometry/header/footer/composer/effort hint, at most eight additional one-second
observations. An unexpected frame throws immediately; no later completion
rescues it. Exhaustion throws uncertainty. The observation path cannot reach
the composer retry. No additional Enter or paste is sent, and all owned
buffers are cleaned. No new config, abstractions, caller or transport changes.

[Entry identity](evidence/A_0_4-live-profile-14-entry.json) and
[source/test delta](evidence/A_0_4-live-profile-14-delta.patch) bind the scope.
Only base adapter, first-prompt tests/new fixture, corresponding Gateway README
explanation and review index change. Existing dirty Claude adapter and manifest
are untouched relative to entry. No candidate files were staged or committed.

## TDD RED

Five tests were added before the production edit. All 29 inherited tests are
unchanged. Genuine tests-first command on the host:

```bash
node --test tests/gateway/claude_first_prompt.test.js
```

[Initial RED](evidence/A_0_4-live-profile-14-red-host.log.gz): exit 1,
34 tests, 30 passed, **4 intended failures**, no skips:

1. `trial14 bare pre-assistant Proofing spinner observes the later unique reply without re-Enter`
   — baseline returns uncertainty rather than observing completion.
2. `trial14 pre-assistant to assistant transition keeps the same spinner word while glyphs animate`
   — baseline refuses the initial bare frame.
3. `trial14 pre-assistant uncertainty exhausts the same finite observation budget without replay`
   — baseline refuses before the required bounded observations.
4. `trial14 changed word identity or ambiguous cells cannot borrow later completion`
   — baseline refuses before reaching the distinguishing intermediate frame.

The reused/stale-process test passes on the rejecting baseline; it is negative
regression coverage, not a distinguishing RED claim. The final positive test
was strengthened to complete at poll eight, using repeated synthetic working
observations between the two recorded layouts. Those repeats are test inputs,
not claimed live intermediate captures. Final tests reproduce the same four
failures against the archived trial13 source in a disposable scratch tree:

```bash
python3 /tmp/a04-trial14-red.py /home/carase/git/personal/AO/workspace/clones/wt-v6-a04
```

[Runner](evidence/A_0_4-live-profile-14-red-runner.py),
[argv/exit/source/test hashes](evidence/A_0_4-live-profile-14-red-result.json),
[final RED reproduction](evidence/A_0_4-live-profile-14-red-final.log.gz).
The runner copies source/contracts/fixtures/tests to scratch, links existing
dependencies and replaces scratch base_adapter only. Copy the runner to `/tmp`
and choose fresh output filenames when reproducing; never overwrite archived
trial evidence. No import/setup failure is counted as RED.

## Focused GREEN

Final host command (Node v22.22.1, patched tmux `3.6a-agents.3`):

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
python3 scripts/ci_gate.py --validate-only
git diff --check
```

[Final GREEN](evidence/A_0_4-live-profile-14-green-host.log.gz): exit 0,
**239/239 passed**, 0 failed/cancelled/skipped/todo, including 34 first-prompt
tests and disposable tmux input fixtures. Every new positive/negative checks
exactly one literal paste and one CR, plus no leaked buffers. Bare spinner
exhaustion checks all eight observation waits. Stale history, missing fresh
process authority, identity drift, changed verb, duplicated echo, menus,
unexpected draft and unsupported row combinations remain uncertain. The
existing retry-credit/identity/history/completion/glyph negatives remain green.
The earlier focused run is archived separately as `green-initial`; the final
run covers the strengthened poll-eight test.

[Manifest validation](evidence/A_0_4-live-profile-14-manifest-validation.log.gz):
exit 0, no errors, 0 suite tests executed. Whitespace check exit 0. The fixture
JSON is not a discovered suite test path, so manifest/digest remain unchanged.
This is coder verification, not an independent verdict.

## Immutable evidence and next step

[Final candidate SHA map](evidence/A_0_4-live-profile-14-files.json) binds source,
tests, old/new sanitized fixtures, manifest, docs, review index, this handoff
and all new trial14 artifacts. A separate handoff seal binds that map and the
handoff. New evidence files were exclusively created. Entry hashes verify
that all trial13 historical files are preserved; no immutable trial was edited.

Stop for a separately assigned fresh **Opus 5.5 medium** independent reviewer
trace/session. Trial14 has no verdict. No quota exhaustion occurred during
this correction. Root retains solo full-gate execution after sessions are
inactive, successful refined-candidate live Claude/Codex acceptance, committed
review trail and integration. These remain outstanding acceptance criteria;
focused fixture GREEN does not satisfy them. No supported/released claim.
