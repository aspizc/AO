# Stage D — Principal, repository binding, and safe execution

Status: **in progress**. These are functional safety prerequisites before
expanding real agent execution. `D/0/00` is complete after Trial 4 independent
OK at `7244852` and functional Wave 2 integration at `b711b92`; promotion
remains gated by the combined Wave 2 review and CI. `D/0/05–06` close
recursive-control and global-budget admission before the adversarial gate
`D/0/04`. The post-C/1/00 Trial 15 human decision assigns all synchronous and
asynchronous process supervision, FIFO guardian/reaper behavior, configured
Python runtime, no-shell execution, PGID/descendant cleanup, cancellation, and
process budgets to `D/0/01`. Its standalone core is complete after Trial 4
independent OK at `8198698` and integration at `a7c09b0`; the dependency
unblock by reviewed C/1/00 rebaseline CORE Trial 2 at `4faec5e` / integration
`37bc85c` let the splice start, but `D_0_1_SPLICE` Trial 1 exposed the
persistent spawn/control boundary and was independently confirmed
`blocked_confirmed` (`plan/reviews/PROJECT_V5/D_0_1_SPLICE-1_result.md` on the
`feat/V5-D-0-01-c100-splice` branch). The operator ratified Option 1 on
2026-07-27. D/0/07a Trial 3 is reviewed OK and integrated at `aaf4817`;
D/0/07b Trial 2 is reviewed OK and integrated at `d65e9f4`. D/0/07c design
amendments are ratified at `ac92d51`. Trial 3 was independently reviewed KO at
`1d8c952` after implementation `d7873eb` and request `c38762a`. Trial 4
technical GREEN is `5ffdf51`; the append-only candidate `cf3b172` was
independently reviewed OK at `5739ea1` and integrated at `10f5b03`; that Trial
4 state remains historical. Trial 5 technical commit `8c77c92` was
independently reviewed KO at `9aafa77`. Trial 6 technical commit `4f072a7`
was independently reviewed KO at `43687af`. Trial 7 fail-closed
bootstrap-ownership correction `d79fd00` was independently reviewed OK at
`7caf94b` and integrated at `c66b05f`. D/0/07c is complete but not promoted
or released. D/0/07d remains planned and unimplemented; its D/0/07c
dependency is satisfied. The shared [`D/0/07`](0/07.md) contract is a non-executable index.
H/0/00 is already reviewed and integrated.

`A/0/00` is implemented. Rebaselined Project V4 specifications are integrated
into this plan; behavior remains `planned` until implementation commits, tests,
and reviews exist. `absorbed_from` records specification traceability.

| Sheet | Outcome | Status | Functional priority |
|---|---|---|---|
| [D/0/00](0/00.md) | Server-owned principal and repository context | complete; Trial 4 reviewed OK and integrated in Wave 2 | P0 |
| [D/0/01](0/01.md) | Async supervised execution, transferred sync/FIFO containment, and exact provider argv/effective-audit parity | in progress; `D_0_1_CORE` Trial 4 OK/integrated; `D_0_1_SPLICE` Trial 1 `blocked_confirmed`, ratified Option 1, blocked on reviewed `D/0/07d` | P0 |
| [D/0/07](0/07.md) | Shared authenticated session-port topology/API/wire/terminal contract and four-leaf index | index; not counted as an executable sheet | P0 |
| [D/0/07a](0/07a.md) | Capability issuer/state machine, exact `ASP1` codec, and binding tag; depends on integrated D core | Trial 3 reviewed OK and integrated in Wave 2 | P0 |
| [D/0/07b](0/07b.md) | PTY lifecycle, cross-platform live identity, and verified writes; depends on reviewed `07a` | Trial 2 reviewed OK and integrated in Wave 2 | P0 |
| [D/0/07c](0/07c.md) | Authenticated relay/socket, tmux observation, and canonical snapshots; depends on reviewed/integrated `07a–b` | complete; Trial 4 remains historical reviewed/integrated evidence; Trials 5 and 6 were independently KO; Trial 7 correction `d79fd00` was independently reviewed OK at `7caf94b` and integrated at `c66b05f`; not promoted or released; satisfies the `D/0/07d` dependency | P0 |
| [D/0/07d](0/07d.md) | Final composition and isolated real-host race/acceptance gate; depends on reviewed/integrated `07a–c` | planned and unimplemented; D/0/07c dependency satisfied; next leaf; blocks `D_0_1_SPLICE` | P0 |
| [D/0/02](0/02.md) | Isolated runtime and mediated output | planned | P0 |
| [D/0/03](0/03.md) | Single writer and crash reconciliation | planned | P0 |
| [D/0/05](0/05.md) | Non-inheritable control plane and recursion guard | planned | P0 |
| [D/0/06](0/06.md) | Global resource/provider-cost budgets | planned | P0 |
| [D/0/04](0/04.md) | Adversarial execution gate | planned | P0 |
