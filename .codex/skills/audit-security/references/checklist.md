# Checklist de seguridad

## Activos y fronteras

- Clasificar datos, claves, identidades, capacidades administrativas y disponibilidad crítica.
- Inventariar HTTP/API, websockets, webhooks, uploads, colas, CLI, IPC, parsers y tareas programadas.
- Modelar actor anónimo, usuario, tenant malicioso, operador, insider, proveedor y supply chain.
- Aplicar STRIDE por límite y escribir abuse cases: “como actor X puedo intentar Y para obtener Z”.

## Identidad y acceso

- Revisar alta, login, recuperación, MFA/step-up, sesiones, expiración, rotación y revocación.
- Seguir emisión y validación de tokens: issuer, audience, algoritmo, clock skew y almacenamiento.
- Comprobar autorización server-side por objeto, función y tenant; buscar IDOR/BOLA/BFLA.
- Revisar default deny, privilegios de servicios, cuentas admin y separación de funciones.

## Entrada no confiable

- Trazar entrada hasta SQL/NoSQL, shell, templates, HTML, rutas, URLs internas y deserializadores.
- Revisar XSS, CSRF, SSRF, traversal, XXE, unsafe deserialization, mass assignment y uploads.
- Comprobar canonicalización, límites de tamaño, allowlists, encoding contextual y errores.
- Considerar replay, duplicación, race conditions, idempotencia y bypass de workflow.

## Secretos y criptografía

- Buscar nombres/patrones de credenciales sin imprimir valores; revisar historial solo con autorización y redacción.
- Examinar origen, distribución, alcance, rotación, revocación y exposición en logs/build artifacts.
- Revisar TLS, cifrado at-rest, hashing de contraseñas, nonces/IVs, randomness y gestión de claves.
- No inventar debilidades criptográficas: seguir la ruta y verificar algoritmo/configuración real.

## Web, API y abuso

- Revisar CORS, cookies, headers, CSRF, redirects, caching y errores verbosos.
- Evaluar rate limits, cuotas, anti-automation, límites de coste y amplification/DoS sin ejecutar carga.
- Comprobar endpoints debug/admin, documentación expuesta y defaults de desarrollo.
- Validar audit trail, correlación, alertas y respuesta para eventos de seguridad.

## Plataforma y supply chain

- Revisar IAM, red, storage, contenedores, permisos del runtime, metadata endpoints y configuración cloud/IaC.
- Comprobar lockfiles, pinning, scripts de instalación/build, provenance, SBOM y permisos de CI.
- Verificar CVEs contra advisory oficial del proveedor o base oficial actual; registrar versión y fecha de consulta.
- Separar paquete vulnerable de ruta realmente alcanzable y configuración explotable.

## Prueba de un hallazgo

Exigir activo + actor + entrada + control fallido + impacto. Si falta una pieza, etiquetar como defense in depth o validación pendiente, no como exploit confirmado.
