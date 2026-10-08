# A/0/04 implementation review — Trial 2

## Verdict

**KO — source-only review; partial coverage, stopped at the task budget.**
The `.3` `agents-submit-v1` exec matches the approved CP3 write boundary in
source. However, after a delivered CR the adapter can still report public
reasons that CP3 §7 reserves for "zero CR". Two named native regressions also
fail to isolate the predicates they are named for. This is a source review, not
full sheet acceptance. No integration, promotion, release or sheet closure is
approved. No provider acceptance is inferred from tmux receipts.

## Scope, identity and limits

- Task `ts-c618ca39-d388-4ac8-a734-75a124b23fae`. Independent Claude reviewer
  session; it did not author the candidate. Date 2026-10-08.
- Branch `feat/V6-A-0-04-safe-submit`, HEAD
  `50daaadc270a38428ec59facf2e5007f1d5afdbd`, dirty uncommitted candidate.
- Manifest `evidence/A_0_4-f1-build5-candidate-files.json`. Its SHA-256
  `554d5370cf01cdb4dad2d3a50b39a5554233f11b88c25d6a927069c3200a72e2` matches.
  All **46/46** listed paths match their recorded SHA-256 on disk. The only
  unlisted dirty entries are the request, checkpoint, manifest itself and the
  deleted `.1` patch (see F5).
- Contract `04-transport.md` SHA-256 `4fc93db0…59e4e1` matches the checkpoint.
- The `.3` patch applies with `patch -p1 -F0` to the manifest-pinned archive
  (`b6d8d9c7…3759`, verified). The built binary
  `/tmp/ao-a04-f1-impl/build2/bin/tmux` hash `6487f795…c386` matches the
  checkpoint.
- **Budget stop.** The operator stopped this review at the 20k per-task budget.
  The areas listed under "Not examined" carry no credit, positive or negative.

## Actionable findings

### F1 — P1: post-CR observation failures report pre-delivery reasons

**Evidence:** `gateway/src/adapters/base_adapter.js:176–200,260–273`; CP3 §7.

`observe()` throws `transport_failed` when `checkedRun` fails. It throws
`unknown_state` when the metadata is malformed or the capture is invalid UTF-8.
`submitPrompt` lets both errors propagate unchanged from:

- the `after` observation that follows a successful `agents-submit-v1`, and
- the retry `guard` observation.

Both observations run after a CR has already been delivered. CP3 §7 says that
only the fixed refusal on the first attempt proves zero CR and maps to
`unknown_state`. It also says any state after a delivered CR is
`acceptance_uncertain`. A caller who sees `unknown_state` or `transport_failed`
is told, in effect, that a replay is safe. That can duplicate a prompt.

Reviewer stub probe (scratch `post_cr_probe.mjs`, SHA-256
`8d4ea8e589718a68d5b9d5798db902e0509717f6e26cb6bab7d825a40622e1a1`). It ran
in-process against the candidate helper with no tmux and no provider:

| Case | Delivered inputs | Public reason |
|---|---|---|
| capture fails after CR | paste, CR | `transport_failed` |
| metadata `cursor_x >= width` after CR | paste, CR | `unknown_state` |
| retry-guard capture fails after first CR | paste, CR | `transport_failed` |

**Correction:** once any `agents-submit-v1` call has returned success, map every
later error to `acceptance_uncertain`. This covers the `after` and retry-guard
observations, cleanup-independent `checkedRun` failures, metadata validation
and UTF-8 decoding. Never retry after such an error. Keep the first-attempt
pre-CR mappings unchanged. Add named stub tests for all three cases above. Each
test must assert the reason, exactly one CR and no further
`agents-submit-v1` call.

### F2 — P2: the respawned-PID and framing-drift regressions are not isolated

**Evidence:** `tests/gateway/guarded_submit.test.js:94–103` (respawn) and
`:77–92` (`drift === "framing"` via `fx.mode("off")`);
`tests/gateway/guarded_paste_fixture.py:21–22`.

Every fixture mode change writes `\r\nfixture-mode:…\r\n`, which moves the
cursor. The evidence `-c/-l` arguments are captured before that write. As a
result:

- The respawn test re-captures the evidence buffer but keeps the stale cursor.
- The framing test changes the grid and the cursor together with bracketed
  mode.

Both refusals are therefore already satisfied by the cursor (or grid) predicate.
Deleting `pane_pid != wp->pid` or `!(wp->screen->mode & MODE_BRACKETPASTE)` from
`cmd-agents-submit.c` would very likely still pass both tests. This violates
AGENTS.md Rule 9. Mutation builds were not run; the predicate overlap is
established as follows.

Reviewer observation on the hash-verified `.3` binary, using a private owned
socket and only the repo fixture (no provider). Format
`pid|pane_pid|cursor_x|cursor_y`:

- before respawn: `…|2505266|0|2`
- after respawn: `…|2505305|0|2`
- after `mode on`: `…|2505305|0|4`
- after framing `off`: `…|2505305|0|6`

The server was killed and its socket removed.

**Correction:** make each case differ from the evidence in exactly one
predicate:

- Respawn: after the respawn settles, take fresh grid evidence plus fresh
  cursor and dimension arguments, keeping only the old `-p`.
- Framing: add a fixture command that toggles `?2004` without writing visible
  text or moving the cursor, or re-read cursor and grid after the toggle.

Also assert a control in which the same flow with the current PID or framing
yields exactly one CR. Run the first-attempt and retry variants as in the
existing matrix.

### F3 — P3: stale Gateway README statement

**Evidence:** `gateway/README.md:88–90`. The text still says "The final Enter
write race remains open pending independent review of the server-side
evidence-bound guard design". This contradicts the preceding paragraph
(`:47–55`) and the trial-6 plan OK.

**Correction:** say what the candidate actually does: it implements
`agents-submit-v1`. Its source review is pending, and the provider-internal
residual remains. Do not claim acceptance.

### F4 — root-owned: CI manifest is invalid for this candidate

`python3 scripts/ci_gate.py --validate-only` reports `status invalid_manifest`:
`test.gateway: stale inventorySha256; expected
sha256:404c273b299560d51ef72aa6d1278ecd84397aa37576a99c28d7750f720ce638`.
`ci/suites.json` (`83c71204…`) is still the trial-1 digest, so it does not
include `guarded_submit.test.js`. The checkpoint discloses this as open. The
full gate cannot be run until root refreshes the inventory and reviews that
change.

### F5 — P3: manifest omits the deleted `.1` patch

`git status` shows `D gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch`, but
the 46-entry manifest has no deletion record. The trial-1 manifest included it.
The deletion is CP3-consistent, because `.1` is not an active build input and
HEAD retains its history. But the binding is incomplete.

**Correction:** the next manifest must list deletions explicitly, for example
with `null` or a `deleted` status.

### F6 — P3, needs confirmation: shared builder semantics changed under `gemini-cli`

`buildSendKeysCmd` now sends `-l … -- line` with no `Enter`. Gemini still calls
it for spawn and ask at `gateway/src/adapters/gemini_adapter.js:280,318`. The
plan says `gemini-cli` is registry-only and launches no child, and this review
did not confirm that those paths are unreachable.

**Correction:** either have root show that the paths are unreachable with an
existing refusal test, or keep Gemini's previous semantics with a separate
builder. Do not extend A/0/04 to Gemini.

## Source-reviewed (positive, source only)

- `cmd-agents-submit.c` (patch lines 63–228) against CP3 §1–5 and §7:
  - It is a separate command with a required flag set and no positional
    arguments, plus the anchored lowercase UUIDv4 name check.
  - The target must be the canonical `%id` string.
  - Numbers are read with `args_strtonum` in the specified ranges.
  - Server PID, pane PID, size and cursor are compared against `getpid()`,
    `wp->pid` and `wp->base`.
  - State checks cover exited, `fd`, `event`, `INPUTOFF`, modes, sync and
    `MODE_BRACKETPASTE`.
  - Evidence is consumed at exec entry on every path where a buffer exists.
  - Local storage is freed on all paths.
  - All refusals use the fixed diagnostic with `CMD_RETURN_ERROR`.
  - The single `bufferevent_write(wp->event,"\r",1)` bypasses
    `window_pane_key` and sibling fan-out.
- Evidence equality checked against upstream `cmd-capture-pane.c:106–212`. With
  `-N -T`, the flags are 0 (no `EMPTY_CELLS`, no `TRIM_SPACES`), and the source
  is `&wp->base`, `wp->base.grid`, `sx = screen_size_x(&wp->base)` with one LF
  per row. The exec reserializes with identical inputs.
  `prompt_submission_capture.test.js` exercises this end to end on real
  Unicode composers. That is coder evidence; this reviewer did not rerun it.
- **Pending output: SOURCE-REVIEWED / NOT EXECUTED** for
  `guarded_submit_refuses_pending_output`,
  `…_ignores_parsed_bytes_pending_control_client_delivery` and
  `…_refuses_unparsed_pane_input`:
  - The exec uses `window_pane_get_new_data(wp,&wp->offset,…)` (unparsed bytes
    relative to the parser offset, not the total evbuffer length) plus
    `FIONREAD == 0`.
  - Upstream `window_pane_read_callback` (`window.c:1020–1045`) runs control
    and pipe delivery and then `input_parse_pane` synchronously, so retained
    parsed bytes do not cause a refusal.
  - No deterministic injection hook exists.
  - The provider-internal residual is retained, and terminal atomicity is not
    provider-decision atomicity.
- Adapter: the per-operation capability probe uses a raw Buffer, empty stderr,
  strict ASCII, exact `.3`, exact `agents-submit-v1` and the `paste-buffer` `-G`
  usage line. It runs before any buffer is created and maps to
  `paste_unavailable`. Observations read metadata before capture and use raw
  `save-buffer` output with fatal UTF-8 decoding. Each attempt uses fresh
  evidence. The fixed refusal maps first→`unknown_state` and
  retry→`acceptance_uncertain`. Nondiagnostic failures map to uncertain with no
  retry. Cleanup tolerates only the exact `unknown buffer: <name>` diagnostic.
- The codex, antigravity and pi `ask`/launch paths call the shared helpers.
- Pins: manifest, both builders, workflow symlink, supervisor handshake and the
  relay fixture agree on `.3`. The capture extension hash `4d80a861…` is
  unchanged in the manifest and builders.

## Not examined (no credit either way)

- Reviewer reruns of the 151 focused, 62 retained and RED logs. Evidence logs
  were checked only through manifest hashes and were not decompressed.
- Byte-identity proof for `cmd-send-keys.c`/`cmd-paste-buffer.c` from `.2`
  to `.3`.
- The `.1` deletion content and the `.2` evidence patch's adjacent SHA record.
- Claude and opencode adapter diffs; `tool_error_serialization` and catalog
  projection details; `docs/tmux-runtime.md`; vendor README.
- A company or personal content scan of new public files.
- Lint and `git diff --check`.

Still open regardless of any source OK: the trial-1 F4 Antigravity positive profile; live
Codex/Claude/Antigravity markers, versions and timing; native Darwin; root solo
full gate with Redis 7 and unchanged skips; CI inventory (F4 above); sheet
closure.

## Next step

The coder corrects F1–F3 and F5, with F6 resolved by root, then submits
`A_0_4-3_to_review.md` with a fresh manifest. A fresh independent reviewer
session must cover the "Not examined" list. Only this verdict file was written.
There were no code, test, plan or policy edits, no provider invocation, and no
staging, commit or push. Root owns indexing and commit.
