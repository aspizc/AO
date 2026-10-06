# C/1/00 Trial 13 — independent review request

Status: **Pending independent review**.

C/1/00 remains
`in_progress; Trials 1-12 KO preserved; Trial 13 review pending`. This request
claims no `OK`, integration, promotion, release, or completed native macOS
execution. The reviewer must be independent of the author and publish the
verdict in a separate append-only result file.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 12 `KO` / Trial 13 base:
  `e3a137e0305264fef4c60b96618049d3b6e81346`.
- Base tree:
  `89df10a94a0a93a4166fb93a8ca01a6e75180ee5`.
- Trial 13 technical commit:
  `61a0a551c012ede8bc979db76a1e9270210ffad9`.
- Trial 13 technical tree:
  `1e16067663d8a9220f11895dbf7b3b10bf7255c9`.
- Correction range:
  `e3a137e0305264fef4c60b96618049d3b6e81346..61a0a551c012ede8bc979db76a1e9270210ffad9`.
- Range size: 21 files, 2,220 insertions, and 177 deletions.

The technical commit is the direct child of the authoritative Trial 12
verdict. This request is a separate request-only commit and is not part of the
technical tree under review.

## Required independent review scope

Use GPT-5.6 Sol with `ultra` reasoning and the Priority/Fast service tier.
Review implementation, tests, manifests, ADRs, documentation, and actual
failure evidence rather than accepting the author summary. At minimum:

1. Reproduce both Trial 12 blockers. A regular executable beginning with valid
   host ELF/Mach-O magic followed by shell text must never reach Node/libuv's
   `ENOEXEC` shell fallback. `/usr/bin/env` wrappers must reject slash-bearing
   targets, and a bare target resolved to a false native image must not reach
   `env`/`execvp` fallback at either runtime entry.
2. Audit the fixed bootstrap from `spawnSync` through `process.execve`.
   Runtime plans must be exact absolute paths with bounded arguments, bootstrap
   readiness must be canonical and ordered, authenticated initial exec failure
   must remain provider-data-free `SYNC_RUNNER_UNAVAILABLE`, and every
   malformed, duplicated, reordered, or native-outcome-mismatched transcript
   must fail closed.
3. Treat the 0700 control directory, two 0600 regular files, and 0600 liveness
   FIFO as hostile paths. Verify creation uses retained descriptors,
   `O_EXCL`/`O_NOFOLLOW`, exact mode independent of umask, ownership transfer
   occurs through descriptors with the directory transferred last, and no
   post-handoff pathname chmod/chown or recursive cleanup exists.
4. Verify the launcher opens and validates both regular files, maps runner
   control to inheritable fd3 and launch control to close-on-exec fd4, unlinks
   exact names, removes the exact directory before provider entry, and enters
   the already verified runtime plan by direct `execve`. No second ambient
   Python, shell, `env`, or `execvp` fallback may participate.
5. Review the watchdog's authority and lifetime. It must open the FIFO before
   readiness, remain in the bootstrap PGID to reserve that identity, detect
   loss of the exact synchronous caller, own the same absolute deadline, send
   bounded `SIGTERM` then same-PGID `SIGKILL`, and contain residual same-PGID
   work after the leader exits without ever falling back to a positive PID.
   Attempt PID/PGID reuse and keep an unrelated sentinel alive.
6. Exercise a TERM-resistant pre-launch runtime, caller death before launcher
   entry, a leader which exits after forking a same-PGID child, restrictive
   umask, tiny `maxBuffer`, incompatible images, success, provider signal,
   timeout, and `ENOBUFS`. Confirm controls and synthetic processes are absent
   afterward.
7. Inspect the private Linux subreaper used only by tests which deliberately
   kill a pre-launch caller/runtime. The authoritative CI supervisor must
   report `completed`, not `process_tree_leak`; the helper must reap its exact
   synthetic domain and must not hide production descendants. The non-Linux
   path must remain free of `/proc`/`prctl` assumptions.
8. Verify `AGENTS_MKFIFO_BIN` is the only operator override, the utility is
   resolved once from startup `PATH`, is host-native, and no
   distribution-specific `/usr/bin/mkfifo` assumption was added.
9. Reconcile ADR-009, architecture, Node/runtime documentation, operator and
   Gateway guides, C/0/00, C/1/00, Stage C README, package/lock engines, CI
   rows, and the sheet registry with the implementation. Node must be
   `^22.15.0 || ^24.0.0`; configured macOS rows are not local native execution
   evidence.
10. Regress every accepted Trial 1-12 lifecycle/repository/service property.
    Confirm `gateway/src/tools/message.js`, `message.*`, `agents:events`,
    coordination Redis, policies, migrations, dependencies, shared MCP/Redis,
    real providers, and tmux remain outside this correction.

## Author TDD and verification evidence

- Initial RED reproduced the false host-native image reaching shell fallback
  and the slash-bearing `env` divergence. Subsequent REDs reproduced nested
  `env` fallback, mode drift under restrictive umask, tiny-buffer bootstrap
  ambiguity, control-directory survival, and caller death before launcher
  entry.
- Two adversarial pre-review passes added REDs for descriptor/path ownership
  races, numeric PID/PGID authority, a TERM-resistant runtime, an exited leader
  with a live same-PGID child, and a distribution-specific `mkfifo` path.
- The authoritative CI subreaper then produced a real
  `process_tree_leak` RED for deliberately orphaning pre-launch watchdogs.
  Private test-owned subreapers now reap those exact synthetic domains. The
  complete synchronous-boundary file reports **50/50 passed**, exit zero, and
  supervisor status `completed`.
- Focused Node-runtime structure checks pass **14/14**. The lifecycle
  resistant-delegate regression passed five consecutive repetitions.
- The final isolated authoritative gate, with live/shared service variables
  unset, accounted for **1,208 tests: 1,196 passed / 12 exact allowlisted
  infrastructure or opt-in skips / 0 failed**. It includes structure
  **233/233**, Gateway **824 passed / 9 PostgreSQL skips**, E2E **24/24**, CLI
  **29/29**, LangGraph **81 passed / 3 opt-in skips**, locks, both lints, policy
  validation, and the disposable MCP smoke.
- `python3 scripts/ci_gate.py --refresh-inventory`,
  `git diff --check`, and a redacted staged gitleaks scan passed on the
  technical tree.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- No live/shared Redis, MCP/KYA service, real provider, tmux session, or
  credential was used, restarted, stopped, flushed, or reconfigured.

## Reviewer execution and result

Use an isolated environment and leave shared Redis/MCP/KYA, providers, tmux,
and credentials untouched. Run the strongest applicable focal set and the
complete authoritative gate. Native macOS execution is preferred; if it is
unavailable, state that limitation explicitly and review Darwin seams without
converting configuration into runtime evidence.

Publish the verdict only in:

`plan/reviews/PROJECT_V5/C_1_0-13_result.md`

The result must bind the full technical commit and tree, list commands and
counts, classify every finding, state `OK` or `KO`, and remain a separate
result-only commit. Do not edit this request or any Trial 1-12 artifact.
