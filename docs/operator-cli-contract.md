# Operator CLI contract

These commands are part of the stable operator contract. Their exit codes,
required flags, and machine-readable output shapes must not change without an ADR.

## `agent-run policy validate`

| Concern | Contract |
|---|---|
| Default policies dir | `<repo>/policies` or `AGENTS_POLICIES_DIR` |
| Exit 0 | All registries are valid |
| Exit 1 | At least one registry is invalid |
| Exit 2 | Environmental issue, such as missing `node` or missing validator script |
| Flags | `--policies-dir <path>`, `--json` |
| Output (human) | `OK ...` or `FAIL <code>: <msg>` |
| Output (json) | `{ "ok": bool, "code"?: str, "message"?: str, "counts"?: {...} }` |

The contract is covered by `tests/cli/test_policy_validate_contract.py`.

## Gateway `agent.*` model fields

`agent.delegate` and `agent.spawn` accept optional `model`, `reasoningEffort`,
and `serviceTier` input fields. The Gateway validates them through policy before
calling an adapter. When omitted, policy resolves the registry defaults for the
target agent. Aliases resolve to canonical model IDs before audit and adapter
execution. `reasoningEffort` and `serviceTier` are only effective for agents
that declare the corresponding allowlists in `policies/agent-capabilities.json`.

The default Codex profile resolves to `gpt-5.6-sol`, effort `max`, and service
tier `priority` (Fast). The default Claude profile resolves to
`claude-fable-5` with effort `max`; its only allowed Claude 4.x model is
`claude-opus-4-8`.
