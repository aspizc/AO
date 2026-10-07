# A/0/05 trial 2 — bounded correction checkpoint

**Disposition: BLOCKED for root/operator lifecycle decision.** Not review-ready.
No independent verdict, commit, policy edit, status change, or full-gate claim.
Base HEAD is `2cf198f0719926a8b05431b1dc39dac5b8f4d6e1` (review evidence only).
The requested configuration is GPT-6.1 medium priority; no agent was spawned
and no model substitution was requested. Trial1's dirty production code and
immutable handoff, verdict, manifest and logs were preserved.

## Corrections completed

- Four archived registry assertion failures now check the additive 34th tool
  and preserve the explicit original ordering. Coordination remains lazy and
  shares one service instance.
- The authoritative `gateway/contracts/orchestrator-profile-v1.json` now adds
  `orchestration.reattach` to recovery workflow tools and describes it as a
  protected high-risk ownership mutation with natural idempotency and
  same-input-only retry. Profile validation is unchanged. The distinguishing
  test asserts the exact guidance and proves deleting it still refuses.
- Scoped CI containment attributed the original leak to the observation
  fixture: a daemonized tmux server left two adopted zombies. Foreground-only
  attempt still left an adopted `sleep` zombie (recorded PID/PPID/PGID/start
  token/state and kernel stat). The fixture now owns a foreground server,
  interrupts its own panes, keeps their parent alive through pane teardown,
  then kills and awaits that direct server. Isolated socket only; no global
  process kills. Final pinned-runtime CI containment is quiescent.

## Lifecycle assessment — unresolved blocker

See [root/operator decision record](A_0_5_to_check_by_human.md).
The production Codex adapter with a disposable executable proves a real
provider process after spawn denial, and a possible surviving provider-created
descendant after delegate denial. Both retain their observed PID/start token,
have no new business session/recovery binding, and cannot be viewed through
the revoked context. The assertions requiring cleanup remain **RED**.
The test fixture's cleanup is not product cleanup. No late cleanup grant,
unverified target kill, policy change, or lock across provider work was added.

A third real adapter test confirms kill denial leaves a stale `running` row
for a dead/reaped target. Fresh recovery reports `target_gone`, hydrates no
session, and protected view denies. This assesses the limitation without
claiming business state reconciliation or writing under lapsed authority.

## Verification and immutable archives

All listed archives use `v6-a05-trial2-<name>.txt.gz` in this directory.
Their compressed/uncompressed SHA-256s are in the candidate manifest.

| Evidence | Result |
|---|---|
| `gate-red` | 12 passed / 5 failed / 0 skipped; reproduces exact archived failures |
| `profile-red` | 4 passed / 2 failed / 0 skipped; existing projection and new exact ownership guidance test fail before profile correction |
| `registry-profile-green` | 18 passed / 0 failed / 0 skipped |
| `observations-probe-red` | CI `process_tree_leak`, exit 0; two adopted zombies; assertions passing do not count as lane success |
| `foreground-attempt2-leak` | CI `process_tree_leak`, exit 0; remaining owned `sleep` zombie |
| `observations-probe-green` | CI `completed`, exit 0, no adopted process; intermediate corrected fixture |
| `orphan-fixture-attempt1`, `orphan-fixture-attempt2` | Invalid fixture lookup produced TOOL_ERROR; excluded from safety RED evidence |
| `orphan-red-valid` | 0 passed / 2 failed / 0 skipped, both actual cleanup assertions |
| `safety-probe`, `safety-tap` | CI `completed`, exit 1; 1 passed / 2 failed / 0 skipped; fixtures cleaned |
| `focused-system-probe`, `focused-system-tap` | CI `completed`, exit 1; 330 passed / 2 failed / 0 skipped, system tmux 3.6 |
| `focused-pinned-probe`, `focused-pinned-tap` | Final candidate: CI `completed`, exit 1; **330 passed / 2 failed / 0 cancelled / 0 skipped / 0 todo**, pinned tmux **3.6a-agents.1**; only orphan safety assertions fail |

Final command, run on the host:

```bash
PATH=/tmp/ao-tmux-tools/bin:$PATH python3 /tmp/a05-trial2-probe.py \
  gateway/tests/scaffold.test.js tests/gateway/request_context_reattach*.test.js \
  tests/gateway/orchestrator_profile*.test.js \
  tests/gateway/tool_coordination_registry.test.js \
  tests/gateway/tool_orchestration_task.test.js tests/gateway/tool_catalog.test.js \
  tests/gateway/coordination_consumer_epoch_migrations.test.js \
  tests/gateway/task_service.test.js tests/gateway/mcp_bootstrap.test.js
```

The probe source is archived as `v6-a05-trial2-owned-probe.py`; it calls the
unchanged CI `_execute_command_serial` containment, records owned process
identities before CI cleanup, and archives TAP separately. The probe shell
itself returns 0 after recording the command outcome: the outcome's **exit 1**
is authoritative, not that wrapper exit. Initial sandbox runs failed at file
subprocess startup and provided no usable assertion evidence; host runs above
supersede them. `git diff --check` passes.

## Candidate and pending work

`v6-a05-trial2-checkpoint-manifest.json` binds all trial1 candidate paths,
trial2 source additions, preserved trial1 evidence and trial2 evidence. It
records exact deltas from the trial1 source manifest. Only the two existing
reattach test files differ within that trial1 manifest; production source
bytes remain identical. New profile/registry fixes and owned fixture are
listed separately. `ci/suites.json` was already dirty on entry and was not
edited; its inventory reconciliation remains root-owned.

No `A_0_5-2_to_review.md` is issued because lifecycle safety is not ready.
Root must resolve the recorded lifecycle decision before another bounded
correction. Root owns CI inventory, full host gate, live Codex restart/reattach
check, review/index/status/CHANGELOG, and serial A04/V7 reconciliation. No
release, integration, full acceptance, or complete sheet verdict is claimed.
