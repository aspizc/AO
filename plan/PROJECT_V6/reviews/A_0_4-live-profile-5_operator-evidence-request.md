# A/0/04 trial 5 — operator evidence request for Claude completed acceptance

This is a technical evidence request, not permission to launch providers from
the bounded coder task. No provider was invoked for this request.

Root's Claude 2.1.293 error capture already contains the submitted prompt and
completed response marker. The later capture repeats them. `agent.ask` returned
`acceptance_uncertain` after one Enter; tool success is not established.
We have no pinned 2.1.293 source/snapshot contract binding the `●` completed
history cell to a newly accepted current turn rather than transcript replay.
The existing 2.1.292 loading/composer fixture does not establish that contract.
The root result also lacks the final pre-Enter guard capture, per-stage monotonic
timestamps, and later-pane metadata. No completed-response positive matcher was
added for Claude; its captured blank composer and answer stay uncertain.

For the next root-operated disposable check, collect:

1. A source/binary-digest-backed 2.1.293 renderer anchor for committed user and
   assistant history cells, including how accepted turns are added versus
   replayed/reflowed. Include any available stable current-turn identity or
   acceptance event; an output occurrence count is not that identity.
2. The actual initial, post-paste and final pre-CR guard captures and metadata
   used by the Gateway, not a later independent substitute. Capture the same
   `-N -T` rows with server PID, pane PID/ID, geometry, modes and cursor.
3. Read-only frames at approximately 50, 150, 500 and 1500 ms after the first
   guarded CR, with monotonic capture timestamps, command outcome and the same
   identity metadata. This measures whether loading disappears before the
   current 1500 ms observation. A later response must retain its actual time
   and metadata, not reuse pre-ask/error cursor values.
4. A final-guard baseline with no current prompt/answer in transcript, a stable
   viewport prefix across the transition, and a source-verified fresh accepted
   turn witness. Include stale-answer/replayed-history controls distinguishing
   those cases from a new accepted response with an empty composer.

Keep raw data ignored/local. Publish sanitized samples replacing unique prompt
markers consistently with same-length benign ASCII, redacting identity/account/
paths, and retaining relevant row positions and all trailing literal spaces.
Do not replay the prompt or send another decision key after an uncertain submit.
