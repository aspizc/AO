# A/0/04 trial 9 — remaining Claude turn-binding design request

Status: boundary evidence obtained; generic completed-turn acceptance remains
unproven. No source or test change. This is a coder evidence assessment, not
an independent verdict or authorization to launch a provider.
Entry: `09708fa72dea630c47a2bdb67e1bde86342d1d79`.

## What is now resolved

The actual production observe sequence contains ready, post-paste, final
pre-CR guard and post-CR frames. Ready is at 00:42:06.382Z, post-paste at
00:42:06.553Z, guard at 00:42:06.566Z and after at 00:42:08.082Z. The draft
and guard contain the same exact prompt. Server PID, pane PID, pane ID and
120x40 geometry agree across all four observations. Initial/post-paste/guard
are composer; post-CR is unknown under the unchanged classifier.

The current prompt is absent from ready/guard visible history. Rows 6, 8 and
10 are blank in those baselines and contain user echo, assistant output and
completion after CR; the prefix through row 5 is unchanged. The matching
outer result records the same error snapshot, and its later snapshot repeats
it. Root reports one guarded CR and `acceptance_uncertain`. This resolves the
missing actual final guard and PID-bound viewport evidence from trial 8.

The trace uses `new Date().toISOString()`: these are wall-clock samples, not
monotonic timings or turn IDs. The 1516 ms guard-to-after difference bounds
those sampled wall-clock observations, not an exact measured CR-to-acceptance
latency. Nothing here disputes that this disposable unique-token run answered.

## Precise remaining counterexample for generic prompts

Consider a reusable ASCII prompt `Summarize this.` and an older internally
stored completed turn H with these rendered cells:

```text
row 6:  ❯ Summarize this.
row 8:  ● Already summarized.
row 10: ✻ Cogitated for 1s · done 12:42 AM
```

H is not visible in either initial or final-guard viewport. Both views have
the same header/prefix at rows 0–5 and blanks at rows 6–34; the guard has the
new exact draft at row 36. Suppose that after CR the same process restores H
into the previously blank transcript area and clears the composer, without
committing a new accepted turn for this ask. The visible post-frame is the
three cells above, unchanged rows 0–5, blank composer and the same idle footer.
The old completion can be from earlier within that same displayed minute.

Every proposed viewport check passes: same PID/geometry, exact guard, no
prior visible echo, previously blank echo row, unchanged preceding prefix,
newly visible assistant/completion markers after it, no menu, ASCII and bounds.
Nevertheless the semantic turn is H, not a new accepted turn. Calling the
assistant marker "fresh" merely because it is newly visible begs that question.
Rejecting previously visible echo/assistant text does not reject H.

This is an indistinguishable-screen counterexample, **not** a claim that the
recorded Claude 2.1.293 run replayed H, or that such replay was reproduced on
that binary. The supplied trace does not establish a renderer contract that
rules this alternative out. Its uniqueness establishes the disposable example;
it cannot be assumed for all generic/repeated prompts. Matching PIDs rules out
process replacement, not same-process history restoration. Prefix equality
rules out the tested visible shifts, not restoration below that prefix.

## Narrow next design gate

Provide a version-bound 2.1.293 renderer/accepted-turn contract establishing
that this exact completed-cell insertion means a newly committed current
user turn, and how its assistant/completion are bound to that turn. It must
exclude restoration/replay as above and distinguish marker-looking assistant
text from actual user/assistant/completion cells. A pinned static binary/source
anchor with that behavior, or a verified accepted-turn event/ID causally tied
to this guarded CR, would address the gap. No such interface is assumed to
exist. If it cannot be established, retain uncertainty for completed-only
screens rather than adding an observational regex.

A negative control with a previously completed same prompt hidden/restored
would help characterize the renderer, but a finite extra set of screenshots
alone is not a turn identity contract. No additional provider launch, policy
change or instrumentation installation is authorized by this request.
The actual boundary frames just obtained should be reused; recollecting those
same four frames without turn semantics is not the remaining request.

After a contract is established, the proposed PID/exact-guard/blank-row/prefix/
ASCII checks remain necessary, together with stale/repeated/offscreen-history,
assistant-text spoof, reflow, changed identity and menu controls. Blank composer,
disappearance, completion text and newly visible old output must never suffice
alone. Preserve no replay on uncertainty and the existing two-Enter bound.
