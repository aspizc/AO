# Checklist de UX y accesibilidad

## Baseline observable

- Cubrir viewports representativos; usar como referencia 1440×900, 768×900, 390×844, 360×780 y 320×780 cuando proceda.
- Registrar route/state, viewport, screenshot, datos reales/sintéticos, teclado/touch y checker utilizado.
- Medir overflow de documento y contenedores; inspeccionar además clipping, solapes y acciones fuera de pantalla.
- Probar zoom/reflow, contenido largo, localización y tamaño de texto cuando estén en alcance.

## Walkthrough de flujos

- Para cada paso registrar acción, expectativa, feedback real, fricción, recuperación y severidad.
- Recorrer happy path, error, cancelación, back, resume y repetición.
- Evaluar discoverability, affordance, estado del sistema, progreso, confirmación, undo y prevención.
- Contar pasos/decisiones solo cuando su coste afecte al outcome.

## Navegación y jerarquía

- Revisar estructura, labels, where-am-I, deep links, back, búsqueda y foco inicial.
- Aplicar squint test, orden visual, tipografía, line length, espaciado, alineación y densidad.
- Comprobar que color/icono no sean el único canal y que acciones primarias/destructivas se distingan.
- Detectar controles que parecen disabled, texto truncado ambiguo y CTA oculto.

## Estados e interacción

- Cubrir loading, empty, error, success, disabled, hover, focus, active, stale, parcial, zero/one/many y offline/lento.
- Revisar feedback inmediato, optimistic UI vs verdad del servidor, layout shift y doble envío.
- Comprobar cancelación, undo, confirmaciones, errores accionables y conservación de input.
- Evaluar motion útil, reduced motion, perceived performance y ausencia de jank.

## Formularios

- Revisar labels persistentes, instrucciones, required/optional, tipos de input y autocomplete.
- Comprobar validación en momento adecuado, foco en error, resumen, asociación semántica y recuperación.
- Evaluar teclado móvil, defaults, formatos, copy de error, guardado/resume y acciones destructivas.

## Accesibilidad manual

- Recorrer solo con teclado: orden lógico, foco visible, traps, skip links y componentes complejos.
- Revisar landmarks, headings, nombres/roles/valores, labels, tablas y status announcements.
- Medir contraste, tamaño/espaciado de target, reflow, orientación y alternativas a gestos/hover.
- Comprobar screen-reader flow de los flujos críticos cuando haya herramientas y alcance.
- Citar el criterio WCAG oficial aplicable; combinar automated checker con comprobación manual.

## Responsive y sistema de diseño

- Verificar que el contenido refluye sin perder acciones ni significado.
- Distinguir scroll local deliberado de overflow de página; exigir foco y discoverability al primero.
- Revisar touch targets, hover-only, safe areas, orientación y densidad móvil.
- Comparar componentes/tokens reutilizados, forks, copy, i18n y consistencia entre estados.

## Evidencia suficiente

Un hallazgo fuerte incluye usuario, tarea, pantalla/estado, viewport/input, comportamiento observado e impacto. Si la app no pudo ejecutarse, rebajar confianza y etiquetar toda inferencia de código.
