# A/0/05 — checkpoint 19: trial 3 default-isolation corrections

2026-10-08. Partial, unreviewed, uncommitted. HEAD
`5dde9f0066fec7392ff4c7bf806cc0c653a42f10`. Trace
`tr-r3-v6-a05-fix-14c0c7ed-a078-49ce-8ca6-2f29596a04ab`, task
`ts-32c3fd9f-49d7-4357-9601-8ecc42def676`. Coder pane `%13` banner
verified on the host: `GPT-6.1-Sol medium fast`. No model switch.

Read the committed independent trial2 KO in full, AGENTS/profile, plan and
stage README, sheet A/0/05, historical source-only OK and checkpoints 9–18.
User constraints override the build skill's normal orchestration loop. Dirty
source and prior evidence preserved. No subagents/self-review, policies,
commits, push, full gate, production restart or real providers.

All new RED commands use `node --test --test-concurrency=1` with DEFAULT
process isolation. Raw logs are retained in `/tmp`:

- `v6-a05-r3-tdz-red.txt`: 0 pass / 1 fail, exit 1, expected `api` TDZ.
- `v6-a05-r3-behavior-red.txt`: 4 pass / 10 fail, exit 1. Four valid
  actual-private-server absence REDs; six invalid fixtures using session
  rather than pane targets, not credited as behavioral RED.
- `v6-a05-r3-corrected-red.txt`: 1 pass / 5 fail, exit 1. Server closure
  after pane refusal, retained identity file, denial envelope, non-main-thread
  descendant and post-timeout rejection audit RED. Late-result cleanup audit
  already passes, counted as guard coverage.
- `v6-a05-r3-initial-green.txt`: 13 pass / 1 fail, exit 1. Remaining
  expectation used `context.revoked`; actual existing recovery denial reason
  is `context.recovery_denied`. Test expectation corrected; no production
  authorization semantics changed.
- `v6-a05-r3-adapter-denial-red.txt`: 0 pass / 1 fail, exit 1. Adapter's
  own post-await cleanup catch also replaced authorization denial.

Every completed run above has zero cancelled/skipped/todo. Source edits
followed the distinguishing RED for each branch. Test registration is now
after dynamic import and declarations. Production changes bind the actual
private tmux server through its exact socket and Linux identity, verify actual
kernel absence before removing the directory, retain `server-identity.json`
on ambiguity, close verified wholly-owned servers even after pane refusal,
union descendants across all task TIDs, preserve public authorization denials
while auditing cleanup failure privately, and observe late adapter rejection.
README records unsupported descendants, numeric-PID/pidfd races and stale
running-row limits. Final focused/service commands are still in progress at
this checkpoint; their counts are deliberately not credited here.

Exact reported historical PIDs 757237, 757723, 758093, 758738 each returned
host `/proc` ENOENT. No identity can be attributed after absence. No signals
were sent to them. New fixture-only teardown uses socket-observed retained
identities and is never credited as production absence or containment.

Next: read complete final TAP totals, correct any failure, bind immutable
trial3 handoff/manifest. Root owns CI inventory/full gate/skip budget, live
acceptance, independent review, evidence integration and publication. Earlier
source-only OK remains historical exact bytes; this candidate has no verdict.
