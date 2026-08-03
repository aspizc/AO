# Review Submission - Task C/0/00 (Trial 7)

## Scope

- Review base: `31fe285a4929c48fc1ba7389fa7285eba5ee7206`
- Technical candidate: `3c6921af94af8aef1eb1638e2c380893beac083b`
- This trial addresses the two P0 blockers in
  `C_0_0-6_reviewed_KO.md` and narrowly hardens the resulting private
  supervisor protocol.
- C/0/00 remains `in_progress`; this submission does not claim review or
  promotion.

## What was done

- Moved each suite's subreaper domain into a fresh helper process. The
  embedding gate opens the helper pidfd and waits for `READY` before sending a
  run request, but never becomes a subreaper itself.
- Kept unrelated embedding-process children outside that ownership boundary.
  A deterministic regression creates a caller-owned child after `READY` and
  proves that it remains alive and independently reapable by its owner.
- Added a private, versioned, length-prefixed JSON protocol. Stream bytes are
  base64 encoded, malformed fields fail closed, and a result is accepted only
  with proof of quiescence, exact root reap, restored subreaper state, and zero
  open pidfds.
- Forwarded SIGINT/SIGTERM through the stable helper pidfd and reaped the
  helper through `waitid(P_PIDFD, ...)`. EOF or invalid protocol before a run
  request makes the helper restore containment and exit without a runner.
- Preserved a provisional root pidfd when `/proc/<root>/stat` remains opaque.
  That handle stabilizes the root PID as an ancestry anchor while descendant
  discovery converges; the root is reaped only after the domain is absent.
- Closed persistent post-spawn root-pidfd failure. The fresh helper's exact
  unreaped `Popen` child cannot reuse its PID, so the exceptional fallback
  signals and reaps only that direct child and later directly observed adopted
  children. No arbitrary inferred PID, PGID, or embedding-process child is
  eligible.
- Ensured both captured streams close, the owned domain reaches a two-scan
  fixed point, and the exact entry subreaper state is restored before any
  post-spawn uncertainty propagates without JSON.
- Updated the CI contract, ADR-007, and active V5 planning status while
  preserving Trials 1-6 byte-for-byte.

## TDD evidence

- Initial focused RED:
  **2 failed, 63 deselected**. The foreign-child test could not synchronize on
  a supervisor `READY` boundary, and persistent root-pidfd failure left the
  long-lived runner alive with its `Popen.returncode` unset.
- A further provisional-root RED failed when root stat stayed unreadable after
  a successful pidfd open.
- The final regression set also covers the combined persistent pidfd plus
  opaque-stat case with a real adopted descendant, pre-run EOF and malformed
  protocol shutdown, cleanup-proof validation, arbitrary stdout/stderr bytes,
  and the existing end-to-end cancellation paths.
- Final focused GREEN:
  `.venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` -
  **71 passed in 10.99s**.
- Full structure GREEN:
  `.venv/bin/python -m pytest -q tests/structure` -
  **216 passed in 11.20s**.

## Decisions taken

- Isolation is by process ancestry rather than a point-in-time baseline in the
  embedding process. The helper has no application-owned children, so every
  new direct/adopted child belongs to its one suite.
- The parent command lock remains nonblocking and process-local. It serializes
  gate commands but is no longer used as proof that every embedding-process
  child belongs to the suite.
- The runner pidfd is registered before identity reads. A failed validation
  leaves the provisional handle installed; a later single snapshot may safely
  promote it because an unreaped pidfd prevents PID reuse.
- Numeric signalling is not a discovery mechanism. It is confined to exact
  unreaped direct children of the fresh helper when root pidfd acquisition
  failed, including children later adopted directly into that same helper.
- A successful helper exit alone is insufficient. The parent also validates
  the cleanup-proof fields and exact request ID before reconstructing the
  byte-valued command outcome.
- The protocol frame limit is 64 MiB. An oversized or malformed frame is
  cleanup uncertainty and cannot publish a suite or aggregate result.

## Verification

- Authoritative final run, with the worktree venv first on `PATH`, live-service
  opt-ins unset, and private `TMPDIR`/`PYTHONPYCACHEPREFIX`:
  `bash scripts/ci.sh` - exit 0, aggregate
  `infrastructure_unavailable`, **1021 tests / 1009 passed /
  12 exact infrastructure skips / 0 failed**.
- An earlier invocation without the venv on `PATH` selected the host Conda
  Python and lacked pytest, Ruff, and `agent-run`; it was discarded as an
  invalid environment invocation before the venv-qualified authoritative run.
- `.venv/bin/python scripts/ci_gate.py --refresh-inventory` - exit 0, one
  `passed` JSON record and no inventory diff.
- `.venv/bin/python scripts/ci_gate.py --validate-only` - exit 0, one
  `passed` JSON record.
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
- `git diff --check 31fe285..3c6921a` - passed.
- Scoped secret-signature scan of the candidate diff - no matches.
- Post-gate exact process scan - no late-detached, process-tree, or hanging
  fixture survived.

All process-spawning verification removed Redis and real-agent opt-ins and
used `/var/tmp/agents-c000-t7.ysMULj` for private temporary/cache state. No
network fetch, Redis, Postgres, Temporal, provider, shared MCP, container, or
manual tmux/agent session was used.

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

Trial 1-6 submissions and KO verdicts remain byte-identical:

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

## Commit

- `3c6921af94af8aef1eb1638e2c380893beac083b` -
  `fix(ci): isolate suite containment supervisor (V5 C/0/00)`
