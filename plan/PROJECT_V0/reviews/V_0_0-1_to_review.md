# Review Submission - Task V/0/0 (Trial 1)

## What was done
- Added local model metadata to `policies/agent-capabilities.json` for Gemini, Claude Code, and Codex.
- Added Codex `reasoningEfforts` and `defaultReasoningEffort`.
- Added registry validation for model/default consistency and reasoning-effort/default consistency.
- Added an `agent-capabilities` JSON Schema plus valid/invalid fixtures.
- Extended policy context and policy evaluation to resolve default models and reject disallowed `model` / `reasoningEffort` before adapter execution.
- Updated policy explain traces and registry/schema/model tests.

## Why
- MVP2.0 needs the orchestrator to request concrete child-agent models, starting with Codex `gpt-5` + `medium` and Claude `claude-opus-4-7`.
- Model validation must be local, deterministic, registry-driven, and enforced before any agent spawn/delegate.

## Decisions Taken
- Model validation applies only to `agent.delegate` and `agent.spawn`.
- Agents without a `models` block remain compatible and do not get a resolved model in allow decisions.
- Allowed decisions include resolved `model` and, when configured, resolved `reasoningEffort`.
- The JSON Schema validates shape; cross-field invariants such as `defaultModel in models` are enforced by the registry loader.

## Verification
- `node --test tests/gateway/policy_model.test.js tests/gateway/registry_agent_capabilities.test.js tests/gateway/registry_loader.test.js tests/gateway/schemas.test.js` - passed.
- `PATH="$PWD/.venv/bin:$PATH" agent-run policy validate` - passed.
- `npm --prefix gateway test` - passed after one unrelated intermittent rerun of `auto_sanitize_artifacts`.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `fb5c2c1` - `feat(policy): add agent model registry rules (V/0/0)`
