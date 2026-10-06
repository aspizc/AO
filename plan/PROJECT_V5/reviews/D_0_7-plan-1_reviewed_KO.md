# Independent Plan Review — Project V5 D/0/07 (Trial 1)

## Verdict

**KO**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **max**, execution profile
**Priority/Fast**.

## Reviewed identity

- Ratified-boundary plan commit:
  `43cf5daf1cbf863a3d85fb0295329b113cf8642b`.
- Review-request commit:
  `6b52c1275f4f3a1d0b29da60c0ce81111fc646a7`.
- Plan base:
  `1a134f4f1f288627e32aa2dfc2b223651a1124bd`.
- Primary artifact: `plan/PROJECT_V5/D/0/07.md`.
- Registry artifacts: `plan/PROJECT_V5/D/README.md`,
  `plan/PROJECT_V5/D/0/01.md`, and `plan/PROJECT_V5/SHEETS.md`.
- Cross-branch source evidence: blocked submission `b56da0b`, independent
  `blocked_confirmed` result `f85c621` / lane cherry-pick `8f3ce77`, and
  ratified Option 1 gate `0b32221`.

This is a plan-contract verdict only. It credits no runtime implementation,
technical GREEN, integration, promotion, live execution, or release.

## Blocking findings

1. **The advertised adversarial suite is not a valid TDD RED against the
   current supervisor.**

   `D/0/07.md:52-68` says every listed case fails against the current
   supervisor. Several cases instead pass already, or pass vacuously:

   - the current frozen execution has no write method, so an assertion that an
     unauthenticated write is unreachable or fails closed is already true;
   - idempotent, exactly-once cancellation is an accepted `D_0_1_CORE`
     guarantee, so the double-cancel assertion is a regression guard, not a
     new failure; and
   - the current core directly uses `execve` without a shell and contains no
     tmux `send-keys`, so those static assertions are also already green.

   A suite made only from these negative checks could be green while no
   persistent control port, authorized write, terminal snapshot, or attach
   route exists. The sheet also does not name the port test file, exact
   failing subtests, or their current-core failure reasons. That does not meet
   the repository rule that a RED prove the missing behavior before production
   changes.

   Trial 2 must name one focused suite (for example,
   `tests/gateway/process_supervisor_session_port.test.js`) and define a
   positive authorized path that fails on the frozen core: create a persistent
   supervised fake utility, obtain the separately issued port authority, send
   one bounded prompt through it, read the specified current snapshot, and
   obtain the specified observation/attach result. It must record the exact
   expected failing assertions against `a7c09b0`. Unauthorized access,
   cancellation, no-shell, and no-`send-keys` checks should remain
   mutation-sensitive adversarial/non-regression assertions, but must not be
   counted as independent RED failures merely because the new surface is
   absent.

2. **The authenticated port interface and capability lifecycle are undefined,
   so the RED and GREEN require security-critical invention.**

   The scope requires an explicit non-forgeable capability and says that
   possession of the supervisor, execution, completion, queue, or exported
   prototype grants no write authority (`D/0/07.md:28-31`). The GREEN supplies
   only a WeakMap/immutable-binding implementation hint
   (`D/0/07.md:70-74`). It never specifies:

   - which factory operation issues the authority, to which caller, and how
     `D_0_1_SPLICE` can receive it without placing it on the ordinary
     execution object;
   - the exact port methods, immutable argument/result shapes, fixed
     provider-data-free error codes, prompt and frame limits, or whether the
     snapshot and attach operations use the same or separate authority;
   - the binding between authority, launch digest, session, utility identity,
     terminal, and helper instance;
   - when the authority becomes usable, how concurrent calls serialize, and
     when it is revoked across bootstrap failure, utility exit, cancel,
     helper/supervisor loss, and public settlement; or
   - the test injection seam that proves a forged object, copied method,
     prototype replacement, stale capability, or capability from another
     session cannot reach a descriptor.

   These choices determine the trust boundary and cannot be left to a coder.
   Trial 2 must freeze one internal API and state machine, including issuance,
   consumer handoff, method inputs/outputs, bounds/errors, binding, retirement,
   and operation-versus-cancel/settlement races. It must also preserve the CORE
   data boundary explicitly: raw prompts and terminal bytes cannot enter the
   bounded JSON control transcript, public errors, audit, or identity records.

3. **The attach requirement is internally unresolved against the exact public
   contract.**

   The plan simultaneously requires no public attach-contract/catalog change
   (`D/0/07.md:46-47`), an attach/observation route
   (`D/0/07.md:38-39`), and a RED in which that route grants observation
   without write authority (`D/0/07.md:64-65`). The live contract is more
   specific than the plan records:

   - `agent_service.js:380-386` requires
     `sessionId === tmuxTarget` and exactly
     `attachCommand === "tmux attach -t <tmuxTarget>"`;
   - `session.js:8-17` reconstructs that same command from the persisted
     `tmux_target`; and
   - the existing command attaches a normal interactive tmux client, whose
     keyboard input is a write route. The operator runbook and intervention
     tooling rely on that supervised tmux workflow.

   Therefore a read-only attach command would change current behavior, while
   retaining ordinary interactive attach conflicts with the sheet's unqualified
   capability-only/write-free-observation claims. “PTY-or-equivalent” and
   “sufficient to preserve” do not select an implementation that also keeps
   literal provider argv and avoids tmux `send-keys`.

   Trial 2 must select and diagram one Option-1-compatible topology and freeze
   its exact spawn result and attach behavior. It must state whether operator
   attach remains an explicitly separate write authority or is isolated from
   the utility through a read-only mirror, and prove that decision without
   changing the exact public response unless a new operator gate authorizes
   Option 2. The positive RED must demonstrate the exact
   `tmuxTarget`/`attachCommand` contract, literal Codex/Claude argv ownership,
   and the absence of a `send-keys` control path. If those properties cannot
   coexist, the plan must stop at a new human decision rather than silently
   choosing a public-contract change or tmux exception.

4. **The terminal, snapshot, and verified-write semantics are not
   deterministic enough to implement or test.**

   The sheet asks for a deterministic byte-capped current-terminal snapshot
   and exact-boundary tests (`D/0/07.md:32-33,60-61`), but gives no numeric
   byte cap, terminal dimensions/model, scrollback depth, UTF-8/invalid-byte
   rule, ANSI rendering rule, truncation direction/marker, resize behavior, or
   snapshot concurrency point. Existing `agent.view` captures 400 tmux lines
   and returns `{snapshot, dryRun}`; a raw PTY byte history is not automatically
   the same current-screen semantic.

   Likewise, “verification immediately before every write” names identity
   fields but does not freeze their authoritative Linux/Darwin source, the
   expected foreground process-group rule, maximum prompt bytes and line/enter
   framing, concurrent-write ordering, or the check/write/cancel race
   (`D/0/07.md:34-37`). Without those rules, “no partial write” has no exact
   oracle when identity changes or cancellation wins around a short/partial
   terminal write.

   Trial 2 must provide normative tables for snapshot rendering/bounds and
   prompt framing/bounds, plus a write state machine that identifies the
   identity reader, foreground-group comparison, serialization point, and
   outcome for every identity-change, short-write, terminal-close, and
   cancellation ordering on each supported platform. Boundary, over-boundary,
   invalid-byte, resize, foreground replacement, PID reuse, and race tests must
   name exact expected outputs/errors. The selected mechanism, source/test
   paths, fixtures, and any dependency/manifest impact must be listed so the
   work can genuinely be assessed as one S/M branch and one `D_0_7` review.

5. **The ratified dependency and registry update is incomplete, and the sheet
   inventories are now arithmetically false.**

   The ratified gate explicitly required the new prerequisite to be registered
   in `SHEETS.md` and `EPICS.md`, with the dependency wired both ways. The
   submitted D sheet and `D/0/01` correctly express the slice-level acyclic
   order:

   ```text
   integrated D_0_1_CORE -> planned/reviewed D/0/07 -> D_0_1_SPLICE
   ```

   But live roadmap surfaces still publish the superseded state:

   - `EPICS.md:63,85-96,108,126` says the splice is dependency-unblocked,
     routes CORE directly to SPLICE, and calls only `D/0/00-06`
     security-critical;
   - `PROJECT_V5/README.md:104-107,120-123`,
     `C/README.md:17,36`, and `COVERAGE_MATRIX.md:74` likewise say the final
     splice is unblocked; and
   - `HANDOFF_YOLO.md:175` remains an actionable “now
     dependency-unblocked” heading.

   The new D file also makes 54 active B-I sheets
   (`B=6, C=8, D=8, E=6, F=5, G=5, H=6, I=10`), hence 79 total with the 25
   delivered A sheets. `SHEETS.md:28-31`, `PROJECT_V5/README.md:89-92`,
   `EPICS.md:154-157`, and `plan/README.md:21-25` still report the
   pre-addition 53/78 inventory. On the Project V5 registry's existing
   classification baseline, adding this one planned sheet yields 36 complete,
   4 in progress, 39 planned, and 43 open. The top-level `plan/README.md`
   already disagrees with the Project V5 split and must be reconciled rather
   than independently incremented.

   Trial 2 must register `D/0/07` in `EPICS.md`, insert it between CORE and
   SPLICE in the DAG and narrative, mark the joint C/D splice blocked on a
   reviewed port wherever current state is published, and correct all live
   inventory totals to one canonical split. Update the listed current-state
   files, or explicitly mark a handoff surface historical if it is intentionally
   immutable. Historical review artifacts must remain unchanged.

## Verified non-blocking properties

- The new sheet does name all six requirements from the independent Option 1
  recommendation: owned terminal, capability-bound input plus bounded
  snapshot, producer/foreground verification, attach/observation,
  cancellation/settlement preservation, and no shell/tmux `send-keys`.
- It does not authorize Option 2, Option 3, or revival/cherry-pick of rejected
  C/1/00 Trial 1-15 process code.
- `D/0/07` remains honestly `planned`; `D/0/01` remains `in_progress` with the
  standalone CORE distinguished from the blocked splice.
- The sheet's non-scope leaves adapter/service/catalog wiring in
  `D_0_1_SPLICE` and makes no live provider, MCP, KYA, migration, integration,
  promotion, or release claim.
- The submitted D-sheet dependency direction is acyclic, and the technical
  plan commit changes no other sheet's `Depends on` row.
- All 253 local Markdown links in the submitted/registry documents resolve in
  the current tree.

## Independent verification

- Read the complete blocked submission, independent result, and ratified
  operator gate from `feat/V5-D-0-01-c100-splice`; verified the cited object
  identities and the `a7c09b0` integrated CORE ancestry.
- Candidate/request changed-path allowlists match the submitted plan and
  append-only request artifacts.
- Focused Project V5 documentation structure tests:
  **13 passed / 0 failed**.
- Full structure suite: **387 passed / 22 failed**. It is not reported as a
  pass. One failure reports six pre-existing stale CI inventory digests; the
  other 21 are CI-gate process/protocol/signal failures, dominated by truncated
  supervisor frames and fixtures exiting before their process evidence exists
  in this environment. The plan candidate changes only Markdown planning files
  and no path included by those suite inventories or process tests, so these
  failures are not used as D/0/07 plan findings.
- Candidate, request, and complete-range `git diff --check`: passed.

No network, MCP, Redis, PostgreSQL, live provider, tmux session, shared
service, implementation file, test file, policy, migration, push, or external
state was used or changed.
