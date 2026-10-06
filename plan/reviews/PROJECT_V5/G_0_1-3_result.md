# Independent Review — Project V5 G/0/01 Trial 3

## Verdict

**OK** for technical candidate
`b877e85e4ed97a178c5ae4fedfb8b2a4ef60e59b`.

The Trial 2 P1 is closed. The lane-owned connect promise remains
authoritative throughout node-redis's `isOpen=true`/`isReady=false` interval,
coalesced callers do not dispatch before readiness, and an ignored
connecting-phase destroy cannot suppress the required post-handshake cleanup.
No blocking finding remains in the reviewed scope.

This verdict does not integrate, promote, or release the candidate.

## Reviewer execution request

- Requested model: **GPT-5.6 Sol**
- Requested reasoning effort: **ultra**
- Requested service: **Priority/Fast**

The review environment does not expose independently verifiable evidence of
the effective model or service tier. This report records the requested
configuration and does not claim that a particular tier was actually applied.

Review date: 2026-07-26.

## Reviewed identity and scope

- Branch: `feat/V5-G-0-01-redis-lifecycle`
- Trial 2 KO/result-only parent:
  `e072ebbade50625ac6b5a3c52dcfe60038f81705`
- Trial 3 technical commit:
  `b877e85e4ed97a178c5ae4fedfb8b2a4ef60e59b`
- Trial 3 technical tree:
  `6b56473681e819c92b0c0bba0b690203e43ff213`
- Trial 3 request-only commit:
  `09864e14011a5ade92975b469994acea97083d8e`
- Trial 3 request-only tree:
  `f6c74c8065a229bef0d356ea04ff57b0d09f6e6b`

The technical commit is the direct child of the Trial 2 KO. The request-only
commit is the direct child of the technical commit and adds only
`plan/reviews/PROJECT_V5/G_0_1-3_review.md`. The worktree was clean before the
result was written.

## Trial 2 P1 closure

An independent loopback-only RESP listener exercised the lock-matched
`@redis/client` 6.1.0 package without contacting any Redis service.

### Open-before-ready coalescing

- The real client reported `isOpen=true` and `isReady=false`.
- Two callers shared one TCP connection and one connect attempt.
- Zero `PING` commands reached the listener while the handshake was stalled.
- After the listener completed the handshake, both callers succeeded through
  the same ready client and exactly two `PING` commands were dispatched.
- No operation was replayed and orderly close removed the socket and error
  listener.

### Ignored connecting-phase destroy

The real client's first `destroy()` was deliberately wrapped to ignore the
attempt while open but not ready:

- `close()` settled the caller with `COORDINATION_UNAVAILABLE` at its bound and
  reported `closed`, zero active, and zero queued operations.
- Completing the handshake caused a distinct ready-phase destroy.
- Exactly two destroy attempts occurred; the client ended closed and not
  ready, the loopback socket and error listener were removed, and no command
  crossed the close fence.
- No unhandled rejection or lane revival was observed.

### Generation and invalidation races

Independent Redis-shaped probes also confirmed:

- invalidation during a shared handshake keeps that connect promise
  authoritative until it settles;
- a connecting-phase cleanup is followed by ready-phase cleanup when the first
  attempt is ignored;
- both callers in the invalidated generation fail safely with zero dispatch;
- the next operation creates exactly one replacement generation; and
- a deliberately invoked stale error callback from the old generation cannot
  invalidate or reconnect the current ready generation.

## Preserved lifecycle guarantees

- The exact command admission bound is 64 active plus 256 queued operations.
- The exact blocking admission bound is 1 active plus 32 queued operations.
- Excess admission fails with `COORDINATION_UNAVAILABLE`.
- A dispatched failure runs once; a later 32-caller reconnect wave creates one
  replacement connection and does not replay the failed operation.
- Double close returns the same close promise, rejects queued and timed-out
  active callers, and leaves both lane counters at zero.
- Late fulfillment and late rejection after the shutdown epoch cannot change
  the caller result and produce zero `unhandledRejection` events.
- The three Trial 1 shutdown regressions remain green in the committed
  lifecycle suite.

## Independent verification

| Check | Result |
|---|---|
| Exact commit/tree/parent and request-only path verification | passed |
| Independent real-client, generation, bound, replay, and late-outcome harness | passed |
| Focused config/factory/queue/lifecycle/process/registry/bootstrap group | 63 passed; 0 failed; 0 skipped |
| Committed lifecycle file stress | 30/30 executions passed; 13 tests per execution |
| `npm --prefix gateway test` | 750 tests; 731 passed; 19 expected service-gated skips; 0 failed |
| Repository-venv `python -m pytest -q tests/structure` | 290 passed |
| `npm --prefix gateway run lint` with the lock-matched complete dependencies | exit 0 |
| `python scripts/ci_gate.py --repo-root . --validate-only` | `status: passed`; zero errors |
| Complete required lane on isolated Redis 7.2.15 | 10 passed; 0 skipped; 0 failed |
| Isolated Redis database 15 and test namespace after the live lane | zero keys |
| `git diff --check` on technical and request ranges | passed |
| Redacted gitleaks scan of technical range | 1 commit scanned; no leaks |
| Redacted gitleaks scan of request range | 1 commit scanned; no leaks |
| Legacy `message.js` SHA-256 at KO parent and candidate | `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac` |

The 19 ordinary Gateway skips are the expected service-gated cases in the
non-live invocation. The separately isolated required Redis lane had no skips.

## Documentation and compatibility assessment

The ADR, architecture, coordination guide, Gateway guide, changelog, sheet,
stage index, and project indexes consistently keep G/0/01
implemented-but-unreviewed before this verdict and describe the lane-owned
handshake and phase-specific cleanup. The correction does not change the
public coordination projection, safe error surface, `agents:events`, or
production `message.*` behavior.

## Safety and cleanup

- Live verification used only the disposable container
  `ao-v5-g001-review3-09864e1`, Redis 7.2.15, database 15, a dynamically
  assigned loopback port, and test-owned prefixes.
- Database 15 contained zero keys before the container was stopped and
  automatically removed.
- The real-client probes used temporary loopback TCP listeners and closed every
  accepted socket.
- The shared `kya-coord-redis` container remained running on
  `127.0.0.1:6379`; it was not contacted, restarted, stopped, flushed, or
  reconfigured. No shared MCP process was contacted or restarted.
- No `FLUSHDB`, shared stream, external network, delegated agent, tmux session,
  push, amend, integration, promotion, or release operation was used.
- The independent probe and temporary `node_modules` symlink were removed
  before this result-only commit.

Trial 3 is independently **OK**.
