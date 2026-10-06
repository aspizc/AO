# Independent Review Result — Project V5 G/0/02 WIRING-A (Trial 4)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 1 |

The store-backed SQLite arbitration itself closes the Trial 3
unrelated-store substitution failure. I exercised six 400-handle direction
runs with the target handles split across eight independent claimant
processes while a ninth process performed ordinary reads against the
unrelated store. Every run had exactly one common-scope winner, 399
store-owned losers, 400 successful target-local distinct-scope claims, no
marker mismatch, and no error.

The implementation is nevertheless not the approved design. A runtime
provision is bound only to the stable lineage, not to the incarnation run
permit under which it was issued. It dynamically resolves whichever permit
and participant are current. The committed suite deliberately reuses the
D1-issued provision and runtime to start D2. A reviewer-owned ordinary rejoin
case also observed accepted D1 handler work issue an ACK with D2 credentials
while the lineage still reported `retiring` and D1's permit was revoked. That
contradicts the approved incarnation-permit and retirement boundary.

The claimed mutation proof also does not meet the design's independent
per-guard requirement. Nine selected lineage, permit, and release-fence
mutants all made a named test red, but three were caught by another intact
guard or used a different mutation from the approved matrix, and the
predecessor-revocation mutation was observed only through a test probe rather
than the required rejected D1 operation.

This is a result-only verdict. It makes no integration, promotion, release,
production-profile, crash-recovery, durable-convergence, Redis-live-recovery,
health, inventory, or complete-sheet claim.

## Reviewed identity and range

- Review branch: `review/V5-G-0-02-wiring-a-4`
- Reviewed HEAD: `ca68029`
- Candidate merge base: `0952af1`
- RED: `ad942f5`
- GREEN: `89942dd`
- Handoff: `ca68029`
- Normative design: `plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md`
- Design authorization:
  `plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN-3_result.md`
- Operator decision:
  `plan/reviews/PROJECT_V5/G_0_2_WIRING_A_DESIGN_to_check_by_human.md`

Before this result was written, the worktree matched the disclosed baseline:
only the pre-existing untracked `gateway/node_modules` entry was present.

## Findings

### P1 — the runtime provision is not subordinate to one incarnation permit

The approved design requires one private run permit for each participant
incarnation and says that the runtime provisioner accepts `(L, current
permit)` (`02-DESIGN-store-identity.md:417-421`). Rejoin must revoke D1,
reject new D1 runtime operations, settle and exactly release D1, and only then
issue D2's permit (`:429-446`).

The implementation records only `mainStore`, `lineage`, and `client` in a
provision (`coordination_consumer_runtime_provision.js:34-52`). Every start
resolves that lineage's current permit dynamically
(`coordination_consumer_runtime_provision.js:76-91`;
`coordination_consumer_lineage.js:247-297`). The provision therefore has no
incarnation-permit identity to revoke.

Runtime transport closures likewise call the mutable managed client directly
(`coordination_consumer_runtime.js:390-404`), and `invoke` attaches whichever
participant credentials are current at call time
(`coordination_client.js:773-798`). The candidate's own rejoin fixture proves
the dynamic behavior by starting the same D1-created runtime again after D2
becomes current
(`coordination_consumer_store_ownership.test.js:1266-1277`).

Two ordinary robustness assertions in the disposable copy made the
divergence observable:

1. After exact D1 retirement and D2 readiness, starting the D1-issued runtime
   provision succeeded. The assertion failed with:
   `Missing expected rejection: a provision issued under D1 must not
   dynamically follow D2's permit`.
2. Rejoin was triggered while a D1 handler remained accepted. D2 credentials
   were installed, D1 remained unretired, and the lineage probe still returned
   `{ status: "retiring", predecessorRevoked: true }`. When the D1 handler
   completed, its next WIRING transport ACK carried
   `participantId: "pt-d2"`. The assertion failed with:
   `D1 runtime work used D2 credentials before D1 retirement and permit
   issuance`.

This is not merely a different internal representation. It permits a
WIRING-owned transport operation under D2 before D1 work has settled and
before D1's exact release has committed, which is the interval the approved
permit state machine explicitly closes. A correction must make the provision
and its runtime operations subordinate to the issued incarnation permit, make
revocation reject new predecessor operations, and prevent a D1 provision from
following D2 dynamically.

### P2 — the reported mutation matrix is not independently isolated

I reran nine mutations, each alone in a disposable copy. Baseline was 34 pass,
0 fail. All nine mutated JavaScript/SQL artifacts passed syntax execution and
all nine named fixtures became red, with zero survivors.

That aggregate is not the proof the approved matrix requires:

- Resetting generation to `1` during release was rejected by the intact
  returned-release-row validator as `STORE_UNAVAILABLE`; the fixture stopped
  at that exception instead of observing persisted generation reuse.
- Removing the exact-generation release predicate also reached the intact
  returned-release-row validator and failed as `STORE_UNAVAILABLE`; the
  fixture did not continue to assert that the replacement row had been
  changed to `released`.
- The claimed “incarnation permit inherits its lineage store” mutation did not
  add or honor a D2 store parameter as the design specifies. It replaced
  `permit.lineage` with a fresh object and was caught by the separate
  `permit.lineage !== lineage` integrity check before any store-selection
  behavior.
- The predecessor-revocation mutation was caught by the test-only
  `predecessorRevoked` projection. Its named fixture did not attempt the
  required new D1 runtime operation; the P1 reviewer case demonstrates why
  that operational assertion matters.

Thus “42 killed, zero survivors” overstates guard-by-guard falsifiability.
The intact implementation retains its release predicates and generation SQL,
so this is recorded as a P2 verification/evidence defect rather than a second
production P1.

## Design-conformance ruling

**KO.** The candidate follows the approved store-arbitration design except at
the incarnation-permit boundary, and that boundary is normative.

| Reviewed mechanism | Ruling | Evidence |
|---|---|---|
| Stable managed-client lineage | Conforms | One capability is registered with the real client before first registration and survives D1/D2; the store assignment is immutable. |
| Incarnation-subordinate run permit | **Diverges** | The permit exists in lineage state, but no provision captures it. Provision resolution follows `record.currentPermit`; a D1 provision starts D2. |
| Rejoin operation boundary | **Diverges** | D1 admission is marked revoked and D2 start is blocked while `retiring`, but accepted D1 work can issue a new transport call using current D2 credentials before D1 retirement. |
| Store-backed arbitration | Conforms | No store identity is derived. Claim/release transact against the store's own owner row. `sqlite_store_identity.js` is removed. |
| `main`-qualified owner and repository state | Conforms | Migration lookup, schema manifest, owner DML, all consumer/ACK repository statements, and the repository binding attestation target the exact `main` handle. |
| Committed-result protocol | Conforms | Ambient transactions reject; one private synchronous transaction abstraction mints a WeakMap-backed witness only after wrapper return; post-autocommit and exact-row checks are separate. |
| Persistent release fence | Conforms in pristine code | The row persists, replacement increments a safe integer, release matches exact scope/generation/owned state, and maximum generation fails closed. |
| Origin-bound test profile | Conforms | The named disposable issuer owns its root and handle opens and privately binds each capability to the exact handle/profile instance. No production issuer is claimed. |
| Runtime ordering | Conforms apart from the rejoin operation boundary | Work starts only after a committed claim; created work settles before exact release; failed initialization compensates exactly. |
| Non-expiring Option 1 semantics | Conforms | Active state has no liveness or expiry fields and no stale-owner reclamation path. |

## Trial 3 regression and independent-process contention

The committed ownership suite passed 34/34. Its three-by-400 and
bidirectional unrelated-reader cases use synchronous `.map()`/loop calls in
one Node process. Its separate independent-process fixture uses eight
processes and eight total handles. The handoff therefore had process
contention evidence, but not for the decisive 400-handle unrelated-activity
workload.

I extended only a disposable copy of the existing named-profile worker
fixture. For each direction-run, the profile's private launcher started:

- eight independent claimant processes;
- 50 issuer-origin handles opened by each claimant before the common release
  signal, for 400 target handles total; and
- one separate ordinary-reader process against the unrelated store.

The checks asserted only returned owner results, `main` rows, and marker
values. They did not inspect descriptors, locks, `/proc`, inode values, or
other kernel internals.

| Direction | Runs | Result per run |
|---|---:|---|
| WAL target marker `7`; rollback-journal unrelated marker `9` | 3 | 400/400 correct target markers; 400/400 target distinct claims succeeded although the same scopes were already owned in the unrelated store; common scope was 1 `claimed` and 399 `owned`; 0 errors |
| Rollback-journal target marker `9`; WAL unrelated marker `7` | 3 | 400/400 correct target markers; 400/400 target distinct claims succeeded although the same scopes were already owned in the unrelated store; common scope was 1 `claimed` and 399 `owned`; 0 errors |

Aggregate: 2,400 target handles, 2,400 successful target-local
distinct-scope claims, six common-scope winners, 2,394 common-scope losers,
zero marker mismatches, zero unrelated-row conflicts, and zero errors.
TEMP and attached owner shadows were present on a subset of handles.

**Independent-process contention was genuinely exercised.** The Trial 3
failure is not reproduced by the store-backed owner protocol.

## D1-to-D2 rejoin interleavings

| Interleaving | Independent result |
|---|---|
| Rejoin lands before D1 claim | PASS. A D2 registration callback attempted runtime start while the lineage was `retiring`. It returned `COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING`, and the owner table remained empty. |
| Rejoin lands after synchronous claim | PASS for owner ordering. Claim is synchronous and does not yield to JavaScript; the committed suite's started-D1 case exercises the other landing side and retirement owns the active cycle. |
| Rejoin during an owned receive | PASS for cancellation/release ordering. D1 admission became revoked, D2 had no permit while work was held, store B remained untouched, and release remained behind work settlement. |
| Rejoin during an accepted D1 handler | **FAIL.** After D2 credentials were installed, the D1 handler's subsequent ACK used D2 credentials while D1 was still `retiring`. |
| Rejoin during exact release | PASS. With the release barrier held, D2 had no permit; only committed release and D1 retirement allowed the next ready state. |
| Rejoin after failed exact release | PASS closed. A reviewer variant failed the owner release itself, retained the row as `owned`, faulted the lineage, issued no D2 permit, and made later start return `LINEAGE_FAULTED`. |
| D1-issued provision after successful retirement | **FAIL.** It dynamically followed D2 and started, rather than remaining subordinate to revoked D1 authority. |

The row and settlement ordering are sound, but the permit/operation authority
ordering is not the approved design.

## Ratified Option 1 semantics

**OK.**

- Migration `004` stores only scope, persistent generation, and
  `owned`/`released`; it has no PID, timestamp, heartbeat, TTL, or liveness
  field.
- Pristine owner code has no delete/reset/expiry/takeover path. Graceful
  release updates state and preserves generation.
- The named test profile exposes no owner clear or takeover method. Its
  `probe*` helpers are test-only state/admission observations, not stale-owner
  liveness or reclamation authority, and they are not exported from the public
  coordination module.
- The crashed-child case and an active-state backup both remained blocked.
- The released-snapshot characterization preserved the older generation and
  demonstrates why it cannot be restored online.
- `docs/coordination-bus.md:856-884`, the WIRING sheet, and
  `plan/PROJECT_V5/DEFERRED.md` accurately state indefinite crash and
  non-crash blocking, prohibit online restore/takeover, and register the
  end-to-end epoch work under part B. They do not claim implementation,
  automatic restart, or crash recovery.

## Preserved cancellation work

**OK.** The accepted cancellation test bodies have no candidate diff; the
runtime-suite changes end before those cases. The independent gates passed:

- runtime: 19 pass;
- managed client: 17 pass;
- combined client/service receive/queue receive/queue lifecycle: 51 pass.

Those cases retain queued receive settlement without disturbing the unrelated
blocking operation, cancellable participant lookup, already-aborted enqueue,
listener replacement/removal, pending-work cleanup on drain/rejection/close,
and idempotent stop.

## Sibling safety

**OK.**

- The consumer SQLite repository delta mechanically replaces the removed
  identity attestation with an exact-main binding and qualifies all 50 durable
  consumer/ACK table references with `main.`. No repository operation,
  branch, DTO, claim rule, or error disposition was otherwise weakened.
- The ACK-outbox test delta is six expectation substitutions that recognize
  `main.coordination_consumer_ack_intents`; no assertion or workload was
  removed.
- `coordination_ack_reconciler.js` is unchanged, and runtime composition uses
  only its frozen eight-operation repository port at lines 220-232.
- Migration `004` is independent of migration `003` and the ACK schema.

Independent sibling gates:

| Suite | Result |
|---|---|
| consumer | 41 pass, 0 fail |
| consumer SQLite repository | 100 pass, 0 fail |
| consumer SQLite integration | 7 pass, 0 fail |
| ACK reconciliation | 19 pass, 0 fail |
| ACK outbox SQLite | 14 pass, 0 fail |

## Independent mutation reruns

All mutations ran alone in a newly created disposable copy. The pristine
ownership baseline was 34 pass, 0 fail. JavaScript mutations passed
`node --check`; the SQL mutation subset used here required no syntax change.

| Guard rerun | Named fixture result | Isolation ruling |
|---|---|---|
| Persistent generation advance | 0 pass / 1 fail | Direct: replacement returned generation `1` instead of `2`. |
| No generation reset on release | 0 pass / 1 fail | **Not isolated:** exact returned-release validation threw `STORE_UNAVAILABLE` before the fixture observed generation reuse. |
| Exact-generation release predicate | 0 pass / 1 fail | **Not isolated:** exact returned-release validation threw `STORE_UNAVAILABLE`; the fixture did not assert the resulting durable replacement-row change. |
| One lineage per real managed client | 0 pass / 1 fail | Direct: the complete wrong-store provision no longer threw. |
| Immutable lineage store assignment | 0 pass / 1 fail | Direct: the second assignment no longer threw. |
| Incarnation permit inherits lineage store | 0 pass / 1 fail | **Wrong isolation:** the mutation forged `permit.lineage` and was caught by lineage integrity, not by the design's D2 store-parameter counterexample. |
| Rejoin revokes predecessor admission | 0 pass / 1 fail | **Incomplete isolation:** only the test probe's revoked boolean failed; no new D1 operation was attempted. |
| Rejoin retirement before next permit | 0 pass / 1 fail | Direct: D2 became ready while D1 retirement was held. |
| Rejoin failure faults lineage | 0 pass / 1 fail | Direct: the lineage failed to enter `faulted`. |

Summary:
`baseline=34/0 syntax_pass=9 killed=9 survived=0`, with five directly isolated
guards and four evidence defects described above.

## Gate outputs

| Gate | Result |
|---|---|
| ownership suite | exit 0; 34 pass, 0 fail, 0 cancelled, 0 skipped |
| reviewer independent-process six-by-400 bidirectional workload | exit 0; 1 outer test pass; all six inner runs met 1/399/400/0 assertions |
| reviewer pre-claim rejoin boundary | exit 0; 1 pass |
| reviewer failed exact-release rejoin | exit 0; 1 pass |
| reviewer incarnation-permit conformance cases | exit 1 as finding evidence; 0 pass, 2 fail |
| runtime | exit 0; 19 pass, 0 fail |
| consumer | exit 0; 41 pass, 0 fail |
| consumer SQLite repository | exit 0; 100 pass, 0 fail |
| consumer SQLite integration | exit 0; 7 pass, 0 fail |
| ACK reconciliation | exit 0; 19 pass, 0 fail |
| ACK outbox SQLite | exit 0; 14 pass, 0 fail |
| managed client | exit 0; 17 pass, 0 fail |
| cancellation/client/service/queue aggregate | exit 0; 51 pass, 0 fail |
| SQLite migrations + state initialization | exit 0; 11 pass, 0 fail |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check 0952af1..ca68029` | exit 0, no output |
| `git diff --check` with verdict | exit 0, no output |

As required, full `bash scripts/ci.sh` was not run.

## Scope ruling

The candidate adds no production profile, automatic runtime bootstrap,
health/inventory composition, `coordination.status` expansion, migration
`003` dependency, crash reclamation, durable convergence, or Redis-live
recovery. The production coordination/status paths are unchanged. No weaker
object, pathname, inode, descriptor, content, PID, TTL, or random-token
identity fallback remains.

## What I did and did not verify

I read the approved design, authorization, operator ratification, Trial 4
handoff, and Trial 3 KO in the required order. I inspected every changed
production path and the test changes; mapped the lineage, permit, store,
owner transaction, repository binding, release fence, profile origin, runtime
ordering, and non-expiring semantics; ran the committed ownership and all
named scoped gates; ran a genuine independent-process six-by-400
bidirectional workload; exercised rejoin at the pre-claim, owned-receive,
accepted-handler, release-barrier, and failed-release intervals; reran nine
selected mutations; checked sibling diffs and suites; checked scope, lint, and
whitespace.

Reviewer-added robustness cases and mutations existed only in disposable
copies under `/tmp`. They asserted documented returned values and durable
rows and did not inspect kernel internals.

I did not change source, committed tests, design, sheet, migration, policy,
runbook, deferral, or sibling implementation; run aggregate CI; use a live
Redis/MCP/network service; exercise a production profile or custom/network
VFS; implement or test crash reclamation; integrate; promote; release; push;
or use sub-agents.
