# Independent Review — Project V5 D/0/00 Trial 3

## Verdict

**KO** for technical candidate
`cc12282141348d9f21d55eea82fa393c94f03dda`.

The candidate closes the four concrete Trial 2 reproductions at the public MCP
boundary, but the new server-owned execution binding is replayable with a
different agent, role, repository, trace, task, and canonical working
directory at the service/adapter boundary. Four independent calls using real
dry-run adapters reached `SESSION_STARTED`.

This violates D/0/00's cross-context and pre-side-effect requirements and the
Trial 3 request's explicit claim that an effective binding cannot be reused
with another target tuple. The result does not amend implementation or plan
files, refresh the integrator-owned CI manifest, integrate the candidate, or
mark the sheet complete.

## Reviewer profile

- Model: **GPT-5.6 Sol**
- Reasoning effort: **ultra**
- Service tier: **Priority/Fast**

The review was requested and performed under that declared profile. The local
worktree does not expose independent service-tier telemetry, so this report
does not claim a separate runtime attestation of the tier.

Review date: 2026-07-26.

## Reviewed identity and scope

- Branch: `feat/V5-D-0-00-request-context-trial2`
- Frozen Wave 2 base:
  `54ae76a74209687479e4902c816b6bdb4b2e6690`
- Trial 2 KO result:
  `d8ce59f7f0dfd9010702944d1d5af1c2d15d461e`
- Trial 3 technical commit:
  `cc12282141348d9f21d55eea82fa393c94f03dda`
- Trial 3 technical tree:
  `8837bf8e9cd9959b6bf4b1cc99d7e15b93f23e3e`
- Trial 3 request-only commit:
  `e329c8e1383a872591c66962d0eef7a98663358c`
- Trial 3 request-only tree:
  `cc41d0046805622bad12ada183ffcc3b37e0558a`

The technical commit is the direct child of the Trial 2 KO result. The
request-only commit is the direct child of the technical commit and adds only
`plan/reviews/PROJECT_V5/D_0_0-3_to_review.md`. The worktree was clean before
this result was written.

## Blocking finding

### P0 — A valid execution binding can authorize a different launch tuple

The effective binding is protected by a `WeakSet`, but the service validates
only that the object is server-owned and that its control action matches:

- `gateway/src/services/agent_service.js:43-61` does not compare the service
  arguments with the binding's agent, role, repository, trace, task, or cwd.
- `gateway/src/services/agent_service.js:63-87` authorizes the actor and target
  represented by the binding, then resolves that target's model profile.
- `gateway/src/services/agent_service.js:203-217` and `255-265` select and call
  the adapter using the separately supplied service arguments.
- `gateway/src/core/request_context.js:265-277` can compare action, agent, role,
  and repository, but has no trace, task, or cwd comparison.
- `gateway/src/adapters/gemini_adapter.js:103-114` and `155-165` treat a
  mismatched non-null binding like a legacy call and fall back to ordinary
  policy instead of denying it. Claude and Codex use the same fallback at
  `gateway/src/adapters/claude_adapter.js:147-165,228-246` and
  `gateway/src/adapters/codex_adapter.js:189-209,295-315`.

An independent probe created bindings with
`bindRequestContext()`, passed them through `createAgentService()`, and used the
real `GeminiAdapter`/`CodexAdapter` in `dryRun`. The actor in every binding was
`claude-code/orchestrator`.

| Probe | Binding target and lineage | Invocation | Observed result |
|---|---|---|---|
| Agent replay | `codex/coder`, task action `code.write`, `sample-apps`, owned trace/task/cwd | `gemini-cli/coder`, same repo and cwd, task omitted | Launch returned `review-trace-task-agent-gemini-coder`; `SESSION_STARTED` |
| Role replay | `gemini-cli/planner`, task action `code.read`, `sample-apps`, owned trace/task/cwd | `gemini-cli/coder`, same repo and cwd, task omitted | Launch returned `review-trace-task-role-gemini-coder`; `SESSION_STARTED` |
| Repository replay | `gemini-cli/coder`, task action `code.write`, `sample-apps`, owned trace/task/cwd | `gemini-cli/coder`, `developer-tools` and its cwd, task omitted | Launch returned `review-trace-task-repo-gemini-coder`; `SESSION_STARTED` |
| Lineage/cwd replay | Same binding as the repository probe | Exact agent/role/repo text, but unowned trace, omitted task, and `developer-tools` cwd | Launch returned `review-trace-unowned-gemini-coder`; `SESSION_STARTED` |
| Object forgery control | Shallow clone of the valid binding | Otherwise matching spawn | `REQUEST_CONTEXT_DENIED`; no launch |
| Action replay control | Valid `agent.spawn` binding | `agent.delegate` | `REQUEST_CONTEXT_DENIED`; no delegate |

The four successful mutations emitted four `SESSION_STARTED` events. The
clone and action controls prove that the `WeakSet` provenance and top-level
action check work; the defect is the incomplete tuple check and fail-open
adapter fallback.

The current MCP wrapper overwrites public launch arguments with its effective
binding before calling the service. That protects today's exact wrapper path,
but it does not make the binding a safe internal authority capability. Any
retention, routing, or future internal handoff bug can broaden a valid binding
before the adapter side effect, precisely where this trial claims a second
server-owned enforcement boundary.

#### Required correction for Trial 4

1. Before `adapters.get()`, session creation, model audit, or adapter
   invocation, require a supplied binding to match the complete effective
   launch tuple: control action, target agent and role, canonical repository,
   trace, task, and canonical cwd.
2. If a non-null binding is invalid or mismatched, return
   `REQUEST_CONTEXT_DENIED`. Adapter code must not reinterpret it as a legacy
   no-binding call or fall back to policy evaluation for the mutated tuple.
   Legacy direct calls may retain their current policy path only when no
   binding was supplied.
3. Apply the same invariant to both `spawn` and `delegate` and to Claude,
   Codex, and Gemini. Keep the exact actor/assigned-target policy checks and
   model resolution that this trial introduced.
4. Add a service-to-real-adapter or instrumented-adapter regression matrix for
   agent, role, repository, trace, task, cwd, action, and cloned-object
   mutation. Every mutation must deny before adapter invocation, session row,
   `SESSION_STARTED`, or provider/tmux process. Retain positive
   orchestrator-to-assigned-planner coverage and planner-child denial.

## Trial 2 blockers rechecked

The new blocker does not erase the corrections that were independently
confirmed:

1. **Approval authority:** zero-task and mismatched-task `code.apply`
   requests denied with no approval row; an omitted task on one restricted
   lineage remained pending with no auto-grant; an ambiguous multi-repository
   trace denied without adding a row.
2. **Actor/target separation on the exact MCP path:** the committed boundary
   regression launches an assigned planner from an orchestrator and denies
   planner child assignment/spawn before their persistence/adapter effects.
   The replay finding above shows this correction is not yet complete at the
   secondary service/adapter boundary.
3. **Sanitizer lineage:** independent cross-connection, same-connection
   cross-trace, and same-trace cross-repository attempts all returned
   `REQUEST_CONTEXT_DENIED`; the probe observed zero derived rows and no
   denied-call row, file, or artifact-domain audit side effect.
4. **Protected namespaces and catalog skew:** independent synthetic tools
   under `orchestration.*`, `task.*`, `agent.*`, `artifact.*`,
   `approval.*`, and `session.*` all denied with zero handler side effects.
   A known tool with a skewed catalog version also denied before its handler.

Schema-invalid input still projects `INVALID_INPUT`, while valid authority or
lineage violations project the catalogued `REQUEST_CONTEXT_DENIED` envelope.
Private reason codes and capabilities were not observed in public results or
audit payloads.

## Verification

| Check | Result |
|---|---|
| Focused context/policy/catalog/autoapproval group | `57 passed`, `0 failed`, `0 skipped` |
| Full Gateway command | `772 tests`; `753 passed`, `19 expected service-gated skips`, `0 failed` |
| Full E2E command including real opt-in case | `25 tests`; `24 passed`, `1 real-agent opt-in skip`, `0 failed` |
| Gateway lint | passed |
| Authoritative `bash scripts/ci.sh` | stopped before suites: two stale integrator-owned inventory hashes |
| Ephemeral complete CI inventory | `1195 tests`; `1181 passed`, `12 declared skips`, `2 manifest-only failures` |
| Ephemeral `test.gateway` suite | `762 tests`; `753 passed`, `9 declared Postgres skips`, `0 failed` |
| Ephemeral `test.e2e` suite | `24 passed`, `0 failed` |
| Ephemeral CLI suite | `29 passed`, `0 failed` |
| Ephemeral LangGraph suite | `81 passed`, `3 declared integration skips`, `0 failed` |
| MCP smoke, policy registry, Python lock/lint | passed |
| Independent protected-namespace matrix | six unknown namespaces plus catalog skew denied; `0` handler side effects |
| Independent binding-replay matrix | four unauthorized launches and `4` `SESSION_STARTED` events; blocker reproduced |
| `git diff --check` | passed |
| Redacted gitleaks technical-range scan | one commit scanned; no leaks found |

The authoritative manifest errors are:

```text
lint.gateway: stale inventorySha256; expected sha256:1bbfb5548172016f297a3e6ecde1f8bd2bc5c4cce5a7d3b9d78b805c0500ab62
test.gateway: stale inventorySha256; expected sha256:dd7b524e971e20e7d20d34481e4bf98ead12f54a6706d99316a4787fc33688ea
```

The ephemeral CI run's only failures were `release.candidate` and the one
structure assertion that intentionally revalidate those same authoritative
hashes. The temporary manifest and directory were removed after the run.

All commands left `AGENTS_REDIS_URL`, `AGENTS_COORDINATION_REDIS_URL`,
`AGENTS_TEST_REDIS_URL`, and `AGENTS_PROFILE` unset. No shared Redis, MCP, KYA,
tmux, or provider service was contacted, changed, restarted, flushed, or
stopped.

## Range invariants

- `gateway/src/tools/message.js` is byte-identical between the Trial 2 KO and
  Trial 3 technical commits.
- `gateway/src/tools/coordination.js` is byte-identical across the same range.
- The technical delta contains no `agents:events` change, policy edit, schema
  migration, durable/global replay mechanism, shared CI/workflow edit, sheet
  or README edit, or service configuration change.
- No credentials, tokens, or unredacted secret findings were recorded.

---

## Independent verdict — Trial 3

**KO.** Trial 4 must make any supplied server-owned execution binding
fail-closed against the complete launch tuple before the adapter boundary.
