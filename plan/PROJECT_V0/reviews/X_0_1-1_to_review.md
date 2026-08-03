# Review Submission - Task X/0/1 (Trial 1)

## What was done
- Added `prompts/orchestrator_mvp2_two_agent.md` for the MVP2.0 supervised two-agent flow.
- Covered Codex coder (`gpt-5`, `medium`) and Claude reviewer (`claude-opus-4-7`) with explicit agent/role/model fields.
- Documented the recommended `orchestration.create` / `task.assign` / `agent.spawn` / `agent.ask` / `agent.view` / artifact / approval / `agent.kill` / completion sequence.
- Reaffirmed Gateway policy authority, sanitized reviewer handoff, Codex restricted-repo prohibition, async approvals, and human tmux intervention notes.
- Linked the prompt from the MVP2 MCP profile README.
- Added structure tests for the prompt contract.

## Why
- A generic MCP host needs concrete system instructions to use the X/0/0 profile correctly.
- The prompt should guide orchestration without becoming the security boundary.

## Decisions Taken
- Kept security language explicit: Gateway policy is authoritative, not the prompt.
- Kept model defaults explicit in the prompt to guide host behavior, while policies remain the runtime source of truth.
- Included `session.attach_info` and `session.intervention_note` for supervised tmux operator workflows.

## Verification
- `.venv/bin/pytest tests/structure/test_mvp2_orchestrator_prompt.py tests/structure/test_orchestrator_prompt.py` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `65c0c08` - `docs(prompts): add MVP2 orchestrator prompt (X/0/1)`
