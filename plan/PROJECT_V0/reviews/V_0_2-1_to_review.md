# Review Submission - Task V/0/2 (Trial 1)

## What was done
- Added Claude CLI argument construction that includes `--model <id>` when the adapter receives a resolved model.
- Updated headless `delegate` to pass the model flag before the prompt.
- Updated supervised `spawn` to launch tmux sessions with `claude --model <id>` when a model is provided.
- Kept direct-adapter compatibility by omitting `--model` when no model is provided.
- Updated dry-run delegate/spawn output so tests can verify the effective launch model.
- Documented Claude model selection in the adapter docs and updated the changelog.

## Why
- MVP2.0 requires the reviewer agent to run with the policy-resolved Claude model, especially `claude-opus-4-7`.
- V/0/1 already resolves and passes the model to adapters; this task makes the Claude adapter honor that resolved value.

## Decisions Taken
- The adapter does not hardcode a default model; defaults remain registry/policy responsibility.
- `launchCommand` is returned from `spawn` for dry-run and test observability.
- The existing Claude policy dry-run test now expects the registry default model propagated by the service.

## Verification
- `node --test --experimental-test-isolation=none tests/gateway/claude_adapter.test.js` - passed after implementation.
- `node --test tests/gateway/claude_adapter.test.js` - passed.
- `node --test tests/gateway/claude_adapter.test.js tests/gateway/claude_policy.test.js tests/gateway/tool_agent_model.test.js` - passed.
- `npm --prefix gateway test` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed after stabilizing pre-existing artifact ordering flake in commit `42d1cac`.

## Commit
- `405ea34` - `feat(claude): pass selected model to adapter (V/0/2)`
