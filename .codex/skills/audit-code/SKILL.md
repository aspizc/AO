---
name: audit-code
description: >-
  Audita en modo solo lectura la corrección, mantenibilidad, complejidad,
  rendimiento, dependencias, configuración y operabilidad de un repositorio,
  con hallazgos priorizados y evidencia archivo:línea. Usar cuando el usuario
  pida auditoría de código, revisión técnica del repositorio, codebase health
  check, deuda técnica, bugs latentes, calidad de código, “auditoría del código”
  o invoque $audit-code. No usar para un único diff o PR, ni como sustituto de
  una auditoría profunda de seguridad, arquitectura, pruebas, producto o UX.
---

# Auditoría de código

Evaluar si el código hace lo que promete, puede evolucionar sin riesgo desproporcionado y ofrece evidencia suficiente para operarlo. Mantener la auditoría separada de cualquier implementación.

## Preparar

Leer completamente [references/checklist.md](references/checklist.md) antes de emitir hallazgos.

- Leer las instrucciones del repositorio, su estado de Git, manifiestos, lockfiles, CI, documentación y puntos de entrada.
- Delimitar el alcance y priorizar el 20 % del código que concentra rutas críticas, datos valiosos o mayor frecuencia de cambio. Enumerar las zonas revisadas con menor profundidad.
- No modificar código, configuración ni tests. No instalar paquetes, ejecutar formatters o lanzar suites caras sin autorización. Permitir únicamente comprobaciones locales, seguras y no destructivas que aporten evidencia.
- Responder en el idioma del usuario y calibrar contra la madurez y objetivos declarados, no contra una arquitectura ideal genérica.

## Trabajar en cuatro fases

### 1. Mapear antes de juzgar

Reconstruir propósito, stack, entry points, módulos, dependencias, flujo de control/datos, interfaces externas, configuración, despliegue y estrategia de pruebas. Contrastar documentación con el comportamiento construido.

### 2. Auditar con evidencia

Aplicar el checklist y registrar solo problemas con consecuencia concreta. Para cada hallazgo incluir:

- `COD-NNN`, título, severidad y confianza.
- Estado: `observado`, `reproducido`, `inferido` o `no verificable`.
- Evidencia exacta `archivo:línea` y, si se ejecutó algo, comando y resultado relevante.
- Mecanismo causal y escenario de fallo; indicar entrada, estado o condición necesaria.
- Impacto en corrección, cambio, rendimiento u operación.
- Recomendación mínima, criterio de aceptación y prueba que demostraría el cierre.

Distinguir hechos de juicios. Tratar resultados de linters, métricas, TODOs y escáneres como pistas hasta confirmar el código alcanzable y el impacto. Para Critical/High, volver a leer la ruta completa y buscar una segunda señal independiente.

### 3. Sintetizar la estrategia

Agrupar hallazgos por 3–5 causas sistémicas. Definir estado objetivo, principio, control permanente y trade-offs. Señalar explícitamente qué no conviene cambiar todavía y por qué.

### 4. Proponer un plan

Ordenar acciones en: contención/corrección crítica, red de seguridad, mejoras de alto apalancamiento y limpieza. Incluir IDs cubiertos, áreas afectadas, esfuerzo `S/M/L/XL`, riesgo de la propia modificación, dependencias, aceptación verificable y una prueba de cierre. No implementar.

## Calibrar severidad

- `Critical`: corrupción/pérdida grave, ejecución peligrosa o indisponibilidad inmediata en una ruta alcanzable.
- `High`: defecto probable con impacto serio en una ruta principal o cambio rutinario.
- `Medium`: fallo o coste significativo pero contenido y recuperable.
- `Low`: deuda local o mejora preventiva con efecto acotado.

Separar severidad de confianza. Las hipótesis de confianza baja deben quedar en validaciones pendientes, no en la lista principal.

## Entregar

Cuando esta skill participe en una auditoría multilente, escribir toda esta entrega en `audit/<AAAA-MM-DD>/code-audit.md`. La hoja debe ser autosuficiente y conservar evidencia, hallazgos, estrategia y plan completos; el índice, el resumen o el consolidado no la sustituyen. Si el lente queda bloqueado, documentar en esa hoja el alcance, la evidencia intentada, el bloqueo y los pasos para desbloquearlo.

Producir un documento con:

1. Resumen ejecutivo, postura A–F opcional, confianza, tres riesgos y tres oportunidades.
2. Alcance, cobertura, comandos ejecutados y limitaciones.
3. Mapa del repositorio y rutas críticas.
4. Hallazgos priorizados y fortalezas que conservar.
5. Estrategia y trade-offs.
6. Plan por hitos, quick wins y boceto de las tres acciones principales.
7. Validaciones pendientes y preguntas abiertas.

No usar una nota A–F sin explicar cobertura y confianza. No afirmar que algo “no existe” cuando solo se ha muestreado una parte del repositorio.
