---
name: audit-ux
description: >-
  Audita en modo solo lectura la experiencia e interfaz realmente renderizada:
  journeys, feedback, navegación, jerarquía visual, estados, formularios,
  responsive/overflow, teclado, semántica y accesibilidad. Usar cuando el usuario
  pida auditoría UI/UX, usabilidad, accesibilidad, WCAG, responsive, overflow,
  interacción, pantallazos, heuristic evaluation, “auditoría de UX/UI” o invoque
  $audit-ux. No usar para estrategia de producto/valor, calidad técnica general o
  para rediseñar e implementar la interfaz durante la auditoría.
---

# Auditoría de UX y accesibilidad

Observar antes de juzgar. Preferir la interfaz ejecutada y recorrida con distintos inputs/viewports a inferencias desde JSX, templates o CSS.

## Preparar evidencia

Leer completamente [references/checklist.md](references/checklist.md) antes de emitir hallazgos.

- Ejecutar la interfaz localmente cuando sea seguro. Usar datos sintéticos/mocks solo para representar estados y etiquetarlos; no inferir comportamiento backend real.
- Registrar ruta, estado, viewport, método de entrada y evidencia visual. Guardar screenshots únicamente si el usuario pide artefactos o el informe se escribe a disco.
- No cambiar UI, estilos, copy ni design files durante la auditoría.
- Distinguir `observado en UI`, `detectado automáticamente`, `inferido del código` y `no verificable`.
- Verificar criterios y obligaciones actuales en fuentes oficiales cuando se afirme conformidad normativa. Una herramienta automática no demuestra conformidad completa.

## Trabajar en cuatro fases

### 1. Mapear la interfaz

Inventariar superficies, rutas, navegación, componentes/patrones, tokens, locales, viewports e inputs. Seleccionar hero flow, onboarding y recuperación. Construir matriz pantalla × estado × viewport y registrar huecos.

### 2. Recorrer y auditar

Realizar primero un cognitive walkthrough paso a paso. Después aplicar el checklist transversal. Para cada hallazgo incluir:

- `UX-NNN`, título, severidad, confianza y estado de evidencia.
- Flujo/paso o pantalla/componente/estado, viewport e input.
- Evidencia visual, medición o resultado manual/automático.
- Consecuencia para el usuario: bloqueo, error, confusión, exclusión, abandono o carga innecesaria.
- Heurística o criterio WCAG aplicable, sin usarlo como sustituto del impacto.
- Outcome recomendado, aceptación observable y método de validación.

Para overflow indicar si es de documento o contenedor, viewport exacto, cantidad si se mide y elemento causante. Confirmar Critical/High en la UI real cuando sea posible. No confundir scroll contenido y accesible con un defecto.

### 3. Definir estrategia

Agrupar 3–5 patrones sistémicos. Definir experiencia objetivo, principio, token/componente o control compartido que evite regresión y métrica de éxito. Respetar el lenguaje visual existente salvo que sea la causa demostrada.

### 4. Crear plan de diseño

Ordenar baseline/instrumentación, bloqueos y exclusiones, patrones de alto apalancamiento y polish. Incluir IDs, pantallas/componentes, esfuerzo `S/M/L/XL`, riesgo de regresión, dependencias, aceptación y validación. No implementar ni rediseñar archivos.

## Calibrar severidad

- `Critical`: tarea esencial imposible o exclusión grave sin alternativa para usuarios en alcance.
- `High`: bloqueo frecuente, error irrecuperable o barrera de accesibilidad importante en flujo principal.
- `Medium`: fricción significativa con workaround o superficie secundaria.
- `Low`: inconsistencia o polish con impacto acotado.

Separar severidad de confianza. No convertir gusto estético en defecto.

## Entregar

Cuando esta skill participe en una auditoría multilente, escribir toda esta entrega en `audit/<AAAA-MM-DD>/ux-audit.md`. La hoja debe ser autosuficiente y conservar evidencia, hallazgos, estrategia y plan completos; el índice, el resumen o el consolidado no la sustituyen. Si el lente queda bloqueado, documentar en esa hoja el alcance, la evidencia intentada, el bloqueo y los pasos para desbloquearlo.

Producir:

1. Resumen ejecutivo, postura UX y accesibilidad, confianza y cobertura.
2. Método y matriz de evidencia: pantallas, estados, viewports, inputs y limitaciones.
3. Interface map y walkthroughs con tabla de fricción.
4. Hallazgos priorizados por flujo/dimensión y fortalezas.
5. Estrategia, principios y métricas.
6. Plan por hitos, quick wins y boceto before→after de los tres outcomes principales.
7. Preguntas sobre usuarios, dispositivos, locales, target WCAG/legal y design-system ownership.

Si se estima conformidad, expresarla como alcance parcial y número/tipo de bloqueos; no certificar legalmente.
