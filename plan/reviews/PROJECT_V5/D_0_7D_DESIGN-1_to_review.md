# Project V5 D/0/07d Design Trial 1 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-1`
- Requested reviewer: a fresh, independent Codex session using
  `gpt-5.6-sol`, reasoning `max`, service tier `priority`
- Request artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_to_review.md`
- Required verdict artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-1_result.md`
- Current state: `pending`; this request contains no author-owned verdict

The reviewer must be distinct from the plan author and must assess the
committed candidate below. A receipt, message, or this request is not approval.

## Frozen candidate

| Identity | Value |
|---|---|
| Candidate commit | `c249e49becbef44b7385791be76e3f7ebb8afa93` |
| Candidate tree | `a89518c0345a37086dee34c58f0e1671ddd34414` |
| Candidate parent/baseline | `d0bf521799b16f7d3300163ce40bd7dfca49864d` |
| Baseline tree | `0c577aef5bd864c51bf60086b9b3cb5daa254000` |
| Candidate subject | `docs(plan): rebaseline D/0/07d real-host acceptance (V5 D/0/07d)` |

The complete candidate pathset is exactly:

```text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07d.md
```

Frozen candidate blobs and diff limits:

| Path | Candidate blob | Parent → candidate numstat |
|---|---|---:|
| `plan/PROJECT_V5/D/0/07.md` | `24de148feee2e1a48b7a34e7a50c472b39142801` | `89 insertions, 55 deletions` |
| `plan/PROJECT_V5/D/0/07d.md` | `dec7794b9955496394a45e987c195344465319e0` | `280 insertions, 53 deletions` |

No source, test, fixture, policy, package, lockfile, migration, workflow,
registry, or other plan file is part of the candidate.

## Reason for the rebaseline

The prior parent wording mixed the historical `a7c09b0` composition blocker
with the state at the declared `07d` baseline. The candidate must be judged
against these distinct evidence states:

| Evidence point | Grounded state |
|---|---|
| Historical `D_0_1_CORE` at `a7c09b0` | No `createProcessSupervisorSessionPortFactory`; utility fd 0 was closed; the ordinary execution exposed only the frozen seven-key surface. This remains historical RED evidence for `07a–c`. |
| Declared `07d` baseline `d0bf521` | `createProcessSupervisorSessionPortFactory` exists at `process_supervisor.js:2489`; its default path selects `createHelperSessionPortOps(record)` at `:2569`; it returns the issuer separately at `:2614-2615`; literal provider argv remains direct helper `execve` at `process_supervisor_helper.py:1255-1264`. Default `07a–c` composition is therefore present. |
| Existing complementary tests | The relay suite separately proves the exact `ready\nstatus\nack:status\n` 24-byte pane and a default real-helper write-sequence-1/snapshot-sequence-2 path. It does not prove those exact values together in the dedicated transaction required by `07d`. |
| Existing real-host outer teardown | The PTY/relay fixtures resolve mutable paths, invoke tmux `kill-session`/`kill-server`, and recursively remove their workspace. A same-name replacement can therefore be selected by harness teardown. |
| Public splice | `agent.ask`/`agent.view` still route through provider adapters using tmux `send-keys`/`capture-pane`; `D_0_1_SPLICE` remains unimplemented and blocked on an independently accepted `D_0_7D`. |

At review-request creation, `main` was
`837206cca88686020a5e079aab8c7f3c46548263` (tree
`f3d7b83a130b9b5ed7230a054effb4dc61e3a752`). The relevant Stage D plan and
review bytes inspected on `main` were identical to the declared `d0bf521`
baseline; no unrelated later-D transplant was used.

## Candidate contract to assess

The rebaseline retains the ratified D/0/07 product contract and changes the
leaf's evidence plan:

1. The observable RED is unsafe **outer-harness** replacement-identity
   teardown. It is injected and non-destructive: no real signal, tmux mutation,
   unlink, rename, rmdir, or recursive deletion occurs in RED.
2. The exact literal-argv write/snapshot/observation transaction is a GREEN
   characterization of already-composed `07a–c`, not a manufactured product
   RED.
3. Outer-harness teardown binds its directly spawned tmux server child with a
   pidfd and workspace/socket parents with dirfds, preserves mismatches, and
   disposes an isolated namespace only after evidence capture.
4. That outer restriction does not alter frozen product cleanup. Product code
   may still retire an exactly sealed port-owned pane/session through its
   retained shared-server connection; it never issues `kill-server`,
   re-resolves the public target, or deletes a replacement.
5. All parent race, result, descriptor, terminal-ledger, relay-key,
   socket/runtime-directory preservation, replacement, process-survivor,
   shared-server, and sibling-session invariants remain mandatory.
6. Work is bounded into three durable implementation checkpoints: sealed
   owner/wrapper, exact transaction, and race/final gate. None alone earns the
   `D_0_7D` verdict or unblocks the splice.
7. The authoritative Linux/amd64 wrapper requires a descriptor-verified pinned
   tmux source archive, fresh offline digest-pinned build, clean committed
   candidate materialization, explicit read-only gate dependencies, private
   namespaces, an effective 1-GiB transient-unit tmpfs, bounded resources, and
   exact TAP accounting. Missing prerequisites or a skipped D/0/07d test fail.

The candidate introduces no public/product protocol, capability, deletion
authority, cleanup policy, or human policy decision. Its fixed test-owner
command channel is harness-internal and changes neither `ASP1` nor `ASR1`.

## Review questions and acceptance boundary

Please return `OK` only if the committed candidate is build-ready and all of
the following are true; otherwise return `KO` with prioritized, file/line-
grounded findings:

- Every current-code claim, baseline SHA/tree, path, anchor, dependency, test
  name, status, and project count is accurate.
- No wording retains the false premise that default `07a–c` composition is
  absent at `d0bf521`; historical absence at `a7c09b0` remains clearly
  qualified.
- The RED is observable, falsifiable, deterministic, and non-destructive, and
  the GREEN transaction has exact independent oracles.
- Outer-harness zero-mutation assertions cannot be read as forbidding frozen
  exact-target product pane/session cleanup.
- The full race/result/cleanup contract remains mutually exclusive and
  complete, including the three exact named ordering tests and zero/partial/
  full-write response-loss cases.
- The three checkpoints, expected pathset, focused command, full-CI command,
  custom-tmux provenance, clean-candidate boundary, dependency inputs,
  namespaces, limits, timeout, skip handling, and evidence requirements are
  executable rather than aspirational.
- `D/0/07` remains a non-executable parent index; counts remain 82 executable
  sheets and 43 open, with the stated four in-progress sheets.
- The candidate makes no implementation, review, integration, promotion,
  release, hosted-CI, or production cleanup-policy claim.
- No legal, commercial, security, regulatory, deletion, or runtime-policy
  choice was made silently. If review finds such a choice, return KO and name
  the human decision that is required rather than supplying it as reviewer
  policy.

The verdict must freeze this exact candidate commit and tree, state its own
reviewer profile and fresh-session identity, record the commands/evidence
examined, and explicitly say whether implementation may begin. It must not
claim integration, promotion, release, or that `D_0_1_SPLICE` is unblocked.

## Author-side verification recorded before handoff

- `git diff --check` passed for the candidate.
- `git show --format= --name-only c249e49becbef44b7385791be76e3f7ebb8afa93`
  contains exactly the two frozen
  plan paths above.
- All relative Markdown links in the candidate files resolve in the candidate
  tree.
- The declared baseline commit/tree and all referenced review/design commit
  objects were resolved locally; relevant Stage D bytes on observed `main`
  were compared with the baseline.
- Factory/helper/ordinary-execution anchors and the two complementary relay
  test names were checked against the candidate parent tree.
- Project arithmetic was reconciled as
  `39 complete + 4 in progress + 39 planned = 82`, with 43 open and the parent
  index excluded.

No implementation or runtime gate was run: this is a documentation-only plan
candidate. The external tmux source archive, Docker build, user-manager/cgroup
delegation, namespace runner, focused lane, and full repository gate remain
future implementation evidence and are not claimed by this request.

## Status

`pending` independent Design Trial 1 review. No verdict exists at the required
result path when this request is committed.
