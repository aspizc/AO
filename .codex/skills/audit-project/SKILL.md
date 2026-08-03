---
name: audit-project
description: >-
  Orquesta una auditoría integral y de solo lectura de un proyecto mediante
  lentes especializados de código, arquitectura, seguridad, datos y privacidad,
  pruebas, producto y UX. Selecciona el alcance, consolida y deduplica hallazgos,
  exige evidencia verificable y produce un índice visible, un informe
  consolidado, una hoja detallada y autosuficiente por cada lente ejecutado y
  una hoja de ruta trazable. Usar cuando el usuario pida una auditoría completa
  o multidisciplinar, un health check del proyecto, revisar el repositorio de
  punta a punta, priorizar deuda y riesgos, o invoque $audit-project. Para una
  petición limitada a un solo ámbito, usar la skill audit-* correspondiente.
---

# Auditoría integral del proyecto

Dirigir la auditoría como una investigación reproducible, no como una lista de opiniones. Responder en el idioma del usuario y adaptar la profundidad a la madurez, exposición y criticidad reales del sistema.

## Preparar el trabajo

Leer completamente [references/orchestration.md](references/orchestration.md) antes de seleccionar los lentes.

- Mantener el código, la infraestructura, los datos y la configuración sin cambios durante la auditoría. Una petición de auditoría integral o multidisciplinar implica crear artefactos de auditoría revisables en el repositorio, salvo que el usuario pida expresamente una respuesta solo en chat o el filesystem no sea escribible. Esta autorización se limita a documentación bajo `audit/`.
- Inspeccionar primero las instrucciones del repositorio y el estado del árbol de trabajo. Preservar cambios ajenos y no atribuirlos a la auditoría.
- Delimitar componentes, entornos, periodo y superficies accesibles. Registrar exclusiones y bloqueos; no convertir una búsqueda incompleta en prueba de ausencia.
- Separar la auditoría de la reparación. Si el usuario también pide arreglos, cerrar primero una línea base de hallazgos y después implementar únicamente lo autorizado.

## Seleccionar los lentes

Cargar y seguir por completo cada skill especializada elegida:

| Necesidad | Skill |
|---|---|
| Corrección, mantenibilidad, rendimiento | `$audit-code` |
| Límites, topología, despliegue, fiabilidad | `$audit-architecture` |
| Amenazas, controles y abuso | `$audit-security` |
| Linaje, PII, retención y gobierno | `$audit-data-privacy` |
| Cobertura y confianza de entrega | `$audit-tests` |
| Valor, funcionalidades y journeys | `$audit-product` |
| Interacción, accesibilidad y responsive | `$audit-ux` |

Aplicar un único lente cuando el usuario lo especifique. Para un “health check” sin más detalle, cubrir código, arquitectura y pruebas, y hacer un reconocimiento de seguridad; añadir producto, UX o datos solo si existen superficies relevantes. Para una “auditoría completa”, aplicar todos los lentes pertinentes y declarar los descartados. No exigir una aclaración si una elección conservadora permite avanzar; exponer el alcance elegido.

## Ejecutar y verificar

1. Construir un mapa compartido del sistema una sola vez: propósito, stack, entradas, componentes, datos, despliegue, CI y superficies de usuario.
2. Mantener un registro maestro de evidencia y asignar identificadores estables por lente: `COD`, `ARC`, `SEC`, `DAT`, `TST`, `PRO`, `UX`.
3. Aplicar los checklists especializados. Usar analizadores y escáneres como pistas, nunca como veredicto automático.
4. Reabrir la evidencia de todo hallazgo Critical o High y confirmar su ruta causal o su impacto con una segunda señal independiente cuando sea posible. Rebajar confianza o moverlo a preguntas si no se confirma.
5. Deduplicar por causa raíz. Conservar impactos específicos de cada lente como referencias cruzadas, no como hallazgos repetidos.
6. Sintetizar temas sistémicos y convertirlos en trabajo ordenado por dependencia, reducción de riesgo y capacidad de verificación.
7. Materializar los resultados de cada lente mientras la evidencia está disponible. No posponer las hojas especializadas hasta después del resumen ni sustituirlas por enlaces, tablas mínimas o párrafos ejecutivos.

No usar subagentes salvo que el usuario pida delegación o trabajo paralelo y la política activa lo permita. Aunque exista delegación, verificar de primera mano los hallazgos que sostienen la conclusión principal.

## Contrato de hallazgo

Redactar cada hallazgo accionable con:

- `ID`, título, severidad y confianza.
- Estado de evidencia: `observado`, `reproducido`, `inferido` o `no verificable`.
- Ubicación exacta: `archivo:línea`, ruta/estado de UI, contrato, recurso o comando.
- Evidencia mínima reproducible, sin secretos ni datos personales.
- Consecuencia concreta y población/sistema afectado.
- Causa raíz o mecanismo; no limitarse al síntoma.
- Recomendación, criterio de aceptación verificable y prueba de cierre.

Reservar Critical para daño grave e inmediato o una ruta plausible de explotación, pérdida, indisponibilidad o exclusión total. Separar severidad de confianza. No elevar un hallazgo por el tono de un escáner, un TODO o una práctica ausente sin demostrar el riesgo.

## Entrega obligatoria

**No finalizar una auditoría integral entregando solo un resumen o un informe consolidado.** Producir tres niveles de artefactos:

1. Un índice visible que enlace todos los resultados.
2. Un informe consolidado con el dictamen global, el registro maestro deduplicado y la hoja de ruta transversal.
3. Una hoja detallada y autosuficiente por cada lente ejecutado, también cuando su profundidad sea `dirigida` o de `reconocimiento`.

Usar por defecto esta estructura:

| Artefacto | Ruta |
|---|---|
| Índice | `audit/README.md` |
| Consolidado | `audit/<AAAA-MM-DD>/project-audit.md` |
| Código | `audit/<AAAA-MM-DD>/code-audit.md` |
| Arquitectura | `audit/<AAAA-MM-DD>/architecture-audit.md` |
| Seguridad | `audit/<AAAA-MM-DD>/security-audit.md` |
| Datos y privacidad | `audit/<AAAA-MM-DD>/data-privacy-audit.md` |
| Pruebas | `audit/<AAAA-MM-DD>/tests-audit.md` |
| Producto | `audit/<AAAA-MM-DD>/product-audit.md` |
| UX y accesibilidad | `audit/<AAAA-MM-DD>/ux-audit.md` |

Si un lente seleccionado queda bloqueado, crear igualmente su hoja con alcance, evidencia intentada, bloqueo concreto, conclusiones que no pueden emitirse y pasos para desbloquearlo. Marcar un lente no aplicable en el índice y consolidado; no inventar una hoja vacía.

Cada hoja especializada debe seguir por completo el contrato de entrega de su skill `audit-*` y permitir revisión sin abrir el consolidado. Como mínimo incluir:

- Dictamen propio, postura, confianza, profundidad, alcance, evidencia ejecutada y limitaciones.
- Mapa de la superficie o journey específico del lente.
- Registro de sus hallazgos primarios y desarrollo completo de cada uno conforme al contrato de hallazgo.
- Fortalezas que conservar, referencias cruzadas a otros lentes y validaciones pendientes.
- Estrategia, trade-offs y roadmap con owner sugerido, esfuerzo, riesgo, dependencias, aceptación y prueba de cierre.
- Preguntas que requieren decisión humana.

No duplicar la causa raíz: cada ID tiene un único lente y una única hoja primaria; las demás hojas lo citan como relacionado. Una hoja no es válida si contiene únicamente el extracto del registro maestro, enlaces al consolidado o recomendaciones sin evidencia.

El informe consolidado debe contener:

1. Resumen ejecutivo: postura global, confianza de la conclusión, tres riesgos y tres oportunidades.
2. Alcance y cobertura: lentes, superficies examinadas, evidencia ejecutada y limitaciones.
3. Mapa del sistema.
4. Registro priorizado de hallazgos y fortalezas que conservar.
5. Temas transversales y decisiones/trade-offs.
6. Hoja de ruta por hitos con dependencias, esfuerzo, riesgo del cambio, IDs cubiertos y criterios de aceptación.
7. Preguntas abiertas y riesgos aceptados.

Antes de finalizar:

- Comprobar que el índice enlaza el consolidado y todas las hojas esperadas.
- Comprobar que cada hallazgo primario aparece en detalle exactamente en una hoja y que los conteos coinciden con el registro maestro.
- Validar enlaces locales, rutas de evidencia y formato de los documentos.
- Confirmar que ninguna hoja especializada se redujo a un resumen.

Si se usa una nota A–F, acompañarla de confianza y cobertura; omitir una nota global cuando la evidencia no permita sostenerla. Conservar evidencia visual bajo `audit/<AAAA-MM-DD>/_evidence/`, sin incluir secretos ni datos reales.
