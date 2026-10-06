# Project V5 D/0/07c Design Trial 8 — review request

## Candidate

- Design commit:
  `a3d665872637709265f0e376ad0da1db652735b8`
  (`design(v5): classify reachability and separate ratification from implementation preconditions`)
- Adjudicated Trial 7 verdict/base:
  `2b872299939e0db16255403fb693b4274eff0e31`
- Trial 7 reviewer A:
  `33f439f2b9fe3c662cf8308a7b442b12f6b9386f` (`reviewed_OK`,
  zero findings)
- Trial 7 reviewer B:
  `2b872299939e0db16255403fb693b4274eff0e31` (`reviewed_KO`,
  two P1s and zero P0)
- Design:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`

The orchestrator adjudicated both reviewer-B P1 findings as KO. This
candidate changes only operator-facing reachability and ratification
framing. It changes no authority, operative rule, proof obligation, or
per-decision commitment/capability-loss cell.

## Per-finding closure map

| Finding | Design Trial 8 closure |
|---|---|
| P1-1 — the combined subsection gave possibility without saying what is baseline, ordinary-workload-dependent, fault/recovery-dependent, or adversarial, and did not state incidence knowledge or exposing evidence. | **Operational reachability and incidence** now defines those four trigger classes and classifies every outcome in the combined subsection (`design:567-602`). Every row names the concrete trigger, whether correct intended operation can produce it, whether frequency is rule-determined or unmeasured, and what diagnostic evidence could expose it. |
| P1-2 — the design conflated all-five necessity for a conforming D/0/07c implementation with an indivisible all-five ratification ballot. | The ratification preamble now says each line is a separate parent amendment and partial approval authorizes no D/0/07c implementation (`design:509-515`). **Independent ratification and D/0/07c implementation dependency** states the independent meaning and concrete decline cost for Decisions 1B–5B (`design:604-626`), while the unchanged dependency paragraph retains all five as the necessary implementation precondition (`design:628-636`). The final stop repeats that distinction (`design:814-816`). |

## P1-1 closure — operational reachability

The new table makes the selected baseline explicit:

- D/0/07c creates the owned relay-socket entry and runtime directory.
  Decision 4 closes descriptors but never unlinks the socket and never removes
  the directory. Absent external removal, a correct ordinary accepted
  generation therefore records both `PRESERVED`, reaches `REVOKED`, and may
  settle with both present. This is **expected baseline cleanup behavior**,
  logically determined for every such generation, not an exceptional
  cleanup failure (`design:592`).
- The relay key is explicitly different: ordinary single-use consumption
  removes it before `ACCEPT` and records `RETIRED`. A residual key,
  same-name replacement, or unexpected child requires failed/violated
  consumption or later external namespace mutation; its frequency is
  unmeasured (`design:593`).

Every other combined outcome is classified:

| Trigger class | Classified outcomes |
|---|---|
| Ordinary-workload-dependent | Pre-`ACCEPT`/pre-activation and mixed-producer/time PTY ranges; ordinary job-control/terminal changes; provenance-loss content in a later field-exact capture; outside-group descendants (`design:594-598`). |
| Component/recovery failure | Non-cooperative relay survival, retained-server-connection loss preserving the owned pane/session, and helper/reaper death, adoption, premature reap, or restarted cleanup preserving the direct root/original group (`design:599-601`). |
| Adversarial/desired-behavior violation | Fork/inheritance/handoff/replacement use of the original relay peer endpoint, external namespace replacement, and adversarial variants of PTY live-facet drift (`design:593,595-597`). |
| Mixed simultaneous outcome | Ordinary cleanup can settle with baseline socket/directory residue. The larger simultaneous set additionally requires the applicable workload, component/recovery, and—where present—adversarial triggers (`design:602`). |

The table does not invent probabilities. It states that baseline namespace
residue is known from the rule and every empirical workload/failure/
adversarial rate is presently unmeasured. Its evidence column identifies
ledger state, controlled read/render traces, lifecycle/connection causes,
and diagnostic no-follow namespace, process, or retained-server observations.
It also states where the accepted stream or capture record cannot expose
producer/holder provenance by itself. The introductory boundary makes all
such evidence diagnostic only and adds no public surface or effect authority
(`design:584-588`).

## P1-2 closure — independent decisions, joint implementation dependency

The document now supports five independent operator decisions:

| Decision | Independent meaning | Concrete decline cost |
|---|---|---|
| 1B | Accept the retained-socket/read-range authority boundary alone; no separate positive leaf using it is identified here. | No `READY(G)`, claim, port, relay input/output, barrier traffic, or positive D/0/07c snapshot. |
| 2A | Accept the custom shared-default-tmux deployment, atomic capture, and owned pane/session cleanup boundary alone; no separate positive leaf using it is identified here. | No `READY(G)` or field-exact capture, and no proposed retained-connection authority for exact owned pane/session cleanup. |
| 3B | Accept only the bounded process-preservation amendment. | The frozen complete process/tree-retirement criterion remains unsatisfied, so this topology cannot complete D/0/07c conformingly. |
| 4C | Accept only the namespace-preservation amendment. | The frozen no-key/socket/runtime-directory-leak criterion remains unsatisfied, so this topology cannot complete D/0/07c conformingly. |
| 5B | Resolve the retained-PTY authority conflict independently for the separately scoped D/0/07b write leaf, subject to that leaf's own gates. | No `READY(G)`, retained-PTY read/write, positive D/0/07c transaction, or positive D/0/07b write. |

No line is declared contractually inseparable. Approving or declining one
does not decide or rescind another. A declined requirement stays at HARD FAIL
and requires a conforming redesign if D/0/07c remains desired. Under this
proposed topology, all five approved resolutions remain necessary before a
later D/0/07c implementation trial; even all five approvals do not themselves
authorize implementation, integration, promotion, or release
(`design:604-636,814-816`).

## Proof that operative rules and the five cells are unchanged

The design diff against the adjudicated Trial 7 base is:

```text
$ git diff --numstat 2b872299939e0db16255403fb693b4274eff0e31..a3d665872637709265f0e376ad0da1db652735b8 -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
71	5	plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md

$ git diff --unified=0 2b872299939e0db16255403fb693b4274eff0e31..a3d665872637709265f0e376ad0da1db652735b8 -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
@@ -509,3 +509,7 @@ Consequently **only explicit contract/deployment amendments remain**.
@@ -562,0 +567,61 @@ commitment or capability-loss cells.
@@ -749,2 +814,3 @@ preserved.
```

The five deletions are exactly the old three-line indivisible-ratification
framing and old two-line final stop. Their replacements state independent
ratification plus the unchanged all-five implementation stop. The only other
hunk adds the two disclosure tables. No hunk touches an authority rule,
inventory entry, proof obligation, or existing decision row.

Two direct byte checks confirm that boundary:

```text
Operative design lines 1-501:
2b87229...  dc91065172f48b915bf95aa71d82dc2fa243e348992cf79eca903bf85c8ed89c
a3d6658...  dc91065172f48b915bf95aa71d82dc2fa243e348992cf79eca903bf85c8ed89c

Five-row decision table:
2b87229...  6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768
a3d6658...  6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768
```

Thus no accepted signal boundary, retained-object selector, generation order,
capture condition, preservation fallback, settlement rule, or per-decision
cell changed.

## Validation and scope

- `git diff --check
  2b872299939e0db16255403fb693b4274eff0e31..a3d665872637709265f0e376ad0da1db652735b8
  -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` exited zero.
- The design commit changes exactly one tracked file.
- No implementation, source, test, fixture, capability, codec, public
  surface, adapter, service, catalog, provider launch, tmux runtime, socket,
  process, or kernel state was changed or exercised.
- No runtime gate was run; this is a design-only candidate.
- No D/0/07d, splice, integration, promotion, release, or operator-ratification
  claim is made.
- The pre-existing untracked `gateway/node_modules` directory was not touched.

## Review request

Please review only whether:

1. every combined outcome has the correct trigger class, concrete trigger,
   ordinary-operation statement, frequency status, and exposing evidence;
2. ordinary relay-socket/runtime-directory residue is unmistakably selected
   baseline behavior and the normally consumed key is distinguished;
3. every decision can be accepted or declined independently with its exact
   cost while all five remain the D/0/07c implementation precondition; and
4. the diff and hashes prove that no authority, operative rule, proof
   obligation, or per-decision cell changed.
