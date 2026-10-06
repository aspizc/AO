# Public AO upstream integration checkpoint

Status: implementation candidate prepared; full verification and independent review in progress.

## Request and boundaries

Import relevant improvements from the local agents-orchestrator project into AO,
keeping AO general-purpose and shareable. The operator explicitly authorized a
push and requested `carlos.aspizc@gmail.com` as the commit author email.

## Pinned inputs

- AO base and observed origin/main: `9c22fb1e1d366c0b2da8891a86808c38cb360c1a`.
- Source committed candidate: `393b056eeaefa0fc421c2f1fa4ba329def9ed97c`.
- Source snapshot baseline: `30430e5`; 1,287 of 1,296 shared paths match AO's
  initial public snapshot exactly.
- Source working changes are separate and are not yet authorized for inclusion.
- Gateway trace: `tr-ao-sync-1006-9b8c35ca-2590-4513-8115-67f5ab168316`.
- Registered implementation task: `ts-be464c9a-0239-4457-a0f3-f80c2830755b`.

## Integration criteria

Preserve AO's public package metadata, README framing, existing published skills,
audit index, ignore rules, and tmux installation/isolation and CI failure reporting.
Import portable runtime, tests, contracts, migrations, doctor, release tooling,
dependency updates and their relevant documentation/evidence. Reconcile source
changes against the baseline instead of replacing AO wholesale. Do not import
local MCP configuration, sessions, memories, secrets, personal repository entries,
machine paths, or personal model and execution-permission preferences.

The operator explicitly authorized functional policy adaptations and use of
session agents after the Gateway denied the AO spawn. Public sol/fable defaults
are preserved. Antigravity permission bypass is opt-in. Personal repository
registrations are excluded. Source uncommitted changes remain outside the scope.

## Independent discovery findings

Read-only discovery by the separately assigned `compare_history` agent found:

- Source default-model tests disagree: structure checks expect sol/fable and
  Antigravity 3.7, while Gateway registry/profile checks expect luna/opus and
  Antigravity 3.8. Resolve the assertions against AO's public configuration.
- Provider support requires coherent capability registries, profile contract,
  repository allowlists, schemas, adapter wiring and tests. Copying adapters alone
  can leave all profile requests rejected by drift validation.
- Antigravity passes `--dangerously-skip-permissions` unconditionally. OpenCode's
  corresponding automatic mode is already opt-in through `AGENTS_OPENCODE_AUTO`.
- Local-model examples contain hardware-specific recommendations and an inaccurate
  universal locality claim when the serving endpoint can be remote.
- Preserve public manifest metadata while importing dependency constraints:
  cryptography addition, MCP minimum update, and ruff upper bound. The portable
  lock-generation script is unchanged; its final input digest must match the
  reconciled manifests.
- The disposable Redis CI service can be combined with AO's tmux fixes.

A machine-readable 677-path inventory is available in the local temporary file
`/tmp/ao-upstream-inventory.json`. A 647-path committed source delta is prepared at
`/tmp/ao-portable-upstream-candidate.patch`; it has not been applied and still
requires the public-product reconciliation described above. Temporary files are
working aids, not independent review or integration evidence.

## Verification and workflow state

Discovery was read-only and confirmed that the destination was clean and its Git
email was configured locally. No implementation tests or full gate have run.
The source has relevant tracked uncommitted changes and extensive untracked local
state; those are not part of the pinned committed candidate.

The Gateway accepted orchestration creation and task assignment using canonical
action `code.write`. The profile's example action `implement` was rejected with
`REQUEST_CONTEXT_DENIED`. A subsequent agent spawn targeting AO's gateway directory
was also rejected with `REQUEST_CONTEXT_DENIED`; no worker session was created.
The operator has been asked whether session agents may perform this integration
with independent review, without changing the Gateway configuration.

Next: settle policy and workflow boundaries, construct the public candidate,
run focused checks and `bash scripts/ci.sh` outside the sandbox, obtain an
independent verdict, commit with the requested identity and explicit paths, then
push and verify origin/main. No integration, release or verification success is
claimed at this checkpoint.

## Implementation checkpoint

Portable imports and public reconciliations are applied. Focused worker evidence:
168 Node tests passed; 11 model/CI structure checks passed; 29 documentation/metadata
checks passed; policy registry validation passed. A broader sandbox-only structure
run had 67 passes and 23 failures involving unavailable process containment and
stale inventory; it is not credited as passing. Inventories are now refreshed and
validated; the host gate will determine the candidate result.

No corporate copyright attribution was found in 1,893 publishable paths. MIT
metadata names Carlos Asensio Pizarro. Operational corporate tags/introduction
were generalized. Four newly imported historical review documents have explicit
email redaction notes; source commit identifiers and verdict text remain intact.
Upstream third-party license notices and negative portability test canaries stay.

Canonical pinned-uv lock regeneration and independent local dependency installs
are complete. npm reported six transitive advisories; compatible remediation is
being evaluated before final verification. No commit or push has occurred.

## Security compatibility checkpoint

Primary advisory refresh revealed additional production dependency advisories
that npm audit alone did not report. No waiver or severity suppression was
introduced. The old LangGraph 1.2.1 pin requires SDK <0.4, incompatible with the
patched SDK 0.4.4. PyPI metadata identifies LangGraph 1.2.5 as compatible. An
isolated environment with LangGraph 1.2.5 and SDK 0.4.4 executed the entire
LangGraph suite: 81 passed, 3 explicitly opt-in integration skips, 0 failed,
including test_implement_test_review_push_graph.py. This supports the deliberate
security pin update; the final installed graph still requires the full gate.

The earlier host manifest run was 78 passed and 1 bootstrap-wrapper failure
while dependency artifacts were changing. After snapshot refresh the same
wrapper and underlying bootstrap check each passed without production changes.
No earlier failing run is presented as success.

## Final verification checkpoint

Final implementation tree: `46b45bb78846ad775a1ad54a8a9f763007e93af5`.
The isolated snapshot HEAD tree matched the staged integration tree exactly.
`bash scripts/ci.sh` exited 0 with 2,619 passed, zero failed, 12 declared skips
and 2,631 total checks; errors were empty. Aggregate status remains
`infrastructure_unavailable` for the explicitly unavailable external integration
lanes; no unavailable coverage is credited as passed. Required real Redis 7.2
and the pinned tmux retained-channel probe executed. The immutable request and
machine-readable results are in `UPSTREAM_SYNC_2026_10_06-1_to_review.md` and
`UPSTREAM_SYNC_2026_10_06-1_gate.json`.

First and second full gates failed and were retained as diagnostic evidence.
Corrections covered public default expectations, bootstrap digest consistency,
CI's exact environment assertion and the isolated probe's owned tmux label.
The final gate used the existing public, hash-verified tmux Docker builder and
a separate disposable Redis container. No skip budget or security waiver was
relaxed. All 210 scanned dependency components have zero current advisories.

Gateway `artifact.put` for the implementation summary returned
`REQUEST_CONTEXT_DENIED`. The explicitly authorized session-agent fallback and
committed local review trail remain the evidence chain; no successful Gateway
artifact persistence is claimed. Independent verdict and integration follow
this checkpoint.
