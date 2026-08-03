---
name: audit-product
description: >-
  Audita en modo solo lectura si un producto construido entrega su promesa al
  usuario objetivo: propuesta de valor, jobs-to-be-done, funcionalidades reales,
  journeys, onboarding, estados de fallo, confianza, enfoque e instrumentación.
  Usar cuando el usuario pida auditoría de producto o funcional, product health
  check, feature/value review, revisión del journey, “auditoría de producto”,
  “revisar funcionalidades” o invoque $audit-product. No usar para una auditoría
  técnica, un único PR/spec, ni para detalle visual/accesibilidad de UI.
---

# Auditoría de producto

Evaluar el producto tal como lo recibe el usuario, no como el roadmap dice que será. Anclar cada juicio en un job, superficie, flujo, copy, comportamiento o señal real.

## Preparar

Leer completamente [references/checklist.md](references/checklist.md) antes de emitir hallazgos.

- Preferir operar el producto de forma segura: recorrer onboarding, hero flow, errores y recuperación. Si no puede ejecutarse, inspeccionar superficies y declarar la limitación.
- Separar `construido`, `stub/placeholder`, `especificado`, `roadmap` y `desconocido`. No acreditar valor todavía no enviado.
- No construir funciones, cambiar copy ni modificar specs durante la auditoría.
- No inventar personas, analytics, feedback o benchmarks. Verificar afirmaciones actuales de mercado/competencia mediante fuentes recientes cuando sean necesarias.

## Trabajar en cuatro fases

### 1. Mapear el producto

Identificar usuario/segmento, jobs, promesa, aha moment, madurez y canales. Inventariar superficies y features por estado. Recorrer activación, core loop, tareas críticas, abandono y recuperación; medir pasos y condiciones hasta el primer valor.

### 2. Auditar valor y funcionalidad

Aplicar el checklist. Para cada hallazgo incluir:

- `PRO-NNN`, título, severidad, confianza y estado `observado en producto`, `inferido de superficie` o `solo especificado`.
- Persona/job, superficie y paso del flujo.
- Evidencia: ruta, estado, copy, comportamiento, spec o métrica disponible.
- Consecuencia concreta: bloqueo, abandono, pérdida de confianza, coste o promesa incumplida.
- Recomendación como outcome, aceptación observable y forma de validar con usuario o métrica.

Confirmar Critical/High recorriendo el flujo o con evidencia equivalente. No elevar una preferencia personal a hallazgo. Distinguir problema de producto, defecto de implementación y pregunta de posicionamiento.

### 3. Definir estrategia

Agrupar 3–5 temas. Definir estado objetivo, principio, métrica o señal y trade-off. Señalar qué no construir: fuera de persona, prematuro, poco diferenciador o distractor del core job.

### 4. Crear roadmap

Ordenar: validar/instrumentar, reparar promesa principal, apuestas de alto apalancamiento y polish. Incluir IDs, outcome, superficies, esfuerzo `S/M/L/XL`, riesgo del cambio, dependencias, aceptación observable y experimento de validación. No implementar.

## Calibrar severidad

- `Critical`: el usuario objetivo no puede completar el job central o sufre un daño/trust break grave.
- `High`: fricción o carencia que bloquea una parte importante de activación/core loop.
- `Medium`: degradación relevante con workaround o alcance limitado.
- `Low`: oportunidad secundaria de claridad, foco o polish.

Separar severidad de confianza. La falta de datos de usuario debe reducir confianza o convertirse en experimento.

## Entregar

Cuando esta skill participe en una auditoría multilente, escribir toda esta entrega en `audit/<AAAA-MM-DD>/product-audit.md`. La hoja debe ser autosuficiente y conservar evidencia, hallazgos, estrategia y roadmap completos; el índice, el resumen o el consolidado no la sustituyen. Si el lente queda bloqueado, documentar en esa hoja el alcance, la evidencia intentada, el bloqueo y los pasos para desbloquearlo.

Producir:

1. Resumen ejecutivo: ¿cumple la promesa para quién y con qué confianza?
2. Alcance, método, superficies operadas y limitaciones.
3. Product map: jobs, promesa, inventario construido/especificado y journeys.
4. Hallazgos priorizados, strengths y say-do gaps.
5. Estrategia, métricas, trade-offs y “no construir”.
6. Roadmap por hitos, quick wins y boceto de las tres apuestas principales.
7. Preguntas sobre segmento, éxito, pricing, madurez y evidencia de usuario.

Si se usa nota A–F, vincularla a madurez, cobertura y confianza, no a gusto personal.
