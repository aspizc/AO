# A/0/04 prompt submission refinement — plan review, trial 2

## Verdict

**OK — the scoped refinement is ready to build. All three trial-1 KO findings
are closed at the plan level; no blocking finding remains in this candidate.**

This verdict approves the plan contracts and their verification requirements.
The implementation sheets remain **PLANNED**. It does not establish implemented,
integrated, promoted or released behavior.

- Base: `fb937565e7ebf74dbc85032de6162152f33b05a2`.
- Trace: `tr-r2-a04-plan-bbe0f024-d696-49e2-97e8-41990e35f26b`.
- Reviewer: separately assigned built-in Codex session
  `/root/review_prompt_plan_r2`, using the operator-authorized fallback.
  This session did not author or modify the candidate.
- Execution: no Claude or other provider invocation. Exact model/effort
  metadata is not independently exposed by this fallback and is not claimed
  verified.
- Request: [trial 2](A_0_4-plan-2_to_review.md).
- Prior verdict: [trial-1 KO](A_0_4-plan-1_reviewed_KO.md), unchanged.

| Reviewed plan file | Git blob |
|---|---|
| `plan/PROJECT_V6/A/0/04.md` | `227d66b856d1bef14a28251f57f7ac168a3ed315` |
| `plan/PROJECT_V6/A/0/06.md` | `03957c9a09b6d834e3da96a77d3d343efb8cdcc3` |
| `plan/PROJECT_V6/SHEETS.md` | `1f530f831e76c7e8f9c7c45cc359eeb4f2ef24d4` |
| `plan/PROJECT_V6/A/README.md` | `ec3d83461ce56b622c456922206090b7e12af93e` |

The verdict is bound only to these four blobs against the named base. Other
working-tree history-retention decisions, V7 planning and documentation changes
are outside its scope.

## Closure of prior findings

### F1 — Closed: exact framed delivery and separately guarded submit

`A/0/04.md:30-41` replaces the flag-only transport requirement with a uniquely
owned buffer per operation, stdin loading, exact target selection,
`paste-buffer -p -r`, newline preservation and cleanup after success or failure.
It requires confirmed bracketed paste mode, refuses when framing is unknown,
rejects unsupported control bytes before input, and prohibits raw multiline
fallback. The installed tmux manual confirms that `-p` adds delimiters only
when the application requested bracketed paste and `-r` avoids LF-to-CR
replacement; the plan now accounts for both conditions.

`A/0/04.md:42-57` requires current provider state checks, positive acceptance
evidence, at most one guarded retry for the same unchanged composer, no replay
after ambiguous acceptance and protection against concurrent asks to one
target. `A/0/04.md:95-112` names emitted-input, multiline, disabled-paste,
owned-buffer cleanup, menu-transition and stale-scrollback tests. These tests
can distinguish the intended behavior from a command containing the right
flag while still submitting a line or crediting an earlier response.

The problem statement at `A/0/04.md:14-23` now separates the observed stall from
an unverified TUI/paste diagnosis. The shell launch path at `:58-62` remains
explicitly separate and refuses command newlines/control bytes.

### F2 — Closed: the public MCP failure has an exact safe contract

`A/0/04.md:64-83` explicitly owns the `agent.ask` catalog, safe error projection,
derived contract/catalog documentation and contract tests. It defines
`AGENT_PROMPT_NOT_SUBMITTED`, the fixed message `prompt submission not confirmed`
and a finite optional reason allowlist. Unknown reasons are omitted; arbitrary
exception, prompt and pane data cannot be projected. Confirmed unchanged
composer evidence is required for `not_submitted`; `acceptance_uncertain`
cannot authorize replay.

`A/0/04.md:112` requires an emitted `agent.ask` MCP-envelope assertion, rather
than only an adapter exception assertion. The existing path through
`gateway/src/tools/agent.js:13`, `tool_helpers.js` and `tool_errors.js` can
preserve this thrown domain failure once the planned catalog/projection change
is made. Unknown-error sanitization remains an explicit requirement. The
updated scope no longer assumes an adapter-local error will survive the public
boundary automatically.

### F3 — Closed: approval answers cannot use composer submission

`A/0/04.md:75-78` exports a composer-only boundary and assigns permission answers
to A/0/06. `A/0/06.md:34-52` and `:75-78` consistently require a distinct
approval-bound answer operation, with only low-level transport reused.
Immediately before answering, it must bind the current command, target and
options to the approved request, refuse changed/disappeared prompts and consume
a decision at most once. The distinguishing tests at `A/0/06.md:70-71` cover
both stale prompts and replayed approval.

A/0/04 therefore preserves its refusal to answer trust/permission/model menus
without disabling A/0/06's authorized answer path. No answer implementation,
new approval scope or policy edit is added to A/0/04.

## Build readiness and evidence boundaries

- `SHEETS.md:13` registers the additional catalog/projection write scope;
  `A/README.md:23-27` records ownership and serial reconciliation with A/0/05
  and A/0/06. Functional dependency edges remain reciprocal and acyclic;
  the wave order is unchanged.
- `A/0/04.md:140` includes the tmux builder suite, all five executable adapter
  suites including `pi_opencode_adapters.test.js`, public error serialization
  and projection checks. The contradictory combined-send expectation in
  `tests/gateway/tmux_client.test.js:21` is part of the focused verification.
  Registry-only `gemini-cli` remains outside execution.
- The RED requirements exercise emitted behavior and distinguish unsafe
  success, stale evidence and unintended decision keys. The existing transport,
  adapter and public-tool boundaries provide the planned implementation seams;
  no unregistered prerequisite is introduced by this refinement.
- Provider-specific ready/accepted markers and supported versions are measured
  build evidence. They need not be invented during this plan review. The build
  must collect and test them per provider/version, establish that acceptance
  belongs to this submission, and keep unknown states closed. A command flag,
  generic banner or dry-run snapshot cannot satisfy those requirements.
- `A/0/04.md:123-135` keeps the live checks separate from stub coverage. The
  Claude live check remains **DEFERRED** while the no-Claude instruction is
  active. This plan OK does not close that acceptance criterion; the build
  handoff must continue to report it explicitly.

## Verification performed and limits

Read AGENTS/profile, the planning skill and `plan/README.md`, both immutable
requests, the prior KO, all four candidate files and their scoped diff against
the named base. Inspected the existing tmux/base adapter seams, five adapter
ask call sites, agent-service/public-tool error propagation, catalog and error
serialization/projection tests, and the installed tmux manual.

Rechecked all four Git blob identities immediately before writing this verdict.
`git diff --check fb937565e7ebf74dbc85032de6162152f33b05a2 --` for the four
scoped files passed. Observed branch `release/1.1.0` and HEAD equal to the named
base during review.

No production code changes, provider live execution, test-suite/full-gate run,
staging, commit or release verification occurred. Test/gate results are **not
run**, not a pass. This new immutable verdict is the only repository write by
this reviewer; root owns evidence indexing, artifact persistence and scoped
integration. A future changed candidate requires a fresh review trial and
trace/session.
