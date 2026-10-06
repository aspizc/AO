# Project V5 D/0/07d Design Trial 2 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-2`
- Requested reviewer: a fresh, independent Codex session using
  `gpt-5.6-sol`, reasoning `max`, service tier `priority`
- Request artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_to_review.md`
- Required verdict artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-2_result.md`
- Current state: `pending`; this author-owned request contains no verdict

The reviewer must be distinct from the reused Design Trial 1 plan-author session. A
receipt, coordination message, checkpoint result, or this request is not approval.
Implementation remains forbidden unless this exact Design Trial 2 candidate receives a
fresh independent `OK`.

## Frozen candidate identity

| Identity | Value |
|---|---|
| Candidate commit | `f0c5813f0a9b989e98ae204b8aebb9f6210d82f1` |
| Candidate tree | `966cd50d206eb23f1d89797855201294ffec6ae2` |
| Candidate parent | `462c65039538fa55e751dd2ead51b8507178b8ec` |
| Candidate-parent tree | `1fb950d0db4bd5029cf93079fca705b71d187ea7` |
| Candidate-parent state | immutable Design Trial 1 reviewed KO |
| Candidate subject | `docs(plan): make D/0/07d build-ready (V5 D/0/07d Design Trial 2)` |
| Declared product/test baseline | `d0bf521799b16f7d3300163ce40bd7dfca49864d` |
| Declared baseline tree | `0c577aef5bd864c51bf60086b9b3cb5daa254000` |

The complete candidate pathset is exactly:

```text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07d.md
```

Frozen candidate blobs and parent-to-candidate diff limits:

| Path | Candidate blob | Numstat |
|---|---|---:|
| `plan/PROJECT_V5/D/0/07.md` | `0076855b76495917ffaec67cf658a0a771984b9b` | `30 insertions, 21 deletions` |
| `plan/PROJECT_V5/D/0/07d.md` | `40de7a667ca7c0b8f21c47e9c4b8d8ebee2c9432` | `490 insertions, 77 deletions` |

No source, test, fixture, policy, dependency, package, lockfile, workflow, CI
manifest, review artifact, status registry, or unrelated plan file is part of the
candidate commit.

## Frozen request-commit contract

The review handoff commit must be a single-parent direct child of the candidate above.
Its parent and parent tree are therefore frozen before request creation:

| Request property | Required value |
|---|---|
| Direct parent | `f0c5813f0a9b989e98ae204b8aebb9f6210d82f1` |
| Parent tree | `966cd50d206eb23f1d89797855201294ffec6ae2` |
| Subject | `docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 2)` |
| Exact request pathset | this new request plus `plan/PROJECT_V5/reviews/README.md` |
| Index delta | append exactly one separate pending Design Trial 2 row; preserve Trial 1 |
| Result path at commit | absent |

The request commit and tree necessarily include this file and cannot embed their own
hashes without self-reference. The reviewer must resolve the request branch tip, freeze
its full commit/tree in the result, verify the single parent and exact two-path delta
above, and prove the two candidate blobs at the request tree still equal the frozen
blobs. Any other request parent, tree delta, path, subject, or rewritten Trial 1 evidence
is a failed identity gate.

Before this request delta, the preserved Trial 1 artifacts have these blobs:

| Artifact | Blob |
|---|---|
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_to_review.md` | `e622764d2c8c6082d60d6d983a18f858a02ba51c` |
| `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_result.md` | `d2782b9a76ea9686d1c23aff7434cea91fcb581c` |

## Trial 1 P1 closure

### P1-1 — canonical CI inventory is now executable

The candidate removes the contradictory blanket prohibition and permits one exact CI
metadata edit only: checkpoint 1 owns the mechanical
`ci/suites.json:test.gateway.inventorySha256` transition caused by creating
`tests/gateway/process_supervisor_session_port.test.js`.

- Current inventory: 123 paths,
  `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5`.
- Inventory with the one dedicated test: 124 paths,
  `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
- No include, exclude, argv, classification, skip, suite-contract, CI-script,
  workflow, package, dependency, or lock value may change.
- `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` is a hard
  preflight immediately before both focused and full wrapper modes and inside each
  fresh materialization.

Checkpoint 1 freezes the complete seven-path implementation candidate and has no
conditional pathset. Another required path stops implementation and returns to plan
review.

### P1-2 — final-component deletion authority is eliminated

The fixture owner and outer real-host teardown now have zero path-deletion authority on
every branch. They never call `unlink`, `unlinkat`, `rmdir`, rename, recursive removal,
or another path deletion, even after a matching observation. Retained dirfds are
evidence-only; retained fds close; only the directly spawned, still-live server child
may receive TERM/KILL through its bound pidfd.

The first checkpoint owns two non-destructive recording-operation REDs. The second
substitutes the final entry after the last identity observation and before the old
would-be effect, and requires zero path calls plus replacement survival. Preservation
evidence is emitted first, retained-fd closure is durably confirmed, and kernel disposal
of the transient tmpfs/mount namespace is the sole path reclamation. The candidate does
not invent conditional deletion or exclusive directory authority, so no human deletion-
policy artifact is required.

The transient-unit coordinator also keeps build and test staging inside that namespace:
descriptor-verified build inputs and the verified binary cross the Docker boundary as
streams, not host staging paths. The build container receives no Docker socket, and the
test payload receives neither the socket nor mutable host staging.

### P1-3 — all three checkpoints are independently executable

The former three summary bullets are replaced by normative serial contracts:

1. checkpoint 1 creates the dedicated test, sealed fixture owner, isolated wrapper,
   exact inventory update, teardown RED/GREEN, and its own review artifacts;
2. checkpoint 2 starts only from the exact checkpoint-1 commit authenticated by an
   independent OK, owns the exact transaction fixture/test and any separately proven
   minimum product correction, and has its own review artifacts; and
3. checkpoint 3 starts only from the exact reviewed checkpoint-2 bytes, owns the full
   race/cleanup gate and one source-grounded snapshot-cancel-before-`R` correction, and
   has its own review artifacts.

Each contract specifies its exact prerequisite, scope/non-scope, complete initial and
conditional pathsets, named RED command and exact failing oracle, GREEN command and
exact totals, acceptance checklist, verification commands, conventional implementation
and request subjects, immutable request/result filenames, and independent boundary. No
later checkpoint may be prepared before the prior result is OK. Every checkpoint OK is
intermediate evidence only: none is final `D_0_7D` and none unblocks
`D_0_1_SPLICE`.

Checkpoint 3's request must copy the complete execution-order focused TAP name array,
concrete integer total, names SHA-256, TAP SHA-256, candidate SHA/tree, and zero failure,
skip, and cancellation counts from canonical JSON emitted through an already-open
evidence fd. The author recomputes `SHA-256(name + "\n")` and checks
`names.length === tests`; the independent reviewer repeats that derivation. Focused and
full-CI runs remain serial, independent fresh instances with fail-closed prerequisites
and skip handling.

## Additional build-readiness correction

Checkpoint 3 no longer relies on an unspecified “at least one test fails” premise. It
freezes this exact behavioral RED:

> `returns SESSION_PORT_CANCELLED when snapshot cancel wins after B and before R`

On the declared baseline, `performSessionPortOperation` permits `REVOKING` through the
response-validation path and forces revocation only in `finally`
(`gateway/src/adapters/process_supervisor.js:1793-1845`). With a valid 24-byte response
held before parent commit, cancellation is already recorded but the exact current result
is the successful sequence-1 snapshot. The frozen contract instead requires the exact
`ProcessSupervisorSessionPortError` with code `SESSION_PORT_CANCELLED`, message
`session port operation was cancelled`, phase `lifecycle`, and no payload. The smallest
parent settlement correction is in checkpoint 3's initial pathset; it must not change
write settlement or post-`R` cancellation. The real-host companion separately proves
the actual relay barrier was acknowledged before cancellation.

The three parent-mandated ordering cases remain a separate exact three-test command and
must return three passes with zero fail/skip/cancel.

## Preserved verified truths

The candidate retains all previously accepted grounding:

- Historical `a7c09b0` composition absence is distinct from the current declared
  `d0bf521` baseline.
- At `d0bf521`, the reviewed `07a–c` factory/helper path is composed, returns the issuer
  separately from the unchanged seven-key execution, and direct-executes literal argv.
- The public service/adapter splice is absent; `agent.ask` and `agent.view` still use the
  provider adapters. Only final independent `D_0_7D` may unblock `D_0_1_SPLICE`.
- The combined transaction remains exact: write sequence 1/accepted bytes 6; snapshot
  sequence 2 with `ready\nstatus\nack:status\n`, 24 bytes, not truncated; exact
  observation DTO and literal metacharacter argv; no provider, shell, or `send-keys`.
- Process authority is pidfd-bound; provenance, clean-candidate, namespace, resource,
  no-network, no-credential, and fail-closed prerequisite rules remain mandatory.
- Product cleanup, terminal-ledger, relay-key, retained namespace, process/tmux survivor,
  shared-server, sibling-session, lifecycle, and release non-claims remain frozen by the
  parent. Outer-harness zero deletion does not prohibit exact product pane/session
  retirement through its retained connection.
- `D/0/07` remains an index, not an executable sheet. Project arithmetic remains
  `39 complete + 4 in progress + 39 planned = 82`, with 43 open and exactly
  `C/1/00`, `D/0/01`, `G/0/02`, and `H/0/01` in progress.

## Independent review questions

Return `OK` only if the frozen candidate is build-ready and every item below is true;
otherwise return `KO` with prioritized file/line-grounded findings:

- Candidate and request lineage, trees, exact pathsets, subjects, blobs, and immutable
  Trial 1 evidence authenticate exactly as specified.
- The sole `ci/suites.json` digest update is sufficient and exactly owned by checkpoint
  1; no wording still makes it impossible or opens another CI/dependency change.
- No fixture-owner or outer real-host branch retains a check-then-delete effect or any
  path-deletion authority; namespace disposal is genuinely the sole reclamation path.
- Each checkpoint is independently implementable and reviewable without inventing a
  baseline, path, RED/GREEN oracle, command, acceptance rule, or commit boundary.
- Checkpoints 2 and 3 consume the exact prior reviewed bytes, with no parallel
  preparation or ambiguous fixture ownership.
- The snapshot-cancel RED is source-grounded, exact, and compatible with the frozen
  first-cause/interval contract; its correction does not weaken writes or post-`R`
  success.
- Final focused TAP names/count authentication and the serial independent full-CI replay
  are deterministic and fail closed on every missing prerequisite, new skip, D/0/07d
  skip, mismatch, timeout, residue, or DEFERRED-as-pass result.
- Historical/current composition, exact transaction, public-splice absence, provider-
  free direct exec, pidfd identity, provenance, lifecycle claims, parent invariants,
  and 82/43 arithmetic remain accurate.
- The candidate claims only planned/pending design state. It contains no implementation,
  self-review, integration, promotion, release, hosted-CI, or product-support claim and
  makes no silent legal/commercial/security/regulatory/deletion-policy choice.

The verdict must identify its fresh reviewer session/profile, freeze the exact candidate
and request commit/tree identities, record commands and evidence examined, and explicitly
state whether implementation may begin. It must not claim integration, promotion,
release, or that `D_0_1_SPLICE` is unblocked.

## Author-side verification recorded before handoff

- All files mandated by the Trial 2 author prompt, including the complete Trial 1 KO and
  every cited CI/cleanup/wrapper/historical source artifact, were read before editing.
- `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only` returned exact status
  `passed`, zero errors, and zero test/pass/fail/skip counts.
- The gate's own sorted-path digest algorithm was applied to `test.gateway`: current is
  exactly 123 paths/`132a…a44f5`; adding only the dedicated test is exactly 124 paths/
  `cc4b…7bad`; the full hashes are frozen above.
- `git diff --check 462c65039538fa55e751dd2ead51b8507178b8ec..f0c5813f0a9b989e98ae204b8aebb9f6210d82f1`
  passed.
- `git show --format= --name-only f0c5813f0a9b989e98ae204b8aebb9f6210d82f1`
  contains exactly the two candidate paths, with the blobs and numstat above.
- All 12 relative Markdown-link occurrences across the two candidate documents resolve;
  source anchors touched by the correction were checked against code bytes unchanged
  from the declared baseline.
- Canonical plan registries and the candidate parent agree on 39 complete, 4 in progress,
  39 planned, 82 total, and 43 open; the parent index is excluded.
- A safe exact-name Node probe of
  `process_supervisor_session_port_codec.test.js` returned exactly one test, one pass,
  zero fail/skip/cancel, confirming the planned anchored `--test-name-pattern` behavior.
- The candidate commit was made on `plan/V5-D-0-07d-rebaseline` with an explicit two-path
  pathspec from the immutable reviewed-KO parent. No prior review artifact changed.

No implementation or authoritative real-host runtime gate was run. The dedicated test,
fixture owner, wrapper, and checkpoint candidates do not exist yet. The external pinned
tmux archive, Docker daemon/image proof, pre-provisioned read-only toolchain and Node
modules, user-manager/cgroup delegation, transient-unit tmpfs, and final focused manifest
were unavailable or future prerequisites. Consequently checkpoint RED/GREEN commands,
the isolated focused mode, and the independent full repository gate remain unrun and are
not inferred. No live provider, network, Redis, PostgreSQL, shared MCP service, hosted CI,
integration, promotion, tag, push, or release was exercised.

## Status

`pending` fresh independent Design Trial 2 review. The required result path is absent at
request creation. This request is not a verdict, and implementation remains forbidden
until that result is independently `OK` for the exact authenticated candidate.
