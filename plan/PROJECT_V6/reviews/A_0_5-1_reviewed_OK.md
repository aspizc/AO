# Review A_0_5-1 — OK (source and focused tests only)

**Task:** plan/PROJECT_V6/A/0/05.md
**Trial:** 1
**Branch:** feat/V6-A-0-05-local-recovery
**Commit:** none. Uncommitted candidate on base `b06f1f6b4b0c21799f2ba07631137b055c2a3364`,
bound by `v6-a05-medium-handoff-manifest.json`
(SHA-256 `3fce967e122acb849893745d839f60bd9f4828dc237dc4660830193057af9813`).
**Reviewer:** Claude reviewer agent (Claude Opus 5.5, medium), independent session
**Date:** 2026-10-08

## Summary

This review covers the candidate source and the focused tests. The verdict is
**OK** for that scope. It is not a gate pass, not live acceptance, and not
integration, promotion or release. Two acceptance criteria are still
**PENDING**: the full host gate (`bash scripts/ci.sh` with its skip budget) and
the live Codex restart/reattach check run by the operator. Neither was run or
observed in this review, and neither is counted as passed here. The sheet must
not move past `implemented` until root records both.

## Scope and limits

- This was a static source review plus local focused test runs. No production
  edits were made. No provider calls were made. No Gateway session was
  created. No live tmux/Codex child was started outside the test fixtures.
- I did not run the full gate. I examined no full-gate marker or log. Gate
  disposition is **PENDING ROOT**.
- I did not run the live Codex check. Disposition is **PENDING OPERATOR**.
  Synthetic fixtures are not live evidence.
- This verdict binds only the bytes listed in the manifest above. Any byte
  change voids it, and the change goes to trial 2.
- Root owns committing this file, indexing it in `reviews/README.md`, and
  attaching it to the Gateway evidence chain. This reviewer made no commit.

## Checks

- [x] **Exact binding.** I recomputed all 51 manifest entries (39 files and 12
  evidence archives) against the working tree: SHA-256 and `git hash-object`
  for every entry, plus the uncompressed SHA-256 for each `.gz`. Result:
  51/51 match. Every dirty path is bound by the manifest. `policies/` has no
  diff and no untracked files.
- [x] **Files to create or modify.** These are present and play their sheet
  roles:
  - migration `005_request_context_lineage.sql`, appended to the generic,
    WIRING-A and WIRING-B profiles with its digest
  - identity helper
  - SQLite recovery repository
  - recovery service
  - observation adapter
  - request-context wiring
  - lifecycle cleanup
  - tool, catalog, contract and docs changes (34th tool)
  - README recovery section
- [x] **Required tests, reproduced by me.** Command: the sheet's focused command
  plus `task_service.test.js` and `mcp_bootstrap.test.js`, run with
  `node --test`. Result: exit 0, 304 pass, 0 fail, 0 cancelled, **0 skipped**,
  0 todo. Local log SHA-256:
  `ecb82774d73c88bb82fce9339bfabed83341f305c99bb139e2c55632b7d638bf`. The log
  is in the reviewer scratchpad and is not committed. The run includes the
  host bootstrap and observation suites. `git diff --check`: exit 0. The new
  untracked source and test files have no trailing whitespace.
- [x] **TDD evidence.** I checked the totals inside the hash-verified archives:
  - `boundary-red`: 47 pass / 13 fail
  - `probe-expiry-red`: 0 pass / 1 fail
  - `spawn-mutation-red`: 0 pass / 8 fail (mutation evidence, labelled as such)
  - `runtime-sealed-green`: 87 pass / 0 fail / 0 skipped

  The attributions in the handoff are consistent with these totals.
- [x] **Source acceptance.** The source satisfies the sheet's identity,
  durable-lineage, explicit-reattach and concurrency, discovery, denial and
  migration conjuncts. See "Adversarial assessment" below.
- [ ] **Full gate `bash scripts/ci.sh` and skip budget: PENDING ROOT.** Not run
  and not observed.
- [ ] **Live Codex restart/reattach/ask/view: PENDING OPERATOR.** Not run.
- [x] **Common errors avoided.** No `orchestrator/` component. The server name
  stays `agents-gateway`. The new modules contain no stdout writes. No policy
  edits. No push.
- [ ] **Definition of done (commit, CHANGELOG, index): PENDING ROOT.** By the
  handoff's design these are root-owned. The candidate is uncommitted.
- [x] **Global invariants.** All text is in English. The approval flow is
  unchanged and recovery adds no new approval. Coordination input grants no
  authority.

## Adversarial assessment (no blocking defect found)

- **OS identity.** `request_recovery_identity.js`:
  - Real UID and effective UID must be equal safe integers.
  - `/etc/machine-id` is opened `O_NOFOLLOW` and validated with `fstat` on the
    same descriptor. It must be root-owned, not group/other-writable, sized
    32 or 33 bytes, read with a bounded read, match the lowercase-hex regex,
    and not be all zeros. Only the HMAC is persisted.
  - The state DB is resolved with realpath. The file and its directory must be
    owned by the current UID with no group/other write bit.
  - `verify()` re-observes all three values.
  - Unsupported platform or backend returns `null`, so normal startup
    continues.
- **Principal derivation.** `mcp_server.js` builds the recovery identity after
  `initState`. `createGatewayRequestContext` prefers the OS principal over
  `requestPrincipalId`, so caller fields cannot select an identity.
- **SQLite transactions.**
  - Claim, inspect, check, merge, release and remove all run in
    `transaction().immediate()`. Busy or locked returns the generic denial.
  - Revision-guarded `UPDATE … WHERE revision = ?` requires `changes === 1`.
  - `validateSync` rejects async validators and thenables.
  - Probes inside the lock are synchronous and bounded: at most 1 s per
    probe, 5 s total, and original/current expiry is re-checked after each
    probe.
  - Lifecycle terminal cleanup runs in the same transaction as the terminal
    transition (`persist.immediate()`).
- **Memory publication.**
  - `reattachRequestContextTrace` mutates maps only after `claimTrace` has
    returned, which is after commit.
  - `prepare()` refuses while `database.inTransaction` is true.
  - Terminal notifications that occur inside an outer transaction are deferred
    and re-derived from committed rows at the next protected call. A rolled-back
    terminal produces no notification. This is lazy invalidation, as the
    handoff states. It is acceptable because every protected call on a
    recovered trace also runs `recovery.check` against durable rows.
- **Liveness.**
  - A changed boot ID means the recorded owner has ended.
  - A start-token mismatch at a reused PID means the recorded owner has ended.
  - Null from the process reader is not enough. Absence additionally requires
    `/proc/<pid>` ENOENT and `kill(pid, 0)` ESRCH.
  - Any ambiguity refuses.
  - The tmux probe uses an exact `=target` and only an allowlisted stderr
    message counts as absence. A "server exited unexpectedly" result stays
    ambiguous (`null`) and refuses.
- **Discovery.** It applies the reattach filters without tmux probes, emits at
  most 100 entries sorted by trace ID, and silently drops failed records. It
  records no ownership.
- **Denial hints.** Only allowlisted tool and reason metadata goes to the
  observer, and observer exceptions are swallowed.

## Findings (non-blocking; root may carry as follow-ups or trial-2 polish)

1. **Session row stays `running` after a kill whose authority lapsed.**
   `gateway/src/services/agent_service.js:738` revalidates after the adapter
   has already killed the target. When that check denies (realistically,
   expiry elapsing mid-kill), the business row stays `running` with a dead
   target. The test at `tests/gateway/request_context_reattach.test.js:461`
   encodes this deliberately. Authority does not leak: later reattach reports
   `target_gone`. The cost is stale business state.
   - Suggested follow-up: record the observed closure without publishing
     success, or document it as an accepted limitation in `gateway/README.md`.
2. **Orphaned child after a spawn/delegate post-await denial.** When the
   recheck denies after the adapter has started a child, the tmux child is left
   with no session row or lineage. The handoff discloses this ("cannot undo
   provider work").
   - Suggested follow-up: document it as an operator-visible limitation.
3. **Ordinary calls depend on mid-life identity re-verification.**
   `request_recovery_service.js:45` (`record`) calls `identity.verify()` on
   ordinary create/assign/spawn. If someone changes the state directory or
   file permissions while the server runs, these calls error *after* their
   business effects. This fails closed and is consistent with "a write failure
   is an error". However, the sheet only requires credential re-reads "before
   recovery".
   - Suggested follow-up: confirm this is intended and note it in the README.
4. **Discovery work is unbounded.** `request_recovery_service.js:95` walks
   every lineage row. Each row gets an immediate transaction and `/proc`
   liveness observation. Only the output is capped at 100. Rows are removed on
   completion or cancellation, so this is low risk.

## Required corrections

None for source acceptance.

## Next step

- Root: commit this verdict with an explicit pathspec, index it in
  `plan/PROJECT_V6/reviews/README.md`, then run the A05 full gate solo on the
  host and record its result and skip budget.
- Operator: run and record the live Codex restart/reattach/ask/view check with
  actual identity, backend, provider and runtime versions.
- Do not claim A05 is `reviewed` beyond source/focused scope, or `integrated`,
  until both pending items are recorded green against these exact bytes.
