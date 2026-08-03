---
name: audit-architecture
description: >-
  Reconstruye y audita en modo solo lectura la arquitectura realmente desplegada:
  límites y dependencias, componentes, contratos, datos/eventos, build, entornos,
  IaC, fiabilidad y observabilidad. Usar cuando el usuario pida auditoría de
  arquitectura o infraestructura, system design review, revisión de modularidad,
  acoplamiento, despliegue, resiliencia u operabilidad, “auditoría de
  arquitectura/infraestructura”, o invoque $audit-architecture. No usar para
  calidad de código, vulnerabilidades, producto o UX salvo reconocimiento de sus
  límites arquitectónicos.
---

# Auditoría de arquitectura

Derivar la arquitectura “as built” desde imports, composition roots, contratos, manifiestos y despliegue. Tratar los diagramas y ADRs como intención que debe comprobarse.

## Preparar

Leer completamente [references/checklist.md](references/checklist.md) antes de emitir hallazgos.

- Mantener código, IaC, servicios y entornos sin cambios. No aplicar planes, despliegues ni migraciones.
- Leer instrucciones del repositorio y conservar cambios existentes.
- Delimitar entornos y escala esperada; registrar qué topología se observó directamente y cuál solo se infirió.
- Priorizar hot paths, fronteras de confianza, datos persistentes y modos de fallo con mayor blast radius.

## Trabajar en cuatro fases

### 1. Reconstruir el mapa

Identificar estilo, bounded contexts, componentes en runtime, ownership, dependencias, comunicaciones sync/async, stores, eventos, artefactos, pipelines, entornos, plataforma y observabilidad. Describir los flujos principales y el comportamiento cuando cada dependencia crítica falla.

### 2. Auditar la arquitectura real

Aplicar el checklist. Para cada hallazgo incluir:

- `ARC-NNN`, título, severidad, confianza y estado de evidencia.
- Ubicación exacta: módulo, import, contrato, manifiesto, recurso IaC o configuración.
- Diferencia entre intención documentada y comportamiento construido, si existe.
- Mecanismo y consecuencia: coste de cambio, acoplamiento, pérdida, indisponibilidad, inconsistencia o punto ciego operativo.
- Recomendación proporcional, criterio estructural/operativo verificable y prueba, check o simulacro de cierre.

No premiar una frontera que solo existe en un documento. No declarar un SPOF, falta de rollback o pérdida de mensajes sin seguir la ruta de ejecución/configuración. Confirmar Critical/High con evidencia independiente.

### 3. Definir estrategia

Reducir los hallazgos a 3–5 temas. Para cada uno definir estado objetivo, principio, fitness function que lo mantenga y trade-off. Evitar recomendar microservicios, Kubernetes, multi-región o eventing por moda; justificar contra escala y objetivos.

### 4. Crear plan

Ordenar: seguridad para cambiar, riesgos críticos de disponibilidad/datos, límites y contratos de alto apalancamiento, y consistencia operativa. Incluir IDs, componentes, esfuerzo `S/M/L/XL`, blast radius de la modificación, dependencias, aceptación y método de verificación. No implementar.

## Calibrar severidad

- `Critical`: ruta activa de pérdida grave, compromiso sistémico o caída sin recuperación viable.
- `High`: SPOF o fallo probable que afecta una capacidad principal, frontera o dato crítico.
- `Medium`: degradación significativa de cambio u operación con contención disponible.
- `Low`: inconsistencia o deuda arquitectónica local con efecto limitado.

Separar severidad de confianza y mover hipótesis débiles a validaciones pendientes.

## Entregar

Cuando esta skill participe en una auditoría multilente, escribir toda esta entrega en `audit/<AAAA-MM-DD>/architecture-audit.md`. La hoja debe ser autosuficiente y conservar evidencia, hallazgos, estrategia y plan completos; el índice, el resumen o el consolidado no la sustituyen. Si el lente queda bloqueado, documentar en esa hoja el alcance, la evidencia intentada, el bloqueo y los pasos para desbloquearlo.

Producir:

1. Resumen ejecutivo, postura de operabilidad/resiliencia, confianza y cobertura.
2. Alcance, entornos y limitaciones.
3. Mapa as-built: componentes, dependencias, flujos de datos/eventos, despliegue y fallos.
4. Drift intención-realidad.
5. Hallazgos priorizados y fortalezas.
6. Estrategia con fitness functions y decisiones de no-rearquitectura.
7. Plan por hitos, quick wins y boceto de las tres acciones principales.
8. Preguntas sobre escala, SLO, RPO/RTO, tenancy, coste y ownership.

Si se asigna una nota A–F, acompañarla de cobertura y confianza. Indicar qué subsistemas recibieron una revisión ligera.
