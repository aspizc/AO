# Review Verdict — V5 E4/S01 (Trial 1)

Verdict: **OK**

No blocking findings.

The architecture document matches the implementation boundary: MCP callers
and direct Node callers converge on the same seven-operation coordination
service and Redis queue, while `createCoordination` remains an importable
Gateway factory rather than a new standalone orchestrator. The policy wording
correctly distinguishes the existing spawn/artifact policy engine from the
coordination service's own strict input, lease-token, scope, and atomic Redis
fences.

TM-13 through TM-19 cover stale or replaced leases, body and authority
injection, token/digest disclosure, cross-scope and cross-inbox access, raw
Redis bypass, accidental legacy-audit publication, and replay after the
bounded dedupe window. Their controls and cited test paths exist and agree with
the current implementation. Operator-owned Redis ACL/TLS isolation and
long-horizon consumer dedupe are identified as residual responsibilities
rather than acceptance claims. The threat model also states honestly that
same-scope participant metadata is public and is not secret-scanned.

The runtime guide names exactly seven additive tools and all ten current
coordination environment variables. Defaults and bounds match `config.js`,
including Redis URL fallback, disabled/lazy construction, lease-default versus
lease-maximum validation, the 65,536-byte v1 ceiling, and positive safe-integer
parsing. Redis 7 standalone/one-shard support, addressed at-least-once
delivery, bounded dedupe and ACK windows, JSONL-only coordination audit, and
the no-restart rollout guidance are consistent with the service, queue, audit,
registry, and tests.

The changelog records V5 as additive, keeps `message.*` and `agents:events`
unchanged, and now reflects the current policy registry: Claude permits Fable
5, Opus 5, and Opus 4.8, with `opus` resolving to Opus 5. Root `README.md`,
the policy registry, legacy message implementation, and audit/MCP
implementation have no E4/S01 diff.

## Independent verification

- V5 integration docs plus existing architecture/threat-model structure
  checks — 12/12 passed.
- All non-live tests cited by TM-13 through TM-19 — 98 passed, one expected
  opt-in two-instance Redis test skipped, zero failed.
- Configuration, factory, audit, surface-parity, registry, MCP bootstrap, and
  current policy/alias regressions — 70/70 passed.
- Every V5 threat-model test path resolves to a real file.
- Scoped repository diff check — passed.
- No Redis instance, shared MCP process, or network service was contacted.
