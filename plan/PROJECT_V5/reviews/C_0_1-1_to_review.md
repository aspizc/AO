# Review Submission — Project V5 C/0/01 (Trial 1)

## Outcome

C/0/01 now has one typed authority for the exact public MCP tool order,
descriptions, Zod validators, JSON Schema projections, examples, dependencies,
audit routes, and safe public error codes. Runtime builders bind that catalog,
the registry rejects incomplete or reordered bindings, generated projections
are digest-pinned, and normative prompts and documentation are validated
semantically rather than by string presence alone.

The sheet remains `in_progress; Trial 1 review pending`. This submission does
not claim independent review, completion, promotion, or integration.

## Review range

- Reviewed Wave base: `55221a581ba53a34c85d073ec7d99157b6f1991d`.
- Technical candidate:
  `f46918ca4b224a9abe9faa99602456743bf54bf1`.
- Review the final result in `55221a5..f46918c`.
- Technical commit:
  `f46918c feat(gateway): canonicalize MCP tool contracts (V5 C/0/01)`.

## Frozen contract

- The catalog is recursively frozen and contains exactly 33 tools in protocol
  order.
- Its eight `coordination.*` entries include `coordination.status`.
- Every non-legacy root schema is closed. The three legacy `message.*` roots
  explicitly retain Zod strip compatibility and an open JSON Schema root.
- AJV and Zod agree for every catalog example, unknown-root mutation, repeated
  regex restriction, bound, uniqueness constraint, and supported coordination
  boundary.
- `gateway/contracts/mcp-tools-v1.json` pins projection digest
  `sha256:460c0ed512756c0a63a1a61980664a23acf59de9ad50275f76d44d5ca630e58a`.
- `docs/mcp-tool-catalog.md` is byte-generated from the typed authority and
  contains one semantically validated tool-call example for every tool.
- Unknown exceptions and non-allowlisted domain codes collapse to catalog-owned
  safe envelopes. Policy decisions expose only a valid decision and a
  catalogued rule ID; validation errors retain safe paths and numeric bounds,
  never attacker values.

## TDD evidence

### Contract RED and GREEN

The received diff had no intermediate tests-only commit, so RED was reproduced
without changing the candidate: a temporary tree contained base `55221a5` plus
only the final changed/new tests, with no implementation files copied.

- RED command: the four new catalog/projection/error suites on that tests-only
  tree — 10 tests, 1 passed, 9 failed, exit 1.
- The failures reproduced missing catalog/projection modules, secret-bearing
  exception messages and policy reasons, non-canonical `ruleId` exposure,
  catalog message drift, absent safe validation detail, and a changed legacy
  message error envelope.
- GREEN contract/affected focus: 81/81.
- Legacy tool/bootstrap/adapter regression: 68/68.
- Affected structure suites: 24/24.

### Authoritative-gate RED and correction

The first complete final-tree gate correctly rejected three stale expectations:

- aggregate: 1078 tests, 1063 passed, 12 allowlisted skips, 3 failed, exit 1;
- Gateway: 714 total, 704 passed, 9 skips, 1 failed; and
- E2E: 24 total, 22 passed, 2 failed.

The three failures and their dispositions were:

1. An artifact E2E expected raw `decision.reason`; it now asserts the exact safe
   `POLICY_DENIED` envelope with only `decision` and canonical
   `sanitization.orchestrator_raw`.
2. An unknown-tool E2E expected reflection of `coordination.missing`; it now
   asserts the exact non-reflective `unknown tool` error.
3. Coordination surface parity called four inputs Zod-valid even though the new
   closed catalog rejects them. The test now separates three catalog-valid
   domain rejections, which preserve their domain codes, from four
   catalog-invalid requests, which fail before the service with
   `INVALID_INPUT`.

The correction focus passed 40/40, including legacy message envelopes and
coordination-versus-`agents:events` isolation.

## Final verification

- Authoritative `bash scripts/ci.sh`: exit 0; aggregate
  `infrastructure_unavailable`; 1079 tests, 1067 passed, 12 exact allowlisted
  infrastructure skips, 0 failed.
- Structure: 222/222.
- Gateway: 715 total, 706 passed, 9 declared PostgreSQL skips.
- E2E: 24/24.
- CLI: 29/29.
- LangGraph: 84 total, 81 passed, 3 declared Gateway/Temporal integration
  skips.
- Lock input, Python lint, Gateway lint, MCP smoke, and policy registry:
  passed.
- All 38 affected JavaScript files passed `node --check`.
- `git diff --check`: passed.
- Added-line credential-signature scan: zero matches.

The inventory refresh changed only these two `inventorySha256` fields:

- `lint.gateway`:
  `sha256:0ec6cdd2732e6e000c544062b0353aa6f4acc86ccdb25c12eb2a0fc2de6fcba6`;
- `test.gateway`:
  `sha256:786d8b0262a63de75cf6bc0d2b777b0d46d36d576037058201966b5f8cc5be76`.

No topology or suite-selection field changed.

## Legacy owner guards and exclusions

- `gateway/src/tools/message.js` is byte-identical to base `55221a5`, SHA-256
  `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- Legacy `message.*` still strips unknown fields and preserves its exact
  payload error shape, including `{"error":"TRACE_ACCESS_DENIED"}` without
  `isError`; ignored fields do not enter its audit record.
- `gateway/src/core/audit.js` is unchanged. Coordination calls remain
  local/metadata-only and publish nothing new to `agents:events`.
- No compatibility-breaking tool removal, policy broadening, `.mcp.json`,
  shared audit service, Redis namespace, external MCP service, network fetch,
  provider call, or real tmux/agent session is in scope.

PostgreSQL, Gateway-integration, Temporal, Redis-live, and real-provider lanes
remain visible as their exact declared unavailable infrastructure. No Redis,
PostgreSQL, Temporal, provider, shared MCP process, or external network service
was contacted.

## Review request

Independently verify the exact 33-tool order, eight coordination tools, deep
freeze, Zod/JSON Schema closure and equivalence, generated projection digest,
semantic prompt/doc validation, safe error allowlists and canonical policy
rules, and the explicit legacy `message.*` compatibility shim. Reproduce the
owner guards and authoritative gate. Publish
`C_0_1-1_reviewed_OK.md` or `C_0_1-1_reviewed_KO.md`; preserve this submission
and list only reproducible blockers in a KO.
