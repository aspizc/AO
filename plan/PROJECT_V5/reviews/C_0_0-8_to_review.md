# Review Submission - Task C/0/00 (Trial 8)

## Scope

- Review base: `6529ef872d04cb9f6eaaeba1a8646a1d50869feb`
- Technical candidate: `26e8bbd3609e5c40c83bec5c17e2d151491d4caa`
- This trial addresses only the two P0 helper-lifecycle blockers in
  `C_0_0-7_reviewed_KO.md`.
- C/0/00 remains `in_progress`; this submission does not claim review or
  promotion.

## What was done

- Replaced the partial pre-launch cleanup path with one total helper-shutdown
  primitive used after every successful helper `Popen`.
- Closed both parent-owned protocol endpoints before shutdown, allowed one
  bounded cooperative EOF exit, then escalated through TERM, bounded wait,
  KILL, and bounded wait/reap.
- Used `pidfd_send_signal` plus `waitid(P_PIDFD)` whenever the helper pidfd was
  acquired. If helper pidfd acquisition itself failed, cleanup used only the
  exact unreaped direct `Popen` child through `terminate`,
  `send_signal(SIGKILL)`, and `wait`.
- Normalized helper-pidfd setup failure to `ProcessCleanupError` after total
  cleanup. No generic `TimeoutExpired` can escape that path into public JSON.
- Closed every acquired helper pidfd in a nested `finally`, including when
  escalation, reap, or the original parent operation raises.
- Buffered each terminal frame without decoding it. The parent first requires
  exact helper exit and pidfd reap, then verifies the frame-type-specific
  helper return code (`0` for result/error and `4` for fatal), and only then
  validates or decodes the frame.
- Retained cleanup authority after every received frame. A helper that sends a
  valid result and then hangs is TERM/KILL reaped, its proof is never decoded,
  and no JSON is published.

## TDD evidence

- Initial focused RED: **4 failed, 71 deselected in 1.16s**.
  - The real-helper order was `decode-proof` before `helper-reaped`.
  - Persistent helper-pidfd failure escaped as `TimeoutExpired`, emitted an
    `internal_error` JSON, and left the TERM-ignoring helper alive.
  - A post-`READY`, pre-`RUN` callback failure was masked by
    `ProcessCleanupError` while its EOF/TERM-ignoring helper survived.
  - A syntactically valid result was decoded before the deliberately hanging
    helper failed to converge.
- The same four probes after implementation: **4 passed, 71 deselected in
  1.06s**.
- Final focused suite:
  `.venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` -
  **75 passed in 12.03s**.
- Full structure suite:
  `.venv/bin/python -m pytest -q tests/structure` -
  **220 passed in 12.42s**.

## Decisions taken

- Endpoint closure remains the graceful pre-`RUN` notification. A bounded
  cooperative wait preserves the existing clean EOF behavior; non-cooperation
  cannot escape the subsequent TERM/KILL escalation.
- The pidfd-less fallback is not general numeric-PID authority. It exists only
  between helper `Popen` and failed helper-pidfd acquisition, while the exact
  direct child is unreaped and therefore cannot have its PID reused.
- A terminal frame proves nothing until its sender has exited, been reaped
  through the exact helper pidfd, and returned the status required by that
  frame type.
- Cleanup success preserves the original parent exception. Cleanup uncertainty
  remains `ProcessCleanupError` and continues to cross `main()` without a
  serialized result.

## Verification

- Authoritative offline gate, with the worktree venv first on `PATH`,
  live-service opt-ins unset, and private
  `TMPDIR`/`PYTHONPYCACHEPREFIX`:
  `bash scripts/ci.sh` - exit 0, aggregate
  `infrastructure_unavailable`, **1025 tests / 1013 passed /
  12 exact infrastructure skips / 0 failed**.
- `.venv/bin/python scripts/ci_gate.py --validate-only` - exit 0, exactly one
  `passed` JSON object.
- `./scripts/requirements_lock.sh --check-inputs` -
  `requirements.lock inputs are current`.
- `./scripts/requirements_lock.sh --check --offline` -
  `requirements.lock is current`.
- `npm --prefix gateway ci --offline` - 196 packages installed from the
  offline cache, 0 vulnerabilities.
- `.venv/bin/ruff check scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` - passed.
- `.venv/bin/python -m py_compile scripts/ci_gate.py
  tests/structure/test_ci_suite_manifest.py` with a private
  `PYTHONPYCACHEPREFIX` - passed.
- `git diff --check 6529ef8..26e8bbd` - passed.
- Scoped added-line secret-signature scan - 0 matches.
- Post-gate exact supervisor scan - 0 survivors.

No network fetch, Redis, Postgres, Temporal, provider, shared MCP, container,
or manual tmux/agent session was used. Live-service and real-agent opt-ins
were removed from every process-spawning verification command. Private
temporary/cache state was rooted at
`/var/tmp/agents-c000-t8.ypmMsC`.

## Limitations

- The containment engine intentionally requires Linux `/proc`, libc
  `prctl`/pidfd support, and default `SIGCHLD` disposition inside the fresh
  helper.
- Live Redis, Postgres, Temporal, Gateway-integration, and provider lanes were
  not selected. Their exact documented skips or optional-lane unavailability
  remain visible in the authoritative result.
- C/0/00 remains pending independent review. No completion or promotion state
  is claimed by this submission.

## Append-only evidence

Trial 1-7 submissions and KO verdicts remain byte-identical:

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
| `C_0_0-5_to_review.md` | `d36f4e3913175eeffef50a8a8217575e812a3edb6dc8a14d608ed342cd0a5804` |
| `C_0_0-5_reviewed_KO.md` | `eab465b15b56f24bf370c7f09047988e613af6fa96bbdfb2d42f2f0c7f36bf30` |
| `C_0_0-6_to_review.md` | `0b7318581d8be566739071ec05e0eab910f02b1a80cbf76c5889698404d91395` |
| `C_0_0-6_reviewed_KO.md` | `3eeeeb7834e3ddafba8f09a2f65cce7d1781c987c30a1465155004fa2e3b04ac` |
| `C_0_0-7_to_review.md` | `6af8ea56df9b01a5a16e10e080a7dd2d95505b9e18457421f7be8e8a317d2cc3` |
| `C_0_0-7_reviewed_KO.md` | `ff3ab48114321b1e56558f90e16a962699f2d0e02d654a163e3f0845ab52dadf` |

## Commit

- `26e8bbd3609e5c40c83bec5c17e2d151491d4caa` -
  `fix(ci): make supervisor shutdown total (V5 C/0/00)`
