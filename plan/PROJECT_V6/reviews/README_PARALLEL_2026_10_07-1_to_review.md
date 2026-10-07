# README parallel operation — independent review request, trial 1

- Base: `489dcc7b167e3a272927daa3775297d4990e999c`.
- Candidate tree: `f20d79ee9e2cf33631bd78b8af438eb5fabcde1a`.
- Branch: `release/1.1.0`.
- Trace: `tr-ao-readme-par-6c539c0d-af48-40b9-a43a-3f68290dc052`.
- Reviewer: separately assigned Codex session under the previously authorized
  session-agent fallback. No Claude or Gateway-spawned review is claimed.

## Request and acceptance

The operator requested README recommendations for the coordination channel
when multiple orchestrators work concurrently, worktrees and memory care.
This documentation-only candidate changes `README.md` and adds navigation
plus guidance for:

- Correct tool surfaces, peer bootstrap, leases, addressed impact notices,
  idempotent handling, durable evidence, ACK and authority boundaries.
- Shared-file ownership, isolated writing lanes, an explicit base SHA,
  resource isolation, serial integration and safe worktree cleanup.
- Host-wide RAM and nested worker budgets, session context, durable recovery
  handoffs and Redis backlog/event retention.

The guidance stays generic and distinguishes operator conventions from
implemented automation. No code, policy, provider default or release change.

## Verification

- `node --test tests/gateway/tool_projection_contract.test.js`: 10 passed,
  0 failed, 0 skipped; exit 0.
- Transient Markdown check: 84 local README links resolve; same-file heading
  targets checked. Cross-file fragments need independent inspection.
- `git diff --cached --check`: passed.
- Coordination semantics checked against `docs/coordination-bus.md` and the
  installed coordination skill. Worktree syntax and shared/per-worktree Git
  state checked against https://git-scm.com/docs/git-worktree.
- No live coordination sends, worker spawning, worktree creation, browser or
  infrastructure operations, or full runtime gate were performed.

Inspect the candidate and source references, then write an immutable verdict.
Only handoff, verdict and review-index evidence may be added after acceptance.
Commit identity remains `carlos.aspizc@gmail.com`; publication is not claimed.
