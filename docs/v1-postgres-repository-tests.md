# Postgres Repository Tests

PROJECT_V1 C/0/1 kept SQLite as the default Gateway state backend and added
repository contract coverage for the Postgres backend path. PROJECT_V3 C/0/2
keeps that path opt-in and hardens it with a real Postgres integration suite.

Default CI runs:

```bash
npm --prefix gateway test
```

This includes SQLite repository contracts and fake Postgres repository
contracts through an injected executor. It does not require a live Postgres
server. `scripts/ci.sh` and GitHub Actions do not set the live Postgres opt-in
gate.

To run the repository contracts and adversarial literal coverage against the
compose Postgres service:

```bash
docker compose -f docker/docker-compose.yml up -d postgres
AGENTS_PG_INTEGRATION=1 npm --prefix gateway test -- ../tests/gateway/postgres_state.test.js
```

The default compose database URL is:

```text
postgres://agents:agents@localhost:5432/agents
```

Use `AGENTS_TEST_DB_URL` to point at a different disposable database:

```bash
AGENTS_PG_INTEGRATION=1 \
AGENTS_TEST_DB_URL='postgres://user:pass@localhost:5432/agents_test' \
npm --prefix gateway test -- ../tests/gateway/postgres_state.test.js
```

The legacy gate remains supported for compatibility:

```bash
AGENTS_TEST_DB=postgres \
AGENTS_TEST_DB_URL='postgres://user:pass@localhost:5432/agents_test' \
npm --prefix gateway test -- ../tests/gateway/postgres_state.test.js
```

The live test path applies Gateway Postgres migrations and clears Gateway domain
tables between contract cases, so repeated runs are idempotent for Gateway-owned
tables. Use only a disposable database. To stop the local service:

```bash
docker compose -f docker/docker-compose.yml stop postgres
```
