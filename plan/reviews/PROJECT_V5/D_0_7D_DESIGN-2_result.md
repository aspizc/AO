# Project V5 D/0/07d Design Trial 2 — independent review result

## Verdict

**reviewed_KO**

The candidate closes the Trial 1 inventory contradiction and removes outer-harness
pathname deletion authority. It also replaces the former checkpoint summaries with
substantially stronger serial RED/GREEN/review contracts. It is still not build-ready.
Two P1 defects leave checkpoint 1 unable to produce authoritative candidate evidence:
the invoked worktree wrapper is not bound to the candidate before it controls the
materialization and evidence path, and the required stream-only Docker build cannot be
performed by the checked-in “existing” recipe that the sheet says to invoke.

Implementation **must not begin** from this verdict. `D_0_1_SPLICE` remains blocked.
This result authorizes no implementation, integration, promotion, tag, push, release,
support, publication, public splice, or cleanup-policy change.

## Reviewer and independence

- Reviewer: fresh Codex `gpt-5.6-sol` review session, reasoning effort `max`, service
  tier `priority`.
- Trace: `tr-d007d-design-t2-sol-a4d59b6e-052e-4c74-9dd1-2e0aa995eeb5`.
- This session did not author the candidate or request, did not implement any product or
  test change, did not delegate the verdict, and did not reuse the Trial 1 reviewer
  session.
- Independence is procedural and same-vendor. No cross-vendor diversity is claimed.
- The request and earlier reviews were treated as leads. The decisive findings were
  reproduced from the frozen Git objects, candidate text, and current checked-in build
  script.

## Authenticated identities and scope

### Immutable Trial 1 parent

- Commit: `462c65039538fa55e751dd2ead51b8507178b8ec`.
- Tree: `1fb950d0db4bd5029cf93079fca705b71d187ea7`.
- Subject: `review(v5): reject D/0/07d Design Trial 1 rebaseline`.
- The preserved request/result blobs remain, respectively,
  `e622764d2c8c6082d60d6d983a18f858a02ba51c` and
  `d2782b9a76ea9686d1c23aff7434cea91fcb581c`.

### Trial 2 candidate

- Commit: `f0c5813f0a9b989e98ae204b8aebb9f6210d82f1`.
- Tree: `966cd50d206eb23f1d89797855201294ffec6ae2`.
- Sole parent: the immutable Trial 1 KO above.
- Subject:
  `docs(plan): make D/0/07d build-ready (V5 D/0/07d Design Trial 2)`.
- Exact candidate pathset:
  - `plan/PROJECT_V5/D/0/07.md` — blob
    `0076855b76495917ffaec67cf658a0a771984b9b`, `+30/-21`;
  - `plan/PROJECT_V5/D/0/07d.md` — blob
    `40de7a667ca7c0b8f21c47e9c4b8d8ebee2c9432`, `+490/-77`.

### Request

- Commit: `4075736d8eafa022e844559279d31a0162af516d`.
- Tree: `b3b08d6e8b23525d1d40cd54c5c51a33363fd07e`.
- Sole parent: the Trial 2 candidate above.
- Subject:
  `docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 2)`.
- Exact request delta: add this trial's request artifact and modify only the review
  index with its separate pending row. The result path was absent.
- The two candidate blobs and both Trial 1 evidence blobs at the request tree equal the
  frozen values above.

### Declared baseline and hidden-change guard

- Product/test baseline: `d0bf521799b16f7d3300163ce40bd7dfca49864d`, tree
  `0c577aef5bd864c51bf60086b9b3cb5daa254000`.
- Candidate and request ranges both pass `git diff --check`.
- `baseline..request` changes no path under product source, tests, CI, policies,
  dependencies, lockfiles, or workflows. The candidate is a two-plan-file delta and
  the request is a two-review-file delta.
- `main` was observed at `837206cca88686020a5e079aab8c7f3c46548263`, tree
  `f3d7b83a130b9b5ed7230a054effb4dc61e3a752`, matching the Trial 1 observation.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No product-authority or deletion-policy weakening was found. |
| P1 | 2 | Candidate-verifier bootstrap is unbound; the required existing Docker recipe contradicts the required stream-only protocol. |
| P2 | 0 | No separate advisory finding. |

## Findings

### P1-1 — the wrapper that vouches for the candidate is not itself candidate-bound

The checkpoint commands execute
`tests/gateway/run_process_supervisor_session_port_real_host.sh` directly from the
calling worktree (`plan/PROJECT_V5/D/0/07d.md:348-366`, repeated at `:445-462` and
`:585-603`). That wrapper and its inner coordinator are allowed to control all decisive
provenance operations:

1. source/archive verification and staging (`:751-755`);
2. the custom-tmux build and output capture (`:756-766`);
3. creation and verification of the alleged clean candidate (`:767-773`);
4. launch of the isolated payload (`:782-798`); and
5. TAP parsing and evidence emission (`:799-801`).

The candidate materialization is created only at step 4, after the same unchecked
wrapper/coordinator has already selected and built the custom tmux input. Nothing in
the sheet requires the invoked wrapper bytes to equal the blob at
`D007D_CANDIDATE_SHA`, extracts/re-executes the coordinator from that commit, or binds a
separately trusted launcher to a frozen coordinator hash. A search of the complete
sheet found no `git archive`, `git show`, `git cat-file`, self-hash, or candidate-sourced
re-exec contract. Checkpoint 1's exact pathset permits the new wrapper but no independent
bootstrap (`:284-296`).

Consequently a dirty or replaced worktree wrapper can claim any candidate SHA/tree,
construct a genuine clean clone only for inspection, run different tests or build
inputs, and emit matching-looking TAP/JSON through the evidence fd. Mounting the later
candidate clone read-only does not repair this circular trust: the unbound verifier is
the component asserting that the mount, command, output, and evidence are authentic.
This defeats the sheet's candidate/tree provenance claim and admits a false GREEN.

Exact Trial 3 correction:

1. Move clean candidate materialization and SHA/tree/status authentication before every
   source-build, test, parser, and evidence action.
2. Define a minimal reviewer-owned launcher as the trust root. It must use only the
   read-only Git object database plus the explicit candidate SHA to create the
   no-hardlink materialization, verify detached `HEAD` and tree, then execute the
   wrapper/coordinator **from that materialization** by absolute path.
3. Freeze the launcher's exact command, allowed inputs, and hash/evidence responsibility;
   the candidate wrapper must not attest its own provenance. The evidence fd must be
   opened and owned by that launcher before candidate code starts.
4. Require the wrapper and all build patch/extension/script bytes to come from the same
   authenticated materialization, and add a RED that substitutes the ambient worktree
   wrapper while proving the candidate-sourced wrapper is the only one executed.
5. Apply that bootstrap identically to focused and full-CI fresh instances and record
   the candidate wrapper/coordinator blobs in each checkpoint handoff.

### P1-2 — the mandated existing builder cannot implement the mandated stream protocol

The sheet says the transient coordinator “invokes the existing digest-pinned Docker
build recipe” while requiring the verified archive and patch/extension inputs to cross
over stdin, the binary alone to cross stdout, and no host source/output staging mount to
exist (`plan/PROJECT_V5/D/0/07d.md:756-764`; acceptance at `:711-723`).

The unchanged existing recipe is
`gateway/vendor/tmux-agents/build-offline.sh`, blob
`dca11355e5acef80ffaccef564e1e216c1866dca` at both the declared baseline and request.
It cannot perform that protocol:

- it requires exactly two absolute pathname arguments and creates the output directory
  (`gateway/vendor/tmux-agents/build-offline.sh:9-32`);
- Docker bind-mounts the host source archive, package directory, and writable output
  directory (`:35-48`); and
- the container installs the binary into the host output mount (`:70`).

Checkpoint 1 excludes that script from its exact seven-path candidate and has no
conditional pathset (`plan/PROJECT_V5/D/0/07d.md:284-301`). Invoking it therefore
violates the no-host-staging rule; satisfying the stream rule requires replacing its
interface or independently inventing a different Docker program, neither of which the
plan authorizes or specifies. The Docker daemon also cannot resolve coordinator-private
tmpfs paths as host bind sources merely because the client runs inside that namespace.
This is a direct executability contradiction, not an unavailable-runtime limitation.

Exact Trial 3 correction while preserving the seven-path checkpoint scope:

1. Stop saying the wrapper invokes `build-offline.sh`; characterize that file only as
   the source recipe whose pinned semantics are being reproduced.
2. Freeze in the wrapper contract one exact Docker argv and one exact stdin/stdout
   protocol. The authenticated candidate wrapper must create a deterministic tar stream
   containing exactly the descriptor-verified source archive and the candidate-sourced
   patch and extension under frozen names, feed that single stream to container stdin,
   and require the container to validate all three manifest hashes before building.
3. The container command must send diagnostics only to stderr and the verified binary
   bytes only to stdout; the launcher must copy stdout into an already-open regular file
   on transient tmpfs, reject extra framing/trailing bytes, and then perform the frozen
   mode/owner/hash/version/extension checks.
4. Freeze a non-Docker unit RED for the exact stream protocol plus a Docker integration
   RED/GREEN in checkpoint 1, including assertions that the Docker argv has no bind
   mounts and that the existing pathname-based script is never invoked.

If the author instead wants to change and invoke `build-offline.sh`, Trial 3 must expand
the checkpoint pathset and review boundary explicitly; that materially different path is
not authorized by this verdict.

## Trial 1 closure adjudication

| Trial 1 finding | Trial 2 ruling |
|---|---|
| P1-1 — new test invalidated an immutable CI inventory | **Closed.** Checkpoint 1 alone owns the one `ci/suites.json:test.gateway.inventorySha256` refresh and forbids every other suite value change. Independent recomputation produced the frozen 123/124 counts and both hashes. |
| P1-2 — final-component pathname replacement could be deleted | **Closed.** The fixture owner and outer harness now have zero path-deletion authority; retained dirfds are evidence-only, pidfd signaling is limited to the exact server child, and namespace disposal is the sole reclamation path. The after-final-observation replacement RED is explicit. |
| P1-3 — checkpoints were not independently executable contracts | **Not closed.** The serial prerequisites, pathsets, RED/GREEN commands, subjects, and immutable review boundaries are now explicit, but checkpoint 1 still requires implementer invention at the verifier bootstrap and Docker-build boundaries described in P1-1/P1-2 above. |

## Independently verified reasoning

### CI inventory, registries, and links

- `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` returned
  `status:"passed"`, zero errors, and zero test/pass/fail/skip counts.
- The gate's own sorted newline-joined path algorithm independently produced:
  - current `test.gateway`: 123 paths and
    `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5`;
  - adding only `tests/gateway/process_supervisor_session_port.test.js`: 124 paths
    and
    `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
- Mechanical status-header enumeration, excluding the `D/0/07` index, returned 82
  executable sheets: 39 complete, 4 in progress, 39 planned, and 43 open. The four
  in-progress sheets are exactly `C/1/00`, `D/0/01`, `G/0/02`, and `H/0/01`.
- All 12 relative Markdown-link occurrences in the two candidate documents resolve.
  An expanded check over the candidate, request, Trial 1 result, and governing
  registries resolved 152/152 relative targets and anchors.

### Product/source premises

- At the declared baseline the session-port factory exists, selects default helper
  operations, returns the issuer separately, and leaves the ordinary seven-key execution
  DTO unchanged (`gateway/src/adapters/process_supervisor.js:2467-2480,2489-2615`).
- The helper still direct-executes literal provider argv with `os.execve`
  (`gateway/src/adapters/process_supervisor_helper.py:1255-1263`). The public service
  splice remains absent; `agent.ask` and `agent.view` still route through provider
  adapters (`gateway/src/services/agent_service.js:655-680`).
- Existing tests separately characterize the exact 24-byte
  `ready\nstatus\nack:status\n` snapshot and a default-helper write-sequence-1 /
  snapshot-sequence-2 transaction whose snapshot is instead
  `fixture-terminal-secret\n`. The candidate correctly does not relabel those separate
  fixtures as the future exact combined transaction.
- A safe injected construction-seam probe reproduced the checkpoint-3 RED premise. With
  a valid 24-byte response available, cancellation recorded after `B` and before parent
  response commit, current source resolved:

  ```json
  {"status":"resolved","value":{"sequence":1,"snapshot":"ready\nstatus\nack:status\n","snapshotBytes":24,"truncated":false}}
  ```

  This matches `performSessionPortOperation` accepting `ACTIVE`/`REVOKING`, decoding the
  response, returning its result, and forcing revocation only in `finally`
  (`gateway/src/adapters/process_supervisor.js:1734-1845`). The planned exact
  `SESSION_PORT_CANCELLED` correction is therefore source-grounded and distinct from
  write settlement and post-`R` cancellation.
- A safe exact-name codec probe passed 1/1, and the complete codec suite passed 26/26
  with zero failures/skips/cancellations. These were non-host-effect regressions, not
  evidence for the future D/0/07d real-host lane.

### Review-trail and lifecycle consistency

- The final D/0/07a Trial 3 and D/0/07b Trial 2 results are reviewed OK. The D/0/07c
  design amendments, implementation KO trail, Trial 7 fail-closed correction, and live
  gate-harness result preserve exact identity ownership, retained authority, no broad
  signal/reap, and outer containment requirements.
- Trial 2's zero-delete fixture-owner direction is compatible with the ratified
  D/0/07c product rule: exact port-owned pane/session retirement remains product work,
  while shared server/socket, sibling session, and replacement namespace entries remain
  preserved.
- No silent legal, commercial, security, regulatory, or deletion-policy decision was
  found. The KO is confined to deterministic build/provenance executability.

## Commands, outcomes, and limits

The review checklist totals are **14 pass / 2 fail / 3 skipped / 2
inconclusive**. The two failures are the P1 findings above, not runtime-test failures.

| Check | Outcome |
|---|---|
| Trial 1 → candidate → request parent/tree/subject chain | pass |
| Candidate blobs, numstat, and exact two-path scope | pass |
| Request exact two-path scope and absent result | pass |
| Trial 1 artifact immutability | pass |
| Baseline hidden product/test/policy/CI change guard | pass |
| Candidate and request `git diff --check` | pass |
| Canonical validator and 123/124 inventory recomputation | pass |
| 82/43 status accounting and four in-progress identities | pass |
| Candidate and governing relative links/anchors | pass |
| Current factory/direct-exec/public-splice premises | pass |
| Existing transaction/snapshot characterization distinction | pass |
| Safe cancel-before-`R` source probe | pass |
| Zero-deletion and final-replacement contract | pass |
| Serial checkpoint ancestry/review naming | pass |
| Candidate-bound verifier bootstrap | **fail — P1-1** |
| Existing builder versus stream-only protocol | **fail — P1-2** |
| Future checkpoint RED/GREEN and focused wrapper | skipped — artifacts do not exist |
| Future isolated full repository gate | skipped — artifacts do not exist |
| Docker/user-manager/bwrap/toolchain live prerequisite proof | skipped — not authorized or available for this design review |
| Future exact TAP manifest values | inconclusive — intentionally produced only by checkpoint 3 |
| Real-host process/namespace cleanup results | inconclusive — future implementation evidence |

No provider, tmux, Docker build, network, Redis, PostgreSQL, shared MCP service,
hosted CI, integration, promotion, tag, push, or release was exercised. No destructive
teardown or live signal was run. The worktree was clean before this immutable verdict
was written.

## Disposition

`reviewed_KO`

Trial 3 must make the verifier bootstrap candidate-bound before any build/evidence
operation and replace the impossible “invoke existing recipe” statement with the exact
stream-native build protocol described above. It must preserve the now-correct inventory
digest ownership, zero-deletion rule, serial checkpoint boundaries, source-grounded
cancel RED, canonical status arithmetic, and all release non-claims.

Implementation may not begin. `D_0_1_SPLICE` remains blocked, and no checkpoint or
final `D_0_7D` state is implied by this design review.
