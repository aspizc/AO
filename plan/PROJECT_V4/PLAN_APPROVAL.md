# Gate `plan.apply`

Estado: **G-1 RESUELTO; G0 AUTORIZADO POR EL OWNER; EJECUCIÓN V5 ACTIVA**.

## Decisión vinculante

El owner autorizó en la conversación de producto terminar Project V4 y Project
V5 de forma autónoma, implementar lo necesario, cambiar `policies/` cuando
exista evidencia, crear commits y promover a `develop` y `main`. La prioridad
es funcionalidad. Esta autorización sustituye el estado pendiente del corte de
auditoría, pero no convierte ninguna tarea planificada en implementada.

| Campo | Decisión |
|---|---|
| Specs y baseline reconciliados | `85f7ab9d49c14ff9d358e3cb790a41728617afa3` |
| `develop` al resolver G-1 | `85f7ab9d49c14ff9d358e3cb790a41728617afa3` |
| `main` al resolver G-1 | el mismo commit `85f7ab9d49c14ff9d358e3cb790a41728617afa3` |
| Integración V4 anterior | `integration/PROJECT_V4@a362853` es evidencia histórica; no se rebasa ni se promociona |
| Worktrees M0 preliminares | evidencia histórica sobre base obsoleta; no cierran tareas |
| Programa de ejecución | hojas B–I de V5 y ledger [`../PROJECT_V5/V4_ABSORPTION.md`](../PROJECT_V5/V4_ABSORPTION.md) |
| Alcance autorizado | todas las waves necesarias hasta cerrar V4/V5, con TDD, revisión independiente y CI |
| Promoción autorizada | commits y merges locales a `develop` y `main` después de cada gate revisado |
| No autorizado por esta decisión | push remoto, tag o publicación de release |
| Autoridad | mensaje explícito del owner; no procede de `approval.respond` ni del bus |
| Vigencia | hasta completar este objetivo o revocación explícita; no se proporcionó caducidad horaria |

## Condiciones de ejecución

- Cada hoja conserva estados separados para implementación, review,
  integración, promoción y release.
- Un V4 source sólo pasa a `absorbed` cuando todos sus owners V5 tienen
  implementación, tests, review independiente y contención verificable en
  `develop` y `main`.
- Los worktrees y commits preliminares pueden aportar evidencia, pero no
  sustituyen replay sobre la línea activa.
- `message.*`, `agents:events`, credenciales y servicios MCP/Redis compartidos
  conservan sus límites contractuales.
- Un KO abre el siguiente Trial append-only; no se reescribe evidencia.

G0 queda registrado aquí fuera del Gateway legacy, tal como exigía el plan.
El protocolo de approval del Gateway no se usa como autoridad retroactiva.
