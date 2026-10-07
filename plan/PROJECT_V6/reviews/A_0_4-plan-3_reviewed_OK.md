# A/0/04 guarded runtime prerequisite — plan review, trial 3

## Verdict

**OK — the scoped guarded-paste addendum is ready to build. No blocking
finding remains in the four bound candidate blobs.**

This approves the plan contract and its bounded implementation ownership.
A/0/04 and its runtime prerequisite remain **PLANNED**; this verdict supplies
no implementation, integration, promotion or release evidence.

- Base: `186ce1d03e824fe526a61927812aa2593a81b28e`.
- Trace: `tr-r3-a04-plan-b47869dd-e0b7-486c-967d-0329451be647`.
- Reviewer: separately assigned built-in Codex session
  `/root/review_prompt_plan_r3`, using the operator-authorized fallback.
  This session did not author or modify the candidate.
- Execution: no Claude or other provider invocation. Exact model/effort
  metadata is not independently exposed by this fallback and is not claimed
  verified.
- Request: [trial 3](A_0_4-plan-3_to_review.md).
- Prior verdict: [trial-2 OK](A_0_4-plan-2_reviewed_OK.md), unchanged. This trial
  reviews the build-discovered runtime prerequisite that trial 2 did not prove.

| Reviewed candidate | Git blob |
|---|---|
| `plan/PROJECT_V6/A/0/04.md` | `bd71514b075eb6e47d59ec8edb9850d791de503b` |
| `plan/PROJECT_V6/A/0/04-transport.md` | `3a3ea0d785f49d361ad439838dc247dd2d2fb320` |
| `plan/PROJECT_V6/SHEETS.md` | `177d004119ef54200d24dd155689fb77792144bc` |
| `plan/PROJECT_V6/A/README.md` | `7b8e0f46c399209ee6eeaad552ae813a0fd3d4b5` |

The verdict binds only these blobs against the named base. V7, generic workflow
changes, other working-tree documents and the separate implementation worktree
are outside scope.

## Source applicability and atomicity

Independently downloaded the official
[tmux 3.6a source archive](https://github.com/tmux/tmux/releases/download/3.6a/tmux-3.6a.tar.gz)
into reviewer-owned scratch memory and verified SHA-256
`b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759`
against `gateway/vendor/tmux-agents/manifest.json`. Inspected selected files
from that exact archive, rather than relying on a guessed format variable or
the locally installed binary. Existing vendor patch and capture-extension
hashes also match their manifest entries.

The archive's `cmd-paste-buffer.c:46-112` resolves one pane, checks whether it
has exited, selects a buffer and enqueues data directly to its event. Framing
is conditional on `MODE_BRACKETPASTE`, and `-r` preserves LF when no explicit
separator is supplied. Input-off currently skips writing while returning
normal completion. The proposed guard at `04-transport.md:23-32` therefore
addresses a real missing guarantee and can return failure before the first
payload or delimiter write. `-G` is absent from the existing flag grammar, so
an older server rejects the new command before input. The source supports an
additive guard without changing normal unguarded semantics.
[Upstream paste source](https://raw.githubusercontent.com/tmux/tmux/3.6a/cmd-paste-buffer.c).

The other required state is available in the same pinned runtime:
`tmux.h:1186,1235` exposes `PANE_INPUTOFF` and the pane's mode stack;
`window.c:1102-1130` shows that a mode replaces the current screen;
`window.c:1182-1268` reads synchronization through pane options and handles
mode/input refusal for ordinary input. Rejecting a nonempty mode stack before
using the application screen, and rejecting synchronization, fits those
existing structures. The paste command writes directly to its selected pane;
the guard need not introduce input routing or process authority.
[Upstream pane source](https://raw.githubusercontent.com/tmux/tmux/3.6a/window.c).

`server.c:264-277` processes command queues synchronously, and
`cmd-queue.c:642-649` resolves the target and calls the command implementation
directly. A guard and complete enqueue in that existing execution can avoid
the separate-client-probe race described by the addendum. This is a source
applicability conclusion, not a tested patch result. The guarantee covers
tmux's mode at enqueue; A/0/04 still independently requires current provider
state, guarded final Enter and positive acceptance evidence.
[Upstream server loop](https://raw.githubusercontent.com/tmux/tmux/3.6a/server.c),
[upstream command queue](https://raw.githubusercontent.com/tmux/tmux/3.6a/cmd-queue.c).

## Verification and ownership assessment

- `04-transport.md:66-83` requires actual received bytes for enabled framing,
  disabled framing, a mode change after client observation, input-off, mode
  state and synchronization. Its positive UTF-8/multiline case distinguishes
  a functioning transport from an implementation that always refuses. The
  negative cases require zero input, and the adapter test prohibits unguarded
  fallback. A command-string assertion alone cannot close these checks.
- `04-transport.md:34-38,55-62,87-98` owns the runtime version, versioned patch,
  digests, both offline builders, helper handshake, fixtures and current CI
  pins together. The actual helper currently requires exactly
  `3.6a-agents.1` at `process_supervisor_helper.py:4333`; the listed write scope
  accounts for that dependency. Current tests also bind patch shape and
  versioned outputs, so those associated fixture updates are within scope.
- Keeping `cmd-agents-capture.c` byte-identical and rerunning the retained
  capture/runtime contract preserves the existing maintenance boundary. The
  pinned source and builder image are retained; no package upgrade, capture
  protocol change, policy edit or process-control change is proposed.
- `04.md:33-40,86-89` consumes the guarded command and rejects raw fallback.
  `04-transport.md:40-51` maps unsupported runtime/option refusal to the
  existing bounded public reason and preserves separate provider acceptance.
  A runtime-only OK cannot close the sheet.
- `SHEETS.md:26-28` and `A/README.md:29-33` register this ownership under the
  existing A/0/04 leaf. CP1 and CP2 are checkpoints of one transport concern;
  the seven-sheet inventory, dependency graph and wave order remain intact.
  Shared CI reconciliation stays with the integrator.
- The combined candidate must still pass `bash scripts/ci.sh` with the new
  isolated runtime and recorded skip budget. Neither mock coverage nor this
  plan verdict establishes provider acceptance. The prohibited Claude live
  check and existing Darwin verification gaps remain explicit.

## Checks performed and limits

Read AGENTS/profile, the planning skill, `plan/README.md`, V6/stage registries,
the immutable request and prior verdicts, all four candidate files and their
scoped diff against the named base. Inspected the vendor manifest/patch/builders,
runtime documentation, exact-version helper seam, runtime fixtures/tests and
existing tmux command builder. Verified the upstream archive and source seams
described above.

Immediately before writing this verdict, all four blob identities still
matched the request; their whitespace checks passed. The scoped tracked
`git diff --check` against the named base passed, and the untracked addendum
was checked directly for trailing whitespace. Observed branch
`release/1.1.0` and HEAD equal to the named base.

No production/vendor code change, runtime build, provider execution, test-suite
or full-gate run, staging, commit or release verification occurred. Test/gate
results are **not run**, not a pass. This new immutable verdict is the only
repository write by this reviewer; root owns indexing, artifact persistence
and scoped integration. A changed candidate requires a fresh trial and
reviewer trace/session.
