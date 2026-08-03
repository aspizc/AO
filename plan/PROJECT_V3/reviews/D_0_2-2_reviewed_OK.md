# Review Verdict - Task PROJECT_V3/D/0/2 (Trial 2) - OK

## Summary

Trial 2 corrige exactamente los puntos F1/F2 del KO de trial 1 y nada mas. Las
tres asserciones de cota inferior en el limite exacto (`elapsedMs >= cap`) —la
causa del flake (~15%) reproducido en trial 1— se han eliminado, sustituidas
por la prueba de RESULTADO + ESTADO observable (status `pending` + evento de
auditoria `APPROVAL_WAIT_TIMEOUT` con `timeoutMs === cap`), que era la opcion
preferida que indique en el KO. Los techos holgados (`< 1_200`, `< 1_250`), la
sincronizacion por `listenerCount`, los asserts de resultado y la cobertura
semantica de trial 1 se mantienen intactos. La suite es ahora determinista:
**40/40 verdes** reproducidos por mi. Veredicto: **OK**.

## Findings

### F1 — Resuelto

`tests/gateway/approval_wait.test.js` (test "wait never exceeds server max
timeout"): eliminado `assert.ok(elapsedMs >= 120)`. Se conservan
`result.status === "pending"`, `events[0].timeoutMs === 120` y
`elapsedMs < 1_200`. La auditoria con `timeoutMs === 120` prueba que el cap del
servidor (120) fue el limite efectivo —no el `timeoutMs: 10_000` del cliente—,
preservando la semantica de "respeta el maximo del servidor" sin depender del
reloj de pared en el limite inferior.

### F2 — Resuelto (los dos casos latentes)

- Client timeout (`timeoutMs: 120`): eliminado `assert.ok(elapsedMs >= 120)` y
  la medicion `startedAt`/`elapsedMs` ya no usada. Se conservan
  `result.status === "pending"`, `events.length === 1`,
  `events[0].approvalId` y `events[0].timeoutMs === 120`.
- Tool config (`approvalMaxWaitMs: 125`): eliminado
  `assert.ok(elapsedMs >= 125)`. Se conservan `result.status === "pending"`,
  `elapsedMs < 1_250`, `events.length === 1` y `events[0].timeoutMs === 125`.

### Alcance — Correcto

`git diff --name-only 7958e3f..HEAD` → `D_0_2-1_reviewed_KO.md` (mi verdict de
trial 1), `D_0_2-2_to_review.md` (handoff) y
`tests/gateway/approval_wait.test.js`. El commit del coder `e708d18` toca
**solo el test**. Cero cambios en `gateway/src/`, `policies/` ni en defaults de
produccion. CHANGELOG no se re-toca (la linea `Closes V3 D/0/2` ya estaba desde
trial 1; duplicarla seria incorrecto).

### Sin regresion de cobertura

Comparado caso a caso con trial 1: los 7 subtests mantienen toda su cobertura
de resultado/estado/auditoria; solo desaparecen las 3 cotas inferiores
fragiles. La semantica de "el wait respeta `maxWaitMs`" sigue testeada via
auditoria (`timeoutMs === cap`) + techo holgado, conforme a la opcion 1 del
KO.

## Verification

- `git diff --name-only 7958e3f..HEAD` → solo test + docs de review. OK.
- `for i in $(seq 1 40); do node --test tests/gateway/approval_wait.test.js || break; done`
  → **40/40 verdes, 0 fallos** (mismo bucle que reprodujo el flake en trial 1,
  que ahora no aparece). OK.
- `npm --prefix gateway test` → **463 passed, 9 skipped, 0 failed** (472). OK.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` → **All checks passed**
  (81 passed, 3 skipped en orchestrator-langgraph; gateway verde). OK.
- Node `v22.22.1`.

## Verdict

**OK** — D/0/2 cerrada. Criterios de aceptacion cumplidos: ningun assert
depende de margenes <100ms ni de cotas temporales fragiles, cobertura semantica
intacta (timeout, respuesta durante wait, cap del servidor), y >=20 (40)
ejecuciones consecutivas verdes verificadas por el reviewer.
