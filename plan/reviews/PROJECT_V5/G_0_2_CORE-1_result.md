# Replacement Independent Review Result — Project V5 G/0/02 CORE (Trial 1)

## Review identity and independence

- Verdict: **KO**
- P0 findings: **0**
- P1 findings: **3**
- Reviewer: **GPT-5.6 Sol, ultra reasoning**
- This is the clean replacement review requested after the earlier review was
  invalidated. The invalidated review and all messages or conclusions from its
  reviewer or child were neither read nor used.
- This review was performed from the frozen candidate, from source, without
  delegation, agents, network access, Redis, MCP, KYA, services, tmux, or
  aggregate/full-suite commands.
- The only authorized mutation is this result file.

## Frozen identity and scope

The candidate was clean at intake. The verified linear chain is:

```text
d441097c81a3264a717faae43e318c3e525070d0  base
  -> 9940b2a848c84036190b06d9787db604f05f39cd  RED
  -> ff29519b1da60083cc27146280430825568a1610  RED expansion
  -> 0a0253119681215b691b37a8fd006d2d17d6f0dc  initial technical
  -> 90b0fcc6d92b8ce7696a2a0eee9f69cbe3ef0b5e  RED correction
  -> 49b56cda178073e940a563e79ae1076bd7cb562d  final technical
  -> dd2593b69a98a182a0250529bbe7bee00a90b3dc  request only
```

- Technical tree: `880455aa665a5eac293147a561e727db6ea41594`
- Request tree: `eebead54319aa37054125ee7b93cab52221dd4df`
- Technical range:
  `d441097c81a3264a717faae43e318c3e525070d0..49b56cda178073e940a563e79ae1076bd7cb562d`
- Range identity: **5 commits, 4 files, 3,461 insertions, 0 deletions**
- The four technical files are exactly the ADR, consumer core, in-memory
  repository, and directed consumer test.
- `dd2593b69a98a182a0250529bbe7bee00a90b3dc` adds only
  `plan/reviews/PROJECT_V5/G_0_2_CORE-1_to_review.md`.

## P1 findings

### P1-1 — A blocked quarantine cannot recover after the documented operator restart

The ADR says that after vault correction, recovery requires an explicit
operator-controlled restart
(`docs/adr/ADR-V5-G-0-02-coordination-consumer-core.md:157-164`). The state
machine makes that restart ineffective:

- `blockQuarantine()` persists `quarantine_blocked`, clears the lease, and
  stores no usable quarantine
  (`gateway/src/core/repositories/coordination_consumer_repo.js:414-438`).
- Every later `claim()`, including one from a new owner/process, returns
  `blocked` unconditionally
  (`gateway/src/core/repositories/coordination_consumer_repo.js:298-306`).
- The consumer maps that result directly back to `paused` without calling the
  recovered vault
  (`gateway/src/core/coordination_consumer.js:763-771`).
- The repository port exposes no fenced resume/reset transition
  (`gateway/src/core/repositories/coordination_consumer_repo.js:669-683`).

A focused in-memory reproduction kept the same repository, exhausted the vault,
then restored the vault and constructed a new consumer with a new owner ID. It
produced:

```json
{
  "firstStatus": "paused",
  "afterRestartStatus": "paused",
  "vaultPutCalls": 1,
  "ackCalls": 0
}
```

The second consumer never retried `put`. With the durable repository required
for production, a restart therefore leaves the pending poison delivery
permanently wedged and can repeatedly stop the runner ahead of later inbox
work.

Required correction: add an explicit, operator-controlled and token-fenced
resume transition (or an equivalent restart-generation contract) that permits
exactly the blocked vault operation to resume after correction, while retaining
the current no-ACK/no-hot-loop behavior. Test the same durable repository
across a replacement consumer: unhealthy restarts must remain paused, then an
authorized recovery after vault repair must store, commit quarantine, and ACK
once.

### P1-2 — The raw-error and public-code boundary is forgeable

The core promises to discard raw dependency errors and admit only safe public
codes, but both protections can be bypassed:

- `CoordinationConsumerError` is publicly exported
  (`gateway/src/core/coordination_consumer.js:68-74`).
- `safeFailure()` returns any instance of that public class unchanged, including
  its caller-controlled message
  (`gateway/src/core/coordination_consumer.js:142-147`).
- `safeErrorCode()` admits every string beginning with
  `COORDINATION_CONSUMER_`, rather than a closed set of core-created codes
  (`gateway/src/core/coordination_consumer.js:128-139`).
- ACK dependency failures pass through these functions and into the public
  rejection/status boundary
  (`gateway/src/core/coordination_consumer.js:540-543`,
  `gateway/src/core/coordination_consumer.js:595-603`).

The focused reproduction showed both failures:

```json
{
  "leakedMessage": "LEAK_CANARY_RAW_MESSAGE",
  "forgedPublicCode": "COORDINATION_CONSUMER_TOKEN_LEAK_CANARY",
  "forgedStatusCode": "COORDINATION_CONSUMER_TOKEN_LEAK_CANARY"
}
```

An injected dependency or replay handler can therefore expose raw exception
text, including a message-derived value, by throwing the exported error class.
It can also place a credential-shaped value into results, status, audit, or
metrics merely by prefixing its code with the consumer namespace. The existing
test covers only an unprefixed `TOKEN_*` code
(`tests/gateway/coordination_consumer.test.js:643-670`).

Required correction: always reconstruct public errors with a fixed message;
preserve internal errors only through a module-private, unforgeable brand (or
reconstruct those too), and replace prefix acceptance with exact closed
allowlists appropriate to each boundary. Add hostile tests for the exported
class, a forged `COORDINATION_CONSUMER_*` dependency code, and a replay-handler
error whose raw message contains the body canary.

### P1-3 — Rejected async audit/metric sinks escape the best-effort boundary

`safeObservation()` catches only a synchronous throw. It neither awaits nor
attaches a rejection handler to the sink's returned promise
(`gateway/src/core/coordination_consumer.js:448-453`). The injected boundary
accepts any function and does not declare or enforce a synchronous-only
contract (`gateway/src/core/coordination_consumer.js:357-367`).

A focused consumer run with `audit: async () => { throw ... }` completed the
business effect and ACK, then emitted two unhandled rejections:

```json
{
  "unhandledReasons": [
    "ASYNC_OBSERVATION_REJECTION",
    "ASYNC_OBSERVATION_REJECTION"
  ]
}
```

Without a temporary `unhandledRejection` listener, Node 22.22.1 terminated the
focused process with exit code 1 at `safeObservation`. Thus an observability
outage can terminate the host after an authoritative effect/ACK, contradicting
the source's own “best effort, and never authoritative” rule and undermining
the runner's supervision guarantee.

Required correction: safely consume thenables returned by audit/metric sinks
and suppress their rejection without blocking domain progress (while retaining
the synchronous catch). Add a test that rejects asynchronously, observes no
`unhandledRejection`, and confirms effect, receipt, ACK, and runner result are
unchanged.

## Verified behavior outside the findings

The following high-risk paths were inspected and are not findings in this
trial:

- Processing and replay claims use independently replaced tokens; stale
  same-owner mutations fail after reclaim.
- Business effect or quarantine receipt commit precedes transport ACK.
  Redelivery after receipt commit reaches ACK only.
- A handler abort before a committed result releases without ACK; once the
  handler has returned `committed`, receipt and ACK complete despite concurrent
  abort.
- The bound ACK result is projected to the exact requested delivery ID. The
  unchanged direct service proves `1` for the first pending ACK, `0` only for
  its live exact tombstone retry, and
  `COORDINATION_DELIVERY_NOT_FOUND` for unknown/cross-inbox IDs.
- Handler and vault attempts, delay, lease, receive, reclaim, and busy-poll
  controls have explicit ceilings; default sleep removes its abort listener.
- Quarantine receipt projections and replay authorization omit the body and
  private locator. Replay revalidates protocol, scope, recipient, malformed
  state, and canonical consume identity before handler execution.
- Replay authorization binds command, quarantine, consume key, decision, and
  principal; replay claim tokens fence stale commit/failure, and distinct
  authorized command IDs converge after the first committed replay.
- `getStatus()` is recursively frozen and fixed-shape with saturating counters.
- The in-memory descriptor states exactly `durable: false`,
  `atomicWithBusinessEffect: false`, and `bodyStorage: false`.
- The request honestly limits the candidate to a standalone core and does not
  claim Redis integration, service/health wiring, full-sheet completion,
  integration, promotion, or release.

## Verification evidence

- `node --test --test-concurrency=1
  tests/gateway/coordination_consumer.test.js`:
  **33 passed, 0 failed, 0 skipped**.
- Directed consumer plus unchanged receive/ACK service tests:
  **50 passed, 0 failed, 0 skipped**.
- Directed ESLint with the request's lock-matched ESLint 10.8.0:
  **passed**.
- Bare `python -m pytest` could not start because the active interpreter has no
  pytest module. The already-existing integration venv ran exactly the two
  requested structure files with Python 3.13.13 / pytest 9.1.1:
  **11 passed**. No package was installed.
- `git diff --check
  d441097c81a3264a717faae43e318c3e525070d0..49b56cda178073e940a563e79ae1076bd7cb562d`:
  **passed**.
- `gitleaks detect --redact --no-banner
  --log-opts=d441097c81a3264a717faae43e318c3e525070d0..49b56cda178073e940a563e79ae1076bd7cb562d`:
  **5 commits scanned, no leaks found**.
- Focused in-memory reproductions exercised only the submitted consumer and
  repository; they created no files or services.

No aggregate `npm test`, `scripts/ci.sh`, full CI, Redis/live integration,
network, MCP, KYA, provider, tmux, service, or agent command was run.

## Final verdict

**KO.** The claim/replay fencing and core effect ordering are substantially
sound, but the terminal blocked-quarantine state, forgeable error projection,
and unhandled async observation failures are P1 defects. A correction trial is
required before this standalone core can receive an independent OK.
