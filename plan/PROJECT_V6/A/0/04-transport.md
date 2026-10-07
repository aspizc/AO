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
