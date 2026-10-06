# C/1/00 Trial 12 — independent review request

Status: **Pending independent review**.

C/1/00 remains
`in_progress; Trials 1-11 KO preserved; Trial 12 review pending`. This request
claims no `OK`, integration, promotion, release, or completed native macOS
execution. The reviewer must be independent of the author and publish the
verdict in a separate append-only result file.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 11 `KO` / Trial 12 base:
  `fc2c5aed6443d606f97e39cbbc2c6bdcd0c2962a`.
- Base tree:
  `728aa550db410ab06bffa6a771c34f1d1029f15d`.
- Trial 12 technical commit:
  `939b04cc48c18cb25e93dfbc65ee2ee65603561b`.
- Trial 12 technical tree:
  `be2845390a2389954850e7ab75d55345c8869fa3`.
- Correction range:
  `fc2c5aed6443d606f97e39cbbc2c6bdcd0c2962a..939b04cc48c18cb25e93dfbc65ee2ee65603561b`.
- Range size: 16 files, 714 insertions, and 67 deletions.

The technical commit is the direct child of the authoritative Trial 11
verdict. This request is a separate request-only commit and is not part of the
technical tree under review.

## Required independent review scope

Use GPT-5.6 Sol with `ultra` reasoning and the Priority/Fast service tier.
Review implementation, tests, manifests, ADRs, documentation, and actual
failure evidence rather than accepting the author summary. At minimum:

1. Verify the Darwin contract allows exactly 15 Linux-kernel structure skips
   and two Linux-only Gateway skips: parent-death cleanup with service
   `linux-prctl-parent-death`, and adopted-child deadline drain with service
   `linux-pidfd-subreaper`. No local Linux or deterministic seam evidence may
   be reported as completed native macOS execution.
2. Audit runtime preflight from path resolution through launch. It must require
   a regular executable, use one nonblocking/CLOEXEC descriptor, read
   positionally until a complete shebang, fstat-proven EOF, or the exact
   256-byte boundary, and never infer EOF from one short read.
3. Verify native images are host-specific: ELF only on Linux/WSL and
   Mach-O/fat only on Darwin. A script wrapper must name one absolute
   host-native interpreter. An `env` wrapper must name one bare host-native
   target resolved against effective cwd and `PATH`. Empty, whitespace,
   relative, CR/NUL, comment, multiword, missing, foreign-loader, unsupported,
   boundary-truncated, FIFO, and directory cases must expose only
   `SYNC_RUNNER_UNAVAILABLE`.
4. Exercise the positive direct and `env` wrapper paths through both launcher
   and runner execution. A complete short shebang at regular-file EOF must not
   be confused with truncation. Confirm the configured runtime is reused and
   no ambient second Python or shell fallback is admitted.
5. Treat fd3/fd4 as hostile raw bytes. Python producers must emit compact
   `sort_keys=True` JSON. JavaScript must compare one lexicographically ordered
   flat-object serialization to the raw line before semantic validation, so
   reordered and duplicate-key READY, provider outcome, provider exec, runner
   error/deadline, runtime exec, and launcher error records fail closed.
6. Confirm provider/runtime exec code and errno still authenticate the native
   result. An authenticated `launcher_error` may retain its typed code only for
   exit 126, null signal, and no native spawn error; every mismatch must report
   `LAUNCHER_OUTCOME_MISMATCH`.
7. Regress the retained Linux and Darwin process-containment boundary from
   Trial 11, especially the adopted-session drain, parent-death cleanup,
   absolute deadline, PGID confinement, native `ENOBUFS`, and exception-safe
   ownership seams. Trial 12 must not weaken those accepted portions.
8. Reconcile ADR-007, ADR-009, architecture, CI contract, operator guide,
   MVP2 runbook, C/1/00, Stage C README, and the sheet registry with the code
   and evidence.
9. Confirm Trial 1-11 request/result history remains append-only and
   `gateway/src/tools/message.js`, `message.*`, `agents:events`, coordination
   Redis, policies, migrations, dependencies, shared MCP/Redis, providers, and
   tmux remain outside this correction.

## Author TDD and verification evidence

- Initial RED: all three new Gateway groups failed for reordered control,
  non-canonical launcher output, and bare shebang fallback; the authoritative
  manifest test failed because the adopted-child drain skip was absent.
- Follow-up REDs reproduced multiword/comment shebang divergence,
  non-native-interpreter fallback, exact-boundary truncation, a foreign-host
  native header, and launcher/native-result mismatches before each correction.
- Expanded synchronous-boundary focal:
  `node --test --test-concurrency=1 tests/gateway/sync_process_deadline.test.js`
  — **44/44 passed**.
- CI manifest/portable-supervisor focal:
  `python -m pytest -q tests/structure/test_ci_suite_manifest.py` —
  **87/87 passed**.
- Complete structure suite:
  `python -m pytest -q tests/structure` — **232/232 passed**.
- `npm run lint`, `python scripts/ci_gate.py --validate-only`,
  `git diff --check`, and a redacted staged gitleaks scan passed.
- The final isolated complete gate accounted for **1,201** tests:
  **1,189 passed / 12 exact allowed skips / 0 failed**. It included Gateway
  **818 passed / 9 PostgreSQL skips**, E2E **24/24**, CLI **29/29**, LangGraph
  **81 passed / 3 opt-in skips**, lock/lint/policy validation, and the
  disposable MCP smoke. Redis, PostgreSQL, Temporal, real providers, and
  shared MCP state were not used.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- A separate read-only portability/correctness pass found no remaining P1/P2
  after the final corrections. It made no edits and is supporting evidence,
  not the requested formal verdict.

## Reviewer execution and result

Use an isolated environment and leave shared Redis/MCP, providers, tmux, and
credentials untouched. Run the strongest applicable focal set and complete
gate. Native macOS execution is preferred; if unavailable, state that
limitation explicitly and review the Darwin seams without converting
configuration into runtime evidence.

Publish the verdict only in:

`plan/reviews/PROJECT_V5/C_1_0-12_result.md`

The result must bind the full technical commit and tree, list commands and
counts, classify every finding, state `OK` or `KO`, and remain a separate
result-only commit. Do not edit this request or any Trial 1-11 artifact.
