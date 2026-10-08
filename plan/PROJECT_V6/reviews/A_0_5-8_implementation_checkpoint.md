# A/0/05 — Checkpoint 8: real child before adapter result

2026-10-08. **Partial, unreviewed candidate; new behavioral RED remains open.**
Immutable coder checkpoint, not an independent verdict or complete handoff.

## Entry and scope

HEAD: `98ebd202aff5a92dc401e260b69ff73a1421be70`.
Branch: `feat/V6-A-0-05-local-recovery`.
Read AGENTS.md, resolved orchestration profile, build skill, plan/stage README,
A/0/05, plan trial 2 OK, operator identity decision, checkpoints 6 and 7,
checkpoint7 manifest and root medium/acceptance briefs. The current instruction
supersedes the build skill's delegated-agent workflow: no agents were spawned.

Checkpoint7 manifest SHA-256 is
`27c27422fbf4a94ea3f1e26f7a12d30d55da1095e2195634d716f2f8246a44e4`.
All **47/47 files and 8/8 canonical compressed evidence archives** matched
before editing. The preserved dirty candidate was not reverted or rebuilt.

Only `tests/gateway/request_context_reattach.test.js` changed from checkpoint7.
No production implementation, A04 base/Claude adapter path, policy, release
file, shared index, CI inventory or prior evidence was edited. No subagents,
self-review, provider call, production Gateway, broad containment probe,
commit, push or tag was used. Disposable provider executables are test fixtures.

## TDD RED — actual adapter failure before result

Named test:
`spawn adapter-failure settles only its observed child after durable publication`.
Despite the shared parameterized test label, this case reaches no publication:
it verifies an error before the adapter returns any result.

The private foreground tmux fixture starts on the pinned runtime. A disposable
provider writes its actual PID after starting and remains alive. A disposable
tmux executable shim forwards the actual `send-keys` command to the real tmux,
waits for that marker, then returns exit 1. Production CodexAdapter.spawn rejects
at its own tmux status assertion. The test confirms that no adapter result was
returned, observes the real child's kernel start token, and propagates that
actual error through the cleanup wrapper and protected service/tool path.

Before fixture teardown, the tool reports an error; no business or durable
recovery session binds the target; the real observed child is still alive.
The final absence assertion fails. This is **behavioral RED**, not a missing API
or environment failure. Fixture teardown subsequently reaps the child and the
private foreground server exits successfully. The test never uses the failure
shim or its observed target to grant production cleanup authority.

Exact command, host outside the sandbox:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='spawn adapter-failure' tests/gateway/request_context_reattach.test.js
```

Exit **1**: **0 passed / 1 failed**, zero cancelled/skipped/todo.
The first sandbox execution failed before tmux readiness: **0 passed / 1 failed**,
zero cancelled/skipped/todo. That is an environment failure, not product RED.
The command was rerun with host approval after the sandbox refusal.

## Preserved GREEN and bounds

The six checkpoint7 cleanup cases still pass with this additive test change:
**6 passed / 0 failed**, zero cancelled/skipped/todo, host exit **0**.
They cover post-await spawn/delegate denial, durable-recording failure,
accepted supervised/headless results and target-name reuse. This result does
not satisfy the new RED case and does not establish general containment.

Exact regression command:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH node --test --experimental-test-isolation=none --test-name-pattern='post-await denial must leave|spawn (record-failure|name-reused|accepted) settles only|delegate accepted settles only' tests/gateway/request_context_reattach.test.js
```

Node syntax check and `git diff --check`: exit **0**.
No full gate, broad process probe or live provider acceptance was run.

## Pending scope and GREEN implementation

The cleanup wrapper currently learns the supervised target only from a returned
adapter result. This new failure produces no such result. A successful launch
command must supply an observed session/pane/process receipt before the next
adapter step can fail; deriving a guessed target from request fields, scanning
unrelated sessions, or killing by a returned name does not supply that receipt.

The actual Codex path invokes the shared `tmux_client.js`. A narrow scoped
observation hook there is a potential mechanism, but that file belongs to the
excluded A04 base. An asynchronous question asked the operator whether this
specific observation-only addition is permitted, with existing tmux arguments
and behavior preserved. **No answer was received before this checkpoint.**
The exclusion remains in force; no hook or GREEN production fix was written.
The existing operator authorization for identity-bound cleanup is retained;
this question concerns the newly identified shared file boundary only.

Resume from this RED test after the operator resolves that scope. Obtain
cleanup authority only from the adapter-owned successful creation observation,
retain immutable tmux IDs and Linux process identity, and verify cleanup before
fixture teardown. Prove the other six cleanup cases remain green. If the shared
file stays excluded, an independently approved design is needed; do not bypass
it with global hooks, process sweeps or guessed target authority.

Checkpoint7 remaining items 2–5 stay open: delegate timeout/late settlement,
non-tmux descendants, ambiguity/replacement/resistance/multi-pane/overall bounds,
and providers outside Codex. Its stale business-row consistency limit remains.
Independent Opus 5.5 medium review must be separately assigned when the candidate
is ready; no complete review handoff or implementation-complete claim is made.
Root retains full solo host CI, live Codex restart acceptance, serial shared-path
reconciliation, evidence commits, integration and release authority.

## Hash-bound sanitized evidence

[Manifest](v6-a05-cleanup-checkpoint-8-manifest.json) binds 49 candidate/prior
checkpoint files and three new sanitized archives. Manifest SHA-256:
`571e557b5eb83ef5dbb570cd57c2e40198006ba85bb96c502773418a850bb846`.
It excludes itself and this checkpoint to avoid circular hashes.
Archives bind compressed/uncompressed bytes and original raw local log hashes.
JSON diagnostics, checkout paths and observed process tokens are omitted or
redacted in public evidence; no process command lines are included.
Prior archives and checkpoints remain unchanged. This checkpoint is written
but not committed; the dirty candidate remains preserved for continuation.
