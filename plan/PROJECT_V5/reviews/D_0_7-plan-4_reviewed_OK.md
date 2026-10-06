# Independent Plan Review — Project V5 D/0/07 (Trial 4)

## Verdict

**OK**

## Reviewed identity

- Frozen submitted candidate:
  `f3c970cafa29b2349307e42faf3cec7bbacbc44c`, parent
  `e7fa55524bd1a2bb96143660b68c2d1d67a2d25b`, tree
  `fe2534d9a84e0d15ccd517df91e6560e57adb2fb`.
- Review-branch equivalent candidate:
  `73116dd85de4b905a4d9a656dd81beeb17aee789`, with the same parent and tree.
- Append-only request/index commit:
  `29089d200306262a1ef8a7a43e8b8552a55f31ca`.
- Frozen implementation baseline: integrated `D_0_1_CORE` lineage `a7c09b0`.

This is a plan-contract verdict only. It credits no implementation, technical GREEN,
integration, promotion, live-provider execution, or release.

## Determinism-defect adjudication

1. **Capture strips row-end spaces — CLOSED.**

   `D/0/07.md` now fixes the direct vector as
   `["capture-pane","-p","-N","-T","-t",tmuxTarget,"-S","-400"]`.
   The installed tmux 3.6 manual defines `-N` as preserving trailing spaces at
   line ends and `-T` as ignoring trailing positions without a character.

   I reproduced the three cases on an isolated tmux 3.6 socket with a 120×40
   pane and removed that socket afterward:

   - untouched: the exact vector emitted 40 `0a` bytes; with no history,
     `cursor_y=0`, and 40 empty rows, the canonicalizer retains no row and
     returns 0 bytes;
   - positive: it emitted 61 bytes:
     `ready\nstatus\nack:status\n` (24 bytes) followed by 37 `0a` bytes; the
     first three rows therefore return exactly 24 bytes;
   - row-end-space: it emitted 50 bytes beginning
     `65 64 67 65 20 20 0a 6e 65 78 74 0a`, followed by 38 `0a` bytes.
     The retained rows are 7 bytes (`edge`, two U+0020 cells, LF) plus 5 bytes
     (`next`, LF), so the public result is exactly 12 bytes. The same capture
     with `-T` but without `-N` was 48 bytes, independently demonstrating that
     the two spaces are supplied by the corrected flag while `-T` leaves the
     unused positions empty.

   `D/0/07c.md` requires the non-synthetic host test
   `preserves two rendered row-end spaces through real tmux capture-pane -N -T`
   to assert both the 50-byte capture and 12-byte result, and its hard-fail
   host gate also rechecks the 40/61-byte inputs and 0/24-byte results.
   `D/0/07d.md` retains that proof in the final composition gate.

2. **Cancel/loss cause table totality and exclusivity — CLOSED.**

   A write cancel at or after `D` is now pending intent, receives no ordinal,
   and becomes `SESSION_PORT_CANCELLED` only when the parent validates the
   authenticated `ERROR(0x0005,0x06)` zero-PTY-byte proof. Loss of the
   helper/control/response path before that validation receives the sole
   ordinal and maps the dispatched write to `SESSION_PORT_WRITE_ABORTED`.

   The physical-event classifier is ranked before ordinal assignment:
   proven helper-generation death; still-live-broker terminal-component close;
   unattributed control/response loss; fully readable mismatch;
   live-but-unreadable identity; then generic snapshot failure. Every later
   rank explicitly excludes the earlier ranks, origin is recorded before
   dependent teardown, and induced callbacks are aliases without another
   ordinal. A physical helper or relay loss therefore cannot also win an
   identity, barrier, sideband, or generic-failure row.

   The parent and `D/0/07d.md` require one exact public result for each formerly
   ambiguous real-host ordering:

   - cancel intent followed by proof-response loss:
     `SESSION_PORT_WRITE_ABORTED`;
   - helper death before `F`: `SESSION_PORT_WRITE_ABORTED`;
   - relay disappearance during snapshot:
     `SESSION_PORT_TERMINAL_CLOSED`.

   No normative `may return` or multiple-result branch remains.

## Preservation checks

- The positive authorized RED, numeric `ASP1`/binding-tag/`ASR1` wire, and
  helper-owned-PTY/outer-relay attach topology remain intact.
- The candidate changes exactly `D/0/07.md`, `D/0/07c.md`, and
  `D/0/07d.md`; its tree is byte-identical on the submitted and review-branch
  candidate commits. Candidate and request/index `git diff --check` pass.
- `07a`, `07b`, `07c`, and `07d` all remain `planned`; the acyclic
  `07a -> 07b -> 07c -> 07d -> D_0_1_SPLICE` split and the rule that only an
  independent `D_0_7D` OK unblocks the splice remain explicit.
- No executable leaf or registry surface changed. Inventory remains
  `6 + 8 + 11 + 6 + 5 + 5 + 6 + 10 = 57`,
  `25 + 57 = 82`, and
  `36 complete + 4 in progress + 42 planned = 82`, with 46 open.
- All checked local Markdown file targets across the parent, four leaves,
  Trial 4 request, and review index resolve.

The Trial 4 plan closes both remaining Trial 3 defects without reopening any
closed finding. `D_0_1_SPLICE` still cannot consume implementation work until
the four leaves are implemented and an independent `D_0_7D` verdict is OK.
