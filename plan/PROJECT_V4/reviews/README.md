# PROJECT_V4 — Protocolo de ejecucion y review

Este directorio se usa durante implementacion. El plan actual no contiene
reviews fabricadas ni verdicts: el siguiente gate es `plan.apply` del owner.

## Identidad del change-set

Antes de review, el Gateway calcula y persiste; durante bootstrap M0/0/01 lo
hace el harness controlado por el operador, fuera del Gateway legacy:

```json
{
  "contractVersion": "v4-review-1",
  "taskId": "B/1/02",
  "baseSha": "<40-hex>",
  "headSha": "<40-hex>",
  "diffSha256": "<64-hex>",
  "specSha256": "<64-hex>",
  "testManifestSha256": "<64-hex>"
}
```

Su digest es la clave de todos los artifacts. Cualquier byte cambiado invalida
tests, Review A, Review B y approval asociados.

## Secuencia por trial

1. `plan.apply` antes de iniciar coder: registro humano externo hasta B/2/02;
   envelope del control protocol despues de B/2/02.
2. Coder TDD, tests, commit unico y `change_manifest`.
3. Gateway genera la proyeccion determinista; en bootstrap la genera el harness
   desde manifest/requisitos aprobados, nunca desde raw output del coder.
4. Reviewer A `requirements-risk-reviewer`, sin repo/raw, genera concerns.
5. Reviewer B `restricted-reviewer`, sesion limpia/read-only, lee source por un
   mount RO (raw no se serializa en prompt/MCP) y dispone cada concern A y B.
6. Gate verifica digest, tests, independencia, completeness y verdict.
7. OK permite solicitar `change.accept`; KO vuelve a coder y nuevo digest.
8. Tras 15 KO: `human_escalation`, nunca OK automatico.

## Artifact classes

| Kind | Classification | Contenido permitido |
|---|---|---|
| `change_manifest` | igual al repo o superior | IDs/digests/paths opacos y test refs; sin diff |
| `restricted_change_summary` | internal | enums, conteos, digests, test states e IDs aprobados; sin texto derivado de raw |
| `review_concerns` | internal | IDs A-C, riesgos y evidence solicitada |
| `restricted_review_notes` | restricted | evidencia raw de B; nunca se commitea fuera del repo restricted |
| `review_dispositions` | restricted | tabla completa B + evidence raw refs |
| `review_gate` | internal | IDs/status/digest/verdict, sin snippets |

Reviewer A artifacts son datos no confiables para B. Se pasan como JSON
validado, nunca concatenados en system instructions, comandos o paths.

## Concerns y dispositions

IDs A: `A-C001`, `A-C002`, ...; IDs nuevos B: `B-C001`, ... . B debe emitir
una fila exacta por concern A y un estado/evidence por cada finding B:

| Disposition | Semantica de gate |
|---|---|
| `resolved` | Cerrado con evidencia verificable |
| `not_applicable` | Cerrado con razon y evidencia |
| `confirmed` | Abierto; bloquea |
| `blocking` | Abierto/critico nuevo; bloquea |

No existe “implicitly addressed”. Riesgo aceptado requiere una approval
`risk.accept` separada y ligada al mismo digest; no se convierte en `resolved`.
Todo B-C abierto bloquea igual que `confirmed|blocking` de A.

## Independencia

- Session B distinta de coder y sin memoria/conversation compartida.
- Si coder=Codex, preferir B=Gemini; si coder=Gemini, preferir B=Codex.
- Fallback same-agent solo en nueva sesion read-only y con waiver humano firmado
  ligado al mismo digest.
- A y B no modifican codigo; solo coder corrige KO.

## Ficheros de handoff para el repo `agents-orchestrator`

Para tareas no restricted, se pueden guardar proyecciones Markdown:

```text
<ID>-<trial>_to_review.md
<ID>-<trial>_review_A_concerns.md
<ID>-<trial>_review_B_OK.md   # o _KO.md
<ID>-<trial>_gate_OK.md       # solo generado por evaluador
```

En repos restricted, estos ficheros nunca contienen raw; las notas B viven en
el artifact store restricted y aqui solo puede persistirse `review_gate`.

## Bootstrap de V4

Antes de que Stage D exista, M0/0/01 usa un harness externo controlado por el
operador: A recibe solo spec/manifest en un temp dir sin checkout; B recibe un
checkout separado read-only; ninguna raw review atraviesa artifacts/capabilities
del Gateway legacy. El humano valida canaries, digest y dispositions. D/1/03
solo reemplaza este bootstrap despues de una review humana que no puede
auto-certificarse.

## Handoff minimo del coder

```markdown
# Review submission — PROJECT_V4 <ID> trial <n>
## Change-set
- base/head/diff/spec/test digests
## What and why
## TDD evidence
- failing command/result before
- passing command/result after
## Security/rollback
## Commit
- <sha> <subject>
```

No se acepta `pending`, un SHA inexistente, tests omitidos sin bloqueo
ambiental demostrable ni un verdict libre que no valide contra schema.
