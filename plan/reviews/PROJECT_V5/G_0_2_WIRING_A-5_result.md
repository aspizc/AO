# Independent Review Result — Project V5 G/0/02 WIRING-A (Trial 5)

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

The Trial 4 P1 is closed. A provision now retains the exact opaque permit
captured when that provision was issued. Admission, retirement binding,
probing, and managed transport operations all use that retained permit rather
than resolving whichever permit is current. I reproduced both sides of the
revocation race, an in-flight D1 effect, two successive rejoins, retained D1
and D2 provisions, and a release failure after revocation. No D1 operation was
silently re-credentialed as D2.

The Trial 4 P2 is not closed. The submitted predecessor-revocation mutant does
make its named test red, but the first and only observed failure is still the
test-only `predecessorRevoked` probe. The test stops before it releases the
held handler and before it attempts the claimed genuine D1 ACK operation.
Thus row 25 of the reported 44-row matrix does not provide the independent
operational witness the handoff claims.

This is a result-only verdict. It makes no integration, promotion, release,
production-profile, crash-recovery, durable-convergence, Redis-live-recovery,
health, inventory, or complete-sheet claim.

## Reviewed identity and range

- Review branch: `review/V5-G-0-02-wiring-a-5`
- Reviewed HEAD: `d84ab45503ee810c1180a8442dfb4d60d2d5cb50`
- Trial 4 result: `dc2eabc`
- RED: `0578d43`
- GREEN: `18e33df`
- Handoff: `d84ab45`
- Normative design:
  `plan/PROJECT_V5/G/0/02-DESIGN-store-identity.md`
- Review brief:
  `/tmp/claude-1000/-home-carase-git-personal-agents-orchestrator/634bf8a6-fd7e-46d2-8516-93233703c436/scratchpad/brief-review-g2w5.md`

Before this result was written, the worktree matched the disclosed baseline:
only the pre-existing untracked `gateway/node_modules` symlink was present.

## Finding

### P2 — predecessor-revocation mutation is still killed by the test-only probe

The approved matrix requires the predecessor-revocation guard to be witnessed
by a genuinely rejected D1 operation, not by a projection of the private
revocation flag. The handoff says row 25 now reaches the held handler's ACK and
records an ACK with D2 credentials when revocation is removed.

It does not. I applied only the submitted row-25 mutation in a fresh disposable
copy:

```text
if (permitRecord) permitRecord.revoked = true;
```

became:

```text
void permitRecord;
```

The selected named fixture ran as one test and returned 0 pass / 1 fail. Its
first failure was:

```text
Expected values to be strictly deep-equal:
+ actual:   { status: "retiring", predecessorRevoked: false }
- expected: { status: "retiring", predecessorRevoked: true }
```

That assertion is at
`tests/gateway/coordination_consumer_store_ownership.test.js:1452`. The
fixture does not release the held handler until line 1457 and does not inspect
the real managed ACK inputs until line 1460. Node stops the test at the probe
assertion, so neither operation occurs in this mutant run.

The complete ownership suite under that one mutant returned 36 pass / 2 fail.
The extra red test does not repair the isolation: the row's own named fixture
still terminates at the forbidden test-only observer. This is the same
evidence class recorded in Trial 4. The pristine production revocation guard
works; this P2 is about the claimed guard-by-guard falsifiability proof.

## Issuing-permit binding ruling

**Closed. Each provision is bound to its issuing permit, not merely checked
against the current permit.**

The authority path is concrete:

1. `issueCoordinationConsumerRuntimeProvision` stores `permit` in the private
   provision record
   (`coordination_consumer_runtime_provision.js:35-54`).
2. Provision resolution passes that stored permit to
   `managedClientRuntimeAdmission` (`:79-97`).
3. Retirement binding passes the same stored permit (`:100-110`).
4. Every managed receive/ACK call passes the same stored permit
   (`:113-127`).
5. Admission looks up `permitRecords.get(exactPermit)` and additionally
   requires `record.currentPermit === exactPermit`
   (`coordination_consumer_lineage.js:284-336`). It therefore establishes both
   properties: this is the permit that issued the provision, and it remains
   the admitted current permit.
6. Managed operations look up that exact permit and reject it when revoked
   before calling the managed client (`:339-361`).

The distinction is mutation-observable. Row 29 replaces the exact-permit
lookup with `record.currentPermit`; the retained D1 provision then follows D2
and the fixture fails with:

```text
Missing expected rejection:
a D1 provision must not dynamically follow D2
```

Row 30 bypasses the provision's permit for managed operations; the held D1 ACK
then crosses the managed-client boundary with `participantId: "pt-d2"` and
D2's lease token. Both mutants pass syntax and are killed directly by their
named operational assertions.

## Permit-boundary reproductions

I extended only a disposable copy of the existing ownership suite. The four
review-owned robustness tests used the existing real managed-client,
named-profile, runtime, repository, handler, and controlled-scheduler
fixtures. They asserted public results, managed-operation inputs, repository
receipts, and owner rows. They did not inspect descriptors, locks, `/proc`,
inodes, or any other kernel internal.

The copied pristine suite returned 42 pass / 0 fail: the committed 38 tests
plus these four cases.

| Case | Independent result |
|---|---|
| Revocation lands before the held D1 handler completes | PASS. D1's exact permit was revoked while the lineage was `retiring` and the public client had installed D2 credentials. Releasing the handler produced no managed ACK input. D2 provisioning remained unavailable until D1 settlement and exact release completed. |
| D1 ACK is accepted immediately before revocation lands | PASS. The managed client synchronously captured D1's participant and lease token before the revocation turn. While that ACK was held, D2 credentials could install, but no D2 run permit could be captured. Releasing the ACK completed it with D1 credentials only; retirement and exact release then completed before D2 provisioning. |
| D2 credentials install while a D1 handler effect is in flight | PASS. A successor provision attempt returned `COORDINATION_CONSUMER_RUNTIME_CLIENT_NOT_READY`; store A remained generation 1 `owned`. After the accepted handler settled, its local D1 receipt was durably `effect_committed`, its new managed ACK was rejected before invocation, exact release committed, and only then could D2 claim generation 2. |
| D1 work completes exactly as revocation lands | PASS with a total-order boundary. If exact-permit revocation wins, the new managed operation rejects before `client.invoke`. If operation admission wins, `client.invoke` captures D1 credentials synchronously and that D1 operation remains part of retirement settlement. Neither landing side can capture D2 credentials. |
| A D1-issued provision is retained after D2 exists | PASS. Starting it returned `COORDINATION_CONSUMER_RUNTIME_LINEAGE_RETIRING`; it did not claim or change the owner row. A separately issued D2 provision claimed the next generation. |
| D1 and D2 provisions are retained across two rejoins | PASS. During D2 retirement toward D3, both old starts rejected and D3 provisioning was unavailable. After D2 retired, both old starts still rejected. Only a newly issued D3 provision was ready, and the persistent row advanced exactly to generation 3. This also exercises the per-permit retirement-handler storage. |
| Exact release fails after D1 has been revoked | PASS closed. D2 credentials installed, but release failure made the D1 stop flight reject with `COORDINATION_CONSUMER_RUNTIME_STORE_UNAVAILABLE`; the lineage became `faulted`, generation 1 remained `owned`, successor permit capture was rejected, and the old runtime returned `COORDINATION_CONSUMER_RUNTIME_LINEAGE_FAULTED`. |
| D2 permit issuance while D1 release is held | PASS. D2 public credentials existed, but successor permit capture remained unavailable until the release barrier was removed and exact release committed. |

An already accepted D1 handler may finish its local durable receipt transition
as part of the settlement that the approved design requires. That transition
uses the D1 provision's fixed store and receipt claim; it has no managed-client
credential to substitute. New managed work after revocation rejects, and a
retained D1 provision cannot start new repository work. This is distinct from
the Trial 4 defect, where a D1 ACK was actually sent with D2 credentials.

## Mutation-isolation verification

I independently applied six weighted rows, one at a time, in a disposable
copy. All changed JavaScript files passed `node --check`. The five distinct
pristine selected fixtures returned 5 pass / 0 fail. Each mutant's directed
run selected exactly one named fixture and returned 0 pass / 1 fail, with no
cancelled or skipped test.

The full ownership suite was also run under each single mutant to detect
unexpected interactions. Full-suite red counts are diagnostic only; the
isolation ruling below comes from whether the directed fixture crossed all
other intact guards and observed the named counterexample.

| Matrix row | Submitted mutation and named fixture | Directed observation | Full suite | Isolation ruling |
|---:|---|---|---:|---|
| 18 | Reset durable generation to 1 while projecting the requested generation; `successful exact release preserves generation for the next claim` | Release returned `released`; durable readback was generation 1 instead of 2 and the next claim was 2 instead of 3. No store-unavailable validator failure occurred. | 32 pass / 6 fail | **Isolated.** The projected requested generation lets the intact returned-row validator pass; durable readback catches the reset. |
| 19 | Remove exact-generation comparison while projecting the stale requested generation; `delayed release predicate leaves the replacement row owned` | Delayed release returned `released` and the generation-2 replacement row became `released` instead of remaining `owned`. | 36 pass / 2 fail | **Isolated.** The returned-row validator passes; the named durable replacement state kills the missing predicate. |
| 24 | Add and honor complete D2 store-B inputs; `D2 successor permit resolves the lineage store without a store parameter` | The mutation reached wrong-store behavior: A remained released at generation 1 instead of advancing to 2. It did not stop at lineage integrity or configured-store admission. | 36 pass / 2 fail | **Isolated and matches the approved mutation.** The mutant constructs complete B, associates the selected store with the permit and provision, and reaches B owner SQL. |
| 25 | Leave predecessor permit unrevoked; `revoked D1 runtime work rejects its ACK before D2 credentials are used` | The fixture failed first at `predecessorRevoked: false`, before releasing the handler or attempting ACK. | 36 pass / 2 fail | **Not isolated.** The test-only probe still kills the mutant; the claimed genuine rejected operation is not witnessed. |
| 29 | Resolve provision admission through the current permit; `real D1-to-D2 rejoin retires D1 before issuing a same-store D2 permit` | The D1-issued runtime followed D2, producing the explicit “Missing expected rejection” failure. | 37 pass / 1 fail | **Isolated.** The mutation preserves the stored D1 permit but deliberately ignores it at admission; no other guard rejects the start. |
| 30 | Invoke the managed client directly instead of using the provision's issued permit; `revoked D1 runtime work rejects its ACK before D2 credentials are used` | Actual ACK input contained `participantId: "pt-d2"` and `lease-pt-d2-token-...` instead of the expected empty list. | 37 pass / 1 fail | **Isolated.** The exact-permit admission remains intact; only operation-time permit use is bypassed. |

Rows 18, 19, 24, 29, and 30 close their Trial 4 isolation concerns. Row 25
does not. Consequently the handoff summary
`syntax_pass=44 killed=44 survived=0` may describe selected-test redness, but
it does not establish 44 independently witnessed guards.

## Design-conformance ruling

**Production permit behavior conforms; mutation evidence remains
non-conformant.**

| Reviewed mechanism | Ruling |
|---|---|
| Stable managed-client lineage and immutable store | Conforms. The candidate does not disturb the independently confirmed store arbitration or assignment. |
| Provision subordinate to one incarnation permit | Conforms. The exact permit is retained in the provision and used for admission, retirement, probe, and managed operations. |
| Rejoin revocation and D2 issuance ordering | Conforms in production. D1 is revoked before the retirement flight; D2 permit capture remains closed until settlement and exact release; failure faults the lineage. |
| Accepted D1 settlement | Conforms. Already accepted work may finish D1-local durable settlement; it cannot invoke a new managed operation with D2 credentials. |
| Store inheritance on successor permits | Conforms. The successor profile API accepts no store tuple and reuses the predecessor lineage's sealed main store. Complete extra B fields are ignored in pristine code. |
| Per-guard mutation proof | **Diverges.** The design requires predecessor revocation to be observed by an actual rejected D1 operation. Row 25 is still killed first by the test-only `predecessorRevoked` projection. |

Two favourable implementation elaborations are explicit rather than hidden:
retirement handlers are retained per permit, which keeps D1 and D2 provisions
separate across more than one rejoin, and the implementation splits
issuing-permit admission from issuing-permit managed-operation use into two
additional mutation rows (29 and 30). Those strengthen the literal 42-row
design matrix. They do not compensate for row 25's remaining evidence
divergence.

I found no other production divergence in the Trial 5 change range.

## Non-regression

### Closed store arbitration and concurrency

The Trial 5 range does not change migration `004`, owner SQL, the origin-owned
handle issuer, the concurrency worker, or the consumer/ACK repository
implementation. I did not re-litigate the closed store-identity theorem or
repeat Trial 4's reviewer-owned eight-process-by-50 extension.

The committed ownership suite nevertheless reran all maintained concurrency
cases and returned 38 pass / 0 fail, including:

- three independent 400-handle same-store runs;
- the independent-process contention fixture;
- all six bidirectional 400-handle target/unrelated-store direction runs;
- target markers, target-local distinct claims, one common-scope winner, and
  no wrong-store substitution.

### Ratified no-takeover semantics

Migration `004` and the owner implementation are unchanged in the Trial 5
range. The owner row still contains only scope, persistent generation, and
`owned`/`released` state. The candidate adds no delete, reset, expiry, PID,
heartbeat, liveness, clear, takeover, or restart path. The crashed-child,
active-copy, maximum-generation, failed compensation/release, and
released-snapshot cases all passed.

### Closed cancellation work

The production managed-client, service, queue, and Redis cancellation
implementations are unchanged. The runtime test edits only start the real
managed client before creating a now-permit-requiring provision. The
underlying receive, abort, cleanup, listener, queue, and settlement assertions
remain intact.

- Runtime suite: 19 pass / 0 fail.
- Managed-client suite: 17 pass / 0 fail.
- Combined client/service receive/queue receive/queue lifecycle suite:
  51 pass / 0 fail.

### Sibling consumer, SQLite, and ACK safety

The consumer repository, ACK reconciler, ACK outbox implementation and tests,
and migrations `003`/`004` are unchanged by Trial 5.

- Consumer + SQLite repository + SQLite integration:
  148 pass / 0 fail.
- ACK reconciliation + ACK outbox SQLite:
  33 pass / 0 fail.
- SQLite migrations + state initialization:
  11 pass / 0 fail.

Runtime composition still consumes the frozen ACK reconciliation repository
port and does not inspect migration `003` or sibling ACK schema.

## Gate outputs

| Gate | Result |
|---|---|
| Committed ownership suite | exit 0; 38 pass, 0 fail, 0 cancelled, 0 skipped |
| Reviewer permit robustness copy | exit 0; 42 pass, 0 fail, 0 cancelled, 0 skipped |
| Six reviewer mutation rows, syntax | 6 pass, 0 fail |
| Six reviewer directed mutant runs | each exit 1 with exactly 1 named test / 1 fail; five direct kills, row 25 probe-masked |
| Runtime | exit 0; 19 pass, 0 fail |
| Consumer + SQLite repository/integration | exit 0; 148 pass, 0 fail |
| ACK reconciliation + ACK outbox SQLite | exit 0; 33 pass, 0 fail |
| Managed client | exit 0; 17 pass, 0 fail |
| Cancellation client/service/queue aggregate | exit 0; 51 pass, 0 fail |
| SQLite migrations + state initialization | exit 0; 11 pass, 0 fail |
| `npm --prefix gateway run lint -- --no-cache` | exit 0 |
| `git diff --check dc2eabc..d84ab45` | exit 0, no output |
| `git diff --check` before verdict | exit 0, no output |

As required, full `bash scripts/ci.sh` was not run.

## What I did and did not verify

I read the review brief, Trial 4 result, Trial 5 handoff, approved design,
operator ratification, complete candidate pathset, production lineage and
provision code, managed-client rejoin lifecycle, runtime ordering, and the
changed tests. I traced exact provision/permit/store authority; reproduced
revocation-first and operation-first landing orders; held D1 handler, managed
operation, and release boundaries; retained provisions through D3; forced a
post-revocation exact-release failure; independently replayed six weighted
mutations; ran every scoped gate listed above; checked changed paths,
whitespace, public scope, and the untouched no-takeover/cancellation/sibling
surfaces.

Reviewer-added robustness cases and mutations existed only in disposable
copies under `/tmp`. They were ordinary extensions of existing suites and
asserted documented results, operation inputs, receipts, and durable rows.
They did not inspect kernel or lock internals.

I did not change source, committed tests, the design, a plan sheet, migration,
policy, runbook, deferral, or human-decision artifact; run aggregate CI; rerun
the already closed Trial 4 reviewer-owned eight-process-by-50 workload; replay
all 44 mutation rows; use a live Redis/MCP/network service or production
database/profile; exercise a custom/network VFS; implement or test crash
reclamation; integrate; promote; release; push; or use sub-agents.
