# Independent Design Review Result — Project V5 D/0/07c Design Trial 2

## Verdict

**reviewed_OK**

The Design Trial 1 P0 is closed, not relocated. The amended universal rule
now reaches both sides of the PTY boundary, and no inventory row or preserved-
behavior sentence permits the current `verify()`-then-`os.write()` or
observation-then-`os.read()` mechanisms to authorize an effect.

The five operator decisions are a complete set for the reviewed contract.
This OK closes the design-review gate and authorizes only the implementation
phase, subject to explicit operator resolution of all five decisions. It does
not choose an operator option and makes no integration, promotion, release,
`D/0/07d`, port-surface, or splice claim.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None. The PTY-side omission is closed and the decision set is complete. |
| P1 | 0 | None. Both Design Trial 1 P1 findings are closed. |
| P2 | 0 | None. |

## P0 ruling — closed, not relocated

The implementation still performs the unsafe current sequence:

- `verified_pty_write()` calls `verify()` at
  `gateway/src/adapters/process_supervisor_helper.py:431` and later calls the
  write effect at `:459`;
- the live `verify()` reads the utility, retained PTY/foreground, relay, and
  tmux prerequisites at `:3627-3661`, before `accept_operator_input()` or a
  programmatic prompt reaches `verified_pty_write()` at `:3680-3684` and
  `:3865-3869`; and
- provider output is read from the retained PTY at `:3424-3427`, then relay
  prerequisites are separately revalidated at `:3439-3445`, then the bytes
  are sent at `:3446-3450`.

The amendment does not ratify any of those intervals:

1. R2 expressly identifies `verify()` followed by `os.write()` and an
   observation followed by `os.read()` as check-then-act
   (`07c-DESIGN-post-accept-binding.md:110-142`).
2. Broker/operator writes and programmatic prompt writes now both require
   R1/R2/R4 and one atomic PTY-write effect; with current primitives they
   reject before `os.write` with zero PTY bytes (`:207-208`).
3. Provider output is split into a source effect and a destination effect.
   The source must return bytes with same-effect utility/PTY/foreground
   authority, and the relay send independently needs same-effect destination
   authority. Failure on either side crosses zero bytes (`:209-212`).
4. Decision 5 requires an indivisible PTY read/write facility, or an explicit
   operator-approved narrowing of the frozen prerequisites. Until that
   decision is resolved, all three named PTY operations HARD FAIL with zero
   affected bytes (`:258-268`).
5. The former D/0/07b exemption is gone. D/0/07b continues to own framing,
   FIFO order, partial-write accounting, and public disposition, but has no R2
   exception (`:208`, `:345-351`).

### Frozen prerequisite walk

Every prerequisite in `plan/PROJECT_V5/D/0/07.md:621-658` is governed:

| Frozen prerequisite or step | Amended authority |
|---|---|
| Utility PID/start/executable/argv/cwd/PGID/SID | Required in the indivisible PTY effect record (`07c-DESIGN-post-accept-binding.md:127-135`). |
| Retained PTY dev/ino/rdev and exact rows/columns | Required in that same record (`:132`). |
| Foreground PGID and the complete frozen foreground equation, including the bound terminal/helper/tmux facets | Required in that same record (`:133`); a later foreground observation is expressly insufficient (`:137-142`). |
| Unavailable, malformed, unreadable, or contradictory authority | The universal rule and R2 reject; no fallback reader can authorize (`:47-54`, `:93-125`). |
| FIFO/live-generation admission and sequence | R1 binds queued bytes to the accepted generation and R4 makes revocation sticky (`:83-91`, `:190-199`). |
| First write, retries, and short writes | The atomic write form performs the write and returns exact affected bytes/count and disposition; a separate recheck is not accepted (`:127-142`). |
| Authenticated response and public commit | Only a still-live same-generation result may settle; earlier revocation discards it (`:216`, `:299-300`). |

### Decision-set completeness

The current impossible authority boundaries and their operator decisions are:

| Boundary | Required decision |
|---|---|
| Mutable relay authority for input, output, and barriers | Decision 1 — immutable/same-effect relay authority or explicit narrowing. |
| Utility/foreground/PTY authority for broker writes, prompt writes, and provider reads | Decision 5 — atomic PTY effect or explicit narrowing. |
| Identity, geometry, history, metadata, generation, and bytes for capture | Decision 2 — one retained-server atomic capture record or an approved contract change. |
| Utility group, adopted descendants, relay process, and tmux pane/session/server retirement | Decision 3 — retained destruction capabilities or approved preservation. |
| Exact socket-inode removal | Decision 4 — exclusive mutation authority/conditional unlink or approved preservation. |

The other post-`ACCEPT` operations have retained-identity mechanisms rather
than another unresolved operator choice: generation-tagged queue entries and
private responses, direct operations on retained relay/PTY/control/sideband
descriptors, pure in-memory frame/canonicalization work after authority
acceptance, and inert observation exposure. The inventory also makes clear
that polling, parsing, normalization, and tag computation cannot authorize
their first later effect (`:227-229`).

I found no post-`ACCEPT` effect which is left to a separately checked mutable
name or prerequisite without either one of those retained mechanisms or a
named operator decision. The decision set is therefore complete.

## No-weakening comparison

I compared all 45 deleted lines with the 140 additions in
`3149888..2a319e0`.

No previously required REJECT became warn, skip, allow, tolerate, or exempt:

- “read” became the more precise authority-bearing “consume bytes or state”;
  diagnostic observations are permitted only because they cannot authorize,
  keep a generation active, or settle a result (`:47-54`);
- R2 expanded from transfer/capture prerequisites to every post-`ACCEPT`
  effect (`:93-98`);
- broker/operator and programmatic PTY writes changed from R1/R4 or an
  exemption to R1/R2/R4 with zero-byte rejection (`:207-208`);
- provider output gained same-effect source authority in addition to relay
  destination authority (`:209-210`);
- readiness now requires the PTY-effect facility as well as relay/capture
  authority (`:205`);
- the ungoverned close protocol frame is forbidden and replaced by direct
  retained-descriptor retirement (`:217`);
- utility-group/adopted-descendant and per-object tmux retirement were added,
  not relaxed (`:220-224`); and
- the old unconditional “D/0/07b verified PTY writes” preservation bullet was
  replaced with the stricter and necessary statement that positive writes
  survive only after Decision 5 selects a compatible facility or an expressly
  narrowed contract. Until then, the write HARD FAILS before `os.write`
  (`:345-351`).

The independently confirmed rulings were preserved:

- Decision 2 still requires one atomic tmux capture record and still rejects
  stock tmux 3.6 plus the frozen separate argv (`:241-246`);
- Decision 3 was strengthened to name the utility process/group, adopted
  descendants, relay process, and tmux objects, while retaining
  preserve/reject for undecidable destruction (`:247-253`); and
- Decision 4 still requires exclusive directory mutation authority or an
  atomic conditional unlink, otherwise the leak-free requirement must be
  explicitly amended to permit preservation (`:254-257`).

## P1a — site-inventory closure

All four named gaps are closed:

| Design Trial 1 gap | Ruling |
|---|---|
| Broker/operator and programmatic PTY writes lacked R2 | Closed at `:207-208`: both require the atomic PTY-write effect and reject before `os.write` under current primitives. |
| Provider-output authority was one-sided | Closed at `:209-212`: PTY-source authority and relay-destination authority are separate mandatory effects, including snapshot drain. |
| Utility/process-tree retirement was omitted | Closed at `:220-222` and Decision 3: utility group, adopted descendants, relay process, pane, session, and server are named separately. |
| `RELAY_DATA_CLOSE` was omitted | Closed at `:217`: no close frame is sent; direct retained-descriptor `shutdown`/`close` performs retirement. |

The amendment additionally names direct once-only closure of supervisor
control, transcript, session-port request/response, and other retained
sideband descriptors (`:219`). I walked readiness, helper sideband
dispatch/response, relay input, both PTY writes, provider output, barrier and
drain, tmux observation/capture, canonicalization, settlement, every current
teardown transfer, utility/relay/tmux retirement, runtime/key/socket removal,
and observation exposure against the table. I found no remaining unlisted
authority effect requiring a sixth decision.

## P1b — proof-obligation closure

The three non-isolated rows from Design Trial 1 are now independently
falsifiable:

1. **R1 retained endpoint:** the setup supplies valid PTY-source and
   relay-destination R2 records, a live R4 generation, and a reachable
   25-byte retained-fd baseline before only the endpoint lookup is mutated
   (`:285`).
2. **R2 atomic capture:** geometry and generation are separate cells. The
   generation cell presents H where G is required with every other field
   valid and stops at record acceptance before R4 settlement (`:290-291`).
3. **R4 sticky generation:** G is revoked without replacement while endpoints
   and R2 evidence remain unchanged; a separate direct transition cell proves
   non-revival without invoking R1-R3 (`:299-300`).

The two conditionally adequate obligations are also concrete:

- relay R2 selects exactly one provider-output destination send and supplies
  a valid PTY-source record (`:286`); and
- R3 has one row per utility group, adopted descendant, relay process, tmux
  pane, tmux session, tmux server, and socket inode, with other targets
  disabled in each run (`:292-298`).

The added PTY-write, PTY-source, teardown-frame, capture-geometry, and
generation cells likewise name one mutation and one byte/effect boundary
(`:287-291`). The table retains the rule that a mutation proof is invalid if
another intact rule rejects first (`:302-303`).

## RESTRICT audit

PASS.

I searched the amended prose for skip, warn, allow, tolerate, exempt,
best-effort, fallback, and equivalent successful escape language.

- Every undecidable relay, PTY, capture, destruction, or unlink prerequisite
  rejects.
- Destructive cleanup may preserve an unresolved object, but the destructive
  step and operation reject; preservation never becomes successful cleanup.
- Cooperative relay exit is reached by identity-bound descriptor shutdown.
  Forced termination still requires a retained destruction capability.
- D/0/07b framing and disposition ownership grants no authority exception.
- Missing, malformed, or contradictory atomic capture evidence rejects before
  canonicalization or settlement.
- Diagnostic reads are expressly permitted only because they are
  non-authorizing and rejection-only (`:49-54`, `:213`). This resolves the
  prior ambiguity without weakening the binding rule.

I found no route by which undecidable input reaches a successful effect or
result.

## Preserved-behavior check

The candidate range changes one design document and the request adds one
review document; production and tests are unchanged. The focused existing
gates passed:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 39
pass 39
fail 0
skipped 0

node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js

tests 16
pass 16
fail 0
skipped 0
```

On this host, `tmux -V` reported `tmux 3.6`. The existing relay gate
re-established:

- exact direct capture argv
  `["capture-pane","-p","-N","-T","-t",target,"-S","-400"]`;
- real tmux figures `40 -> 0`, `61 -> 24`, and `50 -> 12`;
- exact row-end spaces and canonical final-LF behavior;
- terminal-changed rejection for stable `121x40` and
  `history-limit=401`;
- rejected-binding non-revival without further reader calls; and
- fail-closed malformed or absent identity/history/capture evidence.

The amendment preserves each as a future regression obligation while
correctly refusing to use those positive results to authorize a current
non-atomic effect.

## Scope

PASS.

- Design commit `2a319e0e57b6e226bc0d2894481271e3f9d9873b`
  changes only
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`.
- Request commit `800a99a1f863c548af12b206c9e99bca366b0d68`
  adds only
  `plan/reviews/PROJECT_V5/D_0_7C_DESIGN-2_to_review.md`.
- `git diff --check` passed for the candidate range and worktree.
- No implementation, test, parent sheet, public error, port surface,
  adapter/service/catalog splice, provider launch, `D/0/07d`, integration,
  promotion, or release claim entered the candidate.

## What I did and did not verify

Verified:

- the full review brief, Design Trial 1 verdict, Design Trial 2 request,
  complete amended design, frozen D/0/07 and D/0/07c contracts, candidate
  lineage, and all changed lines;
- the actual `verify()`/`os.write()` mechanism, provider-output read/send
  mechanism, accepted binding, queue, barriers, capture, helper sideband,
  settlement, descriptor retirement, process-tree cleanup, tmux retirement,
  and filesystem cleanup sites;
- P0 closure, decision-set completeness, the complete no-weakening diff,
  finding-by-finding closure of both P1s, every RESTRICT exception,
  preserved behavior, and design-only scope;
- the full focused relay and inherited PTY/Darwin suites, with no failure or
  skip; and
- that the pre-existing untracked `gateway/node_modules` entry was left
  untouched.

Not verified:

- the five future operator-selected mechanisms do not exist, so I did not
  implement or execute an atomic relay, PTY, capture, destruction, or
  conditional-unlink facility;
- no Darwin host was available; the deterministic Darwin suite passed, but I
  did not make a live Darwin claim;
- I did not write standalone kernel, socket, lock, or process-introspection
  probes;
- I did not run full `bash scripts/ci.sh`, a D/0/07d composition/race gate,
  live providers, network behavior, integration, promotion, or release; and
- I did not decide any operator question.

No provider content filter interrupted a check. I used no sub-agent, did not
touch the default tmux server or any `ag-*` session, and changed no source,
test, design, or plan sheet.
