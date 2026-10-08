# A/0/04 trial 8 — Claude completed-turn evidence/design request

Status: evidence insufficient for a generic acceptance marker; implementation
stopped before changing source or tests. This is a technical request for the
root/operator, not provider-launch authorization or an independent verdict.
Entry candidate: `8dbe4c787af3ffdd619ceb7c772dd54458bb5f30`.
The [trial 5 request](A_0_4-live-profile-5_operator-evidence-request.md) remains
immutable; this request narrows what the latest observation resolves and what
still blocks a safe completed-turn acceptance design.

## What the latest observation establishes

Claude Code 2.1.293 at 120x40 has a placeholder before asking. After the one
root-reported guarded CR, the first error pane has the exact current user
prompt at row 6, an assistant marker and disposable answer at row 8, and
`✻ Cogitated for 1s · done 2:30 AM` at row 10. The blank composer at row 36
retains 61 trailing literal spaces. Its border/status/auto-mode footer remains
present. All recorded cursors are (2,36); recorded pane ID and geometry agree.
The error and later captures are byte-identical. Unlike trial 5, later cursor
metadata is now recorded.

Local comparison of the unsanitized ready/error panes confirms the user-echo
row was blank, the prefix above it is unchanged, and the unique current marker
was absent from the ready viewport. These are useful observations of this
particular disposable prompt. Root nevertheless reports `acceptance_uncertain`.
They do not establish successful `agent.ask` execution.

## Why no generic matcher is added

A unique-token answer establishes much more about this diagnostic run than an
arbitrary reusable ASCII prompt does. An arbitrary prompt may already exist in
history, including history outside the initial viewport. The exact final
pre-CR baseline is missing, so newly visible text cannot be bound to the actual
last guard. Repeating the same later screenshot supplies no new turn identity.

The available embedded-source fixture anchors 2.1.292 composer/loading, not
2.1.293 committed user/assistant/completion cells. No supplied contract tells
us whether these completed markers can be replayed, reflowed or rendered from
ordinary transcript content, or how to distinguish those cases from a newly
accepted current turn. The elapsed 1s and minute-resolution done clock supply
no monotonic turn identifier. Same pane ID/size is not a recorded server PID
and pane PID binding across the guarded CR.

The supplied observations therefore do not safely prove the requested generic
acceptance invariant. A regex for prompt + `●` + `✻` would encode an unverified
assumption about freshness and renderer semantics. Empty composer, disappearance,
completion clock or assistant output alone remain insufficient. Existing refusal
and uncertain-delivery behavior is preserved.

## Specific next evidence/design gate

Before implementing a completed-turn positive marker, provide both of these:

1. **A version-bound accepted-turn contract.** Pin the exact installed 2.1.293
   binary digest and supply static renderer/event anchors showing how a newly
   accepted user turn, its assistant output and its completion indicator are
   associated. Establish whether completed markers can appear through replay,
   reflow or assistant text, how they are escaped/rendered, and whether a stable
   current-turn ID or monotonically advancing acceptance event is available.
   If visual cells cannot distinguish these cases, choose a structured accepted-
   turn event tied to this ask instead of broadening a screen regex. No proposed
   event or API is assumed to exist in this request.
2. **The exact Gateway boundary observations.** Record the actual initial,
   post-paste, final pre-CR guard and first post-CR observations, not separately
   sampled replacements. Retain exact `capture-pane -N -T` rows, monotonic times,
   modes, cursor, geometry, server PID, pane PID/ID and the guarded-submit outcome.
   Include early 50/150/500 ms post-CR frames if available, the configured 1500 ms
   observation and a later frame. Preserve evidence that the final guard had the
   exact current draft, no current transcript echo/witness, and that the submit
   outcome establishes one CR. An ambiguous submit receipt must stay uncertain.

Use controls where the same generic prompt/old assistant/completion already
exists in visible and offscreen history; where the viewport reflows; where the
assistant body includes marker-looking text; and where only the composer clears.
Also retain decision/trust overlays, changed pane/server identity, and stale
completion without a new accepted user turn. Do not replay after uncertainty.
Raw evidence stays ignored/local; publish same-length benign prompt markers,
consistently anonymized identity relationships, redacted paths and exact padding.

If the contract supports a visual witness, the eventual design must compare
both initial and final-guard baselines, demand a newly committed exact single-
line ASCII user turn plus its source-verified current-turn completion, reject
old assistant/completion evidence and any reflow/identity ambiguity, and preserve
all menu/trust/busy/unknown refusals and the existing Enter bound. A completed
blank composer must only be considered after this guarded CR; it must not become
a generally ready input state. These are design constraints, not implemented
or verified acceptance logic.
