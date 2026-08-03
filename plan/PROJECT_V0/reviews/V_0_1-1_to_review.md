# Review Submission - Task V/0/1 (Trial 1)

## What was done
- Added optional `model` and `reasoningEffort` fields to `agent.delegate` and `agent.spawn`.
- Plumbed requested model fields through the agent service policy check.
- Passed resolved policy model fields to adapters after validation/default resolution.
- Added `AGENT_MODEL_RESOLVED` audit events for delegate and spawn calls.
- Documented the Gateway `agent.*` model field contract.
- Added gateway tests covering schema exposure, default resolution, allowed overrides, denied models, spawn propagation, and agents without reasoning-effort support.

## Why
- MVP2.0 needs orchestrators to request concrete child-agent models while keeping model validation deterministic and local.
- Adapter execution must only receive model choices after policy has accepted or defaulted them.

## Decisions Taken
- The service passes only resolved policy values to adapters, not the raw caller input.
- `reasoningEffort` is omitted for agents that do not declare `reasoningEfforts`.
- Model resolution is audited with a dedicated `AGENT_MODEL_RESOLVED` event.

## Verification
- `node --test tests/gateway/tool_agent_model.test.js` - passed.
- `node --test tests/gateway/tool_agent_model.test.js tests/gateway/tool_agent.test.js tests/gateway/agent_errors.test.js tests/gateway/policy_model.test.js` - passed.
- `node scripts/smoke_mcp.mjs` - passed.
- `npm --prefix gateway test` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `93d6af9` - `feat(agent): plumb model selection through tools (V/0/1)`
