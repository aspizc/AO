# Project V5 D/0/07d Design Trial 1 — independent review result

## Verdict

**reviewed_KO**

The rebaseline correctly distinguishes the historical absence of the session-port
factory from the composed `d0bf521` baseline, and most of its product, test,
provenance, and lifecycle claims are grounded. It is not yet build-ready. Three P1
findings leave the implementation path unsafe or internally impossible: the required
new test file invalidates the canonical CI inventory while the sheet forbids the
necessary manifest update; the proposed dirfd cleanup still has a final-component
replacement race; and the three durable checkpoints are not specified as independently
executable RED/GREEN/review units.

Implementation **must not begin** from this design verdict. `D_0_1_SPLICE` remains
blocked. This result authorizes no candidate edit, implementation, integration,
promotion, tag, release, support, publication, or public splice.

## Reviewer and independence

- Reviewer: Codex `gpt-5.6-sol`, reasoning effort `max`, service tier `priority`,
  selected by explicit operator override.
- Trace: `tr-d007d-design-t1-sol-efa5599e-7889-4db2-bba8-1ed53bd566f3`.
- This was a fresh procedural review session. It did not author the plan candidate or
  request, did not delegate, and did not ask another model for a verdict.
- Independence is procedural and same-vendor. No cross-vendor diversity is claimed.
- The author request and prior verdicts were treated as untrusted leads; the decisive
  findings below were reproduced against Git objects, the frozen-parent source, and the
  canonical CI validator.

## Authenticated identities and scope

### Candidate

- Commit: `c249e49becbef44b7385791be76e3f7ebb8afa93`.
- Tree: `a89518c0345a37086dee34c58f0e1671ddd34414`.
- Sole parent: `d0bf521799b16f7d3300163ce40bd7dfca49864d`, tree
  `0c577aef5bd864c51bf60086b9b3cb5daa254000`.
- Subject: `docs(plan): rebaseline D/0/07d real-host acceptance (V5 D/0/07d)`.
- Exact pathset:
  - `plan/PROJECT_V5/D/0/07.md` — blob
    `24de148feee2e1a48b7a34e7a50c472b39142801`, `+89/-55`;
  - `plan/PROJECT_V5/D/0/07d.md` — blob
    `dec7794b9955496394a45e987c195344465319e0`, `+280/-53`.

### Request

- Commit: `8a193e50d8a2891b6e42f43839b8000ef4c03955`.
- Tree: `6d125e35162bb126371c97903dc4c328d05aa3db`.
- Sole parent: the candidate above.
- Subject:
  `docs(review): request D/0/07d rebaseline review (V5 D/0/07d Design Trial 1)`.
- Exact pathset: the new request artifact and the one review-index update.

### Observed `main` and hidden-change check

- `main` resolved to `837206cca88686020a5e079aab8c7f3c46548263`, tree
  `f3d7b83a130b9b5ed7230a054effb4dc61e3a752`, matching the request's observation.
- The relevant Stage D plan, factory/helper/service, session-port tests, tmux package,
  and CI gate/suite bytes on `main` match `d0bf521`; the only broader review-directory
  differences are unrelated G review artifacts.
- Candidate scope contains two plan paths and zero product/test, policy, dependency,
  package, lockfile, workflow, registry, or status-index paths. Request scope contains
  exactly two review paths. Both ranges pass `git diff --check`.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No silent weakening of the ratified product authority contract was found. |
| P1 | 3 | Canonical CI inventory contradiction; unsafe final-component cleanup ambiguity; non-executable checkpoint decomposition. |
| P2 | 0 | No separate advisory finding. |

## Findings

### P1-1 — the mandatory new test makes the mandatory unchanged full-CI gate invalid

The sheet requires the new file
`tests/gateway/process_supervisor_session_port.test.js`
(`plan/PROJECT_V5/D/0/07d.md:208-216`) and requires `--full-ci` to invoke the
unchanged canonical `bash scripts/ci.sh` (`:414-418`). It simultaneously forbids any
CI manifest change in both Non-scope (`:61-64`) and Acceptance criteria (`:340-343`).

That combination cannot pass the frozen gate:

- `ci/suites.json:150-166` includes `tests/gateway/**/*.test.js` in
  `test.gateway` and pins its `inventorySha256` to
  `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5`.
- `scripts/ci_gate.py:193-215` discovers every matching file.
- `scripts/ci_gate.py:702-711` recomputes that path inventory and rejects a stale
  digest before running suites.
- Baseline validation passed with 123 discovered `test.gateway` paths and the pinned
  digest above. Adding only the mandated path produces 124 paths and digest
  `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
  The new path does not exist at the frozen parent, so this is not an already-accounted
  entry.

Reproduction:

```text
python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only
status=passed; tests=0 pass=0 fail=0 skip=0

python3 -c '<load test.gateway; discover_files; append the mandated path; inventory_digest>'
baseline_count=123
baseline_manifest=sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5
baseline_computed=sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5
new_path_present=false
hypothetical_count=124
hypothetical_computed=sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad
```

Exact next-trial correction: narrowly permit `ci/suites.json` in the expected
implementation pathset, assign the `test.gateway` inventory update to the same first
checkpoint that adds the new `.test.js` path, and require a passing `--validate-only`
result before either wrapper mode. Remove or qualify the two blanket no-CI-manifest
statements. `ci/suites-contract.json` need not change if its include/exclude contract is
unchanged. The alternative is to put all new tests in an already inventoried file, but
that would require removing the sheet's dedicated-file mandate.

### P1-2 — dirfd-relative cleanup does not bind deletion to the sealed final object

The GREEN design correctly binds the tmux server signal target to a pidfd, but it uses a
different and insufficient rule for filesystem removal. It says the owner revalidates a
sealed identity “immediately before” descriptor-relative cleanup and may then perform
“necessary outer cleanup” through no-follow dirfds
(`plan/PROJECT_V5/D/0/07d.md:183-196`). The RED substitutes the replacement before
teardown (`:88-121`); it does not substitute after the last identity read and before the
delete effect.

A retained parent dirfd closes ancestor replacement. It does not make
`unlinkat(dirfd, basename, 0)` or `unlinkat(..., AT_REMOVEDIR)` conditional on the final
entry's device/inode. The local `unlinkat(2)` contract confirms that the call resolves the
relative pathname at effect time and offers only `AT_REMOVEDIR`; it has no expected-inode
argument. A same-UID actor that replaces the basename after the revalidation and before
the call can therefore have its replacement removed. This is the same final-component
boundary documented in the ratified design history at
`D_0_7C_DESIGN-1_result.md:171-187`; it is independently confirmed by the local syscall
contract rather than accepted from that prior verdict.

The fixed owner, no-follow lookup, and mode-0700 workspace do not by themselves supply
exclusive mutation authority: the tested same-UID processes are deliberately capable of
creating the replacement. The proposed pre-call check is consequently check-then-act,
while the review mandate requires that no ambiguity can delete a replacement.

Exact next-trial correction: make transient tmpfs/mount-namespace disposal the sole path
reclamation mechanism after evidence, and prohibit fixture-owner `unlink`, `unlinkat`,
`rmdir`, rename, and recursive removal on every real-host teardown path—not only after a
pre-observed mismatch. Add an injected race that replaces the final entry after the last
identity observation and before the would-be removal, and assert zero mutation plus
replacement survival. The owner may close retained fds and signal the exact server only
through its pidfd.

That correction needs no new operator decision because it follows the already selected
preservation direction. If a later design instead seeks conditional pathname deletion or
claims exclusive directory-mutation authority, that is a new deletion-policy choice and
requires `plan/reviews/PROJECT_V5/D_0_7D_DESIGN_to_check_by_human.md` before
implementation.

### P1-3 — the three “durable checkpoints” are not independently executable contracts

The sheet promises three durable commits with separate RED/GREEN evidence, but supplies
only three summary bullets (`plan/PROJECT_V5/D/0/07d.md:222-231`) under one global pathset
(`:208-220`), one global Acceptance section (`:275-345`), and one global local gate
(`:347-418`). It does not give any checkpoint:

- an exact baseline/dependency and exclusive pathset;
- its own named RED command, expected failing assertion, and non-destructive controls;
- its own GREEN command and exact acceptance/verification outcome;
- a commit subject and immutable review-handoff/request path; or
- an explicit review boundary before the next checkpoint starts.

Checkpoint 2 may even be “prepared in parallel” with checkpoint 1 (`:227-229`), so the
sheet does not determine which commit owns fixture changes or which reviewed bytes
checkpoint 2 consumes. The wrapper also promises to verify exact TAP names/totals
(`:395-396`) without assigning the final name/count oracle to a checkpoint handoff.
An implementer would have to invent the commit/review partition that the plan says is
normative.

Exact next-trial correction: add three normative checkpoint subsections (or three
sub-sheets), each with Scope, TDD RED, TDD GREEN, Acceptance criteria, Verification,
exact initial/conditional pathsets, commit subject, immutable review request/result paths,
and a dependency on the prior reviewed checkpoint. Assign the CI-inventory update from
P1-1 to the checkpoint that creates the test file. Freeze the focused TAP name set and
total in the final checkpoint handoff. Each subsection must say that its local OK is not
the final `D_0_7D` verdict and does not unblock the splice.

## Verified code and plan reasoning

### Baseline composition and public routing

- Historical `a7c09b0` contains no
  `createProcessSupervisorSessionPortFactory`, `sessionPortIssuer`, helper session-port
  operations, PTY suite, or relay suite. Its helper closes fd 0 before direct `execve`,
  and its ordinary execution has the seven frozen keys. The candidate qualifies this as
  historical evidence rather than current state.
- At `d0bf521`, `createProcessSupervisorSessionPortFactory` exists at
  `process_supervisor.js:2489-2615`; the default persistent path selects
  `createHelperSessionPortOps(record)` at `:2569`; `createSessionPortIssuer` remains
  separate at `:1958-1968` and `:2614`; and the ordinary execution shape is unchanged.
- The helper builds literal relay argv at
  `process_supervisor_helper.py:4863-4877` and directly executes the provider. The
  metacharacter argument is one argv element in existing PTY/relay tests.
- The public splice is accurately described as absent. `agent_service.js:655-680`
  resolves the persisted tmux target and calls provider adapters; Codex and Claude still
  use `send-keys`/`capture-pane`. The internal session-port factory has no production
  caller outside its test suites.

### Existing complementary oracles

- The codec test proves the separate issuer, exact seven execution keys, write sequence
  1, and accepted byte count 6.
- The PTY test proves literal
  `[python, fixture, "--literal", "$(touch /tmp/never)"]`, exact `status\r`, direct
  foreground PTY identity, and no provider bytes in transcript/stdout/stderr.
- The relay snapshot probe returns exactly
  `ready\nstatus\nack:status\n`, 24 bytes, not truncated, with exact
  `capture-pane -p -N -T ... -S -400` ordering.
- The default real-helper relay test already combines write sequence 1 and snapshot
  sequence 2, but its 24-byte snapshot is `fixture-terminal-secret\n`; it therefore does
  not already prove the exact combined transaction required by 07d. The rebaseline's
  characterization-versus-RED distinction is correct.
- All five future exact test names are present only in the plan, as expected for a
  planned leaf; none is falsely claimed as implemented.

### RED/GREEN and cleanup direction

- The current relay harness uses pathname `kill-server`, `kill-session`, and recursive
  `fs.rmSync` (`process_supervisor_session_port_relay.test.js:294-423`); the PTY harness
  has the same kill-server/numeric-child/recursive-removal shape at `:152-245`.
  Therefore an injected recording-operations RED can observably fail without starting
  tmux, signalling, or deleting anything.
- Binding the directly spawned server with pidfd-first/two-read logic modeled on
  `scripts/ci_gate.py:980-1012`, and signalling only with
  `_pidfd_send_signal` as at `:1015-1022`, is a sound process-identity direction.
- The candidate clearly preserves the distinction between outer harness teardown and
  product cleanup through the retained shared-server connection. It does not silently
  forbid exact port-owned pane/session retirement, and it preserves the ratified shared
  server/socket and sibling-session survival rules.
- The remaining filesystem final-component gap is exactly P1-2; no broader product
  cleanup weakening was found.

### Tmux provenance and wrapper

- `gateway/vendor/tmux-agents/manifest.json` pins tmux 3.6a source SHA-256
  `b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759`,
  patch SHA-256
  `2526659ccfb17d3cc2a07171687379322e5a2caa79414e86ea4b6682aa98b2b3`,
  extension SHA-256
  `4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`,
  and builder image
  `node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9`.
- The existing Linux builder already uses `--pull never`, `--network none`,
  Linux/amd64, a read-only root, dropped capabilities, no-new-privileges, current UID/GID,
  read-only source/package mounts, and a private output mount. The proposed descriptor
  staging, clean materialization, bwrap namespaces, transient-unit limits, and no
  host-UID `RLIMIT_NPROC` fallback are coherent in principle after the findings above.
- Local binaries were present (`bwrap 0.11.1`, systemd 259, Docker CLI 29.5.2), but this
  review session had no user manager and no permission to inspect the Docker daemon.
  Those are recorded as unavailable prerequisites, not treated as plan proof or failure.

### Links and project arithmetic

- All 12 relative Markdown-link occurrences across the two candidate documents and the
  request resolve; there are no relative anchor failures.
- Direct status-header enumeration gives B–I as 14 complete, 4 in progress, and 39
  planned. Adding the delivered 25 A sheets gives
  `39 complete + 4 in progress + 39 planned = 82`, with 43 open.
- The four in-progress sheets are `C/1/00`, `D/0/01`, `G/0/02`, and `H/0/01`.
  `D/0/07` is an index and was excluded; `07a–d` are its four executable leaves.

## Commands, outcomes, and limitations

The review checklist totals are **12 pass / 3 fail / 2 skipped / 3
inconclusive**. The three failures are the P1 findings above, not runtime test
failures.

| Check | Exact outcome |
|---|---|
| Candidate and request commit/tree/parent/subject/path authentication | pass; 2 commits, both single-parent, exact 2-path sets |
| Current `main` identity and relevant-byte comparison | pass; exact requested SHA/tree, 0 relevant D/code path differences |
| Candidate/request scope and policy check | pass; candidate 2 plan paths, request 2 review paths, 0 policy/code/test/workflow/package paths |
| `git diff --check` for both committed ranges | pass; 2/2 ranges |
| Historical/current factory/helper/issuer/public-route trace | pass |
| Existing exact test names/values/bytes/sequences trace | pass |
| Baseline `ci_gate.py --validate-only` | pass; status `passed`, 0 tests / 0 pass / 0 fail / 0 skip |
| Hypothetical required-test inventory | **fail**; 123 → 124 paths and pinned digest mismatch (P1-1) |
| Final-component deletion model | **fail**; dirfd plus recheck has no expected-inode delete primitive (P1-2) |
| Per-checkpoint contract audit | **fail**; 0/3 checkpoints have their own full Acceptance and Verification contract (P1-3) |
| Relative links/anchors | pass; 3 documents, 12 links, 0 failures |
| Status/count enumeration | pass; 39/4/39 = 82, open 43, index excluded |
| Focused safe codec test | pass; TAP 1 test / 1 pass / 0 fail / 0 skipped / 0 cancelled |
| Safe snapshot fixture probe | pass; rc 0, exact 24-byte result and exact capture argv |
| Candidate and request whitespace after all probes | pass |
| Python structure suite | inconclusive; 0 tests run because the available Python lacked `pytest`; no dependency install was attempted |
| Pinned Docker-image availability | inconclusive; Docker daemon access denied before image inspection |
| User-manager/cgroup effectiveness | inconclusive; `systemctl --user` was unavailable in this review session |
| Current real PTY/relay suites | skipped by mandate; their existing outer teardown is the destructive behavior under review |
| Future `--focused` and `--full-ci` wrapper modes | skipped; wrapper, new tests, source archive, and sealed toolchain do not yet exist |

No live provider, network, Redis, PostgreSQL, shared MCP service, real-host teardown,
hosted CI, Darwin host, integration, promotion, or release was exercised. No runtime
implementation or hosted-CI result is inferred from this documentation review.

## Exact next-trial acceptance boundary

Design Trial 2 may return for independent review only after all three corrections are in
the committed plan:

1. reconcile the new `.test.js` path with canonical CI inventory validation and assign
   the mechanical `ci/suites.json` update to one checkpoint;
2. remove check-then-act filesystem deletion from real-host teardown and add the
   last-observation-to-effect replacement race, or stop for the named human deletion
   decision; and
3. materialize three independently executable checkpoint contracts with exact
   pathsets, RED/GREEN, Acceptance, Verification, commit, TAP, and immutable review
   handoff details.

Until then, implementation may not begin and no checkpoint, candidate, or verdict may be
consumed by `D_0_1_SPLICE`.

## Scope and lifecycle non-claims

This reviewer created only this immutable result and replaced only the pending Design
Trial 1 index cell with its KO link. No candidate plan, product code, tests, policies,
dependencies, workflows, prior evidence, statuses, or counts were edited. This KO is a
design-review state only: it does not imply implementation, integration, promotion,
release, support, publication, or movement of `main`, and it is not a verdict on any
future candidate.
