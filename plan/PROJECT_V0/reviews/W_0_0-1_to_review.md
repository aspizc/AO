# Review Submission - Task W/0/0 (Trial 1)

## What was done
- Implemented real `CodexAdapter.delegate` headless execution via `codex exec`.
- Added `AGENTS_CODEX_BIN` and `AGENTS_CODEX_SANDBOX` config fields with defaults.
- Passed policy-resolved `model` and `reasoningEffort` into Codex CLI flags.
- Kept Codex disabled by default through the registry gate.
- Preserved policy preflight, cwd allowlist, timeout, and session lifecycle audit.
- Added fake-binary tests for real delegate argv and guards that deny before process execution.
- Updated Codex adapter docs, README runtime env docs, and CHANGELOG.

## Why
- MVP2.0 needs Codex as the real coder path with `gpt-5`, `medium`, and `workspace-write`.
- Stage V already resolves model selection; W/0/0 makes Codex headless honor that resolved selection.

## Decisions Taken
- The adapter uses policy decision fields as the effective model/effort and does not hardcode defaults.
- `codex exec` receives `-m`, `-c model_reasoning_effort="..."`, `-s`, and `-C` only after policy and cwd validation.
- CI uses a fake binary; real Codex CLI execution remains operator validation.

## Verification
- `node --test tests/gateway/codex_adapter.test.js` - passed.
- `node --test tests/gateway/codex_adapter.test.js tests/gateway/config_paths.test.js tests/gateway/tool_agent_model.test.js` - passed.
- `npm --prefix gateway test` - passed.
- `.venv/bin/pytest tests/structure/test_claude_adapter_docs.py tests/structure/test_mvp_docs.py tests/structure/test_operator_guide.py tests/structure/test_repo_metadata.py` - passed.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed.

## Commit
- `2295d54` - `feat(codex): implement headless delegate execution (W/0/0)`
