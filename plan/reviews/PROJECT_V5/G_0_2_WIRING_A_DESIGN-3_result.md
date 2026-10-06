# Independent Design Review Result — Project V5 G/0/02 WIRING-A store identity

## Verdict

**reviewed_OK**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |

Design Trial 3 closes the three remaining P1 findings and the remaining P2
finding from Design Trial 2. One stable managed-client lineage owns one
immutable store assignment across D1, D2, and later incarnations; D2 receives
no WIRING-A run permit until D1 admission is revoked, all D1 work is settled,
exact release commits, and D1 is retired. The named test profile now binds a
capability to the exact handle opened by its origin-owning issuer, while every
production profile remains explicitly unsupported. The four required
falsifiability corrections are independently killable, and the availability
addendum states the full ratified Option 1 cost.

This verdict **authorizes implementation of the reviewed WIRING-A
store-identity design**. It unfreezes implementation subject to the design's
RED-first verification plan and does not authorize a production deployment
profile, crash recovery, automatic takeover, integration, promotion, or
release.

## Reviewed identity and scope

- Review branch: `review/V5-G-0-02-wiring-a-design-3`
- Reviewed HEAD: `93a9bdf91fb8f701590d5fa13008e2341316c653`
- Normative design commit:
  `6e32720cd7e8cd7a2ae9d3421396a1ad9d3ac241`
- Design submission commit:
  `93a9bdf91fb8f701590d5fa13008e2341316c653`
- Design Trial 2 result:
  `54d0c0d0f8c5008af374c7d6ffde32fcf97911d4`

The candidate range after the Trial 2 result changes only the normative
design, operator-facing documentation, the WIRING sheet, the deferral
register, the appended human-decision record, and the Trial 3 review
submission. It changes no source, test, migration, or policy. The
pre-existing untracked `gateway/node_modules` entry was left untouched.

## Rejoin interleaving walkthrough

The relevant authorities are separate and cumulative:

- `L` is created once with the real managed-client object and survives every
  participant incarnation (`02-DESIGN-store-identity.md:90-119`).
- `L` accepts one immutable sealed-store assignment; no incarnation API
  accepts a store, and every run permit resolves that assignment
  (`:107-118,400-425`).
- D2 permit issuance is downstream of D1 revocation, work settlement, exact
  release, and irreversible retirement (`:427-453`).
- Claim and release use synchronous `better-sqlite3` transactions without
  returning control inside the transaction (`:499-517,560-591`).

I walked the required interleavings as follows.

| Interleaving | Independent trace and landing |
|---|---|
| Rejoin reaches the process before D1 claim | Revocation makes the D1 permit invalid and marks `L` retiring. Runtime admission/readiness fails before owner SQL. D2 still has no permit, and B cannot be supplied because neither incarnation provisioning nor permit issuance accepts a store. |
| Lease loss occurs while D1 claim is executing | The claim is a synchronous, non-yielding transaction on the same JavaScript process. The managed-client rejoin transition cannot mutate `L` inside that call; it lands on one side of the claim. If it lands before entry, the prior row applies. If it lands after committed claim/start registration, D1 is the existing runtime joined by the retirement flight. D1 is cancelled and settled before its exact generation is released. A post-commit validation failure creates no work and either compensates exactly or faults `L`; it cannot issue D2. |
| Rejoin during an owned D1 operation | The supervisor atomically revokes D1 admission before a D2 permit can exist. New D1 runtime operations reject; already accepted consumer, reconciler, handler, timer, and managed-operation work remains part of settlement. Installing D2 transport credentials for other accepted uses does not create a WIRING-A permit. While an accepted D1 operation is held, D2/A and D2/B starts both fail before owner SQL. After settlement, exact release commits in A, D1 is retired, and only then may D2 receive an A-resolving permit and claim the next generation. |
| Rejoin during D1 release | Runtime stop has one idempotent stop flight, and release itself is synchronous. The D2 permit remains withheld while that flight and its committed-result validation are pending. A successful exact release permits retirement and then D2/A; zero rows, an error, an open/uncertain transaction, or invalid committed result faults `L` and issues no D2 permit. No second release flight can race the first. |
| Rejoin after failed or uncertain release | `L` is permanently `faulted`, retains A as its assignment, and issues no D2 permit even if the public client is ready as D2. If A remains owned, its row is an additional durable barrier. If release committed but its result is uncertain, the lineage fault still prevents replacement. B remains unofferable. |

None of these paths admits two live runtimes over one store or binds one
lineage to a wrong store. The critical ordering is not inferred from the
eventual owner row: permit issuance and store effects are themselves required
observations in the D1-to-D2 RED (`:932-963`).

## Profile-to-store-origin ruling

**Closed.** The design does not treat presentation of a well-formed profile
object as evidence.

The only admitted profile is the internal test-only
`sqlite-disposable-local-test-v1`. Its issuer creates and exclusively controls
the disposable root, opens the handle itself, and records the exact
`(capability, handle, profile-instance)` tuple in module-private state
(`02-DESIGN-store-identity.md:286-304`). Bootstrap and store binding revalidate
that tuple (`:336-357`). A plain, copied, or cross-instance value has no private
record. A genuine capability issued with handle A fails when paired with
wrong-origin handle B or even with a separately opened handle to A's file
(`:306-321,1026-1052`).

That rejection is a provenance check over a tuple the issuer created, not a
pathname, inode, lock-delta, or content inference. The issuer-owned-open
mutation is separately observable: allowing the issuer to accept a
caller-selected path/handle causes an otherwise valid wrong-origin store to
obtain a genuine capability. The exact-handle guard cannot mask that mutant
because the mutated issuer co-issues the capability with the wrong handle.

The generic `AGENTS_STATE_DB` bootstrap, arbitrary caller handles, generic
platform paths, network/custom VFS handles, and every production profile stay
fixed unsupported. This approval therefore does not approve or imply a
production storage profile.

## Guard-by-guard falsifiability check

I traced the four corrections required by the Trial 2 result and four further
guards from the mutation matrix. Each mutation below is syntactically
meaningful, is applied alone by the plan, and reddens its named directed
fixture rather than being preserved by a different intact guard.

| Guard traced | Why its named mutation is isolated and killed |
|---|---|
| **Owner migration check targets main** | The fixture leaves the exact correct owner table/schema in `main`, removes only `main.schema_migrations`, and places the exact migration id in TEMP or an attached ledger (`:891-897`). The independent main schema-manifest guard therefore passes. Removing only `main.` from the migration lookup resolves the shadow ledger and admits it, directly reddening this fixture. |
| **Committed transaction witness** | The fault executor supplies exact-looking raw claim and release candidates without invoking `CommittedOwnerTransaction`, while the database remains in autocommit (`:911-915`). The intact post-autocommit guard therefore passes. Only accepting the unwitnessed candidate lets it escape; conversely, postguard mutants retain a registered witness. |
| **One lineage per real managed client** | The real-client fixture starts D1/A, forces lease-loss re-registration to D2, holds accepted D1 work and release independently, and attempts D2/B before retirement (`:932-963`). Minting a replacement lineage for D2 makes the otherwise prohibited B assignment/permit or B SQL observable; A's owner row cannot mask it because B is a distinct complete store. |
| **Origin capability binds exact handle** | The fixture uses a genuine capability A, not a forged brand, and pairs it with complete SQL-capable wrong-origin B and a separately opened same-file handle (`:1028-1037`). Accepting a genuine capability with any handle makes admission succeed; downstream schema failure cannot mask it. |
| **Owner DML targets main** | Admission succeeds against correct `main`, after which each handle has its own same-named TEMP owner table. Removing `main.` from only the claim UPSERT sends the two claims to different TEMP tables, producing two winners or a wrong main/TEMP count (`:884-887,1086`). |
| **Scope uniqueness** | Removing `PRIMARY KEY` leaves the targetless UPSERT syntactically valid. The directed fixture performs two raw equal-scope main inserts, bypassing owner admission and UPSERT preparation; only the missing uniqueness constraint lets both succeed (`:1000-1002,1096,1129-1131`). |
| **Persistent generation advance** | Holding replacement generation at `g` changes neither schema nor row validation. The forced-equal-RNG sequence then replays release `g`, which matches and releases the replacement; the pristine `g + 1` sequence does not (`:965-979,1102`). |
| **Owned result requires an observed active row** | Mapping busy, absent, or unclassified outcomes to `STORE_OWNED` changes only the disposition. The SQL-capable busy/unclassified fixture receives the inaccurate owner code directly; no later start guard or schema guard can turn that assertion green (`:542-553,1101`). |

These eight traces close the earlier impossible commit-order mutants and the
masked migration/profile/rejoin fixtures. I did not infer executable mutation
counts: there is no implementation of this design yet, and the design
correctly requires the implementation review to record pristine/mutated
counts, syntax outcomes, first failures, and zero survivors
(`:1078-1082,1142-1152`).

## Escalation completeness correction

**Complete for the ratified Option 1 basis.** The appended correction plainly
states all previously omitted permanent-block cases:

- committed claim followed by witness/result validation failure;
- initialization failure followed by failed or uncertain compensation;
- orderly settlement followed by failed or uncertain exact release; and
- released generation at the maximum exact integer.

It expressly says the last four need no crash and remain permanent closed
states with no retry/reclaim inference
(`G_0_2_WIRING_A_DESIGN_to_check_by_human.md:146-161`).

The addendum also states that a restored `released` snapshot can roll the
persistent generation backward, that active and released restore/copy/move
paths require enforced global quiescence plus generation preservation and
advancement, and that part A implements no such maintenance transition
(`:163-169`). It corrects the ACK wording by limiting the frozen-port promise
to Option 1/part A and acknowledging that a future Option 2 may require a
separately authorized ACK-contract change (`:171-177`).

The same limitations are present in the operator-facing coordination runbook,
the WIRING sheet, and the registered part-B deferral. I assessed completeness
only; I did not revisit or substitute the operator's ratified Option 1
decision.

## Regression check

The four Design Trial 2 closures remain intact:

| Accepted closure | Regression ruling |
|---|---|
| `main` anchoring and committed results | Owner DML, migration validation, schema checks, and repository-owner attestations remain `main`-bound. The new registered witness strengthens the already accepted synchronous commit/autocommit protocol and is independently testable; it does not reintroduce a statement-local result. |
| `changes === 1` genuinely removed | Claim still classifies the exact returned/observed row after commit and has no branch on `changes` (`02-DESIGN-store-identity.md:519-553`). |
| Exact release fencing | The persistent row, strictly increasing safe-integer generation, exact `(scope, generation, owned)` release predicate, exhaustion closure, and delayed-release proof are unchanged (`:459-497,560-591`). |
| Loser versus busy disposition | `STORE_OWNED` still requires an exact observed active main row; busy, ambiguity, malformed results, and exhaustion remain distinct closed failures (`:542-553,747-769`). |

The range from the independently confirmed Trial 3 implementation result
through reviewed HEAD contains no source or test change. The accepted
queue/client/service/runtime cancellation behavior is explicitly frozen in
the design, its existing implementation is untouched, and its suites are
required to rerun unchanged during implementation verification
(`:31-37,1074-1076`).

## What I did and did not verify

I read, in the mandated order, the Design Trial 2 result, the complete revised
normative design, the Trial 3 closure map, and the human-decision artifact. I
then inspected the candidate pathset and commit lineage, the real managed
client's lease-loss/re-registration lifecycle, the current synchronous runtime
start/stop lifecycle, the independently accepted cancellation result, the
operator-facing correction, WIRING sheet, and deferred register.

I independently walked the pre-claim/claim, active-operation, release, and
failed-release rejoin intervals; traced exact permit and store effects; traced
forged, cross-instance, genuine-wrong-handle, and caller-origin profile cases;
checked the four mandated falsifiability corrections plus four additional
guards; confirmed the four accepted design closures; confirmed the
cancellation implementation is untouched; and ran `git diff --check` over the
candidate range.

I did not implement or change source, tests, the design, a plan sheet,
migration, policy, runbook, deferral, or human-decision artifact; run
implementation or aggregate test suites; create an implementation mutation;
approve a production deployment profile; use a live Redis/MCP service;
exercise a real network/custom VFS; revisit the operator's availability
choice; integrate; promote; release; push; or use sub-agents. Those are outside
this result-only design adjudication.
