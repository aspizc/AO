# Review Submission — Project V5 G/0/02 WIRING-B design correction (Trial 3)

## Request state and requested verdict

Request state: **unreviewed**.

This is the immutable review request for Design Trial 3. It records no review
verdict and is not evidence that the design is correct. A fresh independent
reviewer must authenticate the candidate below and return exactly one of:

- `reviewed_OK` only if all five Trial 2 P1 findings are closed by executable,
  deterministic design and the Trial 2 survivors remain intact; or
- `reviewed_KO` with prioritized, reproducible findings if any required
  property remains ambiguous, contradictory, unowned, or untestable.

The reviewer must write a separate immutable result at
`plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-3_result.md`. That result does
not exist as part of this request.

## Exact candidate identity and lineage

- Review ID: `PROJECT_V5/G_0_2_WIRING_B_DESIGN-3`
- Stage/task: Project V5 `G/0/02`, WIRING-B, design
- Trial: 3
- Candidate commit:
  `4529fa6305661161a5da27eb68dc613c47087b6c`
- Candidate tree:
  `740b233d5d012efc5c27b011807d3ff80917bc27`
- Candidate parent:
  `e31bc714166e3b814d1c417ba4ddf1358cd3abd8`
- Candidate subject:
  `docs(coordination): correct durable epoch design (V5 G/0/02 WIRING-B Trial 3)`
- Candidate path:
  `plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`
- Candidate path SHA-256:
  `ac358660ebf72556f2fd408218ad176f427b965c15d1c8c78d7e2018a6b4ce8a`
- Parent-to-candidate scope: exactly one modified path, the candidate design
  above
- Parent-to-candidate numstat: exactly `543` insertions and `135` deletions
- Trial 2 request:
  `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_to_review.md`
- Trial 2 immutable KO/result:
  `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_DESIGN-2_result.md`
- Trial 2 request commit:
  `27c49bc93167e346347c700360786e5e85a8d4cd`
- Trial 2 result commit and direct Trial 3 parent:
  `e31bc714166e3b814d1c417ba4ddf1358cd3abd8`
- Trial 2 design candidate:
  `629366c7746fd13cdc11cb29737121e16a401edc`

The reviewer must inspect the design from the candidate object, not trust a
mutable working-tree copy. Any mismatch in commit, tree, parent, path scope,
numstat, or digest is an authentication failure and therefore a KO for this
request.

## Design-only boundary

This candidate changes a design document only. It does not claim that any
epoch feature is implemented, reviewed, integrated, promoted, or released.

| State | What is true for this request |
|---|---|
| Design authored | The Trial 3 correction is committed at the exact candidate above |
| Design reviewed | Not yet; this request remains unreviewed |
| Implementation | Not started or authorized by this request |
| Integration | Not performed or implied |
| Promotion/release | Not performed or implied |

Existing WIRING-A mechanics and the previously built receipt/ACK/outbox/runtime
owner substrate remain inputs to the design. Every durable epoch schema,
profile-specific migration route, guard, Lua transition, permit, recovery
source, release transition, mutation, and test described by the candidate is
planned work until separately implemented and reviewed.

## Orchestration and reviewer-independence disclosure

This Trial 3 design-authoring lane and this handoff used direct
operator-supervised `tmux` orchestration because the Gateway/KYA route was
unusable. The repository profile's Claude reviewer/author lane was
unavailable or failing. This is an execution-path exception disclosure, not
a substitute for review and not permission for the design author to issue a
verdict.

The Trial 3 result therefore requires a fresh independent reviewer who did not
author this correction and who independently authenticates and attacks the
candidate. Prior author checks, the Trial 2 review, and this request's closure
map may be consumed as evidence, but none may be reused as the Trial 3 verdict.

## Trial 2 work that must survive

The Trial 2 KO limited the correction contract to five P1 findings. Review
must also detect regressions in the Trial 2 design that survived:

- durable controller term and exact lost-reply/crash succession;
- drain-in-place participant identity and immutable source identity;
- non-expiring participant guards and permanent settlement proof;
- the separate unread-stream and PEL recovery branches;
- callback, observation, and replay boundaries;
- store/Redis origin binding and capability reachability;
- exact active/recovery authority claims, proof equality, and effect fencing;
- closed failure mappings, body-free diagnostics, and fail-closed ambiguity.

Removing or weakening any survivor is a Trial 3 KO even if the five direct
corrections appear present.

## Trial 2 P1 closure map and mandatory adversarial review

### P1-1 — generation 1 had no legal durable bootstrap reservation

Exact Trial 3 sections:

- `Status and boundary` → `Trial 3 correction record`
- `§2.1 Migration`, especially the legal `initializing` phase and the atomic
  owner/companion schema shape
- `§2.3 Redis epoch record`
- `§3.1 Bootstrap`
- `§3.3 Crash or forced takeover`
- `§3.4 Recovery-controller succession`
- `§7 Crash matrix`
- `§8 Failure model`
- `§10 Required tests and mutation owners`

The reviewer must establish that B1 cannot make any generation-1 Redis write
until one `BEGIN IMMEDIATE` transaction has committed both the legal
`owned,generation=1` owner row and
`initializing(1,term=1,B1,installing)` companion row. Then attack every
boundary in this exact order:

1. before and after the durable B1 reservation commit;
2. before and after the private Redis install;
3. a committed Redis install with its reply lost;
4. before and after exact Redis readback;
5. before and after SQLite confirmation to
   `recovering(1,term=1,B1,installed)`;
6. before and after private credential/recovery-permit exposure;
7. B1 expiry followed by B2 reservation and B2 expiry followed by B3
   reservation; and
8. delayed B1 and B2 commands arriving before, during, and after the newer
   term's Redis install.

Require proof that every B1/B2/B3 identity and term is durably reserved before
its Redis write; each expired predecessor becomes an `open` source in the same
term-advance transaction; SQLite is never behind an unreserved Redis
generation/term; a lower delayed term cannot replace an equal/higher term; a
lost reply resolves by exact bounded readback; and no credential or permit is
exposed before SQLite confirmation plus fresh exact Redis readback.

### P1-2 — public SEND fenced the recipient but not the sender

Exact Trial 3 sections:

- `§3.6 Release`
- `§3.9 State and authority invariants`
- `§5.1.1 Atomic public SEND endpoint guards`
- `§7 Crash matrix`
- `§8 Failure model`
- `§10 Required tests and mutation owners`

The reviewer must attack the one Lua linearization point with both guarded
endpoints, including ordinary/ordinary, ordinary/guarded, guarded/ordinary,
and guarded/guarded pairs. For each side, vary active, recovering, fencing,
releasing, released, expired, malformed, missing-epoch, wrong participant,
lower generation/term, and higher generation/term states, including delayed
calls that retained otherwise valid ordinary credentials.

Require the exact atomic order: sender guard and canonical epoch, recipient
guard and canonical epoch, dedupe lookup, equal-retry dedupe `PEXPIRE`,
capacity `XLEN`, `XADD`, dedupe `SET`, and event append. Sender must win a
dual-failure decision deterministically. Every sender or recipient guard
rejection must leave dedupe value and TTL, inbox, stream length, event output,
and audit-visible result unchanged. Service/status/client mappings must remain
closed and must not turn an endpoint rejection into lease-loss rejoin.

### P1-3 — release could strand unread stream entries

Exact Trial 3 sections:

- `§3.6 Release`
- `§3.9 State and authority invariants`
- `§5.1.1 Atomic public SEND endpoint guards`
- `§6.4 Exact PEL and unread drain branches`
- `§6.5 Recovery completion`
- `§7 Crash matrix`
- `§8 Failure model`
- `§10 Required tests and mutation owners`

The reviewer must seed each of: unread-only entries, PEL-only entries, both,
known unsettled SQLite work, malformed/missing/wrong-type Redis state, and a
fully empty source. Race inbound and outbound SEND before and after the exact
Redis `active -> releasing` epoch/guard fence, and crash or lose replies at
every SQLite, Redis, readback, witness, branch, and final-release boundary.

`source_empty` is legal only after send and drain admission are closed and one
read-only source command proves both `XLEN == 0` and an exact empty `XPENDING`
summary under the same release coordinate. Any positive inbox or PEL count, or
known durable unsettled work, must atomically insert Dn as `open` and commit
`releasing(g,Dn) -> fencing(g -> g+1, previous=Dn)`. Ambiguity must durably
mark the source `recovery_required` and enter `faulted`. Neither branch may
commit `released`; a crash after the open-source transaction may resume only
the pending-generation recovery path.

### P1-4 — stale lifecycle cleanup could TTL/delete a fenced inbox

Exact Trial 3 sections:

- `§2.4 Non-expiring participant guards and settlement proofs`
- `§3.6 Release`
- `§5.1.2 Epoch-aware public lifecycle scripts`
- `§7 Crash matrix`
- `§8 Failure model`
- `§10 Required tests and mutation owners`

The reviewer must pause a stale `SSCAN` discovery page and an authenticated
unregister on every side of epoch install, controller succession, fencing, and
release. Also attack public registration, renewal, missing-presence cleanup,
orphan cleanup, final empty discovery batches, and malformed guard/epoch
states.

For any guarded identity, guard inspection and the decision to clean up must
be in the same Lua command. `PERSIST` must precede every allowed omission or
registry cleanup, and no public or private lifecycle path may execute `DEL`,
`UNLINK`, `EXPIRE`, `PEXPIRE`, `EXPIREAT`, `PEXPIREAT`, or replacement with a
TTL against the guarded inbox. The only stale-page outcomes are cleanup
completed before the atomic epoch install, whose install then `PERSIST`s, or
guard observed after install, `PERSIST` performed, and inbox TTL/delete
suppressed. Require deterministic race ownership for discovery and
authenticated unregister, not a service-side precheck.

### P1-5 — root migration 005 could auto-apply to production and WIRING-A

Exact Trial 3 sections:

- `§2.1 Migration`
- `§9 Implementation decomposition`, especially `EPOCH-CORE` and
  `EPOCH-WIRING`
- `§11 Path scope`
- `§12 Rollout and rollback`
- `§13 Design acceptance checklist`
- `§14 Verification gate`

The reviewer must verify the fixed, deeply frozen allowlist contract:

```text
GENERIC_APPLICATION_SQLITE = 001..004
WIRING_A_SQLITE            = 001..004
WIRING_B_EPOCH_SQLITE      = 001..004 plus the profile-owned 005
```

Migration `005` must exist only at
`gateway/migrations/profiles/sqlite-redis-disposable-epoch-test-v1/005_coordination_consumer_runtime_epoch.sql`.
Attack existing and fresh generic application databases, fresh and reopened
WIRING-A profiles, and the separately named fresh WIRING-B epoch profile.
Also attack directory scans, globs, caller/environment extensions, unknown or
duplicate migration IDs, path traversal, digest mismatch, a cross-profile
already-applied migration, a non-empty purported epoch origin, and reopening a
profile under a different set.

Generic production and WIRING-A must neither enumerate nor apply `005` and
must never create the epoch tables. Only a fresh, origin-owning WIRING-B
profile may select the exact `001..005` set. Require named loader/profile
owners, exact set selection before adapter opening, fail-closed
`MIGRATION_PROFILE_MISMATCH`, rollout proof, and a verification mutation that
would fail if a root scan or WIRING-A path can see `005`.

## Cross-cutting review requirements

The five corrections are not independent checkboxes. The reviewer must trace
their composed order and ownership through the schema shapes, authority
tables, SQLite and Redis transitions, error/status mappings, crash matrices,
path scope, slice decomposition, RED/GREEN tests, mutation owners, rollout,
and verification gate.

At minimum, the verdict evidence must answer:

- Is every authority-bearing Redis tuple preceded by one legal durable
  reservation and followed by exact confirmation before capability exposure?
- Do sender and recipient fencing, lifecycle protection, and the release fence
  share atomic Redis race ownership without service-side gaps?
- Can release prove a post-fence source is exactly empty, or otherwise durably
  open that exact participant as a recovery source before generation advance?
- Can any stale public lifecycle command restore expiry or delete an inbox
  after a participant becomes epoch guarded?
- Can any generic production or WIRING-A loader enumerate or apply the epoch
  migration, including on a fresh database?
- Are every rejection, ambiguity, exhaustion, lost reply, and crash assigned
  one deterministic resume/status path with no unbounded payload disclosure?
- Do the declared slice and mutation owners make each property executable,
  independently testable, and resistant to a plausible one-line mutant?

Static prose presence is insufficient. A finding is closed only if the
reviewer can derive the exact legal state before the race/crash, the atomic
owner of the decision, the state after either ordering, the sole legal resume,
the public status/error, and a RED test that distinguishes the intended rule
from a realistic mutant.

## Request-author authentication and static checks

These checks authenticate the submitted object and request scope; they are not
a design verdict and include no implementation or runtime claim:

- `git cat-file -t 4529fa6305661161a5da27eb68dc613c47087b6c`
  returned `commit`.
- The candidate resolves to tree
  `740b233d5d012efc5c27b011807d3ff80917bc27` and sole parent
  `e31bc714166e3b814d1c417ba4ddf1358cd3abd8`.
- Parent-to-candidate name-status returned only
  `M plan/PROJECT_V5/G/0/02-DESIGN-durable-epoch.md`.
- Parent-to-candidate numstat returned exactly `543 135` for that path.
- SHA-256 of the design blob read from the candidate object returned
  `ac358660ebf72556f2fd408218ad176f427b965c15d1c8c78d7e2018a6b4ce8a`.
- Candidate `git diff --check` passed.
- Review-request `git diff --check` passed before its explicit-pathspec
  commit.
- Before this request was authored, the only unrelated worktree residue was
  untracked `gateway/node_modules`; it was not read, staged, modified, or
  committed.

No implementation tests, integration tests, migrations, rollout, or release
commands were run for this design-only submission.

## Required result contents

The independent result must:

1. repeat the authenticated candidate commit, tree, parent, one-path scope,
   numstat, and committed SHA-256;
2. state reviewer independence and the orchestration route actually used;
3. record one explicit pass/fail conclusion for each of P1-1 through P1-5,
   citing the exact candidate sections and the adversarial schedule tested;
4. state whether every listed Trial 2 survivor remained intact;
5. classify every new finding as P0, P1, or P2 with executable evidence;
6. distinguish design review from implementation, integration, promotion, and
   release state; and
7. issue exactly one final `reviewed_OK` or `reviewed_KO` verdict.

The reviewer must not amend the candidate design, this request, either Trial 2
artifact, an index/sheet, code, tests, migrations, or policy while producing
the result. A correction after KO must use the next immutable trial rather than
rewriting this request or its result.
