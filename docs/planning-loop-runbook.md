# Assisted planning loop runbook

This runbook takes an operator through the Stage Z planner+coder loop using a
generic MCP host, Claude as planner, and Claude as apply coder. The loop is for
planning files only: `plan/**`.

## 1. Prerequisites

- A Node.js version accepted by the
  [runtime contract](node-runtime.md): `node --version`.
- Python environment installed as described in the main README.
- Claude CLI installed and logged in: `claude --version`.
- A dedicated planning branch:

```bash
git checkout -b plan/refine-stage-<x>
```

## 2. Dry-Run Rehearsal

Run the smoke first. It defaults to dry-run and does not require Claude CLI
execution:

```bash
node scripts/smoke_planning.mjs
```

The smoke verifies the MCP tools, the planner/coder roles, model resolution for
`claude-fable-5` at effort `max`, plan artifacts, review notes, and audit output.

## 3. Configure the Real Profile

Use the planner-assisted profile:

- `client-config/profiles/planner-assisted/mcp.json`
- `client-config/profiles/planner-assisted/.env.example`

Copy the env example into your host environment and edit:

```bash
AGENTS_DRY_RUN=0
AGENTS_POLICIES_DIR=./policies
AGENTS_REPO_ROOTS=/absolute/path/to/agents-orchestrator
AGENTS_CLAUDE_BIN=claude
```

`AGENTS_REPO_ROOTS` must be the absolute path to this checkout.

## 4. Connect Host And Prompts

In the MCP-capable host, load `agents-gateway` from the profile `mcp.json`.
Load these prompts:

- `prompts/orchestrator_planning_loop.md` for the host orchestrator addendum.
- `prompts/planner_system_prompt.md` for planner draft and review sessions.
- `prompts/planner_apply_coder_prompt.md` for the apply coder session.

The host should call Gateway tools, not local shell commands, for orchestration.

## 5. Loop

1. draft: ask the host to refine a stage, for example "refine Stage W with me".
2. The host assigns a planner task and asks the planner to produce a plan
   artifact with `artifact.put` and `kind: "plan"`.
3. escalate: if the planner returns `OPEN DECISIONS / QUESTIONS FOR HUMAN`,
   answer those questions before applying.
4. approval gate: the host calls `approval.request` with the current `traceId`,
   `action: "plan.apply"`, `requestedBy: "orchestrator"`, and
   `context: { repo, scope: "plan/**" }` before applying plan changes, then
   waits with `approval.wait` or polls until the human responds.
5. apply: the coder applies the approved plan to `plan/**` only.
6. review: inspect `git diff plan/`, then ask the planner to review the sanitized
   diff and write corrections with `artifact.put` and
   `kind: "review_notes"`.
7. converge: repeat draft/apply/review/escalate until the human approves the
   result.
8. close: close child sessions and call `orchestration.complete`.

## 6. Autonomous Mode

Autonomous mode is off by default. To let the Gateway auto-grant only the
planning apply gate, launch the smoke with:

```bash
AGENTS_AUTOAPPROVE=plan.apply node scripts/smoke_planning.mjs
```

For a real run, set the same variable in the MCP host environment beside
`AGENTS_DRY_RUN=0`. You can combine scopes, for example:
`AGENTS_AUTOAPPROVE=plan.apply,code.apply`.

`plan.apply` means the orchestrator may let the apply-coder edit `plan/**`
after the planner draft. The planner still reviews `git diff plan/` afterward
and records `review_notes`. If `OPEN DECISIONS / QUESTIONS FOR HUMAN` remain
unanswered, use the planner's recommended option and record that choice in
review notes and audit-visible artifacts.

Autonomous mode does not grant protected pushes, dependency changes, protected
branch writes, production-code edits, or restricted repository work. Those
remain human approval gates. To audit auto-grants:

```bash
grep APPROVAL_AUTO_GRANTED workspace/audit/events.jsonl
```

## 7. Verify

Check that only plan files changed:

```bash
git diff plan/
```

Inspect artifacts:

```bash
find workspace/artifacts -type f -maxdepth 3
```

Inspect audit:

```bash
PATH="$PWD/.venv/bin:$PATH" agent-run audit show --limit 100
```

The default audit file is `workspace/audit/events.jsonl`. Confirm planner and
coder roles, model `claude-fable-5` at effort `max`, plan artifacts, review notes,
`APPROVAL_REQUIRED`, `APPROVAL_AUTO_GRANTED` when `AGENTS_AUTOAPPROVE=plan.apply`
is enabled, and final orchestration completion.

## 8. Safety And Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Coder tries to edit outside `plan/**` | Prompt or host task is too broad. | Abort the run, do not approve, and restart with the apply-coder prompt. |
| `AGENTS_REPO_ROOTS` violation | The repo path is missing or relative. | Use the absolute path to this checkout. |
| Claude fails in real mode | CLI missing or not logged in. | Run `claude --version` and complete login before retrying. |
| Approval stays pending | Human has not responded. | Use the configured approval response path; never treat timeout as approval. |
| `plan.apply` stays pending | Autonomous mode is off or the context is restricted. | Approve manually, or launch with `AGENTS_AUTOAPPROVE=plan.apply` for non-restricted planning. |
| Diff is too broad | Apply task exceeded scope. | Stop and inspect `git diff`; revert with `git checkout` only if the operator explicitly approves. |

Never approve application without reading `git diff plan/`.
