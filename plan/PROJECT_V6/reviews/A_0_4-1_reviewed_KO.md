# A/0/04 implementation review — Trial 1

## Verdict

**KO — A/0/04 is incomplete and the candidate fails the required full gate.**
The final Enter can reach a decision menu or a synchronized sibling after its
last client-side guard. Exact-text observation and menu classification also
have reproducible defects. Missing positive Antigravity behavior, live
acceptance and measured timing remain unmet; deferred checks are not passes.
No integration, promotion, release or sheet closure is approved.

## Assignment and candidate identity

- Independent root-assigned Codex reviewer, current `/root` session, assigned by
  `workspace/root-a04-review.md`. This reviewer did not author the candidate;
  no coder-owned verdict or subagent evidence is used as independent approval.
- Branch: `feat/V6-A-0-04-safe-submit`.
- Base/current HEAD: `327043a50316f3918b06fe30e019ecdc5799b4d3`.
- Uncommitted candidate: the 31 repository entries in
  [trial-1 submission](A_0_4-1_to_review.md), including the deleted `.1` patch,
  all independently checked against disk before and after focused review.
  No mismatch remains. The five continuation scratch evidence files also match.
- Candidate manifest SHA-256:
  `88a813886a5f58cf8c03c84470f3bb07d4a4f0fdf81025485782c46175ebdcab`.
- Root-only `ci/suites.json` change independently reviewed: only the Gateway
  inventory digest changes. The 130 discovered test paths reproduce
  `sha256:e811a7f96f787406dbb6cc0c352cf8e52477e237f3e17e8ecfc862cabd959665`.
  Suite topology, commands, minimums and skip budgets are unchanged.
  The file SHA-256 is
  `83c712049bf5188f24fa783ffbcb974da4da171647002e91c0ef845969815f45`.
- Read AGENTS.md, orchestration profile, plan/stage READMEs, sheet, transport
  prerequisite, all three plan request/verdict trials, all three build
  checkpoints, provider discovery, submission and
  [execution correction](A_0_4-build-3_evidence-correction-1.md).
  Plan OKs approve contracts only, not implementation.
- The correction attributes checkpoint 3 to coder session
  `ag-tr-ao-a04-submit-3afb1b8-codex-coder`, trace
  `tr-ao-a04-submit-3afb1b82-d824-403c-a3b4-b09933402044`, task
  `ts-6122097e-58d6-4dc0-8f1f-4e9c00a96733`.
  These are root-recorded coder provenance, not this reviewer's identity or
  independently queried Gateway records. No new reviewer Gateway binding or
  exact model/effort/service-tier metadata is claimed verified.

## Actionable findings

### F1 — P1: final Enter is not bound to the guarded pane state at the write

**Evidence:** `gateway/src/adapters/base_adapter.js:121–125,157–159`;
`gateway/src/adapters/tmux_client.js:19–20`.

`observe` captures the screen and then separately reads pane metadata. After
classifying that observation, submission invokes ordinary `send-keys Enter`
without a server-side state guard. The atomic `paste-buffer -G` primitive
protects framing at paste; it does not protect this subsequent decision key.
The same gap exists for the permitted retry.

Two focused checks used the exact `.2` binary and an owned raw terminal:

- After the final pending-composer guard, display the known retry/model menu
  before executing the queued Enter. The target receives framed `Enter` and
  then `0d` while that menu is displayed. The helper later reports
  `acceptance_uncertain`; this does not undo the key already delivered.
- Enable `synchronize-panes` after that guard and before executing Enter.
  The target receives the same input, and a sibling that received no pasted
  prompt receives exactly `0d`. Again, the later refusal is too late.

These are deterministic terminal fault-injection reproductions, not live
provider acceptance or a claim that a real provider selected an option.
They establish that the submitted command lacks the promised write boundary.
Upstream `window.c` routes ordinary keys to synchronized siblings; the vendor
patch changes the paste command only.

**Correction:** bind both the classified composer evidence and pane safety
state to the final key enqueue in one guarded server operation; refuse changed
content/cursor/mode/input/synchronization with zero key bytes. A further
separate probe alone leaves the race. Cover changes after the last client
observation, including both first submit and retry, with actual target and
sibling byte assertions. Preserve composer-only authority and no menu answers.

### F2 — P2: real capture discards trailing prompt spaces that the passing stub retains

**Evidence:** `gateway/src/adapters/tmux_client.js:41–43`;
`gateway/src/adapters/base_adapter.js:60–67,128–131,154–155`;
`tests/gateway/prompt_submission.test.js:30–32,62–70,273–279`.

The current capture command omits tmux's trailing-space-preservation option.
The hash-verified upstream `cmd-capture-pane.c` enables
`GRID_STRING_TRIM_SPACES` for this command. A prompt `white space  ` arrives
at the terminal with both final spaces intact inside paste framing, but the
real captured row is `› white space`. The helper rejects it as `unknown_state`
and sends no Enter. The literal-space GREEN test supplies an untrimmed
fabricated capture, so it misses the actual behavior. This also undermines
Claude's end-cursor equality when trailing spaces are present.

**Correction:** make observation and provider draft extraction preserve and
positively identify meaningful trailing spaces, using the actual tmux capture
semantics and measured composer cursor/layout. Do not merely weaken exact
prompt equality or infer text from the submitted payload. Add end-to-end
transport/helper tests using real capture for leading/trailing spaces and
blank/multiline endings, retaining zero intermediate submits and exact bytes.

### F3 — P2: decision detection matches ordinary history and prompt text

**Evidence:** `gateway/src/adapters/base_adapter.js:18,50–53`.

The decision regex runs over the entire visible snapshot before provider
composer classification. A valid empty Codex composer beneath historical
`Permission required (historical output)` receives no prompt and returns
`decision_required`. With clean history, the ordinary draft
`explain permission required` is pasted literally but then receives no submit
for the same reason. Both outcomes were reproduced with real tmux captures.
Excluding scrollback does not exclude older conversation text still visible
in the viewport. These words do not prove an active interactive decision.

**Correction:** identify active decision surfaces through provider-specific
structure, position and focus evidence, separately from transcript/draft text.
Add distinguishing tests with identical words in history, a pending draft and
an actual active menu. Keep active, unknown and changed menus closed; do not
remove negative menu protection to fix these false refusals.

### F4 — P1: Antigravity asks have no positive functioning profile

**Evidence:** `gateway/src/adapters/base_adapter.js:97–118`;
`gateway/src/adapters/antigravity_adapter.js:376`;
`gateway/README.md:80–85`; submission's pending-prerequisite checklist.

The adapter calls the common helper, but every unrecognized Antigravity
composer reaches unconditional `unknown_state`. Refusal fixtures establish
safe absence of input, not functional prompt submission for this executable
provider. This is acknowledged unimplemented functionality, separate from
Claude's operator-blocked live evidence. The genuine installed `agy` binary
was independently hash-checked; availability is not the missing requirement.

**Correction:** obtain version-bound renderer source or a root-authorized
owned capture, implement its actual ready/pending/accepted and decision states,
and add positive submission plus distinguishing refusal/echo/freshness tests.
Do not borrow another provider's banners, fabricate acceptance or treat
fail-closed refusal for every prompt as completion of the five-provider scope.

### F5 — P1: required combined gate is failed and incomplete

**Evidence:** `workspace/root-a04-gate-finished.json`;
`tests/structure/test_readme_env_parity.py:30`;
`gateway/src/config.js:202`; root `README.md:488` runtime environment table.

The recorded full gate exits 1. Structure tests fail because the root README
omits the newly parsed `AGENTS_TMUX_SUBMIT_DELAY_MS`. Documenting it only in the
Gateway README does not satisfy the existing repository environment contract.
The Gateway lane also fails with `command left processes in its owned process
group`, despite its raw TAP assertions reporting no failures. That cleanup
failure is not attributed to a particular new or existing fixture by the
provided report; it cannot be dismissed as unrelated or credited as success.
Required Redis tests were unavailable and did not run.

**Correction:** reconcile the root README environment table; identify the
surviving Gateway process and owning fixture/server, then fix or correctly
scope its lifecycle without weakening the process-cleanup gate. Root must run
the next exact, hash-bound candidate solo on the host with the required
compatible isolated runtime and disposable Redis 7. Preserve and attribute
this failed attempt; do not retry to green without explaining the cleanup
failure. Keep existing skip identities/budgets and obtain a complete result.

## Acceptance and remaining evidence

| Requirement | Disposition |
|---|---|
| Sheet RED tests fail before implementation and pass afterward | PARTIAL: recorded RED/GREEN logs and hashes corroborate TDD, but the capture/menu/race regressions above are absent and five-provider positive functionality is incomplete. |
| Operator live `agent_spawn`/`agent_ask` for Codex and Claude, both working without manual Enter, pane snapshots recorded | NOT RUN for Codex; DEFERRED for Claude while invocation is prohibited. Neither is satisfied by fixtures. |
| No adapter retains its own prompt `send-keys` | SOURCE SATISFIED: all five asks use the shared helper; launch text/Enter is separate and control/newline rejection is implemented. |
| Negative menu, busy, unknown, concurrent and uncertain-delivery coverage without decision keys or false success | PARTIAL: sampled negative cases and same-process alias locking are covered; F1 shows the menu/synchronization write race still delivers Enter. No guarantee for separate Gateway processes is established by the module-local Set. |
| Measured live provider versions and ready/accepted markers | UNMET: static source provenance is corroborated; no live-version/marker observations exist. Antigravity additionally lacks a positive source profile. |
| Measured settle default from scope item 1 | UNMET: 150 ms is simulation only. Measure allowed provider timing and retain explicit Claude deferral. |
| Full combined gate green, skips within budget | FAILED: F5 and exact accounting below. |
| Transport pins/build/checksums agree on `.2` | EVIDENCED for Linux: archive, patch, unchanged capture source, builder pins, workflow link, helper/fixtures and saved binary agree. Native Darwin output is NOT BUILT/NOT RUN. |
| Named raw-input transport RED/GREEN; unchanged retained capture | EVIDENCED in preserved hash-checked logs: runtime RED 1 pass/5 fail; GREEN 6 pass; retained/runtime GREEN 62 pass, no skips. Source and raw-byte assertions were inspected; not rerun by this reviewer. |
| Guarded paste and bounded public refusal | SOURCE/FIXTURE EVIDENCED: actual framing guard and no raw fallback; emitted public error-envelope tests cover the exact reason allowlist and unknown-error privacy. Final-key safety remains F1. |
| Transport combined gate and whitespace check | Gate FAILED; reviewer `git diff --check` PASS. Existing Darwin/live-provider verification gaps remain visible. |

Root must retain the no-Claude prohibition. Complete the allowed Codex live
check and timing evidence when coordinated; Claude remains DEFERRED until the
operator changes that instruction. This review does not authorize such a
change. Native Darwin build/runtime behavior was not measured: Linux proof,
Darwin builder source and synthetic relay tests are not native execution.
The transport addendum explicitly preserves existing Darwin gaps; this review
does not silently add or waive a native release requirement or claim Darwin
support verified.

## Exact completed gate accounting

The completion marker existed before any reviewer test/probe execution.
Its SHA-256 is
`f978b299c892c7aadd1913436424bdf87a88f9f90c255de65f76f0d631df0a5a`.
The independently verified full-log SHA-256 is
`7503e6f25bde41c7153738d4b62de910e5a0fd6030bb1a0a8f8baa04602a8fc0`.

Official report: **status failed, exit 1; tests 987, passed 982, failed 2,
skipped 3**. Those are the supervisor's authoritative aggregate counts,
including the failed Gateway lane's synthetic failure count. They must not
be replaced with the larger raw TAP assertion total.

| Lane | Recorded outcome |
|---|---|
| lock.python, release.candidate, lint.python, lint.gateway, smoke.mcp, policy.registry | Passed; one command check each. The release verifier passing is not a release claim. |
| test.structure | Failed: 446 passed, 1 failed, 0 skipped. |
| test.gateway | Failed cleanup: official 0 passed/1 failed/0 skipped/1 test. Raw runner separately reports 1,664 passed/0 failed/9 skipped/1,673 tests; these do not make the lane passed. |
| test.e2e | 25 passed, 0 failed/skipped. |
| test.cli | 424 passed, 0 failed/skipped. |
| test.langgraph | infrastructure_unavailable: 81 passed, 3 skipped, 0 failed, 84 collected. |
| test.redis-live (required) | infrastructure_unavailable; 0 tests. Not passed. |
| test.real-agents (optional-service) | infrastructure_unavailable; 0 tests. Not passed and not live A04 acceptance evidence. |

The nine raw Gateway skips exactly match its unchanged Postgres allowlist:
create/read aggregate; status update changed row; foreign-key rejection;
append-only policy decisions; adversarial literal round-trip; NULL/string-null;
named/positional parameters; insert/update/delete changes; non-finite literal
rejection. The three LangGraph skips exactly match its unchanged allowlist:
`tests.test_gateway_client::test_real_gateway_smoke`,
`tests.test_plan_refine_graph::test_real_gateway_dry_run_smoke`, and
`tests.test_temporal_crash_recovery::test_temporal_worker_restart_replays_without_duplicate_implement_or_implicit_approval`.
Their allowed identities do not turn infrastructure-unavailable lanes into
executed live checks. No skip budget was expanded.

## Independent checks and coverage limits

After the completion marker, ran only the concrete-risk probes:

```bash
node /tmp/ao-a04-review-probes.mjs /home/carase/git/personal/AO/workspace/clones/wt-v6-a04
```

The sandbox attempt failed because Unix-socket access was denied. The same
scoped command ran on the host under execution approval and exited 0 after
asserting all five bug observations above and generated contract/doc currency.
This is successful reproduction of defects, not five feature passes.
Every native scenario used an explicit reviewer-owned `/tmp` socket; every
server was stopped with its socket-scoped `kill-server`, whose status was
asserted. No default/user server or provider was used.

| Probe | Actual terminal observation |
|---|---|
| menu-race | Framed literal `Enter`, then CR with menu visible; `acceptance_uncertain`. |
| sync-race | Same target bytes; sibling receives only CR; `acceptance_uncertain`. |
| trailing-spaces | Exact framed `white space  `; captured `› white space`; no CR; `unknown_state`. |
| old-decision-history | No bytes/no CR; `decision_required` despite ready empty composer. |
| decision-word-prompt | Exact framed `explain permission required`; no CR; `decision_required`. |

Reviewer probe SHA-256:
`2677efdd336d257389199bdeeaa04e6e80587b65ac7f77c4f748b22b716c9289`.
Raw receiver `/tmp/ao-a04-review-terminal.py` SHA-256:
`1e5f197ac607372db5a6a9249f286822ebc58ba1140988b6d87980e5144acad3`.
Linux runtime SHA-256:
`3d37a94099286f1284373271ed7da3dac69e04fb1dba88bdb6068cfb66ed1428`.

The upstream archive is hash-verified against the manifest; inspected its
paste, capture and key-routing sources. Existing capture extension is
byte-identical to HEAD, SHA-256
`4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`.
Rechecked Claude's installed binary hash and all fixture byte anchors as
read-only data, plus the extracted composer module hash. Inspected the saved
pinned Codex/OpenCode renderer sources and installed pi source/package version.
These establish source provenance only; remote source authentication was not
independently refreshed and no live provider was executed.
The generated Markdown catalog and `catalogProjectionDigest()` match the
committed projections without writing regenerated output.

Preserved evidence hashes corroborate the initial shared RED (7 pass/15 fail),
five-adapter RED (0 pass/5 fail), continuation Claude RED (23 pass/6 fail) and
final focused GREEN (125 pass, no failures/skips). These are historical coder
runs, not reviewer reruns or independent live acceptance. Full source review
and the focused boundary checks are complete within this verdict's stated
coverage; this is not exhaustive model/provider/platform execution testing.

Only this new immutable verdict and reviewer scratch fixtures were written.
No production/policy edits, Claude invocation, subagents, staging, commits,
pushes or integration occurred. Root owns review indexing, artifact
publication and subsequent evidence commits. Corrections require the next
immutable trial and a fresh independently assigned reviewer session.
