# Checklist de arquitectura

## Intención y estructura

- Leer ADRs, diagramas y ownership; marcar su fecha y vigencia.
- Derivar límites desde imports, dependencias, APIs públicas y composition roots.
- Detectar ciclos, shared kernels crecientes, god modules y saltos entre capas.
- Comprobar si los límites se hacen cumplir mediante build, lint, tests o permisos.

## Topología y contratos

- Inventariar servicios, UIs, workers, jobs, gateways, adapters y dependencias gestionadas.
- Trazar request/data flow para rutas principales y de fallo.
- Verificar versionado y compatibilidad de OpenAPI, protobuf, schemas y eventos.
- Revisar timeouts, retry/backoff, circuit breaking, idempotencia y propagación de contexto.
- Identificar fan-in/fan-out excesivo, responsabilidades duplicadas y servicios sin consumidor claro.

## Datos y mensajería

- Asignar un propietario a cada store y evitar escritura mutable cruzada entre límites.
- Localizar transacciones distribuidas implícitas, dual writes y consistencia no declarada.
- Para cada consumidor, revisar delivery semantics, orden, deduplicación, DLQ y poison messages.
- Revisar outbox/inbox, evolución de schemas, replay y retención.
- Trazar cachés, invalidación, fuentes de verdad, backups y restauración.

## Build, entrega y entornos

- Confirmar artefactos reproducibles, pinning, lockfiles, imágenes y provenance/SBOM cuando proceda.
- Comparar local/dev/staging/prod, configuración, secretos y paridad de dependencias.
- Medir cobertura real de IaC y detectar pasos manuales o drift.
- Revisar gates, promoción, rollback/canary, migraciones compatibles y ownership del release.

## Fiabilidad y escala

- Preguntar “¿qué ocurre si X falla?” para cada dependencia crítica.
- Revisar statelessness, HA, colas de trabajo, backpressure, límites y degradación controlada.
- Identificar SPOFs solo después de comprobar réplicas, failover y recuperación.
- Contrastar capacidad y coste con tráfico/volumen esperado; no extrapolar desde intuición.
- Verificar backups mediante restore/drill documentado, RPO/RTO y dependencias de recuperación.

## Observabilidad y confianza

- Revisar logs, métricas y traces correlacionados a través de límites.
- Comprobar health/readiness, SLI/SLO, alertas accionables, dashboards y runbooks.
- Seguir un incidente hipotético desde alerta hasta diagnóstico y rollback.
- Revisar authN/Z en bordes, aislamiento, secret flow y segmentación a nivel topológico; derivar detalle a `$audit-security`.

## Señales de evidencia fuerte

Preferir grafos derivados, manifiestos, contratos y rutas de ejecución. Tratar un diagrama no verificado, un nombre de carpeta o una aspiración de roadmap como intención, no como arquitectura existente.
