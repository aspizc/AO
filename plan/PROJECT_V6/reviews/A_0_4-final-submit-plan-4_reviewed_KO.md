# A/0/04 final-submit guard refinement — plan review, trial 4

## Verdict

**KO — the guarded final-Enter direction fixes F1 correctly in principle, but
the proposal leaves its decisive contract open.** It defers evidence
encoding, command shape and failure semantics to review. Those decisions
are settled below as numbered corrections. The next plan trial must record
them as a bound contract before any runtime change. Trial-1 KO and F1 stay
OPEN. A/0/04 and its runtime prerequisite remain **PLANNED** for this
refinement. This verdict provides no implementation, integration, promotion
or release evidence.

- Base/HEAD: `b91a55b9a3c1cb84af64c4091981086d72e00e9f`.
- Reviewer: separately assigned Claude Code session (Opus 5.5, medium effort
  as assigned). I did not write the checkpoint, the request or the candidate.
  No subagent, provider, Gateway spawn or live tmux server was used. Exact
  Gateway trace and session metadata are not exposed to this session, so I do
  not claim them as verified.
- Request: [trial-4 request](A_0_4-final-submit-plan-4_to_review.md), SHA-256
  `669b61373e6d2f24a2d88f14bc4f2537c91bc6c3cc3d6c6eae1a34a1c37471b5`.
- Proposal: [design checkpoint](A_0_4-build-4_final-submit-design_checkpoint.md),
  SHA-256 `a2c6cd625e88da3e8141feb76026f73de937768f230e34ec198c2fee5c9bf9e0`.
- Also read: [A/0/04](../A/0/04.md), [transport addendum](../A/0/04-transport.md),
  [trial-1 KO](A_0_4-1_reviewed_KO.md), [plan-3 OK](A_0_4-plan-3_reviewed_OK.md)
  header, AGENTS.md, the uncommitted `.2` patch (SHA-256
  `c488dccadb08db45c00d7a935f9cfd00735d744d0a68286ef683869e152a74c2`, matches
  manifest), `cmd-agents-capture.c`, and the current `tmux_client.js` and
  `base_adapter.js` call sites. I read these files only. The coder's F2/F3
  edits are out of scope and were not reviewed.
- Upstream source: I extracted the existing local archive
  `/tmp/ao-a04-runtime-build-vl_1pgz1/tmux-3.6a.tar.gz` into reviewer scratch.
  Its SHA-256 `b6d8d9c7…3f3759` matches the manifest. I inspected
  `cmd-send-keys.c`, `cmd-capture-pane.c`, `cmd-paste-buffer.c`, `window.c`
  and `input-keys.c`. I did not build or run anything.

## What the source settles

- **The visible-grid serialization can be reproduced exactly at enqueue.**
  `capture-pane -N -T` without `-e`/`-C`/`-J`/`-M`/`-a` gives flags `0`.
  It serializes rows `hsize … hsize+sy-1` of `wp->base.grid` with
  `grid_string_cells(gd, 0, i, sx, &gc, 0, s)` and appends `\n` to every row.
  `cmd-agents-capture.c` already calls the same function with flags `0`.
  A new command can recompute these bytes in its own exec with no
  normalization. With flags `0`, `lastgc` has no effect.
- **The `-p` path changes bytes, but `-b` does not.** With `-p`, the final
  `\n` is stripped and the client re-adds one. The current client then
  decodes stdout as UTF-8 (`tmuxSync`, `encoding: "utf-8"`), so invalid bytes
  become U+FFFD. Without `-p`, `capture-pane -b <name>` stores the exact
  buffer server-side through `paste_set`, with no client round trip.
- **A plain Enter is always one byte.** `input_key` writes plain `C0_CR` as
  the single byte `0x0d` before it checks any extended-key or kitty mode.
  Writing `0x0d` only to the target is byte-identical to an ordinary
  unmodified Enter on the target.
- **Sibling fan-out lives only in `window_pane_key`.** That function calls
  `window_pane_copy_key` when the target has `synchronize-panes`. Calling
  `input_key_pane` or `bufferevent_write(wp->event, …)` directly cannot reach
  a sibling. The `.2` paste guard already uses this structure.
- **The grid can be stale.** `window_pane_read_callback` parses and then
  disables `EV_READ` until backpressure clears. Provider output can sit
  unread in the pty master while tmux's grid still shows the classified
  composer. In that case the F1 race comes back in a smaller window.

## Numbered corrections

1. **Use a dedicated command and leave `send-keys` unchanged.** Do not
   extend `cmd-send-keys.c`. That command parses key arguments, repeat
   counts, `-K`/`-X`/`-M`/`-l`, and mode key-table dispatch. A guarded mode
   inside it would need its own exclusion checks for each of these, and it
   would change upstream usage and parsing. Add a separate
   `agents-submit-v1` command (patch-added source plus a `cmd_table` entry,
   in the same style as `agents-capture-v1`). It takes no key argument and
   can only write `0x0d` to the resolved target, through
   `input_key_pane(wp, '\r', NULL)` or `bufferevent_write`, never through
   `window_pane_key`. Prove `send-keys` and `paste-buffer -G` are unchanged
   by source identity, plus one test showing that ordinary `send-keys Enter`
   with `synchronize-panes` still fans out.

2. **Bind the evidence server-side, not through the client.** Specify the
   exact chain:
   - Capture with `capture-pane -b <owned> -N -T -t %<id>` (no `-p`).
   - Read that buffer back with `save-buffer -b <owned> -` as a raw Node
     `Buffer`, not a UTF-8 string.
   - Classify only those bytes, and pass the same buffer name to
   `agents-submit-v1`.

   The command recomputes the flag-`0` visible serialization, including the
   per-row `\n`, and compares length and then bytes with `memcmp`. No
   evidence is uploaded from the client and no hex is placed in argv. A
   120×40 UTF-8 screen in hex would exceed tmux's per-command message limit.
   Record that SGR attributes are outside the evidence, so the composer
   classifier must not depend on colour or reverse video.

3. **Settle exact identity and state arguments.** Required equality:
   - server pid
   - pane id `%N`
   - pane pid (catches `respawn-pane`)
   - `screen_size_x/y`
   - `wp->base.cx`/`cy`
   - evidence bytes

   Required absolute state:
   - not exited
   - `fd != -1`
   - no `PANE_INPUTOFF`
   - empty `modes`
   - `synchronize-panes` off on the target
   - `MODE_BRACKETPASTE` set on `wp->screen`

   Sibling safety comes from correction 1, so window and session ids are
   not required. Name the argv flags and fix their numeric ranges, following
   `args_strtonum` in `agents-capture-v1`.

4. **Refuse while output is pending.** Refuse when `wp->event` input has
   unparsed bytes or `ioctl(wp->fd, FIONREAD)` reports pending pty output.
   Test this with fault injection where that is deterministic. Otherwise
   record it as source-reviewed and state the remaining residual explicitly:
   a provider can change state without writing output, and no terminal guard
   covers that (Rule 12).

5. **Make evidence single-use.** In the same exec, the command looks up and
   deletes the named evidence buffer on every path, success or refusal. That
   way stale evidence cannot authorize a second CR, and the retry must take
   a fresh capture. The adapter still deletes the buffer in `finally` and
   tolerates a missing buffer. Use unique names per operation, as the
   proposal already says.

6. **Check capability before any input.** Before creating any buffer or
   pasting, verify the exact pinned runtime version or capability. A `.2`
   runtime accepts `paste-buffer -G` but cannot guard the final Enter. On
   such a runtime the prompt would be pasted and then left unsubmittable.
   Refuse with `paste_unavailable` and write zero bytes. Never fall back to
   `send-keys Enter`. The launch-command path is a separate contract and must
   say so.

7. **Map failures to deterministic reasons.** Only the exact fixed
   diagnostic (for example `agents: guarded submit refused`) with tmux exit
   status 1 proves that zero CR bytes were written:
   - First submit: map it to `unknown_state`. The pasted draft may stay in
     the composer. Do not resend.
   - Retry: map it to `acceptance_uncertain`, because the first CR was
     already delivered.

   Any other failure might have delivered the CR: spawn error, timeout,
   signal, a different message or non-1 status. Map these to
   `acceptance_uncertain` with no retry. None of these may become
   `not_submitted`. Test each mapping against the emitted public error
   envelope.

8. **Keep version and history consistent.** Bump to `3.6a-agents.3` in the
   patch name, manifest, builders, pins and fixtures, as the `.1 → .2`
   change did. Keep exactly one active patch in the manifest. `.1` was
   replaced, but `.2` was never committed. Preserve the `.2` patch bytes and
   the trial-1 binary hash as named evidence outside the build input set, so
   trial-1 stays reproducible and the builders cannot pick up a stale patch.
   Leave the `agents-capture-v1` source byte-identical. Native Darwin stays
   NOT BUILT/NOT RUN.

9. **Make the TDD list concrete.** Keep the proposal's raw target and sibling
   byte matrix for first submit and retry. Add these named cases:
   - pane respawn and pid change
   - evidence buffer changed between capture and submit
   - evidence reuse after one successful CR
   - missing buffer
   - `.2` runtime refusing before paste
   - non-diagnostic failure mapped to `acceptance_uncertain`
   - sibling receives zero bytes on success when its own pane option is set
     but the target's is not

   Every state change must be made after the evidence capture and confirmed
   as parsed before the submit runs. Each RED case must run first against
   `.2`.

## Disposition

The proposal's core is sound: compare classified bytes and state inside the
enqueuing exec, write one CR, refuse with zero bytes, no fallback, and keep
composer-only authority. Submit the next plan trial with corrections 1–9
written into A/0/04 or its transport addendum. A fresh, independently
assigned reviewer session must review it. F2, F3 and process attribution are
not affected by this verdict.

Only this new verdict file was written in the repository. Reviewer scratch
extraction is outside the tree. No production, policy, test or patch edits;
no staging, commit, push, Gateway call or provider launch. Root owns
indexing this verdict in `reviews/README.md`.
