# Review Submission — Project V5 G/0/02 CORE (Trial 4)

## Review requested

Independent, evidence-based review is requested for the frozen Trial 4
technical range ending at
`62ebedfeb58887d80422746815e4c378c435fde5`.

This request corrects only Trial 3 P1-1. It is request-only evidence: it
contains no automatic verdict, result, integration, promotion, release, or
full-`G/0/02` completion claim.

## Trial 4 correction

`claimBlockedQuarantine` now derives and validates the replacement expiry and
next safe claim epoch before mutating receipt state. It also constructs the
next token and lease before the transition. Only after those steps succeed
does the in-memory port synchronously:

1. append the fresh recovery ID;
2. replace the claim epoch;
3. replace the lease/token; and
4. update the receipt timestamp.

The derivation error remains visible to the caller; it is neither caught nor
translated. Receipt-fixed capacity, membership order, busy/blocked states,
history retention, token fencing, ACK tombstones, handler/vault/replay/error
contracts, body-free public projections, and the explicit non-durable
repository descriptor are unchanged.

The existing ADR already requires the all-or-nothing transition and was not
changed.

## Directed regression

The direct repository-port test creates a `quarantine_blocked` receipt with
capacity two. Distinct recovery IDs A and B each request a lease at
`now=Number.MAX_SAFE_INTEGER` with `leaseMs=1`.

For each rejected request the test proves:

- the exact expiry overflow is propagated;
- no result or claim token is emitted; and
- the public receipt is unchanged and discloses no private recovery ID.

The decisive private-state proof then uses valid times:

- A claims exactly `claim-2` and returns to `quarantine_blocked`;
- B claims exactly `claim-3` and returns to `quarantine_blocked`; and
- fresh C is `blocked` only after A and B legitimately consume the fixed
  capacity.

Thus the rejected requests consume neither a recovery ID, claim generation,
nor capacity.

## TDD evidence

### RED

- Commit:
  `4d6f0de5c4bb0e2264c55b295f9b65964340b91a`
- Subject:
  `test(consumer): reproduce rejected recovery mutation (RED)`
- Tree:
  `9464910f248ad4ab8e4d4e333ac6fe49e1035c87`
- Direct parent:
  `f7f7386d10b21d6c6aa7bc85fee4ee9fced035c8`
- Changed path:
  `tests/gateway/coordination_consumer.test.js`

Command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js
```

Expected RED result:

- **40 passed / 1 failed / 0 skipped**.
- The new regression failed because valid A returned `blocked` instead of
  `claimed` after the two rejected overflow requests. This demonstrated that
  the base had already consumed both IDs and the fixed capacity.

### GREEN

- Commit:
  `62ebedfeb58887d80422746815e4c378c435fde5`
- Subject:
  `fix(consumer): make blocked recovery claim atomic`
- Tree:
  `98929c20e08d9ce8d144dd64887952cbdda24873`
- Direct parent:
  `4d6f0de5c4bb0e2264c55b295f9b65964340b91a`
- Changed path:
  `gateway/src/core/repositories/coordination_consumer_repo.js`

The same command passed:

- **41 passed / 0 failed / 0 skipped**.

## Directed verification

Consumer plus unchanged receive/ACK contracts:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_consumer.test.js \
  tests/gateway/coordination_service_receive.test.js \
  tests/gateway/coordination_service_ack.test.js
```

- **58 passed / 0 failed / 0 skipped**.

Lock-matched ESLint:

```text
/tmp/agents-orchestrator-v5-wave2-integration/gateway/node_modules/.bin/eslint \
  --config \
  /tmp/agents-orchestrator-v5-wave2-integration/gateway/eslint.config.js \
  gateway/src/core/coordination_consumer.js \
  gateway/src/core/repositories/coordination_consumer_repo.js \
  tests/gateway/coordination_consumer.test.js
```

- passed with ESLint **10.8.0**;
- candidate and tool-provider `gateway/package-lock.json` SHA-256:
  `71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
- candidate and tool-provider ESLint configuration SHA-256:
  `31ca81e80a247e06bfbf720df9372923bdf73acc0016387cc6fceae7a2a71252`.

Exact Trial 3 structure checks:

```text
/tmp/agents-orchestrator-v5-wave2-integration/.venv/bin/python \
  -m pytest -q \
  tests/structure/test_project_layout.py \
  tests/structure/test_v5_coordination_docs.py
```

- **11 passed** with Python **3.13.13** / pytest **9.1.1**.

Range checks:

- `git diff --check
  f7f7386d10b21d6c6aa7bc85fee4ee9fced035c8..62ebedfeb58887d80422746815e4c378c435fde5`
  — passed.
- `gitleaks detect --redact --no-banner
  --log-opts=f7f7386d10b21d6c6aa7bc85fee4ee9fced035c8..62ebedfeb58887d80422746815e4c378c435fde5`
  — scanned both technical commits; no leaks found.

Runtime identity:

- Node **22.22.1**.

## Frozen identity and scope

- Exact Trial 4 base:
  `f7f7386d10b21d6c6aa7bc85fee4ee9fced035c8`
- Base tree:
  `2339c6ef2b55ac546c8dba1d26d049b69af5d832`
- RED commit:
  `4d6f0de5c4bb0e2264c55b295f9b65964340b91a`
- Technical commit:
  `62ebedfeb58887d80422746815e4c378c435fde5`
- Trial 4 technical range:
  `f7f7386d10b21d6c6aa7bc85fee4ee9fced035c8..62ebedfeb58887d80422746815e4c378c435fde5`
- Range identity:
  **2 commits / 2 files / 101 insertions / 7 deletions**
- Branch:
  `feat/V5-G-0-02-consumer`
- Worktree:
  `/tmp/agents-orchestrator-v5-g002.MsiMXe/worktree`

The technical range changes exactly:

- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_consumer.test.js`

It does not change the ADR, consumer runner, queue, services, Redis
lifecycle/client, MCP/tools, catalog/config/health, migrations, shared
repositories, adapters/providers, manifests, workflows, locks, indexes, plan
sheets, `agents:events`, or legacy `message.*`.

No Redis, network, MCP, KYA, provider, service, tmux, live-agent, aggregate npm
test, suite aggregation, full CI, shared-plan, migration, integration,
promotion, or release command was run.

## Remaining dependency-gated scope

This remains a standalone core correction. Production still requires the
durable repository/migration, atomic or durably idempotent business-effect
composition, durable body vault, service/lifecycle wiring, Redis
crash/reclaim integration, and health/inventory composition described by the
ADR. Trial 4 claims none of those dependencies and no full-sheet acceptance
criterion.

## Review focus

- Reproduce the two expiry rejections and confirm valid A/B still receive
  exactly `claim-2`/`claim-3`, with C denied only after legitimate exhaustion.
- Confirm every fallible derived replacement value is validated before the
  receipt history, epoch, lease, token, or timestamp changes.
- Confirm the error is propagated unchanged and public projections remain
  body-free.
- Confirm the technical range is limited to the one directed test and the
  minimal in-memory port correction.

Independent review is requested. No automatic review or integration follows
from this file.
