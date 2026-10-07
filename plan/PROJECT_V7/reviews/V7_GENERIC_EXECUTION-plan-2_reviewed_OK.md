# V7 generic execution — Plan Trial 2 reviewed OK

Verdict: **OK — the bounded R1–R3 plan corrections are accepted.** No further
plan correction is required in this trial. This verdict accepts the specified
plan candidate; it does not verify runtime behavior, accept implementation,
integrate a candidate, close an unmet prerequisite, promote, or release V7.

| Binding | Exact value |
|---|---|
| Candidate tree | `0b29a18a0588f36a5b6f990f5d22be73c8740fe7` |
| Candidate base | `327043a50316f3918b06fe30e019ecdc5799b4d3` |
| Request blob | `954ac37515130bd04026da10db14b0bf2c29971f` |
| Review trace | `tr-r2-v7-plan-9085070c-1b3e-490c-ac25-7b13118bc419` |
| Reviewer | Separately root-assigned built in Codex session `/root/review_v7_plan_r2` |
| Date | 2026-10-07 |
| Scope | The exact 16 paths enumerated in `V7_GENERIC_EXECUTION-plan-2_to_review.md:49–65`, bound by `/tmp/ao-v7-plan-r2-candidate.json` |

Root assigned this reviewer independently of the plan author under the
operator-authorized built in Codex fallback and no-Claude restriction. Root
reported Gateway `task.assign` unavailable with `REQUEST_CONTEXT_DENIED`; this
reviewer did not retry assignment, spawn a provider session, or treat the
fallback as a change to the canonical profile. The fresh trace matches the
Trial 2 request. No author-owned review evidence is used. Root owns verdict
indexing, artifact persistence and commits.

Read `AGENTS.md`, `.claude/orchestration-profile.md`,
`.codex/skills/ao-plan-orchestration/SKILL.md`, `plan/README.md`, all candidate
V7 documents, the immutable Trial 1 KO and Trial 2 request. The review is
limited to R1–R3 and consistency with the previously accepted five-sheet scope.

## Numbered findings and implementation obligations

### 1. R1 — Earlier-wave readiness correction is closed

`plan/PROJECT_V7/A/0/02.md:64–97` freezes a separate bounded
`wave-prior-facts/v1` document for exactly the selected wave's direct earlier
dependencies. It specifies project/profile identity, exact task/earlier-wave
membership, consistent source-wave history, accepted receipt/candidate
references and confirmed cleanup. Missing facts and conflicting input stop
before Gateway startup; valid negative history blocks the dependent while
allowing unrelated work. Only the selected wave dispatches. Historical facts
explicitly do not verify their source, authenticate review, prove freshness,
or confer authority.

The validation owner is explicit in `A/0/00.md:88–96` and its acceptance at
`:148–149`. `A/0/03.md:38–39,89–95` freezes normalized facts/digest for resume,
rejects changed input, and forbids prior-run lookup, reattachment or replay.
`A/0/04.md:40–45` observes ordered wave invocations and negative/resume cases.

Implementation must supply the named focused tests at `A/0/02.md:259–260`
and external cases at `A/0/04.md:110–111`, asserting emitted selected-wave
effects and zero prior-task replay. This is a required future gate, not a
test result from this review.

### 2. R2 — Logical wave concurrency correction is closed

`plan/PROJECT_V7/A/0/02.md:40–60` applies `maxConcurrentTasks` independently
of the shared resource vector. `admissionHeld` spans coding, handoff/check/review
waits and cleanup; possible active recovery retains both its logical slot and
conflicts. Confirmed retirement and complete reservation release precede slot
release and terminal advancement. Waiting cannot create an attempt or consume
a trial, and explicit retry reacquires a slot after prior retirement.

`A/0/03.md:39–40,97–104` persists and reconstructs the held count, rejects
inconsistent active/cleanup or over-ceiling checkpoints before dispatch, and
preserves uncertain cleanup across restart. The timeout retirement contract
at `A/0/02.md:213–221` also retains the slot through cleanup and requires explicit
control for another attempt.

Implementation must run the focused cases at `A/0/02.md:261–262` and external
case at `A/0/04.md:47–52,112` with ample global/provider/memory capacity.
Their observable discriminator is zero second-task create/assign/spawn during
the first task's waits, cleanup and possible active recovery. No new scheduling
engine or sixth sheet is needed.

### 3. R3 — Owned retirement correction is closed

`plan/PROJECT_V7/A/0/02.md:166–179` makes accepted, blocked and changes-requested
review decisions pending dispositions. Exact owned reviewer `agent.kill`, a
validated close response, complete session/provider/memory release and remaining
owned-effect retirement precede terminal disposition, logical-slot release and
dependent admission. Failed or unknown cleanup retains the pending decision,
slot and unreleased vector and cannot expose terminal acceptance.

`A/0/02.md:194–208` requires owned SDK closure before owned Gateway reservation
release and final success; loss/failure produces recovery required. Borrowed
client/reservation ownership remains with the embedding owner. Durable receipt,
kill, release and SDK-close ordering is explicit at `A/0/03.md:62–70`;
uncertain closure is never replayed or replaced by a receipt-based release.

The public response assumption resolves against the existing code:
`gateway/src/services/agent_service.js:724–733` returns the adapter kill result;
`gateway/src/adapters/codex_adapter.js:479–498` checks tmux kill success and emits
`{closed: true, dryRun}`. `GatewayClient` owns the nested stdio/session contexts
at `orchestrator-langgraph/src/orchestrator_langgraph/client/gateway_client.py:51–53`
and awaits context exit at `:90–94`. These reads establish a usable existing
contract, not observed process retirement. V7 still disclaims descendant
containment, and dry-run retirement remains simulated.

Implementation must run the focused cases at `A/0/02.md:263–266`, crash-seam
cases at `A/0/03.md:149–150`, and external capacity-one/cleanup cases at
`A/0/04.md:63–70,113–115`. Required observations include two completed tasks,
accepted reviewer close before the next coder spawn, honest close/release loss,
retained uncertain memory/logical holds, and owned versus borrowed exit order.

## Accepted boundaries retained

- Exactly five registered planned V7 leaves remain. The DAG and explicit V6
  prompt/restart prerequisites remain in README, EPICS, SHEETS and stage A.
- V6 retains seven release sheets and gains no V7 release dependency. Its
  deferred live Claude observation is still open as recorded at
  `COVERAGE_MATRIX.md:32–35`; synthetic V7 evidence cannot close it.
- `COVERAGE_MATRIX.md:11,13,18–30` retains V5's server-wide enforcement,
  authentic independent review, completion, process containment and release
  gaps. Local history, receipts, checkpoints and capacity IDs grant no authority.
- Declared memory/headroom remains cooperative accounting rather than measured
  RSS or OS enforcement. The corrections add no provider spend or policy write.

## Verification and limits

Verified the base is a commit and the candidate is a tree. The base-to-tree
diff contains exactly the 16 manifest paths, with no unbound changes. Every
candidate blob and corresponding live file matched its recorded manifest hash,
including the request. The Trial 1 request also matches its prior candidate
blob; the Trial 1 KO matches its supplied immutable manifest hash. Compared
the Trial 1 and Trial 2 candidate document scope: changes are confined to the
correction sheets, README/review status and appended trial evidence; accepted
registry/epic/coverage and registration content is retained.

Checked **55 relative Markdown file links: 0 missing**. This checks file
targets, not every heading anchor. Read the public kill and SDK-exit code
referenced above. The final candidate whitespace check:

```text
git diff --check 327043a50316f3918b06fe30e019ecdc5799b4d3 0b29a18a0588f36a5b6f990f5d22be73c8740fe7
PASS — exit 0, no output
```

Implementation tests, external synthetic execution, real providers and
`bash scripts/ci.sh` were **not run**. No runtime lane is claimed passed,
skipped or deferred by this verdict. This reviewer wrote only this new
immutable verdict, with no candidate edit, index update, implementation,
policy change, staging, commit, tag or push.

Root should index and persist this verdict and retain the exact candidate
binding. Implementation may proceed only under each sheet's existing
prerequisites, RED/GREEN evidence, independent implementation review and gates.
