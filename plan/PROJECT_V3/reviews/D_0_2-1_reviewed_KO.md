# Review Verdict - Task PROJECT_V3/D/0/2 (Trial 1) - KO

## Summary

La intencion del cambio es correcta y la mayoria de la implementacion es
solida: se elimina la inyeccion por `setTimeout(20)` a favor de
sincronizacion por estado observable (`approvalBus.listenerCount`), se
conserva (y amplia) la cobertura semantica, y no se toca `gateway/src/`,
`policies/` ni los valores de produccion. Sin embargo, **la tarea NO pasa el
criterio de aceptacion duro de "20 ejecuciones consecutivas verdes"**: las
nuevas asserciones de monotonia `elapsedMs >= cap` (con `cap` exactamente
igual al `serverMaxMs`/`timeoutMs` del test) son ellas mismas flaky y
reintroducen justo la fragilidad temporal que la tarea D/0/2 debe eliminar.
Veredicto: **KO**.

## Findings

### F1 (BLOQUEANTE) — La assercion de monotonia en el limite exacto es flaky

`tests/gateway/approval_wait.test.js:94` (test "wait never exceeds server max
timeout"):

```js
const result = await waitForDecision({ approvalId: pending.approvalId, timeoutMs: 10_000, serverMaxMs: 120 });
const elapsedMs = Date.now() - startedAt;
...
assert.ok(elapsedMs >= 120);   // <-- flaky
```

`waitForDecision` programa `setTimeout(..., capMs)` con `capMs = 120`
(`gateway/src/services/approval_service.js:137-147`). En Node v22 el callback
de `setTimeout(N)` puede dispararse hasta ~1 ms ANTES de `N` medido contra
`Date.now()` (redondeo de timers de libuv + resolucion de `Date.now`). Por
tanto `elapsedMs` ocasionalmente vale 118-119 ms y `elapsedMs >= 120` falla.

Reproducido de forma directa en esta maquina (sin carga artificial):

- Primer lote: fallo en la run 8 de 20 (rompe el criterio de "20 verdes").
- Segundo lote: **6 fallos en 40 runs (~15%)**, todos por
  `assert.ok(elapsedMs >= 120)` en el subtest 5
  ("wait never exceeds server max timeout").

El handoff afirma "passed 20 consecutive runs" y "PATH=... ./scripts/ci.sh -
passed"; no es reproducible: la suite es no determinista.

### F2 (mismo defecto, latente) — El patron de cota inferior en el limite se repite

El mismo anti-patron `elapsedMs >= cap` exacto aparece en:

- `:88` test "wait returns pending after client timeout" — `assert.ok(elapsedMs >= 120)` (`timeoutMs: 120`).
- `:135` test "approval wait tool is registered and bounded by config" — `assert.ok(elapsedMs >= 125)` (`approvalMaxWaitMs: 125`).

En los lotes ejecutados solo florecio el subtest 5, pero estos dos comparten
la misma exposicion (timer de `cap` ms vs `elapsedMs` medido desde antes de la
llamada) y pueden flakear igual. Cualquier correccion debe aplicarse a los
tres.

### Lo que SI esta bien (para no re-tocar en trial 2)

- Sincronizacion por `waitUntilApprovalWaitIsListening` es correcta:
  `waitForDecision` registra el listener sincronamente
  (`approval_service.js:148`) antes del primer `await`, asi que el listener ya
  esta presente cuando vuelve el control al test. Robusto.
- Cobertura semantica intacta o ampliada en los 7 casos (comparacion caso a
  caso contra `develop:tests/gateway/approval_wait.test.js`):
  - granted/denied later: ahora aserta `decision.status` Y `result.status`.
  - client timeout: anade `elapsedMs`, `events[0].timeoutMs === 120`.
  - server cap: cambia techo estrecho `<200` por monotonia + techo holgado
    `<1_200` + auditoria.
  - concurrent: sincroniza ambos waits, mantiene vector `["granted","pending"]`.
  - tool config: anade `elapsedMs`, techo `<1_250`, auditoria.
- Techos superiores con holgura x10 (`<1_200`, `<1_250`): correctos, ninguno
  por debajo de 100 ms.
- Cero cambios en `gateway/src/`, `policies/` ni en defaults de produccion
  (`git diff --name-only develop...HEAD` = CHANGELOG, review doc, test).
- CHANGELOG actualizado bajo `## Unreleased` con `Closes V3 D/0/2`.

## Verification

- `git diff --name-only develop...HEAD` → solo `CHANGELOG.md`,
  `plan/PROJECT_V3/reviews/D_0_2-1_to_review.md`,
  `tests/gateway/approval_wait.test.js`. OK (alcance correcto).
- `for i in $(seq 1 20); do node --test tests/gateway/approval_wait.test.js; done`
  → **FALLO en run 8** (`elapsedMs >= 120` falsy). KO.
- `for i in $(seq 1 40); ...` → **6/40 fallos** (~15%), todos en el subtest
  "wait never exceeds server max timeout".
- Node `v22.22.1`.
- No se ejecuto `npm --prefix gateway test` / `./scripts/ci.sh` completos: la
  suite objetivo ya es no determinista, por lo que esos gates heredan la misma
  flakiness; arreglar F1/F2 es prerequisito.

## Required changes for Trial 2

1. Sustituir las tres cotas inferiores en el limite exacto por una assercion
   robusta. Opciones aceptables (todas mantienen la semantica de monotonia y
   ninguna baja de 100 ms de margen real):
   - tolerancia: `assert.ok(elapsedMs >= cap - 5)` (o un margen documentado), o
   - aserta solo RESULTADO + ESTADO (status `pending` + evento de auditoria
     `APPROVAL_WAIT_TIMEOUT` con `timeoutMs === cap`) sin depender del reloj de
     pared para el limite inferior. La auditoria ya prueba que el timeout
     disparo con el cap correcto; el techo holgado superior (`< cap*10`) ya
     prueba que respeta el maximo del servidor.
2. Aplicar a los tres subtests (server cap `:94`, client timeout `:88`, tool
   config `:135`).
3. Re-verificar con >=20 (idealmente 40+) ejecuciones consecutivas verdes y
   adjuntar el conteo real reproducible.

## Verdict

**KO** — Trial 2 corrige SOLO los puntos F1/F2 (cotas inferiores flaky); el
resto del cambio queda como esta.
