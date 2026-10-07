# A/0/04 transport prerequisite — guarded bracketed paste

Status: **planned addendum, pending independent review**. This is an
implementation checkpoint of A/0/04, not an eighth executable V6 sheet.
The existing seven-sheet release scope and operator decisions are unchanged.

## Discovered prerequisite

Implementation RED at base `1883d387de0f21203679e9bd8e4626821abf6f7c`
found no observable bracketed-paste format in the pinned tmux runtime.
Upstream `cmd-paste-buffer.c` in tmux 3.6a uses bracketed framing only when
the pane has requested it; otherwise `-p` can write raw multiline bytes.
A guessed format variable or terminal-client capability does not prove the
current pane application's mode. Refusing every prompt would leave the
requested working transport unimplemented.

Source: [pinned upstream paste implementation](https://raw.githubusercontent.com/tmux/tmux/3.6a/cmd-paste-buffer.c).
The archive/hash authority remains `gateway/vendor/tmux-agents/manifest.json`.
Preserve upstream notices and the existing capture extension byte for byte.

## Contract and checkpoints

**CP1 — runtime primitive.** Extend the existing pinned tmux patch with
`paste-buffer -G`, a guarded mode requiring both `-p` and `-r`. In
`cmd_paste_buffer_exec`, before any write, reject unless the exact target
pane's application has `MODE_BRACKETPASTE` enabled and input is enabled.
Reject copy/mode state or pane synchronization that could redirect input.
Check the state and enqueue the complete framed bytes in the same tmux
command execution. No separate format probe can substitute for this guard.
On refusal, emit only the fixed diagnostic
`agents: bracketed paste unavailable`, return failure and write zero bytes.
Normal unguarded upstream paste semantics remain unchanged.

Bump the custom runtime to `3.6a-agents.2`; update its versioned patch name,
manifest checksums, offline builders, runtime pins and exact-version fixtures
together. Do not replace a live/user tmux server or install system-wide.
Build in a separate output directory using the existing pinned source and
builder; retain the prior binary for reproducible historical evidence.

**CP2 — adapter transport.** Use a uniquely owned buffer and
`paste-buffer -G -p -r` for the provider composer. An older/unrecognized
runtime or unsupported option fails before input as `paste_unavailable`;
never retry with raw keystrokes or unguarded paste. Preserve exact bytes,
owned-buffer cleanup, provider state guards and separate final Enter from
A/0/04. Successful guarded paste establishes framing only, not prompt
acceptance or approval authority.

The two checkpoints are implemented and independently reviewed within the
owning A/0/04 trail. A runtime-only OK cannot close A/0/04; adapter acceptance,
public errors and the full candidate gate remain required. Claude's live
check remains explicitly deferred while prohibited.

## Additional write ownership

`gateway/vendor/tmux-agents/` (patch, manifest, builders and README),
`docs/tmux-runtime.md`, exact-version references in
`gateway/src/adapters/process_supervisor_helper.py`, associated runtime
fixtures/tests, and any existing CI/workflow runtime pins required for the
same candidate. Shared CI/inventory reconciliation is integrator-owned.
No capture protocol, process-authority behavior, policy or dependency-package
upgrade is included. Record every changed pin; do not rewrite historical
plan/review evidence containing the old runtime version.

## TDD RED and GREEN

Use an owned isolated tmux server and raw terminal fixture that can enable
and disable bracketed paste without any provider inference:

- `guarded_paste_refuses_disabled_mode_without_input`: old behavior cannot
  satisfy the new guarded command; no payload byte or Enter reaches the pane.
- `guarded_paste_preserves_exact_multiline_bytes`: observe exactly bracket
  start, UTF-8 payload with unchanged LF and bracket end, with no submit.
- `guarded_paste_rechecks_mode_at_write`: disable after the client's last
  observation and require zero-byte refusal by the server-side guard.
- `guarded_paste_refuses_input_off_copy_mode_and_sync`: none may receive or
  redirect payload bytes.
- `unsupported_runtime_has_no_unguarded_fallback`: emitted adapter commands
  never retry a failed guard with plain paste or literal multiline keys.

First record RED against the prior runtime, then build the new pinned binary
and run the same real-input tests GREEN. Keep provider classifier fixtures and
live-provider evidence separate from this terminal transport proof.
Run existing retained-capture/runtime tests to prove unchanged behavior.

## Acceptance and verification

- [ ] Runtime pin/checksum/build outputs agree on `3.6a-agents.2`.
- [ ] All named real-input RED/GREEN tests observe emitted bytes or their
      absence; no mocked mode claim substitutes for the runtime check.
- [ ] Existing capture extension bytes and retained-capture contract pass.
- [ ] Adapters use the guard and surface bounded public refusal reasons.
- [ ] Full `bash scripts/ci.sh` passes on the exact combined candidate with
      the new isolated runtime and explicit skip budget; `git diff --check`
      passes. Existing Darwin/live-provider gaps remain visible.

Record exact focused commands, custom binary hash and isolated server cleanup
in the A/0/04 handoff. Runtime changes take effect in a serving Gateway only
after the operator restarts it with the intended executable search path.


## CP3 — final Enter evidence binding (plan-design trial 5)

Status: **proposed contract, pending fresh independent review**. This section
incorporates numbered corrections 1–9 from
[final-submit plan trial-4 KO](../../reviews/A_0_4-final-submit-plan-4_reviewed_KO.md).
No runtime implementation is authorized by this edit. The previously reviewed
paste plan and its `.2` candidate remain historical inputs; implementation
trial-1 stays KO. The final submit race remains OPEN.

If approved, CP3 supersedes the `.2` runtime pin for the combined A/0/04
candidate with `.3`, without changing the CP1 paste primitive or the retained
capture protocol. Until then, no patch, manifest, builder, runtime pin, test
or production code is changed for CP3. The prior CP1/CP2 prose describes the
plan checkpoints; it does not establish independently approved implementation.
Claude 2.1.293 invocation is authorized, but its live acceptance is NOT RUN;
root coordinates all live checks. The seven-sheet scope and composer-only
approval boundary remain unchanged.

### 1. Dedicated operation and unchanged upstream commands

Add a separate `agents-submit-v1` source and command-table entry using the
existing capture-command registration style. Leave upstream `cmd-send-keys.c`
and the `.2` guarded `cmd-paste-buffer.c` byte-identical. There is no key,
repeat, mouse, literal or mode-command argument. Success enqueues exactly
one `0x0d` through `bufferevent_write(wp->event, "\r", 1)` on the exact
target. Never invoke `window_pane_key` or sibling fan-out.

### 2. Server-owned classified evidence

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

### 3. Exact argv, identity and safety checks

Command:

```text
agents-submit-v1 -b <owned> -r <server-pid> -p <pane-pid> -x <width> -y <height> -c <cursor-x> -l <cursor-y> -t %N
```

All flags are required; no positional arguments. `-b` requires the exact
`agents-submit-` UUIDv4 naming scheme: lowercase ASCII
`agents-submit-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`,
anchored at both ends. `-t` is a literal `%` followed by the
canonical unsigned decimal pane id in `[0, UINT_MAX]`, with no aliases
or leading zeroes except `%0`. Resolve the target and require
that its id equals this literal id. `-r` and `-p` use `args_strtonum` in
`[2, LLONG_MAX]`; `-x`/`-y` in `[1, INT_MAX]`; `-c`/`-l` in `[0, INT_MAX]`,
also requiring `cursor-x < width` and `cursor-y < height`. No permissive
`atoi` or numeric truncation. Expected server pid is `getpid()`, pane pid is
`wp->pid`, dimensions are `screen_size_x/y(&wp->base)`, cursor is
`wp->base.cx/cy`. Read expected metadata with `display-message -p -t %N` and the fixed format
`#{pid}|#{pane_id}|#{pane_pid}|#{pane_width}|#{pane_height}|#{cursor_x}|#{cursor_y}`.
Reject malformed fields without inferring defaults. Capture the expected
values before classifying; compare all
of them again in exec. Pane pid equality rejects a respawn with the same id.

Require not exited, `fd != -1`, non-null `wp->event`, no `PANE_INPUTOFF`,
empty modes, target `synchronize-panes` off, and `MODE_BRACKETPASTE` on
`wp->screen`. Window/session ids grant no authority and are not required.

### 4. Pending-output refusal and residual

Before enqueue, call `window_pane_get_new_data(wp, &wp->offset, &unparsed)`
and require `unparsed == 0`, alongside successful
`ioctl(wp->fd, FIONREAD, &pending)` with `pending == 0`. Unparsed bytes,
errors, unsupported ioctl and positive pending counts refuse with the fixed
diagnostic. Bytes retained only for pipe-pane or control-client delivery
are already reflected in the grid and must not cause a refusal; raw
bufferevent input length is not the unparsed-byte predicate. These checks
close known parsed-versus-unread output gaps at the command boundary.
Use deterministic fault injection where available for input/pending output;
if not deterministically exercised, record SOURCE-REVIEWED / NOT EXECUTED
explicitly, never a fixture pass. A provider can change its internal state
without emitting output (including after the final check); no terminal
guard proves the absence of that residual. Do not claim provider-internal
decision atomicity from terminal evidence.

### 5. Single-use consumption and cleanup

At exec entry, look up the named evidence buffer, copy its bytes/length into
command-local storage and delete the named buffer before checking state or
writing. Every exec path consumes existing named evidence, including refusal.
Missing evidence refuses. Each retry takes a fresh buffer and fresh classified
observation; consumed evidence cannot deliver another CR. Free local storage
on all paths. Parser/target-resolution errors that precede exec cannot consume
the buffer: adapter `finally` still deletes every owned buffer and tolerates
only the exact missing-buffer diagnostic. Never suppress other cleanup errors
or replay input after cleanup failures.

### 6. Capability before paste

Before the first buffer of each operation, and before delivering any prompt
byte, the adapter's tmux client probes the same target server used by that
operation, using the retained supervisor handshake pattern at
`gateway/src/adapters/process_supervisor_helper.py:4329-4338`. Run
`display-message -p '#{version}'`; require status 0, empty stderr and stdout
that, after stripping surrounding whitespace and strict ASCII decoding,
equals exactly `3.6a-agents.3`. Run `list-commands`; require status 0,
empty stderr and stdout advertising the exact `agents-submit-v1` command
and the `paste-buffer` usage carrying `-G`. Match command names and their
own usage lines, not unrelated substrings. Probe anew for each operation;
no result cached across operations or server generations grants capability.
Unsupported or `.2` runtime, missing capabilities or failed probes return
`paste_unavailable` with zero input and no buffer creation. There is no
ordinary-key fallback. Launch-command submission
remains its distinct literal single-line shell contract; this operation
applies only to the classified running-provider composer.

### 7. Deterministic submit failures

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

### 8. Pins and history

Bump the active runtime to `3.6a-agents.3`, using one active `.3` patch in the
manifest and updating builders, pins, workflow and exact-version fixtures
serially with root, including the retained supervisor handshake's hard-coded
`3.6a-agents.2` in `gateway/src/adapters/process_supervisor_helper.py` to `.3`.
After independent plan approval, preserve the exact uncommitted `.2` patch at
`plan/PROJECT_V6/reviews/evidence/A_0_4-trial1-tmux-3.6a-agents.2.patch`,
outside `gateway/vendor/tmux-agents/` and the active build input set. Record
its SHA-256 alongside it in
`plan/PROJECT_V6/reviews/evidence/A_0_4-trial1-tmux-3.6a-agents.2.patch.sha256`:
`c488dccadb08db45c00d7a935f9cfd00735d744d0a68286ef683869e152a74c2`.
The trial-1 binary at `/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux` is volatile,
not durable retained evidence. Its recorded SHA-256 is
`3d37a94099286f1284373271ed7da3dac69e04fb1dba88bdb6068cfb66ed1428`.
Durable historical evidence is that recorded hash plus a reproducible rebuild
from the manifest-pinned tmux 3.6a archive and the preserved exact `.2` patch.
`cmd-agents-capture.c` stays byte-identical, SHA-256
`4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`.
Build only into fresh isolated output; never restart a serving Gateway or
replace a user server. Native Darwin remains NOT BUILT / NOT RUN.

### 9. Named TDD and remaining acceptance

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
- `guarded_submit_ignores_parsed_bytes_pending_control_client_delivery`:
  attach a control client to the target session and stall or pause delivery;
  with matching grid and evidence, no unparsed bytes and `FIONREAD == 0`,
  expect exactly one target CR and no refusal despite retained parsed bytes.
- `guarded_submit_refuses_unparsed_pane_input`: inject unparsed bytes ahead
  of `wp->offset`; expect zero CR.
- `guarded_submit_writes_one_cr_only_to_target_with_sibling_sync_option`
- `ordinary_send_keys_preserves_upstream_sibling_fanout` (preservation test,
  expected to pass on `.2`; exempt from the new-regression RED requirement)
- `dot2_runtime_refuses_before_prompt_paste`
- `capability_probe_rejects_missing_submit_command_before_buffer`: a probe
  reports `.3` and guarded paste but omits `agents-submit-v1`; expect
  `paste_unavailable`, no buffer creation and zero prompt or CR bytes.
- `submit_nondiagnostic_failure_is_uncertain_without_retry`
- `submit_fixed_refusal_maps_first_and_retry_public_envelopes`
- `submit_evidence_cleanup_is_owned_and_missing_buffer_tolerant`

Confirm state changes after evidence capture have been parsed before executing
submit; pending-output and unparsed-input injection deliberately exercise
unread/unparsed exceptions. For the stalled-control-client and unparsed-input
cases, use deterministic injection; if not deterministically exercised, record
SOURCE-REVIEWED / NOT EXECUTED explicitly, never a fixture pass.
Repeat unchanged retained-capture/runtime and existing guarded-paste checks.
Keep live Codex/Claude/Antigravity acceptance, measured versions/settle timing,
the solo full gate and unchanged skip budgets in the root-owned matrix. This
proposal and focused simulation tests close none of those live criteria.


### CP3 TDD GREEN

After independent plan OK only: register the dedicated command/source in the
active versioned patch; implement the exact one-CR enqueue guard and consuming
evidence lookup; use raw captured-buffer observations in the shared helper for
both first submit and retry. Check capability before any buffer or input.
Keep ordinary upstream commands and retained capture byte-identical. Update
`.3` pins/builders/fixtures together with root and build fresh isolated output.
Pass the same RED tests GREEN against that exact output, then run retained
capture and public-envelope regressions. Do not add a client-probe substitute,
menu authority, policy changes or a raw fallback.

### CP3 acceptance criteria and verification ownership

- [ ] Fresh independent plan review accepts this exact contract and all nine
      trial-4 corrections before runtime implementation begins.
- [ ] Each named RED test records its failing assertion against `.2`, and
      subsequent GREEN records exact target/sibling input bytes on `.3`.
- [ ] First/retry guards enforce exact identity, state and single-use screen
      evidence at enqueue; refusals emit zero CR and never replay prompt text.
- [ ] Pending-output checks have deterministic runtime evidence or are
      explicitly SOURCE-REVIEWED / NOT EXECUTED with the residual retained.
- [ ] Source identity proves unchanged ordinary send-keys, guarded paste and
      retained capture; ordinary synchronized Enter fan-out remains tested.
- [ ] One active manifest patch, version/build hashes and fixtures agree on
      `.3`; `.2` patch/binary evidence is preserved outside active build inputs.
- [ ] Root obtains required live provider acceptance/version/timing evidence
      and runs the solo full gate with required Redis 7 and unchanged skips.
      Native Darwin remains NOT BUILT / NOT RUN until separately measured.

The plan-authoring verification is `git diff --check` plus preservation hashes
and local relative-link checks; it does not run runtime tests or the full gate.
After implementation is authorized and settles, focused verification is:

```bash
A04_TEST_TMUX=<absolute-fresh-agents.3-binary> node --test \
  tests/gateway/guarded_submit.test.js \
  tests/gateway/guarded_paste.test.js \
  tests/gateway/prompt_submission.test.js \
  tests/gateway/prompt_submission_capture.test.js \
  tests/gateway/tmux_client.test.js \
  tests/gateway/tool_error_serialization.test.js
D007C_TEST_TMUX_PATH=<absolute-fresh-agents.3-binary> \
D007C_RUN_REAL_TMUX_PROBE=1 node --test \
  tests/gateway/process_supervisor_session_port_relay.test.js
bash scripts/ci.sh
git diff --check
```

`guarded_submit.test.js` and the `.3` output are PLANNED, not existing
implementation prerequisites. Root supplies the exact isolated runtime PATH,
private socket environment and disposable Redis 7 for the solo full gate.
The coder must preserve full-gate failures; focused GREEN does not close them.
