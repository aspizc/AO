# Tareas de implementacion V4

Backlog operativo derivado de `plan_proyecto_v4.md` y `plan_implementacion_v4_stages.md`.

Este documento transforma los stages A-V en tareas atomicas para que un agente pueda implementarlas una a una en ramas pequeñas, con tests y criterios de aceptacion claros.

## Convenciones globales

- **Formato de ID:** `<Stage>/<Stream>/<Task>`, por ejemplo `A/0/0`.
- **Rama:** `feature/<id-normalizado>-<slug>`, por ejemplo `feature/A-0-0-folder-architecture`.
- **Base branch:** `develop` si existe; si no existe, crear `develop` una vez desde `main`.
- **No push:** ninguna tarea debe hacer push remoto sin aprobacion explicita del usuario.
- **No restricted paths:** ninguna tarea debe tocar rutas fuera de este repo ni repos `restricted`.
- **No componente orchestrator:** esta prohibido crear un directorio o proceso `orchestrator/`; el orquestador es un rol LLM.
- **Tests antes de cerrar:** cada tarea debe dejar tests o checklist manual proporcional al cambio.
- **Changelog:** si existe `CHANGELOG.md`, actualizar `## Unreleased`; si no existe, crearlo en `A/0/1`.
- **Naming del MCP server:** el server MCP se identifica como `agents-gateway` en cualquier configuracion de cliente y en env vars (`AGENTS_GATEWAY_*` cuando aplique). El nombre `agents-orchestrator` se usa solo como nombre del repositorio raiz; nunca como nombre del componente que se ejecuta. Esto es coherente con la decision V4 de no construir un orquestador como componente.
- **Clientes humano-facing fuera de scope:** Cursor, Antigravity IDE y cualquier otro IDE/cliente especifico estan **fuera del alcance** del proyecto. El backlog no contiene tareas Cursor-especificas, ni configuraciones `.cursor/mcp.json` adaptadas, ni rules tipo `.mdc`. El proyecto entrega un MCP server stdio estandar y un ejemplo de configuracion **generica**; la integracion con un cliente concreto es responsabilidad del operador y vive fuera de este repo.
- **Approval async-first:** todo workflow de aprobacion expone primitivas no bloqueantes (`approval.request` retorna `pending` inmediatamente) mas un `approval.wait` explicito; nunca se bloquea una llamada MCP indefinidamente.

## Orden recomendado de implementacion

Orden priorizado para llegar al MVP con riesgo controlado:

1. **A + B + C + D + E** — foundation, registries, policy engine, audit, CLI auxiliar.
2. **G + T/0/0 + T/0/1** — Gateway MCP minimo, ejemplo generico de configuracion MCP (sin asumir IDE concreto) y system prompt del rol orchestrator. El cliente humano-facing (cualquier IDE o CLI con soporte MCP stdio) queda fuera de scope.
3. **F + J + L** — estado SQLite, orchestration/task tools, artifact store basico.
4. **M + N** — sanitizacion y visibility matrix.
5. **H + I** — adapter base + tmux + Gemini adapter.
6. **Q + R** — approvals async y session tools (incluye intervention detector).
7. **O** — Claude adapter real solo despues de tener el flujo Gemini estable.
8. **U** — E2E dry-run del flujo restricted y cierre MVP.

Tareas opcionales / fuera del MVP:

- `P/*` Codex adapter — diferido hasta que el flujo Gemini + Claude sea solido.
- `S/*` Message store MVP — solo si entra un consumidor real; en otro caso, mantener artifact-mediated.
- `V/*` Post-MVP (Postgres, Redis Streams, LangGraph client, MCP servers internos).

Correccion de usabilidad operacional detectada despues del cierre dry-run:

- `K/0/3` — wirear realmente `agent.delegate/spawn/ask/view/kill` en el Gateway MCP, registrar adapters y cerrar sesiones huerfanas sin `taskId`.
- `K/0/4` — probar por MCP stdio real el flujo `orchestrator -> coder -> reviewer`, sin llamar services internos.
- `U/0/5` — convertir ese flujo MCP real en gate de usabilidad operacional y actualizar checklist/docs/CI.
- `P/0/1-P/0/3` — opcional si se quiere usar Codex como `coder` real: delegate headless, supervised tmux y E2E MCP de activacion. Codex sigue fuera de `restricted` y disabled por defecto.

Extension solicitada para sesiones sin task:

- `W/0/0` — migracion para permitir `sessions.task_id = NULL` conservando FK cuando haya task.
- `W/0/1` — relajar `agent.delegate/spawn` para aceptar ausencia de `taskId`, persistir la sesion y devolver `taskLinked`.
- `W/0/2` — E2E MCP y documentacion del modo task-less vs task-linked.

Diagrama lineal sin priorizacion (utilizable como referencia de dependencias):

```text
A → B → C → D → E → F → G → H → I → J → K → L → M → N → O → Q → R → T → U
```

---

# Stage A — Foundation & Safety

## A/0/0 — Project directory architecture

**Stage:** A — Foundation & Safety  
**Task:** 0 — Project scaffold  
**Depends on:** none  
**Branch:** `feature/A-0-0-folder-architecture`

## Objectives

Create the complete top-level directory layout for the project so every later task has a known home. No production code is written in this task. Only directories and placeholder `.keep` files are added.

The layout is the contract for all later tasks. Do not deviate from it unless `plan_implementacion_v4_stages.md` is updated first.

## Tests

- File: `tests/structure/test_project_layout.py`
- Cases:
  - `test_required_top_level_dirs_exist`
  - `test_required_gateway_dirs_exist`
  - `test_required_dirs_are_not_empty`

## Detailed steps

1. Create the feature branch:

   ```bash
   git checkout develop || git checkout -b develop main
   git pull --ff-only || true
   git checkout -b feature/A-0-0-folder-architecture
   ```

2. Create the directory layout from repo root:

   ```text
   docs/
   docs/adr/
   policies/
   schemas/
   gateway/
   gateway/src/
   gateway/src/tools/
   gateway/src/services/
   gateway/src/core/
   gateway/src/adapters/
   gateway/src/infra/
   gateway/migrations/
   prompts/
   client-config/
   cli/
   cli/src/
   cli/src/agents_cli/
   workspace/
   workspace/artifacts/
   workspace/audit/
   workspace/state/
   tests/
   tests/structure/
   tests/gateway/
   tests/cli/
   tests/fixtures/
   tests/e2e/
   docker/
   scripts/
   ```

3. Add `.keep` in every empty directory.

4. Create `cli/src/agents_cli/__init__.py` as an empty package marker.

5. Write `tests/structure/test_project_layout.py` using `pathlib.Path`, without absolute paths.

6. Do not implement Node or Python tooling yet; that happens in later tasks.

7. Update `CHANGELOG.md` under `## Unreleased`:

   ```markdown
   - Added repository directory architecture and structural layout tests. Closes A/0/0.
   ```

## Acceptance criteria

- [ ] All directories listed above exist.
- [ ] Every listed directory contains `.keep` or a real tracked file.
- [ ] `cli/src/agents_cli/__init__.py` exists.
- [ ] `tests/structure/test_project_layout.py` exists.
- [ ] No production code exists yet.
- [ ] No path outside `/home/carase/git/personal/agents-orchestrator` is touched.

---

## A/0/1 — Repository metadata, gitignore and changelog

**Stage:** A — Foundation & Safety  
**Task:** 1 — Repo metadata  
**Depends on:** `A/0/0`  
**Branch:** `feature/A-0-1-repo-metadata`

## Objectives

Create the repository metadata that makes later implementation predictable: `README.md`, `.gitignore`, `CHANGELOG.md`, and optional license placeholder.

## Tests

- File: `tests/structure/test_repo_metadata.py`
- Cases:
  - `test_readme_exists`
  - `test_gitignore_ignores_runtime_artifacts`
  - `test_changelog_has_unreleased_section`

## Detailed steps

1. Create or update `README.md` with:
   - Purpose of the project.
   - Local requirements: Node >= 20, Python >= 3.11, tmux.
   - Link to `plan_proyecto_v4.md` and `plan_implementacion_v4_stages.md`.
   - Explicit note: no standalone orchestrator component.

2. Create `.gitignore`:

   ```text
   node_modules/
   .venv/
   __pycache__/
   .pytest_cache/
   *.db
   *.sqlite
   .env
   workspace/artifacts/*
   workspace/audit/*
   workspace/state/*
   !workspace/artifacts/.keep
   !workspace/audit/.keep
   !workspace/state/.keep
   ```

3. Create `CHANGELOG.md` with `## Unreleased`.

4. Add `LICENSE` only if the project owner confirms the license. If no decision exists, add `docs/license-decision-needed.md` instead of guessing.

## Acceptance criteria

- [ ] README explains the V4 architecture in one page.
- [ ] Runtime artifacts are ignored while `.keep` files remain trackable.
- [ ] `CHANGELOG.md` contains `## Unreleased`.
- [ ] No license is invented without owner decision.

---

## A/0/2 — Gateway Node scaffold

**Stage:** A — Foundation & Safety  
**Task:** 2 — Gateway package scaffold  
**Depends on:** `A/0/0`, `A/0/1`  
**Branch:** `feature/A-0-2-gateway-node-scaffold`

## Objectives

Create a minimal Node package for the Gateway MCP server. It should start, load config, and exit cleanly, but expose no business tools yet.

## Tests

- File: `tests/gateway/gateway_scaffold.test.js`
- Cases:
  - `starts_without_throwing`
  - `loads_default_config`
  - `does_not_write_logs_to_stdout`

## Detailed steps

1. Create `gateway/package.json`:
   - `"type": "module"`
   - scripts: `start`, `test`
   - dependencies: `@modelcontextprotocol/sdk`, `zod`, `better-sqlite3`
   - dev dependencies as needed for `node --test`.

2. Create `gateway/src/config.js`:
   - Read `AGENTS_WORKSPACE`.
   - Read `AGENTS_POLICIES_DIR`.
   - Read `AGENTS_STATE_DB`.
   - Read `AGENTS_AUDIT_LOG`.
   - Read `AGENTS_TMUX_PREFIX`.
   - Provide safe local defaults under `workspace/`.

3. Create `gateway/src/mcp_server.js` as a minimal MCP stdio server stub.

4. Ensure all logs go to stderr, not stdout.

5. Add `gateway/src/tools/index.js` exporting an empty tool registry.

## Acceptance criteria

- [ ] `npm --prefix gateway test` passes.
- [ ] `node gateway/src/mcp_server.js` starts without syntax errors.
- [ ] No policy, state or adapter logic is implemented yet.

---

## A/0/3 — Python CLI scaffold

**Stage:** A — Foundation & Safety  
**Task:** 3 — CLI package scaffold  
**Depends on:** `A/0/0`, `A/0/1`  
**Branch:** `feature/A-0-3-python-cli-scaffold`

## Objectives

Create the `agent-run` CLI package skeleton used later for policy checks, audit queries and approvals.

## Tests

- File: `tests/cli/test_cli_scaffold.py`
- Cases:
  - `test_agent_run_help`
  - `test_agent_run_version`

## Detailed steps

1. Create `cli/pyproject.toml` with:
   - package name `agents-cli`
   - Python >= 3.11
   - dependencies `typer`, `rich`, `jsonschema`
   - dev dependency `pytest`
   - console script `agent-run = agents_cli.main:app`

2. Create `cli/src/agents_cli/main.py`:
   - Typer app.
   - `--version`.
   - Stub command groups: `policy`, `audit`, `approve`.

3. Add tests using Typer `CliRunner`.

## Acceptance criteria

- [ ] `agent-run --help` works in an editable install.
- [ ] `pytest tests/cli` passes.
- [ ] Commands are stubs only; no business behavior yet.

---

## A/0/4 — Architecture documentation and ADRs

**Stage:** A — Foundation & Safety  
**Task:** 4 — Architecture docs  
**Depends on:** `A/0/0`  
**Branch:** `feature/A-0-4-architecture-docs`

## Objectives

Document the implementable architecture so later agents do not reinterpret V4 incorrectly.

## Tests

- File: `tests/structure/test_architecture_docs.py`
- Cases:
  - `test_architecture_doc_mentions_gateway_only`
  - `test_architecture_doc_rejects_orchestrator_component`
  - `test_required_adrs_exist`

## Detailed steps

1. Create `docs/architecture.md` with:
   - Component diagram or text diagram.
   - Layer rules: `tools → services → core/adapters/infra`.
   - Policy-before-spawn rule.
   - Artifact/sanitization flow.
   - Explicit statement: there is no `orchestrator/` process.

2. Create ADRs:
   - `docs/adr/ADR-001-gateway-only.md`
   - `docs/adr/ADR-002-no-orchestrator-component.md`
   - `docs/adr/ADR-003-policy-before-spawn.md`

3. Add mapping from `/home/carase/git/personal/gemini-orchestrator`:
   - `src/tmux-client.js` -> `gateway/src/adapters/tmux_client.js`
   - `src/tools/delegate.js` -> `gateway/src/adapters/gemini_adapter.js`
   - `src/tools/tmux.js` -> adapter supervised session helpers

## Acceptance criteria

- [ ] Architecture doc is enough to continue without re-reading all V4.
- [ ] ADR-002 explicitly forbids a standalone orchestrator component.
- [ ] ADR-003 states all spawn/delegate paths must pass policy first.

---

## A/0/5 — Local CI and first green scaffold

**Stage:** A — Foundation & Safety  
**Task:** 5 — First green checks  
**Depends on:** `A/0/2`, `A/0/3`, `A/0/4`  
**Branch:** `feature/A-0-5-first-green-ci`

## Objectives

Add a repeatable local CI command that runs structure, Gateway and CLI tests.

## Tests

- File: `tests/structure/test_ci_script.py`
- Cases:
  - `test_ci_script_exists`
  - `test_ci_script_mentions_gateway_and_cli_tests`

## Detailed steps

1. Create `scripts/ci.sh`:
   - `set -euo pipefail`
   - run Node tests under `gateway`
   - run Python tests under repo root or `cli`

2. Make it executable.

3. Optionally create `.github/workflows/ci.yml` mirroring local CI.

4. Update README quickstart with `./scripts/ci.sh`.

## Acceptance criteria

- [ ] `./scripts/ci.sh` passes locally.
- [ ] CI does not require real Gemini/Claude/Codex CLIs.
- [ ] CI does not require network access after dependencies are installed.

---

## A/0/6 — Threat model and abuse cases

**Stage:** A — Foundation & Safety  
**Task:** 6 — Threat model  
**Depends on:** `A/0/5`  
**Branch:** `feature/A-0-6-threat-model`

## Objectives

Convertir los riesgos del plan V4 en un threat model implementable que alimente decisiones de policy, tests de regresion y el e2e bypass suite (U/0/4). Bloquea el inicio de Stage B porque define que casos abusivos deben cubrir registries, policy engine, sanitizer y adapters.

El documento debe enumerar ataques concretos, controles primarios, controles defensivos en profundidad, y pruebas que demuestren que el control funciona. No es un documento abstracto: cada amenaza debe terminar con `Tested by:` apuntando a un test concreto del backlog (existente o por crear).

## Tests

- File: `tests/structure/test_threat_model.py`
- Cases:
  - `test_threat_model_doc_exists`
  - `test_each_abuse_case_has_test_reference`
  - `test_required_categories_are_covered`

## Detailed steps

1. Create `docs/threat-model.md`. The doc must include the categories listed below.

2. For each category, write at least:
   - `Description`
   - `Attacker capability`
   - `Primary control`
   - `Defense in depth`
   - `Tested by` (test ID or planned task ID such as `C/0/2`, `M/0/3`, `U/0/4`)

3. Required categories:
   - **Prompt injection contra el orquestador-LLM** — system prompt del orquestador no es barrera de seguridad; control real es policy engine.
   - **Hijo intentando filtrar raw restricted en summaries** — output del hijo se trata como artifact restricted hasta sanitization.
   - **Bypass por filesystem compartido** — adapters confinan `cwd`; artifact store es la unica via permitida para flujos cross-role.
   - **Bypass por `cwd` directo** — `assertSafeCwd` con `realpath` y allowlist.
   - **Intervencion tmux no auditada** — detector best-effort + `session.intervention_note`.
   - **Sanitizer failure / partial redaction** — fail-closed; nunca devolver raw cuando sanitize falla.
   - **Approval spoofing / replay** — approvals firmados por `approvalId` unico; no hay aprobacion implicita.
   - **Artifact poisoning** — un hijo publica artefactos disenados para confundir al orquestador-LLM; mitigado por policy + sanitizer + visibility matrix.
   - **Trace ID guessing / cross-trace leakage** — IDs UUID v4; queries por trace exigen trace-id explicito.
   - **MCP stdout corruption** — gateway nunca escribe logs a stdout (validado en `tests/gateway/mcp_bootstrap.test.js`).

4. Cross-reference the doc from `docs/architecture.md` and `README.md`.

5. Add a `## Living document` section explicitando que la lista crece con cada incidente o nuevo adapter.

## Acceptance criteria

- [ ] `docs/threat-model.md` existe y cubre las 10 categorias listadas.
- [ ] Cada categoria tiene un campo `Tested by` con un test o tarea concreta.
- [ ] El test `test_threat_model.py` pasa.
- [ ] El threat model esta enlazado desde `docs/architecture.md` y `README.md`.
- [ ] Ninguna categoria queda sin control primario.

---

# Stage B — Registries and Schemas

## B/0/0 — Agent capabilities registry

**Stage:** B — Registries and Schemas  
**Task:** 0 — Agent capabilities registry  
**Depends on:** `A/0/6`  
**Branch:** `feature/B-0-0-agent-capabilities-registry`

## Objectives

Create `policies/agent-capabilities.json`, defining which agents exist, which classifications they can access, which roles they can assume and which actions require approval.

## Tests

- File: `tests/gateway/registry_agent_capabilities.test.js`
- Cases:
  - `loads_agent_capabilities_registry`
  - `gemini_has_restricted_classification`
  - `claude_and_codex_do_not_have_restricted_classification`
  - `orchestrator_role_is_allowed_for_gemini_and_claude`

## Detailed steps

1. Create `policies/agent-capabilities.json` using Anexo A from `plan_proyecto_v4.md`.
2. Include agents:
   - `gemini-cli`
   - `claude-code`
   - `codex`
3. Add `allowedRoles`.
4. Add `requiresApprovalFor`.
5. Add `protectedBranches`.
6. Do not include host-specific absolute paths.

## Acceptance criteria

- [ ] Registry is valid JSON.
- [ ] Gemini is the only agent with `restricted`.
- [ ] `orchestrator` role is allowed where V4 expects it.
- [ ] No secrets or local credentials are present.

---

## B/0/1 — Repository classification registry

**Stage:** B — Registries and Schemas  
**Task:** 1 — Repository registry  
**Depends on:** `B/0/0`  
**Branch:** `feature/B-0-1-repository-registry`

## Objectives

Create `policies/repositories.json`, mapping repositories to classifications and allowed agents.

## Tests

- File: `tests/gateway/registry_repositories.test.js`
- Cases:
  - `cvision_is_restricted`
  - `cvlib_is_restricted`
  - `sample_apps_is_unrestricted`
  - `restricted_repos_allow_only_gemini`

## Detailed steps

1. Create `policies/repositories.json`.
2. Add:
   - `cvision`: `restricted`
   - `cvlib`: `restricted`
   - `developer-tools`: `internal`
   - `sample-apps`: `unrestricted`
3. Set `allowedAgents` according to V4.
4. Add optional `tags` only; no absolute paths yet.

## Acceptance criteria

- [ ] Every repo has exactly one classification.
- [ ] Restricted repos allow only `gemini-cli`.
- [ ] Registry is independent of one machine path.

---

## B/0/2 — Roles registry

**Stage:** B — Registries and Schemas  
**Task:** 2 — Roles registry  
**Depends on:** `B/0/0`  
**Branch:** `feature/B-0-2-roles-registry`

## Objectives

Create `policies/roles.json`, defining functional roles independently from technical agents.

## Tests

- File: `tests/gateway/registry_roles.test.js`
- Cases:
  - `all_v4_roles_exist`
  - `orchestrator_denies_code_write`
  - `orchestrator_denies_raw_restricted_artifacts`
  - `reviewer_denies_raw_artifact_kinds`

## Detailed steps

1. Create roles:
   - `orchestrator`
   - `planner`
   - `coder`
   - `restricted-coder`
   - `reviewer`
   - `tester`
   - `documenter`
   - `security_reviewer`
2. For `orchestrator`, include:
   - `task.assign`
   - `agent.delegate`
   - `agent.spawn`
   - `agent.ask`
   - `agent.view`
   - `artifact.get.sanitized`
   - `approval.request`
   - `policy.check`
3. For `orchestrator`, deny:
   - `code.write`
   - `code.read.raw_restricted`
   - `artifact.get.raw_restricted`

## Acceptance criteria

- [ ] Every V4 role exists.
- [ ] Role definitions encode the LLM-as-orchestrator boundary.
- [ ] `restricted-coder` is a role, not a separate agent.

---

## B/0/3 — Core JSON schemas

**Stage:** B — Registries and Schemas  
**Task:** 3 — JSON schemas  
**Depends on:** `A/0/5`  
**Branch:** `feature/B-0-3-json-schemas`

## Objectives

Add JSON schemas for persisted and exchanged domain objects.

## Tests

- File: `tests/gateway/schemas.test.js`
- Cases:
  - `valid_orchestration_session_passes`
  - `valid_task_passes`
  - `valid_artifact_passes`
  - `invalid_missing_required_field_fails`

## Detailed steps

1. Create:
   - `schemas/orchestration-session.schema.json`
   - `schemas/task.schema.json`
   - `schemas/artifact.schema.json`
   - `schemas/message.schema.json`
   - `schemas/policy-decision.schema.json`
   - `schemas/approval.schema.json`
   - `schemas/registry-meta.schema.json`
2. Add golden fixtures under `tests/fixtures/schemas/`.
3. Validate schemas using a Node JSON schema validator or a minimal test helper.

## Acceptance criteria

- [ ] Schemas include `$id` and `version`.
- [ ] Golden fixtures validate.
- [ ] Invalid fixtures fail.

---

## B/0/4 — Registry loader

**Stage:** B — Registries and Schemas  
**Task:** 4 — Registry loader  
**Depends on:** `B/0/0`, `B/0/1`, `B/0/2`, `B/0/3`  
**Branch:** `feature/B-0-4-registry-loader`

## Objectives

Implement `gateway/src/core/registry.js` to load, validate and expose registry data to later components.

## Tests

- File: `tests/gateway/registry_loader.test.js`
- Cases:
  - `loads_all_registries`
  - `get_agent_returns_agent_config`
  - `get_repo_returns_repo_config`
  - `get_role_returns_role_config`
  - `invalid_registry_fails_fast`

## Detailed steps

1. Implement `loadRegistries({ policiesDir })`.
2. Validate required top-level fields.
3. Export getters:
   - `getAgent(agentId)`
   - `getRepo(repoId)`
   - `getRole(roleId)`
   - `getProtectedBranches()`
4. Throw typed errors for invalid/missing entries.

## Acceptance criteria

- [ ] Gateway can load registries from `AGENTS_POLICIES_DIR`.
- [ ] Missing registry files fail fast.
- [ ] Invalid registry shape fails fast.

---

## B/0/5 — Registry validation command

**Stage:** B — Registries and Schemas  
**Task:** 5 — Validate command  
**Depends on:** `B/0/4`, `A/0/3`  
**Branch:** `feature/B-0-5-policy-validate-command`

## Objectives

Expose registry validation through `agent-run policy validate`.

## Tests

- File: `tests/cli/test_policy_validate.py`
- Cases:
  - `test_policy_validate_success`
  - `test_policy_validate_failure_for_missing_registry`

## Detailed steps

1. Add `policy validate` subcommand to CLI.
2. Invoke the Node registry validator via subprocess or a dedicated script.
3. Print clear human-readable output.
4. Exit `0` on success and non-zero on failure.

## Acceptance criteria

- [ ] `agent-run policy validate` passes with current registries.
- [ ] Broken fixture fails with non-zero exit.
- [ ] README documents the command.

---

# Stage C — Policy Engine

## C/0/0 — Policy types, actions and decision model

**Stage:** C — Policy Engine  
**Task:** 0 — Policy model  
**Depends on:** `B/0/4`  
**Branch:** `feature/C-0-0-policy-model`

## Objectives

Define the policy context, decision enum and action/capability mapping used by the deterministic policy engine.

## Tests

- File: `tests/gateway/policy_model.test.js`
- Cases:
  - `decision_values_are_stable`
  - `routine_actions_are_mapped`
  - `approval_actions_are_mapped`

## Detailed steps

1. Create `gateway/src/core/policy_types.js`.
2. Define decisions:
   - `allow`
   - `deny`
   - `require_approval`
   - `allow_with_sanitization`
3. Define context fields:
   - `agent`, `role`, `repo`, `action`
   - optional `path`, `artifactKind`, `artifactClassification`
   - optional `targetAgent`, `targetRole`, `targetBranch`
4. Define helper `normalizePolicyContext`.

## Acceptance criteria

- [ ] Stable decision constants exist.
- [ ] No policy I/O is implemented here.
- [ ] Later policy tests can import the types.

---

## C/0/1 — Classification boundary rules

**Stage:** C — Policy Engine  
**Task:** 1 — Classification rules  
**Depends on:** `C/0/0`  
**Branch:** `feature/C-0-1-classification-policy`

## Objectives

Implement default-deny at classification boundaries.

## Tests

- File: `tests/gateway/policy_classification.test.js`
- Cases:
  - `claude_denied_on_restricted_repo`
  - `codex_denied_on_restricted_repo`
  - `gemini_allowed_on_restricted_as_restricted_coder`
  - `excluded_path_is_denied`

## Detailed steps

1. Create `gateway/src/core/policy_engine.js`.
2. Implement `evaluate(context, registries)`.
3. Resolve repo classification.
4. Check `agent.allowedClassifications`.
5. Check `repo.allowedAgents`.
6. Check `excludedPaths`.
7. Return `{ decision, reason, ruleId }`.

## Acceptance criteria

- [ ] Claude/Codex cannot operate on `restricted`.
- [ ] Gemini can operate on `restricted` only where role rules allow it.
- [ ] Denies include a useful reason.

---

## C/0/2 — Role and orchestrator rules

**Stage:** C — Policy Engine  
**Task:** 2 — Role rules  
**Depends on:** `C/0/1`, `B/0/2`  
**Branch:** `feature/C-0-2-role-policy`

## Objectives

Apply role-specific capabilities and especially the `orchestrator` restrictions.

## Tests

- File: `tests/gateway/policy_roles.test.js`
- Cases:
  - `orchestrator_cannot_code_write`
  - `orchestrator_cannot_read_raw_restricted_artifact`
  - `orchestrator_can_task_assign_to_gemini_restricted_coder`
  - `reviewer_cannot_read_raw_diff`

## Detailed steps

1. Verify `role ∈ agent.allowedRoles`.
2. Apply `role.deniedCapabilities`.
3. Apply `role.deniedArtifactKinds`.
4. Add special orchestrator cases:
   - deny `code.write`
   - deny `artifact.get` for raw restricted artifacts
   - allow `task.assign` to valid target agent/role if target policy permits it.

## Acceptance criteria

- [ ] `orchestrator` is not privileged.
- [ ] `orchestrator` can delegate to valid children.
- [ ] `orchestrator` cannot act as coder in the same call.

---

## C/0/3 — Approval policy rules

**Stage:** C — Policy Engine  
**Task:** 3 — Approval rules  
**Depends on:** `C/0/2`  
**Branch:** `feature/C-0-3-approval-policy`

## Objectives

Return `require_approval` for irreversible external actions.

## Tests

- File: `tests/gateway/policy_approval.test.js`
- Cases:
  - `protected_branch_push_requires_approval`
  - `deploy_requires_approval`
  - `local_commit_is_allowed`
  - `format_run_is_allowed`

## Detailed steps

1. Read `requiresApprovalFor` from agent capabilities.
2. Read protected branch patterns.
3. Match `git.push.protected` when `targetBranch` is protected.
4. Return `require_approval` with reason.
5. Keep routine actions default-allow inside allowed scope.

## Acceptance criteria

- [ ] Push to `main`, `master`, `develop`, `release/*` requires approval.
- [ ] Routine local actions do not ask the user.
- [ ] The rule avoids approval fatigue.

---

## C/0/4 — Sanitization policy rules

**Stage:** C — Policy Engine  
**Task:** 4 — Sanitization decision  
**Depends on:** `C/0/2`  
**Branch:** `feature/C-0-4-sanitization-policy`

## Objectives

Return `allow_with_sanitization` when a raw artifact can be shared only after sanitization.

## Tests

- File: `tests/gateway/policy_sanitization.test.js`
- Cases:
  - `restricted_raw_diff_to_reviewer_requires_sanitization`
  - `sanitized_diff_to_reviewer_allowed`
  - `raw_restricted_to_orchestrator_denied`

## Detailed steps

1. Detect raw artifact kinds: `raw_diff`, `raw_code`, `raw_stacktrace`.
2. If artifact classification is `restricted` and requester lacks raw access, return `allow_with_sanitization` where V4 permits sanitized sharing.
3. Return deny when role explicitly forbids even sanitized consumption.

## Acceptance criteria

- [ ] Raw restricted never leaks across roles.
- [ ] Sanitized sharing is expressible as a policy decision.

---

## C/0/5 — Policy explain API and table tests

**Stage:** C — Policy Engine  
**Task:** 5 — Explain and coverage  
**Depends on:** `C/0/0`, `C/0/1`, `C/0/2`, `C/0/3`, `C/0/4`  
**Branch:** `feature/C-0-5-policy-explain-tests`

## Objectives

Add `explain(context)` and a table-driven test suite covering all canonical V4 examples.

## Tests

- File: `tests/gateway/policy_table.test.js`
- Cases:
  - At least 20 rows covering §13.3 of `plan_proyecto_v4.md`.

## Detailed steps

1. Implement `explain(context, registries)`.
2. Add table fixtures for allow, deny, require_approval and allow_with_sanitization.
3. Ensure each decision includes `ruleId` and `reason`.
4. Update README with policy examples.

## Acceptance criteria

- [ ] >= 20 policy unit tests pass.
- [ ] §13.3 examples are covered.
- [ ] `evaluate()` remains pure and deterministic.

---

# Stage D — Audit Log and Runtime Config

## D/0/0 — Audit JSONL writer

**Stage:** D — Audit Log and Runtime Config  
**Task:** 0 — Audit writer  
**Depends on:** `A/0/2`  
**Branch:** `feature/D-0-0-audit-jsonl-writer`

## Objectives

Implement append-only audit logging to JSONL.

## Tests

- File: `tests/gateway/audit_writer.test.js`
- Cases:
  - `append_creates_file`
  - `append_writes_valid_json_line`
  - `existing_lines_are_not_mutated`

## Detailed steps

1. Create `gateway/src/core/audit.js`.
2. Implement `append(event)`.
3. Add `eventId` UUID.
4. Add ISO-8601 UTC timestamp.
5. Create parent directory if missing.
6. Never rewrite previous lines.

## Acceptance criteria

- [ ] Events are valid one-line JSON objects.
- [ ] Append-only behavior is tested.
- [ ] Default path is `workspace/audit/events.jsonl`.

---

## D/0/1 — Audit reader and filters

**Stage:** D — Audit Log and Runtime Config  
**Task:** 1 — Audit reader  
**Depends on:** `D/0/0`  
**Branch:** `feature/D-0-1-audit-reader`

## Objectives

Allow reading audit events by `traceId`, event type and limit.

## Tests

- File: `tests/gateway/audit_reader.test.js`
- Cases:
  - `query_by_trace_id`
  - `query_by_type`
  - `query_limit`

## Detailed steps

1. Add `query({ traceId, type, limit })`.
2. Ignore invalid JSON lines only if a corruption marker is returned; otherwise fail loudly.
3. Return newest last by default.

## Acceptance criteria

- [ ] Query API is usable by CLI.
- [ ] Corruption is visible, not silently hidden.

---

## D/0/2 — Runtime path configuration

**Stage:** D — Audit Log and Runtime Config  
**Task:** 2 — Runtime config paths  
**Depends on:** `A/0/2`, `D/0/0`  
**Branch:** `feature/D-0-2-runtime-path-config`

## Objectives

Normalize runtime paths from environment variables and safe defaults.

## Tests

- File: `tests/gateway/config_paths.test.js`
- Cases:
  - `relative_paths_resolve_under_workspace`
  - `absolute_paths_are_preserved`
  - `workspace_defaults_are_local`

## Detailed steps

1. Extend `gateway/src/config.js`.
2. Resolve relative paths under `AGENTS_WORKSPACE`.
3. Ensure `workspace/` defaults are used when env vars are missing.
4. Document env vars in README.

## Acceptance criteria

- [ ] Config never defaults outside the repo/workspace.
- [ ] Runtime paths are testable without user-specific paths.

---

## D/0/3 — Audit CLI command

**Stage:** D — Audit Log and Runtime Config  
**Task:** 3 — Audit CLI  
**Depends on:** `D/0/1`, `A/0/3`  
**Branch:** `feature/D-0-3-audit-cli`

## Objectives

Expose audit querying through `agent-run audit show`.

## Tests

- File: `tests/cli/test_audit_show.py`
- Cases:
  - `test_audit_show_empty`
  - `test_audit_show_trace_id`
  - `test_audit_show_type_filter`

## Detailed steps

1. Add CLI command `agent-run audit show`.
2. Flags:
   - `--trace-id`
   - `--type`
   - `--limit`
   - `--json`
3. Human output should be concise; JSON output should be machine-readable.

## Acceptance criteria

- [ ] CLI can show recent audit events.
- [ ] Empty audit log is handled gracefully.

---

# Stage E — Auxiliary CLI

## E/0/0 — `agent-run policy validate`

**Stage:** E — Auxiliary CLI  
**Task:** 0 — Policy validate command  
**Depends on:** `B/0/5`  
**Branch:** `feature/E-0-0-agent-run-policy-validate`

## Objectives

Make `agent-run policy validate` the stable operator-facing registry validation command.

## Tests

- File: `tests/cli/test_policy_validate.py`
- Cases:
  - `valid_registries_exit_zero`
  - `invalid_registries_exit_nonzero`

## Detailed steps

1. Wire the command into the Typer CLI.
2. Call the Node validator from Stage B or share validation code through a script.
3. Print each registry checked.
4. Return non-zero on any error.

## Acceptance criteria

- [ ] Command is documented.
- [ ] CI uses this command.

---

## E/0/1 — `agent-run policy check`

**Stage:** E — Auxiliary CLI  
**Task:** 1 — Policy check command  
**Depends on:** `C/0/5`, `E/0/0`  
**Branch:** `feature/E-0-1-agent-run-policy-check`

## Objectives

Expose the policy engine to the operator for manual checks.

## Tests

- File: `tests/cli/test_policy_check.py`
- Cases:
  - `canonical_raw_restricted_denied`
  - `canonical_task_assign_allowed`
  - `protected_push_requires_approval`

## Detailed steps

1. Add flags:
   - `--agent`
   - `--role`
   - `--repo`
   - `--action`
   - `--artifact-kind`
   - `--artifact-classification`
   - `--target-agent`
   - `--target-role`
   - `--target-branch`
2. Invoke policy engine.
3. Print `ALLOW`, `DENY`, `REQUIRE_APPROVAL`, or `ALLOW_WITH_SANITIZATION`.
4. Include reason.

## Acceptance criteria

- [ ] Canonical examples from V4 Anexo D work.
- [ ] Output is readable by a human and scriptable with `--json`.

---

## E/0/2 — Rich human output

**Stage:** E — Auxiliary CLI  
**Task:** 2 — CLI formatting  
**Depends on:** `E/0/1`, `D/0/3`  
**Branch:** `feature/E-0-2-cli-rich-output`

## Objectives

Standardize CLI output for policy and audit commands.

## Tests

- File: `tests/cli/test_cli_output.py`
- Cases:
  - `policy_check_table_contains_decision`
  - `json_mode_outputs_valid_json`

## Detailed steps

1. Add Rich tables for normal mode.
2. Add `--json` to policy and audit commands.
3. Ensure errors print to stderr.

## Acceptance criteria

- [ ] Human mode is readable.
- [ ] JSON mode is stable for automation.

---

# Stage F — SQLite State and Domain Models

## F/0/0 — Initial SQLite migration

**Stage:** F — SQLite State and Domain Models  
**Task:** 0 — Initial migration  
**Depends on:** `A/0/2`  
**Branch:** `feature/F-0-0-sqlite-initial-migration`

## Objectives

Create SQLite schema matching §21 of V4.

## Tests

- File: `tests/gateway/sqlite_migrations.test.js`
- Cases:
  - `migration_is_idempotent`
  - `all_domain_tables_exist`
  - `foreign_keys_are_enabled`

## Detailed steps

1. Create `gateway/migrations/001_initial.sql`.
2. Add tables:
   - `schema_migrations`
   - `orchestration_sessions`
   - `tasks`
   - `sessions`
   - `artifacts`
   - `messages`
   - `policy_decisions`
   - `approvals`
3. Add foreign keys.
4. Add indexes on `trace_id`, `session_id`, `status`.

## Acceptance criteria

- [ ] Migration can run twice safely.
- [ ] Tables match V4 data model.

---

## F/0/1 — State initialization

**Stage:** F — SQLite State and Domain Models  
**Task:** 1 — State init  
**Depends on:** `F/0/0`, `D/0/2`  
**Branch:** `feature/F-0-1-state-initialization`

## Objectives

Implement `gateway/src/core/state.js` to open and migrate SQLite on Gateway start.

## Tests

- File: `tests/gateway/state_init.test.js`
- Cases:
  - `creates_db_file`
  - `runs_migrations`
  - `enables_foreign_keys`

## Detailed steps

1. Implement `initState(config)`.
2. Create parent directory for DB.
3. Run pending migrations.
4. Export `getDb()`.

## Acceptance criteria

- [ ] Gateway can initialize local DB with defaults.
- [ ] Tests use temporary directories.

---

## F/0/2 — Domain repositories

**Stage:** F — SQLite State and Domain Models  
**Task:** 2 — Repositories  
**Depends on:** `F/0/1`  
**Branch:** `feature/F-0-2-domain-repositories`

## Objectives

Create repository modules so tools never access SQL directly.

## Tests

- File: `tests/gateway/domain_repositories.test.js`
- Cases:
  - `create_and_get_orchestration`
  - `create_task_under_trace`
  - `create_session_under_task`
  - `create_artifact_under_trace`
  - `insert_policy_decision_is_append_only`

## Detailed steps

1. Create `gateway/src/core/repositories/`.
2. Implement repositories:
   - `orchestration_repo.js`
   - `task_repo.js`
   - `session_repo.js`
   - `artifact_repo.js`
   - `policy_decision_repo.js`
   - `approval_repo.js`
   - `message_repo.js`
3. Use transactions for multi-row operations.

## Acceptance criteria

- [ ] SQL is isolated under repository modules.
- [ ] Foreign key failures are tested.

---

## F/0/3 — ID generation

**Stage:** F — SQLite State and Domain Models  
**Task:** 3 — IDs  
**Depends on:** `F/0/1`  
**Branch:** `feature/F-0-3-domain-ids`

## Objectives

Provide stable ID generation for traces and domain objects.

## Tests

- File: `tests/gateway/ids.test.js`
- Cases:
  - `uuid_ids_are_unique`
  - `trace_id_is_unique`
  - `trace_id_accepts_optional_slug_prefix`

## Detailed steps

1. Create `gateway/src/core/ids.js`.
2. Implement:
   - `newTraceId({ prefix? })`
   - `newChildTaskId()`
   - `newSessionId()`
   - `newArtifactId()`
   - `newApprovalId()`
   - `newMessageId()`
3. Use `crypto.randomUUID()`.

## Acceptance criteria

- [ ] IDs are unique in tests.
- [ ] IDs are not guessable counters.

---

# Stage G — MCP Gateway Skeleton

## G/0/0 — MCP stdio bootstrap

**Stage:** G — MCP Gateway Skeleton  
**Task:** 0 — MCP bootstrap  
**Depends on:** `A/0/2`, `B/0/4`, `D/0/2`, `F/0/1`  
**Branch:** `feature/G-0-0-mcp-stdio-bootstrap`

## Objectives

Start a real MCP stdio server that can list registered tools and initialize core dependencies.

## Tests

- File: `tests/gateway/mcp_bootstrap.test.js`
- Cases:
  - `server_lists_tools`
  - `server_initializes_registries`
  - `server_initializes_state`

## Detailed steps

1. Wire MCP SDK in `gateway/src/mcp_server.js`.
2. Load config.
3. Load registries.
4. Initialize state.
5. Initialize audit.
6. Register tools from `gateway/src/tools/index.js`.

## Acceptance criteria

- [ ] Gateway starts over stdio.
- [ ] stdout is reserved for MCP protocol.
- [ ] logs go to stderr.

---

## G/0/1 — Tool input validation

**Stage:** G — MCP Gateway Skeleton  
**Task:** 1 — Zod validation  
**Depends on:** `G/0/0`  
**Branch:** `feature/G-0-1-tool-input-validation`

## Objectives

Add a shared pattern for validating tool inputs with Zod.

## Tests

- File: `tests/gateway/tool_validation.test.js`
- Cases:
  - `valid_args_pass`
  - `missing_required_arg_returns_mcp_error`
  - `unknown_arg_is_rejected_or_ignored_consistently`

## Detailed steps

1. Create `gateway/src/tools/tool_helpers.js`.
2. Add `defineTool({ name, description, schema, handler })`.
3. Convert Zod validation errors into structured MCP errors.

## Acceptance criteria

- [ ] Every later tool can share the helper.
- [ ] Validation failures do not crash the Gateway.

---

## G/0/2 — `policy.check` MCP tool

**Stage:** G — MCP Gateway Skeleton  
**Task:** 2 — Policy check tool  
**Depends on:** `G/0/1`, `C/0/5`, `D/0/0`  
**Branch:** `feature/G-0-2-policy-check-tool`

## Objectives

Expose `policy.check` over MCP and audit every decision.

## Tests

- File: `tests/gateway/tool_policy_check.test.js`
- Cases:
  - `policy_check_allow`
  - `policy_check_deny`
  - `policy_check_writes_audit_event`

## Detailed steps

1. Create `gateway/src/tools/policy.js`.
2. Define tool schema matching V4 §18.1.
3. Call `policy_engine.evaluate`.
4. Insert `POLICY_DECIDED` audit event.
5. Return decision, reason and ruleId.

## Acceptance criteria

- [ ] MCP client can call `policy.check`.
- [ ] Audit log contains each policy decision.

---

## G/0/3 — Generic MCP client smoke config

**Stage:** G — MCP Gateway Skeleton  
**Task:** 3 — Generic MCP client smoke config  
**Depends on:** `G/0/2`  
**Branch:** `feature/G-0-3-generic-mcp-smoke-config`

## Objectives

Provide a minimal, **client-agnostic** MCP configuration example that any MCP-capable host (CLI o IDE arbitrario) can consume to connect to the Gateway. No Cursor- or IDE-specific syntax. No `.cursor/`, no `.mdc`, no editor rules.

## Tests

- File: `tests/structure/test_client_config.py`
- Cases:
  - `generic_mcp_example_exists`
  - `generic_mcp_example_points_to_gateway`
  - `generic_mcp_example_uses_stdio_transport`
  - `generic_mcp_example_has_no_ide_specific_keys`

## Detailed steps

1. Create `client-config/mcp.json.example`:
   - Single MCP server entry named `agents-gateway`.
   - Transport `stdio`.
   - `command`: `node`.
   - `args`: relative path placeholder to `gateway/src/mcp_server.js`.
   - `env`: placeholders for `AGENTS_WORKSPACE`, `AGENTS_POLICIES_DIR`, `AGENTS_STATE_DB`, `AGENTS_AUDIT_LOG`, `AGENTS_TMUX_PREFIX`.
2. Use placeholder paths, never user-specific absolute paths.
3. Add `client-config/README.md` with a generic note: any MCP-capable host can adapt this to its own format; the project does not endorse or maintain configs for specific hosts.
4. Document a manual smoke checklist that is host-agnostic: launch the MCP server as a subprocess, send a `tools/list` request and assert `policy.check` is present. This can also be a test inside `tests/gateway/`.

## Acceptance criteria

- [ ] `client-config/mcp.json.example` is valid JSON.
- [ ] No keys, paths or filenames are specific to Cursor, Antigravity, or any other concrete IDE/host.
- [ ] Server entry name is exactly `agents-gateway`.
- [ ] Smoke checklist is host-agnostic and lives in `client-config/README.md`.

---

# Stage H — Adapter Base and Tmux

## H/0/0 — Port tmux client

**Stage:** H — Adapter Base and Tmux  
**Task:** 0 — tmux client  
**Depends on:** `A/0/4`  
**Branch:** `feature/H-0-0-port-tmux-client`

## Objectives

Port `tmux-client.js` from `gemini-orchestrator` into the Gateway adapter layer.

## Tests

- File: `tests/gateway/tmux_client.test.js`
- Cases:
  - `builds_tmux_commands`
  - `create_and_kill_session_if_tmux_available`

## Detailed steps

1. Read `/home/carase/git/personal/gemini-orchestrator/src/tmux-client.js`.
2. Copy/adapt to `gateway/src/adapters/tmux_client.js`.
3. Keep adapter code generic; no Gemini-specific behavior.
4. Mark tmux integration tests skip when tmux is unavailable.

## Acceptance criteria

- [ ] tmux client is generic.
- [ ] Tests pass on systems without tmux by skipping integration cases.

---

## H/0/1 — Session naming helpers

**Stage:** H — Adapter Base and Tmux  
**Task:** 1 — Session naming  
**Depends on:** `H/0/0`  
**Branch:** `feature/H-0-1-session-naming`

## Objectives

Implement safe tmux target naming: `ag-<traceId>-<agent>-<role>`.

## Tests

- File: `tests/gateway/session_naming.test.js`
- Cases:
  - `builds_expected_tmux_target`
  - `sanitizes_invalid_chars`
  - `removes_cli_suffix_from_agent_for_display`

## Detailed steps

1. Create `gateway/src/adapters/session_naming.js`.
2. Implement `buildTmuxTarget({ traceId, agent, role })`.
3. Sanitize names for tmux safety.
4. Keep original agent ID in DB; only display name is simplified.

## Acceptance criteria

- [ ] Naming matches V4 convention.
- [ ] Unsafe chars cannot break shell commands.

---

## H/0/2 — Base adapter contract and cwd guard

**Stage:** H — Adapter Base and Tmux  
**Task:** 2 — Base adapter  
**Depends on:** `C/0/5`, `H/0/1`  
**Branch:** `feature/H-0-2-base-adapter-cwd-guard`

## Objectives

Define adapter interface and enforce `cwd` safety before any process spawn.

## Tests

- File: `tests/gateway/base_adapter.test.js`
- Cases:
  - `cwd_inside_allowed_root_passes`
  - `cwd_outside_allowed_root_fails`
  - `realpath_escape_is_rejected`

## Detailed steps

1. Create `gateway/src/adapters/base_adapter.js`.
2. Define expected methods:
   - `delegate`
   - `spawn`
   - `ask`
   - `view`
   - `kill`
3. Implement `assertSafeCwd`.
4. Use `realpath` before comparing roots.

## Acceptance criteria

- [ ] No adapter can spawn outside configured roots.
- [ ] cwd guard is independent of policy engine.

---

## H/0/3 — Adapter registry

**Stage:** H — Adapter Base and Tmux  
**Task:** 3 — Adapter registry  
**Depends on:** `H/0/2`  
**Branch:** `feature/H-0-3-adapter-registry`

## Objectives

Create `gateway/src/adapters/index.js`, mapping agent IDs to adapter instances.

## Tests

- File: `tests/gateway/adapter_registry.test.js`
- Cases:
  - `unknown_agent_returns_clear_error`
  - `registered_adapter_can_be_retrieved`

## Detailed steps

1. Implement `createAdapterRegistry(config)`.
2. Register no real adapters yet; allow injection in tests.
3. Add clear error for unsupported agents.

## Acceptance criteria

- [ ] Later Gemini/Claude/Codex adapters can plug in without changing services.

---

# Stage I — Gemini Adapter

## I/0/0 — Gemini headless delegate

**Stage:** I — Gemini Adapter  
**Task:** 0 — Headless delegate  
**Depends on:** `H/0/3`, `D/0/0`  
**Branch:** `feature/I-0-0-gemini-headless-delegate`

## Objectives

Implement headless Gemini execution equivalent to `gemini -p --yolo`, behind adapter boundaries.

## Tests

- File: `tests/gateway/gemini_delegate.test.js`
- Cases:
  - `dry_run_delegate_returns_mock`
  - `delegate_builds_expected_command`
  - `delegate_timeout_returns_error`

## Detailed steps

1. Read `gemini-orchestrator/src/tools/delegate.js`.
2. Implement `gateway/src/adapters/gemini_adapter.js`.
3. Add `AGENTS_GEMINI_BIN` config.
4. Add `AGENTS_DRY_RUN=1`.
5. Capture stdout, stderr and exit code.

## Acceptance criteria

- [ ] Dry-run works in CI.
- [ ] Real Gemini command path is configurable.
- [ ] No policy bypass is introduced.

---

## I/0/1 — Gemini supervised tmux sessions

**Stage:** I — Gemini Adapter  
**Task:** 1 — Supervised sessions  
**Depends on:** `I/0/0`, `H/0/0`, `H/0/1`  
**Branch:** `feature/I-0-1-gemini-supervised-tmux`

## Objectives

Support persistent Gemini sessions through tmux: spawn, ask, view and kill.

## Tests

- File: `tests/gateway/gemini_supervised.test.js`
- Cases:
  - `dry_run_spawn_returns_session_info`
  - `dry_run_ask_returns_response`
  - `view_returns_snapshot`
  - `kill_marks_session_closed`

## Detailed steps

1. Read `gemini-orchestrator/src/tools/tmux.js`.
2. Port stabilization helpers.
3. Implement `spawn`, `ask`, `view`, `kill`.
4. Return `attachCommand`.

## Acceptance criteria

- [ ] Supervised dry-run path works.
- [ ] Manual real tmux checklist exists.

---

## I/0/2 — Gemini policy and audit integration

**Stage:** I — Gemini Adapter  
**Task:** 2 — Policy/audit integration  
**Depends on:** `I/0/1`, `C/0/5`, `D/0/0`  
**Branch:** `feature/I-0-2-gemini-policy-audit`

## Objectives

Ensure Gemini adapter actions are blocked before spawn when policy denies and audited when sessions start/end.

## Tests

- File: `tests/gateway/gemini_policy_audit.test.js`
- Cases:
  - `policy_deny_prevents_spawn`
  - `session_started_is_audited`
  - `session_closed_is_audited`
  - `adapter_error_is_audited`

## Detailed steps

1. Add preflight hook for delegate/spawn.
2. Emit `SESSION_STARTED`.
3. Emit `SESSION_CLOSED`.
4. Emit `ERROR` on failures.

## Acceptance criteria

- [ ] Denied calls never reach process spawn.
- [ ] Audit log proves the session lifecycle.

---

# Stage J — Orchestration and Task Tools

## J/0/0 — Orchestration service

**Stage:** J — Orchestration and Task Tools  
**Task:** 0 — Orchestration service  
**Depends on:** `F/0/3`, `D/0/0`  
**Branch:** `feature/J-0-0-orchestration-service`

## Objectives

Implement the service backing `orchestration.create/view/cancel/pause/resume`.

## Tests

- File: `tests/gateway/orchestration_service.test.js`
- Cases:
  - `create_persists_trace`
  - `view_aggregates_children`
  - `pause_and_resume_update_status`
  - `cancel_updates_status`

## Detailed steps

1. Create `gateway/src/services/orchestration_service.js`.
2. Implement create/view/pause/resume/cancel.
3. Write audit events:
   - `ORCHESTRATION_CREATED`
   - `ORCHESTRATION_PLAN_UPDATED` where applicable
   - `ORCHESTRATION_COMPLETED` later when final status is set.

## Acceptance criteria

- [ ] Orchestration state is persisted.
- [ ] `traceId` is returned on create.

---

## J/0/1 — Task assignment service

**Stage:** J — Orchestration and Task Tools  
**Task:** 1 — Task assignment  
**Depends on:** `J/0/0`, `C/0/5`, `F/0/2`  
**Branch:** `feature/J-0-1-task-assignment-service`

## Objectives

Implement `task.assign` semantics: validate caller, select/validate target agent, create child task.

## Tests

- File: `tests/gateway/task_service.test.js`
- Cases:
  - `orchestrator_can_assign_restricted_coder_to_gemini`
  - `non_orchestrator_cannot_assign`
  - `agent_can_be_selected_when_omitted`
  - `invalid_target_role_is_denied`

## Detailed steps

1. Create `gateway/src/services/task_service.js`.
2. Validate caller through policy.
3. If target agent omitted, choose based on role and repo classification.
4. Persist task.
5. Audit `TASK_CREATED`.

## Acceptance criteria

- [ ] `task.assign` respects both caller and target policy.
- [ ] Restricted coder defaults to Gemini for restricted repos.

---

## J/0/2 — MCP tools for orchestration and task

**Stage:** J — Orchestration and Task Tools  
**Task:** 2 — MCP tools  
**Depends on:** `J/0/0`, `J/0/1`, `G/0/1`  
**Branch:** `feature/J-0-2-orchestration-task-tools`

## Objectives

Expose `orchestration.*` and `task.assign` through MCP.

## Tests

- File: `tests/gateway/tool_orchestration_task.test.js`
- Cases:
  - `mcp_orchestration_create`
  - `mcp_orchestration_view`
  - `mcp_task_assign`
  - `invalid_args_return_structured_error`

## Detailed steps

1. Create `gateway/src/tools/orchestration.js`.
2. Create `gateway/src/tools/task.js`.
3. Register tools in `tools/index.js`.
4. Validate inputs with Zod.

## Acceptance criteria

- [ ] MCP exposes create/view/cancel/pause/resume.
- [ ] MCP exposes task.assign.

---

# Stage K — Agent Tools

## K/0/0 — Agent service

**Stage:** K — Agent Tools  
**Task:** 0 — Agent service  
**Depends on:** `I/0/2`, `J/0/1`, `F/0/2`  
**Branch:** `feature/K-0-0-agent-service`

## Objectives

Implement the service backing `agent.delegate/spawn/ask/view/kill`.

## Tests

- File: `tests/gateway/agent_service.test.js`
- Cases:
  - `delegate_creates_session_and_result`
  - `spawn_creates_persistent_session`
  - `ask_requires_existing_session`
  - `kill_closes_session`

## Detailed steps

1. Create `gateway/src/services/agent_service.js`.
2. Resolve adapter from registry.
3. Validate policy before delegate/spawn.
4. Persist sessions.
5. Audit session lifecycle and errors.

## Acceptance criteria

- [ ] No adapter is called before policy allow/approval handling.
- [ ] Session records exist for delegate and spawn.

---

## K/0/1 — Agent MCP tools

**Stage:** K — Agent Tools  
**Task:** 1 — Agent MCP tools  
**Depends on:** `K/0/0`, `G/0/1`  
**Branch:** `feature/K-0-1-agent-mcp-tools`

## Objectives

Expose agent execution primitives to the LLM-orchestrator over MCP.

## Tests

- File: `tests/gateway/tool_agent.test.js`
- Cases:
  - `mcp_agent_delegate`
  - `mcp_agent_spawn`
  - `mcp_agent_ask`
  - `mcp_agent_view`
  - `mcp_agent_kill`

## Detailed steps

1. Create `gateway/src/tools/agent.js`.
2. Add schemas for:
   - `agent.delegate`
   - `agent.spawn`
   - `agent.ask`
   - `agent.view`
   - `agent.kill`
3. Register all tools.

## Acceptance criteria

- [ ] All five agent tools are listed by MCP.
- [ ] Dry-run cycle spawn→ask→view→kill works.

---

## K/0/2 — Timeouts and structured errors

**Stage:** K — Agent Tools  
**Task:** 2 — Timeouts/errors  
**Depends on:** `K/0/1`  
**Branch:** `feature/K-0-2-agent-timeouts-errors`

## Objectives

Standardize timeouts and error responses for agent execution.

## Tests

- File: `tests/gateway/agent_errors.test.js`
- Cases:
  - `delegate_timeout_returns_error`
  - `adapter_failure_returns_structured_error`
  - `error_is_audited`

## Detailed steps

1. Add default `timeoutMs` config.
2. Implement timeout wrapper.
3. Convert adapter errors to MCP-safe errors.
4. Audit `ERROR`.

## Acceptance criteria

- [ ] Long-running child calls time out predictably.
- [ ] Error response includes code and reason.

---

# Stage L — Artifact Store

## L/0/0 — Filesystem artifact store

**Stage:** L — Artifact Store  
**Task:** 0 — Artifact store  
**Depends on:** `F/0/2`, `D/0/0`  
**Branch:** `feature/L-0-0-filesystem-artifact-store`

## Objectives

Persist artifacts under `workspace/artifacts/<traceId>/`.

## Tests

- File: `tests/gateway/artifact_store.test.js`
- Cases:
  - `put_writes_file`
  - `put_creates_db_row`
  - `get_reads_content`
  - `list_by_trace_id`

## Detailed steps

1. Create `gateway/src/core/artifact_store.js`.
2. Implement `put`.
3. Implement `get`.
4. Implement `list`.
5. Use `artifact://<artifactId>` URIs in metadata.

## Acceptance criteria

- [ ] Artifacts are persisted in filesystem and SQLite.
- [ ] Artifact paths are scoped under workspace.

---

## L/0/1 — Artifact MCP tools

**Stage:** L — Artifact Store  
**Task:** 1 — Artifact tools  
**Depends on:** `L/0/0`, `G/0/1`  
**Branch:** `feature/L-0-1-artifact-mcp-tools`

## Objectives

Expose `artifact.put`, `artifact.get` and `artifact.list`.

## Tests

- File: `tests/gateway/tool_artifact.test.js`
- Cases:
  - `mcp_artifact_put`
  - `mcp_artifact_get`
  - `mcp_artifact_list`

## Detailed steps

1. Create `gateway/src/tools/artifact.js`.
2. Add Zod schemas.
3. Register tools.
4. Audit `ARTIFACT_CREATED` on put.

## Acceptance criteria

- [ ] Tools are listed by MCP.
- [ ] Basic put/get/list works without sanitizer.

---

## L/0/2 — Artifact get policy

**Stage:** L — Artifact Store  
**Task:** 2 — Artifact get policy  
**Depends on:** `L/0/1`, `C/0/5`  
**Branch:** `feature/L-0-2-artifact-get-policy`

## Objectives

Apply policy when a caller reads an artifact.

## Tests

- File: `tests/gateway/artifact_get_policy.test.js`
- Cases:
  - `claude_orchestrator_denied_raw_restricted`
  - `gemini_restricted_coder_allowed_raw_restricted`
  - `sanitized_internal_allowed`

## Detailed steps

1. Require requester agent and role in `artifact.get`.
2. Evaluate policy with artifact metadata.
3. Deny raw restricted where policy denies.
4. Audit `POLICY_DECIDED`.

## Acceptance criteria

- [ ] `artifact.get` cannot bypass policy.
- [ ] Raw restricted artifacts are protected before sanitizer exists.

---

# Stage M — Sanitization Layer

## M/0/0 — Sanitization rules registry

**Stage:** M — Sanitization Layer  
**Task:** 0 — Sanitization rules  
**Depends on:** `B/0/0`  
**Branch:** `feature/M-0-0-sanitization-rules`

## Objectives

Create declarative sanitization rules for restricted raw outputs.

## Tests

- File: `tests/gateway/sanitization_rules.test.js`
- Cases:
  - `rules_file_loads`
  - `rules_have_pattern_and_replacement`

## Detailed steps

1. Create `policies/sanitization-rules.json`.
2. Add rules for:
   - secrets/tokens
   - absolute paths
   - UUID/customer-like IDs
   - internal class/file names
3. Keep rules deterministic.

## Acceptance criteria

- [ ] Rules file is valid JSON.
- [ ] Rules do not contain real secrets.

---

## M/0/1 — Sanitizer core

**Stage:** M — Sanitization Layer  
**Task:** 1 — Sanitizer implementation  
**Depends on:** `M/0/0`  
**Branch:** `feature/M-0-1-sanitizer-core`

## Objectives

Implement `sanitize(content, context)` using declarative rules.

## Tests

- File: `tests/gateway/sanitizer.test.js`
- Cases:
  - `redacts_secret`
  - `redacts_absolute_path`
  - `returns_applied_rules`

## Detailed steps

1. Create `gateway/src/core/sanitizer.js`.
2. Load rules.
3. Apply rules in deterministic order.
4. Return sanitized content plus applied rule IDs.

## Acceptance criteria

- [ ] Sanitizer is deterministic.
- [ ] Applied rules are auditable.

---

## M/0/2 — Automatic sanitized artifact generation

**Stage:** M — Sanitization Layer  
**Task:** 2 — Auto sanitize artifacts  
**Depends on:** `M/0/1`, `L/0/0`, `D/0/0`  
**Branch:** `feature/M-0-2-auto-sanitize-artifacts`

## Objectives

Generate sanitized artifacts automatically when restricted raw artifacts are stored.

## Tests

- File: `tests/gateway/auto_sanitize_artifacts.test.js`
- Cases:
  - `put_raw_restricted_creates_sanitized_artifact`
  - `sanitized_artifact_links_to_raw`
  - `sanitization_event_is_audited`

## Detailed steps

1. Hook sanitizer into artifact put.
2. Create linked artifact with `sanitized_from`.
3. Store under `workspace/artifacts/<traceId>/sanitized/`.
4. Audit `SANITIZATION_APPLIED`.

## Acceptance criteria

- [ ] Raw restricted artifacts produce sanitized counterparts.
- [ ] Sanitized artifacts preserve traceability to raw.

---

## M/0/3 — Fail-closed sanitization behavior

**Stage:** M — Sanitization Layer  
**Task:** 3 — Fail closed  
**Depends on:** `M/0/2`, `L/0/2`  
**Branch:** `feature/M-0-3-sanitization-fail-closed`

## Objectives

Ensure sanitizer failures never leak raw restricted artifacts.

## Tests

- File: `tests/gateway/sanitization_fail_closed.test.js`
- Cases:
  - `sanitizer_failure_blocks_cross_boundary_get`
  - `failure_is_audited`

## Detailed steps

1. Simulate sanitizer failure.
2. Ensure `artifact.get` for non-raw-authorized requester denies.
3. Audit `ERROR` and policy decision.

## Acceptance criteria

- [ ] Failure mode is deny, not raw fallback.
- [ ] Operator can inspect the error in audit.

---

# Stage N — Artifact Sharing and Visibility

## N/0/0 — Artifact share service

**Stage:** N — Artifact Sharing and Visibility  
**Task:** 0 — Share service  
**Depends on:** `M/0/2`, `C/0/5`  
**Branch:** `feature/N-0-0-artifact-share-service`

## Objectives

Implement policy-aware artifact sharing between roles/agents.

## Tests

- File: `tests/gateway/artifact_share_service.test.js`
- Cases:
  - `raw_restricted_share_to_reviewer_returns_sanitized`
  - `raw_restricted_share_to_orchestrator_denied_or_sanitized_as_policy_says`
  - `raw_internal_share_allowed`

## Detailed steps

1. Create `gateway/src/services/artifact_share_service.js`.
2. Evaluate policy for target.
3. If sanitization required, select sanitized artifact ID.
4. Audit `ARTIFACT_SHARED`.

## Acceptance criteria

- [ ] raw restricted is never shared directly to reviewer.
- [ ] Returned artifact ID is safe for target role.

---

## N/0/1 — `artifact.share` MCP tool

**Stage:** N — Artifact Sharing and Visibility  
**Task:** 1 — Share tool  
**Depends on:** `N/0/0`, `G/0/1`  
**Branch:** `feature/N-0-1-artifact-share-tool`

## Objectives

Expose `artifact.share` through MCP.

## Tests

- File: `tests/gateway/tool_artifact_share.test.js`
- Cases:
  - `mcp_artifact_share_returns_decision`
  - `mcp_artifact_share_returns_shared_artifact_id_when_allowed`

## Detailed steps

1. Extend `gateway/src/tools/artifact.js`.
2. Add schema for `artifact.share`.
3. Return `{ decision, sharedArtifactId }`.

## Acceptance criteria

- [ ] `artifact.share` is listed by MCP.
- [ ] Tool output matches V4 contract.

---

## N/0/2 — Visibility matrix tests

**Stage:** N — Artifact Sharing and Visibility  
**Task:** 2 — Visibility matrix  
**Depends on:** `N/0/1`  
**Branch:** `feature/N-0-2-visibility-matrix-tests`

## Objectives

Lock down the visibility table from §15 V4.

## Tests

- File: `tests/gateway/artifact_visibility_matrix.test.js`
- Cases:
  - Matrix rows for Gemini restricted-coder, Claude orchestrator, Claude reviewer and Codex tester.

## Detailed steps

1. Encode the §15 V4 visibility matrix as test data.
2. Assert expected allow/deny/sanitize decisions.
3. Include both get and share paths.

## Acceptance criteria

- [ ] Raw restricted visibility is covered by tests.
- [ ] Future changes cannot silently widen access.

---

# Stage O — Claude Adapter

## O/0/0 — Claude CLI invocation research

**Stage:** O — Claude Adapter  
**Task:** 0 — Claude invocation research  
**Depends on:** `H/0/3`  
**Branch:** `feature/O-0-0-claude-cli-research`

## Objectives

Document the supported Claude Code CLI invocation mode before implementing the adapter.

## Tests

- File: `tests/structure/test_claude_adapter_docs.py`
- Cases:
  - `claude_adapter_notes_exist`
  - `claude_adapter_notes_define_manual_checklist`

## Detailed steps

1. Create `docs/adapters/claude-code.md`.
2. Document:
   - CLI binary name.
   - Headless/non-interactive invocation if available.
   - tmux supervised mode.
   - dry-run fallback.
3. Do not rely on network.

## Acceptance criteria

- [ ] Version/flag assumptions are documented.
- [ ] If unknown, adapter can proceed with tmux-only supervised mode.

---

## O/0/1 — Claude adapter implementation

**Stage:** O — Claude Adapter  
**Task:** 1 — Claude adapter  
**Depends on:** `O/0/0`, `H/0/3`, `K/0/0`  
**Branch:** `feature/O-0-1-claude-adapter`

## Objectives

Implement `claude_adapter.js` with the same interface as Gemini.

## Tests

- File: `tests/gateway/claude_adapter.test.js`
- Cases:
  - `dry_run_delegate`
  - `dry_run_spawn`
  - `dry_run_ask_view_kill`

## Detailed steps

1. Create `gateway/src/adapters/claude_adapter.js`.
2. Add `AGENTS_CLAUDE_BIN`.
3. Implement dry-run mode.
4. Implement real mode based on documented CLI behavior.

## Acceptance criteria

- [ ] Adapter passes dry-run tests.
- [ ] Interface matches Gemini adapter.

---

## O/0/2 — Claude policy enforcement

**Stage:** O — Claude Adapter  
**Task:** 2 — Claude policy enforcement  
**Depends on:** `O/0/1`, `C/0/5`  
**Branch:** `feature/O-0-2-claude-policy-enforcement`

## Objectives

Verify Claude cannot operate on restricted repos even if asked by the orchestrator.

## Tests

- File: `tests/gateway/claude_policy.test.js`
- Cases:
  - `claude_spawn_on_cvision_denied`
  - `claude_delegate_on_sample_apps_allowed`

## Detailed steps

1. Add adapter registry entry for `claude-code`.
2. Test `agent.spawn` with `repo=cvision`.
3. Test allowed non-restricted flow.

## Acceptance criteria

- [ ] Claude restricted access is blocked before spawn.
- [ ] Claude works for internal/unrestricted dry-run tasks.

---

# Stage P — Codex Adapter (Optional MVP)

## P/0/0 — Codex adapter dry-run

**Stage:** P — Codex Adapter  
**Task:** 0 — Codex dry-run adapter  
**Depends on:** `H/0/3`, `K/0/0`  
**Branch:** `feature/P-0-0-codex-adapter-dry-run`

## Objectives

Register Codex as an optional adapter with dry-run behavior and clear disabled state if CLI is unavailable.

## Tests

- File: `tests/gateway/codex_adapter.test.js`
- Cases:
  - `dry_run_delegate`
  - `unavailable_cli_returns_clear_error`

## Detailed steps

1. Create `gateway/src/adapters/codex_adapter.js`.
2. Implement dry-run methods.
3. Add docs with limitations.

## Acceptance criteria

- [ ] MVP can pass without real Codex CLI.
- [ ] Disabled state is explicit.

---

# Stage Q — Approval Workflow

## Q/0/0 — Approval repository and state machine

**Stage:** Q — Approval Workflow  
**Task:** 0 — Approval state  
**Depends on:** `F/0/2`  
**Branch:** `feature/Q-0-0-approval-state-machine`

## Objectives

Implement approval persistence and valid state transitions.

## Tests

- File: `tests/gateway/approval_state.test.js`
- Cases:
  - `create_pending_approval`
  - `grant_pending_approval`
  - `deny_pending_approval`
  - `cannot_decide_twice`

## Detailed steps

1. Extend `approval_repo.js`.
2. Statuses: `pending`, `granted`, `denied`, `expired`.
3. Add transition guards.

## Acceptance criteria

- [ ] Approval state is durable.
- [ ] Double decision is rejected.

---

## Q/0/1 — Async approval service (non-blocking core)

**Stage:** Q — Approval Workflow  
**Task:** 1 — Async approval service  
**Depends on:** `Q/0/0`, `D/0/0`  
**Branch:** `feature/Q-0-1-async-approval-service`

## Objectives

Reemplaza la version original "blocking service" por un servicio **async-first**. Las MCP calls nunca bloquean indefinidamente al cliente humano-facing. La semantica es:

```text
approval.request(...)              -> { approvalId, status: "pending" }   # never blocks
approval.respond(approvalId, ...)  -> { approvalId, status: "granted"|"denied" }
approval.poll(approvalId)          -> { status }                          # cheap status read
```

El `wait` con timeout y notificacion de cambio se implementa en `Q/0/4` como primitiva separada, opcionalmente envuelta como bloqueante.

## Tests

- File: `tests/gateway/approval_service.test.js`
- Cases:
  - `request_returns_pending_immediately`
  - `respond_grants_pending_approval`
  - `respond_denies_pending_approval`
  - `cannot_respond_twice`
  - `poll_returns_current_status`
  - `request_audits_approval_required`
  - `respond_audits_granted_or_denied`

## Detailed steps

1. Create `gateway/src/services/approval_service.js`.
2. Implement `request(traceId, action, context)`:
   - Persist a `pending` approval via `approval_repo`.
   - Emit `APPROVAL_REQUIRED` audit event.
   - Return `{ approvalId, status: "pending" }` synchronously.
3. Implement `respond(approvalId, decision, note?)`:
   - Validate state transition (only `pending` -> `granted` | `denied`).
   - Persist transition.
   - Emit `APPROVAL_GRANTED` or `APPROVAL_DENIED`.
4. Implement `poll(approvalId)` returning current status (cheap read).
5. Use an internal `EventEmitter` keyed by `approvalId` so `Q/0/4` can plug in.
6. Never expose any function that blocks an MCP request.

## Acceptance criteria

- [ ] `request` returns within milliseconds with `pending`.
- [ ] `respond` is idempotent on already-decided approvals (returns the existing status, does not throw twice).
- [ ] No public function in the service blocks indefinitely.
- [ ] All transitions are audited.

---

## Q/0/2 — Approval MCP tools (request, respond, poll)

**Stage:** Q — Approval Workflow  
**Task:** 2 — Approval tools  
**Depends on:** `Q/0/1`, `G/0/1`  
**Branch:** `feature/Q-0-2-approval-mcp-tools`

## Objectives

Expose `approval.request`, `approval.respond` y `approval.poll` over MCP, todos sin bloquear. La primitiva de espera se expone en `Q/0/4`.

## Tests

- File: `tests/gateway/tool_approval.test.js`
- Cases:
  - `mcp_approval_request_returns_pending`
  - `mcp_approval_respond_granted`
  - `mcp_approval_respond_denied`
  - `mcp_approval_poll_returns_current_status`
  - `mcp_approval_request_does_not_block`

## Detailed steps

1. Create `gateway/src/tools/approval.js`.
2. Add Zod schemas para `approval.request`, `approval.respond`, `approval.poll`.
3. Register the three tools.
4. Documentar en el tool description que `approval.request` **no bloquea** y que la espera se hace via `approval.wait` (tarea Q/0/4) o polling.

## Acceptance criteria

- [ ] Las tres tools estan listadas por MCP.
- [ ] `approval.request` retorna `pending` sin esperar.
- [ ] Audit contiene `APPROVAL_REQUIRED`, `APPROVAL_GRANTED` y `APPROVAL_DENIED` cuando aplique.

---

## Q/0/3 — Approval CLI

**Stage:** Q — Approval Workflow  
**Task:** 3 — Approval CLI  
**Depends on:** `Q/0/1`, `A/0/3`  
**Branch:** `feature/Q-0-3-agent-run-approve`

## Objectives

Allow the operator to respond to pending approvals from CLI.

## Tests

- File: `tests/cli/test_approve.py`
- Cases:
  - `approve_granted`
  - `approve_denied`
  - `approve_unknown_id_fails`

## Detailed steps

1. Implement `agent-run approve <approvalId>`.
2. Flags:
   - `--decision granted|denied`
   - `--note`
3. Print resulting status.

## Acceptance criteria

- [ ] Operator can approve from CLI without any IDE.
- [ ] Denied approvals unblock waiting requests.

---

## Q/0/4 — `approval.wait` primitive with bounded timeout

**Stage:** Q — Approval Workflow  
**Task:** 4 — Wait primitive  
**Depends on:** `Q/0/1`, `Q/0/2`  
**Branch:** `feature/Q-0-4-approval-wait-primitive`

## Objectives

Provide an explicit, bounded **wait** primitive on top of the async approval service. This is the only place where the Gateway is allowed to keep an MCP request open for a non-trivial amount of time, and even there it is bounded by a maximum timeout. The orquestador-LLM elige entre tres patrones:

1. **Fire-and-poll:** `approval.request` -> `approval.poll` periodicamente.
2. **Wait corto:** `approval.request` -> `approval.wait(approvalId, timeoutMs)` con un timeout pequeno (segundos).
3. **Wait largo con heartbeat:** `approval.wait` con timeout mayor pero protegido por un techo de servidor (`AGENTS_APPROVAL_MAX_WAIT_MS`).

Ningun cliente MCP queda colgado mas alla del techo de servidor.

## Tests

- File: `tests/gateway/approval_wait.test.js`
- Cases:
  - `wait_returns_when_approval_granted`
  - `wait_returns_when_approval_denied`
  - `wait_returns_pending_after_client_timeout`
  - `wait_returns_pending_after_server_max_timeout`
  - `wait_does_not_block_other_calls`
  - `wait_audit_event_includes_outcome`

## Detailed steps

1. Add config var `AGENTS_APPROVAL_MAX_WAIT_MS` with safe default (e.g. 60_000).
2. Implement `waitForDecision(approvalId, requestedTimeoutMs)`:
   - Resolve immediately if the approval is already decided.
   - Otherwise, wait on the service's `EventEmitter` for the `approvalId`.
   - Cap the effective wait at `min(requestedTimeoutMs, AGENTS_APPROVAL_MAX_WAIT_MS)`.
   - On timeout, return current status (`pending` if still undecided).
3. Add MCP tool `approval.wait` with Zod schema:
   - input: `approvalId`, `timeoutMs?`
   - output: `{ approvalId, status, decidedAt? }`
4. Update `prompts/orchestrator_system_prompt.md` (in `T/0/1`) to recommend the async-first patterns.
5. Audit a `APPROVAL_WAIT_TIMEOUT` event when the wait returns without a decision.
6. Document in the tool description that `wait` is not the only way to learn the outcome; `poll` and event-driven flows are valid.

## Acceptance criteria

- [ ] `approval.wait` exists as MCP tool with bounded server timeout.
- [ ] No call ever exceeds `AGENTS_APPROVAL_MAX_WAIT_MS`.
- [ ] An MCP client that never calls `wait` can still progress via `poll`.
- [ ] Tests cover granted, denied, client timeout, server cap, and concurrent calls.

---

# Stage R — Session Tools and Human Intervention

## R/0/0 — Session attach info tool

**Stage:** R — Session Tools and Human Intervention  
**Task:** 0 — Attach info  
**Depends on:** `K/0/1`  
**Branch:** `feature/R-0-0-session-attach-info`

## Objectives

Expose `session.attach_info` so the orchestrator can show tmux attach commands.

## Tests

- File: `tests/gateway/tool_session_attach_info.test.js`
- Cases:
  - `returns_tmux_target`
  - `returns_attach_command`
  - `unknown_session_fails`

## Detailed steps

1. Create `gateway/src/tools/session.js`.
2. Add `session.attach_info`.
3. Query session repo.
4. Return `tmuxTarget` and `attachCommand`.

## Acceptance criteria

- [ ] Supervised sessions are observable via returned command.

---

## R/0/1 — Intervention detector

**Stage:** R — Session Tools and Human Intervention  
**Task:** 1 — Human intervention detector  
**Depends on:** `H/0/0`, `I/0/1`, `D/0/0`  
**Branch:** `feature/R-0-1-human-intervention-detector`

## Objectives

Detect best-effort human input into tmux sessions not caused by `agent.ask`.

## Tests

- File: `tests/gateway/intervention_detector.test.js`
- Cases:
  - `detects_unexpected_pane_change`
  - `does_not_flag_known_agent_ask`
  - `writes_human_intervention_audit`

## Detailed steps

1. Create `gateway/src/adapters/intervention_detector.js`.
2. Track expected prompts sent by Gateway.
3. Compare tmux pane snapshots before/after.
4. Emit `HUMAN_TMUX_INTERVENTION`.

## Acceptance criteria

- [ ] Detector is best-effort and documented as such.
- [ ] False positives are acceptable but visible.

---

## R/0/2 — Manual intervention notes

**Stage:** R — Session Tools and Human Intervention  
**Task:** 2 — Intervention notes  
**Depends on:** `R/0/0`, `D/0/0`  
**Branch:** `feature/R-0-2-session-intervention-note`

## Objectives

Allow the operator/orchestrator to record manual notes about tmux intervention.

## Tests

- File: `tests/gateway/tool_session_intervention_note.test.js`
- Cases:
  - `records_note`
  - `note_appears_in_audit`

## Detailed steps

1. Implement `session.intervention_note`.
2. Persist an audit event with note text.
3. Include trace/session IDs.

## Acceptance criteria

- [ ] Manual intervention notes are auditable.

---

# Stage S — Message Store MVP

## S/0/0 — Message repository

**Stage:** S — Message Store MVP  
**Task:** 0 — Message repository  
**Depends on:** `F/0/2`  
**Branch:** `feature/S-0-0-message-repository`

## Objectives

Implement persistent message storage in SQLite.

## Tests

- File: `tests/gateway/message_repo.test.js`
- Cases:
  - `create_message`
  - `list_messages_by_trace`
  - `messages_do_not_cross_trace_ids`

## Detailed steps

1. Extend `message_repo.js`.
2. Store payload as artifact or JSON text according to schema.
3. Enforce trace scoping.

## Acceptance criteria

- [ ] Messages are scoped to traceId.
- [ ] No direct child-to-child channel bypasses Gateway.

---

## S/0/1 — Message MCP tools

**Stage:** S — Message Store MVP  
**Task:** 1 — Message tools  
**Depends on:** `S/0/0`, `G/0/1`  
**Branch:** `feature/S-0-1-message-mcp-tools`

## Objectives

Expose `message.send`, `message.list` and `message.reply`.

## Tests

- File: `tests/gateway/tool_message.test.js`
- Cases:
  - `send_message`
  - `list_messages`
  - `reply_message`

## Detailed steps

1. Create `gateway/src/tools/message.js`.
2. Add schemas.
3. Audit `MESSAGE_SENT`.

## Acceptance criteria

- [ ] Tools are available for post-MVP message-mediated flows.

---

# Stage T — Generic MCP Config and Orchestrator Prompt

> **Out of scope:** Cursor, Antigravity IDE y cualquier IDE/cliente concreto. Esta stage solo entrega artefactos genericos (config MCP estandar y system prompt). La conexion real desde un IDE/host concreto es responsabilidad del operador.

## T/0/0 — Generic MCP client config example

**Stage:** T — Generic MCP Config and Orchestrator Prompt  
**Task:** 0 — Generic client config  
**Depends on:** `G/0/3`  
**Branch:** `feature/T-0-0-generic-mcp-client-config`

## Objectives

Finalize the **client-agnostic** MCP configuration example and its README, expanding on the smoke version produced in `G/0/3`. No host-specific syntax; no Cursor/Antigravity adaptations.

## Tests

- File: `tests/structure/test_generic_mcp_config.py`
- Cases:
  - `generic_config_is_valid_json`
  - `generic_config_uses_gateway_entrypoint`
  - `generic_config_uses_stdio_transport`
  - `generic_config_has_no_secrets`
  - `generic_config_has_no_ide_specific_keys`

## Detailed steps

1. Reuse `client-config/mcp.json.example` from `G/0/3`.
2. Expand `client-config/README.md`:
   - Explain the `mcp` server entry shape (transport, command, args, env).
   - List required env vars and safe local defaults.
   - State explicitly that Cursor, Antigravity IDE and other IDE-specific configs are **out of scope**; the operator is responsible for adapting this generic example to their host.
3. Use only relative path placeholders.
4. Do not include any value resembling a credential or token.

## Acceptance criteria

- [ ] Config example is valid JSON and host-agnostic.
- [ ] README explicitly puts IDE-specific configs out of scope.
- [ ] No secrets are present.

---

## T/0/1 — Orchestrator system prompt

**Stage:** T — Generic MCP Config and Orchestrator Prompt  
**Task:** 1 — Orchestrator prompt  
**Depends on:** `J/0/2`, `K/0/1`, `Q/0/2`  
**Branch:** `feature/T-0-1-orchestrator-system-prompt`

## Objectives

Create `prompts/orchestrator_system_prompt.md` defining how an MCP-capable LLM client acts in role `orchestrator`. The prompt must be **client-agnostic**: it does not reference Cursor rules, Antigravity instructions, or any other IDE-specific configuration mechanism.

## Tests

- File: `tests/structure/test_orchestrator_prompt.py`
- Cases:
  - `prompt_mentions_task_assign`
  - `prompt_denies_direct_code_write`
  - `prompt_denies_raw_restricted_access`
  - `prompt_mentions_approval_request_async`
  - `prompt_has_no_ide_specific_terminology`

## Detailed steps

1. Base content on Anexo D of V4.
2. Explain normal flow:
   - create orchestration
   - assign roles
   - use agent tools
   - use artifacts
   - request approvals using async semantics (`approval.request` returns `pending`, then optional `approval.wait`)
3. Explain limits:
   - no direct code write
   - no raw restricted
   - do not bypass Gateway
4. Explicitly avoid words like "Cursor rules", "Antigravity", or any host-specific instruction format.

## Acceptance criteria

- [ ] Prompt reinforces policy but is not treated as security boundary.
- [ ] Prompt is usable in any MCP-capable LLM client.
- [ ] Prompt does not assume a specific IDE.

---

## T/0/2 — Operator guide (client-agnostic)

**Stage:** T — Generic MCP Config and Orchestrator Prompt  
**Task:** 2 — Operator guide  
**Depends on:** `T/0/0`, `T/0/1`  
**Branch:** `feature/T-0-2-operator-guide`

## Objectives

Document how the operator installs, validates and runs the MVP locally **without referencing any specific IDE/host**.

## Tests

- File: `tests/structure/test_operator_guide.py`
- Cases:
  - `operator_guide_exists`
  - `operator_guide_mentions_policy_validate`
  - `operator_guide_mentions_generic_mcp_config`
  - `operator_guide_does_not_mention_specific_ides`

## Detailed steps

1. Create `docs/operator-guide.md`.
2. Include:
   - install dependencies
   - run `agent-run policy validate`
   - launch Gateway as a subprocess from any MCP-capable host (host-agnostic)
   - inject `prompts/orchestrator_system_prompt.md` into the host as the orchestrator role
   - run first dry-run orchestration via MCP tool calls
   - inspect audit with `agent-run audit show`
3. Add a section "**Out of scope: IDE/host specifics**" stating that adapting the generic config to Cursor, Antigravity or any other IDE is the operator's responsibility.
4. Add troubleshooting for MCP stdout/logs.

## Acceptance criteria

- [ ] An operator can launch the Gateway and run a dry-run orchestration following only the guide, without any IDE-specific instruction.
- [ ] The guide names Cursor and Antigravity only to mark them as out of scope.
- [ ] No hidden assumptions about local absolute paths.

---

# Stage U — E2E and MVP Closure

## U/0/0 — Restricted-flow E2E dry-run

**Stage:** U — E2E and MVP Closure  
**Task:** 0 — Restricted E2E  
**Depends on:** `N/0/2`, `O/0/2`, `Q/0/3`, `R/0/2`, `T/0/2`  
**Branch:** `feature/U-0-0-restricted-flow-e2e`

## Objectives

Automate the canonical V4 restricted flow using dry-run adapters.

## Tests

- File: `tests/e2e/mvp_restricted_flow.test.js`
- Cases:
  - `restricted_flow_end_to_end`

## Detailed steps

1. Start Gateway with dry-run adapters.
2. Call `orchestration.create`.
3. Call `task.assign` for Gemini `restricted-coder`.
4. Spawn session.
5. Put raw restricted artifact.
6. Verify sanitized artifact exists.
7. Assign reviewer.
8. Request approval for protected push.
9. Respond granted.
10. Verify audit contains all key events.

## Acceptance criteria

- [ ] E2E test passes without real CLIs.
- [ ] Raw restricted artifact is never returned to Claude orchestrator.

---

## U/0/1 — V4 acceptance checklist

**Stage:** U — E2E and MVP Closure  
**Task:** 1 — Acceptance checklist  
**Depends on:** `U/0/0`  
**Branch:** `feature/U-0-1-v4-acceptance-checklist`

## Objectives

Create a machine-readable and human-readable checklist mapping V4 §30 criteria to evidence.

## Tests

- File: `tests/structure/test_acceptance_checklist.py`
- Cases:
  - `checklist_exists`
  - `each_item_has_evidence`

## Detailed steps

1. Create `docs/mvp-acceptance-checklist.md`.
2. Copy each V4 §30 criterion.
3. Add evidence column:
   - test ID
   - doc path
   - manual checklist if needed
4. Mark incomplete items explicitly.

## Acceptance criteria

- [ ] Every V4 acceptance item is represented.
- [ ] No item is marked complete without evidence.

---

## U/0/2 — Final README and MVP ADR

**Stage:** U — E2E and MVP Closure  
**Task:** 2 — MVP docs closure  
**Depends on:** `U/0/1`  
**Branch:** `feature/U-0-2-mvp-docs-closure`

## Objectives

Finalize README and document final MVP scope.

## Tests

- File: `tests/structure/test_mvp_docs.py`
- Cases:
  - `readme_has_quickstart`
  - `mvp_scope_adr_exists`
  - `readme_mentions_no_orchestrator_component`

## Detailed steps

1. Update README quickstart.
2. Add architecture summary.
3. Create `docs/adr/ADR-004-mvp-scope.md`.
4. List what is in MVP and what is deferred.

## Acceptance criteria

- [ ] README can onboard a new agent/operator.
- [ ] MVP scope is explicit.

---

## U/0/3 — MVP regression gate

**Stage:** U — E2E and MVP Closure  
**Task:** 3 — Regression gate  
**Depends on:** `U/0/2`  
**Branch:** `feature/U-0-3-mvp-regression-gate`

## Objectives

Run the final test suite and close MVP readiness.

## Tests

- Command: `./scripts/ci.sh`
- Manual checklist: launch Gateway as a subprocess from any MCP-capable host and call `policy.check` (host-agnostic; Cursor/Antigravity-specific verification is out of scope).

## Detailed steps

1. Run all tests.
2. Run E2E dry-run.
3. Run `agent-run policy validate`.
4. Run a host-agnostic MCP smoke (custom client or scripted MCP call) if available; do **not** require a specific IDE.
5. Update `docs/mvp-acceptance-checklist.md`.

## Acceptance criteria

- [ ] `./scripts/ci.sh` passes.
- [ ] E2E dry-run passes.
- [ ] No standalone orchestrator component exists.
- [ ] No restricted repo path has been touched.
- [ ] No IDE-specific verification (Cursor/Antigravity) is required to consider the gate green.

---

## U/0/4 — Bypass regression suite

**Stage:** U — E2E and MVP Closure  
**Task:** 4 — Bypass regression suite  
**Depends on:** `U/0/3`, `A/0/6`, `M/0/3`, `N/0/2`, `Q/0/4`  
**Branch:** `feature/U-0-4-bypass-regression-suite`

## Objectives

Materializar el threat model de `A/0/6` en una suite **adversarial** que bloquea cualquier regresion futura: cada amenaza listada debe tener al menos un test que demuestre que el bypass falla. Esta suite forma parte de `./scripts/ci.sh` y se considera parte del MVP.

A diferencia del E2E "happy path" en `U/0/0`, esta suite ejercita explicitamente el comportamiento abusivo y verifica el control de seguridad.

## Tests

- File: `tests/e2e/bypass_regression.test.js`
- Cases (uno por amenaza de `docs/threat-model.md`, como minimo):
  - `prompt_injection_against_orchestrator_cannot_get_raw_restricted`
  - `prompt_injection_against_orchestrator_cannot_code_write`
  - `child_summary_does_not_leak_raw_restricted_after_sanitizer`
  - `filesystem_bypass_outside_artifact_store_is_not_visible_to_other_role`
  - `cwd_outside_allowlist_is_rejected_before_spawn`
  - `cwd_symlink_escape_is_rejected`
  - `tmux_intervention_is_audited_or_flagged`
  - `sanitizer_failure_blocks_cross_boundary_get`
  - `approval_respond_with_unknown_id_is_rejected`
  - `approval_respond_replay_does_not_grant_again`
  - `artifact_get_with_wrong_requester_role_denied`
  - `cross_trace_artifact_access_denied`
  - `cross_trace_message_access_denied`
  - `mcp_stdout_only_contains_protocol_frames`
  - `approval_wait_never_exceeds_server_cap`

## Detailed steps

1. Crear `tests/e2e/bypass_regression.test.js` (Node `--test`).
2. Para cada amenaza del threat model:
   - Construir un escenario adversarial concreto.
   - Ejercitar la API MCP / servicios desde un cliente de test.
   - Asegurar que el control documentado en `docs/threat-model.md` se aplica (deny, sanitization, audit, etc.).
3. Dejar trazabilidad: cada caso del test referencia por comentario el id de la amenaza (`# threat: prompt-injection-orchestrator`).
4. Conectar la suite a `scripts/ci.sh` para que sea bloqueante en MVP.
5. Si una amenaza no es testeable hoy, dejar un `it.skip` con TODO ligado a la tarea futura; nunca aprobar el MVP con threats sin cobertura **y** sin TODO explicito.
6. Actualizar `docs/threat-model.md` para que cada amenaza apunte a `tests/e2e/bypass_regression.test.js#<case>`.
7. Anadir entrada en `docs/mvp-acceptance-checklist.md`.

## Acceptance criteria

- [ ] Existe al menos un test bypass por amenaza listada en `docs/threat-model.md`.
- [ ] Todos los casos pasan (o estan explicitamente `skip` con TODO trazado).
- [ ] La suite corre como parte de `./scripts/ci.sh`.
- [ ] No se aprueba la cierre del MVP con regresiones bypass abiertas sin TODO documentado.
- [ ] `docs/threat-model.md` queda en sincronia con la suite.

---

# Stage V — Post-MVP Optional Work

## V/0/0 — Postgres migration spike

**Stage:** V — Post-MVP  
**Task:** 0 — Postgres spike  
**Depends on:** `U/0/3`  
**Branch:** `feature/V-0-0-postgres-spike`

## Objectives

Evaluate migration from SQLite to Postgres without changing MCP contracts.

## Tests

- File: `tests/gateway/postgres_state.test.js`
- Cases:
  - `same_repository_contract_on_postgres`

## Detailed steps

1. Add `docker/docker-compose.yml` Postgres service.
2. Add Postgres state adapter behind same repository interface.
3. Document migration trade-offs.

## Acceptance criteria

- [ ] MCP tool contracts do not change.
- [ ] SQLite remains default.

---

## V/0/1 — Redis Streams event bus spike

**Stage:** V — Post-MVP  
**Task:** 1 — Redis Streams spike  
**Depends on:** `U/0/3`  
**Branch:** `feature/V-0-1-redis-streams-spike`

## Objectives

Evaluate publishing audit/domain events to Redis Streams for multi-agent realtime consumers.

## Tests

- File: `tests/gateway/redis_streams.test.js`
- Cases:
  - `publishes_event_to_stream`
  - `audit_jsonl_still_written`

## Detailed steps

1. Add Redis service to docker compose.
2. Publish selected events to stream.
3. Keep JSONL audit as source of local inspection.

## Acceptance criteria

- [ ] Event bus is optional.
- [ ] Gateway works without Redis.

---

## V/0/2 — LangGraph orchestrator client spike

**Stage:** V — Post-MVP  
**Task:** 2 — LangGraph client  
**Depends on:** `U/0/3`  
**Branch:** `feature/V-0-2-langgraph-orchestrator-client`

## Objectives

Prove a deterministic orchestrator can act as a Gateway MCP client without Gateway changes.

## Tests

- File: `tests/e2e/langgraph_client_spike.test.js`
- Cases:
  - `langgraph_client_calls_same_gateway_tools`

## Detailed steps

1. Create `orchestrator-langgraph/` only in post-MVP.
2. Implement client using same MCP tool contracts.
3. Run planner→coder→reviewer→tester graph in dry-run.

## Acceptance criteria

- [ ] Gateway contracts remain unchanged.
- [ ] This does not replace LLM-as-orchestrator MVP path.

---

## V/0/3 — Internal MCP servers outline

**Stage:** V — Post-MVP  
**Task:** 3 — Internal MCP servers outline  
**Depends on:** `U/0/3`  
**Branch:** `feature/V-0-3-internal-mcp-outline`

## Objectives

Plan Fase 4 MCP servers without implementing them prematurely.

## Tests

- File: `tests/structure/test_internal_mcp_outline.py`
- Cases:
  - `internal_mcp_outline_exists`

## Detailed steps

1. Create `docs/internal-mcp-servers.md`.
2. Outline:
   - `mcp-jira-read`
   - `mcp-confluence-read`
   - `mcp-git-read-restricted`
   - `mcp-test-runner`
   - `mcp-artifact-store`
3. Define security constraints for each.

## Acceptance criteria

- [ ] No internal server is implemented before MVP closure.
- [ ] Future work is scoped.

---

## Global acceptance for this backlog

- [ ] Every task has a branch name.
- [ ] Every task has dependencies.
- [ ] Every implementation task has tests or a documented manual checklist.
- [ ] No task asks the agent to push remotely.
- [ ] No task requires touching restricted repositories.
- [ ] The backlog preserves the V4 decision: Gateway only; orchestrator is a role.
