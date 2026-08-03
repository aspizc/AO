# H/0/3 trial 1 to review

## Implemented

- Added `gateway/src/adapters/index.js`.
- Added `UnknownAgentError`.
- Added `createAdapterRegistry({ config, registries })`.
- Implemented registry methods:
  - `register`
  - `get`
  - `has`
  - `list`
- Preserved construction context via `registry.config` and `registry.registries`.
- Added `tests/gateway/adapter_registry.test.js`.
- Updated `CHANGELOG.md`.

## Why

Services should depend on a generic adapter registry instead of branching on concrete agent IDs. This keeps later agent service work decoupled from Gemini, Claude, or Codex adapter implementations.

## Decisions

- The registry is intentionally in-memory and injection-friendly. Real adapters can be registered by composition in later stages, while tests can register mocks directly.
- Duplicate registration fails immediately to avoid silently replacing live adapters.
- `list()` returns insertion order from the underlying `Map`, which is deterministic for registration order and sufficient for this registry contract.

## Verification

- Red: `node --test tests/gateway/adapter_registry.test.js` failed before `gateway/src/adapters/index.js` existed.
- Green: `node --test tests/gateway/adapter_registry.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `f0bd7f2 feat(adapters): add adapter registry (H/0/3)`
