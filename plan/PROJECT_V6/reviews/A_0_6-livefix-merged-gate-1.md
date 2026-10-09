# A/0/06 live-fix merged gate 1: RED

Date: 2026-10-09. Orchestrator gate evidence for `release/1.1.0` at `4656d51`
(tree `7e0e528a2dbf8168e2eb8c802b2cd6c738e80c05`). That commit is the reviewed live-fix merge
`99e6a52` plus an inventory-only refresh.

The orchestrator ran `bash scripts/ci.sh` once on the clean checkout, on the host. The setup was the
same as the earlier merged gate with one change: the pinned binary is now `tmux 3.6a-agents.4`,
SHA-256 `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`, taken from the
reviewed reproducible build. The rest of the setup:

- an isolated `TMUX_TMPDIR`;
- a disposable `redis:7.2-alpine` container;
- inherited `AGENTS_*` and `TMUX*` variables removed.

**Result:** exit **1**, 3,404 passed, **3 failed**, 12 skipped, out of 3,419 tests.

| Lane | Result |
|---|---|
| `test.gateway` | 2,260 passed, 9 PostgreSQL skips |
| `test.cli` | 466/466 |
| `test.e2e` | 25/25 |
| Redis | 22/22 |
| Lint, lock, release candidate, MCP smoke, policy registry | passed |
| `public.hygiene` | **failed** |
| `test.structure` | **2 failed** (`tests/structure/test_public_hygiene.py:75,81`) |

All three failures have the same cause: four home-directory paths in public test content.

- `tests/gateway/fixtures/session_prompts/codex-0.162-wrapped-command.txt` lines 4, 16 and 20
- `tests/gateway/session_prompt.test.js:416`

Each is a sanitized `/home/tester/git/personal/AO/workspace/a06-live/run-154702/outside-marker`
path taken from the live capture. Neither independent review flagged them; the gate caught them. A
fix trial must replace these paths with a non-home path of identical length, because the wrapped
fixture depends on that length to wrap the persistent option across two rows.

The raw log is local: `workspace/tmux-pinned/gate-4656d51.log`, SHA-256
`2c60d8ad463205f7455fba368b16db97b0172396be227d9200dacdf2309308ba`.
