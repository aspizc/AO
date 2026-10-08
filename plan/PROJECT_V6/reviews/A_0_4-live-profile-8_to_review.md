# A/0/04 Claude completed acceptance — trial 8 handoff

Status: evidence assessment complete; generic acceptance implementation deferred
for the explicit evidence/design gate. No positive matcher was added.
Entry was clean at `8dbe4c787af3ffdd619ceb7c772dd54458bb5f30`.
Read root `AGENTS.md`, the A/0/04 sheet, Stage A README, `plan/README.md`, the
trial 5 operator evidence request, trial 7 verdict and the current classifier
and submission caller. No provider, policy, commit, push or subagent was invoked.

The latest ignored root result was read locally only. A private fingerprint
was retained and checked at sealing; raw tokens, account/session/identity/path
values were not published. The
[sanitized Claude fixture](../../../tests/gateway/fixtures/a04_live_profiles_trial8.json)
retains all three 41-row captures, measured state metadata and every observed
trailing literal-space count. The token is consistent same-length benign ASCII;
paths/identity are redacted, pane ID is consistently anonymized, private unrelated
history is blanked preserving its trailing spaces. Unrecorded PID/time/guard
metadata is not inferred. Only this Claude observation is in the new fixture.

[Observation evidence](evidence/A_0_4-live-profile-8-observations.json) records
local comparison facts, including blank ready echo row, unchanged preceding
prefix, absent unique marker in the ready viewport, identical error/later panes
and matching recorded pane ID/size. Root reports one guarded CR, a completed
answer and `acceptance_uncertain`; no live tool success is claimed.

The [specific evidence/design request](A_0_4-live-profile-8_operator-evidence-request.md)
explains why these facts do not generalize to arbitrary repeated ASCII prompts.
Later metadata now exists, but final pre-CR guard, server/pane PID binding,
monotonic timing and a pinned 2.1.293 fresh accepted-turn contract remain missing.
Completed transcript markers alone do not resolve stale/replayed history.
A source/event contract plus exact Gateway boundary observations is the next
gate; no inferred regex or speculative interface is implemented.

[Read-only classifier evidence](evidence/A_0_4-live-profile-8-classification.json)
uses the unchanged candidate and sanitized measured panes: preAsk = `composer`,
error/later = `unknown_state`. This directly checks current classification;
it is not an `agent.ask` run or a fresh-turn test. The command was:

```text
node --input-type=module -
# Import classifyProviderPane, load the trial8 fixture, classify preAsk as ready
# and error/later as draft with each stage's measured metadata; save state only.
```

No source or existing tests were changed. The task's conditional implementation
branch was not entered: TDD RED, focused GREEN and native capture test were not
run, and none is claimed. `git diff --check` passes. The
[trial 8 manifest](evidence/A_0_4-live-profile-8-files.json) binds the assessment,
fixtures and unchanged source/test/README candidate. Prior review artifacts are
immutable and unchanged. This is a coder assessment/request, not a verdict,
acceptance, integration or sheet closure. Stop for independent assessment of the
request or new root-owned evidence before implementing a generic positive marker.
