# Checklist de auditoría de código

## Reconocimiento

- Identificar lenguajes, versiones, frameworks, targets y gestores de paquetes.
- Localizar entry points, composition roots, módulos públicos, tareas en background y adaptadores externos.
- Leer manifiestos, lockfiles, configuración de compilación, CI, contenedores y documentación operativa.
- Seguir dos o tres rutas críticas de extremo a extremo, incluidos fallo, retry y rollback.
- Contrastar convenciones declaradas con patrones realmente dominantes.

## Corrección e invariantes

- Validar precondiciones, estados imposibles, límites, nullabilidad, serialización y conversiones.
- Revisar errores tragados, defaults silenciosos, retornos parciales, retries duplicadores y fallos no atómicos.
- Inspeccionar concurrencia, orden, cancelación, timeouts, condiciones de carrera y cierre de recursos.
- Buscar operaciones irreversibles sin idempotencia, transacción, compensación o confirmación.
- Distinguir código alcanzable de rutas muertas o solo experimentales.

## Diseño y mantenibilidad

- Examinar cohesión, acoplamiento, dirección de dependencias, ciclos y saltos de capa.
- Localizar duplicación semántica, responsabilidades mezcladas, APIs ambiguas y estado global oculto.
- Evaluar complejidad donde eleva riesgo, no por una cifra aislada.
- Revisar tipos anulados, casts inseguros, `any`, excepciones genéricas y contratos implícitos.
- Señalar código muerto o flags obsoletos solo tras demostrar que no tienen consumidores relevantes.

## Rendimiento y recursos

- Seguir I/O en bucles, N+1, llamadas bloqueantes en rutas async y trabajo repetido.
- Revisar colecciones/colas sin límite, cargas completas en memoria, fugas y archivos/conexiones sin cerrar.
- Confirmar índices, cachés, batching o paralelismo contra el patrón de acceso real.
- No llamar “cuello de botella” a una sospecha sin volumen, perfil o complejidad demostrable.

## Dependencias, configuración y operación

- Comprobar pinning y coherencia de lockfiles, paquetes duplicados/no mantenidos y APIs deprecadas.
- Separar vulnerabilidades actuales para `$audit-security`; verificar avisos vigentes en fuentes oficiales antes de afirmar CVEs.
- Revisar defaults, validación de configuración, secretos por nombre sin mostrar valores y diferencias por entorno.
- Examinar logs estructurados, correlación, health/readiness, métricas, errores accionables y apagado ordenado.
- Detectar CI que no ejecuta gates anunciados o documentación que contradice el código.

## Fuerza de evidencia

Aceptar un hallazgo cuando se pueda responder:

1. ¿Qué entrada o estado alcanza el problema?
2. ¿Qué línea o configuración produce el comportamiento?
3. ¿Qué consecuencia observable ocurre?
4. ¿Qué prueba o control demostraría que quedó resuelto?

Mover a “Validaciones pendientes” cualquier sospecha que no supere estas preguntas.
