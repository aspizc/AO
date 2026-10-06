# Review Submission — G/0/02 ACK reconciliation forward-port (Trial 1)

## Review requested

Independent review is requested for the TDD forward-port of the ACK
reconciliation hardening onto the current integrated anchor. This is a new
resolved candidate, not a merge or byte-identical reuse of the old-base
`5416fd3` candidate.

- Base: `900007a12abbd598b193fba27e16a1edc0e27a53`
- RED: `6eef2d10b8e1f4a97aa761d90c8bebe52acf1f6e`
- GREEN: `7b90a7ee68b46ba2d930d0b866cabb13616828e3`
- GREEN tree: `73645b9a8ba90ca6447046a11bfec9f07b1eddce`
- Historical source: `f312e11`, `36845ca`, `5416fd3`

The earlier old-base Trial 4 procedural review recorded no product defect; it
returned KO because the fresh reviewer stopped before running the required
evidence within the 20,000-token budget. Its result is not claimed as authority
for this resolved tree.

## TDD RED

The old test-only commits were forward-ported first. The add/add Redis test was
resolved by unioning the current integrated suite with the corrupt-presence
coverage and by retaining current private-lane/AbortSignal tests rather than
reintroducing the obsolete public `RedisClientLane` authority surface.

Focused RED command:

```text
node --test --test-concurrency=1 \
  tests/gateway/coordination_ack_reconciliation.test.js \
  tests/gateway/coordination_queue_ack_ephemeral_redis.test.js
```

Result: **73 tests / 72 passed / 1 failed / 0 skipped**. The single semantic
failure was `ACK proof values are opaque evidence minted only by their producer
facet`: `coordinationAckProofCode` was absent. Imports, Redis isolation, and all
other assertions passed. The old `36845ca` queue-authority RED was already
present on the integrated base and cherry-picked empty; its focused lane passed
45/45.

## TDD GREEN and conflict resolution

The GREEN forward-port changes only four existing paths:

- `gateway/src/core/coordination_ack_reconciler.js`
- `gateway/src/core/repositories/coordination_consumer_repo.js`
- `tests/gateway/coordination_ack_reconciliation.test.js`
- `tests/gateway/coordination_queue_ack_ephemeral_redis.test.js`

It mints opaque producer-bound ACK evidence in a private WeakMap and validates
that evidence in the reconciler. Conflict resolution deliberately retained the
integrated base's `execute(operation, { signal })` API and queue signal
propagation unchanged. No manifest path was added and no policy changed.

Focused three-file GREEN: **118/118 passed**. Expanded impacted lane across ACK
reconciliation, consumer, ACK, Redis lifecycle/presence/receive/send and queue
contracts: **217/217 passed**, 0 failed, 0 skipped. Focused ESLint over the
historical eight-path scope exited 0. `python scripts/ci_gate.py --validate-only`
passed before and after the forward-port. `git diff --check` and the no-policy
guard passed.

## Full-gate boundary

`bash scripts/ci.sh` was run and is **not green**. It passed `lock.python`,
`release.candidate`, and `lint.gateway`, then reported the integrated base's
existing Python lint debt (**83 errors**) and `test.structure` could not run
because `/home/carase/miniconda3/bin/python` has no `pytest`. These failures are
outside the four-path candidate diff and are preserved as integration blockers,
not skipped or pass credit. This request makes no integration, promotion, or
release claim.

## Review focus

Authenticate both commits and the four-path diff; reproduce the 73-test RED
from the RED commit and the 118/118 plus 217/217 GREEN lanes; verify opaque
producer binding and that AbortSignal/private-lane behavior did not regress;
run focused lint, manifest validation, diff/no-policy guards; and preserve the
full-gate failures as blockers. Write only the immutable forward-port Trial 1
result and its index verdict.
