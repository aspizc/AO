# Independent Design Review Result — Project V5 D/0/07c Design Trial 3 (reviewer A)

## Verdict

**reviewed_KO**

The amended design closes the byte-transfer heart of reviewer B's P0-1: an
effect-then-report implementation is no longer conforming. It also restores
the frozen utility, foreground, and post-short-write dispositions, closes the
sideband/readiness/namespace inventory gaps, makes the five option sets
materially more precise, removes the redundant tmux choice from Decision 3,
and corrects the four specifically challenged proof rows.

The revision nevertheless introduces one blocking contradiction at the
active-to-revoked boundary. The universal rule applies to `terminate` and
`remove`, the conditional-operation definition requires `G == ACTIVE`, and
`V < E` suppresses the selected effect. The frozen lifecycle and the R3 proof
rows require process, tmux, and namespace retirement during or after
revocation. Thus the exact retained capabilities promised by Decisions 2–4
cannot be exercised in their intended lifecycle state without violating the
universal rule. Suppressing them violates the retirement commitments; using
them violates the active-generation condition.

This is a result-only design verdict. It authorizes no implementation,
integration, promotion, release, `D/0/07d`, port-surface change, or splice,
and it decides none of the operator questions.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 1 | The universal `G == ACTIVE` / `V < E` suppression rule contradicts revocation-time process, tmux, descriptor, and namespace retirement, making the retirement commitments in Decisions 2–4 and their proof baselines non-ratifiable. |
| P1 | 0 | None independent of the P0. |
| P2 | 0 | None. |

## Blocking finding

### P0-1 — active-generation authority suppresses the cleanup that revocation requires

The binding sentence expressly covers operations which “terminate, or
remove” and requires the expected generation to be a condition of the
effect (`07c-DESIGN-post-accept-binding.md:52-56`). The immediately following
definition makes that condition `G == ACTIVE` and permits the effect only on
equality (`:75-82`). The `E`/`V` rule then says that `V < E` commits zero
effect (`:91-99`).

That is correct for queue admission, PTY attempts, relay transfer, barriers,
capture, readiness, and provider-bearing sideband writes. It is not a
workable generation condition for teardown:

- R3 says unresolved process retirement first latches revocation and then
  preserves/rejects rather than signalling by name (`:251-259`).
- The inventory governs utility-tree, relay, and tmux retirement with R4
  (`:351-355`) and inventories namespace removal as cleanup (`:356-359`).
- Decision 2 commits the operator to tmux retirement on the retained
  connection, Decision 3A to retained process/tree signalling, and Decisions
  4A/4B to exact removal (`:382-388`).
- The proof specifications run the process/tree cases “during revocation” and
  remove tmux objects before exact retirement (`:430-435`). Namespace removal
  likewise occurs in cleanup after retirement (`:436-440`).
- The frozen parent moves to `REVOKING` before termination and requires
  capability and fd/socket/tmux retirement before ordinary completion
  settles (`plan/PROJECT_V5/D/0/07.md:479-493`).

An ordinary lifecycle robustness case exposes the contradiction:

1. accepted generation `G` is active;
2. cancel, identity drift, or component loss commits effect-side revocation
   `V`;
3. cleanup invokes an exact retained process capability, retained tmux
   connection, or exact namespace-removal capability at `E`;
4. because `V < E` and `G != ACTIVE`, the universal rule suppresses the
   effect.

If an implementation performs the retirement anyway, it violates the
binding rule. If it suppresses retirement, it violates the selected
ratification commitment and the frozen cleanup lifecycle. Performing every
destructive action before `V` is not an alternative: teardown is caused by
revocation, the parent enters `REVOKING` before termination, and several
ordered cleanup actions cannot all be the single `V`. The design defines no
`E == V` case.

Required correction: scope the active-generation conditional effect to
active workload/readiness/settlement effects, and separately define a
one-way cleanup authority for the same immutable generation while it is
`REVOKING`/`REVOKED`. That rule must say how exact destruction/removal orders
with `V`, forbid any revival or replacement target, and make the Decision
2–4 commitments and R3/R3-N proof baselines reachable.

## Ruling on reviewer B's five findings

| Design Trial 2 finding | Trial 3 ruling | Evidence |
|---|---|---|
| P0-1 — evidence-returning effect was not conditional authority | **Closed for workload effects.** | The universal rule takes expected binding plus `G`, compares before `E`, suppresses on failure, and rejects effect-then-report (`:54`). The definition excludes self-report and returns an exact committed count (`:75-82`). One generation-authority critical section orders all named workload effects and effect-side `V`; `E < V` preserves the exact committed count and `V < E` commits zero (`:83-99`). R2 repeats compare-before-effect and zero-effect suppression (`:152-158`). No relay, PTY, barrier, capture, readiness, or provider-bearing sideband option permits bytes to cross and reject afterward. The cleanup-state overbreadth is the new P0 above. |
| P0-2 — universal terminal-changed/no-transfer contradicted frozen PTY outcomes | **Closed.** | `REJECT` is now effect-level. Before `F`, utility/process mismatch is `SESSION_PORT_IDENTITY_CHANGED`, foreground mismatch is `SESSION_PORT_NOT_FOREGROUND`, and terminal identity/dimension mismatch is `SESSION_PORT_TERMINAL_CHANGED`; after an authorized prefix, the rejecting attempt adds zero bytes while the public operation is `SESSION_PORT_WRITE_ABORTED` (`:100-116`). The prompt row delegates framing, interval classification, exact partial counts, and dispositions to D/0/07b without an R2 exception (`:335-336`). |
| P1-1 — sideband, readiness, and namespace inventory gaps | **Closed.** | R1 is explicitly scoped to terminal/provider transfer and binds fd 4/5, exact `ASP1` tag/sequence, and module-private `G` (`:123-145`). Readiness is an identity- and generation-conditional retained-fd-3 transition with claim-time settlement and exact bootstrap outcomes (`:330`). The relay key, relay socket, owned runtime directory, and tmux socket each have a retained identity (`:296-306`) and a separate removal/preservation row (`:356-359`). |
| P1-2 — operator alternatives were not ratifiable; tmux was redundant | **Not fully closed.** | The option text now gives exact tuples, trust boundaries, units, counts, producer timing, custody, and narrowing semantics, and tmux retirement correctly moves under Decision 2. However, Decisions 2A/2B, 3A, 4A, and 4B promise retirement effects which the universal active-generation rule suppresses after `V`. Those rows therefore do not yet yield a viable binding strength when selected. |
| P1-3 — four proof rows were masked or used an indeterminate oracle | **The four named corrections are closed, but the complete table is not sound because of the P0.** | C1/C2 now come from the same relay process; foreground expects `NOT_FOREGROUND`; source timing is split into invalid-after and valid-before cases; and the close-frame case keeps `G` live (`:417`, `:421`, `:424-426`). The new active-generation contradiction masks the R3/R3-N cleanup rows, as detailed below. |

## Conditional-authority and committed-count walk

| Effect boundary | Conditional rather than advisory? | Ruling |
|---|---|---|
| Relay input/admission | Expected full relay tuple, accepted socket, exact bounded byte range, and live `G` are conditions of one receive/admission effect; zero bytes enter the queue under current primitives (`:331`). | Pass. |
| Queue admission/take | Immutable bytes, `G`, and provenance travel together; both admission and take occur under the generation-authority critical section (`:133-145`). | Pass. |
| PTY write | Expected full tuple and live `G` are compared before each attempt; exclusion is held through the exact write result, each short write has its own `E`, and a failed attempt writes zero (`:187-200`). | Pass. |
| PTY source | Provenance is per byte at production, mixed generations are not merged, buffered valid provenance is immutable, and later dequeue is a separate live-`G` conditional consume (`:202-221`). An unconditional read followed by a record is explicitly non-authorizing. | Pass. |
| Relay destination | Each source span is sent by one conditional attempt; a positive short send returns its exact count and its remainder gets a new `E` (`:338`). | Pass. |
| Barrier | Request send and acknowledgement receive are separate conditional effects with distinct `E_request` and `E_ack` (`:339-340`). | Pass. |
| Capture | Expected retained-server identity, geometry, history, and `G` are compared by one server operation; mismatch captures zero accepted state and malformed evidence is rejected before canonicalization (`:223-243`). | Pass. |
| Readiness | `activate(G, expectedBinding)` publishes one retained-channel candidate only at `E_ready < V`; parent claim settlement remains separate (`:330`, `:361-365`). | Pass for the intended active transition. |
| fd-5 response | Retained fd 5, tag, sequence, private channel-to-`G` binding, per-attempt ordering against `V`, and exact counts are required; incomplete private prefixes cannot settle publicly (`:345-346`). | Pass. |
| Destruction/removal | Exact object capabilities are specified, but the universal `G == ACTIVE` condition conflicts with their post-`V` lifecycle. | **KO.** |

## No-weakening comparison

I compared the complete prior and current documents, including all 159
deleted lines and 319 additions.

No previously required rejection became a warn, skip, allow, tolerate,
best-effort path, fallback, or unratified exemption:

- the old evidence-returning operation became a stricter conditional
  compare-and-effect authority;
- the old universal terminal-changed result became the more precise frozen
  cause/interval mapping, not a successful escape;
- R1's private-sideband clarification adds retained fd/tag/sequence/`G`
  authority rather than permitting an ambient channel;
- readiness gained generation ordering and exact claim outcomes;
- the PTY source gained per-byte production provenance and mixed-generation
  quarantine rules;
- namespace authority expanded from sockets to key files, sockets, and the
  runtime directory, with explicit conditional-object/custody alternatives;
- the tmux portion removed from Decision 3 is still mandatory through
  Decision 2's retained server connection and stable IDs; and
- Decisions 1B, 3B, 4C, and 5B are explicit parent-contract amendments which
  require operator ratification. They are not operative allowances in the
  unamended contract.

The prior Trial 1 closures remain present: PTY writes and PTY-source reads
have no R2 exemption, utility-group and adopted-descendant retirement remain
inventoried, and `RELAY_DATA_CLOSE` remains forbidden in favor of retained
descriptor retirement.

The blocking finding is overconstraint and lifecycle contradiction, not a
softening of an earlier REJECT.

## Per-decision ratifiability

| Option | One binding strength? | Ruling |
|---|---|---|
| 1A — full conditional relay authority | Yes. Full socket, kernel-peer, live relay process/tmux tuple, exact range/envelope, trusted external principal, `E`/`V`, suppression, and exact count are fixed. | Pass. |
| 1B — exact relay-contract narrowing | Yes. The retained connected object, handshake kernel tuple, one-use proof, historical tmux IDs, and live `G` are the complete narrowed authority; live process facets are expressly removed. | Pass. |
| 2A — retained tmux extension | Capture strength is exact, and retained-connection retirement removes the former Decision-3 redundancy. | **KO overall:** its tmux-retirement commitment has no authorized post-`V` state under the universal rule. |
| 2B — explicit capture-contract amendment | The same complete record, byte oracles, generation order, and retained connection are mandatory; sequencing stock commands is excluded. | **KO overall** for the same retirement-state contradiction. |
| 3A — retained dynamic process domain | Target membership and non-reuse strength are exact. | **KO:** the promised signal operation is normally after `V`, when the universal rule suppresses it. |
| 3B — preserve unresolved processes | Yes as a policy amendment: no numeric signal and unresolved processes may remain. | The preservation choice is precise, but the common descriptor-retirement sequence still needs an explicit cleanup-generation rule. |
| 4A — conditional-object removal | The target set and conditional `unlink`/`rmdir` strength are exact. | **KO:** exact removal is a post-revocation cleanup effect with no permitted generation state. |
| 4B — kernel-enforced exclusive custody | The custody interval, principals, and loss behavior are exact. | **KO:** custody establishes pathname identity but does not cure the active-generation prohibition on removal after `V`. |
| 4C — preserve unresolved namespace entries | Yes. Unproven entries remain and cleanup rejects without deleting a replacement. | Pass as an explicit leak-free-contract amendment. |
| 5A — full conditional PTY authority | Yes. Full tuple, trusted facility, per-byte producer class, exact counts, suppression, and `E`/`V` are fixed. | Pass. |
| 5B — exact PTY-contract narrowing | Yes. The retained PTY/channel/historical binding tuple is exhaustive and every consume/write attempt still shares `E`/`V` and reports an exact count. | Pass. |

The tmux portion of old Decision 3 is genuinely redundant once Decision 2
supplies the retained accepted-server connection: the installed tmux 3.6
manual defines server-local session and pane IDs as unique and unchanged for
their object lifetime, `kill-pane` and `kill-session` accept those IDs, and
`kill-server` is targetless. The amended design correctly moves that
mechanism into Decision 2 and forbids a public target or new connection
(`:261-269`).

No sixth operator policy choice is needed. What is missing is a binding
design rule for cleanup generation state and ordering; an operator should not
be asked to ratify around an internal contradiction.

## Full proof-row falsifiability ruling

The four rows challenged by reviewer B are corrected. The current table has
the following per-row result:

| Proof row | Ruling | Isolation/falsifiability |
|---|---|---|
| R1 retained relay endpoint | Pass. | C1 and C2 are opened by the same exact relay process, all mutable relay/tmux facets and `G` remain valid, and the test calls the descriptor-selection boundary. Only R1 selects the accepted connection object. |
| R1 retained fd-5 sideband | Pass. | Tag, sequence, payload, and `G` remain exact; only the selected channel differs, with no relay/PTY/capture effect. |
| R2 conditional relay destination | Pass, conditional on the future facility baseline. | Send-then-report crosses 25 bytes and fails the zero-wire-byte oracle; source, R1, and R4 remain valid. |
| R2/R4 effect-revocation order | Pass, conditional on the future facility baseline. | The paused live-check mutant sends only after `V`, while the `E < V` control proves the positive exact-count side. |
| R2 PTY foreground before `F` | Pass. | Only foreground changes and the exact oracle is now `SESSION_PORT_NOT_FOREGROUND` with zero PTY bytes. |
| R2 PTY identity before `F` | Pass. | One readable utility field changes with all higher-ranked causes false; the oracle is `SESSION_PORT_IDENTITY_CHANGED`. |
| R2 PTY short prefix after `F` | Pass. | The exact three-byte authorized prefix remains, the second attempt adds zero, and the one public result is `SESSION_PORT_WRITE_ABORTED`. |
| R2 PTY-source invalid production span | Pass. | The 25 bytes are explicitly produced by H after the last check; the test stops at the provenance boundary. |
| R2 PTY-source valid buffered span | Pass. | G provenance is fixed before the later change, remains labelled G, and the separate post-`V` dequeue is suppressed. |
| R2 teardown protocol write | Pass. | `G` remains live for the attempted frame, so R4 cannot mask the missing destination authority. |
| R2/R4 readiness publication | Pass, conditional on a reachable activation baseline. | Retained fd 3 and every identity remain exact; only the unlocked check-to-publication interval permits a READY candidate after `V`. |
| R2 capture geometry | Pass, conditional on the Decision-2 baseline. | Generation and all diagnostics remain valid; 121-at-capture/120-after isolates geometry inseparable from bytes. |
| R2 capture generation | Pass. | H-for-G is injected directly at record acceptance, before R4 settlement. |
| R3 utility-process-group destruction | **KO/masked.** | The test runs during revocation; the intact universal `G == ACTIVE` guard can suppress signalling before target selection is exercised. |
| R3 adopted-descendant destruction | **KO/masked.** | The same generation-state guard can reject before the PID-reuse mutation. |
| R3 relay-process destruction | **KO/masked.** | Forced termination follows endpoint loss/revocation, so the target mutant lacks a reachable conforming baseline. |
| R3 tmux-pane destruction | **KO/masked.** | Removing pane A causes/occurs during revocation; the active-generation rule may suppress `kill-pane` before `%A` versus public target is observed. |
| R3 tmux-session destruction | **KO/masked.** | The same issue masks `$A` versus public target. |
| R3 tmux-server destruction | **KO/masked.** | The same issue masks retained connection versus re-resolved socket path. |
| R3-N1 relay-key removal | **KO/masked.** | Post-revocation cleanup has no authorized generation state before the exact-file selector is tested. |
| R3-N1 relay-socket removal | **KO/masked.** | The active-generation rule can suppress removal before A-versus-B identity matters. |
| R3-N1 runtime-directory removal | **KO/masked.** | Final `rmdir` occurs after child retirement and revocation; no conforming positive removal baseline is defined. |
| R3-N1 tmux-socket removal | **KO/masked.** | The retained server is already retired, so the operation is necessarily in cleanup after `V`. |
| R3-N2 custody alternative | **KO/masked.** | Lost custody is testable, but the design first needs a generation state in which custody-authorized cleanup removal may run. |
| R4 sticky settlement | Pass. | A complete candidate is produced while G is active and injected directly only after revocation, leaving the revoked bit as the sole failed evidence. |
| R4 non-revival | Pass. | The direct state transition invokes no R1–R3 effect. |

The R3/R3-N failures are consequences of the single P0 and are not counted
again as separate P1 findings.

## Preserved-behaviour check

| Frozen behavior | Ruling |
|---|---|
| Canonicalization vector and real tmux 3.6 figures `40 -> 0`, `61 -> 24`, and `50 -> 12`, including row-end spaces | Preserved in code and prose. The canonicalizer remains downstream of complete record acceptance. The positive path remains semantically reachable after Decisions 1, 2, and 5 select compatible authority. |
| Stable `121x40` and `history-limit=401` | Preserved as `SESSION_PORT_TERMINAL_CHANGED` with no snapshot. The atomic record requires exact 120x40 and history 400. |
| Rejected binding cannot revive | Preserved by sticky R4 and its direct non-revival proof. |
| Malformed or absent history/capture evidence | Preserved fail-closed: the whole record rejects before canonicalization or settlement. |
| D/0/07b utility/foreground/partial-write behavior | Preserved by the cause-specific pre-`F` mapping, exact committed counts, post-prefix `WRITE_ABORTED`, and success only at `R`. |
| Complete cleanup/no-leak lifecycle | **Not reachable under the full-authority Decision 2–4 options until the cleanup-generation contradiction is corrected.** |

Focused inherited gates passed:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 39
pass 39
fail 0
skipped 0

node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js

tests 16
pass 16
fail 0
skipped 0
```

This host reports `tmux 3.6`. The relay gate re-established the exact
zero/24/12-byte canonical results, exact row-end spaces, 121x40 and
history-limit drift rejection, malformed/noncanonical evidence rejection,
and the current rejected-binding behavior. Those current-code results do not
resolve the design-only cleanup contradiction.

## Scope

Scope passes independently:

- design commit `55488cf1373d336df052df50177681f3138ec968`
  changes only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`;
- request commit `526703c` adds only
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-3_to_review.md`;
- candidate-range and worktree `git diff --check` passed; and
- no source, test, frozen parent, plan sheet, codec, port surface,
  adapter/service/catalog splice, provider launch, `D/0/07d`, integration,
  promotion, or release change entered the candidate.

## What I did and did not verify

Verified:

- the full review brief, complete candidate, complete Design Trial 1 result,
  both complete Design Trial 2 results, and the Trial 3 request;
- candidate/request lineage, every changed/deleted design line, changed-path
  scope, and whitespace;
- the frozen parent topology, sideband, relay authentication, readiness,
  canonicalization vector, PTY identity/foreground rules, `D`/`F`/`R`
  intervals, cause ranking, lifecycle, and leak-free acceptance criterion;
- every sentence of R1–R4, all inventory rows, all five decisions and every
  option, all current proof rows, no-weakening, preserved behavior, and scope;
- the installed tmux 3.6 ID and kill-command documentation without starting
  an ad hoc server; and
- the focused relay/capture and PTY/Darwin gates, with no failure or skip.

Not verified:

- the future relay, PTY, tmux-extension, process-domain, and conditional
  namespace facilities do not exist, so I did not implement or execute them;
- no Darwin host was available; only the deterministic Darwin seam ran;
- I did not run full `bash scripts/ci.sh`, a `D/0/07d` composition/race gate,
  live Codex/Claude providers, network behavior, integration, promotion, or
  release;
- I did not decide an operator option, alter the design/parent/sheet, or
  inspect the concurrent Trial 3 reviewer B verdict; and
- I wrote no standalone kernel, socket, or lock-internal probe.

No provider content filter interrupted a check. I used no sub-agent, started
no ad hoc tmux server, addressed no default tmux socket or `ag-*` session,
changed no source, test, design, or plan sheet, and left the pre-existing
untracked `gateway/node_modules` entry untouched.
