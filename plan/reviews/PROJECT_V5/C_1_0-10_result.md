# C/1/00 Trial 10 — independent review result

Verdict: **KO**.

Execution profile: **GPT-5.6 Sol, ultra reasoning, Priority/Fast.**

This review is independent of the author. It inspected and exercised the
submitted objects rather than accepting the Trial 10 request's claims.

## Reviewed identity and scope

- Authoritative Trial 9 `KO` / Trial 10 base:
  `c3d2e7388bc4d1c4d83c34596811c386c67126c5`
  (`tree b66bb1f729f12f51d404a9241a40d564fa898a76`).
- Trial 10 technical commit:
  `e5015370917df3c702ff2237524296f91c4da7e5`
  (`tree 4bfcd0444c49210355ed498767dc91956dea2142`).
- Trial 10 request commit:
  `57fe5df1166212a4e0820e88320dc88d44deb531`
  (`tree 2a47b5311234104073f006c727f6207c35bd11d2`).
- The technical commit is the direct child of the Trial 9 result. The request
  commit is the direct child of the technical commit.
- The request-only commit adds exactly
  `plan/reviews/PROJECT_V5/C_1_0-10_review.md`.
- The technical range contains the declared 13 files, 1,349 insertions, and
  137 deletions. No implementation is hidden in the request commit.

## Blocking findings

### P1 — the mandatory macOS full-CI rows cannot pass

The workflow adds macOS Python 3.11 and 3.12 rows at
`.github/workflows/ci.yml:31-36` and sends every row through the same full
entry point at `.github/workflows/ci.yml:69-72`. That entry point executes
`scripts/ci_gate.py` unconditionally at `scripts/ci.sh:7`.

The gate is not portable to macOS:

- `scripts/ci_gate.py:857-878` requires the Linux `pidfd_open` libc symbol.
- `scripts/ci_gate.py:1039-1069` requires Linux `/proc` identities.
- `scripts/ci_gate.py:1095-1134` requires Linux pidfds and `prctl` child
  subreaping.
- The ordinary command path unconditionally acquires a helper pidfd at
  `scripts/ci_gate.py:1915-1955`; there is no Darwin branch before that call.

An independent missing-libc seam on the submitted gate failed before it could
run `/bin/true`:

```text
ProcessCleanupError: cannot acquire suite supervisor pidfd
```

There is a second independent matrix failure. Seven focal tests are explicitly
Linux-only at
`tests/gateway/sync_process_deadline.test.js:1357-1737`. The `test.gateway`
manifest allows only the nine PostgreSQL skips at `ci/suites.json:104-170`,
while `scripts/ci_gate.py:816-829` rejects every unlisted skip. Applying the
actual seven macOS skip names to that submitted accounting function produced:

```text
test.gateway: unexpected skip ids: a completed leader returns its status after
reaping a long-lived child, deadline cleanup is confined to the provider PGID
when the leader waits, maxBuffer cleanup reaps a resistant provider group
without rewriting ENOBUFS, near-deadline maxBuffer overflow keeps ENOBUFS and
leaves no process tree, parent death signal contains the provider tree after
the Node caller dies, runner-owned timer contains the provider when the native
timeout is delayed, the strict 20ms deadline remains bounded
```

Therefore both new macOS rows are guaranteed red: first at Linux-only gate
supervision, and again at skip accounting even if supervision were bypassed.
The claim that CI exercises real macOS settlement at
`docs/adr/ADR-009-synchronous-provider-boundary.md:130-131` is not true for an
executable gate.

The reviewer environment is Linux and the repository has no configured remote
or macOS executor, so no local macOS execution is claimed. That absence alone
would not be a blocker if the committed mandatory matrix were viable. Here the
committed gate is deterministically non-viable.

Minimal correction: make the single canonical `scripts/ci.sh` gate use a
Darwin-safe owned-process supervisor and platform-honest skip contract without
duplicating test logic. Then execute both mandatory macOS Python rows and
retain their real provider-settlement evidence.

### P1 — real runner `ENOEXEC` still maps to the wrong stable error

`gateway/src/adapters/sync_process.js:7,247-249` maps `ENOEXEC` to
`SYNC_RUNNER_UNAVAILABLE` only when Node returns it in `result.error`.
`tests/gateway/sync_process_deadline.test.js:918-951` proves that mocked shape,
not a real native launch.

With a real mode-`0700` invalid executable image configured as
`runnerPythonBin`, Node's native launch path shell-fell back, returned status
127 with no `result.error`, and emitted no fd3 transcript. The submitted
boundary therefore took `gateway/src/adapters/sync_process.js:268-273` and
reported:

```json
{
  "ENOENT": {"code": "SYNC_RUNNER_UNAVAILABLE"},
  "EACCES": {"code": "SYNC_RUNNER_UNAVAILABLE"},
  "ENOEXEC": {"code": "SYNC_RUNNER_FAILED"}
}
```

A direct native characterization of the same invalid image was:

```text
status=127 signal=null error=undefined
stderr="<invalid runtime>: 1: this: not found"
```

This violates the explicit Trial 10 requirement that native runner launch
`ENOENT`, `EACCES`, and `ENOEXEC` all use
`SYNC_RUNNER_UNAVAILABLE`. The real startup tests at
`tests/gateway/sync_process_deadline.test.js:1002-1052` cover non-executable
`EACCES`, `/bin/false`, and bad runner source, but not an executable invalid
runtime image.

Minimal correction: establish and regress the classification using a real
`ENOEXEC` image through Node's actual launch behavior. Do not infer success
from an injected `result.error` shape that the supported native path does not
produce.

### P1 — a terminal `SETTLED` record does not bind the provider status or signal

The terminal provider record contains only generic `SETTLED` at
`gateway/src/adapters/sync_process.js:138-142`. The runner writes it at
`gateway/src/adapters/sync_process_runner.py:720-721`, then mirrors the
provider status or signal only afterward at
`gateway/src/adapters/sync_process_runner.py:722`. JavaScript accepts whatever
native runner status or signal follows that generic record at
`gateway/src/adapters/sync_process.js:275-303`.

An independent real custom-runner probe wrote the exact accepted
`READY + SETTLED` transcript and then killed the runner itself with `SIGKILL`.
No provider was launched. The public result was nevertheless:

```json
{"status":null,"signal":"SIGKILL","stderr":""}
```

The existing synthetic assertion at
`tests/gateway/sync_process_deadline.test.js:1097-1124` explicitly accepts
`READY + SETTLED + SIGKILL`, so it cannot distinguish a provider signal from a
runner signal. An OOM kill, external kill, or runner failure in the
write-to-propagate interval can therefore impersonate a genuine provider
signal and be durably attributed as provider failure.

Minimal correction: make the terminal transcript authenticate the exact
observed provider exit/signal outcome and compare it with the native runner
shape. Any mismatch must be a stable runner failure, while genuine provider
exits 1/125/137/143 and `SIGTERM`/`SIGKILL` must retain their native public
shapes.

### P1 — the Darwin gate is not exception-safe at its ownership boundaries

The normal ordering is correct, but two deterministic seams expose unowned
failure windows.

First, the parent blocks only `SIGTERM` and `SIGALRM`, forks, and then performs
raw descriptor closes before entering `release_darwin_provider` at
`gateway/src/adapters/sync_process_runner.py:644-696`. If a close fails or an
unblocked asynchronous exception arrives at
`gateway/src/adapters/sync_process_runner.py:685-689`, `provider_pid` is still
unset. The `BaseException` handler at
`gateway/src/adapters/sync_process_runner.py:739-743` therefore has no child
kill authority and enters `reap_all_children()` while:

- the child waits for RELEASE at
  `gateway/src/adapters/sync_process_runner.py:667-673`;
- the parent still owns the RELEASE writer; and
- both deadline-control signals remain blocked.

The independent seam observed exactly:

```text
mask(SIG_BLOCK, {SIGTERM,SIGALRM})
fork-parent(47004)
close-attempt(exec_error_write)
main-caught(KeyboardInterrupt, provider_pid=None)
cleanup-kill-authority=None
reap-all-would-wait(child=47004, release-writer-still-open)
```

Second, `release_darwin_provider` writes the consumable `G` at
`gateway/src/adapters/sync_process_runner.py:590` but sets `released = True`
only at line 591. A trace-injected exception on line 591 independently
produced:

```text
write(release_fd, b"G")
kill(child_pid, SIGKILL)
reap(child_pid)
```

No `killpg` occurred because cleanup still considered the child unreleased,
although the child could already have consumed `G`, restored its mask,
executed, and forked. Darwin has no subreaper to recover escaped descendants.
The helper-level seams at
`tests/gateway/sync_process_deadline.test.js:361-442` cover a failed write and
a later mask failure, but not a successful RELEASE followed by an exception,
nor the pre-helper parent handoff.

Minimal correction: transfer ownership to one exception-safe gate state
machine immediately after fork, with all descriptors and the previous signal
mask under `finally` cleanup. Cleanup state must become post-release before the
child can consume RELEASE, and every pre/post-release failure must retain exact
child or reserved-PGID authority without waiting on an open gate.

## Additional findings

### P2 — leader reaping and identity invalidation have an unmasked exception gap

Settlement blocks only `{SIGTERM, SIGALRM}` at
`gateway/src/adapters/sync_process_runner.py:32,455`. `wait_for()` reaps the
leader at lines 293-300 and returns through line 458, but
`provider_leader_reaped` is not set until line 459 and `provider_pid` is never
cleared.

An independent line seam after successful reap left:

```text
provider_leader_reaped=False
provider_pid=47002
```

The main fallback then addresses the stale PGID and, when that lookup misses,
the stale numeric PID at
`gateway/src/adapters/sync_process_runner.py:251-263`. A newly reused identity
can therefore be signalled after the owned child has already been reaped.

Minimal correction: make reap plus identity invalidation non-interruptible for
every catchable exception that the outer handler recovers from, clear
`provider_pid`, and never use direct fallback authority after the child
identity has been reaped.

### P2 — malformed but parseable transcript ambiguity does not fail closed

`controlTranscript` uses ordinary `JSON.parse` at
`gateway/src/adapters/sync_process.js:105-129`, after which
`isExactRecord` at lines 31-42 can no longer detect duplicate JSON property
names. The provider-exec validator at lines 158-167 also accepts `code` and
`errno` independently without checking that they describe the same native
error.

Independent adversarial records produced:

```json
{
  "duplicateKindKeys": "accepted as provider status 0",
  "providerExecMismatch": {"code":"ENOENT","errno":-13}
}
```

The first wire record contained two `kind` properties. The second claimed
`code="ENOENT"` with the `EACCES` errno. Both crossed the supposedly exact,
fail-closed transcript boundary.

Minimal correction: reject duplicate wire keys before object normalization and
validate provider exec code/errno consistency. Extend the malformed transcript
table beyond extra keys and duplicate records.

### P2 — the Stage C status index is stale

`plan/PROJECT_V5/C/README.md:6-8,23` still says Trials 1-8 are KO and Trial 9
is pending. The authoritative sheet at `plan/PROJECT_V5/C/1/00.md:5` says
Trials 1-9 are KO and Trial 10 is pending. This contradicts the requested
documentation-truth scope.

## Passing independent evidence

The findings above do not erase the following independently verified
corrections:

- Focal synchronous-boundary suite: **30/30 passed**.
- Lifecycle/config/schema/concrete-adapter bundle: **227/227 passed**.
- The deterministic ENOBUFS collision retained native `ENOBUFS` when the
  post-cleanup clock reached the deadline.
- A ready-only truncated terminal control record retained `ENOBUFS`,
  `SIGKILL`, raw fd3 handling, UTF-16LE provider decoding, and a three-element
  public `output` array.
- Real provider output remained native-equivalent for Buffer/default, UTF-8,
  hex, base64, and UTF-16LE. Real provider `ENOENT`, exits
  1/125/137/143, `SIGTERM`, and `SIGKILL` passed.
- Real runner `ENOENT` and `EACCES`, incompatible runtime, missing/unreadable
  runner source, and pre-handshake crash used the expected stable surfaces.
  The `ENOEXEC` exception is the blocker above.
- Linux retained `waitid(..., WNOWAIT)`, subreaping, validated
  `PR_SET_PDEATHSIG`, runner-owned deadline cleanup, and collision-safe
  `{SIGTERM,SIGALRM}` handling.
- The deterministic Darwin backend seam passed ordinary kqueue construction,
  registration-before-release, `EV_ERROR`, wrong PID/missing `NOTE_EXIT`,
  `EINTR`, observer lifetime, failure close, and successful ordering checks.
  No actual macOS execution is claimed.

Independent real-process stress:

```text
20ms strict:
  rounds=1000 timeouts=1000 max=22.599ms over_100ms=0 residue=0

50ms collision:
  rounds=500 marked=500 timeouts=500 max=55.484ms over_100ms=0
  pgid_mismatch=0 completion_markers=0
  exact_pid_pgid_start_checks=1500 live_identities=0
  unrelated_sentinel_survived=true

near-deadline ENOBUFS:
  rounds=5 passed=5 exact_identity_checks=15
  live_identities=0 completion_markers=0
```

## Isolated complete gate and integrity

A fresh CPython 3.11.15 environment was created from the local cache, synced
offline from `requirements.lock`, and populated with only the two local
editable packages. The complete gate ran under an otherwise empty environment
with a reviewer-owned HOME and TMPDIR. Consequently all Redis, PostgreSQL,
Temporal, configured-runner, and real-provider variables were absent.

The local Linux gate exited zero with the expected allowlisted infrastructure
status:

```text
tests=1177 passed=1165 skipped=12 failed=0
structure=222/222
gateway=804 passed, 9 allowlisted live-PostgreSQL skips
e2e=24/24
cli=29/29
langgraph=81 passed, 3 allowlisted integration skips
```

It included policy validation and its disposable local `smoke.mcp`. It did not
contact shared Redis, a live database, Temporal, a shared MCP server, or a real
provider. Optional Redis and real-provider suites remained unavailable, not
passed.

Additional integrity:

- `python3 scripts/ci_gate.py --validate-only`: passed.
- `git diff --check`: passed for the technical range, request-only range, and
  reviewer pre-result worktree.
- Redacted `gitleaks detect --pipe`: passed for both submitted ranges.
- `gateway/src/tools/message.js` is byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- The technical range changes no `message.*`, `agents:events` owner,
  coordination service/transport, Redis/shared MCP configuration, policy,
  migration, schema, dependency manifest, or dependency lock.
- The complete Gateway and E2E suites retained the legacy message envelopes,
  coordination isolation, policy behavior, and MCP stdout contract.
- Reviewer-owned environments and exact temporary paths were removed. Exact
  runner/provider marker scans were empty before this result was written.

## Final status

Task `V5 C/1/00`, Trial 10: **reviewed KO**.

The Linux deadline and containment corrections are strong, but Trial 10 cannot
close while the mandatory macOS evidence is structurally red, native
`ENOEXEC` violates its stable contract, runner terminal outcomes remain
ambiguous, and the Darwin gate has exception-unsafe ownership windows. This
result does not authorize integration, promotion, or release.
