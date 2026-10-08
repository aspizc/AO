# A/0/06 operator response design: trial 1 — KO

Reviewer: independent Claude Opus 5.5, medium, read-only Gateway session
`ag-tr-v6-a06-operator-plan-claude-code-reviewer`, trace
`tr-v6-a06-operator-plan-1-3f40a50d-df67-4d28-aa63-d9893cc3a98b`, task
`ts-4e36df06-7249-482b-af62-cefff7bc7786`. Reviewed the proposed design
and human gate on base `45524a87ae87e87ff6a0aeaea3586984e93007c5`.

## Verdict

**KO.** The security gate and same-account residual are explicit, and the
default MCP deny remains intact. Three corrections are required before this
design authorizes implementation.

1. **Timeout must not overwrite an in-flight attempt.** On timeout the CLI
   must re-read the row. Only a granted row with neither `consumed` nor
   `promptAnswer` may be invalidated, by a CAS over the exact payload. A zero
   update requires a re-read. An in-flight or consumed-without-terminal row
   gets no CLI write and is reported `uncertain` with nonzero exit; the owner
   alone settles its exact in-flight token. Do not call
   `invalidatePromptApproval` or `recordPromptAnswer(..., null)` on the
   granted timeout path. RED/GREEN must race CLI timeout against owner
   `in_flight` then `sent` and keep the final `answered/sent` result.
2. **Watcher must retire externally finalized IDs.** Before returning for an
   unchanged prompt, `observe` must re-read the existing approval. If an
   external timeout has produced a final result, remove the old binding and
   unregister without sending or consuming again; the same visible prompt
   then gets exactly one fresh pending ID on the next observation. Test old
   ID zero sends and new ID one eventual send.
3. **The public CLI wrapper must report delivery.** Include
   `cli/src/agents_cli/main.py` and its tests. For prompt approvals, `agent-run
   approve` must show terminal `promptAnswer` status/outcome and exit zero only
   for `answered/sent` or explicit denial. Missing, `not_answered`, uncertain
   or errors exit nonzero; never print a bare `granted` as command delivery.
   The cross-process RED test must invoke `agent-run approve` itself, which
   invokes `approval-respond.mjs`, and assert parsed JSON and text output.
   Reject reserved internal decider names before DB mutation.

The reviewer ran no tests or real provider check. It checked whitespace on the
three untracked candidate files. An eventual design OK would still leave the
human security choice, implementation, full gate and live acceptance open.
