# Agents Gateway

## Local restart recovery

The recovery path is limited to Linux local stdio with SQLite. Startup derives
the principal from equal real/effective numeric OS UIDs and binds it to the
application-keyed machine-ID digest and the canonical state DB path. The DB
file and its directory must belong to that UID and be unwritable by group or
others. Gateway does not change their modes or ownership. A copied DB at a
different machine or canonical path cannot confer recovery authority.

After restarting the Gateway process on the same account, machine and state,
call `orchestration.view` with `{}` to discover eligible saved traces, then
call `orchestration.reattach` with only `{ "traceId": "<saved trace>" }`.
Discovery grants no ownership. Explicit reattachment checks every task's
repository ID/root, original expiry, canonical lifecycle state, prior owner
absence and exact tmux targets before claiming the trace. A live or ambiguous
prior owner refuses recovery; no time-based lease or extra approval is used.
Protected calls continue to recheck durable ownership, state and expiry.

The result lists recovered task/session IDs and sessions skipped as
`target_gone` or `session_closed`. Discovery sorts at most 100 eligible traces;
a saved explicit ID remains usable beyond that cap. Recovery sends no input
and starts or kills no child. It restores supervised sessions only, without
artifact, headless-session or approval grants, and never renews expiry.

Darwin, PostgreSQL and missing or invalid local identity return an empty
discovery and the generic `REQUEST_CONTEXT_DENIED` on reattach. Ordinary
non-recovery calls remain available. This trusts the local account, credential
namespace, machine identity and private state; it supplies no cross-host or
remote-user authentication guarantee. Restarting the Gateway can preserve
tmux children; a physical machine reboot generally loses them. Provider live
restart acceptance remains an operator-run check for this candidate.

Launch cleanup covers retained tmux receipts and descendants still observable
under their Linux process ancestry, including children of non-main threads.
Unobserved reparented non-tmux descendants without a retained receipt are
unsupported: a private tmux server does not contain that provider tree.
Numeric-PID observation and signalling have PID-reuse races and do not supply
pidfd guarantees; initial PID reuse and tmux server-lifetime ID reuse remain
limits. Ambiguous private-server identity returns `ADAPTER_CLEANUP_FAILED`
and retains its socket and private `server-identity.json` for operator audit.
Pane cleanup refusal still closes a wholly-owned private server only while
its exact socket-observed Linux identity remains verified.

If authority expires or is revoked while a kill is in progress, its dead
target can leave a stale `running` session row. A later explicit recovery
reports `target_gone` and grants no session authority for that dead target.

Node.js support is defined by the repository's
[canonical runtime contract](../docs/node-runtime.md) and enforced during npm
installation.

The [worker environment contract](../docs/worker-environment.md) describes the
informational role, trace and task markers set on every executable child.

The [canonical MCP tool catalog](../docs/mcp-tool-catalog.md) is generated from
the typed runtime catalog and pins all 34 tool names in protocol order.

## MCP client identity and context lifetime

Set `AGENTS_REQUEST_PRINCIPAL_AGENT` in the Gateway launch environment to the
agent running the MCP host (`claude-code` by default, or `codex`). The role
remains `orchestrator`. Tool arguments cannot change this identity; mismatched
caller agents or roles are rejected with `REQUEST_CONTEXT_DENIED`.

`AGENTS_REQUEST_CONTEXT_TTL_MS` sets a positive integer lifetime in milliseconds
for the connection context. The default is 24 hours (`86400000`); an operator
can explicitly configure a longer session, such as `604800000` for seven days.
The lifetime is measured from connection creation, not renewed by each request.
Protected calls after expiry are denied; restart the connection to create a
fresh context. These settings do not alter coordination leases or retention.

Codex defaults to `gpt-6.1-sol` / `max` / `priority`; Claude defaults to
`claude-opus-5-5` / `max`. The default models also accept `gpt-6.1` and
`opus-5.5` / `opus-5-5`, respectively. The catalog includes the explicit
alternative `claude-sonnet-5-5` (`sonnet-5.5`). Existing aliases keep their
previous targets. Registration does not establish provider availability;
real execution still requires a compatible authenticated provider CLI.

## Supervised prompt submission

The five executable adapters share a composer submission guard. It delivers text
in an owned tmux buffer, preserves LF bytes, checks the current composer before
each separate Enter, and confirms a new busy indicator before returning success.
One extra Enter is permitted only for an unchanged, positively identified draft.
Menus, unknown layouts, ambiguous delivery, and concurrent asks to the same pane
receive a bounded `AGENT_PROMPT_NOT_SUBMITTED` failure. Submission audit records
contain prompt length and confirmation, without prompt or pane content.

`AGENTS_TMUX_SUBMIT_DELAY_MS` controls the settle interval between paste and the
first composer check: default 150 ms, accepted range 1–1000 ms. This conservative
default is exercised in simulated TUI tests; no live provider timing measurement
is claimed. Acceptance observations use the existing 1500 ms delay, at most
twice, and never replay the prompt text. Shell launch commands use literal
single-line text followed by a separate Enter; newline/control bytes are refused.

Framed delivery requires the agents tmux runtime's atomic `paste-buffer -G -p -r`
guard and the consuming `agents-submit-v1` command for the final CR. Every
operation probes the same server for exact `.4` and both commands before
creating any buffer. Older runtimes, including `.3` and `.2`, refuse with
`paste_unavailable` before input. Raw captured screen evidence and pane metadata
are checked again inside submit before enqueue; nondiagnostic failures are
`acceptance_uncertain` and never replay input. Runtime `3.6a-agents.4` supplies these guards;
the real emitted-byte fixture covers framing and refusals. See
[`docs/tmux-runtime.md`](../docs/tmux-runtime.md) for the isolated build/test
instructions. Terminal byte proof does not establish provider acceptance.

Source-backed classifier fixtures currently cover Codex `0.160.1` composer
glyphs, placeholder/cursor, context footer and Working interrupt indicator
([pinned composer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/bottom_pane/chat_composer.rs),
[pinned snapshots](https://github.com/openai/codex/tree/rust-v0.160.1/codex-rs/tui/src/bottom_pane/snapshots),
[pinned status indicator](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/status_indicator_widget.rs)).
Pi `0.73.1` fixtures follow its installed `interactive-mode.js` working loader
and `pi-tui` editor borders. Custom themes, shortened footers, large-paste
placeholders and layouts that cannot positively identify the exact draft fail
closed. OpenCode `1.18.20` source fixtures cover the default left border,
Build/Plan metadata, placeholder/cursor and active interrupt footer
([pinned prompt](https://github.com/anomalyco/opencode/blob/v1.18.20/packages/tui/src/component/prompt/index.tsx),
[pinned borders](https://github.com/anomalyco/opencode/blob/v1.18.20/packages/tui/src/ui/border.ts)).
Shell mode, paste summaries and overlays refuse; custom agents/themes/layouts
remain unverified. Claude Code `2.1.292` source fixtures use the installed
binary's embedded default Unicode composer: two plain horizontal borders,
`❯` with a U+00A0 separator, a visible `Try "..."` placeholder at the input-start
cursor, and the adjacent shortcut or loading interrupt footer. Only small
fully visible ASCII single-line drafts with the cursor at the end can submit;
summaries, wrapped text, ghost text, alternate layouts and blank idle inputs
refuse. The binary hash and source byte/line anchors are retained in
[`claude_2_1_292_composer.json`](../tests/gateway/fixtures/claude_2_1_292_composer.json).
These fixtures were derived by reading the binary as data; Claude was never
invoked, including version/help commands. This is a source-backed profile,
not measured pane rendering or live acceptance evidence.

Current composer observations use `capture-pane -N -T` to preserve rendered
row-end spaces. Owned raw-terminal tests cover exact leading/trailing spaces
and Codex blank/multiline endings; they are transport simulations, not live
provider evidence. Decision classification uses focused numbered panels or
the OpenCode permission overlay, keeping ordinary history and draft words
separate from active menu evidence. The candidate implements the server-side evidence-bound `agents-submit-v1`
guard; independent source review is pending. Provider-internal state changes
remain a residual that terminal evidence cannot exclude. No provider acceptance
is claimed.

Antigravity's `agy` executable is installed, but its isolated static help
strings do not establish a composer/acceptance renderer. Its profile continues
to refuse `unknown_state` until source or an operator-coordinated capture
establishes those markers. No live provider prompt acceptance has been verified;
the required operator Codex/Claude checks and timing measurement remain pending.
Claude invocation is now operator-authorized, with installed version `2.1.293`;
the retained `2.1.292` source fixture does not establish live compatibility.
A root-operated ready-pane capture now establishes two additional narrow
`120x40` ready layouts: Codex `0.160.1` with its measured model/status row
and shortcuts/warnings footer, and Claude Code `2.1.293` with a blank row
between the bottom composer border and the auto-mode footer. The
[sanitized ready fixtures](../tests/gateway/fixtures/a04_live_ready_profiles.json)
preserve cursor and pane-mode metadata and the relevant rendered rows; history,
account information, quota data and local paths are removed. These profiles
use the explicit provider argument; the displayed model/status row is not
provider or policy inference. Changed footers, cursor drift and focused
decisions remain closed. These captures show readiness only: the root's asks
were refused before input, and successful live submission, busy rendering and
acceptance timing for these layouts still require root-operated verification.
A subsequent root capture shows Codex's warning label varies between singular
and plural with padded alignment. Claude's post-paste composer can instead show
an ASCII `user@host:/absolute/path` status row immediately after the bottom
border, followed by the shorter `⏵⏵ auto mode on (shift+tab to cycle)` footer.
The classifier accepts this measured status/footer pair at 120x40 while keeping
exact draft and cursor checks. The
[trial 2 sanitized fixtures](../tests/gateway/fixtures/a04_live_profiles_trial2.json)
retain the observed pre-ask and post-paste rendering. The root recorded only
pre-ask cursor metadata; post-paste fixture cursor values are derived test
values, not measured metadata. Paths and status identities are redacted, and
the prompt marker is replaced with benign ASCII of the same length. The local
status line is rendering evidence only and grants no path, account or approval
authority. No successful live acceptance was observed in this capture either.
The [trial 3 sanitized fixtures](../tests/gateway/fixtures/a04_live_profiles_trial3.json)
now retain recorded pre-ask and error-state metadata. Codex's observed pasted
ASCII single-line draft keeps its measured status row but changes the footer
to exactly `  tab to queue message`. This layout is accepted only during the
post-paste draft phase, with a nonempty draft, exact end cursor, 120x40 geometry
and blank trailing rows. Initial readiness and blank placeholders with that
footer refuse; it is not acceptance evidence. The draft phase also observes
whether the same draft remains after CR for the existing bounded retry; no
footer itself confirms success. Claude's measured pre-ask local status row
also pairs with the full auto-mode footer containing `← for agents`; both
recorded Claude panes are unchanged placeholders, with no input received.
Trial 3 replaces the previously inferred post-paste metadata boundary for its
own Codex fixture with the root's actual error-state cursor (57,36). Local
paths/identities and the prompt marker remain redacted. These captures still
do not establish successful live acceptance.
The [trial 4 sanitized fixtures](../tests/gateway/fixtures/a04_live_profiles_trial4.json)
correct the queue-row padding omitted from trial 3. The root's current captures
use the Gateway's exact `capture-pane -N -T` flags: the queue footer row is
119 characters, including 97 trailing literal spaces. Matching keeps the exact
two-space leading indentation and permits only trailing literal spaces, with
all draft-phase and refusal checks unchanged. Sanitization preserves observed
trailing spaces on every row, including rows whose private text is removed.
Recorded Codex cursor metadata is unchanged. The current Claude error capture
follows one Enter and an `acceptance_uncertain` result; it proves neither
successful acceptance nor permission to replay. Its footer needs no matching
change. Live acceptance and the independent review of the inherited trial 3
phase correction remain open.
[Trial 5 sanitized captures](../tests/gateway/fixtures/a04_live_profiles_trial5.json)
show both providers answered the disposable prompt, while `agent.ask` returned
`acceptance_uncertain`. Answer occurrence counts do not establish tool success.
The new measured Codex busy layout recognizes the active Working row four rows
above the composer, its padded empty placeholder and the observed status suffix
`· ⠦`. That suffix never proves acceptance alone. The post-Enter witness also
requires a current single-line ASCII prompt echo newly inserted into a previously
blank transcript row, unchanged preceding viewport rows, no stale Working/echo
in initial or final-guard history, and matching server/pane identity and size.
Duplicate echoes, intervening user turns, reflow and missing witnesses stay
uncertain without replay. The retained source-profile Working path now rejects
prior Working history independent of clock/row movement. Trial 6 admits only the
ten explicit spinner frames in the pinned 0.160.1
[status/title frame table](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/chatwidget/status_surfaces.rs#L31-L36),
also used by [status-line thread-title progress](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/chatwidget/thread_title_status.rs#L20-L49).
Unknown suffixes and completed-only Codex captures remain uncertain.
Trial 16 adds the measured 0.160.1 welcome viewport at 120×40: composer row 36,
footer row 39, Working row 33, blank rows 34–35 and a pinned spinner on row 38.
Its version header, exact newly inserted prompt echo on row 15, unchanged
preceding welcome rows and blank rows 16–32 bind the first Enter. Ready,
pasted draft, final guard and after must retain server/pane identity and size;
all three pre-Enter histories must lack the echo and any prior Working row.
This witness never credits a second Enter or a completed-only reply. Other
three-row layouts, menus, unrelated busy output and missing evidence remain
uncertain. The sanitized fixture derives from root's disposable live check;
refined-candidate live acceptance and independent review remain outstanding.
Trial 17 addresses only a reported intermittent pre-submit refusal: one 0.160.1
post-paste draft showed the exact prompt at row 36 and an idle cwd status at
row 38, but row 39 contained only spaces and `⚠ 2 warnings · f2 to view`.
No later state was captured; eleven subsequent disposable runs were positive,
including a 1 ms submit delay. Those runs do not prove that the rare state is
stable or that changing the delay fixes it. The sanitized draft-only fixture
reconstructs the supplied layout and uses synthetic padding and identifiers.

The warnings-only variant is limited to draft phase, the exact 0.160.1 header,
120×40 geometry, exact visible single-line ASCII text/end cursor, blank history
below the welcome copy and no prior Working. It never authorizes initial input
or counts as acceptance. After guarded bracketed paste, pending and guard must
both identify this variant and have identical captures. They must share ready's
server/pane identity, size, unchanged prefix and cwd status before the first
guarded Enter. Any footer transition, changed state or missing observation
refuses without Enter. The variant cannot authorize a retry Enter. Existing
queue/warnings profiles and positive acceptance checks are unchanged. Live
reproduction of a stable rare draft, refined-candidate acceptance and fresh
independent review remain outstanding; reliability is not claimed from fixtures.
The startup-notice draft profile additionally covers the exact Codex 0.160.1
→ 0.161.0 static notice and welcome header at rows 0–12 in a 120×40 pane.
The pinned [notice history cell](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/history_cell/notices.rs)
and [session header renderer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/history_cell/session%2Ers)
separate this layout from an interactive update picker. Row 12 varies only
among the 88 pinned [greetings](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/empty_state_animation/greetings.rs);
the [fresh-thread OnceLock](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/empty_state_animation.rs)
retains that selection. Rows 11, 12 and 38 tolerate trailing U+0020 spaces
only, within pane width. All other pins and exact ready-prefix/status and
pending/guard byte equality remain required before the first guarded Enter.
The original transcript fixture reconstructed cursor/LF and omitted raw
padding; the separate trial-2 fixture records diagnostic cursor/LF metadata
and raw values for selected padded rows, and labels every reconstruction.
Neither fixture is a complete raw ready/draft/guard sequence. Draft-only
submission checks end in `acceptance_uncertain`; no post-Enter frame was
available when this draft profile was designed. The operator subsequently
reported one guarded Enter and delayed prompt history/Working output on the
padding correction. Acceptance of that shifted-header layout requires a
separate tested profile and remains unverified by this candidate. Other versions
or update commands, a YOLO permissions row, truncated or space-containing cwd,
wrapped notice, menus and changed warning footers remain unsupported. This
profile never authorizes a retry or infers acceptance from a draft.

The separate startup-notice Working profile recognizes the raw 0.160.1
header-at-row-9 viewport at 120×40: one user echo at row 15, `• Working` at
row 33, empty placeholder composer at row 36, matching cwd/spinner status at
row 38 and the exact shortcuts/warnings footer at row 39. All rows fit pane
width; gaps accept only U+0020 spaces. It reuses the first-Enter freshness proof:
unique new exact prompt echo, unchanged preceding rows, no prior Working and
the same server/pane/PID/geometry in every frame. A matching busy pane refuses
initial input. The four delayed raw captures are sanitized with equal-length
cwd/prompt replacements; pre-Enter frames and pane metadata are reconstructed
and labelled. They establish the rendered shape, not visibility during the
Gateway's acceptance observation. `◦ Working`, completed-only output, other
layouts, menus, changed prefixes and stale evidence remain unconfirmed. No
new polling, timing or retry is added. Independent review and live A05
acceptance on this candidate remain operator-owned.

The separate post-turn Ready profile covers one measured completed-turn
viewport after explicit Gateway reattach: the same notice/header, a single
ASCII prompt at row 15, single ASCII assistant cell at row 18, `Worked for`
completion at row 20, empty composer at row 36 and exact 2-warning footer.
The 87-character ASCII cwd leaves only `R…` visible from idle `Ready` at
120×40. This pin is grounded in the [idle-status renderer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/chatwidget/status_surfaces.rs)
and [ellipsis clipping](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/line_truncation.rs).
It is readiness only. Ready/refusal raw panes were identical, with synthetic
path/prompt/reply replacements in the fixture; cursor/process metadata and
post-paste drafts are reconstructed. A hypothetical unchanged single-line
draft can receive one guarded Enter only through the existing warning-draft
bindings. Busy/menu states, incomplete or extra history, changed bytes and
other clipping/geometry/footer variants stay closed. There is no new retry,
transport or recovery authority. The old response and completion never confirm
the second ask. Independent review and live A05 verification of the bounded
confirmation profile below remain operator-owned.

The separate second-turn confirmation witness runs only after the existing
single guarded Enter. It binds the same server, pane, process and geometry,
unchanged old history through row 22, and one new exact prompt echo at row 23.
At 120×40 with cursor 36/2, unchanged empty composer/status/footer, it accepts
only the measured Working row 33 with otherwise blank new history, or a new
single-line ASCII assistant cell at row 26 plus a new completion at row 28.
The [assistant/user cells](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/history_cell/messages.rs)
and [completion separator](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/history_cell/separators.rs)
provide the markers; the fixture pins their measured row placement. This
confirms submission, not reply semantics or screen-text authenticity. The
partial response without completion, old reply, changed payload/history,
menu, extra turn, drift and unknown layouts remain uncertain. These frames
never grant initial readiness. Raw rows retain padding and final LF with
equal-length synthetic private fields; metadata and pre-Enter drafts are
explicit reconstructions. There is no extra observation, Enter or retry.

Codex's Working and user-history markers are grounded in the pinned
[status renderer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/status_indicator_widget.rs)
and [user history renderer](https://github.com/openai/codex/blob/rust-v0.160.1/codex-rs/tui/src/history_cell/messages.rs).
Claude's completed `●` response was left uncertain in trials 5–9. The operator
subsequently selected option 1 in the
[completed-turn decision](../plan/PROJECT_V6/reviews/A_0_4_to_check_by_human.md);
the [trial 10 memo](../plan/PROJECT_V6/reviews/A_0_4-live-profile-10_operator-decision-memo.md)
records that instruction. The new completed-response witness is limited to the
first ask after a successful, plain supervised Claude launch registered by this
adapter instance. Eligibility is consumed before that ask, including failures,
and is lost on kill or Gateway restart. Reattached sessions have no eligibility.
Spawn, ready, pasted draft, final guard and post-Enter server/pane identity must
match. Geometry is pinned at the first ask: ready, pasted draft, final guard
and post-Enter frames must share the measured 120×40 geometry. A same-process,
same-pane resize before the first ask is allowed; any resize during the ask
remains unproven. The ready/draft/guard transcript must be blank;
the exact guarded single-line ASCII prompt must appear once as a new user cell,
followed by the measured printable single-line assistant cell with only blank
rows elsewhere. The empty composer, cursor, borders, idle footer and unchanged
prefix must match the measured 2.1.293 layout. All other completed layouts,
reused processes, history, duplicates, reflow, menus or missing evidence remain
`acceptance_uncertain` without replay. Existing active-busy witnesses retain
their separate behavior. Shell arguments in the configured executable disable
fresh-launch eligibility; executable-path wrappers are an operator-controlled
assumption, not binary attestation. This is observational first-prompt evidence,
not a general renderer contract or stable turn ID. A new live acceptance and
independent review are required before integration.

Trial 12 adds the observed Claude Code `2.1.294` first-ask layout: the
unchanged launch header occupies rows 1–3, the prior conversation at rows
4–33 is blank, and row 34 holds the measured medium effort hint. The exact
new user cell and assistant spinner can authorize observation only. Up to
eight further one-second captures wait for the measured single-line reply
and completion timing row; no additional Enter or paste is sent. Each capture
must retain the registered server/pane identity, first-ask geometry, header, effort hint,
empty composer and footer. Any unexpected intermediate frame or exhausted
poll remains `acceptance_uncertain`. This narrow profile covers the measured
Opus 5.5 medium launch, spinner and completion layout; other variants remain
unproven. The sanitized fixture reproduces a disposable live run that returned
uncertain at the initial observation and showed its reply seven seconds later.
Focused fixture tests do not constitute a successful live acceptance run of
the refined candidate.

Trial 13 corrects the cosmetic markers using byte-search evidence from the
installed 2.1.294 binary. Completion accepts exactly Baked, Brewed, Churned,
Cogitated, Cooked, Crunched, Sautéed and Worked. The working glyph may animate
among `·`, `✢`, `*`, `✶`, `✻`, `✽`; the spinner verb must match
`[A-Z][A-Za-z]*(?:-[a-z]+)*` and remain identical across all working frames.
The existing parenthetical format, version gate and safety guards remain.
Ghostty's `✳` frame is unverified and refused. The private observation's cwd
is absolute and its header is unchanged; no tilde-path support is inferred.

Trial 14 also admits the observed pre-assistant transient: the exact prompt
echo with an empty assistant row and a bare spinner such as `* Proofing…`.
It authorizes only the same bounded first-ask observation poll. The spinner
word must remain unchanged through a transition to the existing assistant
cell with parenthetical status. Unobserved combinations stay uncertain;
identity, blank-history and no-second-Enter guards remain in force.
The [operator evidence request](../plan/PROJECT_V6/reviews/A_0_4-live-profile-5_operator-evidence-request.md)
records the missing timing and turn-binding measurements. Trial 5 lacked later
metadata; the [latest trial 6 captures](../tests/gateway/fixtures/a04_live_profiles_trial6.json)
include measured later cursor metadata and the newly observed `⠼` frame. They
still lack the pre-Enter guard capture and monotonic stage timestamps. The script waits
7 seconds after failure before its later snapshot. Simulated success against
sanitized Codex captures does not establish a successful live `agent.ask` retry.
Root coordinates live provider launches, including Antigravity `1.3.0`.
V6 A/0/04 is not closed.

## Gateway Telemetry

Gateway MCP tool calls can emit one OTel-inspired span per `tools/call` request.
Telemetry is disabled by default, including local and test runs, so MCP protocol
output on stdout is unchanged unless explicitly enabled.

Environment variables:

- `AGENTS_OTEL_ENABLED`: set to `1`, `true`, `yes`, or `on` to enable spans. Any other value, or an unset value, disables telemetry.
- `AGENTS_OTEL_EXPORTER`: `stderr` writes JSON span records to stderr. `none` keeps telemetry enabled internally but drops exported spans. Defaults to `stderr`.
- `AGENTS_OTEL_SERVICE_NAME`: service name recorded on spans. Defaults to `agents-gateway`.

This is a dependency-free foundation, not a full OpenTelemetry SDK or OTLP
exporter. W3C trace context propagation and collector export are future
hardening work.

Span safety rules:

- Span name is always `mcp.tool.call`; MCP tool names and schemas are not changed.
- Recorded attributes are limited to tool name, trace/session/task IDs when available, approval mode/scope when available, trace source, result status, and safe error codes.
- Raw prompts, artifact contents, secrets, stdout/stderr payloads, restricted data, and exception messages are not recorded.
- Incoming `traceId` or `trace_id` from tool arguments, argument metadata/context, request metadata, or handler metadata is preserved. If absent, the gateway generates a trace ID for telemetry and audit-compatible tool-call metadata without injecting it into tool arguments.
- When telemetry is enabled, the Gateway records a safe `MCP_TOOL_CALL` audit
  event for tool-call metadata. With telemetry disabled, default audit volume is
  unchanged.

Logs and span exports are written to stderr. MCP JSON-RPC remains on stdout.

## V5 coordination plane

V5 adds an addressed coordination plane for gateways, orchestrators, agents,
and sessions. It is not a replacement for task policy, approvals, or the
legacy `message.*` tools (`message.send`, `message.list`, and `message.reply`):
a received body is untrusted data and never grants authority by itself.

The MCP registry exposes exactly eight additive tools, in this order:

| Tool | Required input | Result |
|---|---|---|
| `coordination.status` | none | Read-only Redis readiness, canonical scope, safe queue descriptor, and lease limits |
| `coordination.register` | `participantType` | Public participant, one-time plaintext `leaseToken`, and queue descriptor |
| `coordination.heartbeat` | `participantId`, `leaseToken` | Renewed public participant |
| `coordination.discover` | `participantId`, `leaseToken` | Sorted array of active participants in the caller's scope |
| `coordination.unregister` | `participantId`, `leaseToken` | `{ participantId, unregistered }` |
| `coordination.send` | Credentials, `toParticipantId`, `messageType`, `classification`, `body` | `{ message, deliveryId, duplicate }` |
| `coordination.receive` | Credentials, `consumerId` | Array of `{ deliveryId, message, recovered }` deliveries |
| `coordination.ack` | Credentials, `deliveryIds` | `{ ackedCount, deliveryIds }` |

All MCP schemas reject unknown top-level fields. `participantType` is one of
`gateway`, `orchestrator`, `agent`, or `session`. Discovery can additionally
filter by the caller's own `scopeId`, a participant type, and one capability.
Registration also accepts the configured canonical `scopeId`, a display name,
capabilities, scalar metadata, and a bounded lease duration. Omitting
`scopeId` uses the instance's canonical scope; supplying a different one fails
with `COORDINATION_SCOPE_MISMATCH` before Redis is written. Heartbeat can
supply a new bounded lease duration; otherwise it uses the 15-minute default.
The advertised and enforced v1 ceiling is 72 hours (`259200000` ms).

`send` accepts only `internal` and `unrestricted`; `restricted` is denied.
It also rejects secret-like or oversized bodies. The service, rather than the
body, supplies the authenticated sender and scope. `messageId` is optional,
but callers should provide a stable value for retries: an equal retry returns
the original delivery and renews its dedupe window, while a changed retry with
the same sender and ID fails with `COORDINATION_MESSAGE_CONFLICT`. Optional
`traceId`, `correlationId`, and `replyToMessageId` fields travel in the
canonical message envelope.

`receive` defaults to 10 deliveries and accepts at most 100. `blockMs` may be
zero or no greater than the configured maximum; `reclaimIdleMs` enables
recovery of idle pending deliveries. `ack` accepts 1–100 canonical Redis
Stream delivery IDs and validates the whole recipient-bound batch before
mutation.

### Direct Node access

Node callers use the same service and public result shapes as MCP. Environment
variables are normalized by `loadConfig`; `createCoordination` does not read
them independently.

```js
import { loadConfig } from "./src/config.js";
import {
  CoordinationError,
  createCoordination,
} from "./src/coordination.js";

const coordination = createCoordination({ config: loadConfig() });
const health = await coordination.status({});
const registered = await coordination.register({
  participantType: "orchestrator",
  displayName: "Primary orchestrator",
  capabilities: ["coordination.v1"],
});

// Keep these credentials private; never log the complete registration result.
const credentials = {
  participantId: registered.participantId,
  leaseToken: registered.leaseToken,
};

try {
  await coordination.heartbeat(credentials);
  const peers = await coordination.discover(credentials);
  // Select a peer by trusted identity/capability before sending.
} catch (error) {
  if (!(error instanceof CoordinationError)) throw error;
  // Branch on error.code without logging credentials or message bodies.
}
```

The plaintext lease token is returned only by registration; Redis stores its
SHA-256 digest. Keep the token in an appropriate secret-bearing runtime store,
heartbeat before expiry, and register a new identity if the credential is lost
or expires. Do not put secrets in participant metadata: metadata is visible to
other active participants in the same scope and is not secret-scanned.

Long-running orchestrators should use the managed profile exported beside the
direct factory:

```js
import { loadConfig } from "./src/config.js";
import {
  createCoordination,
  createOrchestratorCoordinationClient,
} from "./src/coordination.js";

const coordination = createCoordination({ config: loadConfig() });
const client = createOrchestratorCoordinationClient({
  coordination,
  registration: {
    displayName: "Primary orchestrator",
    capabilities: ["coordination.v1"],
  },
});

await client.start();
try {
  const peers = await client.invoke("discover", {
    participantType: "orchestrator",
  });
  // Select a trusted peer before using send, receive, or ack.
} finally {
  await client.stop();
  await coordination["close"]();
}
```

`start()` validates the advertised protocol and canonical scope, registers an
`orchestrator` explicitly in that scope, validates the returned identity, and
keeps the lease alive around half of its advertised lifetime with bounded jitter.
The client owns the credentials and injects them only into `discover`, `send`,
`receive`, and `ack`; it never retries those actions. Known lease loss starts
one bounded, single-flight re-registration. Transient heartbeat failures use
finite exponential backoff and end in `degraded` instead of retrying forever.
`getStatus()` exposes only safe identity fields, state, retry metadata, and
recovery guidance—never the lease token. Each factory-created client is
single-use. Its terminal, idempotent `stop()` resolves without waiting for a
pending status, registration, heartbeat, or unregister call; epoch fencing
prevents late completions from reviving it and late credentials are cleaned up
best effort. Create a new client to recover after retry exhaustion.

The Gateway MCP process configures local audit automatically. An embedded
direct caller that needs JSONL audit must configure the process audit once or
inject an `audit` callback into `createCoordination`. Audit is best effort and
cannot change an authoritative operation result.

Construction and `tools/list` are network-lazy. `coordination.status` performs
the first read-only `PING` and does not register a participant or emit a domain
event. If no coordination Redis URL is configured, all eight tools remain
discoverable and status returns `COORDINATION_UNAVAILABLE`. Legacy tools
remain usable.

### Compatibility

V5 runs inside `agents-gateway`; it does not add a second MCP server or a
standalone orchestrator process. MCP and direct callers that use the same
Redis URL and prefix interoperate through the same participant and inbox
state.

No existing tool is renamed or removed. The persistence, trace authorization,
and payload contract of `message.*` stay unchanged. The legacy audit publisher
still owns `agents:events`, while coordination uses dedicated keys and
`<prefix>:events`. Falling back to `AGENTS_REDIS_URL` can share a Redis
instance, but never the legacy Stream or key namespace.

`artifact.list` now requires the same legacy `requesterAgent` and
`requesterRole` fields as `artifact.get`, evaluates `artifact.list` policy, and
records `POLICY_DECIDED` in the local JSONL audit. The list decision
deliberately does not publish to `agents:events`. These fields reduce the
previous unauthenticated listing surface but remain caller assertions, not
authenticated identity. V5 Stage D replaces both artifact call shapes with
server-derived `RequestContext`; clients should not treat the transitional
fields as proof of authority.

### Runtime configuration

`AGENTS_COORDINATION_REDIS_URL` selects the coordination Redis instance and
falls back to `AGENTS_REDIS_URL`. An empty result disables coordination.

| Variable | Default | Contract |
|---|---:|---|
| `AGENTS_COORDINATION_REDIS_URL` | `AGENTS_REDIS_URL` or disabled | Redis URL; use `rediss://` with system trust where TLS is required |
| `AGENTS_COORDINATION_PREFIX` | `agents:coord:v1` | Dedicated safe key prefix; `<prefix>:events` must not equal `agents:events` |
| `AGENTS_COORDINATION_SCOPE_ID` | `agents-orchestrator` | Canonical safe scope accepted by this Gateway instance |
| `AGENTS_COORDINATION_LEASE_DEFAULT_MS` | `900000` | Positive safe integer, not above lease maximum |
| `AGENTS_COORDINATION_LEASE_MAX_MS` | `259200000` | Positive safe integer, at most the v1 ceiling of 72 hours |
| `AGENTS_COORDINATION_INBOX_MAX_LEN` | `10000` | Positive safe integer; sends fail before overflow |
| `AGENTS_COORDINATION_MAX_BLOCK_MS` | `30000` | Positive safe integer; upper bound for receive blocking |
| `AGENTS_COORDINATION_COMMAND_CONCURRENCY` | `64` | Positive safe integer; in-flight command-client admission bound |
| `AGENTS_COORDINATION_COMMAND_QUEUE_MAX` | `256` | Positive safe integer; queued command-operation bound |
| `AGENTS_COORDINATION_BLOCKING_QUEUE_MAX` | `32` | Positive safe integer; queued blocking-receive bound |
| `AGENTS_COORDINATION_SHUTDOWN_TIMEOUT_MS` | `2000` | Positive safe integer; graceful client-drain bound |
| `AGENTS_COORDINATION_MESSAGE_MAX_BYTES` | `65536` | Positive safe integer, at most the v1 schema limit of 65536 |
| `AGENTS_COORDINATION_DEDUPE_TTL_MS` | `86400000` | Positive safe integer; equal-send retry window |
| `AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS` | `86400000` | Positive safe integer; exact ACK retry window |
| `AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS` | `86400000` | Positive safe integer; deferred stale-inbox cleanup window |

Numeric values are parsed with JavaScript `Number()` and must resolve to
positive safe integers. Lease values above the configured maximum and message
limits above 65,536 are rejected; they are not silently clamped.

Each Gateway owns one lazy persistent RESP2 command client and one dedicated
blocking client for its coordination service. Admission is bounded before
node-redis receives work. Offline queuing and automatic reconnect are disabled:
a failed dispatched operation is never replayed, while the next operation
coalesces one fresh connection attempt through its completed handshake.
`isOpen` is not treated as readiness: open-but-not-ready callers wait and
dispatch nothing. Stdin end, `SIGINT`, and `SIGTERM` close the registry once,
drain up to the configured timeout, cancel remaining work through a lane-owned
shutdown epoch, detach listeners, and destroy only those owned clients. After
the deadline every unsettled caller receives `COORDINATION_UNAVAILABLE`; late
transport outcomes are consumed, and connecting/post-handshake cleanup is
tracked separately for each connection generation.

Redis 7 standalone with one shard is the supported V5 topology. Cluster,
Sentinel, custom TLS CA/client-certificate settings, and automated ACL/TLS
acceptance are not implemented. Redis applies key TTL using its own clock,
while Gateway time supplies public timestamps and lease prechecks; keep hosts
time-synchronized.

### Errors

MCP structural validation returns `INVALID_INPUT`; lease validation is mapped
to the domain error so it names `leaseTtlMs` and the exact limit. Strict
service validation returns `COORDINATION_INVALID_INPUT`. Direct callers receive
`CoordinationError` with the same service `code` exposed through MCP:

- Availability and safe failure: `COORDINATION_UNAVAILABLE`,
  `COORDINATION_INTERNAL_ERROR`, `COORDINATION_ID_COLLISION`.
- Credential and lease fencing: `COORDINATION_AUTH_FAILED`,
  `COORDINATION_LEASE_EXPIRED`, `COORDINATION_LEASE_CHANGED`.
- Addressing: `COORDINATION_SCOPE_MISMATCH`,
  `COORDINATION_TARGET_NOT_FOUND`.
- Message policy and capacity: `COORDINATION_CLASSIFICATION_DENIED`,
  `COORDINATION_SECRET_REJECTED`, `COORDINATION_MESSAGE_TOO_LARGE`,
  `COORDINATION_MESSAGE_CONFLICT`, `COORDINATION_INBOX_FULL`.
- Acknowledgement: `COORDINATION_DELIVERY_NOT_FOUND`.

Treat error codes as the stable branching surface. Do not include credentials,
bodies, participant metadata, or raw exception details in operator logs.

### Delivery and audit behavior

Messages are addressed, same-scope, and at least once. A receive claims
deliveries for a consumer; callers must ACK them or allow another consumer to
reclaim them. Dedupe and ACK idempotency last only for their configured
windows. An exact ACK retry within the tombstone window reports zero newly
acknowledged deliveries; after expiry it can be unknown. Business consumers
needing a longer guarantee must retain and deduplicate by `messageId`.

Registration atomically creates an absent identity and stores only the token
digest. Heartbeat, discovery, send, receive, ACK, and unregister repeat the
participant digest and scope fence at the Redis operation boundary. Blocking
receive fences before and after the wait so a stale or replaced lease returns
no data. Raw Redis credentials still bypass service validation, so keep Redis
network-isolated and grant the Gateway service principal only the minimum ACL
required by the deployment.

Coordination domain events, and coordination `MCP_TOOL_CALL` records when
telemetry is enabled, are written only to local JSONL. The coordination
metadata Stream is under the dedicated coordination prefix. Neither path
publishes to `agents:events`; the legacy audit publisher and `message.*`
semantics are unchanged. Bodies, plaintext lease tokens, token digests, and
participant metadata are excluded from coordination audit records.

### No-restart rollout

Do not stop or restart a shared MCP process to validate V5. Prove the build
against an ephemeral Redis 7 instance with an isolated UUID-like prefix and
the required `AGENTS_TEST_REDIS_URL` test variable; never point live tests at a
shared prefix and never use `FLUSHDB`. The full CI gate reports missing Redis
test infrastructure separately and returns nonzero. Existing Gateway processes
keep their startup tool registry. Each client adopts the eight tools when it
starts a new Gateway process (or reconnects in a mode that launches a fresh
stdio process).

### Supervised trust and permission prompts

Codex and Claude Code supervised sessions watch the current visible pane once
per second. `agent.view` also observes the pane and returns `promptApproval`
with the approval ID, kind, exact rendered command, options and pane target.
The request action is `session.prompt.command`, `session.prompt.trust`,
`session.prompt.permission` or `session.prompt.unknown`. Approval requests are
non-blocking; a human uses `approval.respond` to grant or deny them. Unknown
menus always need manual operator intervention and never receive Gateway keys,
even if their approval is granted.

No commands are automatically answered by default. Only the operator may add
`sessionPromptScopes` to a role in `policies/roles.json`, for example:

```json
{
  "sessionPromptScopes": [
    { "kind": "command", "command": "npm test", "action": "test.run" }
  ]
}
```

Each scope is an exact rendered-text match, including line breaks. The operator
must classify the actual command with its canonical underlying action; a scope
is not a shell parser and cannot infer the safety of arbitrary commands. The
role must explicitly list both `session.prompt.command` and `test.run` in its
`allowActions`; neither action may be denied or require approval for automatic
answers. Additionally enable `session.prompt.command` in `AGENTS_AUTOAPPROVE`.
Claude Bash dialogs use kind `permission` and action
`session.prompt.permission`; folder trust uses kind `trust` and action
`session.prompt.trust`. There are no wildcard scopes or implicit test/read-only
scopes. Restricted repositories and underlying `NEVER_AUTO` actions remain
human-only. These settings do not widen the child's CLI confinement.

Human grants still respect role denies. An unmapped command conservatively
requires the role's write authority; a read-only role needs an operator-defined
exact scope with an allowed underlying action. Unknown commands receive no
automatic classification. The Gateway never selects `p`, "always allow",
"don't ask again", or "switch to auto mode". All three recognized prompt kinds
confirm only the observed selected first one-time choice with a single guarded CR; no shortcut or ordinary key send is
used.

Before input, the separate approval-bound answer path uses the pinned tmux
`3.6a-agents.4` runtime. It captures the current grid into a uniquely owned
`agents-submit-<uuid>` buffer with `capture-pane -b ... -N -T`, then decodes
those exact buffer bytes for the recognizer and approval binding check. The
approval compare-and-set consumes the decision and persists a `promptAnswer`
marker with `status: "in_flight"`, `outcome: "attempting"`, `response: "Enter"`,
the target and `attemptedAt`. A write-ahead `SESSION_PROMPT_ANSWER_ATTEMPT`
records `attempting` before the guard runs; an audit append failure sends nothing.
The low-level
`agents-submit-v1` operation atomically compares the evidence with the grid,
server/pane PIDs, geometry, cursor and input modes, checks pending output, and
enqueues only one CR. It never uses composer `submitPrompt` or plain
`send-keys`. Missing runtime support fails closed. Owned evidence buffers are
consumed or cleaned on every path.

The answer path accepts an observed cursor at x equal to the pane width (the
tmux pending-wrap column; Codex 0.162 leaves its hidden cursor there on command
menus). It still refuses x greater than the width and y at or beyond the
height, and `agents-submit-v1` re-verifies the exact observed x/y with the grid
and identities in the same command. Geometry never establishes a recognized
or approved prompt. Composer `submitPrompt` keeps x < width.

A known guard refusal records outcome `refused`; a timeout, unexpected failure
or uncertain cleanup records `uncertain`. Neither is retried or emits
`SESSION_PROMPT_ANSWERED`. Attempts record the command, approval ID, target,
decider and outcome. The terminal result replaces only the exact in-flight
payload through a compare-and-set. Only a confirmed successful guard whose
terminal `sent` result was committed emits the answered event.

Invalidated bindings and stopped sessions persist a terminal `promptAnswer`
and audit `SESSION_PROMPT_INVALIDATED`. Never-consumed decisions use reason
`prompt_no_longer_bound`. An unfinished in-flight or legacy consumed decision
instead records `status: "not_answered"`, `outcome: "uncertain"` and reason
`transport_uncertain_after_restart`: input may already have reached the child.
This also applies when invalidating or stopping a watcher during delivery.
An uncertain prompt is never re-answered automatically.
Pending approvals expire instead of remaining grantable. Already granted rows
retain their decision history and a visible terminal answer result. Both
`approval.respond` and `approval.poll` return this `promptAnswer`. A human grant
on an old ID reports `not_answered`, rather than silently accepting an unbound
decision. Bindings are local to the active watcher; after a Gateway restart, an
orphaned ID is invalidated when answered or granted. Ordinary approval wait
listeners do not constitute prompt-answer authority. Viewing an explicitly
reattached session starts a new observation/request. Root's live acceptance
still owns verification with actual provider menus and operator policy scopes.
