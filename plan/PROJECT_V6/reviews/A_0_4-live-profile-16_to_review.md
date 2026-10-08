# A/0/04 — trial 16 Codex welcome Working profile

Status: implemented; fresh independent Opus review pending. Dirty, uncommitted
candidate on HEAD `8b040490f31bbdecb6f0ad4bac5f306b36cdcaca`, branch
`feat/V6-A-0-04-safe-submit`. No verdict, integration, promotion or release is claimed.
No commit, push, policy edit, live provider session or subagent was performed.

## Contract and entry

Read AGENTS.md, A/0/04, Stage A README, prior trial15 independent OK and
handoff; plan/README.md and the resolved orchestration profile remain the
previously read operating contract. Applied the existing build skill's TDD
and evidence workflow in this explicitly assigned coder session. Root retains
fresh independent Opus review, live rerun, full gate and integration authority.
Read the shared classifier, freshCodexWork, submitPrompt caller, transport
observation/guard utilities, Codex ask caller and existing Codex regression tests.

Root's private ignored `workspace/root-a04-live-acceptance-result.json` was
inspected locally, not copied. It reports Claude 2.1.294 acceptance and Codex
CLI 0.160.1 uncertainty despite successful first submission. Codex's ready
welcome rows 1–12 are retained after Enter, the exact prompt echo appears at
row15, Working at row33, blanks at rows34–35, composer at row36, spinner at
row38 and warnings footer at row39. Server/pane metadata and 120×40 geometry
are unchanged between recorded ready, error and later captures. The later
capture contains the exact reply. This proves the reported false negative;
it does not establish refined-candidate acceptance or an input count independently.

[Non-identifying observation summary](evidence/A_0_4-live-profile-16-observation-summary.json).
[Sanitized fixture](../../../tests/gateway/fixtures/codex_0_160_1_welcome_working.json)
uses synthetic prompt/reply, `/fixture/a04`, server/pane IDs and completion
clock. It preserves the relevant layout and trailing blank padding. The pasted
draft is simulated; no intermediate draft was captured by root. Original path,
private token, home directory, session IDs and live PIDs are absent from the
fixture. The completed-only fixture is negative coverage, not a success witness.

[Entry SHA map](evidence/A_0_4-live-profile-16-entry.json) binds the inherited
trial15 candidate and every trial15 historical review/evidence file.
[Delta](evidence/A_0_4-live-profile-16-delta.patch) is relative to that candidate,
not HEAD, which also carries inherited dirty changes. Only base_adapter.js,
prompt_submission.test.js, the new sanitized fixture, corresponding Gateway
README text and review index change in trial16. Claude witness/eligibility
source, Claude tests, Claude adapter and manifest are unchanged from entry.
All immutable trial15 files are byte-identical; their historical hashes are
not rewritten to describe this newer source.

## Narrow implementation

The classifier retains the existing four-row modernWork and source-profile
paths. A separate welcomeWork flag recognizes only 120×40, composer row36,
footer row39, a 41-line capture with final empty row, the exact 0.160.1 version
header, strict Working at row33, blank rows34–35 and the existing pinned
spinner status at row38. Existing composer, gap, mode and footer checks apply.
It is busy before input, so no text or Enter is delivered to that active frame.

For welcomeWork only, freshCodexWork additionally binds ready, pending, guard
and after to the same server PID, pane target/PID and geometry, and requires
attempt zero. All three pre-Enter histories must lack any Working and the exact
prompt echo. The after frame requires one exact single-line ASCII echo at
row15, a previously blank echo cell, unchanged preceding welcome rows, blank
rows16–32 and no intervening user turn. No standalone Working/spinner heuristic
was added. Existing non-welcome behavior is retained; completed-only replies
remain uncertain. A second Enter cannot earn welcome-profile acceptance.

No transport, submit delay, poll/retry budget, config or policy change.

## TDD RED before GREEN

Seven trial16 tests were written before the production edit. Initial host run
of `node --test tests/gateway/prompt_submission.test.js`: exit1, 123 tests,
121 passed, 2 failed, no skips. Intended failure names:

- `trial16 measured Codex welcome Working at start minus three confirms the exact new prompt with one Enter`
- `trial16 welcome Working refuses initial input as busy without keys`

The initial fixture accidentally inserted the synthetic echo into blank
ready row15. Consequently its acceptance failure was confounded by stale-echo
rejection and is **not counted as clean behavioral RED**. The first GREEN
attempt (122/123) exposed this: the new classifier worked, but freshness
correctly refused the stale echo. Restored ready/draft row15 from the original
observed blank cell. The declined combined fixture/host command never ran;
subsequent fixture/test writes and host test runs were separate commands.

Final corrected fixture and strengthened tests were then run against the
archived trial15 source in a disposable scratch tree, before final GREEN:

```bash
python3 plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-16-red-runner.py
```

[Final behavioral RED](evidence/A_0_4-live-profile-16-red-reproduced.log.gz):
exit1, **123 tests, 121 pass, exactly those 2 fail**, 0 skipped/cancelled/todo.
[Baseline/test/fixture SHA binding](evidence/A_0_4-live-profile-16-red-result.json).
Baseline base_adapter SHA256: `2041f12a68c29e24e0505fb5e52819e2a30862e6f7f328a7104a9bb0b5999891`.
The runner uses cwd as repository root, copies source/contracts/fixtures/tests
into scratch, replaces only scratch base_adapter with archived trial15 source,
and writes /tmp results. It never rewrites historical repository evidence.

Other trial16 tests cover wrong/missing/duplicate/shifted/stale echoes; prior
Working in ready/pending/guard; every server/PID/target/geometry field at each
ask stage; malformed gaps, version/status, menus and unrelated busy transcript;
a decision before final Enter; retry-Enter credit; and completed-only replies.
Acceptance and post-Enter refusal tests assert the emitted literal bracketed
paste and CR count plus no leaked owned buffers. Before-Enter decisions assert
only the paste, with no CR; initial busy asserts no inputs.

## Focused GREEN and guard discrimination

Final host command (Node v22.22.1; patched tmux 3.6a-agents.3):

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
python3 scripts/ci_gate.py --validate-only
git diff --check
```

[Final GREEN](evidence/A_0_4-live-profile-16-green-final.log.gz): exit0,
**253/253 passed**, 0 failed/cancelled/skipped/todo. Includes all 41 unchanged
Claude first-prompt tests and disposable real-tmux input fixtures. Manifest
validation exit0, no errors, **0 suite tests executed**. Whitespace check exit0.
No new discovered test path was added, so manifest remains unchanged.

[Scratch mutation runner](evidence/A_0_4-live-profile-16-mutation-runner.py)
and [final results with mutant hashes](evidence/A_0_4-live-profile-16-mutations.json)
prove all nine removals fail a relevant trial16 test: attempt-zero, ready/pending
process binding, pending history, fixed echo position, blank transcript,
version header, Working marker, gap34 and gap35. Each log is archived separately.
Initial mutations exposed two test gaps (echo position and version header);
the [initial results](evidence/A_0_4-live-profile-16-mutations-initial.json)
are retained. Added an echo shifted earlier into row14 and changed the version
in every frame together, so other guards cannot substitute for either check.
Final RED and GREEN include these distinguishing cases. No mutation altered
the working candidate. This is coder verification, not independent review.

## Candidate binding and remaining limits

Final base_adapter SHA256: `81e924092fe3beb3ea8d8cfe55630fdf36a5c1df0c59604239e25feca3e420b2`.
Final prompt_submission test SHA256: `82e02514af276c30818bd143a9290d365e95f35e6ea4fd36a60eabefe909898d`.
Fixture SHA256: `9762c373631cc8dc727a8c68f66dcb72344dfe0cef2cb2a2837af70b40cde159`.
[Final SHA map](evidence/A_0_4-live-profile-16-files.json) binds candidate files,
fixtures, docs, index, handoff and all new evidence; a separate seal binds
this handoff and map. Immutable trial15 evidence was exclusively read, never
modified. Root owns committing the review trail after independent review.

Full gate `bash scripts/ci.sh`, refined-candidate live acceptance for both
providers, fresh Opus review and integration remain outstanding. Root's earlier
live run establishes the gap, not acceptance of trial16. Fixture GREEN is not
live provider acceptance. The witness binds observed tmux server/pane-shell
identity and viewport rows, not the child executable PID, provider turn ID or
binary attestation. A change and reversal entirely between observations is
not proven detectable. Only the narrowly measured version/layout is added;
unknown versions/layouts and fast completed-only responses remain uncertain.
No full-sheet completion or supported/released claim.
