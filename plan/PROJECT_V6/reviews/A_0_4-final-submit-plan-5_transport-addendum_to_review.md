# A/0/04 final-submit guard — trial-5 transport-addendum review request

Status: **plan correction only; pending fresh independent review**.
Base/HEAD: `2b920a84ce46f993806e2ee8db17c7a10d98ab24`.
No F1 runtime primitive, pin or implementation change is included.

Review [CP3 in the transport addendum](../A/0/04-transport.md#cp3--final-enter-evidence-binding-plan-design-trial-5),
SHA-256 `7f0f505310ef4173272355b1eb59db9145f8fc6380c20df42e9c676b95fb56b1`,
against the [trial-4 KO](A_0_4-final-submit-plan-4_reviewed_KO.md),
the owning [sheet](../A/0/04.md), actual pinned upstream source and AGENTS.md.
The prior [trial-5 standalone proposal](A_0_4-final-submit-plan-5_to_review.md)
and [focused-work checkpoint](A_0_4-build-4_correction_checkpoint.md) remain
immutable. This fresh supplemental request binds the actual addendum edit,
which the earlier standalone proposal did not contain. CP3 is the proposed
contract to review; prior requests do not authorize implementation.

## Numbered correction coverage

| Trial-4 item | Exact CP3 contract section |
|---|---|
| 1 | Dedicated `agents-submit-v1`, one direct target CR, no key arguments or upstream send-keys changes; source-identity and ordinary sibling-fan-out proof required. |
| 2 | `capture-pane -b` → raw `save-buffer` → strict classification of those bytes → same server buffer at submit; flag-0 serialization, length/memcmp, LF per row; no normalization, upload, hex argv or SGR reliance. |
| 3 | Fixed argv flags and numeric ranges, canonical literal pane id, server/pane pid and dimension/cursor equality, explicit fixed metadata format, required absolute mode/input/sync/framing/live-fd checks. |
| 4 | Bufferevent input and successful FIONREAD both empty; deterministic fault injection or explicit unexecuted/source-review limits, plus provider-internal-state residual. |
| 5 | Single-use buffer consumed on every exec path, fresh evidence for retry, command-local memory cleanup and exact missing-buffer tolerance in adapter finally. Parser/target-resolution failures are explicitly distinct. |
| 6 | Exact `.3` version and command capabilities checked before any buffer or prompt input; `.2` fails `paste_unavailable` with zero bytes; no ordinary-key fallback; launch remains separate. |
| 7 | Status 1 plus exact fixed refusal maps first/retry deterministically; all nondiagnostic failures are uncertain and never retried; emitted public envelopes and bounded unchanged-composer `not_submitted` proof. |
| 8 | One active `.3` patch and synchronized pins/builders/fixtures, preserved `.2` patch/binary evidence and unchanged capture source; fresh isolated output, no user/server replacement or Gateway restart; Darwin unmeasured. |
| 9 | Named RED/GREEN target/sibling byte matrix, respawn/tamper/reuse/missing/capability/failure/sibling-option cases, confirmed parsed state after capture, focused commands and explicit root-owned remaining acceptance. |

Write a new immutable `A_0_4-final-submit-plan-5_reviewed_OK.md` or
`A_0_4-final-submit-plan-5_reviewed_KO.md` with numbered actionable corrections.
Root assigns the fresh independent reviewer and owns index/commit decisions.
No reviewer is invoked or verdict issued by this coder. A plan OK authorizes
only the next implementation step; it does not close trial-1 KO, F1, live
provider acceptance or the full gate.

## Preservation and verification

This bounded task changes only `A/0/04-transport.md` and adds this request.
Preservation manifest: `/tmp/ao-a04-plan5-addendum-imafb5h_/before-files.json`.
Code, tests, runtime/patches, prior evidence and root README are preserved.
No trial-4 document or existing request is overwritten. No subagents,
self-review, provider/runtime launch, tests, full gate, commits, staging,
policy edits or Gateway restart are part of this plan-only task.

Required author checks: `git diff --check`, local relative-link resolution,
nine numbered section presence and byte-preservation comparison against the
entry manifest. These are document checks, not runtime or live acceptance.
F2/F3/F5 verification remains exactly as recorded in the focused checkpoint.
F4, live versions/markers/settle timing, Darwin and root solo gate remain open.

Stop after preparing this request for independent review; do not implement
`agents-submit-v1` or run the future verification commands from CP3.
