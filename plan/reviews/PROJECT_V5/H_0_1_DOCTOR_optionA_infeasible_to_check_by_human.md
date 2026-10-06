# Operator decision required — DOCTOR Option A proven infeasible; pivot needed (V5 H/0/01)

Date: 2026-07-27
Status: **RATIFIED — Option B** (operator decision, 2026-07-27): Option A's absolute criterion is
accepted as infeasible in pure-Python stdlib; the unavoidable-dunder same-process reflection residual
is documented as owned by D/0/02, the Trial 12 hardening is kept, the residual is recorded DEFERRED,
and H/0/01 DOCTOR is accepted at the narrowed criterion. A-hard (C-extension DTO) was not taken.
Evidence: `H_0_1_DOCTOR-12_to_review.md` (design-first redesign) · `H_0_1_DOCTOR-12_result.md`
(independent `reviewed_KO`, P0=0 P1=0 P2=1, on this lane branch) · the four prior P2 KOs (Trials
8–11).

## Decisive new finding (why this reopens the decision you already made)

You ratified **Option A (design-first): eliminate the entire writable-function-`__dict__`
retention class reachable from the issued DTO — no ordinary Python-function `__dict__` reachable
at all.** Trial 12 executed that faithfully: it removed `_OpaqueDTO.__del__`, made the discovered
weak-reference callback slots-only with a C-level builtin, and moved retirement to a module-private
post-GC sweep. The independent reviewer confirmed all of that is correct.

**But the review proved Option A's criterion is unsatisfiable for any Python object.** Every sealed
DTO still exposes ordinary Python methods that each carry a writable `__func__.__dict__` reachable
from the DTO — `__repr__`, `__eq__`, `__init__`, `__str__`, `__setattr__`, `__delattr__`,
`__getstate__`, `__setstate__`, `__replace__` (it is a frozen dataclass with custom `__repr__`/
`__eq__`). The reviewer's own pytest enumerated 8–9 such surfaces per runtime and showed retention
survives through `__repr__`, `__eq__`, AND `__init__` on both Python 3.11 and 3.13 (7 failed each).

The whack-a-mole across Trials 8–12 was therefore never about a specific spelling: **any Python
method on a Python object is a retention surface.** To reach ZERO reachable ordinary-Python-function
`__dict__`, the DTO cannot be a normal Python class at all — it would have to be a hand-written
C-extension / builtin type with no Python methods. That is outside a stdlib-only preflight's remit.

The sheet has ALWAYS assigned hostile same-process isolation to `D/0/02`
(`H/0/01.md:181-183`, `docs/doctor.md`), and this residual needs same-process + a live issued DTO +
the loaded module — exactly that boundary. The DOCTOR admission path stays fail-closed and no unsafe
result projection exists; only an in-process retention-authority surface remains.

## The options (Option A as literally stated is off the table — it is infeasible)

- **B — Accept the residual as D/0/02 scope (recommended).** Amend `H/0/01.md` + `docs/doctor.md`
  to state that same-process reflection through unavoidable Python dunder methods is the documented
  in-process boundary owned by `D/0/02`, KEEP the Trial 12 hardening (removing `__del__` and the
  callback route is a genuine improvement over Trial 11), record the residual in a DEFERRED
  register, and accept H/0/01 DOCTOR at Trial 12. This is the honest, feasible path; the reviewer
  refused to narrow the criterion itself precisely because it needs your decision.

- **A-hard — Make the DTO a C-extension/builtin type with no Python methods.** The only way to
  literally reach zero reachable Python-function `__dict__`. A significant redesign that ships
  compiled code from a "stdlib preflight" (arguably contradicting the sheet's stdlib-only scope),
  loses the DTO's Python repr/eq ergonomics, and still must be proven not to expose C-level
  surfaces. Heavy; not recommended unless you specifically require the absolute criterion.

## Orchestrator recommendation

**B.** The design-first attempt you authorized was the correct experiment — it eliminated the
avoidable routes and, crucially, proved the absolute criterion is unachievable in pure-Python
stdlib. B keeps that hardening and closes DOCTOR honestly with the residual scoped to D/0/02, which
the sheet already documents. Reply **B** or **A-hard**. The ratification is recorded here and drives
the next step. The H coder session stays parked.
