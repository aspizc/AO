# Operator decision required — H/0/01 DOCTOR retirement-authority residual (V5 Wave 2)

Date: 2026-07-27
Status: **RATIFIED — Option A** (operator decision, 2026-07-27): design-first Trial 12 redesigns
retirement so no ordinary Python-function `__dict__` is reachable from the issued DTO (builtin/
C-level finalizer, `__slots__`-only callback object, or `weakref.finalize` bound to a builtin),
eliminating the entire writable-function-`__dict__` retention class rather than closing another
spelling. Option B (defer the residual to D/0/02) was NOT taken.
Evidence: [`H_0_1_DOCTOR-11_to_review.md`](H_0_1_DOCTOR-11_to_review.md) (Trial 11, sealed) ·
[`H_0_1_DOCTOR-11_result.md`](H_0_1_DOCTOR-11_result.md) (independent `reviewed_KO`, P0=0 P1=0
P2=1, `3076f7a`) · Trial 10 result (same P2 class)

## Why this needs you (one paragraph)

DOCTOR has now taken **four consecutive P2-only KOs (Trials 8, 9, 10, 11)** on the **same
class**: a writable Python-function `__dict__` reachable from the public issued DTO that can
retain a binding/probe/ledger graph. Each trial closes the exact named spelling and the reviewer
finds an equivalent sibling — Trial 10 closed `reference.__callback__.__call__.__func__.__dict__`;
Trial 11 relocated retirement to `_OpaqueDTO.__del__` (the ordinary function `_retire_issued_dto`)
and the reviewer immediately reached `binding.__del__.__func__.__dict__`. This will **not
converge by closing spellings** — as long as retirement is an ordinary Python function referenced
from a DTO-reachable dunder, its `__dict__` is writable. This is the convergence-guard tripwire
(hardening rounds > 3 on one class), so I am stopping rather than spinning a Trial 12 that would
predictably KO on the next sibling. The decision is a genuine scope/design call, and it turns on
a real tension **inside the sheet itself**, so an agent must not settle it.

## The tension inside the sheet

- `H/0/01.md:154,230` (acceptance criteria) require that retirement expose **no** writable
  function state / callback-attribute / writable `__dict__` on a DTO-reachable surface. By that
  literal criterion the residual is a defect and Trial 11 is correctly KO.
- `H/0/01.md:181-183,191` and `docs/doctor.md:94-103` say DOCTOR is a **stdlib-only preflight**,
  a "documented in-process trust boundary, never runtime finality", and explicitly **assign
  hostile same-process isolation to `D/0/02`**. The residual is only reachable by an attacker who
  already holds the live issued DTO **and** runs in-process with the loaded module — i.e. exactly
  the same-process boundary the sheet defers to D/0/02.

The reviewer kept it **P2, non-blocking** precisely because of this tension: the DOCTOR admission
path is fail-closed, no unsafe result projection was shown, and the actual output integrity is
intact. What remains is an in-process retention-authority surface.

## The options

- **A — Design-first Trial 12 (close the whole class).** Redesign retirement so **no ordinary
  Python-function `__dict__` is reachable from the issued DTO at all** — e.g. a built-in/C-level
  finalizer, a `__slots__`-only callback object with no `__dict__`, or `weakref.finalize` bound to
  a builtin — not another spelling-closure. This literally satisfies `:154,230` and converges the
  lane. It is the "attack the root, not the symptoms / RESTRICT beats ANALYSE" move. Cost: one
  real design+implement+review round; the reviewer's Trial 11 "Required correction" list is the
  spec. Recommended if you want H/0/01 to hold the no-writable-retention criterion as written.

- **B — Ratify the residual as D/0/02 scope (amend the sheet).** Amend `H/0/01.md` and
  `docs/doctor.md` to explicitly carve the DTO-reachable writable-function-`__dict__` residual as
  an **accepted in-process limitation owned by `D/0/02`** (consistent with `:181-183`), record it
  in a DEFERRED register, and accept H/0/01 DOCTOR at Trial 11 with the P2 documented. Defensible
  because the sheet already assigns same-process isolation to D/0/02 and the residual needs
  same-process + live-DTO + loaded-module privilege. Cost: a scoped sheet/doc amendment + its own
  independent review; no further DOCTOR implementation.

## Orchestrator recommended default

**A**, unless you judge same-process function-`__dict__` retention to be out of a stdlib
preflight's remit — in which case **B** is the honest, already-half-documented path. I lean A only
because the sheet's acceptance criteria (`:154,230`) currently state the criterion in absolute
terms; if you prefer B, the sheet is the thing to change, and that is yours to authorize. Either
way the DOCTOR admission/output integrity is already sound; this is purely about the residual
in-process retention surface.

## What the operator must answer

Reply **A** (design-first Trial 12 to eliminate the writable-function-dict class) or **B** (amend
the sheet to defer the same-process residual to D/0/02 and accept Trial 11). The ratification is
recorded here and drives the next step. The H coder session holding Trial 11 context stays parked.
