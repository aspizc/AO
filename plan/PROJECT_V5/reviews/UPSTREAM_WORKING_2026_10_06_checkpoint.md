# Upstream working-tree synchronization checkpoint

## Scope and authority

- AO base: `d14de7a63af0873830227d3c00ec158558057a1d`.
- Source HEAD remains `393b056eeaefa0fc421c2f1fa4ba329def9ed97c`.
- The operator explicitly authorized importing relevant uncommitted source changes.
- Source tracked changes were copied to an external temporary snapshot before import;
  source files and commits were not modified. Local MCP configuration, untracked
  workspaces, secrets, and machine state are excluded.
- Imported: launch-time MCP principal selection, configurable request-context TTL,
  and additive Sol 6.1 / Claude Sonnet 5.5 / Claude Opus 5.5 model registrations.
- Public adaptations: keep AO model/effort/tier defaults and existing aliases;
  keep 24-hour request contexts, 72-hour maximum coordination leases, and
  24-hour coordination retention. The upstream seven-day preferences and KYA
  default changes are not adopted. Context lifetime can be set explicitly.
- The three capability registries and canonical profile stay synchronized;
  role permissions and approval requirements are unchanged.

## Workflow

Trace: `tr-ao-delta-1006-6b663175-27b0-4367-9e4b-4e3e4ef1049d`.
Task: `ts-8c56b5b1-512f-4450-a69d-2492a4a6a31b`.
Gateway trace/task creation succeeded, but spawning at the AO checkout returned
`REQUEST_CONTEXT_DENIED`. The previously authorized direct implementation and
separate session-agent review exception applies. This is not Gateway-spawned
or cross-vendor review.

## TDD checkpoint

- Initial regression selection: 60 passed, 5 failed, 0 skipped. Missing launch
  settings and model registrations produced the expected failures.
- Intermediate verification caught a model-order mismatch between the registry
  and canonical profile. The profile ordering was aligned without weakening the
  drift guard. The new role test was corrected to pass the resolved effective
  selection to `policy.check`, matching the public service contract.
- Final focused selection: 65 passed, 0 failed, 0 skipped (MCP bootstrap,
  configuration, request context, orchestrator profile, policy/model behavior).
- Public default structure selection: 3 passed, 0 failed, 0 skipped.
- Full gate and independent review remain pending at this checkpoint.
- GitHub publication remains pending: HTTPS credentials are unavailable and
  GitHub rejects the configured SSH identity. No push success is claimed.

## Captured source SHA-256 hashes

- `gateway/src/config.js`: `37f01eac049c46bbf69fe4eac58f24c78a5866acf7bb396c2526a0a30a5e3ac4`
- `gateway/src/core/request_context.js`: `54cac1ede3a7d2cc9e8d5ccbf6f1ed9556262514b867db1fc79ca0e22cdcd9e8`
- `gateway/contracts/orchestrator-profile-v1.json`: `a3ed61c6b5a31f5424fd42b5cf4056e00cee2a06e3e2c77ed0cc6ab7f84be82e`
- `policies/agent-capabilities.json`: `27c30ac63fce79ea4bc34e838c75617dd8489540bb4b5da1b156348cfacc7c2d`
- `policies/profiles/kya/agent-capabilities.json`: `27c30ac63fce79ea4bc34e838c75617dd8489540bb4b5da1b156348cfacc7c2d`
- `policies/profiles/mvp2/agent-capabilities.json`: `d50ce55632c0beddaa2f6e5f8354ed4ab40c733f6090e73efc05ed364c13f382`
- `tests/gateway/mcp_bootstrap.test.js`: `85ed6120a61de9fd2fddd4600da220913dcaa7463a2e4a15f79bd5415f2e9b1d`

## Source commit and first full-gate follow-up

During integration, upstream committed the model changes as
`6720cac90b8e2550bcd10579e89c78d08e33d95a`, integrated by
`82345882ca2d65adc5761972b4ace63941916cf8`. The committed functional/model
files match the captured snapshot byte for byte. The MCP launch/context
changes remain uncommitted upstream and retain the operator's explicit import
authorization. Additional upstream review history was inspected but is not
substituted for AO's independent review or verification.

The first full gate on tree `53c0942d7ae9dde296ff2b0e5e4fc4acd6061441`
exited 1: 2,624 passed, 1 failed, 12 declared integration skips.
`agent_models_and_defaults_are_declared` still expected the old exact Claude
model/alias list. Its expectations were extended for the additive catalog
entries; public default and role assertions remain intact. The focused
registry file then passed all 7 tests. No production behavior changed in
this repair. A fresh complete gate is required for the final candidate.
