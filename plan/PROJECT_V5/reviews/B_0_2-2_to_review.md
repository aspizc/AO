# Review Submission — Project V5 B/0/02 (Trial 2)

## Trial-1 correction

Trial 1 is preserved in `B_0_2-1_reviewed_KO.md`. This correction addresses
all three blockers:

1. status, initial registration, replacement registration, and heartbeat now
   validate protocol v1, the canonical advertised scope, orchestrator type,
   and stable participant identity before entering or returning to `ready`;
2. terminal `stop()` advances a local abort/epoch fence and resolves without
   waiting for pending status, register, heartbeat, cleanup, or unregister
   calls; late completions cannot revive or rejoin the instance and any usable
   late credential is cleaned up best effort; and
3. injected clock values and schedule additions are restricted to safe
   integer timestamps in the JavaScript `Date` range, so an overflow cannot
   corrupt the public status projection.

An invalid replacement contract is terminal for that rejoin episode. It is
cleaned up when possible and is not retried, avoiding duplicate identities
after a registration result that may already have created presence.

The sheet and accepted ADR now state the implemented lifecycle decision
explicitly: the factory is reusable, while each returned client is a
single-use instance with a bounded terminal stop.

## Review range

- Original implementation: `8628201`.
- Trial-1 submission: `9c6582d`.
- Preserved trial-1 KO: `cbf4e68`.
- Trial-2 correction candidate: `f9dc86b`.

Review the final implementation through `f9dc86b`, focusing the correction on
`cbf4e68..f9dc86b`.

## TDD evidence

- Trial-2 RED:
  `node --test tests/gateway/coordination_client.test.js` — 17 total, 6 passed,
  11 expected failures before correction.
- The failures reproduced unsupported/contradictory contract acceptance,
  unbounded stop during every deferred lifecycle operation, invalid
  replacement retry, and clock-range/status corruption.
- Trial-2 GREEN:
  `node --test tests/gateway/coordination_client.test.js` — 17/17.
- Coordination regression:
  `node --test tests/gateway/coordination*.test.js` — 171 total, 165 passed,
  6 declared Redis integration skips.

## Full verification

- `uv run --with-editable cli --with-editable orchestrator-langgraph --with
  ruff --with pytest bash scripts/ci.sh`:
  - lint passed;
  - structure: 143/143;
  - Gateway: 686 total, 671 passed, 15 declared opt-in skips;
  - E2E: 25 total, 24 passed, 1 declared real-agent skip;
  - MCP stdio smoke passed;
  - policy registry validation passed;
  - CLI: 29/29; and
  - LangGraph: 84 total, 81 passed, 3 declared integration skips.
- `git diff --check` passed.
- Added-line credential signature scan found no match.
- `AGENTS_REDIS_URL`, `AGENTS_COORDINATION_REDIS_URL`, and
  `AGENTS_TEST_REDIS_URL` were unset. No Redis service, shared MCP process, or
  MCP configuration was contacted, changed, restarted, or stopped.
- `message.*`, the `agents:events` implementation, MCP registry/tools,
  `policies/`, `audit/`, and the root README remain unchanged.

## Review focus

- Confirm every contradictory status/participant response fails with
  `COORDINATION_CLIENT_CONTRACT_INVALID` and cannot enter `ready`.
- Confirm explicit canonical `scopeId` registration and stable heartbeat
  identity checks do not weaken the direct-service contract.
- Confirm `stop()` is locally bounded and idempotent for deferred status,
  register, heartbeat, cleanup, and unregister calls, with no unhandled late
  rejection or post-stop rejoin.
- Confirm invalid replacement results do not create retry-driven duplicates.
- Confirm out-of-range/overflowing clocks leave a frozen safe status and a
  stable client error.
- Confirm no public status, error, test artifact, documentation, or review
  file contains a lease credential.

## Review request

Publish `B_0_2-2_reviewed_OK.md` or `B_0_2-2_reviewed_KO.md`. Preserve Trial 1
and list only reproducible blockers in a KO.
