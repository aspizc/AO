# Auditorías del proyecto

Este directorio es el punto de entrada canónico para las auditorías del
repositorio. Los planes consumen sus conclusiones, pero no sustituyen a los
informes.

## Auditoría vigente

### 2026-07-30 — proyecto completo V0–V5

- [Informe integral](2026-07-30-project-wide/README.md)
- Documentos detallados por área:
  [producto](2026-07-30-project-wide/01_PRODUCT_FUNCTIONAL.md),
  [arquitectura](2026-07-30-project-wide/02_ARCHITECTURE_INFRASTRUCTURE.md),
  [código](2026-07-30-project-wide/03_CODE_QUALITY.md),
  [seguridad](2026-07-30-project-wide/04_SECURITY_THREAT_MODEL.md),
  [operaciones](2026-07-30-project-wide/05_OPERATIONS_RELIABILITY.md),
  [testing/release](2026-07-30-project-wide/06_TESTING_RELEASE_CONFIDENCE.md),
  [datos/privacidad](2026-07-30-project-wide/07_DATA_PRIVACY.md),
  [UX operativa](2026-07-30-project-wide/08_UX_OPERATOR_EXPERIENCE.md),
  [gobernanza/trazabilidad](2026-07-30-project-wide/09_GOVERNANCE_PLANNING_TRACEABILITY.md)
  y [cobertura de remediación](2026-07-30-project-wide/10_REMEDIATION_COVERAGE.md).
- Alcance: producto completo, arquitectura, código, seguridad, operación,
  testing/release, datos/privacidad, UX operativa, planes y trazabilidad.
- Corte exacto: `2986b09`, promovido localmente a `main` y `develop`, pero sin
  tag, remote ni publicación.
- Dictamen: **D+ global**, **C para substrate/dry-run local** y **F para
  ejecución de agentes reales no confiables**.
- Resultado de planificación:
  V5 contiene 82 hojas ejecutables, 38 cerradas y 44 abiertas. Las 71 hojas
  V4 no terminales se absorben por esos 44 owners V5; no son 71
  implementaciones adicionales.

Esta es la auditoría solicitada sobre el proyecto entero; no está limitada a
V5. Incluye la regresión de los smokes oficiales, dos fallos reproducidos del
gate completo, la promoción local sin release y una nueva medición de la
topología operativa real.

## Auditorías de base

### 2026-07-26 — proyecto completo V0–V5

- [Informe integral](2026-07-26-project-wide/README.md)
- Dictamen histórico: **D global** y **F para ejecución de agentes reales**.
- Se conserva como baseline para medir el avance de autoridad, coordinación,
  CI/dependencias y el empeoramiento de la multiplicación de Gateways.

### 2026-07-25 — revisión independiente de PROJECT_V5

- [Índice](PROJECT_V5_INDEPENDENT_2026-07-25_GPT56SOL_ULTRA/00_INDEX.md)
- Lentes: producto, arquitectura, código, UX, seguridad, testing y
  datos/privacidad.
- Nota: esta revisión se conserva como evidencia especializada de V5; no es la
  auditoría global vigente.

### 2026-06-19 — revisión multi-lente

- [Índice](2026-06-19-gpt-5.5/README.md)
- Lentes: producto, arquitectura, código y UX.

## Estado de integración

Durante la auditoría vigente, `main` y `develop` se alinearon localmente en
`2986b09` tras el verdict independiente de promoción Trial 4. Esa promoción no
es un release: no existe un tag que contenga el candidato, no hay remote
configurado, el gate exacto falló y no hay evidencia de publicación o
despliegue. Los documentos de la auditoría permanecen como cambios locales
hasta que reciban su propio review e integración.
