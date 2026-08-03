# Review Verdict - Task PROJECT_V3/D/0/0 (Trial 1) - OK

## Summary

D/0/0 cierra el hueco de tests directos del nucleo de observabilidad del Gateway
(`telemetry.js`, `trace_access.js` y los caminos de error de `mcp_server.js`),
hallazgo M3.1/T3 de la auditoria. El entregable son tres ficheros de test de
caracterizacion mas la linea de CHANGELOG, sin tocar produccion. El diff
`develop...HEAD` (commits `1b3f9a8` + `235063f`) contiene exclusivamente:
`tests/gateway/telemetry_unit.test.js`, `tests/gateway/trace_access_unit.test.js`,
`tests/gateway/mcp_server_errors.test.js`, `CHANGELOG.md` y el handoff de review.
Aprobado.

## Findings

### Invariante de contrato: CERO cambios en produccion (OK)
- `git diff --name-only develop...HEAD -- gateway/src policies` devuelve 0
  ficheros. El contrato MCP queda intacto, como exige la spec
  ("Cero cambios en `gateway/src/`").

### telemetry_unit.test.js (OK) — cubre seccion 2 de la spec
- **No-op span deshabilitado**: `createTelemetry({telemetry:{enabled:false}})`
  produce `NoopSpan`; el test verifica que `setAttribute/setAttributes/setStatus/
  recordException/end` (incluido doble `end()`) no lanzan. Fiel a `GatewayTracer.
  startSpan` (telemetry.js:140) y `NoopSpan` (:151-157).
- **traceIdForCall precedencia**: cubre las formas reales — `args.traceId/
  trace_id`, `metadata.*`, `context.*`, `params._meta.*`, `extra._meta.*` — y la
  precedencia args>meta. Coincide exactamente con el orden de `findValue` en
  `traceIdFromCall` (telemetry.js:48-61). El caso "sin traceId → generado" asierta
  `/^tr-/`, consistente con `newTraceId()` (ids.js:17-22).
- **safeToolCallAttributes**: `deepEqual` estricto sobre las 8 claves
  allowlisted (`approval.mode/scope`, `result.status`, `session.id`, `task.id`,
  `tool.name`, `trace.id`, `trace.source`); verifica que `prompt`, `payload`,
  `command`, `args`, `stderr` nunca aparecen (`JSON.stringify(...).includes(...)
  === false`) y que `session.id` se trunca a 200 (`shortString` max=200,
  telemetry.js:11-14, :20-23). Tambien caracteriza `trace.source`
  metadata/generated (telemetry.js:97-103).
- **Exporters**: `InMemorySpanExporter` recibe exactamente 1 span al `end()`
  (idempotencia probada con doble `end()`, telemetry.js:198) con
  `resource["service.name"]`, atributos y status correctos; `StderrSpanExporter`
  escribe exactamente una linea JSON `type:"otel_span"` por span end
  (telemetry.js:122-126), capturada interceptando `process.stderr.write`.

### trace_access_unit.test.js (OK) — cubre seccion 3
- Roundtrip mint+verify con el mismo secreto, asertando ademas formato hex de 64
  chars (sha256, trace_access.js:9-11).
- Fallos: token alterado en 1 char, traceId distinto, secreto distinto, token
  vacio/undefined → todos `false`.
- **Longitud invalida sin lanzar**: `too-short` y token+`00` se comprueban con
  `assert.doesNotThrow` y `=== false`, ejercitando el guard de longitud
  (trace_access.js:17) que evita que `timingSafeEqual` lance con buffers de
  distinto tamano (:19). Este es el punto fragil que la spec pedia fijar
  explicitamente; queda cubierto.

### mcp_server_errors.test.js (OK) — cubre seccion 4 sobre createCallToolHandler
- **Tool desconocida**: rechaza con `/unknown tool demo\.missing/`
  (mcp_server.js:70), span con status `ERROR`, `recordException` invocado y
  `append` llamado igualmente con `status:"error"` — comportamiento post-B/0/3
  (rama catch, mcp_server.js:82-88). `span.end()` exactamente 1 vez (finally).
- **Handler que lanza**: la excepcion se propaga, `recordException` recibe el
  error exacto (`span.exceptions[0] === thrown`) y `span.end()` ocurre una vez
  via finally (mcp_server.js:89-91).
- **append que falla**: warning a stderr (`level:"warn"`, `component:"gateway"`,
  `msg:"tool call audit append failed"`) y la respuesta del tool intacta
  (`ok:true`, status `OK`) — fiel al try/catch de `appendToolCallAudit`
  (mcp_server.js:54-56).
- **parseToolErrorCode**: codigo top-level truncado a 200
  (`error.code = "E".repeat(200)`, mcp_server.js:76) y JSON invalido
  (`"{invalid-json"`) sin crash con `error.code` undefined (catch en :36-38).

### Fakes minimos, no sobre-mockeo (OK)
- `telemetry_unit` usa el modulo real + `InMemorySpanExporter`; `mcp_server_errors`
  usa fakes pequenos de span/telemetry/append que ejercitan el handler real
  exportado sin arrancar el transporte stdio. Acorde a "Errores comunes" de la
  spec. No hay asserts de timing/ms sobre duracion de spans.

### Asserts estrictos (OK)
- Los tres ficheros usan `node:assert/strict`; `deepEqual` sobre claves
  ordenadas, igualdad exacta de valores y conteos (`length`, `ended`), identidad
  de excepcion. No se observan asserts laxos.

### Discrepancia spec↔codigo gestionada correctamente (nota, no bloqueante)
- La spec menciona `error.code` anidado, pero `parseToolErrorCode`
  (mcp_server.js:35) lee top-level `parsed?.error || parsed?.code`. El coder
  caracteriza el comportamiento real (top-level `code`) y registra el desajuste
  como follow-up en lugar de "arreglarlo", respetando el mandato de congelacion
  ("congela; los fixes se abren como hallazgos"). Decision correcta. Gap menor de
  cobertura: no se ejercita explicitamente la rama `parsed?.error` ni el valor
  `trace.source === "arguments"`; no afecta la fidelidad ni el verdict.

## Verification

- `node --test tests/gateway/telemetry_unit.test.js tests/gateway/trace_access_unit.test.js tests/gateway/mcp_server_errors.test.js` — 16 pass, 0 fail.
- `npm --prefix gateway test` — 455 pass, 9 skipped, 0 fail (el script incluye `../tests/gateway/**/*.test.js`, por lo que los tres ficheros nuevos quedan dentro de la suite).
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` — All checks passed (gateway JS + 81 passed/3 skipped Python).
- `git diff --name-only develop...HEAD -- gateway/src policies` — 0 ficheros (contrato inmutable).
- `CHANGELOG.md` — linea `Added direct Gateway observability and trace access characterization tests. Closes V3 D/0/0.` bajo `## Unreleased`.

## Verdict

**OK.** Los tres modulos del nucleo de observabilidad tienen test directo en
verde, los caminos de error del handler estan cubiertos (tool desconocida, throw,
append roto, JSON invalido), la caracterizacion es fiel al codigo real con asserts
estrictos, no hay cambios en produccion ni en el contrato MCP, el CHANGELOG esta
actualizado y el gate completo (`ci.sh`) esta verde. Tarea cerrada.
