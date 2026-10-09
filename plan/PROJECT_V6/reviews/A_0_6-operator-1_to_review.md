# A/0/06 operator response — trial 1 implementation handoff

Base commit: `89225f561f074fb1a8e47145c96a65cad9ff03cb` (brief: `89225f5`).
Candidate: uncommitted working-tree changes in this isolated worktree.
Coder verification only; no independent verdict, integration, promotion or release claim.
Option 1 is authorized by `A_0_6_operator_response_decision.md`.
No sub-agents, commits, policy changes or full `scripts/ci.sh` invocation.

## Implemented behavior

The CLI uses a separate service entry point to persist the existing decision CAS,
audit and decider, then polls for at most 10 seconds. It identifies prompt approvals
with `isSessionPrompt`. Only answered/sent or explicit denial exits zero. Ordinary
approval output is preserved. Reserved deciders are rejected before state initialization.
The owning watcher observes the external grant on its tick and uses its original
binding and guarded transport. No key, prompt text or persistent scope comes from CLI flags.
Timeout changes only the exact unattempted granted payload. In-flight/consumed rows
receive no CLI write; uncertain output leaves the owner's finalization token intact.
An unattempted external timeout retires both owner maps and the responder registration,
then creates one fresh ID. Attempted or other terminal results do not rearm unchanged menus.
Default MCP schema/context and orchestrator response denial remain unchanged.

## Changed files and SHA-256

| File | SHA-256 |
|---|---|
| `gateway/src/services/approval_service.js` | `83fcfbf6a4d611c115d6deb51977f507cfe20751156dec5485ad60ef7c04b326` |
| `gateway/src/services/session_prompt_service.js` | `11f0c7cebab578e9fa195e7878f2d92e53a4f13d63a3763fdde6f83a600cd58d` |
| `gateway/scripts/approval-respond.mjs` | `c64f46f2080d5866ee8486d03fa1eb123d57b635105c1dea83b240383362da01` |
| `gateway/src/core/repositories/approval_repo.js` | `5e95dd6aef0f2ce9dcd7aaae72dc4f4bbcc2b3d0ea31a718b594434379686993` |
| `cli/src/agents_cli/main.py` | `467d88b3246c9f7a50e56e14460aa5a3b3c8d9f16b8150f0a7273a8048e15359` |
| `tests/gateway/session_prompt_external.test.js` | `ea4f9cd0644ddcae6e1f804d291a2cd361e49f8e0b4a949e473e87ab7fa61010` |
| `tests/gateway/session_prompt_external_owner.mjs` | `2d4a0ada7267574e1f3798c6df03eedf97c5dfbf9512da4c2c4400a450babdb4` |
| `tests/cli/test_approve.py` | `9585c15f5940d045aeacff9e336f70195c9fc6d566ca66c598cb49c4bfe89dc7` |
| `docs/operator-guide.md` | `a1f865f155da1b14933061bd95a3b3c005e90f71af6a5395646298dae0f06e13` |

Handoff files comprise this document and the adjacent `A_0_6-operator-1-*.txt.gz`
logs; they are excluded from the candidate file hash table.

## TDD RED on unchanged implementation

Command (repository root):
`PATH=/home/carase/git/personal/AO/.venv/bin:$PATH node tests/gateway/session_prompt_external.test.js`
Observed: 0 passed / 3 failed / 0 skipped. Raw output: `A_0_6-operator-1-red.txt.gz`.
Tests:

- `cross-process agent-run approve delivers once through the live owner and reports JSON and text`:
  actual input `[]`, expected `['\r']`.
- `dead-owner CLI grant exits nonzero and reports not_answered rather than a bare grant`:
  actual exit `0`, expected `1`.
- `reserved decider is rejected before any DB change`:
  actual exit `0`, expected `1`.

Failing-output excerpts:

```text
+ []
- [
-   '\r'
- ]
Expected values to be strictly equal:
0 !== 1
# tests 3
# pass 0
# fail 3
# skipped 0
```

## Verification and observed totals

Commands ran at repository root unless npm selects its package directory.
`PATH` prepended the existing `/home/carase/git/personal/AO/.venv/bin`;
Python tests used `PYTHONPATH=cli/src` to select this candidate.
Node subprocess execution was escalated after sandbox EPERM/lost child output;
those sandbox attempts are not credited as successful verification.

| Command | Passed | Failed | Skipped | Result/log |
|---|---:|---:|---:|---|
| `node --test tests/gateway/session_prompt_external.test.js tests/gateway/session_prompt.test.js tests/gateway/session_prompt_crash.test.js` | 50 | 0 | 0 | focused |
| `npm --prefix gateway test` (last full invocation) | 2064 | 60 | 20 | gateway; exit 1 |
| `/home/carase/git/personal/AO/.venv/bin/pytest -q tests/cli/test_approve.py` | 28 | 0 | 0 | cli |
| `node --test tests/gateway/tool_projection_contract.test.js` | 11 | 0 | 0 | doc-contract |
| `npm --prefix gateway run lint` | N/A | N/A | N/A | eslint; exit 0 |
| `ruff check cli/src/agents_cli/main.py tests/cli/test_approve.py` | N/A | N/A | N/A | ruff; exit 0 |
| `git diff --check` | N/A | N/A | N/A | diff-check; exit 0 |

The full Gateway command is **FAILED**, not GREEN. Both full invocations recorded
2064/60/20; complete raw failures and skips are preserved, without subtracting a
subsequently corrected failure. Failures include package-cwd resolution of `policies`
(`missing registry file: agent-capabilities.json` and `gateway/policies/roles.json`
ENOENT), real transport/session-port checks, and expected pinned
`tmux 3.6a-agents.3` versus observed `tmux 3.6`.
One failure was introduced by the doc wildcard `session.prompt.*`; it was corrected
at the operator's direction to the four exact action names, and the entire contract
test then passed 11/11. `contract_projection.js` was not edited. The last full run
preceded that doc correction and the two final distinguishing test fixtures;
focused and contract tests above ran after their respective final changes.
The host still owns the full gate and real-provider acceptance.

## Predicate conjunct audit

This is a coder test-coverage audit, not a reviewer verdict. Observations below are
asserted by passing fixtures; deletion effects are reasoned from those assertions,
not claimed as executed mutation-test results.

| Added predicate / CAS conjunct | Distinguishing fixture and observed values |
|---|---|
| External bypass versus default orphan behavior | Live actual CLI produced one CR and answered/sent; existing restart/orphan same-process tests retain not_answered. External mode is rejected by MCP schema and default context yields `context.capability_denied`; orchestrator deny is asserted. |
| Prompt action selection | Ordinary real CLI grant/deny tests retain ordinary output; repository non-prompt `git.push` timeout returns false with row unchanged. |
| Reserved decider selection | Both `operator-autonomous-mode` and `session-prompt-watcher` exit 1; approvals table equals its pre-call snapshot. Ordinary operator successfully grants. |
| Timeout requires valid context, no consumed and no promptAnswer | Null and malformed contexts return false; consumed-only returns uncertain with identical payload; independent in_flight and answered fixtures return false and preserve rows. Unattempted grant returns external_response_timeout without consumed. |
| SQL ID / granted status / exact payload | Identical-payload twin grants: only requested ID gets a timeout, twin row unchanged. Pending/denied and stale-status grants return false. Changed payload and owner-won in_flight CAS return false. |
| Re-read after lost CAS | Owner starts between timeout read and UPDATE: CLI returns uncertain, token is unchanged, exact owner finalization returns true. |
| Rearm status / timeout detail | Separate answered, uncertain and session_stopped lookalikes retain the original ID and exactly one row, with zero input. True external timeout creates one new pending ID and duplicate observation reuses it. |
| Rearm absence of consumed / attemptedAt / response / target | Each independent field is added to an otherwise rearmable fixture; original ID remains and row count is one, with zero input. |
| Watcher reconciles granted unchanged binding | Actual cross-process grant is picked up by timer without direct watcher.answer; one guarded CR, one answered audit, zero invalidated audits for live ID. Replay produces no second input. Changed prompt/target, stopped/restarted owner, session closure and role deny produce zero input. |
| Terminal answer exists and is not in_flight; denial is terminal | Dead owner ends not_answered/exit 1; explicit denial ends exit 0/zero input; in_flight timeout exits 1 as uncertain, preserves payload byte-for-byte, and original owner later commits answered/sent and one answered audit. |
| Python dictionary / prompt selection / answer dictionary | List/null/malformed JSON and script error fixtures exit 1 in text and JSON; missing prompt answer exits 1; ordinary approval tests retain output. |
| Python success requires zero subprocess exit, no error, answered status AND sent outcome OR denied | 16 text/JSON cases distinguish answered/refused, not_answered, uncertain, in_flight, missing answer, explicit denial, and answered/sent with nonzero subprocess exit. Observed expected exits are 0 only for sent and denial. JSON equals source data; text includes outcome/reason and no bare granted. |
| Node prompt success requires answered AND sent, or denial | Live CLI/script returns answered/sent and exit 0; actual dead-owner and in-flight subprocesses exit 1; actual denial exits 0. Python tests independently reject status-only and transport-error success claims. |

Two redundant checks were removed: the timeout's pre-read granted check duplicated
its SQL status predicate, and the tick's consumed check duplicated the existing
answer guard. The final SQL and owner authorization remain the enforcement points.

## Known limits

- Full Gateway suite failed as recorded; remaining failures were not fixed outside
  the authorized scope. No baseline comparison was run to label all remaining failures pre-existing.
- Deterministic guarded transport fixtures establish this response path, not live
  provider acceptance. No persistent allow choice is sent; fixture input is CR only.
- Same-account SQLite authority is explicitly accepted and documented; it does not
  authenticate human presence or protect against a shell-capable process on that account.
- Timeout uncertainty is an observation, not proof the command did not run.
- No independent review, host full gate, release gate or real-provider acceptance
  is claimed. The operator must perform the remaining host acceptance.
