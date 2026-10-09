---
name: ao-build-orchestration
description: Implement and review agents-orchestrator plan sheets through the repo's own agents-gateway using a SPAWN-based coder/reviewer loop (persistent tmux sessions via agent_spawn + agent_ask + agent_view), never one-shot delegate for iterative work. Codex (gpt-6.1-sol, medium, priority) codes test-first; a distinct Claude (claude-opus-5-5, max) session reviews; verdicts land as a committed review trail with up to 15 trials per sheet; the orchestrator gates with bash scripts/ci.sh and commits only reviewed-OK work with explicit pathspecs. Trigger when the user asks to implement/build/code a plan sheet or wave, run the implementation loop, "implementar la hoja/tarea/slice", "que el coder haga X", or review a coder's sheet. Do NOT use to write/refine plans (use ao-plan-orchestration) or run audits (use ao-audit-orchestration).
---

# agents-orchestrator Build Orchestration (spawn-based coder/reviewer loop)

You are the **orchestrator** (the human-facing session). You implement plan sheets by driving two
builder agents through this repo's own Gateway, **one sheet at a time**: a **Codex coder** writes
the change test-first and a **Claude reviewer** independently verifies it. The review trail is
committed as the evidence chain develops; integrate only after a clean review. Never write the
production code yourself — orchestrate, gate, and commit.

**Read `.claude/orchestration-profile.md` first** — substrate, models, tool shapes, plan format,
and git safety all resolve there. `AGENTS.md` is the working-rules contract for every brief.

## Golden rule: SPAWN, never DELEGATE (for build+review)

`agent_spawn` (persistent tmux, driven by `agent_ask`, observed by `agent_view`) — not
`agent_delegate` — because: (1) **context survives the KO→fix loop** — on a KO you re-ask the
*same coder session* to fix only the reviewed points; (2) **mid-course correction** — `agent_view`
lets you steer scope drift instead of waiting for one big result; (3) delegate results can be
huge and Codex frequently exits `-1` even after fully applying edits. Reserve `agent_delegate`
for short one-shots. `agent_spawn` takes **no `prompt`** — spawn, then ask. **Do not impose wall-
clock deadlines**: a transport timeout is not evidence the agent stopped.

## Preconditions (verify before every sheet)

1. Gateway up with this repo's base `policies/`; **a Gateway code change does not affect the
   running server until the operator restarts it**.
2. The sheet exists and is executable — a detailed sheet with TDD RED/GREEN, not a bare epic. If
   only an epic exists, **stop and refine first** via `ao-plan-orchestration`; no coder is ever
   pointed at a bare epic.
3. Read the review trail for the sheet id: latest trial OK → next sheet; latest KO → this loop
   continues at trial N+1; `to_review` without verdict → run the reviewer, not a new coder.
4. No other coder is live on overlapping paths; the target worktree/clone is clean. **Codex cwd
   must not expose `policies/`** (`EXCLUDED_PATH_EXPOSED`) and must sit inside
   `AGENTS_REPO_ROOTS`: the canonical spawnable worktree is
   `git worktree add workspace/clones/wt-<lane> <base>` (gitignored, guard-passing — see the
   profile's recipe) plus the orchestrator's diff guard rejecting any `policies/` change.
   Create sessions via the Gateway (it validates role/model/cwd and binds session↔task↔trace
   with audit); `tmux attach` for human inspection; record manual touches with
   `session_intervention_note`; direct root-created tmux only for throwaway diagnostics or
   Gateway-unreachable cwds, with retroactive trace/task registration.

## The loop (one sheet, review id `<stage>_<stream>_<nn>`)

```
orchestration_create({callerAgent, callerRole:"orchestrator", goal, prefix})            → traceId
task_assign({traceId, caller:{...,"orchestrator"}, target:{agent:"codex", role:"coder",
             action:"implement"}, repo:"agents-orchestrator"})                          → taskId
agent_spawn({agent:"codex", role:"coder", model:"gpt-6.1-sol", reasoningEffort:"medium",
             serviceTier:"priority", repo:"agents-orchestrator", cwd:<scoped>,
             traceId, taskId})                                                          → coderSession
agent_ask({sessionId:coderSession, prompt:<coder brief>, traceId})
agent_view({sessionId:coderSession, traceId})       # classify the pane; steer if drifting
# coder settles → orchestrator gates → artifact_put raw_diff / implementation_notes
task_assign({... target:{agent:"claude-code", role:"reviewer", action:"code.read"}})    → reviewerTaskId
agent_spawn({agent:"claude-code", role:"reviewer", model:"claude-opus-5-5",
             reasoningEffort:"max", repo:"agents-orchestrator", cwd:<same tree>,
             traceId, taskId:reviewerTaskId})                                           → reviewerSession
agent_ask({sessionId:reviewerSession, prompt:<reviewer brief + handoff path>, traceId})
# verdict file lands → artifact_put review_notes → resolve (below)
```

- **Coder brief:** the one sheet's deliverables + TDD RED (failing tests first, named in the
  handoff) + acceptance criteria + non-scope + allowed files + the expected
  `<id>-<trial>_to_review.md` path. Keep `AGENTS.md` working rules in the brief. **Explicitly
  forbid internal self-review sub-agents** — a coder-owned verdict is void, renamed
  `*_selfreview_VOID.md`, and excluded from evidence.
- **Reviewer brief:** validate against the sheet spec + stage README + `AGENTS.md` invariants:
  TDD actually done and the test *fails when the logic breaks*; acceptance criteria met; scope
  not exceeded; English; stderr logging; no `policies/` edits; commit on the right
  `feat/V<N>-<stage>-<stream>-<nn>-<slug>` branch referencing the id. Verdict →
  `<id>-<trial>_reviewed_OK.md` or `_reviewed_KO.md` with numbered, actionable corrections
  (each KO fixable from the file alone — trials are budget, 15 max). Human-gated questions go to
  `<id>_to_check_by_human.md`, never decided by the reviewer.
- **Session identity is deterministic per `(trace, agent, role)`:** reuse the same coder session
  for that sheet's KO→fix trials; every **re-review needs a fresh trace + reviewer session**
  (`r2-<sheet>`, `r3-<sheet>` prefixes). Never reuse a reviewer across sheets.

### Resolve

- **Every verdict:** verify the file on disk matches this trace/trial and the real `git diff`
  (**verify the artifact, not the notification** — completion notices can be stale; never trust
  Codex `exitCode -1`, check `git status`). Commit request+verdict with review commits
  (`docs(review): request ...`, `review(v<n>): approve|reject ...`), index in
  `reviews/README.md`, `artifact_put` the review notes, then kill the finished reviewer.
- **KO:** keep the coder session; ask it to fix **only the reviewed points**; next trial files,
  never overwrite a prior trial. After 15 KO trials, stop and page the human.
- **OK:** integrate serially with `--no-ff` (`merge: integrate reviewed V<N> <...>`), add the
  CHANGELOG line when the sheet's DoD requires it, kill the coder, `orchestration_complete`.
  Check `git diff --stat <merge>^1 <merge>` — a non-OK verdict merges evidence docs only, never
  candidate code. **Integrated ≠ promoted ≠ released** (canonical status rule).

## Gate discipline (focused first; the full gate is the seal)

1. The new/changed tests first, then the impacted suite (`npm --prefix gateway test`, targeted
   `pytest`), then any coupled structure/contract check.
2. **One full `bash scripts/ci.sh`** after the focused set is green; record exact totals
   (passed/failed/deferred) in the handoff. Run it **solo per tree** (turn-taking) and **on the
   host, never inside the Codex sandbox** (the sandbox hangs the LangGraph suite). `langgraph`
   stays pinned to 1.2.5 for the SDK 0.4.4 security fix; the isolated upgrade
   check passed 81 tests with 3 integration skips (see `docs/ci-contract.md`).
   Docs-only changes need the relevant doc/structure check +
   `git diff --check`, not the full gate.
3. A DEFERRED-as-pass lane or an unexplained failure is a finding to attribute, not noise;
   never retry to green without attributing the first failure.

## Liveness & unblock protocol (classify the pane every tick, and after each spawn/ask)

1. **Idle with an unsent prompt** → submit it (`tmux send-keys -t <session> Enter`, sometimes
   twice; verify "Working"; record `session_intervention_note`).
2. **Blocked on a confirmation** → inspect the exact command; approve only minimal, scoped,
   reversible actions; **never approve** deletes under `plan/**`, `rm -rf`, `git add -A`,
   `reset --hard`, `checkout HEAD --`, `stash`, `push`. Escape and redirect.
3. **Connector/MCP warning** → noise; don't act.
4. **Genuinely working** → leave it; don't interrupt real progress.
5. **Dead session** (pane gone, `agent_view` unresponsive) → respawn under a **fresh trace** and
   resume from the last persisted handoff.
6. **Provider quota/rate-limit pause** → park, preserve trace/task/session ids and handoff
   pointer, resume the same session later; never substitute orchestrator self-approval for the
   independent review.
7. **Codex "Retry with a faster model" menu** → **do nothing**. The pane states it plainly: "No
   action is required. Codex will keep waiting, and this menu will close when the response is
   ready." It is a non-blocking notice while the provider takes longer, *not* a prompt. Option 1
   is highlighted and Enter selects it, so **any** keystroke you send risks a silent downgrade —
   typing `2` does not move the selection, it goes to the composer, and the following Enter takes
   option 1. Leave the pane alone and audit the banner (`gpt-6.1-sol max`) after every dispatch;
   a banner reading `gpt-5.6-luna low` means a downgrade already happened.
8. **Codex content-filter turn abort** (`cyber_policy`) → the *turn* died, not the session:
   **resume with a short nudge, never respawn** (context and findings are intact). For work that
   keeps tripping it, split the review into narrow passes in fresh sessions, each committing a
   partial note, then a final pass that writes the verdict from the notes.

For long autonomous runs, schedule an idempotent **watchdog** (cron ~10 min, off-`:00`): recall
the in-flight sheet, read state from the filesystem (`_to_review`/`_reviewed_*` files, gate log),
classify the panes, resume or do nothing duplicative.

## Parallelism (overlap work, don't idle-wait — and don't entangle lanes)

- **Pipeline:** while a sheet is in review, start the next **independent, file-disjoint** sheet's
  coder in its own worktree/clone and fresh trace. Never parallelize a dependency chain or a
  critical-path sheet; when unsure, stay sequential.
- **Commits and merges are serial** (shared `.git`). Shared files every sheet touches
  (`CHANGELOG.md`, `scripts/ci_gate.py`, registries) are **orchestrator-owned at commit time** —
  tell each coder not to touch them.
- **Batch integration:** merge several reviewed-OK branches serially, then run ONE full gate for
  the batch; wave-level closure gets an `integration/V<N>-functional-wave-<n>` branch and a
  thematic `FUNCTIONAL_WAVE_<n>-<trial>` review before it is declared integrated.
- Prune worktrees/clones as sheets close (`git worktree prune`; removing a worktree never deletes
  its branch). Sweep stale `/tmp` scratch dirs — starved agents look "mysteriously dead"; check
  disk/tmpfs before inventing an explanation.

## Review-quality patterns (hard-won; put them in the briefs)

- **The three recurring defect classes** — demand the audits from the producer, have the reviewer
  redo them adversarially: (1) **declared, not observed** — a value reported from input/spec
  instead of from what was actually written or observed; (2) **authenticated, then written
  unbound** — nothing re-binds the written bytes to the authenticated values; (3) **recorded as
  done without having run** — require execution evidence a substituted command cannot fake (real
  spawn, real exit status, a witness that differs before/after).
- **Unbound-conjunct audit:** "for every predicate conjunct you touched: if I deleted it, would
  any test turn red?" Where no — add the distinguishing fixture or state why not.
- **Fixtures differ at the boundary, minimally:** one nibble, one character's case, one element
  past the limit — a gross difference proves nothing about the predicate under test.
- **Design-first after two KOs on the same class:** stop implementing; commit a design document,
  review it independently and harder than code; its OK authorizes implementation only.
- **Restrict beats analyse** when a checker keeps losing to new constructs — refuse what cannot
  be decided, as a **hard failure** (if the design sentence says "skip/warn/allow/exempt", it is
  wrong; it must say REJECT), and hunt every path by which undecidable input could still pass.
- **A partial verdict with declared coverage beats a complete one that never lands:** a
  repeatedly-cut reviewer writes the verdict NOW, stating what it measured, what it did not, and
  its disposition on the evidence it has.
- **Briefs point to the on-disk verdict** ("read `<id>-<n>_reviewed_KO.md`; it is your
  contract") instead of restating it — orchestrator context is the scarce resource.

## Safety & gotchas

- **Never push. Never `git add -A`.** Explicit pathspec commits only;
  `git branch --show-current` before every commit (a parallel process can switch the main tree's
  branch). Don't stage the operator's files (modified `README.md`, untracked `audit/` content).
- Stay in one lane: only the current sheet's files. `_to_check_by_human.md` for human-gated
  questions; blocked sheets route back to `ao-plan-orchestration` — the coder never invents.
- Tool shapes: `orchestration_create` flat; `task_assign` nested; `agent_spawn` flat.
  `task_assign` before `agent_spawn` (FK). `approval_request` from Claude Code: omit `context`.
- Codex sandbox has no network → host installs; lockfile churn in its own commit.
- Version closure: all sheets reviewed-OK + integrated + gate green → local annotated tag only;
  promotion/release claims follow the canonical status rule. Hand next-version planning to
  `ao-plan-orchestration`.
