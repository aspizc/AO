# Review Submission - Task C/0/00 (Trial 9)

## Scope

- Review base: `6ac5d8ab598e4788edc8842ba2322ab01b23c098`
- Technical candidate: `f37fe7f7978d54164465b71a1e6f1f4eae65a1b6`
- This trial addresses only the helper-pidfd close blocker in
  `C_0_0-8_reviewed_KO.md`.
- C/0/00 remains `in_progress`; this submission does not claim review or
  promotion.

## What was done

- Added one `_close_suite_supervisor_pidfd()` primitive for the parent-owned
  helper pidfd.
- The primitive attempts `os.close()` exactly once and converts its `OSError`
  to `ProcessCleanupError`. It never retries a numeric descriptor whose state
  is unknowable and which may already have been reused after the first call.
- Kept the close in the existing nested `finally`, after helper exit and exact
  pidfd reap.
- Routed the only helper-pidfd close call site through the primitive. The
  supervisor's separate runner/descendant containment handles retain their
  existing ownership and close paths.
- Added real-helper fault injection for a successful command/reap followed by
  a real close plus synthetic `OSError(EIO)`. The helper is reaped before the
  close, the close is attempted once, the descriptor is closed, and
  `main()` raises `ProcessCleanupError` without stdout.
- Added the combined path where pre-`RUN` parent failure is followed by a
  successful helper shutdown/reap, a primary `ProcessCleanupError`, and then a
  real close plus synthetic `OSError(EIO)`. The close uncertainty remains the
  top-level `ProcessCleanupError`, with the close `OSError`, primary cleanup
  error, and original parent error retained in the cause/context chain.

## TDD evidence

- Required reviewer-path RED: **2 failed, 75 deselected in 0.39s**. Both
  faults returned status 2 and published an `invalid_manifest` JSON object.
- An ordinary `_run_suite()` RED also showed the combined fault converted to a
  public failed-suite JSON result instead of crossing the cleanup boundary.
- The two probes after implementation: **2 passed, 75 deselected in 0.31s**.
- Final focused suite:
  `.venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` -
  **77 passed in 12.74s**.
- Final full structure suite:
  `.venv/bin/python -m pytest -q tests/structure` -
  **222 passed in 13.04s**.

## Decisions taken

- A failed `close(2)` does not establish whether the descriptor remains open.
  Retrying could close an unrelated descriptor that reused the same number, so
  the helper-pidfd primitive is deliberately single-attempt.
- The close error becomes `ProcessCleanupError` rather than a manifest or
  command-execution error. This makes both `_run_suite()` and `main()` use
  their existing fail-closed cleanup branches.
- `raise ProcessCleanupError(...) from close_error` preserves the direct close
  cause. When the nested `finally` is already handling a cleanup failure, the
  close `OSError` retains that primary cleanup error as its context; the
  regression verifies the complete chain.
- No other pidfd ownership domain was changed.

## Verification

- Authoritative final-tree offline gate, with the worktree venv first on
  `PATH`, live-service opt-ins unset, and private
  `TMPDIR`/`PYTHONPYCACHEPREFIX`:
  `bash scripts/ci.sh` - exit 0, aggregate
  `infrastructure_unavailable`, **1027 tests / 1015 passed /
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
  tests/structure/test_ci_suite_manifest.py` with private
  `PYTHONPYCACHEPREFIX` - passed.
- Source audit: one helper-pidfd close call site, through
  `_close_suite_supervisor_pidfd`; no raw `os.close(helper_pidfd)` remains.
- `git diff --check 6ac5d8a..f37fe7f` - passed.
- Scoped added-line secret-signature scan - 0 matches.
- Post-gate exact supervisor scan - 0 survivors.

No network fetch, Redis, Postgres, Temporal, provider, shared MCP, container,
or manual tmux/agent session was used. Live-service and real-agent opt-ins
were removed from every process-spawning verification command. Private
temporary/cache state was rooted at
`/var/tmp/agents-c000-t9.g6SW5P`.

## Limitations

- A close error necessarily leaves descriptor state uncertain; the safe
  outcome is a non-serialized `ProcessCleanupError`, not a retry.
- The containment engine intentionally requires Linux `/proc`, libc
  `prctl`/pidfd support, and default `SIGCHLD` disposition inside the fresh
  helper.
- Live Redis, Postgres, Temporal, Gateway-integration, and provider lanes were
  not selected. Their exact documented skips or optional-lane unavailability
  remain visible in the authoritative result.
- C/0/00 remains pending independent review. No completion or promotion state
  is claimed by this submission.

## Append-only evidence

Trial 1-8 submissions and KO verdicts remain byte-identical:

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
| `C_0_0-8_to_review.md` | `ab81688369745a337605e074a3096f668738d2c6acf1b853a967e0496136cd3b` |
| `C_0_0-8_reviewed_KO.md` | `78023d19ac4e645a9b24e404487376e9b82bf67989fa9180733184945739d22e` |

## Commit

- `f37fe7f7978d54164465b71a1e6f1f4eae65a1b6` -
  `fix(ci): fail closed on helper pidfd close (V5 C/0/00)`
