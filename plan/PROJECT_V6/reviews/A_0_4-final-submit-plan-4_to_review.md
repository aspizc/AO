# A/0/04 final-submit guard refinement — plan trial 4 request

Status: design review request, no runtime implementation approved by this file.
Independent review is required because trial-1 KO exposed a write-time safety
race after the earlier approved transport addendum. This request preserves the
original KO and all prior plan verdicts.

Review the immutable coder proposal in
[A_0_4-build-4_final-submit-design_checkpoint.md](A_0_4-build-4_final-submit-design_checkpoint.md)
against [A/0/04](../A/0/04.md), [transport addendum](../A/0/04-transport.md),
[trial-1 KO](A_0_4-1_reviewed_KO.md), the actual vendor tmux source/patch,
and AGENTS.md. Confirm a concrete, minimal atomic final-Enter guard that
protects target and sibling bytes after the last client observation. Probe
whether tmux's grid serialization can be compared at enqueue without
normalization or a second client race, how evidence buffer/cursor/focus and
pane/window identity bind, whether the command can be implemented without
changing upstream ordinary send-keys semantics, and failure/no-fallback proof.

Write a new immutable `A_0_4-final-submit-plan-4_reviewed_OK.md` or
`A_0_4-final-submit-plan-4_reviewed_KO.md` with numbered corrections.
Review only this technical design; no production edits, no self-review, no
live provider launch, no approval-scope change. Current coder may work on F2,
F3 and process attribution independently while this design is reviewed.
