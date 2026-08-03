# Policy examples

These examples are wired in `tests/gateway/policy_table.test.js`. If the registries change,
update this table and the test together.

| Case | Caller | Role | Repo | Action | Extra | Decision |
|---|---|---|---|---|---|---|
| claude code on cvision | claude-code | coder | cvision | code.read | - | deny |
| codex code on cvlib | codex | coder | cvlib | code.read | - | deny |
| gemini restricted-coder on cvision | gemini-cli | restricted-coder | cvision | code.write | - | allow |
| orchestrator code.write | claude-code | orchestrator | sample-apps | code.write | - | deny |
| orchestrator artifact.get raw restricted | claude-code | orchestrator | - | artifact.get | kind=raw_diff, classification=restricted | deny |
| orchestrator delegates to gemini restricted-coder | claude-code | orchestrator | - | task.assign | targetAgent=gemini-cli, targetRole=restricted-coder | allow |
| orchestrator delegates to claude restricted-coder | claude-code | orchestrator | - | task.assign | targetAgent=claude-code, targetRole=restricted-coder | deny |
| coder cannot task.assign | claude-code | coder | - | task.assign | targetAgent=gemini-cli, targetRole=coder | deny |
| push to main requires approval | gemini-cli | coder | cvision | git.push | targetBranch=main | require_approval |
| push to feature branch is allowed | gemini-cli | coder | cvision | git.push | targetBranch=feature/x | allow |
| dep change requires approval | claude-code | coder | sample-apps | dependency.change | - | require_approval |
| test run is allowed | claude-code | tester | sample-apps | test.run | - | allow |
| reviewer reads sanitized review_notes | claude-code | reviewer | sample-apps | artifact.get | kind=review_notes, classification=restricted | allow |
| reviewer asks raw_diff restricted | claude-code | reviewer | sample-apps | artifact.get | kind=raw_diff, classification=restricted | allow_with_sanitization |
| unknown agent denied | no-such | coder | sample-apps | code.read | - | deny |
| unknown repo denied | claude-code | coder | no-such | code.read | - | deny |
| claude internal allowed | claude-code | coder | developer-tools | code.read | - | allow |
| codex restricted denied | codex | coder | cvlib | code.read | - | deny |
| orchestrator policy.check allowed | claude-code | orchestrator | - | policy.check | - | allow |
| agent.spawn coder unrestricted allowed | claude-code | orchestrator | sample-apps | agent.spawn | targetAgent=claude-code, targetRole=coder | allow |
