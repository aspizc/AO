# Stage C — CLI de operador

Estado: backlog. [`TASKS.md`](TASKS.md) indexa las cinco fichas físicas. CLI
primero; una UI futura consume el mismo control protocol.

| ID | Tarea | Depende de | Esfuerzo |
|---|---|---|---|
| [C/0/00](0/00.md) | Audit legible y seguro | B/5/02 | M |
| [C/0/01](0/01.md) | Cola/detail de approvals via control socket | C/0/00, B/2/02 | S/M |
| [C/0/02](0/02.md) | Consentimiento informado + firma | C/0/01 | M |
| [C/0/03](0/03.md) | Inventario y recovery operables | C/0/02, B/1/09 | M |
| [C/0/04](0/04.md) | Consentimiento y perfil de orquestador YOLO | C/0/03, B/2/03 | M |

Las tareas se integran en orden porque comparten `main.py`/`output.py`. JSON es
un formato de salida, nunca una autorizacion. Ninguna tarea C abre la DB o el
audit para escribir.
