# Project V5 D/0/07c Design Trial 9 — review request

## Candidate

- Design commit:
  `95185e0175e7b0619628488c3024ba2d1615418c`
  (`design(v5): classify same-holder relay and tmux-binding drift for D/0/07c`)
- Trial 8 reviewer A:
  `efe88fb9a75a85e2c9ef44aae151c4d7b8079396` (`reviewed_KO`,
  one P1 and zero P0)
- Trial 8 reviewer B/adjudicated review-state base:
  `f056236ea3f9cb48f7bb0ff448e07fcf04f587db` (`reviewed_OK`,
  zero findings)
- Design:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`

The orchestrator adjudicated reviewer A's concrete P1 as KO. This candidate
closes only that finding. It changes no operative rule, per-decision cell, or
independent-decision matrix entry.

## Finding and closure

Reviewer A found that Decision 1 accepts three distinct effect-time continuity
losses, while the operational trigger table classified only descriptor-holder
delegation. The table had no independent classification for traffic after the
original holder's own live relay facets drift or for traffic on the original
endpoint during accepted tmux server/session/pane binding drift.

Two separate rows now close the omission:

| Missing outcome | Design Trial 9 closure |
|---|---|
| Original accepted endpoint holder continues after its own live relay facet changes | The new same-holder row classifies this as **adversarial/desired-behavior violation**, states that correct intended relay operation keeps the live facets stable, records incidence as unmeasured, and names controlled same-holder facet mutation or correlated process diagnostics as exposing evidence. It also states that stream effects contain no live-facet evidence and separate observations cannot close the effect-time race (`design:596`). |
| Original endpoint carries traffic while the accepted tmux server/session/pane binding drifts | The new same-endpoint row classifies server restart/replacement and session/pane lifecycle drift as **component/recovery failure or adversarial/desired-behavior violation**, states that correct healthy port/tmux operation keeps the binding stable, records incidence as unmeasured, and names retained-server diagnostics, atomic-capture mismatch, or controlled tmux replacement as exposing evidence. It states that earlier stream/barrier effects contain no live-binding evidence and separate observations cannot close their effect-time race (`design:597`). |

The original endpoint and holder are expressly unchanged in the tmux row, and
the live-facet row expressly excludes delegation and holder replacement.
Neither outcome is folded into or restates the unchanged delegation row, which
now follows them at `design:598`. The diagnostic-evidence boundary remains
unchanged: evidence adds neither public surface nor effect authority
(`design:584-588`).

## Proof that settled rules, cells, and matrix are unchanged

The complete design diff against the Trial 8 review-state base is:

```text
$ git diff --numstat f056236ea3f9cb48f7bb0ff448e07fcf04f587db..95185e0175e7b0619628488c3024ba2d1615418c -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
2	0	plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md

$ git diff --unified=0 f056236ea3f9cb48f7bb0ff448e07fcf04f587db..95185e0175e7b0619628488c3024ba2d1615418c -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
@@ -595,0 +596,2 @@ surface, and no diagnostic observation becomes effect authority.
+| The original accepted endpoint holder uses the socket after its own live relay facets drift | ...
+| The original relay endpoint carries traffic while the accepted tmux server/session/pane binding drifts | ...
```

That is the sole hunk: two inserted trigger rows after old line 595. It is
outside the operative design/site inventory (`design:1-501`), the five
per-decision commitment/capability-loss cells (`design:517-523`), and the
independent-decision matrix (base `design:613-619`, candidate
`design:615-621`). Direct byte checks confirm all three settled regions:

| Settled region | Trial 8 base SHA-256 | Trial 9 candidate SHA-256 |
|---|---|---|
| Operative design and complete site inventory | `dc91065172f48b915bf95aa71d82dc2fa243e348992cf79eca903bf85c8ed89c` | `dc91065172f48b915bf95aa71d82dc2fa243e348992cf79eca903bf85c8ed89c` |
| Five-row per-decision table | `6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768` | `6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768` |
| Independent-decision matrix | `4a2cffce28757fe888adab67cd7bb8847a77c2e07f290157e7e24dbedc9a6537` | `4a2cffce28757fe888adab67cd7bb8847a77c2e07f290157e7e24dbedc9a6537` |

Thus no authority condition, ordering rule, cleanup selector, rejection
mapping, per-decision commitment/capability-loss cell, independent decision,
decline cost, or all-five implementation precondition changed.

## Validation and scope

- `git diff --check
  f056236ea3f9cb48f7bb0ff448e07fcf04f587db..95185e0175e7b0619628488c3024ba2d1615418c
  -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` exited zero.
- The design commit changes exactly one tracked file by two insertions.
- No implementation, source, test, fixture, capability, codec, port/public
  surface, adapter, service, catalog, provider launch, tmux runtime, socket,
  process, or kernel state was changed or exercised.
- No runtime gate was run; this is a design-only candidate.
- No D/0/07d, splice, integration, promotion, release, implementation, or
  operator-ratification claim is made.
- The pre-existing untracked `gateway/node_modules` directory was not touched.

## Review request

Please review only whether the two new rows independently and accurately state
the trigger class, correct-operation behavior, frequency status, and exposing
evidence for same-holder relay-facet drift and same-endpoint tmux-binding drift,
and whether the single-hunk diff proves every settled rule, cell, and
independent-decision entry remains unchanged.
