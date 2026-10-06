# C/1/00 Trial 11 — independent review result

Verdict: **KO**.

Execution profile: **GPT-5.6 Sol; reasoning: ultra; execution: Fast/Priority.**

This review is independent of the author. It inspected the submitted objects,
the prior KO, implementation, tests, CI contract, and documentation, and ran
independent focal and adversarial probes rather than accepting the Trial 11
request's claims.

## Reviewed identity and scope

- Authoritative Trial 10 `KO` / Trial 11 base:
  `3797b3c9e3383a156db3de411e8bf530dce01386`
  (`tree d3d4e52f7c91db38d5951e2e167746f3160d1b96`).
- Trial 11 technical commit:
  `c9c5f471b7cdd1effaefd704838bb071dcd8acaa`
  (`tree d254c3e421521f7d7b0c2ebd1bc7095e40c87a6b`).
- Trial 11 request commit:
  `cb917f7e5e2f3986a860adeb72bfdbbc92a51182`
  (`tree dcfb0fd69a6673afe0da27f09a5e444910ed506a`).
- The technical commit is the direct child of the authoritative Trial 10
  result. The request is the direct child of the technical commit and adds
  only `plan/reviews/PROJECT_V5/C_1_0-11_review.md`.
- The technical range contains the declared 19 files, 3,417 insertions, and
  310 deletions. No implementation is hidden in the request commit.

## Blocking findings

### P1 — both mandatory macOS rows have an unallowlisted Gateway skip

The canonical matrix does call the unchanged `scripts/ci.sh` for macOS Python
3.11 and 3.12 at `.github/workflows/ci.yml:31-36,69-72`, but its submitted skip
contract is not executable.

The Gateway focal contains two Linux-only tests:

- `tests/gateway/sync_process_deadline.test.js:918-920` skips
  `absolute runner deadline remains armed while adopted children drain` on
  every non-Linux platform.
- `tests/gateway/sync_process_deadline.test.js:2429-2431` skips
  `parent death signal contains the provider tree after the Node caller dies`
  on every non-Linux platform.

The `test.gateway` allowlist at `ci/suites.json:200-251` and its immutable
contract list only the second ID. Applying the two macOS-observed IDs to the
submitted `assess_test_result` function independently produced:

```text
test.gateway: unexpected skip ids: absolute runner deadline remains armed while adopted children drain
```

Both mandatory macOS rows are therefore guaranteed red after running the
otherwise-portable test, independently of whether the Darwin supervisor works.
The factual claims that only one Gateway sentinel is skipped and every other
required test runs on macOS are also false at
`docs/ci-contract.md:152-155`,
`docs/adr/ADR-007-remote-ci-safety-net.md:95-98`, and
`plan/PROJECT_V5/C/1/00.md:660-665`.

Minimal correction: account honestly for the adopted-child-drain test as a
second exact Darwin Gateway skip, reconcile the manifest, immutable contract,
tests, ADR/CI documentation, and sheet, and run both real macOS rows. Do not
represent the Linux-only subreaper guarantee as portable macOS evidence.

### P1 — malformed shebang images still escape preflight and invoke shell fallback

`hasSupportedExecutableHeader` accepts any first two bytes equal to `#!` at
`gateway/src/adapters/sync_process.js:142-155`. The preflight reads only four
bytes at lines 181-187, so it does not establish that a shebang contains a
syntactically usable interpreter.

Independent real 0700 runtime probes through `spawnSyncWithDeadline` observed:

```json
{"name":"bare-shebang","code":"SYNC_RUNNER_FAILED","runnerCode":"INVALID_CONTROL"}
{"name":"empty-interpreter","code":"SYNC_RUNNER_FAILED","runnerCode":"INVALID_CONTROL"}
{"name":"missing-interpreter","code":"SYNC_RUNNER_UNAVAILABLE"}
{"name":"plain-invalid","code":"SYNC_RUNNER_UNAVAILABLE"}
```

The first two files contained `#!\n` and `#!   \n`. They passed preflight,
reached Node's native `ENOEXEC` shell fallback, emitted no valid fd3/fd4
transcript, and exposed `SYNC_RUNNER_FAILED`. This is the same real invalid
loader class that Trial 10 required to expose only
`SYNC_RUNNER_UNAVAILABLE`, and it contradicts ADR-009's claim that no shell
fallback participates.

Minimal correction: validate a bounded complete shebang line from the already
nonblocking, regular-file descriptor, including nonempty supported interpreter
syntax, before launch. Regress bare, whitespace-only, truncated, missing, and
valid shebangs through the real native launch path and require every invalid
loader image to return only `SYNC_RUNNER_UNAVAILABLE`.

## Additional finding

### P2 — fd3/fd4 key ordering is not canonical

`controlTranscript` and `launchTranscript` use
`JSON.stringify(JSON.parse(line)) === line` at
`gateway/src/adapters/sync_process.js:249-281`. Parsing preserves the input
property insertion order, so every permutation of otherwise valid keys
round-trips. This rejects duplicate keys and whitespace but does not establish
one canonical wire order.

Independent hostile-transcript probes found all of these accepted:

```text
reversed READY keys                         -> provider status 0
reversed provider_outcome keys              -> provider status 0
both fd3 records with reversed keys          -> provider status 0
fd4 runtime_exec_error with reversed keys    -> SYNC_RUNNER_UNAVAILABLE
```

The implementation therefore does not meet the requested canonical JSON and
exact ordering contract for either hostile control fd. Existing tests cover
duplicate keys, extra keys, and record order, but not raw property order.

Minimal correction: define one raw serialization order for every allowed fd3
and fd4 record and validate the wire bytes against that order without first
discarding duplicate/order evidence. Add every-key-order adversarial cases for
READY, outcome v1, provider exec, runner error/deadline, launcher error, and
runtime exec records.

## Passing independent evidence and non-findings

- The focal synchronous boundary passed **41/41** on Linux.
- The CI-manifest focal passed **86/86** and the full structure suite passed
  **231/231**.
- `python scripts/ci_gate.py --validate-only` and both submitted-range
  `git diff --check` checks passed.
- The corrected fd4 launcher uses `execve`, marks fd4 close-on-exec, and binds
  a typed runtime failure to native exit 126. Provider outcome v1 binds native
  status/signal, provider exec binds native errno and 127/126, duplicate keys
  fail closed, and child setup failure has a distinct record.
- Line-by-line runner review found the Trial 10 ownership corrections present:
  signal and wait authority are adopted immediately after `fork`; READY
  promotes only signal authority to the reserved PGID; settlement kills the
  reserved group, revokes signal authority before exact reap, invalidates wait
  authority after reap, and restores the prior critical-signal mask. Linux
  retains `waitid(..., WNOWAIT)`, subreaping, `PR_SET_PDEATHSIG`, adopted
  session drain, two empty snapshots, and the timer through drain.
- The Darwin runner registers its observer before RELEASE and caches a
  registration-time NOTE_EXIT. The Darwin CI dispatch avoids the Linux
  pidfd/subreaper primitives and its constructor, registration, pipe-drain,
  observer, and post-reap seams retain group kill, exact wait, authority
  invalidation, handle closure, and mask restoration.
- The preflight-to-spawn/re-exec path has an ordinary mutable-filesystem
  content race, but the published contract binds an exact absolute configured
  path rather than an inode and does not declare an adversarial filesystem.
  It was not elevated beyond the concrete malformed-shebang failure above.
- The Darwin CI `Popen`/`getpgid` interval was reviewed but not elevated:
  `start_new_session=True` reserves PGID=PID before exec/Popen return, and the
  unreaped direct child retains exact wait authority before the validated PGID
  is adopted. No native macOS counterexample was available.
- No native macOS executor was available. This result does not convert Linux
  or deterministic Darwin seams into completed macOS Python 3.11/3.12 runs.

## Verification and integrity

- `node --test --test-reporter=tap tests/gateway/sync_process_deadline.test.js`
  — **41 passed, 0 failed**.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q tests/structure/test_ci_suite_manifest.py`
  — **86 passed, 0 failed**.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/python -m pytest -q tests/structure`
  — **231 passed, 0 failed**.
- `python scripts/ci_gate.py --validate-only` — passed.
- Independent macOS skip-accounting probe — one exact unexpected Gateway skip,
  as quoted in the first P1.
- Independent real runtime-header probe — two malformed shebangs misclassified,
  as quoted in the second P1.
- Independent fd3/fd4 raw-order probes — four reordered transcripts accepted,
  as quoted in the P2.
- A fresh offline CPython 3.11.15 environment with both repository-local
  editables ran the complete isolated gate with Redis, PostgreSQL, Temporal,
  real-provider, and shared-MCP variables absent. That run accounted for
  **1,197 tests / 1,183 passed / 12 skipped / 2 failed**; the two transient
  failures were in `test.gateway`
  (**824 tests / 813 passed / 9 skipped / 2 failed**). The aggregate JSON
  retained only the suite identity and the execution stream did not retain
  stable individual IDs, so this review does not invent them. The immediate
  exact Gateway rerun under the same isolated environment was
  **824 tests / 815 passed / 9 skipped / 0 failed**. No additional blocker is
  assigned to the non-reproduced pair.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
  The technical range changes no `message.*`, `agents:events`, coordination
  service/transport or Redis namespace, policy, migration, dependency manifest,
  or lockfile. Shared Redis/MCP, providers, credentials, policies, migrations,
  dependencies, and tmux were not used or changed.
- The candidate root-README hunk is independently reproduced as **4
  insertions / 2 deletions** with patch object
  `37122c64b631ae47f3d40001628f3c6700533122`. The orchestrator's recorded
  ownership resolution identifies the pre-existing user hunk separately at
  `+158`, patch object
  `f86945eab1bcb0780e71b535c43562457301c057`; the candidate hunk is at `+107`.
  Any future integration must preserve the user patch object
  `f86945eab1bcb0780e71b535c43562457301c057` byte-identically and use a
  semantic union, not whole-file ours/theirs. This KO authorizes no integration.
- The reviewer-owned temporary environment was removed. Trial 1-10 artifacts
  and the Trial 11 request were not edited.

## Final status

Task `V5 C/1/00`, Trial 11: **reviewed KO**.

Trial 11 cannot close while both mandatory macOS rows are structurally red, a
real malformed executable image still reaches shell fallback and the wrong
stable error, and the hostile fd3/fd4 parsers accept multiple property orders
as canonical. This result does not authorize integration, promotion, release,
or a Trial 11 `OK` claim.
