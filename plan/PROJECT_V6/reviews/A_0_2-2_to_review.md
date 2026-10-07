# A/0/02 trial 2 — final candidate review request

Status: implemented candidate; independent review pending. No integration,
promotion or release is claimed. The prepared trial 1 request and its later
registry-migration checkpoint remain immutable.

- Original branch base: `186ce1d03e824fe526a61927812aa2593a81b28e`.
- Operator-approved policy commit: `3f7d78a` (current branch HEAD).
- Branch: `feat/V6-A-0-02-public-setup`.
- Build trace: `tr-v6-a02-1b1038a3-00fc-40aa-8511-54656967c519`.
- Fresh independent review trace: `tr-r1-v6-a02-review-1e53fff6-77b9-486a-8922-8085e118a7f8`.
- Root freezes the exact candidate tree/blobs in the reviewer assignment and
  verdict, avoiding a self-referential request hash.
- Codex coder and a separately assigned Codex reviewer use the operator's
  authorized fallback after Gateway task.assign denied REQUEST_CONTEXT_DENIED.
  No Claude execution, author self-review or provider call is claimed.

## Test-first chain and operator decision

[Prepared handoff](A_0_2-1_to_review.md) records the original overlay/scanner/
examples RED and implementation scope. [Migration checkpoint](A_0_2-1_registry_migration_checkpoint.md)
records seven newly exposed fixture dependencies: 28 tests, 21 passed and
7 failed before correction; 39 passed, 0 failed/skipped after substituting the
public internal fixture without dropping model/tier/classification assertions.
[Operator decision](A_0_2_operator_registry_decision.md) binds the exact minimal
policy removals and preserved external entries. This direct authorization
supersedes the sheet's general no-agent-policy-edit rule only for that patch.

Root's required-lane assertion first failed with public.hygiene missing;
after manifest/contract wiring, the focal Python set passed 32/32. This
manifest-driven lane requires no new ci_gate.py execution code. README,
CHANGELOG and CI docs describe the added environment variable and gate.

The actual preserved local overlay validates with base, KYA and MVP2 profiles.
A fresh isolated candidate Gateway initialized with it and closed successfully.
The live launcher still targets the sibling checkout, where these IDs remain:
adding the overlay there would collide. The AO-local environment file is ready
for the integrated AO launcher; no live switch/restart is claimed or required
for the candidate's isolated startup proof. Generic real-MCP tests independently
exercise an overlay-only task registration and doctor effective-registry tests.

## Full gate and verification

The first full gate failed: 2644 passed, 7 failed, 12 skipped. Its seven failures
were the removed registry dependencies identified above, not an ignored lane.
Raw retained log: `/tmp/ao-v6-a02-gate-1-failed.log`.

After the bounded correction and inventory refresh, `bash scripts/ci.sh`
exited **0**: **2651 passed, 0 failed, 12 skipped, 2663 total**. Aggregate status
is `infrastructure_unavailable`, not an all-services pass. The required Redis
lane ran 22 tests; test.structure 456; Gateway 1632 passed plus 9 skips; E2E25;
CLI428; LangGraph81 plus3 skips. Six command lanes passed. Optional live-agent
providers were not run. No Darwin or additional Node-version evidence exists.

Environment: Node22.22.1, Python3.11.15, isolated Redis7.2 container, pinned
`3.6a-agents.1` tmux under an owned TMUX_TMPDIR. This A02 candidate contains no
A04 runtime changes. The gate script cleaned only its owned tmux/container.

Raw gate log: `/tmp/ao-v6-a02-gate.log`.
SHA-256: `397b1fed891b77e0f04fd3e09ea7e97f7e213ec2ea0a57478680c4f45cb5ec2c`.

Allowed infrastructure skip IDs:

- `live postgres repository contract: create and read repository aggregate`
- `live postgres repository contract: status updates report one changed row`
- `live postgres repository contract: foreign key violation fails`
- `live postgres repository contract: policy decisions are append only`
- `live postgres literals round-trip adversarial strings`
- `live postgres literals preserve NULL separately from string null`
- `live postgres literals support named and positional params`
- `live postgres reports changes for insert update and delete`
- `live postgres rejects non-finite numeric literals before execution`
- `tests.test_gateway_client::test_real_gateway_smoke`
- `tests.test_plan_refine_graph::test_real_gateway_dry_run_smoke`
- `tests.test_temporal_crash_recovery::test_temporal_worker_restart_replays_without_duplicate_implement_or_implicit_approval`

The public hygiene scanner returned zero findings on staged publication inputs.
Whitespace checks passed. Current non-history source has no company copyright
attribution; the remaining Signicat literals are negative assertion fixtures.
Historical documents were retained under the explicit operator decision.

## Review focus

Verify the sheet/stage/AGENTS contracts against the actual candidate, not these
claims: additive-only overlay validation and startup/doctor parity; policy diff
exactly matches the operator authorization; I1 cleanup and I3 exact exceptions;
I4 history remains intact; emitted scanner findings and required gate topology;
examples execute distinct project checks and label wave automation PLANNED.
Confirm no permissions/models/roles were changed and no overlay is published.
The dedicated V7 plan is not required for A02 runtime acceptance or part of this
candidate; no automated-wave implementation is claimed.

One independent reviewer writes a new trial2 verdict. Root owns index/commit,
serial integration and later promotion. A02 evidence alone cannot close V6 or
justify the final 1.1.0 tag.
