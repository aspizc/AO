# A/0/04 Claude boundary-evidence reassessment — trial 9 handoff

Status: reassessment complete; stopped at the remaining turn-binding design
request. No acceptance implementation or positive marker added.
Clean entry: `09708fa72dea630c47a2bdb67e1bde86342d1d79`.
Trial 8 and all preceding review artifacts remain immutable.

Read the ignored probe trace locally only, its four Claude records, the exact
local debug observe hook, and its matching ignored outer result. The main
worktree's ignored result is an earlier distinct run (preAsk 00:41:03.149Z);
the probe's outer result (preAsk 00:42:06.354Z) matches the supplied trace.
Their prompts/tokens and times were not combined. The outer error snapshot
matches the actual production post-CR observation byte-for-byte. Root reports
one guarded CR, completed response and `acceptance_uncertain`; no successful
live `agent.ask` is claimed.

[Sanitized trial 9 fixture](../../../tests/gateway/fixtures/a04_live_profiles_trial9.json)
contains actual ready/post-paste/guard/after frames; no draft or guard was
synthesized. Each stage retains measured modes, cursor, geometry, phase and
wall-clock time. PID/pane identifiers use consistent benign replacements while
preserving equality relationships. Tokens are replaced consistently with
same-length benign ASCII, identities/paths are redacted, and unrelated private
history is blanked retaining all observed trailing literal spaces. All four
row counts and trailing-space counts match the raw trace. No raw trace, token,
account, session or private path was published. Probe instrumentation remains
only in the separate probe; nothing was copied into production code.

[Observation evidence](evidence/A_0_4-live-profile-9-observations.json) records
what is resolved: exact final draft, stable server/pane PID and geometry,
current prompt absent from both baselines, blank echo/assistant/completion rows,
unchanged prefix and matching outer error frame. The actual debug hook stamps
`new Date().toISOString()`, so the times are not described as monotonic.

The [specific counterexample and remaining request](A_0_4-live-profile-9_operator-evidence-request.md)
explain the residual generic-prompt ambiguity: restoring a previously completed
same-prompt turn into a blank viewport can satisfy these visible checks without
a new accepted turn. This is an alternative not excluded by the supplied
renderer evidence, not a claim of observed replay in the unique-token run.
A pinned fresh-turn renderer or causally bound accepted-turn event contract is
still required to exclude that alternative. The request does not ask to repeat
the boundary evidence already obtained.

[Read-only classification](evidence/A_0_4-live-profile-9-classification.json)
was reproduced with the unchanged `classifyProviderPane` and each sanitized
stage's actual phase/metadata: ready/postPaste/guard = `composer`, after =
`unknown_state`. This is a direct classifier inspection, not a provider run,
submission test or proof of the proposed positive witness.

The task's conditional implementation branch was not entered. No TDD RED,
focused GREEN or native capture test was run or claimed. No tracked source,
test, README, policy or previous review artifact changed; `git diff --check`
passes. The [candidate manifest](evidence/A_0_4-live-profile-9-files.json) binds
unchanged source/tests/README and the new assessment artifacts. Local trace and
matching outer-result fingerprints were checked at sealing for evidence drift.

No provider, policy engine, commit, push or subagent was invoked. Stop for
independent assessment of the counterexample/request or the missing turn
contract. This is not an independent verdict, integration or sheet closure.
