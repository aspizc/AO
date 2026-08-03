# Checklist de datos y privacidad

## Inventario, clasificación y linaje

- Inventariar bases, blobs, índices, colas, analytics, logs, caches, backups y proveedores.
- Clasificar público, interno, confidencial, PII, sensible/especial y regulado según contexto.
- Asignar owner, propósito, fuente de verdad, consumidores y contrato a cada dataset.
- Trazar collection → processing → storage → sharing → archive/backup → deletion.
- Marcar datos derivados, embeddings, identificadores indirectos y reidentificación posible.

## Modelo e integridad

- Revisar tipos, nullabilidad, constraints, claves, referencias, unicidad y consistencia temporal.
- Detectar duplicación de fuente de verdad, shared mutable stores y evolución de schema no versionada.
- Examinar dual writes, caché/invalidation, eventual consistency y reconciliación.
- Revisar migraciones, backfills, rollback/forward fix, drift y pruebas con datos sintéticos.

## Minimización y propósito

- Vincular cada campo sensible con propósito y necesidad demostrables.
- Revisar defaults de recogida, campos opcionales, consentimiento/preferencias y secondary use.
- Detectar PII en logs, errores, analytics, URLs, nombres de archivo, prompts, embeddings y caches.
- Evaluar masking, tokenización, pseudonimización y acceso mínimo por función.

## Retención, derechos y backups

- Identificar periodo y trigger de retención por categoría; verificar enforcement automático.
- Seguir acceso, rectificación, portabilidad y supresión por todos los stores y proveedores.
- Comprobar tombstones, reaparición por sincronización, derived data y referencias huérfanas.
- Revisar cómo backups, restore y legal hold interactúan con borrado y expiración.
- Usar pruebas sintéticas o diseño de test; no ejecutar solicitudes sobre personas reales.

## Aislamiento y acceso

- Verificar tenant scoping en schemas, consultas, caches, búsquedas, exports y jobs.
- Revisar privilegios de servicio, admin/JIT, accesos de soporte y audit trail.
- Comprobar cifrado en tránsito/at-rest, gestión de claves y egress controls.
- Mapear terceros/subprocesadores, categorías enviadas, región, contrato y borrado downstream.

## Gobierno y observabilidad

- Revisar catálogo, clasificación mantenida, lineage, data contracts y change ownership.
- Comprobar freshness, completeness, anomaly detection y data-quality SLAs donde importen.
- Contrastar políticas con jobs, constraints, permisos y tests que realmente las aplican.
- Identificar decisiones que requieren DPO/asesoría y formular la pregunta concreta.

## Evidencia suficiente

No afirmar exposición o incumplimiento a partir del nombre de una columna. Exigir flujo alcanzable y control ausente; para obligaciones legales, citar la fuente oficial vigente y dejar la conclusión a la función responsable.
