# C/1/00 Trial 11 — independent review request

Status: **Pending independent review**.

C/1/00 remains
`in_progress; Trials 1-10 KO preserved; Trial 11 review pending`. This
request claims no `OK`, integration, promotion, release, or completed remote
macOS execution. The reviewer must remain independent of the author and
publish any verdict in a separate append-only result file.

## Candidate identity

- Sheet: `V5 C/1/00 — Single lifecycle reducer and server-owned transitions`.
- Branch: `feat/V5-C-1-00-lifecycle`.
- Authoritative Trial 10 `KO` / Trial 11 base:
  `3797b3c9e3383a156db3de411e8bf530dce01386`.
- Base tree:
  `d3d4e52f7c91db38d5951e2e167746f3160d1b96`.
- Trial 11 technical commit:
  `c9c5f471b7cdd1effaefd704838bb071dcd8acaa`.
- Trial 11 technical tree:
  `d254c3e421521f7d7b0c2ebd1bc7095e40c87a6b`.
- Correction range:
  `3797b3c9e3383a156db3de411e8bf530dce01386..c9c5f471b7cdd1effaefd704838bb071dcd8acaa`.
- Range size: 19 files, 3,417 insertions, and 310 deletions.

The technical commit is the direct child of the authoritative Trial 10
verdict. This request is a separate request-only commit and is not part of the
technical tree under review.

## Required independent review scope

Review the implementation, tests, CI contract, documentation, and real failure
evidence rather than accepting the author summaries. At minimum:

1. Verify runtime preflight is bounded for FIFOs and other special files,
   accepts only a regular executable with a supported loader header, resolves a
   relative `PATH` against the effective `cwd`, and reuses that exact absolute
   runtime for both launcher and runner execution. Missing, unreadable,
   non-executable, directory, FIFO, and invalid-loader cases must expose only
   `SYNC_RUNNER_UNAVAILABLE`.
2. Audit the fixed fd4 launcher. It must use direct `execve` with the configured
   runtime, contain no shell or ambient second-interpreter lookup, close fd4 on
   successful exec, and report a canonical runtime-exec record only when that
   exact exec fails.
3. Treat fd3 and fd4 as hostile control transcripts. Verify canonical JSON,
   duplicate-key rejection, exact keys and ordering, bounded raw bytes, and
   exactly one authenticated provider outcome
   `{kind,version,cause,status,signal}`. Provider `ENOENT` must bind to native
   exit 127, other exec failures to 126, and ordinary exits/signals to the
   native Node result; mismatches must fail closed as runner infrastructure.
4. Audit fork ownership line by line. Signal and wait authority must be adopted
   immediately after `fork`; READY may promote only signal authority from the
   exact PID to the reserved PGID. Final cleanup must kill the still-owned
   group, revoke signal authority before exact `waitpid`, invalidate wait
   authority after reap, restore the exact signal mask, and never reuse a stale
   numeric PID/PGID after an exception.
5. Regress Linux `waitid(..., WNOWAIT)`, subreaping,
   `PR_SET_PDEATHSIG`, runner-owned absolute deadlines, and in-group cleanup.
   Confirm the post-leader drain also kills and reaps an adopted descendant
   that created a new session, retains the timer until two child snapshots are
   empty, and does not rewrite native `ENOBUFS`.
6. Audit the Darwin runner and CI-supervisor seams independently. A kqueue
   observer must be registered before RELEASE, an immediate registration-time
   `NOTE_EXIT` must be cached, and constructor, registration, pipe-drain,
   post-wait, and observer failures must still perform exact kill/reap and
   authority invalidation. Confirm no Linux primitive is touched by the Darwin
   dispatch path.
7. Validate the canonical CI matrix and skip contract. The two macOS
   Python 3.11/3.12 rows must call the unchanged `scripts/ci.sh`; Darwin may
   allow only the exact 15 Linux-kernel structure IDs and one Gateway
   parent-death ID. Local Linux and deterministic seam evidence must not be
   presented as a completed remote macOS run.
8. Re-run the focal real-process and deterministic collision cases, including
   special-file preflight, same-runtime execution without ambient Python,
   native status/signal authentication, post-fork and post-reap failure seams,
   delayed native timeout, PGID confinement, adopted-session drain, and
   near-deadline `ENOBUFS`.
9. Reconcile ADR-007, ADR-009, architecture, CI contract, Gateway/root READMEs,
   operator guide, MVP2 runbook, C/1/00, C/0/02, and the Stage C ledger with
   the implementation and actual evidence.
10. Confirm Trial 1-10 request/result history remains append-only and
    `gateway/src/tools/message.js`, `message.*`, `agents:events`, coordination
    Redis, policies, migrations, dependencies, shared MCP/Redis, providers, and
    tmux remain outside the correction.

## Author TDD and verification evidence

- Targeted runner RED: six blocking cases failed before their production
  corrections; the retained targeted set reached **6/6** GREEN.
- Expanded synchronous-boundary focal:
  `node --test tests/gateway/sync_process_deadline.test.js` —
  **41/41 passed**.
- CI manifest/portable-supervisor focal:
  `python -m pytest -q tests/structure/test_ci_suite_manifest.py` —
  **86/86 passed**.
- Final structure suite after the evidence-only ledger update:
  `python -m pytest -q tests/structure` — **231/231 passed**.
- `python scripts/ci_gate.py --validate-only` and `git diff --check` passed on
  the exact technical tree.
- Strict real-process stress: **1,000/1,000** 20-millisecond expiries,
  **24.196 ms** maximum, zero runs at or above 100 ms, and no matching
  runner/provider process in the post-phase scan.
- The 41-test focal file covers deterministic deadline collision, delayed
  native timeout, PGID confinement, and real near-deadline `ENOBUFS`.
  Two additional identity-marker harness attempts were deliberately not
  counted because their temporary marker did not publish before the 50 ms
  product deadline; this request makes no new **500/500** Trial 11 claim.
- The final isolated complete gate exited zero:
  **1,197 tests / 1,185 passed / 12 exact allowed skips / 0 failed**.
  It included structure **231/231**, Gateway **815 passed / 9 PostgreSQL
  skips**, E2E **24/24**, CLI **29/29**, LangGraph **81 passed / 3 opt-in
  skips**, lock and lint gates, policy validation, and the disposable MCP
  smoke. Redis, PostgreSQL, Temporal, real providers, and shared MCP state were
  not used.
- A prior setup attempt stopped at policy validation because its isolated
  environment lacked the local `agent-run` editable. Both repository-local
  packages were then installed offline and the complete gate above was rerun;
  no product failure is hidden by that environment correction.
- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- Redacted staged gitleaks scan: no leaks.
- An independent documentation/ledger consistency pass reported zero P1/P2
  after the factual C/0/02 identities and pending macOS evidence were
  reconciled. This is supporting evidence, not the requested technical
  verdict.

## Reviewer execution and result

The reviewer should use an isolated environment, leave shared Redis/MCP,
providers, tmux, and credentials untouched, and run the strongest applicable
subset plus the complete gate. Actual macOS execution is strongly preferred;
if unavailable, the result must state that limitation and review the Darwin
seams adversarially rather than converting configuration into evidence.

Publish the verdict only in:

`plan/reviews/PROJECT_V5/C_1_0-11_result.md`

The result must bind the full technical commit and tree, list commands and
counts, classify every finding, state `OK` or `KO`, and remain a separate
result-only commit. Do not edit this request or any Trial 1-10 artifact.
