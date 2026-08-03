# agents-orchestrator Orchestration Profile

Canonical **resolved** profile for this repository's own plan/build/audit loop. The `ao-*`
orchestration skills and the generic `plan-build-audit-loop` / `*-orchestration` skills read THIS
file as the source of truth for substrate / roles / gate / policy, so they don't re-derive it each
run. On conflict, this file wins over a skill's inline defaults. Keep it current.

> **Volatile — verify live before each run:** the Gateway being up, `AGENTS_POLICIES_DIR`, and any
> session/trace IDs. Everything else is stable standing config.

## Repo

- Path: `/home/aspizc/git/experiments/AO`
- Gateway repo id: `repo:"agents-orchestrator"` (classification **internal**; an absolute
  filesystem path is only a `cwd` and is denied as `repo.unknown`).
- **Dogfooding:** this repo IS the `agents-gateway`. The Gateway that orchestrates this repo's own
  development runs from `gateway/` in this same tree. A Gateway code change never takes effect in
  the running server until the operator restarts it — do not assume live behavior from freshly
  merged code.
- `excludedPaths: ["policies/"]` for this repo → **Codex cannot spawn with `cwd` = repo root**
  (`EXCLUDED_PATH_EXPOSED`; guard in `gateway/src/adapters/codex_adapter.js`). The guard
  resolves the excluded path against the CONFIGURED repo root that contains the cwd — not
  against the cwd itself — and spawn cwds must sit inside `AGENTS_REPO_ROOTS`
  (`gateway/src/services/agent_service.js`). **Canonical spawnable-worktree recipe:**
  `git worktree add workspace/clones/wt-<lane> <base>` (gitignored, inside the repo root →
  inside `AGENTS_REPO_ROOTS`; its nested `policies/` copy is not the configured root's
  `policies/`, so the guard passes) + symlink `gateway/node_modules` from the main tree + an
  orchestrator **diff guard that rejects any `policies/` change** at review/commit time (the V3
  `workspace/clones/v3-work` pattern). Scoped subdir cwds (`gateway/`, `cli/`) also pass but
  cannot write sibling `tests/`. The `/tmp/agents-orchestrator-*` worktrees in
  `git worktree list` are outside `AGENTS_REPO_ROOTS` → not Gateway-spawnable; V5 lanes there
  ran as direct root-created tmux with retroactive Gateway governance (trace + task +
  artifacts).
- Working language: English (all plans, code, reviews, docs; `audit/README.md` index is Spanish).

## Orchestration substrate

- **agents-gateway MCP** (harness-managed; tools appear as `mcp__agents-gateway__*` with
  underscores — `agent_spawn` ≙ canonical `agent.spawn` in docs). Loop tools:
  `orchestration_create` / `task_assign` / `agent_spawn` / `agent_ask` / `agent_view` /
  `agent_kill` / `artifact_put` / `approval_*` / `message_*` / `session_*`, plus the V5
  `coordination_*` plane.
- **SPAWN for long or iterative coder/reviewer work** (persistent supervised tmux; operator can
  `tmux attach` via `session_attach_info`). Reserve `agent_delegate` for short one-shot tasks
  where live observation is not needed. Read-only discovery fan-out may use the built-in Agent
  tool.
- **Hybrid doctrine (Gateway over tmux):** the Gateway does not compete with tmux — it creates
  and governs tmux sessions (role/model/cwd policy validation, session↔task↔trace binding,
  audit, approvals, artifact sanitization). Official plan/implementation/review sessions are
  created VIA the Gateway; humans attach afterwards with `tmux attach`; every manual
  intervention in a session is recorded with `session_intervention_note`. Direct root-created
  tmux is reserved for throwaway diagnostics — or, as a documented exception, for lanes whose
  cwd the Gateway cannot reach (outside `AGENTS_REPO_ROOTS`); those get their trace/task/
  artifacts registered in the Gateway retroactively so the evidence chain stays complete.
- **Verify before use:** the Gateway process is up (`ps aux | grep -i 'gateway\|mcp'`), and
  `AGENTS_POLICIES_DIR` points at this repo's `policies/` (base registries; `policies/profiles/kya`
  and `policies/profiles/mvp2` are alternate profiles — `kya` is for driving the KYA repo, not
  self-work). Check via `/proc/<pid>/environ`. Do **not** start a second Gateway via Bash `&`.
- **Tool-shape:** `orchestration_create` = **flat** `callerAgent`/`callerRole`; `task_assign` =
  **nested** `caller{agent,role}`/`target{role,agent,action}`; `agent_spawn`/`agent_delegate` =
  **flat** `agent`/`role`. Wrong shape → the call rejects.
- **`task_assign` BEFORE `agent_spawn`** — the spawn's `taskId` is a foreign key.
- **Session identity is deterministic per `(trace, agent, role)`** (UNIQUE constraint): you cannot
  respawn the same pair under the same trace. Every re-review round and every respawn needs a
  fresh orchestration trace.
- **`agent_ask` pastes but often does not submit:** verify with `agent_view`; if the prompt sits
  in the editor, `tmux send-keys -t <session> Enter` (sometimes twice), confirm "Working", and
  record a `session_intervention_note`. Never blind-Enter a Codex pane — if a "Retry with a faster
  model" menu is up, option 1 (highlighted) is the model downgrade; send `2` then Enter, and audit
  the pane banner afterwards.
- **`approval_request` from Claude Code MCP:** omit the optional `context` param — it arrives as a
  string and the Gateway rejects it. Auto-grant scopes (`AGENTS_AUTOAPPROVE`, ADR-006) work
  without it for non-restricted repos.
- One orchestration trace per sheet. Distinct coder and reviewer tasks/sessions inside it; reuse
  the coder session only for that sheet's KO→fix trials; parallel sheets use separate traces.
  After the final verdict: persist artifacts, kill sessions, `orchestration_complete`.

## Roles, agents, models (agent ≠ model)

- **Orchestrator:** the human-facing LLM session (Claude Code in current practice). There is no
  standalone orchestrator process (ADR-002).
- **Coder:** agent `codex`, model `gpt-5.6-sol`, reasoningEffort `max`, serviceTier `priority`
  (policy defaults; `gpt-5.6` aliases to `gpt-5.6-sol`).
- **Reviewer:** agent `claude-code`, model `claude-fable-5`, reasoningEffort `max` — cross-vendor
  review is this project's supported pairing (Codex codes, Claude reviews). Owner-approved
  fallback when the Max-plan window is exhausted: `claude-opus-4-8`.
- **Planner:** the planner ROLE is not spawnable (`role.deny_action` — verified live 2026-07-27,
  same as the KYA profile): spawn plan-author helpers as `coder` role with the plan-author
  persona fixed by the brief (plan documents only). The Stage Z loop's planner-role
  `task.assign` remains valid for non-spawn flows.
- **Audit:** `codex` `gpt-5.6-sol` at `ultra` for independent audits (observed V5 practice), or
  `claude-fable-5` at `max`.
- On `POLICY_DENIED`: stop, report the `ruleId`, never silently downgrade model/agent.

## Prompt templates (start briefs from these; keep their Working rules intact)

- `prompts/orchestrator_system_prompt.md`, `prompts/orchestrator_mvp2_two_agent.md`,
  `prompts/orchestrator_planning_loop.md` — orchestrator briefs.
- `prompts/planner_system_prompt.md`, `prompts/planner_apply_coder_prompt.md` — planning loop.
- `prompts/kya_coder_prompt_template.md`, `prompts/kya_reviewer_prompt_template.md` are for
  driving the **KYA repo**, not this one, but their Working-rules section mirrors `AGENTS.md`.
- Runbooks: `docs/mvp2-orchestrator-runbook.md` (two-agent loop),
  `docs/planning-loop-runbook.md` (plan refinement), `docs/operator-guide.md`.

## Quality gate

- **Full gate:** `bash scripts/ci.sh` (wraps `python3 scripts/ci_gate.py`; structure + Gateway +
  E2E + CLI + LangGraph suites; dry-run, no network needed). Plus `agent-run policy validate`
  after any policy-adjacent change and `git diff --check` before review.
- Run the full gate **solo** per tree (turn-taking) and only after the coder settles; batch
  several reviewed-OK merges behind one gate when integrating a wave.
- **Known hazards:** the Codex sandbox hangs the LangGraph suite — run gates on the **host**,
  outside the sandbox. `langgraph` is pinned to `1.2.1` (`1.2.4` hangs
  `test_implement_test_review_push_graph`); do not bump it casually. The Postgres suite is opt-in
  (`AGENTS_PG_INTEGRATION=1` + `docker/docker-compose.yml`) and needs a session with docker
  access. Record exact gate totals (passed/failed/deferred/N-A) in every handoff — a
  DEFERRED-as-pass lane is a finding, not a pass.

## Dependencies

- Python: `uv pip sync requirements.lock`; editable installs for `cli` and
  `orchestrator-langgraph`. Regenerate the lock only with
  `uv pip compile cli/pyproject.toml orchestrator-langgraph/pyproject.toml --all-extras
  --python-version 3.13 --output-file requirements.lock`, in its own commit.
- Node: `npm --prefix gateway install` under the version accepted by `docs/node-runtime.md`.
- The Codex sandbox has **no network** → install deps from the **host**. Keep lockfile churn in
  its own commit, separate from any fix.

## Plan / task format

- Tree: `plan/PROJECT_V<N>/<stage>/<stream>/<nn>.md` (stages `A`–`Z`, `M0`; V5 active). Registries
  per project: `EPICS.md`, `SHEETS.md`, stage `README.md`s, plus `COVERAGE_MATRIX.md` and
  `V4_ABSORPTION.md` where they exist. A new sheet is not real until it is linked from `SHEETS.md`
  and its stage README and its dependencies are wired both ways.
- Sheet template (see `plan/PROJECT_V5/F/0/00.md`): header table (Status · Functional priority ·
  Depends on · absorbed_from · Review id) · Problem · Scope · Non-scope · **TDD RED** ·
  **TDD GREEN** · Acceptance criteria (checkboxes, verifiable) · Verification (exact commands,
  ending in `bash scripts/ci.sh` + `git diff --check`).
- Review id `<stage>_<stream>_<nn>` (e.g. `C/0/01` → `C_0_1`). Review trail (committed, in
  `plan/PROJECT_V<N>/reviews/`):
  - implementation: `<id>-<trial>_to_review.md` → `<id>-<trial>_reviewed_OK.md` or
    `_reviewed_KO.md`;
  - plan reviews: `<id>-plan-<trial>_to_review.md` → verdict;
  - thematic/wave reviews: `<TOPIC>-<trial>_to_review.md` → `<TOPIC>-<trial>_review.md`
    (e.g. `FUNCTIONAL_WAVE_2`, `INTEGRATION_V4_V5`, `ROADMAP_BI`);
  - human gate: `<id>_to_check_by_human.md` — never answered by an agent.
  Never overwrite a trial's files; index every verdict in `reviews/README.md`; **15 KO trials →
  stop and page the human**.
- Branch: `feat/V5-<stage>-<stream>-<nn>-<slug>` (V5 era; V4 used `feature/V4-...`); wave
  integration branches `integration/V5-functional-wave-<n>`.
- Commit: `<type>(<scope>): <imperative summary> (V5 <stage>/<stream>/<nn> [Trial N])`; review
  commits `docs(review): request ...` / `review(v5): approve|reject ...`; integration merges
  `merge: integrate reviewed V5 <...>`.
- **Canonical status rule (2026-07-26 audit):** `planned` / `implemented` / `reviewed` /
  `integrated` / `promoted` / `released` are separate states; an OK review implies nothing later.
  Supported/release claims must name one candidate SHA, reproduce its gates and skip budget, and
  prove `main` and the tag resolve to that object.

## Commit / release / git safety

- Commit **only reviewed-OK** work, with an **EXPLICIT pathspec**:
  `git add <files> && git commit -F - -- <files>`; verify `git diff --cached --name-only` first.
- **NEVER** `git add -A` / `reset --hard` / `checkout -- .` / `stash` / **push**. Tags are local
  annotated, never pushed. `git branch --show-current` before EVERY commit — a parallel process
  can switch the main tree's branch under you; prefer a dedicated worktree for orchestrator-owned
  commits.
- Per OK verdict: CHANGELOG entry when the sheet's DoD requires it + review files committed +
  `reviews/README.md` index + scoped commit + `orchestration_complete` + kill sessions.
- Integrate serially with `--no-ff`; after a verdict merge, check
  `git diff --stat <merge>^1 <merge>` — a CHANGES/KO verdict merges its evidence documents only,
  never unapproved candidate code.
- Do not stage the operator's files (e.g. a locally modified `README.md`, untracked `audit/`
  content) — they belong to the user unless the task says otherwise.

## Audit cadence

- Full audits run **at version/plan boundaries or on demand**, never per sheet (the per-sheet
  reviewer is the cheap inner gate). Save under `audit/<YYYY-MM-DD>[-<scope>]/` with numbered
  per-lens files + `README.md` (see `audit/2026-07-26-project-wide/`), and index the new audit in
  `audit/README.md`. Verify every Critical/High firsthand; finish with a remediation-coverage
  pass against `plan/PROJECT_V<N>` that feeds the next plan round.
