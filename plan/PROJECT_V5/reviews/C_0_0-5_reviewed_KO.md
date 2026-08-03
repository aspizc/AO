# Independent Review — Project V5 C/0/00 Identity and Output Correction (Trial 5)

## Verdict

**KO.** The scoped candidate
`26bacc4eae38f61bd9de6ad1e5d55d29818f68ac..8ff66e377c68c0b4d2fa19097505ef088c007be9`
still has two P0 process-containment/identity failures and one post-freeze
signal race. A suite can publish `timed_out` while its own late detached
descendant remains alive, and the claimed identity check can still signal a
different process when PID reuse occurs between the `/proc` read and
`os.kill()`. Separately, SIGINT/SIGTERM in the final drain-to-unmask interval
leave a frozen `passed` JSON but replace the selected exit with signal
termination.

The Trial 5 submission at
`2983f3a9ec6eeeb0b1d40c2710846cbd7658290e` was used only to establish the
requested candidate, documented boundary, and verification scope. No prior
verdict was relied on.

## Blocking findings

### P0 — A late descendant can escape the observed PGID and survive a published result

[`_snapshot_owned_identities`](../../../scripts/ci_gate.py#L924) builds its
owned set from one `/proc` snapshot: members of the original PGID plus a tree
rooted at the runner only while the original runner identity is still current.
[`_owned_processes_absent`](../../../scripts/ci_gate.py#L989) then proves only
the identities already observed and the original PGID absent. It has no
containment authority over a descendant which is created during TERM handling,
starts a new session, and is reparented before the next snapshot.

An independent real-process fixture installed a SIGTERM handler in the runner.
The handler created a TERM-resistant child with `start_new_session=True`,
recorded its PID/PGID, and exited immediately. The gate returned this
observation:

```text
outcomeStatus: timed_out
runnerPgid: 3177005
lateDescendantPid: 3177081
lateDescendantPgid: 3177081
lateDescendantRunningAtReturn: true
```

The descendant was created by the owned runner after cleanup began. Because
the runner had exited and the descendant no longer belonged to PGID `3177005`,
the final proof accepted absence and returned a result while PID `3177081` was
alive. The reviewer then signalled only that exact fixture through a pidfd and
confirmed it absent.

Required correction:

- establish a Linux containment/descendant-tracking mechanism that survives
  reparenting and `setsid()` during the cleanup window;
- make the final proof cover every process created by the suite, not only one
  sampled tree and the original PGID; and
- add a real regression in which the TERM handler creates a late detached
  descendant, requiring its exact absence before `_execute_command()` can
  return any outcome.

### P0 — The PID/start-time check is not atomic with signalling

[`_signal_process_identity`](../../../scripts/ci_gate.py#L977) first reads
`/proc/<pid>/stat` through `_identity_is_current()` and then performs
`os.kill(pid, signal)` as a separate operation. The owned process can exit and
its PID can be reused between those operations, redirecting the signal to the
replacement. The same check-then-use interval precedes group signalling.

There is also no root identity captured alongside
[`subprocess.Popen`](../../../scripts/ci_gate.py#L1205). When cleanup starts
with no known root identity,
[`_snapshot_owned_identities`](../../../scripts/ci_gate.py#L933) adopts
whatever process currently occupies `Popen.pid`, so reuse before the first
snapshot is also treated as ownership.

A deterministic synthetic identity fixture changed the current identity from
owned start time `111` to replacement start time `222` immediately after the
successful `/proc` read and before the fake `os.kill()`:

```text
signals: 1
targetAtKillWasReplacement: true
replacementStartTime: 222
```

The committed regression where the replacement already exists before the
identity read passes, but it does not exercise either race above. Therefore
the documented claim that PID reuse cannot redirect the fallback is false.

Required correction:

- bind the direct runner at spawn and every discovered descendant to a
  kernel-stable identity such as a pidfd;
- signal through that stable handle (and close the equivalent PGID
  check-to-signal race), rather than validating a mutable numeric PID before a
  later `kill`; and
- add deterministic regressions for reuse before the first cleanup snapshot
  and between identity validation and signalling.

### P1 — A post-freeze signal can replace the frozen exit during final unmask

[`_emit_final_output`](../../../scripts/ci_gate.py#L1638) restores the caller's
handlers while SIGINT/SIGTERM are blocked. After writing the frozen payload it
drains pending signals once, then restores the caller's mask in `finally`.
A signal arriving after that drain but before the final
`pthread_sigmask(SIG_SETMASK, ...)` remains pending and is delivered to the
already-restored handler as the mask is restored.

The reviewer injected each signal immediately before the real final unmask,
after the payload/status freeze and low-level write:

| Signal | Records | JSON status | Exit | Traceback |
|---|---:|---|---:|---:|
| SIGINT | 1 | `passed` | signal 2 (`-2` from `subprocess`) | 1 |
| SIGTERM | 1 | `passed` | signal 15 (`-15` from `subprocess`) | 0 |

This is after the documented freeze, yet it does not preserve the selected
`passed`/0 result required by the Trial 5 review boundary.

Required correction:

- close the final drain-to-unmask interval while preserving the caller's exact
  handlers and mask; and
- add SIGINT/SIGTERM regressions at the final mask restoration, requiring the
  same frozen payload and exit selected at the documented boundary.

## Adversarial evidence that passed

The candidate's focused adversarial selection reported **11 passed in 1.02s**.
It covered the persistent combination of communication, PGID probe, PGID
signal, member enumeration, direct kill, and direct wait faults against a real
runner/descendant; unreadable exact identity; a replacement present before
identity checking; fatal cleanup propagation; both signals before and after
the declared freeze hooks; and partial low-level output.

An additional in-process fatal-cleanup probe raised
`ProcessCleanupError`, captured **zero stdout bytes**, and restored two
distinct caller handler objects plus the exact nontrivial entry mask. Thus the
new fatal propagation path does not serialize uncertainty as a suite or
aggregate result.

Independent low-level write probes also behaved correctly:

| Injected write result | Calls | Bytes committed | Newlines | Outcome |
|---|---:|---:|---:|---|
| zero progress | 1 | 0 | 0 | raised, no replay |
| failure before progress | 1 | 0 | 0 | raised, no fallback |
| partial then failure | 2 | 44 | 0 | raised, no full-payload replay |

These passing cases do not contain the late-descendant, PID check-to-use, or
final-unmask failures above.

## Verification

- `.venv/bin/python -m pytest -q tests/structure/test_ci_suite_manifest.py` —
  **56 passed in 9.67s**.
- `.venv/bin/python -m pytest -q tests/structure` —
  **201 passed in 9.74s**.
- Focused seven-test-node adversarial selection, including parametrization —
  **11 passed in 1.02s**.
- `.venv/bin/ruff check scripts/ci_gate.py tests/structure/test_ci_suite_manifest.py`
  — passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py tests/structure/test_ci_suite_manifest.py`
  with `PYTHONPYCACHEPREFIX` in the private review `TMPDIR` — passed.
- `.venv/bin/python scripts/ci_gate.py --validate-only` — one `passed` JSON,
  exit 0.
- `git diff --check
  26bacc4eae38f61bd9de6ad1e5d55d29818f68ac..8ff66e377c68c0b4d2fa19097505ef088c007be9`
  — passed.
- Exact post-probe checks found no surviving fixture process.

Every process-spawning test command removed the Redis, real-agent, provider,
Postgres, and Temporal opt-ins from its environment and used a private
`TMPDIR` under `/var/tmp`; the static and in-process probes did not invoke
service paths. No Redis, MCP, network, container, tmux, or shared service was
used or restarted. The private review `TMPDIR` was removed after the process
scan.

## Append-only artifact verification

Every Trial 1–4 submission and KO verdict is byte-identical between base
`26bacc4eae38f61bd9de6ad1e5d55d29818f68ac` and the Trial 5 submission tree:

| Artifact | SHA-256 |
|---|---|
| `C_0_0-1_to_review.md` | `b1ac87ede7403082277e654f66055e5d1913eeafec6a965186e3ecea40284926` |
| `C_0_0-1_reviewed_KO.md` | `ca2d2124b5f502469b916c900b1035e0257b1a6bd72338fb4bd58e0b830ac9e6` |
| `C_0_0-2_to_review.md` | `a3d5163fe3bc09baa1671d302cc99511e7948bfd713b0809ce47ed657ff8afba` |
| `C_0_0-2_reviewed_KO.md` | `695a2773567b659f871a37c3dcb87975e8ccfc2949881d4d0d7e4601e44e9b27` |
| `C_0_0-3_to_review.md` | `783d218955829d3504aa736b0f6982b0bf88489091b4db1ae87ccc78c474c39e` |
| `C_0_0-3_reviewed_KO.md` | `32bbba140a8e3e521bbd9b076ab3d9dd68dfd4f838e3a47d1fd32d069d7ef22d` |
| `C_0_0-4_to_review.md` | `54246ca3b4ce64c8c2fc851f08064ba15c9fde115159d451929e54cbfac8dca3` |
| `C_0_0-4_reviewed_KO.md` | `4e83a8ceccaaffe0b34f04c32d3d610215f321aee003bc72459f23bd6e4ae8f6` |

Trial 5 must remain `in_progress`. Do not promote C/0/00 from this candidate.
