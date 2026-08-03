# Reglas de orquestación

## Elegir profundidad

| Petición | Cobertura mínima |
|---|---|
| Auditoría de un ámbito | Un lente especializado |
| Health check | Código + arquitectura + pruebas; reconocimiento de seguridad |
| Auditoría técnica | Código + arquitectura + seguridad + pruebas; datos si hay persistencia sensible |
| Auditoría de producto | Producto + UX; arquitectura/código solo para validar limitaciones construidas |
| Auditoría completa | Todos los lentes aplicables |

Declarar cada lente como `profundo`, `dirigido`, `reconocimiento`, `no aplicable` o `bloqueado`. No mezclar una revisión superficial con una conclusión de cobertura profunda.

## Registro maestro

Mantener una fila por causa raíz:

`ID | lente primario | severidad | confianza | estado | superficie | causa | impacto | evidencia | lentes relacionados | cierre`

Usar estos prefijos:

- `COD`: código y corrección.
- `ARC`: arquitectura y operación.
- `SEC`: seguridad.
- `DAT`: datos y privacidad.
- `TST`: pruebas.
- `PRO`: producto.
- `UX`: experiencia y accesibilidad.

Numerar de forma estable (`SEC-001`). No renumerar al reordenar el informe.

## Severidad y confianza

Evaluar severidad por impacto, alcance, probabilidad y reversibilidad:

- `Critical`: compromiso, pérdida, daño o bloqueo grave; ruta activa o condición inminente.
- `High`: impacto serio en una ruta principal o control esencial, con probabilidad razonable.
- `Medium`: degradación significativa pero contenida, con mitigación disponible.
- `Low`: problema local, deuda o mejora defensiva con impacto limitado.

Evaluar confianza por fuerza de evidencia:

- `Alta`: reproducido o demostrado mediante código/configuración y ruta causal completa.
- `Media`: varias señales coherentes, pero falta una condición de ejecución o contexto.
- `Baja`: hipótesis útil; mover a “Validaciones pendientes” y no tratar como hecho.

Un escáner, una métrica aislada, documentación desactualizada o ausencia en una búsqueda no bastan por sí solos.

## Deduplicar y resolver conflictos

- Unificar hallazgos que compartan mecanismo y corrección; conservar los impactos por lente.
- Separar hallazgos que coincidan en el síntoma pero tengan causas o cierres diferentes.
- Resolver severidades distintas usando el impacto más grave demostrado, no el más alarmista.
- Registrar desacuerdos entre evidencia construida y documentación como drift, indicando cuál gobierna hoy.
- Tratar la falta de contexto de negocio, legal o clínico como pregunta humana, no como supuesto.

## Construir la hoja de ruta

Ordenar el trabajo así:

1. Contención inmediata de Critical/High explotables o con pérdida de datos.
2. Red de seguridad: backups verificados, tests de caracterización, observabilidad y rollback.
3. Correcciones de causa raíz que cierren varios hallazgos.
4. Controles permanentes: gates, contratos, políticas y alertas.
5. Mejoras de consistencia y bajo riesgo.

Para cada ítem indicar `IDs cubiertos`, propietario sugerido por función, esfuerzo `S/M/L/XL`, riesgo del cambio, dependencias, criterio observable y prueba de cierre. Marcar `parcial` cuando un ítem mitigue pero no elimine el hallazgo.

## Criterio de finalización

Finalizar cuando:

- Todas las conclusiones principales tengan evidencia y alcance explícitos.
- Todo Critical/High esté confirmado, rebajado o marcado como validación pendiente.
- Cada recomendación prioritaria trace a al menos un hallazgo.
- Cada hallazgo aceptado tenga propietario de decisión y razón.
- Las limitaciones indiquen qué no puede concluirse.
- Existan el índice, el informe consolidado y una hoja detallada/autosuficiente por cada lente ejecutado; el consolidado no sustituye esas hojas.
- Cada ID primario esté desarrollado exactamente en la hoja de su lente, con referencias cruzadas en lugar de duplicados, y los conteos coincidan.
- Los enlaces entre artefactos, las rutas de evidencia y el formato se hayan validado.
