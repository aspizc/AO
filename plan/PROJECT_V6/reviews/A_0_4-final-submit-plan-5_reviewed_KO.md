# A/0/04 final-submit guard refinement — plan review, trial 5

## Verdict

**KO. CP3 binds eight of the nine trial-4 corrections as a usable contract.
One runtime predicate is wrong against the pinned source.** Correction 4 of
the trial-4 KO asked for a refusal when the pane has *unparsed* input. CP3 §4
instead requires "zero bytes in the bufferevent input". In tmux 3.6a that
buffer also holds bytes that tmux has *already parsed* but has not yet
delivered to a control-mode client or a pipe. The Gateway's own retained path
attaches such a client. Two smaller contract gaps are listed below; they must
be closed in the same trial. Trial-1 KO and F1 stay OPEN. A/0/04 and its
runtime prerequisite remain **PLANNED** for this refinement. This verdict
gives no implementation, integration, promotion or release evidence, and it
authorizes no runtime change.

- Base/HEAD: `2b920a84ce46f993806e2ee8db17c7a10d98ab24`, branch
  `feat/V6-A-0-04-safe-submit`. The tree is dirty with uncommitted A/0/04
  work. This review covers only the CP3 text named below.
- Reviewer: separately assigned Claude Code session (Opus 5.5). I did not
  write CP3, the requests or the checkpoint. No subagent, provider inference, Gateway
  spawn, tmux server, build or test was used. Exact Gateway trace/session
  metadata is not exposed to this session and is not claimed.
- Request: [transport-addendum request](A_0_4-final-submit-plan-5_transport-addendum_to_review.md),
  SHA-256 `ff7814e76bbba38e800f026ca74a6331f43bf346491d6fea0e80f0fd0e22bdb6`.
- Reviewed contract: [CP3 in 04-transport.md](../A/0/04-transport.md#cp3--final-enter-evidence-binding-plan-design-trial-5).
  The working-tree file SHA-256 is
  `7f0f505310ef4173272355b1eb59db9145f8fc6380c20df42e9c676b95fb56b1`, which
  matches the request. `git diff --check` on it is clean.
- Supporting material only:
  - [standalone trial-5 proposal](A_0_4-final-submit-plan-5_to_review.md)
    (`e26752b9…f9b6a6`), whose text matches CP3 §1–9;
  - [focused checkpoint](A_0_4-build-4_correction_checkpoint.md)
    (`2f7f6a61…1875d6`).
- Also read:
  - [trial-4 KO](A_0_4-final-submit-plan-4_reviewed_KO.md);
  - [A/0/04 sheet](../A/0/04.md) scope 1–6, including its public reason
    allowlist;
  - AGENTS.md;
  - the transport addendum CP1/CP2 prose;
  - `gateway/vendor/tmux-agents/` builders and manifest;
  - the retained control-mode handshake in
    `gateway/src/adapters/process_supervisor_helper.py:4305-4345`.
- Pinned upstream source: I extracted
  `/tmp/ao-a04-runtime-build-vl_1pgz1/tmux-3.6a.tar.gz` (SHA-256
  `b6d8d9c7…3f3759`, matches the manifest) into reviewer scratch. I read
  `window.c`, `server-client.c`, `control.c`, `input.c`, `format.c` and
  `arguments.c`. Nothing was built or run.

## Hash and pin facts verified

| CP3 claim | Observed |
|---|---|
| `.2` patch `c488dcca…74c2` | `gateway/vendor/tmux-agents/tmux-3.6a-agents.2.patch` matches |
| historical binary `3d37a940…1428` | `/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux` matches |
| `cmd-agents-capture.c` `4d80a861…27e2` | matches |
| builders take one named patch | `build-offline.sh:55-62` names one patch file and checks its hash; there is no glob |

## Correction coverage

| Trial-4 item | CP3 | Result |
|---|---|---|
| 1 dedicated command | §1 | **Met.** Separate `agents-submit-v1`; there are no key, repeat, mouse, literal or mode arguments. It writes one `bufferevent_write(wp->event, "\r", 1)`, never `window_pane_key`. `cmd-send-keys.c` and the `.2` `cmd-paste-buffer.c` stay byte-identical. The sibling fan-out regression is named. |
| 2 server-side evidence | §2 | **Met.** Uses `capture-pane -b -N -T` with no `-p/-S/-E/-e/-C/-J/-M/-a`, then a raw `save-buffer` with `encoding: null`. Invalid UTF-8 refuses with `unknown_state`. The exec reserializes with flag `0` and LF per row, then checks length and `memcmp`. No upload and no hex in argv. SGR is excluded. |
| 3 identity/state | §3 | **Met.** Flags and ranges are fixed, and the regex for the owned name is anchored. The literal `%N` pane id is canonical. The fixed `display-message` format maps to the exact fields in source. `#{pid}` is `getpid`. `#{pane_pid}` is `wp->pid`. `#{cursor_x/y}` is `wp->base.cx/cy` (`format.c:1711-1724`). `#{pane_width/height}` is `wp->sx/sy`, which `window_pane_resize` keeps equal to the base screen size because it calls `screen_resize` synchronously (`window.c`). The absolute-state list is complete. |
| 4 pending output | §4 | **Not met: wrong predicate.** See correction 1. The FIONREAD half, fault-injection-or-SOURCE-REVIEWED rule and provider-internal residual are correct. |
| 5 single-use | §5 | **Met.** The buffer is consumed at exec entry on every exec path, with local copy/free. Pre-exec parser and target errors are kept separate. Adapter `finally` tolerates only the exact missing-buffer diagnostic. |
| 6 capability first | §6 | **Partly met.** Ordering, `.2` → `paste_unavailable` with zero bytes, no fallback and launch separation are all correct. The probe mechanism is not bound; see correction 2. |
| 7 failure mapping | §7 | **Met.** Status 1 plus the exact diagnostic is the only zero-CR proof: first attempt → `unknown_state`, retry → `acceptance_uncertain`. Every other failure → `acceptance_uncertain` with no retry. `not_submitted` only after two delivered Enters with unchanged composers. All reasons are in the sheet §6 allowlist. |
| 8 pins/history | §8 | **Mostly met.** One active `.3` patch, synchronized pins and fixtures, and capture source identity. Darwin is NOT BUILT/NOT RUN. The location of the preserved `.2` patch is unnamed; see correction 3. |
| 9 TDD | §9 | **Met.** All seven trial-4 named cases are present. Each case confirms the parsed state after capture. RED runs first against `.2`. Focused commands are listed. Live, timing and full-gate ownership stays with root. |

## Source finding behind correction 1

`window_pane_read_callback` calls `input_parse_pane`. That function parses
only the slice from `wp->offset` and advances `wp->offset.used`. It does
**not** drain `wp->event->input`. The buffer is drained only in
`server_client_check_pane_buffer` (`server-client.c:2815-2856`), and only up
to the *minimum* of three offsets:

- `wp->offset`;
- `wp->pipe_offset`, when `pipe-pane` is active;
- every attached control client's `cp->offset` (`control.c:311-331`).

A control client's offset moves forward only when its queued blocks are
written. While it lags or is paused, `EVBUFFER_LENGTH(wp->event->input)`
stays above zero, even though the grid already reflects every byte.

The Gateway's retained path runs `tmux -C new-session -s <target> …`
(`process_supervisor_helper.py:4316-4319`). That is a control client attached
to the session that holds the target pane. Under CP3 §4 as written, any
provider output that the control reader has not yet consumed causes a refusal
on the first attempt, which maps to `unknown_state` with the draft left
pasted. A slow or paused control reader would refuse every submit
indefinitely. This fails closed, with no unsafe CR, but it makes the
contracted transport unreliable in its own deployment topology. It also
departs from trial-4 item 4, which asked about **unparsed** bytes.

## Required corrections

1. **CP3 §4: test unparsed bytes, not the raw evbuffer length.** Replace
   "zero bytes in the bufferevent input" with a check that the parse offset
   has no new data. Concretely: call
   `window_pane_get_new_data(wp, &wp->offset, &unparsed)` and require
   `unparsed == 0`, alongside the existing successful `FIONREAD == 0` check.
   State explicitly that bytes held only for pipe-pane or control-client
   delivery are already in the grid and must not cause a refusal.

   Add two named cases to §9:
   - `guarded_submit_ignores_parsed_bytes_pending_control_client_delivery`:
     a control client is attached to the target session, with delivery
     stalled or paused. Expect exactly one CR, with no refusal, when the grid
     and evidence match.
   - `guarded_submit_refuses_unparsed_pane_input`: inject unparsed bytes
     ahead of `wp->offset`. Expect zero CR.

   Keep the SOURCE-REVIEWED / NOT EXECUTED rule for any case that cannot be
   made deterministic.

2. **CP3 §6: bind the capability probe.** Name the exact mechanism, using the
   pattern already established at `process_supervisor_helper.py:4329-4338`:
   - `display-message -p '#{version}'` must equal exactly `3.6a-agents.3`,
     with status 0 and empty stderr;
   - `list-commands` stdout must contain both `agents-submit-v1` and the
     guarded `paste-buffer` usage that carries `-G`.

   State which process runs the probe (the adapter's tmux client and/or the
   retained supervisor handshake) and when. Before the first buffer of each
   operation is acceptable, or once per accepted server generation if a
   server-pid or generation change forces a re-probe. Say which one. Update
   the retained handshake's hard-coded `3.6a-agents.2` to `.3` in §8's
   synchronized pin list. Add the named case
   `capability_probe_rejects_missing_submit_command_before_buffer`.

3. **CP3 §8: name where the preserved `.2` patch lives.** Give one exact
   repository path outside `gateway/vendor/tmux-agents/`, for example under
   `plan/PROJECT_V6/reviews/evidence/`, and require its SHA-256 to be
   recorded there. Record that the trial-1 binary under `/tmp` is volatile.
   The durable evidence is its recorded hash `3d37a940…1428` plus a
   reproducible rebuild from the pinned archive and the preserved `.2` patch.
   Do not claim the `/tmp` file as retained evidence.

## Non-blocking observations

- `ordinary_send_keys_preserves_upstream_sibling_fanout` is a preservation
  test and is expected to pass on `.2`. Label it so in §9, so that "each new
  regression RED first against `.2`" does not read as a contradiction.
- `tests/gateway/guarded_submit.test.js` falls inside the
  `tests/gateway/**/*.test.js` include of `test.gateway`
  (`ci/suites.json`). Its `inventorySha256` will change, and that inventory
  reconciliation stays with the integrator, as the addendum already says.

## Disposition

Submit trial 6 as a CP3 edit with corrections 1–3 applied. Change nothing
else in §1–9. A fresh, independently assigned reviewer session must review
it. This trial-5 verdict does not authorize implementing `agents-submit-v1`.

Only this verdict file was written. No production, policy, test, patch or
plan edits. No staging, commit, push, Gateway call, provider inference or
tmux execution. The reviewer scratch extraction is outside the tree. Root
owns indexing this verdict in `reviews/README.md` and committing it.
