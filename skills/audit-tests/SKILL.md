---
name: audit-tests
description: >-
  Audita en modo solo lectura la estrategia de pruebas y la confianza real de
  entrega: rutas críticas, fuerza de aserciones, mutation lens, pirámide,
  contratos, flakiness, datos de prueba, velocidad y gates de CI. Usar cuando el
  usuario pida auditoría de tests o QA, revisión de cobertura/calidad de pruebas,
  release confidence, test strategy review, “auditoría de pruebas”, “podemos
  publicar con seguridad” o invoque $audit-tests. No usar para revisar solo los
  tests de un PR ni como auditoría general de código o seguridad.
---

# Auditoría de pruebas

Responder con evidencia a una pregunta: “¿qué puede romperse y llegar a producción sin que la suite lo detecte?”. Valorar comportamiento protegido, no cantidad de tests ni porcentaje aislado.

## Preparar

Leer completamente [references/checklist.md](references/checklist.md) antes de emitir hallazgos.

- Leer CI, configuración de test, suites, helpers, fixtures y código de las rutas críticas.
- No escribir ni modificar tests. Ejecutar solo checks dirigidos, locales, no destructivos y de coste razonable; registrar qué no se ejecutó y por qué.
- No asumir que un test existe porque aparece en el árbol ni que bloquea releases porque pasa localmente. Seguir el gate real.
- Priorizar consecuencias: dinero, datos, permisos, seguridad, contratos y hero flows.

## Trabajar en cuatro fases

### 1. Construir el mapa de confianza

Inventariar tipos de test, frameworks, ubicación, runtime, fixtures/mocks, paralelismo y entornos. Mapear qué ejecuta CI, qué bloquea merge/release y qué queda skipped, quarantined, deferred o verde sin correr. Relacionar rutas críticas con pruebas concretas.

### 2. Auditar con mutation lens

Aplicar el checklist. Para cada hallazgo incluir:

- `TST-NNN`, título, severidad, confianza y estado de evidencia.
- Test/suite/gate y código protegido, con `archivo:línea`.
- Mutación o bug concreto que escaparía: inversión, omisión, dato límite, fallo de dependencia, autorización incorrecta, etc.
- Consecuencia de que ese bug se publique.
- Diseño de test/control recomendado, aceptación y demostración de que falla ante la mutación.

Revisar aserciones y setup; no inferir fuerza por nombre del test. Confirmar Critical/High mediante la ruta de negocio y el comportamiento real del gate. Usar herramientas de cobertura o mutation testing solo como apoyo y con autorización si son costosas.

### 3. Definir estrategia

Agrupar causas en 3–5 temas y definir estado objetivo, principio y gate que lo preserve. Explicitar qué no merece automatización y evitar perseguir 100 % de cobertura sin relación con riesgo.

### 4. Crear plan

Ordenar: hacer fiable/visible el gate, cubrir rutas críticas, cerrar seams/contratos y mejorar velocidad/mantenibilidad. Incluir IDs, suites, esfuerzo `S/M/L/XL`, riesgo de flakiness/coste, dependencias, aceptación y mutación que debe atrapar. No implementar.

## Calibrar severidad

- `Critical`: una ruptura grave de datos, permisos, dinero o disponibilidad puede publicarse sin señal.
- `High`: flujo principal o contrato esencial carece de protección eficaz.
- `Medium`: hueco relevante pero contenido o detectado por otra capa fiable.
- `Low`: deuda de test local con riesgo reducido.

Separar severidad de confianza. Un porcentaje bajo no es por sí mismo hallazgo; una suite verde que no ejecuta el riesgo sí puede serlo.

## Entregar

Cuando esta skill participe en una auditoría multilente, escribir toda esta entrega en `audit/<AAAA-MM-DD>/tests-audit.md`. La hoja debe ser autosuficiente y conservar evidencia, hallazgos, estrategia y plan completos; el índice, el resumen o el consolidado no la sustituyen. Si el lente queda bloqueado, documentar en esa hoja el alcance, la evidencia intentada, el bloqueo y los pasos para desbloquearlo.

Producir:

1. Resumen ejecutivo con respuesta “¿se puede publicar con confianza?”, confianza y cobertura.
2. Alcance, comandos ejecutados y limitaciones.
3. Test map, pirámide real, gates de CI y matriz ruta crítica → protección.
4. Hallazgos priorizados, bugs que escaparían y fortalezas.
5. Estrategia, trade-offs y gates objetivo.
6. Plan por hitos, quick wins y boceto de las tres pruebas/controles principales.
7. Preguntas sobre tolerancia al riesgo, tiempo de CI y objetivos de carga.

Indicar expresamente suites no ejecutadas, skipped/deferred y superficies revisadas solo por inspección.
