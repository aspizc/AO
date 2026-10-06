# Review Submission — G/0/02 ACK reconciliation forward-port (Trial 2)

## Review requested

Independent review is requested for the persistent-SQLite correction found by
the canonical gate after Trial 1. Trial 1's OK remains immutable evidence for
its exact tree; this request supersedes that tree for integration purposes.

- Base: `900007a12abbd598b193fba27e16a1edc0e27a53`
- Trial 1 reviewed head / Trial 2 RED: `cae7aaeb5cc5f055230a2152dd67541e91df552e`
- Trial 2 GREEN: `b335a4eed22716c7228bd5b40dca1eba31971cd9`
- Trial 2 GREEN tree: `459a9056db2579fc0dd1d5218e6d529220561b87`
- Trace: `tr-v5-g002-ack-forwardport-c3fb0776-baa9-402e-b807-52beee843c22`

## TDD RED

The existing test below is the RED. On the exact Trial 1 head it fails
deterministically because the losing reconciler observes a terminal SQLite
intent whose durable proof is the string `ACK_TOMBSTONE`, while the reconciler
only accepts process-local opaque WeakMap evidence:

```text
node --test --test-name-pattern='two reconcilers over one stale SQLite page' \
  tests/gateway/coordination_ack_outbox_sqlite.test.js
```

Result on `cae7aae`: **1 test / 0 passed / 1 failed / 0 skipped**, wrapped as
`COORDINATION_ACK_RECONCILIATION_FAILED`. The full gate on that tree also
reproduced the same product failure. This is an existing intent-bearing test,
not a fixture-only structure assertion.

## TDD GREEN

Commit `b335a4e` changes exactly four paths (+54/-4):

- `gateway/src/core/coordination_ack_reconciler.js`
- `gateway/src/core/repositories/sqlite_coordination_consumer_repo.js`
- `tests/gateway/coordination_ack_outbox_sqlite.test.js`
- `tests/gateway/coordination_ack_reconciliation.test.js`

SQLite retains and validates proof codes inside its durable boundary but
redacts proof to `null` in public terminal `committed` intent DTOs. The
reconciler permits that redaction only for a closed `status=committed` claim,
which is a mutation-free no-op. It still rejects a hostile committed string
proof before transport. The in-memory repository's opaque, producer-minted
WeakMap evidence and `coordinationAckProofCode` contract remain unchanged.

Verification recorded by the coder:

- isolated stale-page GREEN: 1/1 and 25/25 repetitions;
- reconciliation + SQLite suites: 34/34;
- expanded six-file ACK/runtime/Redis/AbortSignal lane: 192/192;
- focused ESLint, manifest validate-only, diff check, and no-policy guard: rc 0.

## Canonical gate and skip budget

The orchestrator reproduced the exact custom tmux runtime from the pinned
source/patch and ran the gate with the required isolated runtime variables and
a disposable loopback Redis 7.2 service:

```text
D007C_TEST_TMUX_PATH=<verified-custom-tmux-directory>
D007C_TMUX_SOCKET_NAME=d007c-control-probe
D007C_RUN_REAL_TMUX_PROBE=1
AGENTS_TEST_REDIS_URL=redis://127.0.0.1:<disposable-port>/0
bash scripts/ci.sh
```

Result on `b335a4e`: **exit 0; 2,579 tests; 2,567 passed; 0 failed; 12
skipped; aggregate `infrastructure_unavailable`**. Required Redis live passed
22/22. Gateway passed 1,578 with nine exact allowlisted experimental Postgres
skips. LangGraph passed 81 with three exact allowlisted opt-ins (two live
Gateway and one Temporal). The real-agent provider lane is optional and was
unselected. The pinned real-host tmux probe ran; there was no unexpected tmux
skip. The disposable Redis container was stopped and removed after the run.

The aggregate name is preserved exactly: it is not called `passed`. Exit 0 is
the repository's documented result when all unavailable cases are explicitly
allowlisted and no required service is missing.

## Review focus

Authenticate ancestry, the four-path Trial 2 diff, and tree. Reproduce the RED
on `cae7aae`, the isolated GREEN repeatedly, the 34-test and 192-test lanes,
focused lint/guards, and inspect that durable proof redaction cannot authorize
a forged proof or a transport call. Reproduce the canonical gate with a fresh
disposable Redis service and the three exact D007C variables, preserving the
skip budget and aggregate name. Write only a new immutable Trial 2 result and
its index verdict. This request makes no integration, promotion, release, or
support claim.
