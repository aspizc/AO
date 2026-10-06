# Human decision — Project V5 D/0/07c post-`ACCEPT` binding design

Decision: **RATIFIED — all five amendments approved as specified.**

The operator was presented with the escalation
[`D_0_7C_DESIGN_to_check_by_human.md`](D_0_7C_DESIGN_to_check_by_human.md)
(escalated at `0db688b`), including its "What you should look at hardest"
section, and chose to ratify all five amendments as stated rather than decline
or defer any of them.

Decision relayed through the orchestrator session on 2026-07-29.

## Ratified amendments

Each amendment carried exactly one ratifiable option. All five are approved:

| Decision | Ratified option |
|---|---|
| 1. Relay transfer authority | 1B — retained-socket/read-range amendment |
| 2. Atomic tmux capture and owned-object retirement | 2A — maintained custom shared-server tmux amendment |
| 3. Process/tree retirement | 3B — bounded process-preservation amendment |
| 4. Owned namespace retirement | 4C — namespace-preservation amendment |
| 5. PTY source/write authority | 5B — read-time retained-PTY amendment |

## Disclosed costs accepted with this ratification

The operator was shown, and accepted, the combined-effect disclosures that no
single amendment row conveys:

1. An atomic, field-exact capture may render bytes whose producer, production
   time, foreground job, or binding state were admitted by Decision 5 and are
   **not** established by the capture.
2. Under Decision 4, cleanup closes descriptors but never unlinks the relay
   socket and never removes the runtime directory. Absent external removal,
   **both persist after every ordinary accepted generation**. This is selected
   baseline behaviour, not a failure mode, and the trigger-class rows marked
   *expected in a conforming ordinary run* are ratified as such.

## Binding disposition

1. This ratification authorizes **implementation of `D/0/07c` and nothing
   else**. It is not an integration, promotion, publication, tagging, merge,
   support, or release claim, and it grants no acceptance authority over any
   future implementation trial.
2. Implementation must follow the design independently approved at trial 9
   (`95185e0`), approved by two reviewers with zero findings at every severity
   (`e230faf` reviewer A, `83252f6` reviewer B).
3. The three prior implementation KOs (`D_0_7C-1_result.md`,
   `D_0_7C-1_result_second.md`, `D_0_7C-2_result_a.md`,
   `D_0_7C-2_result_b.md`) and all nine design trials remain immutable
   evidence. The new implementation series does not erase or supersede them.
4. Trial 3's GREEN at `590e053` remains unsealed evidence, not a candidate. It
   is not automatically cherry-picked; any idea salvaged from it requires its
   own RED evidence, path allowlist, technical commit, and independent review.
5. Every implementation trial still requires an independent reviewer session
   distinct from the coder, under its own orchestration trace.
6. `D/0/07d` and `D_0_1_SPLICE` remain blocked until `D/0/07c` has an
   independently reviewed-OK candidate; this decision does not advance them.
7. Only the integrator updates shared sheets, the epic DAG, the coverage
   matrix, indexes, CI manifests, and shared documentation.

No implementation, integration, promotion, or release is authorized merely by
recording this decision.
