# Configurable project examples

These runnable sample projects exercise different commands and plan layouts.
Each profile supplies the repository registration, project path relative to
its profile, verification argv, plan layout and review location. Resolve `.`
to an absolute checkout path before filling the generic prompts. Registrations
go in the operator's additive overlay; configure AGENTS_REPO_ROOTS with the
parent directory containing the named checkouts. No sample registers itself.

| Project | Epic → story → tasks | Dependencies and shared files | Waves |
|---|---|---|---|
| service | E1 reliable service → S1 visible readiness → T1 health contract, T2 endpoint, T3 operator docs | T2 depends on T1; T2 owns health.mjs, T3 owns docs/readiness.md | W1 T1; W2 T2 and T3 in isolated worktrees, concurrency 2 |
| cli-library | E1 friendly CLI → S1 consistent greetings → T1 library, T2 CLI, T3 error handling | T2 and T3 depend on T1 and both write greeting.py | W1 T1; W2 T2; W3 T3, serialize the shared-file conflict |

Each task links its story and epic, and each parent lists its children. Each
wave links its admitted tasks and required prior verdicts. The sample's tiny
health/greeting implementations provide verification witnesses; the roadmap
is illustrative and does not claim those tasks were reviewed or integrated.
Use profile verificationCommands in the project directory. From AO:

```bash
node --test examples/generic-workflows/service/health.test.mjs
(cd examples/generic-workflows/cli-library && python3 -m unittest discover -s tests -v)
python3 -m pytest tests/structure/test_generic_workflow_examples.py
```

BUILT: additive registration, Gateway policy/task assignment, persistent
supervised agent sessions, independent handoffs and manual serial integration.
PLANNED: automated wave scheduling, retained wave Gateway connections and
owned-resource cleanup (PROJECT_V7). Keep a persistent operator-managed MCP
host for manual execution; never infer task authority from shared process
lifetime. See [generic workflow guide](../../docs/generic-project-workflows.md).
