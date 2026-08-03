# Review Submission - Task C/0/4 (Trial 1)

## What was done
- Added `docker/docker-compose.yml` with local Postgres and Redis services.
- Added development credentials, published ports, named volumes, healthchecks, and a shared bridge network.
- Documented optional local env vars in the compose file:
  - `AGENTS_DB_URL=postgres://agents:agents@localhost:5432/agents`
  - `AGENTS_REDIS_URL=redis://localhost:6379/0`
- Added `docs/adr/ADR-V1-03-postgres-state-backend.md`.
- Added `docs/adr/ADR-V1-04-redis-streams-event-bus.md`.
- Updated `CHANGELOG.md`.

## Why
- PROJECT_V1 Stage C needs a reproducible local infra stack and accepted decisions documenting Postgres state and Redis event-stream boundaries.

## Delegated Coder Runs
- Compose trace: `tr-956ab7e8-1e74-446f-b761-31bda9beee1a`.
- Compose task: `ts-9a38e581-d219-464b-9366-f4b7019bb544`.
- Compose session: `ss-b5527f78-8310-4221-a1da-2bb52e5c3f4a`.
- Compose artifact: `art-b5ac4b12-1a8a-4c99-8b64-277514d0e61c`.
- ADR trace: `tr-afa7a6d9-3bea-4e2e-8d64-b50f6a12b393`.
- ADR task: `ts-00c6efad-b34b-49a2-811e-f46257a54409`.
- ADR session: `ss-93f4d90c-45ea-4424-8e7c-9180104ddae0`.
- ADR artifact: `art-4d2ba289-e0c3-40e9-ba4e-831e4abd0a28`.

## Decisions Taken
- Kept Compose as optional local development infrastructure only.
- Preserved SQLite and JSONL as application defaults/fallbacks.
- Documented Postgres and Redis as infrastructure behind the Gateway, not MCP tools or authorization boundaries.
- Did not start containers; validation used static Compose config rendering.
- Left PR draft creation out because this workflow does not push branches unless explicitly requested.

## Verification
- `docker compose -f docker/docker-compose.yml config` - passed.
- `rg "AGENTS_DB_URL|AGENTS_REDIS_URL|MCP|SQLite|JSONL|restricted|raw|docker/docker-compose.yml" docker/docker-compose.yml docs/adr/ADR-V1-03-postgres-state-backend.md docs/adr/ADR-V1-04-redis-streams-event-bus.md` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Notes
- No source code or MCP contracts were changed.
- Stage C task review files for C/0/0 through C/0/3 are already present with OK verdicts.
