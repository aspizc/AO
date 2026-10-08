# A/0/05 — Design checkpoint 10: creation-bound tmux output

2026-10-08. **Design only, unreviewed; no implementation authorization inferred.**
HEAD `0466b27458a147613b9234f87d2e77c02183c291`.
This new immutable checkpoint preserves checkpoint9 unchanged. Its **53/53
candidate file hashes and 5/5 compressed archive hashes** match. AGENTS.md,
the current cleanup hook, its immediate Codex caller, shared callers and Linux
identity reader were inspected. No source or test implementation was changed;
no subagents, self-review, policies, push, tag, broad gates or provider tests.
No quota interruption occurred.

## Finding: creation response can carry the three tmux fields

Pinned binary reports `tmux 3.6a-agents.1`. Its `list-commands` output advertises
`new-session [-AdDEPX] ... [-F format] ...`.
[Sanitized exact help](v6-a05-checkpoint10-pinned-new-session-help.txt) was read
using the pinned binary on a dedicated private socket, without creating a
session. The initial sandbox command could not connect; host help exited 0.
These are help observations, not RED/GREEN or live creation acceptance.

Local upstream source `/tmp/tmux-3.6a/cmd-new-session.c:278–300` creates the
session and spawns the initial window before the printing branch at 337–342.
That branch calls `format_single(item, template, c, s, s->curw, NULL)` and
`cmdq_print` when `-P` is present, using `-F` as the template. It formats the
actual new session object, rather than looking it up again by name.
`format.c:5793–5797` supplies the active pane of that initial window when the
pane argument is null; `format_cb_pane_pid` at 2205–2210 returns that pane's
stored first-process PID. The local manual describes `-P` as printing after
creation, `-F` as selecting its format, and these three format fields.
The repo's pinned patch contains no `cmd-new-session.c` modification.

Proposed private output template:

```text
a05-create-v1 #{session_id} #{pane_id} #{pane_pid}
```

For the currently supported detached single-window/single-pane creation shape,
`new-session -d ... -P -F <fixed-template>` can therefore return the actual
session ID, pane ID and pane PID as one creation response. This removes the
**create-then-name-query race for the tmux tuple**. It does not create a kernel
process handle or atomically attest a Linux start token. Source inspection and
help establish feasibility; actual pinned output execution remains untested.
The local source archive was not available for digest verification, so this
is not a reproducible binary/source equivalence claim.

## Proposed minimal integration and constraint conflict

Keep the existing builder and ordinary `tmuxSync` path unchanged. Only the
private A05 observer scope would recognize the exact current detached creation
shape, execute an augmented argv copy with fixed `-P/-F`, and consume its own
strictly framed output. Require command success and exactly one complete row:
literal version marker, `$<digits>`, `%<digits>` and safe PID greater than 1.
Reject extra rows, missing fields, truncation, malformed values or nonzero exit;
never fall back to the target name or a later name-based lookup. Freeze the
receipt, and retain it before returning from `tmuxSync`, so a later adapter
failure still reaches identity-bound cleanup. No caller-controlled format,
public cleanup handle or process command-line output.

The supported original command produces empty stdout. Consuming the private
receipt and returning that original public stdout shape would preserve current
caller behavior, while retaining status/stderr/error semantics. Malformed or
unverifiable output must remain a scoped error. Other command shapes, custom
formats/stdio and asynchronous `tmuxAsync` are outside this proposal.

**This necessarily changes the executed creation argv.** It cannot satisfy
literal preservation of the original wire arguments and also obtain `-P/-F`
output. Checkpoint9's emitted-argv guard would need a scoped revised contract:
ordinary argv unchanged; A05 scoped argv equals original plus the fixed output
flags. The operator's prior observation-hook grant required unchanged command
arguments; this design does not silently override it. A subsequent explicit
instruction must resolve that narrow conflict before production implementation.
No A04 base adapter or Claude path change is proposed. Root serially reconciles
shared `tmux_client.js` with A04.

## Linux start-token verification and cleanup authority

Immediately read Linux process identity for the **PID from the create response**,
not a PID found through the session name. Preserve PID/startToken/PGID/SID in the
private frozen receipt. An unreadable or already-ended process grants no signal
permission and must be reported honestly. tmux does not expose the Linux start
token through these standard fields; the `/proc` read remains necessary.

The first `/proc` read can occur after the original process exits and its PID
is reused. A start token observed then is not, by itself, proof that the reused
process belongs to the created pane. Before signalling, cleanup must verify
that the original immutable session/pane IDs still identify the original pane
and its emitted PID, and compare retained kernel identity immediately before
the signal. Lookup by immutable IDs during cleanup is allowed; it is not the
removed post-create name lookup. A vanished original pane or mismatched IDs/PID
must refuse to signal a replacement. Never treat `readLinuxProcessIdentity`
returning null as positively verified absence without attributing ambiguity.

There remain observation-to-signal races: numeric-PID signalling is not a Linux
pidfd, and tmux IDs are scoped to a server lifetime rather than a global boot
identity. This proposal does not prove safety across server restart/ID reuse,
PID reuse before initial observation, or adversarial pane replacement without
those checks. Preserve these as explicit limits for independent assessment;
do not credit `-P/-F` with fixing process supervision generally.

## Existing caller compatibility

Repository search finds detached builder/`tmuxSync` creation in Codex, Claude,
antigravity, pi, opencode and gemini adapters. Each checks creation status and
then sends launch input; none consumes creation stdout. Other shared uses are
ask/view/kill and exact-target recovery observations. `tmuxAsync` has no found
production caller. The cleanup observer is presently installed only around
Codex supervised spawn; the proposed receipt path remains private to that
scope. Other providers do not acquire cleanup support through this design.
Existing builder tests and ordinary creation behavior remain regression guards.

## Exact distinguishing RED required next

Name: **`pre-result failure after target replacement between create and receipt
keeps replacement alive and reaps the created identity`**.

Use `ownedTmuxFixture`, a disposable tmux executable shim and real production
Codex spawn/cleanup/service/tool composition. Inside the shim's successful
`new-session` handling:

1. Forward the actual creation argv to pinned tmux and retain its stdout/status.
   Record the original immutable session/pane/PID and Linux identity as a private
   test witness before replacement. On checkpoint9's unaugmented argv only, a
   private fixture query can obtain that witness; it must never inject a receipt
   or cleanup authority into production code.
2. Rename the original session, then create a distinct real sleeping child under
   the old name using the fixture's real tmux executable. Record its identity.
   This occurs **before the create client returns to `tmuxSync`**, closing the
   distinction from checkpoint9's replacement-after-receipt test.
3. Return the original create success/output unchanged. At the next adapter
   launch-input command, force an error before forwarding input; the actual
   adapter rejects without returning a result. Thus the replacement receives
   neither launch input nor any fixture-supplied cleanup grant.
4. Before teardown assert: tool error; no new durable/session binding; original
   observed child gone; replacement still alive; no creation-receipt name lookup
   occurred. Assert the observed production receipt equals the original emitted
   tuple, not the replacement. Keep logs sanitized.

On checkpoint9, the second name query selects the replacement; original-child
absence fails and/or replacement survival fails. A missing new API must not be
counted as this behavioral RED. After the approved implementation, the create
response retains the original tuple and identity-bound cleanup targets only it.
The fixture must reap all remaining private children/server on RED as on GREEN.

Add focused guards for failed creation with plausible stdout, malformed/extra
receipt rows, unavailable/reused kernel identity, exact scoped augmented argv,
ordinary unchanged argv/output, AsyncLocalStorage isolation, and existing
pre-result/post-await/name-reuse/publication cases. Where a guard already passes,
label it guard coverage rather than new RED. Execute only short direct focused
host commands with private tmux; no broad process probe while other sessions live.

## Status and evidence

Only this design checkpoint and its sanitized help file were written.
`git diff --check` passed before writing and is rechecked afterward.
No behavioral tests or full gates were run in this design continuation.
Checkpoint9's delegate timeout/descendant/ambiguity/bounds/provider limits and
live acceptance remain pending. No complete handoff, independent verdict,
integration or release is claimed. Stop here for the operator's next instruction.

Inspected pinned binary SHA-256:
`d4fa7abcfee5bd7d8688b8ffc2b489cd5faca56411e033625d6a0ba8b5346d21`.
Inspected local `cmd-new-session.c` SHA-256:
`f8e6619ada73d643d7476f55bf72d1955781566ba3b336a8119994f2281909b0`.
