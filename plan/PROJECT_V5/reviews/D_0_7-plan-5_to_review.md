# Plan Review Submission — Project V5 D/0/07 Decision 4C cleanup reconciliation (plan trial 5)

## Requested reviewer

- Model profile: GPT-5.6 Sol, reasoning `max`, service Priority/Fast.
- Review mode: independent plan review of the binding Decision 4C propagation into the shared
  parent, relay leaf, and final composition gate.
- Claim boundary: plan documents only. No implementation, technical GREEN, integration,
  promotion, live-provider execution, release, or review verdict is claimed.

## Frozen candidate

- Candidate commit:
  `794591dc38ed7151d75c3fe65b95e0ea9c0baefb`
  (`docs(plan): reconcile D07 cleanup ownership (V5 D/0/07 Trial 5)`).
- Candidate parent:
  `c38762a379a3d060fcf5e6ed21a58b95ecec27a2`.
- Candidate tree:
  `81ba5234361a5ff8abfff55ede9ee60e656ab702`.
- Branch: `plan/V5-D-0-07-trial5`.

Candidate path allowlist:

```text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07c.md
plan/PROJECT_V5/D/0/07d.md
```

`git diff-tree --no-commit-id --name-status -r 794591d...` reports exactly those three
modified paths. No design, human-decision, implementation, test, fixture, registry, policy,
manifest, lockfile, schema, migration, ADR, runbook, workflow, historical request, or verdict
path is in the candidate.

## Authenticated base and governing objects

The supervised session began at the exact requested base:

```text
commit  c38762a379a3d060fcf5e6ed21a58b95ecec27a2
tree    447fef5ad5b3981326b6f02ca52d907832986b70
parent  d7873eba1a9405fec92875020854ed67f16a03b1
scope   A plan/reviews/PROJECT_V5/D_0_7C-3_to_review.md
```

The candidate parent is that exact commit. The binding chain is:

| Object | Commit | Tree | Parent | Authenticated scope |
|---|---|---|---|---|
| Approved binding design | `95185e0175e7b0619628488c3024ba2d1615418c` | `7f2a27697fc9cf06062bce23253a8913ce1e983c` | `f056236ea3f9cb48f7bb0ff448e07fcf04f587db` | only `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` modified |
| Design Trial 9 reviewer A approval | `e230fafce6814e416ce9f0fac09505a72acea114` | `07953d50d8c50cb14c9430570e534beec2ee16ce` | `a259ab1a1ea60eb24d8a1008900f566588afabed` | only `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-9_result.md` added |
| Design Trial 9 reviewer B approval | `83252f68996d1ce12b6d0c77b65784d6750f46fc` | `79e143b97a5ed137d02be488ecf04a0ebf05f487` | `e230fafce6814e416ce9f0fac09505a72acea114` | only `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-9_result_b.md` added |
| Human ratification | `ac92d51afc329449e31be7bfa91b77b255ae8fa4` | `974963e12fb39b74826fc55449584fb3b3d81ba5` | `0db688bda8b5a85599ef61c94cb54dd0302d205d` | only `plan/reviews/PROJECT_V5/D_0_7C_DESIGN_human_decision.md` added |

All four governing commits are ancestors of the candidate. Blob authentication at the candidate
matches the named objects exactly:

| Artifact | Blob at governing object | Blob at candidate |
|---|---|---|
| Approved design | `2643ddc025c3af0398aa0ff3301052a00bfc8c4c` | `2643ddc025c3af0398aa0ff3301052a00bfc8c4c` |
| Human ratification | `62806a58f616515692ec422371b3d9bc7cfb7bd1` | `62806a58f616515692ec422371b3d9bc7cfb7bd1` |
| Reviewer A result | `3f538775f5643763da7b647a3dc7cea827f0f737` | `3f538775f5643763da7b647a3dc7cea827f0f737` |
| Reviewer B result | `330136455eb6a62c0863d3cd65cf1defb5eeb7fa` | `330136455eb6a62c0863d3cd65cf1defb5eeb7fa` |

The prior plan trail is also preserved. Trial 4's submitted candidate
`f3c970cafa29b2349307e42faf3cec7bbacbc44c` and review-branch equivalent
`73116dd85de4b905a4d9a656dd81beeb17aee789` have the same tree
`fe2534d9a84e0d15ccd517df91e6560e57adb2fb`; the equivalent commit is an
ancestor of this candidate. Trial 4's request
`29089d200306262a1ef8a7a43e8b8552a55f31ca`, independent OK artifact
`90a53852b8b037c9221ad583e592e529335d7c4d`, and final index update
`cb323e923d4f5169875cb2660c39cf9af7ba6b4a` are ancestors. Trials 1–4
requests and results remain byte-untouched.

## Conflict that required Trial 5

The Trial 4 sheets predate the binding human ratification. They still required outcomes that
Decision 4C expressly removed:

- the parent relay-reject path removed the socket, key, runtime directory, and tmux session;
- the parent lifecycle required undifferentiated fd/socket/tmux retirement and final evidence
  of zero leaked sockets, key files, and runtime directories;
- `D/0/07c` required every reject to tear down the socket/key/directory and required a
  universally leak-free process/socket/key/directory/tmux result; and
- `D/0/07d` required exact socket/runtime-directory retirement and zero before/after namespace
  inventories.

Those requirements contradict approved Decision 4C. After `V`, pathname `unlink`/`rmdir` cannot
select an exact owned entry without risking deletion of a same-name replacement. Ratification
therefore selected preservation rather than granting new deletion authority. No new human
decision is required, and the candidate does not add a janitor.

## Decision 4C propagation

The candidate makes the following distinctions normative in all three sheets:

| Concern | Candidate rule |
|---|---|
| Component-owned descriptors | Every exact retained descriptor is directly shut down/closed once and its descriptor target is `RETIRED`; pathname state is separate. |
| Relay key | The existing one-time no-follow relay consumption may unlink the key before `ACCEPT` and record it `RETIRED`. Product cleanup performs no key unlink after `V`; an extant owned or replacement key is `PRESERVED`. |
| Relay socket pathname and runtime directory | Product/session-port cleanup performs zero `unlink`/`rmdir` after `V`. Absent external removal, both persist through ordinary accepted settlement as terminal `PRESERVED` entries. |
| Process targets | The exact helper-owned live-or-unreaped direct root/original group retains its sealed TERM/grace/KILL-before-reap rule. Anchor loss, outside-group descendants, and a non-cooperative relay finish `PRESERVED` when not authoritatively gone; arbitrary/later numeric targets remain forbidden. |
| Owned tmux pane/session | Only sealed lifetime IDs on the retained shared-server connection may retire. Exact authoritative outcomes are `RETIRED`; lost exact authority is `PRESERVED`; the public target is never re-resolved. |
| Shared tmux infrastructure | The shared server/socket remain outside the owned ledger and are always preserved; `kill-server`, shared-socket unlink, and sibling-session destruction remain forbidden. |
| Completion | Every cleanup target must be terminal `RETIRED` or `PRESERVED`. Ordinary completion waits for that finite ledger, not an empty namespace or disappearance of permitted survivors. |
| Harness teardown | An isolated harness may remove only its own ephemeral namespace after it records preservation evidence. That action is outside product/session-port cleanup, cannot satisfy acceptance, and grants no production janitor, retention, reuse, or deletion policy. |

Same-name key/socket/directory replacements are never selected or deleted. The candidate changes
no capability, codec, binding tag, relay proof, PTY authority, capture, canonicalization, race
classification, public error, attach identity, provider argv, no-shell/no-`send-keys` rule,
dependency, status, or splice gate.

## Acceptance and verification delta

The parent shared acceptance, `07c` leaf acceptance, and `07d` final composition acceptance now
all require:

1. closure of all component-owned retained descriptors;
2. a terminal `RETIRED` or `PRESERVED` outcome for every cleanup target before ordinary
   settlement;
3. the ordinary accepted-path ledger:
   `relay key=RETIRED`, `relay socket pathname=PRESERVED`, and
   `runtime directory=PRESERVED` absent external removal;
4. zero post-`V` product/session-port `unlink` or `rmdir`;
5. survival and `PRESERVED` disposition of same-name namespace replacements;
6. `RETIRED`/`PRESERVED` outcomes for exact process and owned pane/session targets, with every
   permitted survivor recorded;
7. survival of the shared tmux server/socket and an unrelated sibling session; and
8. preservation evidence recorded before any external isolated-harness teardown.

The existing focused commands are unchanged. `07d` still ends with the four focused
session-port suites, existing supervisor/live/Darwin regressions, host
`bash scripts/ci.sh`, and `git diff --check`. No acceptance item can be satisfied by harness
deletion after the evidence cut.

## Completeness and validation evidence

Candidate delta:

```text
82  11  plan/PROJECT_V5/D/0/07.md
38   6  plan/PROJECT_V5/D/0/07c.md
57  13  plan/PROJECT_V5/D/0/07d.md
```

Validation performed on the candidate:

- `git diff --check
  c38762a379a3d060fcf5e6ed21a58b95ecec27a2..794591dc38ed7151d75c3fe65b95e0ea9c0baefb`
  exited zero.
- All 13 local Markdown links in the three sheets resolve.
- All 16 zero-argument assertions loaded directly from
  `test_project_layout.py`, `test_v5_coordination_docs.py`, and
  `test_v5_coordination_integration_docs.py` passed.
- `node --test tests/gateway/planner_review_contract.test.js` passed:
  1 test, 0 failures, 0 skips.
- The contradiction sweep found no remaining requirement to delete/retire the relay socket
  pathname or runtime directory, no universal namespace-leak assertion, and no teardown claim
  that can delete a same-name replacement. The only affirmative `unlink` is the frozen
  pre-`ACCEPT` one-time relay-key consumption; every post-`V` occurrence is a prohibition or
  zero-call oracle.
- `git diff --quiet c38762a379a3d060fcf5e6ed21a58b95ecec27a2..794591dc38ed7151d75c3fe65b95e0ea9c0baefb -- ci scripts tests gateway cli
  orchestrator-langgraph` exited zero, proving the candidate changed no gate, source, or test
  input.

The required host `bash scripts/ci.sh` was run and is **not reported as a pass**. It stopped
before suite execution with `status: invalid_manifest`, 0 tests, 0 passed, 0 failed, and seven
stale `inventorySha256` entries:

```text
lint.python
lint.gateway
test.structure
test.gateway
policy.registry
test.cli
test.redis-live
```

The available Python also lacks `pytest`, so the canonical focused pytest invocation could not
run (`No module named pytest`). The 16 zero-argument structure assertions above were invoked
directly; that is corroborating plan validation, not a substitute claim that full CI passed.

## Evidence limits

- This is a plan-only candidate. It does not prove that current or future product code conforms
  to Decision 4C.
- No helper, PTY, relay, socket, tmux server, process, kernel peer, custom tmux protocol, or
  cleanup implementation was exercised for this candidate.
- The ordinary-path ledger, replacement-survival, permitted-survivor, and harness-order cases
  are executable acceptance obligations, not observed runtime results.
- Full CI remains blocked at the checked-in manifest-validation boundary described above.
- The human decision authorizes the binding amendment, not this candidate's review,
  implementation acceptance, integration, promotion, or release.

## Review focus

1. Confirm every old deletion/leak-free contradiction is removed without inventing deletion,
   janitor, retention, or reuse authority.
2. Confirm descriptor closure, pre-`ACCEPT` key consumption, process outcomes, owned tmux
   outcomes, shared tmux preservation, and filesystem namespace outcomes remain disjoint.
3. Confirm completion waits for a terminal ledger rather than an empty namespace, and that
   same-name replacements and every permitted survivor remain observable as `PRESERVED`.
4. Confirm acceptance and verification cover all eight obligations above and place harness
   teardown strictly after the evidence cut.
5. Confirm the candidate preserves every unrelated Trial 4 contract and the canonical
   `planned`/blocked status language.
6. Confirm the three-path candidate and append-only Trial 5 handoff preserve the historical
   review trail.

## Verdict contract

Write `plan/PROJECT_V5/reviews/D_0_7-plan-5_reviewed_OK.md` or
`plan/PROJECT_V5/reviews/D_0_7-plan-5_reviewed_KO.md`. Keep the result append-only and make every
KO finding actionable from the submitted files alone. This request makes no self-verdict.
