# Checklist de pruebas

## Mapa y gate real

- Inventariar unit, integration, contract, e2e, property/fuzz, a11y, security, load y checks manuales.
- Seguir workflows de CI hasta los comandos, filtros, matrices y condiciones realmente ejecutadas.
- Buscar skip/xfail/todo/quarantine/only, retries y fallos ignorados o convertidos en warning.
- Comparar local y CI: servicios, variables, timezone, versiones, datos y orden.

## Rutas críticas

- Enumerar invariantes y fallos de mayor impacto antes de mirar cobertura.
- Mapear cada ruta a tests que comprueben happy path, límites, errores, retries y autorización.
- Revisar seams entre servicios, DB, colas y terceros; pedir contract/integration tests donde se rompen acuerdos.
- Identificar cambios frecuentes o legacy sin characterization tests.

## Fuerza de aserciones

- Preguntar para cada test: “¿qué cambio incorrecto haría que fallara?”.
- Detectar execution-only, aserciones triviales, snapshots aprobados en bloque y mocks que replican implementación.
- Probar mentalmente inversiones, off-by-one, branch omitida, excepción tragada y respuesta parcial.
- Revisar false positives por setup que no alcanza la rama o assertion que observa el objeto equivocado.
- Distinguir cobertura de líneas de protección de comportamiento.

## Pirámide y tipos ausentes

- Evaluar balance por coste y riesgo, no por una pirámide rígida.
- Localizar seams sin contratos, parsers sin property/fuzz, UI sin a11y y hot paths sin carga cuando proceda.
- Evitar e2e redundante si una prueba inferior demuestra el comportamiento con más determinismo.
- Reservar tests manuales explícitos para lo que no compensa automatizar y definir owner/cadencia.

## Determinismo, datos y velocidad

- Revisar reloj, aleatoriedad, red, filesystem, orden, puertos, estado global y shared databases.
- Detectar retry que oculta flakiness, sleeps fijos y fixtures dependientes de ejecución previa.
- Comprobar aislamiento por test, limpieza, fábricas, seeds y ausencia de secretos/PII real.
- Medir tiempo solo si hay datos; identificar critical path de CI, paralelismo y caché.
- Evaluar brittleness ante refactors seguros y duplicación en helpers/fixtures.

## Testabilidad

- Revisar dependencias ocultas, side effects en constructores, tiempo/random global y módulos sin seams.
- Recomendar cambios de diseño únicamente cuando expliquen por qué la prueba necesaria no es viable.

## Evidencia suficiente

Un hallazgo fuerte nombra el bug, el test/gate que debería detectarlo y por qué hoy no lo haría. Si no puede demostrarse, dejarlo como experimento de validación.
