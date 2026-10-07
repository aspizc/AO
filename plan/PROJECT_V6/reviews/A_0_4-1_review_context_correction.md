# A/0/04 Trial 1 — review context and provenance correction

This new immutable correction supplements
[A_0_4-1_reviewed_KO.md](A_0_4-1_reviewed_KO.md). The original verdict remains
unchanged and **KO**. This correction changes context and attribution only;
it supplies no new prompt-acceptance, gate, integration or release evidence.

## Claude authorization and provider evidence

During review, the operator explicitly re-enabled Claude and selected
**Opus 5.5, effort medium**, as recorded in
`workspace/root-gate-context.md` and the root's correction assignment.
Claude live acceptance is therefore **NOT RUN, but no longer prohibited**.
The old verdict's statements that Claude remains prohibited or awaits an
operator change are superseded by this authorization update. Codex live
acceptance and measured settle timing also remain **NOT RUN**.

The root's installed-version observation is **Claude Code 2.1.293**.
The reviewed static composer fixture describes **2.1.292**; it does not
establish rendering, marker compatibility or live acceptance for 2.1.293.
The root also observed **agy 1.3.0** through version/help commands; its
positive composer and acceptance behavior remain unmeasured. Version/help
observations do not satisfy the sheet's live prompt-submission criteria.
No provider invocation or live acceptance check was performed for this
correction.

## Correct reviewer provenance

The root-provided assignment identifies this independent Gateway reviewer:

- Session: `ag-tr-r1-ao-a04-e1d31bc0-42-codex-reviewer`.
- Trace: `tr-r1-ao-a04-e1d31bc0-42ea-4939-9046-a327c26b3448`.
- Task: `ts-b150ddc0-37df-4f6f-a50f-10c503654675`.
- Agent/role: `codex` / `reviewer`.
- Model: `gpt-6.1-sol`.
- Reasoning effort: `max`.
- Service tier: `priority`.

These root-provided reviewer identifiers supersede the verdict's `/root`
standalone-session attribution and statement that no reviewer Gateway binding
or exact model/effort/tier assignment was established. They are assignment
provenance, not a claim of a new independent Gateway query. The reviewer
remains independent of the candidate's coder; the operator's Claude selection
does not change this Codex review's identity.

## Unchanged disposition and immutable evidence

The full gate remains **failed, exit 1: 982 passed, 2 failed, 3 skipped**.
The Gateway runner's printed 1,664 passes and 9 skips remain invalidated by
its process-cleanup failure. No gate rerun was started by this correction.
All implementation findings and unmet acceptance criteria remain as recorded;
re-enabled authorization does not convert unexecuted live checks into passes.

The original KO verdict is preserved byte-for-byte, SHA-256:
`193e7044d3abc049db40e6def73673466d85932ab35a3e081f3d1d8d80a3c188`.
Only this new correction file is written. No production changes, verdict
rewrite, commits or subagents accompany it; root owns subsequent indexing
and evidence publication.
