# A/0/04 trial-1 correction — final-submit design checkpoint

This is a coder design checkpoint, not a verdict or approval. Trial 1 remains
KO. No runtime changes are authorized by this document itself. The operator
assignment is `workspace/root-a04-medium-rework.md` (gpt-6.1-sol, medium,
priority); no subagents, self-review, commits or provider launches are used.

## F1 and the minimum required runtime refinement

The `.2` runtime guards `paste-buffer -G -p -r` only. Ordinary `send-keys
Enter` cannot enforce the classified screen/cursor evidence at enqueue.
Another client observation leaves the same race. The existing final-Enter
contract therefore needs a concrete server-side primitive before F1 can close.

Proposed minimal refinement, for independently assigned review before runtime
implementation:

- Extend `send-keys` with a guarded mode accepting an owned evidence buffer
  and expected pane metadata. Admit exactly one Enter; reject literal, mouse,
  repeat, copy-mode or other key operations in this mode.
- Evidence is the exact current visible `capture-pane -p -N -T` output used
  by the classifier, plus the exact pane id, mode/input/synchronization flags,
  dimensions and cursor coordinates. Read the evidence buffer without shell
  interpolation. Compare byte lengths and bytes, not normalized prompt text.
- In the same server command execution, compare that screen and metadata to
  the current target, require enabled input, no mode/synchronization, a live
  pane fd and bracketed-paste mode, then enqueue exactly CR to the target.
  Refuse changed content/cursor/dimensions/mode/input/synchronization with
  zero target or sibling bytes. Return only a fixed safe diagnostic.
- The helper uses this guarded operation for both first submit and the single
  permitted retry. The provider classifier remains the sole composer authority;
  the primitive supplies no menu or approval authority. Evidence buffers are
  unique per operation and deleted on every exit. Unsupported runtimes refuse
  without ordinary-key fallback.
- Preserve the existing `agents-capture-v1` extension byte for byte, upstream
  unguarded key semantics and paste guard. Build a fresh version/pin/output,
  retaining the `.2` patch and historical binary/evidence for reproduction.

Required TDD: actual raw target/sibling bytes for first submit and retry, with
content/menu, cursor, dimensions, input-off, copy mode, disabled framing and
synchronization changes after the last classified observation. A successful
unchanged composer gets one CR; every refused guarded attempt gets zero CR.
Also exercise unsupported runtime/no fallback, evidence-buffer cleanup and
unchanged retained-capture tests. A separate screen/metadata observation may
be conservative, but both exact values must match together at enqueue.

Independent review must settle the argv/evidence encoding and reuse of the
upstream visible-grid serialization before modifying the vendor contract.
F1 remains OPEN meanwhile. F2/F3 and process attribution can proceed without
changing that runtime contract. Root owns live-provider coordination and the
next solo full gate; focused tests cannot close those criteria.
