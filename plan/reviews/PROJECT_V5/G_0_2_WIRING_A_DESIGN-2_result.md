# Independent Design Review Result — Project V5 G/0/02 WIRING-A store identity

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 3 |
| P2 | 1 |

The revised `main`-qualified SQL, committed-result protocol, and persistent
generation close the namespace, `changes === 1`, and exact-release failures.
They do not close the design as a whole.

The one-shot participant guard is scoped to one capability object, while the
real managed client can replace its participant incarnation in the same
process. The design neither carries the first store binding across that
rejoin nor revokes the first runtime before a new incarnation capability may
be provisioned to another store. The filesystem capability is also backed
only by a hypothetical truthful profile, not by a named reviewed deployment
authority bound to the opened handle. Finally, the mutation plan still
contains guards that its named fixtures cannot independently kill.

This verdict **does not authorize implementation**. WIRING-A store-identity
implementation remains frozen. Operator ratification of an availability
contract is a separate gate; this review assesses that decision artifact but
does not choose either option.

## Reviewed identity and scope

- Review branch: `review/V5-G-0-02-wiring-a-design-2`
- Reviewed HEAD: `10e0d90e03fad9f8b89795bb9643cdf763aaac0d`
- Normative design commit:
  `ae347236043c1aae069638e33e15339518d23d7f`
- Design submission commit:
  `10e0d90e03fad9f8b89795bb9643cdf763aaac0d`
- Trial 1 design result:
  `378eb153e959aefccfd0bbafd15694216b6931bc`
- Trial 3 implementation result: `75676bf`

The candidate range after the Trial 1 design result changes exactly the
normative design, the Trial 2 submission, and the human-decision artifact.
It changes no source, test, migration, policy, or plan sheet. The pre-existing
untracked `gateway/node_modules` entry was left untouched.

## Adjudication of the Trial 1 findings

### P1 — `main` anchoring and committed results: closed in the mechanism

The revised owner statements are anchored to
`main.coordination_consumer_runtime_owners`
(`02-DESIGN-store-identity.md:297-311,423-435,467-473`). The design also
accounts for the repository's real schema resolution rather than equating
same-handle construction with same-schema construction: it identifies the
currently unqualified consumer statements and requires the consumer and ACK
repository owners to issue opaque `main`-binding attestations before a sealed
binding exists (`:313-334`). This is necessary; the current repository really
does use unqualified names, for example
`sqlite_coordination_consumer_repo.js:818-905`.

The owner port rejects an ambient transaction before DML, retains the
candidate inside the synchronous transaction wrapper, waits for wrapper
commit/return, verifies `database.inTransaction === false`, and only then
validates and returns the outcome (`02-DESIGN-store-identity.md:146-163,
408-418`). The installed adapter supports this premise:
`database.inTransaction` is a direct `sqlite3_get_autocommit` projection, and
its wrapper executes `COMMIT`/`RELEASE` before returning the callback result.

I walked both namespace counterexamples with the installed adapter:

- With a same-named TEMP owner table on each of two handles, the qualified
  claims produced one `claimed` and one `owned`; `main` contained one row and
  both TEMP tables remained empty. The TEMP shadow is caught by the
  `main`-qualified migration/schema checks, owner DML, and repository DML.
- With the owner table present only in an attached database, preparing the
  qualified claim failed with
  `no such table: main.coordination_consumer_runtime_owners`; the attached
  table remained empty. The attached shadow is caught first by the
  `main`-qualified admission checks and, independently, cannot receive the
  qualified owner DML.

There is a verification-matrix defect for the migration qualifier, recorded
below, but it does not make the pristine `main`-qualified SQL itself false.

### P1 — `changes === 1`: closed, not merely restated

The claim uses an exact `RETURNING` row, classifies the no-row case by reading
the exact `main` row in the same transaction, and has no branch on `changes`
(`02-DESIGN-store-identity.md:408-455`). More importantly, success cannot
cross the port until the trusted synchronous wrapper has committed and the
post-autocommit check has passed.

In an ambient `BEGIN IMMEDIATE`, `better-sqlite3` nests its transaction wrapper
with a SAVEPOINT. Without the preguard, a local claim candidate can therefore
be produced while the outer transaction remains open; another handle sees no
row and rollback removes it. The pristine preguard rejects before that DML,
and the postguard prevents a candidate from crossing if nesting somehow
occurs. This establishes commit rather than giving a more careful name to a
statement-local change count.

### P1 — complete wrong-store binding and scope collision: not closed

The design closes the original same-object case only for one capability
object: one `D` is consumed in a process-local `WeakSet`/`WeakMap`
(`02-DESIGN-store-identity.md:336-359`), and the section 9.2 fixture offers
that same `D` to stores A and B (`:792-805`).

That is narrower than the real managed-client lifecycle and narrower than the
design's own premise. The design issues one `D` per participant incarnation
(`:536-539`) and explicitly permits distinct incarnation capabilities to own
equal scope text in different stores (`:108-110,135-136,605-608`). The real
managed client can lose its lease, register a new participant in the same
process, install the new credentials, and return to `ready`
(`coordination_client.js:551-588,590-607`). Its managed operations then use
the current incarnation's credentials (`:756-781`).

The unclosed path is:

1. incarnation `D1` provisions store A and runtime A starts;
2. the managed client loses its lease and rejoins as a new participant while
   runtime A is stopping, settling, or still able to call the same managed
   operations;
3. the lifecycle issues the design-required `D2` for that new incarnation;
4. `D2` is unconsumed, so the described guard permits it to provision complete
   store B; and
5. A and B each commit their own same-scope owner row, so runtime B can start
   without any authority visible to store A.

Nothing requires D1's runtime and repository work to be irreversibly retired
before D2 is issuable, and nothing binds all successive incarnations of one
managed-client lineage to A. This matters here because the WIRING sheet
expressly distinguishes a retained participant from lease-loss
re-registration and requires a fail-closed new-participant disposition
(`G/0/02.md:92-105,258-264`).

The correction must bind the durable store once to the managed-client
lineage, not merely once to each incarnation object, or must prove and enforce
that the old provision is revoked and all old work has settled before a new
incarnation capability can be issued or paired. The RED must start runtime A,
force real managed-client rejoin from D1 to D2, and attempt complete store B
before A's retirement. The existing same-D test does not cover this path.

### P1 — exact release fencing: closed

Random ownership tokens are removed. The row persists through release,
generation advances only from released `g` to `g + 1`, maximum generation
fails closed, and release matches exact `(scope_id, generation, 'owned')`
(`02-DESIGN-store-identity.md:366-404,461-491`).

I forced the relevant sequence: claim generation 1, commit release, claim
generation 2, and replay release for generation 1. The replay returned no row
and an independent handle still observed generation 2 as `owned`. The result
has no probabilistic premise and is unchanged if every RNG returns identical
bytes. Restore or generation rollback remains outside normal operation and
requires the global maintenance boundary stated in section 8.2.

### P1 — unsupported-filesystem admission: not grounded yet

The design now acknowledges the real boundary: JavaScript cannot infer
locking support, and correctness is conditional on an external deployment
authority (`02-DESIGN-store-identity.md:247-272,540-548,731-739`). That is an
honest premise, but the candidate does not identify an actual authority that
can issue the proposed capability.

There is no named reviewed SQLite deployment profile, issuer artifact,
storage-class identity, or enforcement point in the candidate or repository.
The existing production configuration accepts an arbitrary absolute
`AGENTS_STATE_DB` path (`config.js:136`; `config_paths.test.js:25-31`), and
state bootstrap opens that path directly (`state.js:70-75`). A module-private
brand proves only that some issuer minted an object; it does not prove that
the exact handle was opened on the profile's tested storage class. The design
itself makes a “truthful” profile an external premise, and section 9.6 assumes
that a generic network/custom-VFS fixture simply has no capability
(`02-DESIGN-store-identity.md:872-888`). It does not test that a genuine
capability cannot be carried through the configured bootstrap to an
out-of-profile handle.

The Trial 1 correction allowed a closed allowlisted deployment profile
enforced outside the runtime. To use that option, the design must name the
reviewed profile and its issuer/enforcement locus, bind capability issuance to
the exact bootstrap/volume rather than to a transferable profile brand, and
add a directed valid-capability/wrong-storage-origin rejection. Alternatively,
it must keep every production profile unsupported until a separate,
explicitly gated profile artifact exists. Calling a future profile truthful is
not itself the required authority.

### P1 — verification plan falsifiability: not closed

I traced the advertised mutations against their named fixtures rather than
accepting the closure map. Four sound examples and four material gaps are:

| Named guard | Independent trace | Ruling |
|---|---|---|
| Owner DML targets `main` (`:915`) | Removing `main.` lets each per-handle TEMP table receive its own claim; the TEMP/main counts fail directly. | Sound isolation |
| Claim ambient-transaction preguard (`:920`) | The adapter uses a SAVEPOINT in an ambient transaction. Removing only the preguard issues the UPSERT; the trace assertion fails even though the intact postguard still withholds success. | Sound isolation |
| Scope uniqueness (`:926`) | Removing `PRIMARY KEY` leaves the targetless UPSERT valid; two raw equal-scope inserts both succeeded in the disposable probe. | Sound isolation |
| Persistent generation advance (`:930`) | Holding generation at `g` makes the named delayed release for `g` match the replacement. | Sound isolation |
| Owner migration check targets `main` (`:916`) | With normal `main.schema_migrations` present, an unqualified lookup still resolves to `main`, not the attached table. If `main` lacks the owner table as the named “attached-only migration/table” fixture requires, the intact main-qualified schema-manifest check rejects it anyway. | Survivor; a different guard preserves GREEN |
| Claim commit-before-return (`:921`) | The synchronous adapter executes `COMMIT`/`RELEASE` before its wrapper returns. Returning from its callback does not cross the owner port. Producing an uncommitted port result requires bypassing the wrapper and normally the post-autocommit guard too. | Not an independent mutation as specified |
| Release commit-before-return (`:924`) | The same synchronous ordering applies; an early callback return still waits for wrapper commit, while an open outer transaction is caught by the separate postguard. | Not an independent mutation as specified |
| One-shot participant capability (`:935`) | Reusing the identical D is caught, but D1-to-D2 rejoin is declared legal by the capability guard and is absent from the fixture. | Kills the narrow mutant, not the theorem counterexample |

The migration defect is concrete. An unqualified migration lookup can fall
through to an attached `schema_migrations` table only when the same-named
TEMP/main table is absent. In the matrix's attached-only owner fixture, the
still-qualified main schema manifest then sees no owner table and rejects
admission. Conversely, keeping a correct main owner table to isolate the
migration record is no longer the named attached-only table fixture.

The profile rows have the same proof gap at a different boundary: missing and
forged brands test brand integrity, not whether the real issuer bound a valid
brand to the exact tested storage origin.

The plan therefore cannot satisfy its own “every mutation applied alone” and
“zero survivors” gate (`:907-953`). This remains fatal independently of the
other P1 findings. Required correction is to give migration qualification a
fixture with a correct main owner schema but only a shadow migration record;
replace the impossible commit-order mutants with one independently mutable
commit witness/transaction abstraction whose removal is not caught by the
postguard; add the D1-to-D2 managed-rejoin case; and test genuine
profile-to-store-origin binding.

### P2 — stale-owner availability decision: mechanism honest, escalation incomplete

The design itself is clear that active state never expires, no clear/delete/
reset/takeover API exists, manual deletion is unsafe, and future maintenance
requires enforced global quiescence plus generation-preserving advancement
(`02-DESIGN-store-identity.md:679-729`). That closes the unsafe cleanup prose
from Trial 1.

The escalation states the central safety/availability choice fairly: weak
liveness signals cannot exclude a paused process; Option 1 can be unavailable
indefinitely; Option 2 must fence a durable epoch through receive, handler
effects, repositories, ACK, and reconciliation. I do not choose between them.

It is not complete enough for informed ratification:

- Option 1 describes indefinite outage after crash, backup, or restore
  (`G_0_2_WIRING_A_DESIGN_to_check_by_human.md:23-39`), but the design also
  strands an active row when commit succeeds and later validation fails
  (`02-DESIGN-store-identity.md:160-163`), or when initialization compensation
  or release fails (`:488-491`). Generation exhaustion is another permanent
  closed state (`:739`). These are not all crash cases and materially broaden
  the availability cost.
- A restored released-state snapshot can roll generation backward; the
  design's global-quiescence and preserve/advance rule correctly covers any
  restore (`:695-711`), but the escalation highlights only active-row restore.
  The operator should be told that a seemingly clean released snapshot is not
  an online recovery shortcut.
- “Facts that both options must preserve” says the sibling ACK repository port
  remains frozen and out of the decision
  (`...to_check_by_human.md:12-21`), while Option 2 explicitly authorizes epoch
  fencing through ACK repository transitions and prices re-review of accepted
  boundaries (`:41-58`). The artifact must distinguish preserving accepted
  behavior from freezing the port/contract; Option 2 cannot honestly promise
  the latter before its epoch design exists.

The escalation is directionally honest, and Option 2's cross-component cost
is not understated, but the omissions above make Option 1 look narrower and
rarer than the design's own failure disposition. The artifact should be
corrected before asking the operator to ratify either contract.

### P2 — loser result versus busy disposition: closed

`STORE_OWNED` is returned only after the exact committed active row is
observed. Busy, ambiguity, malformed results, exhaustion, and uncertain commit
return a distinct closed store failure and create no work
(`02-DESIGN-store-identity.md:126-140,443-455,629-654`). The concurrency gate
also requires a post-commit retry to observe `STORE_OWNED`. This resolves the
Trial 1 contradiction.

## Contention walkthrough

| Scenario | Where it lands |
|---|---|
| Two runtimes race one scope in one admitted store | Immediate transactions and the main primary key serialize them. One commits `claimed`; the other observes `owned` or fails closed busy before creating work. |
| Acquire while the prior owner is stopping | The row remains `owned` until consumer, reconciler, handlers, timers, and managed operations settle and exact release commits. A same-store acquire is `owned`/busy; only the later acquire advances to `g + 1`. |
| Same process, two handles to one store | Both handles address the same main row. TEMP tables do not redirect the claim. The disposable two-handle probe produced one claimant and one owner. |
| Two processes, one store | SQLite/VFS serialization is the authority, conditional on the missing concrete deployment profile. A disposable eight-process race produced exactly `1 claimed / 7 owned / 0 errors`. |
| Busy timeout during claim | No permission is inferred. A held immediate transaction made the competing claim return `SQLITE_BUSY` with `inTransaction === false`; no runtime work was created. |
| Claim errors after writing | A throw before wrapper commit rolls back; the disposable forced-after-write throw left no row. If commit succeeded and only later validation fails, no work starts and the committed active row blocks later starts—safe but potentially indefinitely unavailable. |
| Release arrives late after replacement | Release for `g` matches neither released `g` nor owned `g + 1`; the replacement remains owned. |
| Same managed client rejoins, then provisions another store | **P1:** D1/A and D2/B are distinct capability objects, so neither store sees the other row and both can claim. No required retirement/fence joins the two incarnations. |

Ordinary reads or locks on unrelated store U cannot substitute U for S in the
revised owner SQL because there is no identity-selection observation and all
owner statements target the supplied capability's `main`.

## What I did and did not verify

I read the Trial 1 result, revised normative design, closure map, escalation,
Trial 3 result, WIRING sheet, repository plan instructions, current managed
client lifecycle, current state bootstrap/migration loader, current consumer
repository SQL, and the installed adapter transaction implementation. I
inspected the exact candidate pathset and commit lineage.

Using disposable databases under `/tmp` with `better-sqlite3` 11.10.0 /
SQLite 3.49.2, I exercised main-qualified TEMP and attached shadows, an
ambient transaction and rollback, independent commit visibility, persistent
generation and delayed release, targetless UPSERT without a primary key,
busy timeout, rollback after a forced post-write error, same-process handles,
and an eight-process same-store race. The disposable data was removed.

I traced eight named mutation guards, including the four sound directed guards
and the migration/commit/provisioning/profile failures above. There is no
implementation of this design to mutate, so I did not claim executable
mutation counts.

I did not implement or change source, tests, the design, a plan sheet,
migration, policy, or the human-decision artifact; run aggregate CI; use a
live Redis or MCP service; execute on macOS or Windows; exercise a real
network/custom VFS; approve a deployment profile; choose an operator option;
integrate; promote; release; push; or use sub-agents. Those omissions do not
repair the design and verification counterexamples.
