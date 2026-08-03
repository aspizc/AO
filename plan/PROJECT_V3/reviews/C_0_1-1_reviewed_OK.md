# Review Verdict - Task PROJECT_V3/C/0/1 (Trial 1)

## Summary

Revision del diff `develop...HEAD` (commits `3775cb9` + `27e78f2`) contra la
spec `plan/PROJECT_V3/C/0/01.md` (hallazgo M2.2/D2). La tarea reconcilia el
README con `gateway/src/config.js` (tabla Runtime Environment completa),
reetiqueta Postgres/Redis/LangGraph/OTel como experimental V1 en vez de
"out of scope", referencia `docker/docker-compose.yml` desde README y
`docs/operator-guide.md`, y anade el structure-test de paridad
`tests/structure/test_readme_env_parity.py`. CHANGELOG actualizado con
`Closes V3 C/0/1`.

## Findings

### Paridad tabla README ↔ config.js (criterio a) — OK

- Verificado independientemente con
  `grep -oE "env\.(AGENTS_[A-Z_]+)" gateway/src/config.js | sort -u`:
  `config.js` carga exactamente 20 variables `AGENTS_*` y la tabla del README
  documenta exactamente esas 20. Ni omitidas ni aspiracionales.
- Defaults cotejados linea a linea contra `gateway/src/config.js:70-100`:
  `AGENTS_REDIS_URL` vacio (`config.js:83`), `AGENTS_REDIS_STREAM`
  `agents:events` (`config.js:84`), `AGENTS_MESSAGE_ACCESS_SECRET` vacio con
  fallback a fichero (`config.js:37`), `AGENTS_MESSAGE_ACCESS_SECRET_FILE`
  `<workspace>/secrets/message-access.key` (`config.js:39-43`),
  `AGENTS_OTEL_ENABLED` `false`, `AGENTS_OTEL_EXPORTER` `stderr`,
  `AGENTS_OTEL_SERVICE_NAME` `agents-gateway` (`config.js:95-99`). El resto
  de filas preexistentes siguen siendo correctas (`60000`, `600000`, `ag-`,
  `codex`, `workspace-write`, `0`, etc.). Correcto.

### Seccion Experimental V1 (criterio b) — OK

- "Out of scope" se divide en "Out of scope (MVP2.0)" y "Experimental
  (PROJECT_V1, sin gate de produccion)". Lista Postgres backend, Redis
  Streams publisher, `orchestrator-langgraph/` y OTel, con enlaces a
  `plan/PROJECT_V1/README.md` y `docker/docker-compose.yml`; ambos ficheros
  existen. No sobrevende: cada item dice explicitamente que no es el default
  operativo de MVP2.0 / no es gate de produccion.
- `docs/operator-guide.md` recibe solo la referencia breve a docker-compose
  prevista por la spec ("no reescribir la guia completa"). Correcto.

### Structure-test de paridad (criterio c) — OK

- Bidireccional: aserta por separado `missing` (config − README) y `extra`
  (README − config) con mensajes que listan las variables divergentes
  (`test_readme_env_parity.py:28-31`).
- Resistente a parser degenerado: aserta `len > 10` en AMBOS conjuntos
  (lineas 13 y 26). Con tabla vacia, `readme_vars` seria vacio y fallaria
  ruidosamente en el guard `> 10` antes de llegar a la comparacion; con un
  `config.js` reescrito a otro estilo, fallaria el guard del lado config.
  Tambien aserta que la seccion `## Runtime Environment` existe. No puede
  pasar en vacio.

### Alcance (criterio d) — OK

- `git diff develop...HEAD --name-only -- policies/ gateway/src/` devuelve
  vacio. Solo se tocan `README.md`, `docs/operator-guide.md`,
  `CHANGELOG.md`, el test nuevo y el handoff de review. Contrato MCP del
  Gateway intacto.

### Observacion menor (no bloqueante)

- El encabezado "Experimental (PROJECT_V1, sin gate de produccion)" mezcla
  castellano en un README en ingles; es la redaccion literal de la spec, asi
  que no se penaliza. Puede anglicanizarse en una pasada de pulido futura.

## Verification

Ejecutado por el reviewer en este workspace:

- `grep -oE "env\.(AGENTS_[A-Z_]+)" gateway/src/config.js | sort -u` —
  20 variables, identicas a la tabla del README.
- `.venv/bin/pytest tests/structure/test_readme_env_parity.py` — 1 passed.
- `.venv/bin/pytest tests/structure` — 108 passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` — "All checks passed"
  (incluye suites de gateway y orchestrator-langgraph, 81 passed,
  3 skipped en la fase final).

## Verdict

**OK.** Los cuatro criterios de aceptacion de `C/0/01.md` se cumplen y la
verificacion completa esta verde. Tarea C/0/1 cerrada en trial 1.
