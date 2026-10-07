# A/0/04 prompt submission refinement — plan review, trial 2

Base: `fb937565e7ebf74dbc85032de6162152f33b05a2`.
Trace: `tr-r2-a04-plan-bbe0f024-d696-49e2-97e8-41990e35f26b`.

| Candidate | Git blob |
|---|---|
| `plan/PROJECT_V6/A/0/04.md` | `227d66b856d1bef14a28251f57f7ac168a3ed315` |
| `plan/PROJECT_V6/A/0/06.md` | `03957c9a09b6d834e3da96a77d3d343efb8cdcc3` |
| `plan/PROJECT_V6/SHEETS.md` | `1f530f831e76c7e8f9c7c45cc359eeb4f2ef24d4` |
| `plan/PROJECT_V6/A/README.md` | `ec3d83461ce56b622c456922206090b7e12af93e` |

The [trial-1 KO](A_0_4-plan-1_reviewed_KO.md) remains immutable. This revision
addresses all three findings: uniquely owned bracketed paste buffers with
newline preservation and refusal without paste mode; public MCP error code
and bounded reason projection; a separate approval-bound A/0/06 answer path.
It adds stale-scrollback, transport cleanup and emitted-envelope checks,
includes all five executable adapter suites, and registers shared catalog
ownership without changing wave dependencies. `git diff --check` passes.

Review only the four named plan files. Other root changes record an explicit
operator history-retention decision or author V7 and are outside this
candidate. No code, provider invocation or runtime verification is claimed.
Use a fresh independent Codex reviewer; no Claude. Return an immutable OK/KO
bound to these blobs; root owns evidence indexing and scoped integration.
