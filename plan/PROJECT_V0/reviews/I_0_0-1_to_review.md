# I/0/0 trial 1 to review

## Implemented

- Added `gateway/src/adapters/gemini_adapter.js`.
- Added `GeminiAdapter extends BaseAdapter`.
- Implemented `delegate({ cwd, prompt, traceId, role })`.
- Added `assertSafeCwd` before dry-run or real execution.
- Added dry-run support from `config.dryRun === true` or `AGENTS_DRY_RUN=1`.
- Added real execution with `spawnSync(geminiBin, ["-p", "--yolo", prompt], ...)`, cwd, UTF-8 output, and timeout.
- Added `SESSION_STARTED` and `SESSION_CLOSED` audit events.
- Added `tests/gateway/gemini_delegate.test.js`.
- Updated `CHANGELOG.md`.

## Why

Stage I needs the first concrete adapter: Gemini headless delegation. Dry-run mode lets CI verify cwd validation, output shape, and audit lifecycle without requiring the Gemini CLI binary.

## Decisions

- The cwd guard runs before auditing and before dry-run handling, so invalid cwd cannot produce a fake successful session.
- Dry-run can be enabled by config or environment because the task references `AGENTS_DRY_RUN=1` while tests use explicit config for determinism.
- Real mode captures spawn errors into `stderr` and returns `exitCode: -1` when `spawnSync` has no status.
- Full policy integration is left for `I/0/2`, which is explicitly named "Policy and audit integration" in the stage plan. This task implements the audit lifecycle requested by I/0/0.

## Verification

- Red: `node --test tests/gateway/gemini_delegate.test.js` failed before `gateway/src/adapters/gemini_adapter.js` existed.
- Green: `node --test tests/gateway/gemini_delegate.test.js`
- Green: `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh`

## Commit

- `effa017 feat(adapters): add gemini headless delegate (I/0/0)`
