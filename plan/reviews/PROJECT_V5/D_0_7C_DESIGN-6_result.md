# Project V5 D/0/07c Design Trial 6 — reviewer A result

reviewed_OK

## Review boundary and outcome

I reviewed design commit
`2afee8abd8684a3266786640238b4b68ef7eccbe` against the adjudicated
Trial 5 base `a26039421664b4452a5c4ff968bae7ca27056698`, using
`plan/reviews/PROJECT_V5/D_0_7C_DESIGN-5_result_b.md` as the binding
specification. I also reviewed the Trial 6 request at
`a153a01dd719453ec686eacca60c45b213e6c3dd`.

The Trial 5 P1 is closed. Decision 3 now tells the operator, in the line being
ratified, that exact forced retirement of the direct root/original group is
retained only while current direct-child ownership and the unreaped-leader
anchor hold. It separately says that helper or reaper death, adoption after
that death, premature leader reap, or cleanup after a restart removes that
anchor, after which no numeric signal is permitted and unresolved
direct-root/original-group members may also survive as `PRESERVED`.

The capability-loss cell states the true residual survival set in both cases:
with the anchor held, only outside-group descendants and the separate relay
may survive; with the anchor lost, the direct root and original-group members
may survive too (`design:517`).

I found no operative rule, signal condition, target, ordering, fallback,
REJECT mapping, or settlement change. The 17 deleted physical lines are all
accounted for below.

This OK authorizes implementation only. It is not operator ratification and
authorizes no integration, promotion, release, D/0/07d gate, or
adapter/service/catalog splice.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | Every numeric original-group signal remains conditional on current direct-child ownership and an unreaped leader; loss of either condition requires zero numeric signals and preservation. |
| P1 | 0 | The Trial 5 residual-survival disclosure defect is closed in the ratifiable commitment, capability-loss cell, surrounding rule disclosure, inventory, and proof obligations. |
| P2 | 0 | No advisory finding. |

## Trial 5 P1 ruling

The correction is complete and internally consistent:

- The unchanged operative fallback says that if the parent-owned/unreaped
  invariant is unavailable, cleanup signals nothing by number, rejects the
  target, and records it `PRESERVED` (`design:363-370`).
- The former “and only that set” claim is gone. The surrounding disclosure
  now distinguishes the anchored residual set from the anchor-lost residual
  set and names helper/reaper death, post-death adoption, premature reap, and
  cleanup after restart (`design:380-388`).
- The complete site inventory requires current direct-child ownership and an
  unreaped leader for signalling, and specifies zero numeric signals plus
  `PRESERVED` for every unresolved root/group target if either condition is
  unavailable (`design:483`).
- The operator commitment itself contains both branches and all four ordinary
  anchor-loss paths. The adjacent capability-loss cell is explicitly split
  into **Anchor held** and **Anchor lost** (`design:517`).
- Four isolated future proof rows require zero signal calls for post-sealing
  helper/reaper ownership loss, adoption after death, premature reap, and a
  restarted cleaner (`design:558-561`).

The amendment therefore discloses, rather than silently introduces, the
already-operative `PRESERVED` outcome.

## Line-by-line accounting of all 17 deletions

The base line numbers below refer to the pre-candidate design at
`a2603942`. Two deleted physical lines are complete Markdown table rows and
therefore contain several clauses.

| # | Base line | Deleted line or role | Candidate disposition and operative ruling |
|---:|---:|---|---|
| 1 | 21 | `those two P1s as KO. This revision preserves every independently confirmed` | Replaced by the Trial 5 adjudication history and the disclosure-only scope statement at `design:21-28`. Status prose only. |
| 2 | 22 | `workload/disposition/inventory, authority-partition, option-deletion,` | The older carry-forward summary is superseded by the more specific statement that both Trial 5 reviewers confirmed anchored signal safety. No rule was removed. |
| 3 | 23 | `custom-tmux, and namespace closure and addresses only those two P1s.` | Replaced by the statement that this revision changes no operative rule and addresses only the Trial 5 disclosure finding. No operative effect. |
| 4 | 362 | `the invariant is a cleanup failure, not a ratified surrender of ordinary` | Replaced at `design:367-370`: loss remains a cleanup failure, never permits numeric fallback, and its existing `PRESERVED` consequence must be disclosed and ratified. This corrects the operator-facing characterization only. |
| 5 | 363 | `utility-root/group retirement.` | Continuation of deletion 4. The anchored retirement obligation remains at `design:348-361`; the anchor-lost preservation branch remains at `design:363-370`. |
| 6 | 373 | `resources, and producing side effects. That residual set, and only that set,` | Replaced at `design:380-388` with the anchored and anchor-lost residual sets. The false exclusivity claim is removed. |
| 7 | 374 | `is the Decision 3 parent-acceptance amendment.` | Continuation of deletion 6. The amendment now expressly comprises both residual sets; cleanup behavior is unchanged. |
| 8 | 469 | The former complete-inventory row for direct-root/original-group retirement. | Replaced by `design:483`. The new row retains `C > V`, the unreaped leader, sealed original PGID, TERM/grace/KILL, exact `ESRCH`, no re-resolution, signal-before-reap, and anchored `RETIRED`; it adds the existing anchor-loss `PRESERVED` fallback. The replacement does not repeat the phrase “hold the cleanup/reap mutex,” but the row still names R3 as governing and unchanged R3 requires the entire sequence under one cleanup/reap mutex at `design:352-361`. No global condition or ordering is weakened. |
| 9 | 503 | The former complete Decision 3 operator row, including the unqualified retention and “Only descendants...” loss claim. | Replaced by `design:517`. Every anchored action and prohibition remains; the commitment and loss cell now disclose both anchor states and the four ordinary loss paths. This is the P1 correction, not an operative change. |
| 10 | 561 | `retirement, Decision 3 anchored group retirement plus residual preservation,` | Replaced at `design:579-581` by the more precise “anchored group retirement plus both anchored and anchor-lost residual-preservation cases.” Proof-summary prose only. |
| 11 | 562 | `and Decision 4 preservation are reachable without weakening the` | Reflowed unchanged around the expanded Decision 3 proof summary at `design:579-581`. |
| 12 | 563 | `active-workload rule.` | Reflowed unchanged at `design:581`; the active-workload rule is not weakened. |
| 13 | 620 | The former Trial 5 closure row claiming that only outside-group descendants and the relay were in the amendment. | Replaced at `design:638` with “While that anchor holds” and an explicit pointer to the Trial 6 anchor-loss qualification. Closure-history prose only. |
| 14 | 668 | `root/original group and amends only that residual process set. Decisions 1–5` | Replaced at `design:697-702` with the anchor-held qualification and anchor-lost residual set. Scope disclosure only. |
| 15 | 669 | `name every amendment required to produce a buildable Linux/Darwin contract.` | Reintroduced unchanged at `design:702-703` after the added Decision 3 qualification. |
| 16 | 670 | `The exact public attach command remains unchanged, which is why the default` | Reintroduced unchanged at `design:703-704`; no attach or tmux rule changed. |
| 17 | 671 | `tmux server/socket must remain shared and preserved.` | Reintroduced unchanged at `design:704-705`; shared-server/socket preservation is undisturbed. |

The deletion accounting finds no silent weakening or strengthening of an
operative rule. The candidate adds truthful restatements and future proof
specifications for behavior already required by R3.

## Operative-rule preservation

The candidate leaves the operative Decision 3 mechanics intact:

| Operative property | Ruling |
|---|---|
| Authorized target | Still only the sealed original group whose leader is the helper's current direct child, has accepted `pid == pgid == sid`, and is live or exited-but-unreaped (`design:155-164,337-361`). |
| Serialization | Still one cleanup/reap mutex with `SIGTERM`, frozen grace, `SIGKILL`, terminal group attempt, and only then leader reap (`design:348-361`). |
| `ESRCH` | Still means that exact anchored group is already absent; it authorizes no lookup or alternate signal (`design:355-361`). |
| Anchor loss | Still zero numeric signals, target rejection, and unresolved `PRESERVED` (`design:363-370`). |
| Outside-group descendants and relay | Still descriptor close/cooperative exit only, with no `_signal_exact`, `kill(pid)`, or `kill(-pgid)` and unresolved `PRESERVED` (`design:372-388`). |
| Settlement | `PRESERVED` remains terminal for the finite cleanup ledger, after which ordinary completion may settle without reviving workload (`design:165-168,436-459,490`). |
| REJECT and cause ordering | The effect-level mappings, positive-prefix rule, and destructive-cleanup preservation rule are outside every candidate hunk and unchanged (`design:169-188`). |

The newly added future proof rows constrain later implementations to the
unchanged safe fallback. They do not authorize an action or alter a runtime
condition.

## Retention-qualification honesty

The retained exact retirement claim is honestly qualified where it matters:
the operator-ratified commitment begins “While the original helper owns the
live-or-unreaped child,” and the loss cell states separate anchor-held and
anchor-lost consequences (`design:517`). The qualification is not left only
in R3 beneath the decision table.

I also swept every other exact-retirement statement:

- the initial boundary calls root/group retirement a narrower exception
  because the helper owns the live-or-unreaped child (`design:47-51`);
- R3's mandatory-retirement statement follows and refers to the complete
  sealed invariant and mutex (`design:337-361`);
- the inventory row contains the current-ownership/unreaped condition and
  fallback (`design:483`);
- the Trial 5 closure row says “While that anchor holds” (`design:638`);
- the Trial 6 closure distinguishes both cases (`design:641-650`); and
- the final scope statement says exact retirement is preserved while the
  original helper-owned live-or-unreaped anchor holds (`design:696-702`).

No decision or capability-loss cell makes an unqualified exact-retirement
claim.

## Loss-cell sweep

| Decision | Operative accepted loss compared with operator cell | Ruling |
|---|---|---|
| 1B | Live relay start/executable/argv/cwd/pgid/sid, current-holder continuity, enforceable no-handoff, and live tmux server/session/pane continuity cease to authorize each transfer. Delegation of the original socket is accepted, and traffic may continue during unobserved drift. | Complete at `design:515`; the exact retained connected object, handshake/proof evidence, `G`, and per-attempt counts remain explicit. |
| 2A | Stock separate-command authority is replaced by a maintained custom default shared tmux. Shared server/socket/siblings are outside cleanup, and custom-server/retained-connection loss may leave owned pane/session targets `PRESERVED` indefinitely. | Complete at `design:516`; deployment, shared blast radius, preservation, and retained-connection loss are all disclosed. |
| 3B | Outside-group descendants and the separate relay may survive in all cases. When the current ownership/unreaped anchor is lost, direct-root/original-group members may survive too. | Complete at `design:517`; both anchor cases and all four ordinary loss paths are explicit. |
| 4C | After `V`, there is no pathname `unlink`/`rmdir`; owned entries or replacements, children, secret material, names/inodes, and disk use may remain and block safe basename reuse. | Complete at `design:518`; the shared tmux socket remains correctly excluded from the owned ledger. |
| 5B | Production-time provenance and effect-time utility, helper/reaper/supervisor, terminal/tmux, foreground, winsize, and producer continuity beyond retained PTY-object identity are lost. Pre-`ACCEPT`/pre-activation and mixed-writer/time ranges are accepted, and writes may reach changed foreground/geometry. | Complete at `design:519`; exact PTY objects, framing/channel, `G`, counts, diagnostics, and sticky revocation remain explicit. |

No loss accepted by the operative rules is omitted from the corresponding
operator commitment/capability-loss cells.

## Preserved behavior

The candidate changes only the Decision 3 design disclosure and does not
touch the frozen capture algorithm, code, tests, or these obligations:

| Preserved obligation | Ruling |
|---|---|
| Frozen canonicalization vector and DTO | Undisturbed. Canonicalization remains a pure transformation after acceptance of one complete atomic record (`design:475-476,657-672`); the normative vector in `plan/PROJECT_V5/D/0/07.md:532-610` is unchanged. |
| Real tmux 3.6 figures | Exact `40 -> 0`, `61 -> 24`, and `50 -> 12`, including row-end spaces, remain stated and required (`design:657-659`). |
| Geometry/history rejection | The retained custom operation still atomically requires exact `120x40` and history limit `400`; stable `121x40` and `history-limit=401` remain terminal-changed rejection with no accepted record (`design:308-323,475,660-661`). |
| Rejected-binding non-revival | Sticky revocation, one-way cleanup, settlement rejection, and direct non-revival proof remain unchanged (`design:104-108,155-168,428-459,556,574,662`). |
| Malformed or absent history evidence | Missing, malformed, or contradictory complete-record evidence still rejects before canonicalization or settlement (`design:318-323,663`). |
| HARD FAIL before ratification | Decisions 1, 2, and 5 remain prerequisites for readiness and positive byte/capture paths; all five approvals remain required before implementation (`design:504-529,669-683,707-708`). |

## What I verified and did not verify

Verified:

- the complete binding Trial 5 reviewer-B verdict;
- the complete candidate design, Trial 6 request, and every candidate diff
  hunk;
- that the candidate design commit changes exactly one tracked file by
  `+51/-17`, and that the request commit adds only the Trial 6 request;
- every one of the 17 deleted physical lines, including the two long table
  rows;
- Decision 3's surrounding rule, complete inventory, ratifiable commitment,
  capability-loss cell, four anchor-loss proof rows, closure summaries, and
  scope stop;
- all five operator commitment/loss rows once more;
- the frozen canonicalization text and the candidate's preserved-behavior
  obligations;
- `git diff --check a2603942 2afee8a --`
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`, which exited zero;
  and
- the pre-existing untracked `gateway/node_modules` directory was not
  touched.

Not verified:

- no implementation or runtime behavior was exercised or certified;
- no source, test, fixture, codec, capability, public API, design, or plan
  sheet was changed by this review;
- no full CI, standalone kernel/socket/lock probe, live provider call, or tmux
  server/session was run;
- no Darwin execution or future custom-tmux binary, packaging, migration,
  wire operation, cleanup lease, or failure behavior was available to test;
- the concurrent second Trial 6 reviewer result was neither sought nor read;
- no operator decision was made; and
- no integration, promotion, release, D/0/07d, or
  adapter/service/catalog-splice claim was assessed.

No check was interrupted by the provider content filter.
