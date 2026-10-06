# Review Submission — D/0/07c Live-Gate Harness (Trial 1)

## Requested reviewer

Assign a fresh independent reviewer that did not implement this correction.
Review the exact technical candidate against the strict process-tree ownership
contract in:

- [`D_0_7C-7_result.md`](D_0_7C-7_result.md);
- [`WAVE_2_STRUCTURE_LEAK_FIX-1_result.md`](WAVE_2_STRUCTURE_LEAK_FIX-1_result.md);
- [`plan/PROJECT_V5/D/0/07c.md`](../../PROJECT_V5/D/0/07c.md); and
- the authoritative suite-supervisor implementation in `scripts/ci_gate.py`.

This submission is evidence, not a self-verdict. Trial 1 is **pending**. The
reviewer-owned result path is `D_0_7C_GATE_HARNESS-1_result.md`; it does not
exist in this submission.

This is a supplemental test-harness correction for the integrated D/0/07c
candidate. It does not reopen the independently accepted Trial 7 product
implementation, change sheet counts, or claim integration, promotion, or
release.

## Candidate identity and state

Integrated D/0/07c base:

```text
commit 7127583a13d8dd28dc6dec359e0d15ab328cf8a5
tree   b0e9533693bd6c6b6b078f6120978c90e83ea18a
```

Technical correction:

```text
commit 3e807f216d5dd2004c5b5165bf1ea9dcd941551e
tree   64481fc53f2809779b3db3b7ab37c5f0d3892b7a
parent 7127583a13d8dd28dc6dec359e0d15ab328cf8a5
```

Exact technical pathset:

```text
tests/gateway/process_supervisor_caller_fixture.js
tests/gateway/process_supervisor_caller_harness.py
tests/gateway/process_supervisor_live.test.js
```

The technical candidate is implemented and verified only. It is not yet
independently reviewed, integrated into the Wave 2 candidate, promoted, or
released.

## Defect and root-cause ruling

The D/0/07c Trial 7 candidate passed the exact abrupt-supervisor test when run
directly, but the same test failed deterministically when run inside the real
CI suite supervisor.

The failing ownership sequence was:

1. the Node test killed the exact product supervisor;
2. the persistent product reaper detected liveness-pipe EOF, cleaned the
   utility tree, emitted `PROCESS_SUPERVISOR_LOST`, and exited;
3. the authoritative outer suite supervisor, which is a Linux child
   subreaper, adopted the exited product reaper;
4. the outer supervisor correctly deferred adopted-child collection until the
   root Node command returned;
5. the Node test treated the adopted reaper zombie's still-matching `/proc`
   identity as a live process and timed out waiting for it to disappear; and
6. after Node returned, the strict outer supervisor reaped the child and
   correctly classified the command as `process_tree_leak`.

The product cleanup was correct: the utility leader and escaped descendant
were already absent. Trial 7 did not cause the failure. The live test,
caller fixture, and relevant post-exec cleanup logic were unchanged between
the preceding candidate and Trial 7.

The defect was fixture ownership. An intentional orphan domain must use a
nested disposable subreaper, so the authoritative outer gate adopts zero
children. The outer gate must remain strict: even an adopted exited zombie is
a process-tree leak.

## Correction

The existing private-subreaper caller fixture gained a distinct
`supervisor-loss` protocol:

- activate the private Linux subreaper before creating the domain;
- retain and validate exact caller, supervisor, reaper, utility leader, and
  escaped-descendant identities;
- revalidate the exact supervisor identity immediately before a positive-PID
  `SIGKILL`;
- require the fixture caller to observe the product result
  `PROCESS_SUPERVISOR_LOST`;
- record direct-child adoption before reaping;
- accept only the exact retained product reaper as an adopted product child;
- fail if the supervisor, utility leader, escaped descendant, or any unknown
  process becomes an adopted child;
- call `waitpid` only for the exact retained reaper PID;
- require the reaper to exit normally;
- prove all five retained product identities absent;
- preserve an unrelated sentinel through the proof;
- reap the Node caller and prove that only the sentinel remains before
  returning; and
- use fixed monotonic bounds: four seconds for readiness, four seconds after
  supervisor loss, two seconds for caller exit, and a twelve-second outer
  `execFile` timeout.

The live test now runs this intentional orphan case through the private
harness and asserts the recorded identities, exact `[reaper]` adoption,
normal exact reaping, zero survivors, sentinel preservation, and finite
bounds.

The older abrupt-caller cases continue using the same private harness. Their
previous broad nonblocking reap was narrowed to waits authorized by retained
owned identities. No negative PID, process-group, shell, public tmux, or
repository scan is used as cleanup authority.

## Security invariants for independent review

The following are load-bearing acceptance conditions:

1. `scripts/ci_gate.py` remains unchanged and still treats every adopted
   child, including an exited zombie, as `process_tree_leak`.
2. `gateway/src/**` remains unchanged; the correction cannot hide a product
   defect by changing runtime behavior.
3. Immediately before signaling, the harness must match PID, start token,
   PGID, and SID for the exact supervisor.
4. The only product-domain child the private supervisor may adopt and reap in
   the corrected case is the exact retained reaper.
5. Adoption of the utility leader, escaped descendant, supervisor, or an
   unknown child is a failure even if that process later exits.
6. The unrelated sentinel remains live until evidence has been emitted and is
   then reaped by the harness itself.
7. All waits are finite and share one non-resetting post-loss deadline.
8. Error or teardown paths must leave any unproven process for the unchanged
   outer gate to reject; they must not broadly reap or signal it.
9. No provider output, prompt, snapshot, credential, environment secret, or
   source-derived text is added to the public test result.
10. No policy, manifest, dependency, lockfile, public contract, plan status,
    or sheet count changes.

## TDD evidence

### RED

The named live test was first routed through a not-yet-supported
`supervisor-loss` harness mode, before the fixture implementation existed.
The exact test failed 1/1 because the old harness killed the Node caller and
returned no `completionCode`; the assertion observed `undefined` instead of
`PROCESS_SUPERVISOR_LOST`.

The original uncorrected test was also reproduced three consecutive times
through `scripts.ci_gate._execute_command`. Every run failed after about
3.4–3.5 seconds and the unchanged outer supervisor returned
`process_tree_leak`.

### Final GREEN

The final committed source produced:

| Verification | Outcome |
|---|---|
| Exact named test directly | 1/1 passed |
| Exact named test through real `scripts.ci_gate._execute_command` | 5/5 consecutive `completed`, rc 0 |
| Post-mutation restored exact named test through real supervisor | `completed`, rc 0 |
| Full `tests/gateway/process_supervisor_live.test.js` | 12/12 passed |
| Focused outer-gate containment tests from exact commit `3e807f2` | 8/8 passed |
| Repository Gateway lint | passed |
| Explicit changed-JavaScript ESLint | passed |
| Ruff and no-bytecode Python compilation | passed |
| `git diff --check` | passed |

The eight focused containment cases cover timeout-tree cleanup, late detached
descendants, outer-subreaper ownership boundaries, cleanup-proof ordering and
completeness, entry-state restoration, adopted-descendant cleanup, and the
prior detached-maintenance regression.

Full repository CI is intentionally reserved for the orchestrator after an
independent verdict and integration into the exact Wave 2 candidate.

## Mutation strength

Each mutation was applied independently to the final source, exercised through
the unchanged real suite supervisor, then restored with an inverse patch:

| Mutation | Required outer result |
|---|---|
| Remove private `PR_SET_CHILD_SUBREAPER` activation | `process_tree_leak`, rc 1 |
| Disable exact local `waitpid(reaper_pid, WNOHANG)` | `process_tree_leak`, rc 1 |

Both mutations produced the required result. After restoration, all three
changed-source hashes matched their pre-mutation values exactly and the
contained probe returned `completed`, rc 0.

## Restricted-path identity and hygiene

At both the integrated base and technical candidate:

```text
bd0028c29167555839e8776767f5c55b6065c6310c96dde2f6722343632ebccc  scripts/ci_gate.py
a1eba71cc61977065b10d37cf1acd9b0c2467a19cb3f5b93300c5c263f76bfed  aggregate gateway/src hash
```

The technical range changes no path under:

```text
scripts/ci_gate.py
gateway/src/
policies/
ci/
plan/
```

It also changes no package manifest, lockfile, generated catalog, schema, or
public API contract. The pre-existing untracked `gateway/node_modules`
symlink was not staged or modified. Protected unrelated PIDs `1019690` and
`1020609` were never targeted.

## Required independent-review work

The reviewer must:

1. name the exact reviewed commit and tree;
2. verify the complete pathset and restricted-path hashes;
3. inspect the private-harness oracle for exact-reaper-only adoption and
   positive-PID signal authority;
4. verify no broad reap, broad signal, shell, or outer-gate relaxation can
   create a false GREEN;
5. rerun the exact test through the real suite supervisor and require outer
   status `completed`, not merely inner TAP success;
6. independently exercise at least the two load-bearing mutations in a
   disposable copy;
7. run the focused containment tests and applicable lint/syntax checks;
8. state any P0/P1/P2 findings explicitly; and
9. write only the append-only result and index update.

An OK verdict may authorize integration of this supplemental harness
correction into the Wave 2 candidate. It must not claim promotion, release, or
publication.
