---
name: audit-security
description: >-
  Realiza una auditoría de seguridad y modelado de amenazas, de solo lectura y
  basada en rutas de ataque verificables: activos, límites de confianza,
  autenticación, autorización, inyección, secretos, criptografía, supply chain,
  configuración, exposición de datos y abuso. Usar cuando el usuario pida una
  auditoría de seguridad, AppSec review, threat model, vulnerability assessment,
  revisión tipo pentest sin explotación, “auditoría de seguridad”, “modelado de
  amenazas” o invoque $audit-security. No usar como auditoría general de código,
  privacidad legal/gobierno de datos o topología arquitectónica.
---

# Auditoría de seguridad

Pensar como atacante y defensor, pero trabajar de forma segura. Priorizar rutas explotables y controles de los activos críticos por encima de checklists genéricos.

## Preparar y limitar

Leer completamente [references/checklist.md](references/checklist.md) antes de emitir hallazgos.

- Mantener sistemas, código, identidades y datos sin cambios. Sin autorización explícita, no enviar payloads a servicios remotos, no escanear infraestructura ajena, no forzar autenticación, no probar DoS y no explotar una vulnerabilidad.
- No mostrar, copiar ni persistir valores de secretos. Citar solo ruta, nombre de clave y estado; redactar tokens, credenciales, PII y muestras sensibles.
- Identificar entorno, exposición, tenancy, actores, activos críticos y límites de confianza. No asumir que local, staging y producción comparten controles.
- Verificar afirmaciones temporales —CVE vigente, versión afectada, recomendación criptográfica o requisito regulatorio— en fuentes oficiales y actuales antes de citarlas.

## Trabajar en cuatro fases

### 1. Modelar amenazas

Mapear activos, entry points, identidades, privilegios, flujos de datos, terceros y límites. Construir escenarios STRIDE o abuse cases por frontera y seleccionar los caminos con mayor impacto y plausibilidad.

### 2. Auditar controles y rutas de ataque

Aplicar el checklist. Para cada hallazgo incluir:

- `SEC-NNN`, título, severidad, confianza y estado `explotable`, `demostrado localmente`, `teórico` o `no verificable`.
- Evidencia exacta `archivo:línea`, endpoint, policy o recurso, sin datos sensibles.
- Precondiciones, pasos conceptuales de la ruta de ataque y control que falla. Evitar payloads dañinos innecesarios.
- Activo afectado, impacto, alcance, probabilidad y detección posible.
- CWE/OWASP cuando encaje, recomendación mínima, aceptación y regression test seguro.

Confirmar Critical/High releyendo la ruta completa y buscando una segunda señal. Un escáner o coincidencia textual no demuestra alcanzabilidad. Si aparece un Critical vivo y explotable, encabezarlo de inmediato, minimizar detalles sensibles y proponer contención/rotación sin ejecutar cambios.

### 3. Definir estrategia

Agrupar causas sistémicas. Definir estado objetivo, principio —default deny, least privilege, fail closed, defense in depth— y guardrail permanente. Explicitar riesgo aceptado y coste de endurecimiento.

### 4. Crear plan de remediación

Ordenar contención, Critical/High explotables, controles sistémicos y defense in depth. Incluir IDs, superficie, esfuerzo `S/M/L/XL`, riesgo de la corrección, dependencias, criterio verificable y test de regresión. Indicar rotación/revocación cuando un secreto pudo exponerse; borrarlo no basta. No implementar.

## Calibrar severidad

- `Critical`: ruta plausible y activa hacia RCE, bypass total, secreto privilegiado utilizable, ruptura de tenant o pérdida grave.
- `High`: escalada o exposición seria con precondiciones realistas y control esencial ausente.
- `Medium`: explotación más limitada o defensa relevante debilitada con mitigaciones.
- `Low`: hardening local con impacto acotado.

Separar severidad, explotabilidad y confianza. Mover hipótesis de baja confianza a validaciones pendientes.

## Entregar

Cuando esta skill participe en una auditoría multilente, escribir toda esta entrega en `audit/<AAAA-MM-DD>/security-audit.md`. La hoja debe ser autosuficiente y conservar evidencia, hallazgos, estrategia y plan completos; el índice, el resumen o el consolidado no la sustituyen. Si el lente queda bloqueado, documentar en esa hoja el alcance, la evidencia intentada, el bloqueo y los pasos para desbloquearlo.

Producir:

1. Aviso inmediato de Critical confirmado, si existe.
2. Resumen ejecutivo, postura de riesgo, confianza y cobertura.
3. Threat model: activos, actores, fronteras, entry points y top abuse cases.
4. Tabla priorizada de vulnerabilidades y fortalezas.
5. Estrategia, riesgos aceptables y guardrails.
6. Plan por hitos, quick wins y boceto seguro de las tres remediaciones principales.
7. Limitaciones y preguntas sobre exposición, compliance, tenancy, risk appetite e incident ownership.

No incluir instrucciones de explotación más allá de lo necesario para demostrar y corregir el riesgo. No declarar “seguro” un ámbito no examinado.
