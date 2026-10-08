# A/0/04 final-submit refinement — proposed contract, trial 5

Proposal only, awaiting a fresh root-assigned independent review. This is not
an implementation verdict or authorization to build. It supersedes the
trial-4 proposal only after independent acceptance; prior evidence stays
immutable. Read [trial-4 KO](A_0_4-final-submit-plan-4_reviewed_KO.md), which
settles the nine corrections incorporated below. Root owns review assignment,
indexing, commits and integration into the transport addendum.

## 1. Dedicated operation and unchanged upstream commands

Add a separate `agents-submit-v1` source and command-table entry using the
existing capture-command registration style. Leave upstream `cmd-send-keys.c`
and the `.2` guarded `cmd-paste-buffer.c` byte-identical. There is no key,
repeat, mouse, literal or mode-command argument. Success enqueues exactly
one `0x0d` through `bufferevent_write(wp->event, "\r", 1)` on the exact
target. Never invoke `window_pane_key` or sibling fan-out.

## 2. Server-owned classified evidence

Each guarded observation creates a unique `agents-submit-<UUID>` buffer with
`capture-pane -b <owned> -N -T -t %N`, without `-p`, `-S`, `-E`, `-e`, `-C`,
`-J`, `-M` or `-a`. `save-buffer -b <owned> -` returns a raw Node Buffer
(`encoding: null`). Decode with fatal UTF-8 decoding for classification;
invalid UTF-8 refuses `unknown_state`, never replacement-character inference.
No client upload, normalized reconstruction or hex-in-argv is allowed.

The submit exec reserializes the visible base grid, rows `hsize` through
`hsize + sy - 1`, using `grid_string_cells(gd, 0, row, sx, &gc, 0, s)`.
Append one LF per row, including the last row. Require equal byte length,
then `memcmp` equality with the same server-side buffer classified by the
client. SGR attributes are outside the evidence; no classifier may depend on
colour or reverse video. Screen bytes and metadata may be read separately,
but all classified values must match together inside submit exec.

## 3. Exact argv, identity and safety checks

Command:

```text
agents-submit-v1 -b <owned> -r <server-pid> -p <pane-pid> -x <width> -y <height> -c <cursor-x> -l <cursor-y> -t %N
```

All flags are required; no positional arguments. `-b` requires the exact
`agents-submit-` UUID naming scheme. `-t` is a literal `%` followed by the
unsigned decimal pane id, with no aliases. Resolve the target and require
that its id equals this literal id. `-r` and `-p` use `args_strtonum` in
`[2, LLONG_MAX]`; `-x`/`-y` in `[1, INT_MAX]`; `-c`/`-l` in `[0, INT_MAX]`,
also requiring `cursor-x < width` and `cursor-y < height`. No permissive
`atoi` or numeric truncation. Expected server pid is `getpid()`, pane pid is
`wp->pid`, dimensions are `screen_size_x/y(&wp->base)`, cursor is
`wp->base.cx/cy`. Capture the expected values before classifying; compare all
of them again in exec. Pane pid equality rejects a respawn with the same id.

Require not exited, `fd != -1`, non-null `wp->event`, no `PANE_INPUTOFF`,
empty modes, target `synchronize-panes` off, and `MODE_BRACKETPASTE` on
`wp->screen`. Window/session ids grant no authority and are not required.

## 4. Pending-output refusal and residual

Before enqueue, require zero bytes in the bufferevent input and successful
`ioctl(wp->fd, FIONREAD, &pending)` with `pending == 0`. Errors, unsupported
ioctl and positive pending counts refuse with the fixed diagnostic. These
checks close known parsed-versus-unread output gaps at the command boundary.
Use deterministic fault injection where available for input/pending output;
if not deterministically exercised, record SOURCE-REVIEWED / NOT EXECUTED
explicitly, never a fixture pass. A provider can change its internal state
without emitting output (including after the final check); no terminal
guard proves the absence of that residual. Do not claim provider-internal
decision atomicity from terminal evidence.

## 5. Single-use consumption and cleanup

At exec entry, look up the named evidence buffer, copy its bytes/length into
command-local storage and delete the named buffer before checking state or
writing. Every exec path consumes existing named evidence, including refusal.
Missing evidence refuses. Each retry takes a fresh buffer and fresh classified
observation; consumed evidence cannot deliver another CR. Free local storage
on all paths. Parser/target-resolution errors that precede exec cannot consume
the buffer: adapter `finally` still deletes every owned buffer and tolerates
only the exact missing-buffer diagnostic. Never suppress other cleanup errors
or replay input after cleanup failures.

## 6. Capability before paste

Before creating any buffer or delivering any prompt byte, require exact
`tmux 3.6a-agents.3` and advertised `agents-submit-v1` plus guarded paste
capability. Unsupported or `.2` runtime returns `paste_unavailable` with
zero input. There is no ordinary-key fallback. Launch-command submission
remains its distinct literal single-line shell contract; this operation
applies only to the classified running-provider composer.

## 7. Deterministic submit failures

All exec refusals before enqueue return status 1 and exactly
`agents: guarded submit refused`. Only that combination proves zero CR:
first attempt maps to `unknown_state`; retry maps to `acceptance_uncertain`
because a prior CR was delivered. The pasted draft may remain; never resend.
Any spawn error, timeout, signal, other stderr or other nonzero status maps to
`acceptance_uncertain` on either attempt, with no retry. A successful transport
still requires fresh positive provider acceptance. Only two confirmed
unchanged-composer observations after successfully delivered Enter attempts
may produce `not_submitted`. Public-envelope tests assert exact fixed code,
message and allowlisted reasons without private bytes.

## 8. Pins and history

Bump the active runtime to `3.6a-agents.3`, using one active `.3` patch in the
manifest and updating builders, pins, workflow and exact-version fixtures
serially with root. Preserve the exact uncommitted `.2` patch as named review
evidence outside the build input set, hash
`c488dccadb08db45c00d7a935f9cfd00735d744d0a68286ef683869e152a74c2`.
Retain the historical binary at
`/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux`, SHA-256
`3d37a94099286f1284373271ed7da3dac69e04fb1dba88bdb6068cfb66ed1428`.
`cmd-agents-capture.c` stays byte-identical, SHA-256
`4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`.
Build only into fresh isolated output; never restart a serving Gateway or
replace a user server. Native Darwin remains NOT BUILT / NOT RUN.

## 9. Named TDD and remaining acceptance

Run each new regression RED first against `.2`, then the new isolated runtime.
Assert actual target and sibling bytes; an unsupported-option reproduction
is not a successful guarded write. First-submit and retry matrices cover:

- `guarded_submit_refuses_changed_menu_or_grid_without_cr`
- `guarded_submit_refuses_cursor_dimensions_mode_input_sync_and_framing_drift`
- `guarded_submit_refuses_respawned_pane_pid`
- `guarded_submit_refuses_changed_evidence_buffer`
- `guarded_submit_consumes_evidence_on_success_and_refusal`
- `guarded_submit_refuses_reused_or_missing_evidence`
- `guarded_submit_refuses_pending_output` (state execution limits above)
- `guarded_submit_writes_one_cr_only_to_target_with_sibling_sync_option`
- `ordinary_send_keys_preserves_upstream_sibling_fanout`
- `dot2_runtime_refuses_before_prompt_paste`
- `submit_nondiagnostic_failure_is_uncertain_without_retry`
- `submit_fixed_refusal_maps_first_and_retry_public_envelopes`
- `submit_evidence_cleanup_is_owned_and_missing_buffer_tolerant`

Confirm state changes after evidence capture have been parsed before executing
submit; pending-output injection deliberately exercises the unread exception.
Repeat unchanged retained-capture/runtime and existing guarded-paste checks.
Keep live Codex/Claude/Antigravity acceptance, measured versions/settle timing,
the solo full gate and unchanged skip budgets in the root-owned matrix. This
proposal and focused simulation tests close none of those live criteria.
