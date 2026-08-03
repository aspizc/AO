---
name: audit-data-privacy
description: >-
  Audita en modo solo lectura cómo un sistema modela, recoge, transforma,
  almacena, comparte, retiene y elimina datos, con foco en PII, datos sensibles,
  aislamiento, calidad, linaje y gobierno. Usar cuando el usuario pida auditoría
  de datos o privacidad, GDPR/CCPA/HIPAA readiness review, revisión de PII,
  retención, derecho de supresión, modelo/calidad de datos, “auditoría de datos y
  privacidad” o invoque $audit-data-privacy. No acceder a registros reales ni
  emitir conclusiones legales; para AppSec o topología general usar otras skills.
---

# Auditoría de datos y privacidad

Evaluar la estructura y el flujo de los datos sin inspeccionar personas ni registros. Trazar cada categoría sensible desde la recogida hasta su eliminación y distinguir política declarada de control realmente aplicado.

## Preparar y proteger

Leer completamente [references/checklist.md](references/checklist.md) antes de emitir hallazgos.

- No consultar, muestrear, exportar, copiar ni modificar datos personales o productivos. Inspeccionar schemas, migraciones, modelos, consultas, políticas, configuración y código de flujo.
- No ejecutar migraciones, backfills, jobs de retención ni pruebas de borrado sobre stores compartidos.
- Redactar nombres/valores que identifiquen personas. Citar tabla/campo/categoría, no contenido real.
- Identificar jurisdicciones y obligaciones declaradas. Verificar requisitos actuales en fuentes oficiales cuando sean relevantes y remitir interpretación jurídica final a asesoría/DPO.

## Trabajar en cuatro fases

### 1. Construir el mapa de datos

Inventariar stores, datasets, modelos, owners y categorías. Trazar colección, propósito, transformación, persistencia, logs/caches/backups, terceros y eliminación. Marcar flows `observados`, `inferidos` y `desconocidos`.

### 2. Auditar datos y privacidad

Aplicar el checklist. Para cada hallazgo incluir:

- `DAT-NNN`, título, severidad, confianza y estado de evidencia.
- Dataset, tabla/campo, flujo, policy o configuración exacta.
- Categoría/clasificación, sujetos afectados y etapa del ciclo de vida.
- Consecuencia de integridad, exposición, aislamiento, derechos o compliance; formular lo legal como riesgo/pregunta, no sentencia.
- Recomendación proporcional, blast radius de datos, aceptación y prueba segura de cierre.

Confirmar Critical/High con dos señales cuando sea posible. Una política sin enforcement, una tabla sin owner o un borrado que omite backups son hallazgos distintos de la mera ausencia documental.

### 3. Definir estrategia

Agrupar causas sistémicas y definir estado objetivo, principio —minimización, purpose limitation, privacy by design, owner único— y control permanente. Evitar burocracia desproporcionada para datos no sensibles.

### 4. Crear plan

Ordenar visibilidad/clasificación, cierre de exposición y derechos, gobierno automatizado y calidad. Incluir IDs, datasets, esfuerzo `S/M/L/XL`, riesgo de migración/pérdida, dependencias, aceptación y simulacro/test de cierre. No implementar.

## Calibrar severidad

- `Critical`: exposición o mezcla cross-tenant grave, pérdida/corrupción amplia o procesamiento sensible de alto riesgo sin control básico.
- `High`: PII sobreexpuesta, borrado/derecho esencial roto o integridad crítica vulnerable.
- `Medium`: control incompleto con alcance contenido o mitigación operativa.
- `Low`: deuda de gobierno/documentación con efecto limitado y sin exposición demostrada.

Separar severidad de confianza. Las cuestiones jurídicas no resueltas pertenecen a preguntas abiertas.

## Entregar

Cuando esta skill participe en una auditoría multilente, escribir toda esta entrega en `audit/<AAAA-MM-DD>/data-privacy-audit.md`. La hoja debe ser autosuficiente y conservar evidencia, hallazgos, estrategia y plan completos; el índice, el resumen o el consolidado no la sustituyen. Si el lente queda bloqueado, documentar en esa hoja el alcance, la evidencia intentada, el bloqueo y los pasos para desbloquearlo.

Producir:

1. Resumen ejecutivo, postura de datos/privacidad, confianza, cobertura y riesgos urgentes.
2. Alcance, categorías y jurisdicciones asumidas, sin datos reales.
3. Mapa de stores, owners, clasificaciones, linaje y ciclo de vida.
4. Hallazgos priorizados y fortalezas.
5. Estrategia y controles permanentes.
6. Plan por hitos, quick wins y boceto de las tres acciones principales con blast radius.
7. Preguntas para owner/DPO/asesoría sobre finalidad, base, residencia, retención y derechos.

No convertir ausencia de evidencia en incumplimiento legal. Indicar explícitamente qué stores o flujos no pudieron trazarse.
