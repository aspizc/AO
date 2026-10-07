# V7 generic execution — Plan Trial 1 reviewed KO

Verdict: **KO — three bounded execution-contract corrections are required before build.**
This is an independent plan verdict, not implementation, integration, promotion,
or release evidence.

| Binding | Exact value |
|---|---|
| Candidate tree | `93dad2d0d900675d972a87039f75c1dfa16f3d2e` |
| Candidate base | `186ce1d03e824fe526a61927812aa2593a81b28e` |
| Request blob | `85e6c1ab25edac08cf1449d816acb9eb4a172830` |
| Review trace | `tr-v7-plan-r1-8b6686cb-9d18-411d-81a9-8c1d8923f034` |
| Reviewer | Separately assigned built in session `/root/review_v7_plan`, under the operator's no-Claude exception |
| Date | 2026-10-07 |
| Scope | The 14 paths in `/tmp/ao-v7-plan-candidate.json`: 12 V7 documents, `plan/README.md`, and V6 `GENERIC_WORKFLOWS.md` |

The root assigned this reviewer independently of the plan author. This review
used `AGENTS.md`, `.claude/orchestration-profile.md`, and
`.codex/skills/ao-plan-orchestration/SKILL.md`. No author or coder-owned verdict
was used. Root owns indexing and committing this immutable verdict.

## Required corrections

### R1 — Earlier-wave dependencies have no executable input contract

Priority: **High**. Owner: **V7 A/0/02**, with matching input validation in
**A/0/00**, persistence in **A/0/03**, and a distinguishing case in **A/0/04**.

`plan/PROJECT_V7/A/0/00.md:33` permits a dependency in an earlier wave and gives
every task exactly one wave. `plan/PROJECT_V7/A/0/02.md:20` runs one selected
wave, while `:39` requires every dependency to be `externally_accepted`.
Neither the run input nor the control variants define how a task outside the
selected wave obtains that state. Controls must match the current
run/task/attempt and cannot create a task. The checkpoint is also specific to
one run and wave.

For a valid profile containing `wave-1: task-a` and `wave-2: task-b`, where
`task-b` depends on `task-a`, a second invocation selecting `wave-2` cannot
establish readiness as written. Implementers would have to invent prior-run
lookup, silently accept dependencies, or rerun work outside the selected wave.
The current external cases can use only dependencies within one wave and miss
this defect.

Freeze one bounded way to supply earlier-wave acceptance facts through the
already-authorized controller. Specify its input/DTO, matching
project/profile/task/wave identities, missing or contradictory evidence outcome,
and whether it represents historical local acceptance. Persist the chosen facts
for resume. They must not confer Gateway/review authority, prove candidate
freshness, or close V5 gates. Dispatch only the selected wave; do not replay
prior tasks to manufacture readiness.

Add focused and external tests that run two waves in order, observe only the
second wave's new effects, reject absent/mismatched prior acceptance before
spawning its dependent, and keep a failed prior task's dependent blocked.
Keep this within the existing five leaves.

### R2 — The declared wave concurrency ceiling is absent from dispatch

Priority: **Medium**. Owner: **V7 A/0/02**; acceptance observation in **A/0/04**.

`plan/PROJECT_V7/A/0/00.md:33` freezes `maxConcurrentTasks` at 1–32.
`plan/PROJECT_V7/A/0/02.md:39` lists dependencies, shared capacity and conflicts
as the admission predicate, but never applies this separate wave limit or
specifies which task phases occupy it. The named RED cases likewise do not
isolate a wave limit from a larger shared budget.

With two independent tasks, `maxConcurrentTasks=1`, and a shared budget admitting
two sessions, the documented predicate permits both tasks. The global capacity
vector cannot substitute for a per-wave concurrency ceiling.

Add the wave limit to the deterministic admission predicate. Define which
admitted phases retain the logical slot across coding, awaiting handoff, checks,
review and cleanup, and when confirmed terminal cleanup releases it. Waiting
must not start another attempt or consume a trial. Specify the treatment of
recovery-required tasks so uncertain active work cannot disappear from the
ceiling.

Add a test with independent tasks and ample global/provider/memory capacity
that observes only one admitted task at a limit of one, including while waiting
for control, and advances after confirmed retirement. Observe emitted dispatch
in the external suite as well as focused SDK tests.

### R3 — Successful review retirement is not specified

Priority: **High**. Owner: **V7 A/0/02**, with the existing **A/0/03** durability
hooks and **A/0/04** capacity-one acceptance case.

`plan/PROJECT_V7/A/0/02.md:63` explicitly closes the coder before releasing its
slots. `:104` closes a reviewer for `changes_requested`, and `:127` covers
cancellation/error. There is no corresponding retirement transition for an
`accepted` review, and the normal-success Gateway reservation release is not
specified. A/0/01 requires confirmed close before releasing a reservation and
never frees an active effect by age or process disappearance.

The external topology at `plan/PROJECT_V7/A/0/04.md:42` permits only one session
and provider slot. If the first accepted reviewer stays active until wave
completion, the next task cannot reserve its coder slot and the wave cannot
reach completion. Releasing the slot from the receipt alone would violate the
capacity contract. The plan currently leaves that necessary choice to the
implementer.

Freeze the normal-success order: consume matching review input, close the exact
owned reviewer through the public tool, validate confirmation, release its
complete count/provider/memory reservation, then advance the terminal task and
eligible dependents. Define the corresponding cleanup for `blocked` control.
Uncertain close retains the reservation and produces `recovery_required`;
acceptance input is not proof of retirement. At successful wave exit, close the
owned SDK client before releasing the owned Gateway reservation; leave a
borrowed client/reservation with its owner. Specify how a failed successful-exit
cleanup affects the final status rather than returning success with an
unreported hold.

Add a distinguishing test completing at least two tasks with
`agentSessions=providerSessions=1`, asserting each accepted reviewer is closed
before the next coder spawn. Include cleanup failure/response loss, retained
memory, and normal owned-versus-borrowed Gateway retirement. Reuse A/0/03's
intent/confirmation ordering; no extra recovery engine is needed.

## Properties accepted by this review

- The five-leaf DAG is acyclic and both foundations are explicit prerequisites
  of dispatch. Registry, stage, epic and project links resolve. Shared CLI and
  manifest ownership is assigned to serial root integration.
- V6 A/0/04 and A/0/05 are explicit unbuilt prerequisites; restart acceptance
  cannot close through a stub or deferral. The deferred live Claude lane is
  recorded, rather than counted as V7 synthetic proof.
- The profile delegates effective model selection to the existing canonical
  resolver. Preflight is scoped to validation and avoids provider/Gateway/check
  launch and policy mutation.
- The capacity design uses one durable locked vector across actual processes,
  including declared memory and immutable host headroom. It describes estimates,
  trusted local cooperation, record bounds, uncertain effects, and stronger V5
  enforcement limits explicitly.
- The authorized parent may automate control after separately assigned reviewer
  evidence; no additional per-task human confirmation is imposed. Configured
  human gates and the evidence-versus-authority boundary remain binding.
- Checkpoint intent/confirmation ordering, explicit reattachment, safe outputs,
  and external synthetic provenance are suitable bounded concerns for the
  existing leaves. These corrections do not require a V5 control-plane expansion.
- V6 remains seven release sheets; this candidate changes only its generic
  requirement cross-link and historical-decision reference. V5 authority,
  independent-review authentication, completion, containment and release gaps
  remain open. No later product state is claimed.

## Verification performed

Reviewed the complete candidate through `git show` using the exact tree above.
The base-to-tree diff contains exactly the 14 manifest paths; every corresponding
on-disk byte sequence matched its tree blob at review. Checked 52 relative
Markdown links in those paths: **0 missing**. Verified each load-bearing
README code anchor against the candidate, including the SDK client, canonical
selection resolver/projection, Doctor inputs, decoded error helper, orchestration
service, KYA per-request process path and external MCP harness. Read the V6
prompt and reattachment prerequisite sheets and current SDK/session cleanup
implementations.

`git diff --check 186ce1d03e824fe526a61927812aa2593a81b28e 93dad2d0d900675d972a87039f75c1dfa16f3d2e`:
**PASS (exit 0)**.

Implementation tests, real providers, synthetic execution and `bash scripts/ci.sh`
were **not run** for this plan-only review. No runtime gates are claimed passed,
skipped or deferred by this verdict. No implementation, policy change, staging,
commit, tag or push was performed.

## Next trial

Apply R1–R3 to their owning sheets and keep the five-sheet/V6/V5 boundaries.
Create the Trial 2 request with its settled exact candidate tree. Re-review in a
fresh independent session and trace. Preserve this Trial 1 request and verdict;
root indexes the verdict in `reviews/README.md`. KO authorizes no implementation
acceptance or integration of the rejected candidate.
