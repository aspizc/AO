# Remediation coverage and optimal implementation path

## Verdict

V5 is the correct remediation vehicle and should remain the only
implementation owner. The 44 open V5 sheets cover the broad shape of the
remaining work, but the coverage registry needs semantic repair: several new
or residual findings point to completed sheets or lack a small explicit
correction owner.

Do not create a V6. Reconcile V5, then execute its critical path.

## Inventory

| Project view | Complete/absorbed | In progress/partial | Planned | Open/nonterminal |
|---|---:|---:|---:|---:|
| V5 executable sheets | 38 | 5 | 39 | **44** |
| V4 absorption view | 1 | 5 | 66 | **71** |

The 71 V4 nonterminal sheets are acceptance sources absorbed by the 44 V5
owners, not 71 additional implementations.

## Finding-to-plan coverage

| Finding | State | V5 owner(s) | Coverage assessment |
|---|---|---|---|
| EXEC-01 unsafe active adapters | Critical open | D/0/07c → 07d → D/0/01; D/0/02 | Good dependency coverage; execute now |
| SHELL-01 tmux shell/foreground risk | Critical open | D/0/07c–d, D/0/01 | Good coverage; 07c review is the immediate gate |
| OPS-01 recursive Gateways | Critical open/worse | D/0/02, D/0/03, D/0/05 | Good final ownership; needs immediate operational containment |
| ART-01 caller-controlled artifact labels | Critical open | F/0/00 | Good owner; ensure classification/source are server-derived |
| Approval/effect authority | High open | E/0/01–02/05, F/0/01–04 | Good coverage; order after safe effect path |
| CTX-01 reconnect/restart authority | High new | D/0/04, E/0/00, I/0/02/06 | Partial: assign one explicit durable-authority acceptance owner |
| Broken official smokes | High new | H/0/02, D/0/04, I/0/04 | Good end-state; add an immediate correction/fitness task under C/0/03 or H/0/02 |
| Full-gate reaper race | High new | C/0/03 plus D/0/01/process-supervisor correction | Partial: triage must name the implementation owner before closure |
| Cancel dead end | High open | C/1/01–03, D/0/01 | Good functional coverage |
| False completion | High open | C/1/02–03 | Good coverage |
| Single writer/recovery | High open | D/0/03, I/0/00–03 | Good coverage |
| Global process/cost budget | High open | D/0/06 | Good coverage |
| Operator inventory/approval UX | High open | E/0/00–05 | Good coverage |
| Review KO/effect evidence | High open | F/0/00–04, I/0/02 | Good coverage |
| Coordination recovery/caps | Medium/High partial | G/0/02–04 | Good coverage |
| Data lifecycle/governance | High open | I/0/00–05/09, final I/0/04 | Good coverage; release must be last |
| Packaging/full-stack proof | Medium open | H/0/01, I/0/06–07 | Good coverage |
| Release identity | High partial | I/0/04 | Good owner; current local promotion is not closure |
| Coverage-matrix drift | High governance | Plan reconciliation | Gap: no completed sheet can own ongoing registry truth |
| V4 45→44 stale views | Medium governance | Plan reconciliation | Small explicit documentation correction |
| Two moderate npm advisories | Medium | C/0/02 maintenance / I/0/04 | Residual maintenance owner should be explicit |

## Highest-value sequence

### Step 0 — Operational containment

Value: immediate risk reduction. Effort: low. This does not close plan sheets.

- prevent child workspaces from inheriting/discovering the control Gateway;
- pin one candidate and one writer per workspace operationally;
- stop expanding real/YOLO usage;
- monitor Gateway count/RSS/store owners;
- leave existing sessions untouched unless the operator authorizes cleanup.

### Step 1 — Restore trustworthy feedback

Value: very high. Effort: small/medium.

1. Diagnose the process-supervisor cleanup failure in the complete gate
   context and make two consecutive full gates green.
2. Change both official smoke clients to reuse one authenticated connection.
3. Add both smokes as required candidate-bound suites.
4. Add a separate reconnect test that exercises the intended durable
   authority protocol.

Owners: C/0/03, D/0/04 and H/0/02, with an explicit correction record. This
step should precede broad implementation because a red feedback loop makes
every later claim expensive and uncertain.

### Step 2 — Compose safe execution

Value: highest risk reduction and unblocks most downstream work.

1. independent review/integration of D/0/07c;
2. D/0/07d final session-port composition;
3. D/0/01 splice into every provider adapter;
4. remove/fence the legacy `spawnSync` and raw tmux route.

Do not parallelize modifications to the same adapters across these sheets.

### Step 3 — Make the boundary real

After the splice, run parallel streams with separate write scopes:

| Stream | Sheets | Outcome |
|---|---|---|
| Isolation/egress | D/0/02 + F/0/00 | Child confinement and server-owned output/classification |
| Lifecycle | C/1/00–03 | Reserve-before-effect, typed state, honest completion/recovery |
| Capacity | D/0/06 | Global process/output/disk/provider-cost admission |
| Ownership | D/0/03 + I/0/00 | Single writer, operation identity and reconciliation |
| Fitness | C/0/03 | Mutation/coverage/architecture and leak regressions |

Then close D/0/05 non-recursion. Its proof depends on isolation and ownership;
implementing it earlier would only hide one spawn route.

### Step 4 — Make decisions and review authoritative

Execute:

1. E/0/00 inventory;
2. E/0/01 immutable approval context;
3. E/0/02 signed single-use decision;
4. E/0/03 CLI;
5. E/0/05 governed modes;
6. F/0/00–04 artifact manifest, independent reviewers, stale invalidation and
   completion integration.

E/0/04 health can advance once the single-daemon/single-writer boundary exists.

### Step 5 — Prove the product

- D/0/04 adversarial execution;
- G/0/02 WIRING-B and exit gate, then G/0/03–04;
- H/0/01 remaining probes/portability;
- H/0/02 one-command dry-run;
- H/0/04 metrics/recovery drill;
- protected H/0/05 only after every trust gate.

This is the first point at which a real-agent pilot claim can be considered.

### Step 6 — Durability and release

Order the I stage by dependency, not numeric appearance:

1. I/0/00 durable operations/outbox;
2. I/0/01 atomic artifacts;
3. I/0/02 durable Temporal effects;
4. I/0/03 restore;
5. I/0/05 PostgreSQL parity;
6. I/0/06 portable worker/channel;
7. I/0/07 disposable full-stack lane;
8. I/0/08 canonical cutover/rollback;
9. I/0/09 data governance/integrity;
10. I/0/04 retention/export/erase and exact release gate.

## Parallelism map

```text
feedback repair
      │
      ▼
07c → 07d → D/0/01 splice
                 │
        ┌────────┼────────┬───────────┐
        ▼        ▼        ▼           ▼
     D/0/02   C/1/00–03 D/0/06   D/0/03 + I/0/00
        │        │        │           │
        └────────┴────────┴─────┬─────┘
                                ▼
                         D/0/05 + D/0/04
                                │
                   E/F authority and review
                                │
                   G/H supported hero proof
                                │
                         I durability/release
```

## Prioritization rationale

| Work | User value | Risk reduction | Unblocks | Priority |
|---|---:|---:|---:|---:|
| Feedback repair/smokes | Very high | High | All claims | P0 |
| Execution splice | High | Very high | Isolation, lifecycle, real pilot | P0 |
| Isolation/single writer/budgets/non-recursion | High | Very high | Safe operation | P0 |
| Lifecycle/inventory/approvals/review | Very high | High | Honest operator journey | P1 |
| Coordination completion/hero flow | Very high | Medium | Demonstrable product | P1 |
| Durability/data/release | High | High | Supported release | P1 after proof |
| Additional features | Low now | Low | Little | Defer |

## Plan-registry corrections required before execution claims

1. Change the two V4 derived views from 45 to 44 open V5 owners.
2. Update the coverage-matrix baseline to `2986b09`.
3. Reclassify every row against individual sheet evidence.
4. Move residual acceptance away from completed sheets to one open owner.
5. Add explicit correction ownership for:
   - persistent official smokes;
   - full-gate reaper race;
   - durable RequestContext reconnect/expiry;
   - ongoing dependency maintenance.
6. Reconcile the Trial 4 verdict and local promotion in a new reviewed tree.
7. Preserve release as false until I/0/04.

## Definition of maximum-value completion

The optimal path is complete when one exact, installable candidate can run the
hero journey on one non-recursive Gateway, survive reconnect/restart, enforce
isolation/budgets/approvals, cancel or complete truthfully, produce independent
digest-bound evidence, restore its data, and pass every required live lane
before the same object is tagged and published.

