# A_0_5 — Implementation checkpoint 4: runtime RED

Date: 2026-10-07. Partial coder work only; no independent verdict.
Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.

Read the root continuation brief, AGENTS, plan/stage README, reviewed sheet,
plan trial 2 OK and checkpoint 3. Existing migration/identity/persistence
changes are preserved. Historical anchors were revalidated: request-context
bootstrap/result binding, lifecycle cancellation refusal, SQLite profile
transactions, Linux process reader and argv tmux helper still exist. Line
numbers in the historical sheet identify the old base, not this candidate.

Added `tests/gateway/request_context_reattach.test.js` before runtime edits.
Command: `node --test --experimental-test-isolation=none tests/gateway/request_context_reattach.test.js`.
Exit 1: **0 passed, 16 failed, 0 cancelled/skipped/todo**.
Full log: `/tmp/v6-a05-runtime-red.log` (archive at the next checkpoint).

Three distinguishing RED assertions reach existing production behavior:
durable write failure currently returns success and publishes memory;
an ordinary caught denial never reaches the supplied private observer;
the current catalog has 33 tools instead of 34. The other 13 tests stop
at the missing recovery-service export; this is API-absence evidence,
not successful execution of their later behavioral assertions.

Next: implement synchronous recovery composition and protected-context
wiring, then run these tests and existing request-context guards. Bootstrap
provenance, real process/tmux observations, discovery cap, lifecycle races,
projection generation and host/full/live evidence remain outstanding.
No policy edits, provider calls, Claude, subagents, commits or shared index edits.
