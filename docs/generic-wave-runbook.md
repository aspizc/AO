# Generic project setup and read-only preflight

V7 A/0/00 validates explicit local project inputs. Wave dispatch and recovery
belong to later sheets. Readiness does not certify execution, Doctor isolation,
process containment, independent review, integration or release.

Use `examples/projects/javascript-service` (Node checks, `plan/stories`) or
`examples/projects/python-cli` (Python checks, `docs/work-items`). Copy the
chosen example into an existing operator-authorized workspace. Set its
`projectRoot` placeholder to the canonical absolute directory. Set
`repositoryId` to an existing registry ID and configure an allowed root using
the Gateway's existing registration rules (a matching repository directory,
or its parent container). Preflight reports unsupported topology; it never
enrolls a repository or expands operator roots. The supplied sample registry
ID is illustrative and grants no authority.

Both profiles link epic, story, two tasks and two waves. The usage task depends
on the earlier greeting task. Both declare a shared file conflict. Their checks
are runnable separately from the selected project root:

```bash
node --test test/service.test.cjs
python3 -m unittest discover -s tests
```

Supply each canonical absolute binding explicitly; no environment or personal
checkout defaults supply missing project configuration. The runtime directory
must already exist on a supported local filesystem, outside all task write
paths. Declared memory is a conservative peak request against A01's shared
budget, not measured memory or a configurable host ceiling.

```bash
agent-run project validate --profile /operator/profile.json --gateway-root /operator/AO/gateway --policies-dir /operator/registries --allowed-root /operator/projects --runtime-root /operator/runtime --json
agent-run project preflight --profile /operator/profile.json --gateway-root /operator/AO/gateway --policies-dir /operator/registries --allowed-root /operator/projects --runtime-root /operator/runtime --json
```

CLI registration is reconciled by root at integration. The new group is
`agents_cli.project_command.project_app`; Doctor remains unchanged. Existing
Python/client/MCP SDK and Gateway Node SDK installs are prerequisites; missing
runtime is reported without installing dependencies. Preflight only checks
provider executable presence; it never invokes a provider (including version
or login commands), Gateway or project check. It runs one bounded read-only
Node helper with argv execution and no shell. Linux mount-type discovery and
POSIX directory locking establish supported local-filesystem configuration;
unidentifiable or remote filesystems fail unsupported. No OS sandbox is implied.

Both commands emit `project-preflight/v1` with a normalized profile digest,
stable checks and safe selections. Exit 0 is ready, 2 is invalid/denied, and
3 is unavailable/unsupported. Errors contain code and schema field only.
Normalized Python DTOs retain each project's argv and layout and emit reverse
epic/story/task links; neither command prints prompt contents or rejected values.

For later selected-wave dispatch, `validate_prior_wave_facts(profile, wave_id,
input)` accepts only the exact direct earlier dependencies. The separate
`wave-prior-facts/v1` input is bounded to 256 KiB and 256 facts. File inputs
are canonical regular files under an operator root without symlink spelling.
Missing history returns `WAVE_PRIOR_FACTS_MISSING` (5); malformed history is
`WAVE_INPUT_INVALID` (2), and contradictory identities/membership/success
references are `WAVE_PRIOR_FACTS_CONFLICT` (2). Valid negative history exposes
blocked dependencies. History never verifies its source, authenticates review,
proves freshness, confers authority, triggers lookup or replays prior tasks.
