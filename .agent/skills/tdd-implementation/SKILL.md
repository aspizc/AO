---
name: tdd-implementation
description: Use when implementing agents-orchestrator plan tasks end to end with TDD, one commit per completed task or subtask, peer review handoff files in plan/reviews, OK/KO trial handling up to 15 attempts, and optional human escalation files for decisions that need operator review.
---

# TDD Implementation With Peer Review

Use this skill when the user asks to implement project plan steps, continue the backlog, or work through `plan/<stage>/<stream>/<task>.md` tasks in the `agents-orchestrator` repository.

## Non-Negotiables

- Code, tests, comments, identifiers, and commit messages in English.
- Follow TDD for every implementation task: write tests first, run them red, implement the minimum, run green, refactor while green.
- Work on the task or subtask identified by the plan. If none is specified, choose the next task without an OK review in plan order.
- Commit after each completed task or subtask, before writing the review request.
- Never `git push` unless the human explicitly asks.
- Do not touch restricted repositories or paths outside this repository.
- Respect project invariants from `plan/README.md`: no `orchestrator/` component, MCP server name `agents-gateway`, async approval flow, logs to stderr, stdout reserved for MCP.

## Task Intake

1. Read `plan/README.md`.
2. Read the stage README, for example `plan/A/README.md`.
3. Read the concrete task file, for example `plan/A/0/00.md`.
4. Map the review id as `<stage>_<task>_<subtask>`, where `A/0/00.md` becomes `A_0_0`.
5. Inspect existing review files for that id:
   - If the latest trial has `reviewed_OK`, move to the next task.
   - If the latest trial has `reviewed_KO`, implement the requested corrections in the next trial.
   - If a `to_review` has no verdict, wait for the reviewer.

## TDD Cycle

For each task or correction trial:

1. Identify required behavior, files, acceptance criteria, and common mistakes from the task spec.
2. Add or update tests first.
3. Run the smallest relevant test command and confirm the new test fails for the expected reason.
4. Implement the production change.
5. Run the relevant tests until green.
6. Run broader verification requested by the task, or the closest available check if the requested script does not exist yet.
7. Refactor only with tests green.
8. Update `CHANGELOG.md` when the task definition of done requires it.

## Commit Gate

Before committing:

- Review `git status --short` and avoid staging unrelated user changes.
- Run the task's required tests or document why a check is not available.
- Commit only the completed task or subtask.
- Use an English commit message that references the task id, for example:
  `feat(structure): create project directory architecture (A/0/0)`.

## Review Request

After the commit, create:

`plan/reviews/<stage>_<task>_<subtask>-<trial>_to_review.md`

The file must include:

```markdown
# Review Submission - Task <stage>/<task>/<subtask> (Trial <trial>)

## What was done
- ...

## Why
- ...

## Decisions Taken
- ...

## Verification
- `<command>` - <result>

## Commit
- `<sha>` - <subject>
```

If you made a decision that should be reviewed by a human, also create:

`plan/reviews/<stage>_<task>_<subtask>-<trial>_to_check_by_human.md`

Keep that file focused on the decision, alternatives, risks, and the exact question for the human.

## Waiting For Review

After writing `to_review`, wait for the peer reviewer to create one of:

- `plan/reviews/<stage>_<task>_<subtask>-<trial>_reviewed_OK.md`
- `plan/reviews/<stage>_<task>_<subtask>-<trial>_reviewed_KO.md`

Poll without consuming attention unnecessarily, for example:

```bash
id="A_0_0-1"
while true; do
  if [ -f "plan/reviews/${id}_reviewed_OK.md" ]; then
    echo OK
    exit 0
  fi
  if [ -f "plan/reviews/${id}_reviewed_KO.md" ]; then
    echo KO
    exit 0
  fi
  sleep 30
done
```

If the verdict is OK, continue to the next task.

If the verdict is KO:

1. Read the reviewed file completely.
2. Apply the requested corrections with TDD.
3. Increment the trial number.
4. Repeat the commit and review request flow.
5. Stop after trial 15 if the result is still KO and wait for human intervention. Do not start trial 16.

## Completion

When stopping, report:

- Last task id and trial.
- Commit created.
- Review file created.
- Verdict status: waiting, OK, KO, or human intervention required.
