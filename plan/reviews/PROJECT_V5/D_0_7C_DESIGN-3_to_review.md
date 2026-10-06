# Review Submission — Project V5 D/0/07c Design Trial 3

## Status

`ready_for_review`

This is the design-only resubmission after the orchestrator adjudicated the
concurrent Design Trial 2 verdicts:

- reviewer A:
  `3d08808d5c73c23d10819ef90316fb20dded1ec8`,
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-2_result.md`,
  `reviewed_OK`, zero findings;
- reviewer B:
  `ed5960c4f7d84152e86f0e8bc84d51f0f439e78c`,
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-2_result_b.md`,
  `reviewed_KO`, two P0s and three P1s; and
- adjudicated lane result: KO.

Reviewer A's and reviewer B's shared conclusion that the Design Trial 1
PTY/source omissions are closed is preserved. This trial addresses only
reviewer B's Design Trial 2 findings. None of those findings is disputed.

## Candidate

- Design commit:
  `55488cf1373d336df052df50177681f3138ec968`
  (`design(v5): close design trial 2 reviewer B findings for D/0/07c`)
- Parent:
  `ed5960c4f7d84152e86f0e8bc84d51f0f439e78c`
- Tree:
  `c89d9958da97c0d2d07ec744f8b41d798c9f8fc8`
- Candidate range:
  `ed5960c4f7d84152e86f0e8bc84d51f0f439e78c..55488cf1373d336df052df50177681f3138ec968`
- Changed path:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`

## Finding closure map

| Finding | Closure |
|---|---|
| P0-1 — evidence-returning effect was not conditional authority | The universal rule now requires a trusted conditional compare-and-effect primitive. It takes expected binding plus `G`, compares before effect linearization `E`, shares exclusion and total order with effect-side revocation `V`, performs zero of that effect on mismatch or `V < E`, and returns the exact committed count. `E < V` is authorized and cannot be retroactively erased. Effect-then-report, self-report, and unlocked `G.live` checks are explicitly non-authorizing. Queue admission, PTY attempts, relay transfers, both barrier steps, capture, readiness, and provider-bearing sideband writes participate in the same rule. |
| P0-2 — universal terminal-changed/no-transfer contradicted frozen PTY outcomes | `REJECT` is now effect-level and cause-specific. Before first positive write `F`, utility/process mismatch maps to `SESSION_PORT_IDENTITY_CHANGED`, foreground mismatch to `SESSION_PORT_NOT_FOREGROUND`, PTY/pane/relay/dimension mismatch to `SESSION_PORT_TERMINAL_CHANGED`, and known close to `SESSION_PORT_TERMINAL_CLOSED`. After an authorized prefix, the next rejected attempt writes zero additional bytes, preserves only that prefix, stops all later writes, and returns `SESSION_PORT_WRITE_ABORTED`; success still commits only at `R`. |
| P1-1 — inventory omitted sideband authority, concrete readiness, and non-socket namespace entries | R1 is explicitly scoped to terminal/provider transfer and separately requires retained fd 4/5, exact `ASP1` tag/sequence, and module-private channel-to-`G` binding. Readiness is a conditional `activate(G, expectedBinding)` transition that emits provider-free readiness only through retained fd 3 at `E_ready < V`; `claim` settles under the parent lock, and bootstrap failure has exact existing dispositions despite having no method response. Relay key, relay socket, owned runtime directory, and tmux socket each have a retained identity and separate conditional-removal/preservation row. |
| P1-2 — alternatives were underdetermined; namespace rules conflicted; tmux choice was redundant | Decisions 1 and 5 now enumerate the full and narrowed binding tuples, trusted principal/trust boundary, exact transfer and producer-attribution unit, compare-before-effect suppression, partial counts, descendants, buffering, and mixed-generation behavior. Namespace rules are explicit alternatives: expected-object conditional removal or continuously proven kernel-enforced custody; loss of either preserves/rejects. Decision 2 always supplies the retained tmux-server connection and lifetime-stable IDs, so tmux retirement no longer consumes Decision 3; Decision 3 is only the dynamic utility/process tree and forced relay target. |
| P1-3 — four proof rows were masked, used the wrong outcome, or omitted producer timing | The R1 proof uses two connections from the same exact relay process so intact R2 facets remain valid. The foreground case expects `SESSION_PORT_NOT_FOREGROUND` before `F`, with separate identity and post-prefix abort cases. PTY source has distinct bytes-produced-before and bytes-produced-after transition cases. The close-frame case keeps `G` live so R4 cannot reject first. New isolated cases also kill send-then-report, unlocked effect/revocation ordering, fd-5 substitution, check-then-publish readiness, and each exact namespace target. |

## Ratifiable final operator decision set

The design makes no choice. Ratifying one option for each numbered decision
commits the operator to exactly the following binding strength:

| Option | One-line ratification commitment |
|---|---|
| 1A — full conditional relay authority | Supply on Linux and Darwin a kernel or helper-controlled principal outside relay control which conditionally receives/sends each exact byte range or barrier envelope against the accepted socket, kernel peer tuple, full relay process/tmux tuple, and live `G`, suppressing on failure and returning the exact count; relay self-attestation is excluded. |
| 1B — exact relay-contract narrowing | Amend the parent so authority is exactly original connected-socket continuity, handshake-time kernel pid/uid/gid, successful single-use `ASR1` proof, accepted tmux IDs, and live `G`; remove live start/executable/argv/cwd/pgid/sid as transfer prerequisites while retaining per-range `E`/`V` ordering and forbidding reconnect. |
| 2A — retained tmux extension | Supply one retained accepted-server connection and one conditional server operation returning identity, 120x40, history 400, metadata, `G`, and exact capture bytes at one `E`; use that connection and accepted stable IDs for pane/session/server retirement. |
| 2B — explicit capture-contract amendment | Replace the frozen separate stock commands with a specified conditional retained-server transport preserving the complete record, generation order, byte oracles, and retained-connection retirement; sequencing stock tmux 3.6 commands is insufficient. |
| 3A — retained dynamic process domain | Supply a cross-platform kernel-retained domain which contains the utility root/group and every descendant from creation plus an exact retained relay target, so signals cannot resolve reused PID/PGID values. |
| 3B — preserve unresolved processes | Amend the no-process-leak criterion so retained-descriptor retirement plus sticky rejection is complete when exact process/tree authority is unavailable, and perform no numeric signal. |
| 4A — conditional-object namespace removal | Supply one Linux/Darwin expected-object conditional `unlink`/`rmdir` mechanism for each exact relay key, relay socket, runtime directory, and tmux socket identity. |
| 4B — kernel-enforced exclusive custody | Hold a kernel-enforced directory-mutation domain from before creation through removal in which only cleanup can mutate retained parents; relay, tmux, attach, and other same-uid actors receive no mutation authority, and any custody gap preserves/rejects. |
| 4C — preserve unresolved namespace entries | Amend the key/socket/runtime-directory leak-free criterion so entries without proven exact removal authority or custody remain and cleanup rejects without deleting replacements. |
| 5A — full conditional PTY authority | Supply a trusted conditional source/write facility for the full frozen utility/helper/PTY/dimensions/foreground tuple and live `G`, with exact partial counts and production-time per-byte provenance limited to the bound utility or already-admitted supervised descendants in the accepted foreground group/session. |
| 5B — exact PTY-contract narrowing | Amend the parent so per-effect authority is exactly retained PTY master/slave identity, historical authenticated readiness utility pid/start/binding digest, retained fd-4/tag/sequence channel, and live `G`; remove live process/winsize/foreground/producer checks while retaining conditional `E`/`V` ordering and exact counts. |

Decisions 1, 2, and 5 are required for the frozen positive 24-byte snapshot;
Decision 5 also governs positive D/0/07b prompt writes. Decisions 3 and 4
govern the no-process/no-key/no-socket/no-runtime-directory-leak criterion.
Tmux retirement is resolved by Decision 2 and is not a separate Decision 3
choice.

## Proof-isolation corrections

- R1 C1/C2 uses the same exact relay process, peer tuple, tmux tuple, valid
  R2 facet authority, and live `G`; only the connection object differs.
- Relay send-then-report and unlocked `G.live`-then-send are separate
  mutations with zero-wire-byte oracles.
- PTY write has separate pre-`F` foreground, pre-`F` utility identity, and
  post-`F` short-prefix cases with the exact frozen dispositions.
- PTY source fixes provenance at production per byte, tests invalid
  after-transition bytes and valid before-transition buffered bytes
  separately, and tests dequeue liveness independently.
- `RELAY_DATA_CLOSE` is restored only while `G` is live; R2 is the sole
  suppressing guard before direct descriptor retirement.
- Capture geometry begins from a reachable conditional-record baseline, and
  generation mismatch still stops at record acceptance before R4 settlement.
- R4 settlement receives a complete candidate produced while G was live,
  then injects it directly after revocation so no producer-side guard masks
  the settlement mutation.
- Process/tree/tmux and namespace proofs select one concrete target per run;
  process-group reuse is deterministic rather than host-allocation timing.

## Evidence and verification

- `tmux -V` — `tmux 3.6`.
- The installed `/usr/share/man/man1/tmux.1.gz` states that session and pane
  IDs are server-unique and unchanged for object lifetime; it documents
  `kill-pane -t`, `kill-session -t`, and targetless `kill-server`. This
  supports resolving tmux retirement through Decision 2's retained server
  connection. No tmux server or session was started.
- `git diff --check
  ed5960c4f7d84152e86f0e8bc84d51f0f439e78c..55488cf1373d336df052df50177681f3138ec968`
  — passed.
- `git diff --name-status
  ed5960c4f7d84152e86f0e8bc84d51f0f439e78c..55488cf1373d336df052df50177681f3138ec968`
  — exactly one modified design document.
- No source, test, parent sheet, frozen contract, codec, port surface,
  adapter/service/catalog splice, provider launch, D/0/07d, integration,
  promotion, or release file changed.
- No implementation or runtime test was performed; this trial is design-only.

## Review request

Review whether the amended design closes reviewer B's two P0 and three P1
findings without weakening the binding rule or reopening the independently
confirmed Trial 1 closures. Implementation remains blocked pending reviewed
design approval and explicit operator ratification of one option for each of
the five decisions.
