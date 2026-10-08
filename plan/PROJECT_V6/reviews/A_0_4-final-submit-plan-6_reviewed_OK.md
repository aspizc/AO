# A/0/04 final-submit guard refinement — plan review, trial 6

## Verdict

**OK (plan design only).** The trial-6 CP3 text closes all three required
corrections from the committed trial-5 KO and keeps the eight trial-4 items
that trial 5 accepted. Its two new runtime predicates match pinned tmux 3.6a
source. The diff against the trial-5 base touches only CP3 §§4, 6, 8 and 9.

This verdict accepts the CP3 contract text only. It is not implementation,
test, integration, promotion or release evidence. Trial-1 KO and F1 stay
OPEN. A/0/04 and this refinement remain **PLANNED**. Root owns any later
implementation authorization.

- Assigned review task: `ts-429defac-19cd-4dbe-a93a-357f40c1157c`.
- Reviewer: a separately assigned Claude Code session (Opus 5.5). I did not
  write CP3, the request, the checkpoints or any earlier verdict. I used no
  subagent, provider inference, Gateway spawn, tmux server, build or test.
  This session cannot see its Gateway trace or session metadata, so this
  verdict does not claim them.
- Base/HEAD: `b25eb31b478076b562a060a91761d89f729e1960`, branch
  `feat/V6-A-0-04-safe-submit`. The tree is dirty with uncommitted A/0/04
  work. This review covers only the CP3 text named below.
- Request: [trial-6 request](A_0_4-final-submit-plan-6_to_review.md),
  SHA-256 `a95e8908896304480aea4353f5d7f7fc2a97a43dccba6a09a3624b2c39fcc222`.
- Reviewed contract: [CP3 in 04-transport.md](../A/0/04-transport.md#cp3--final-enter-evidence-binding-plan-design-trial-5).
  - Working-tree SHA-256 is
    `4fc93db0fdb96662ae5d5e6f380e07539818099bd1e4d35038593d070859e4e1`. This
    matches the request exactly.
  - `git diff --check` on the file is clean.
- Base comparison: the version of `04-transport.md` committed at HEAD has
  SHA-256 `7f0f5053…56b1`. That is the exact file trial 5 reviewed. I
  checked `git diff HEAD` on the file: all four hunks fall inside CP3 §4, §6,
  §8 and §9. The CP3 introduction, §§1–3, §5, §7, the GREEN, acceptance and
  verification tail, and all earlier transport prose are unchanged.
- Read against:
  - the committed [trial-5 KO](A_0_4-final-submit-plan-5_reviewed_KO.md)
    (`8adcea8a…1f3c`);
  - the [trial-4 KO](A_0_4-final-submit-plan-4_reviewed_KO.md);
  - the [A/0/04 sheet](../A/0/04.md) reason allowlist (`paste_unavailable`
    is present);
  - AGENTS.md;
  - `gateway/src/adapters/process_supervisor_helper.py:4300-4345`;
  - `gateway/src/adapters/tmux_client.js`;
  - `gateway/vendor/tmux-agents/manifest.json`;
  - the active `.2` patch.
- Pinned upstream source: I extracted
  `/tmp/ao-a04-runtime-build-vl_1pgz1/tmux-3.6a.tar.gz` into reviewer
  scratch. Its SHA-256 `b6d8d9c7…3f3759` matches the manifest. I read
  `window.c`, `input.c`, `server-client.c`, `control.c`, `cmd-list-keys.c`
  and `tmux.h`. Nothing was built or run.

## Pin facts re-verified

| Claim | Observed |
|---|---|
| `.2` patch `c488dcca…74c2` | `gateway/vendor/tmux-agents/tmux-3.6a-agents.2.patch` matches; manifest names it |
| trial-1 binary `3d37a940…1428` | `/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux` still matches today; §8 now correctly calls it volatile |
| retained handshake hard-codes `.2` | `process_supervisor_helper.py:4333` `reported_version != "3.6a-agents.2"` |
| guarded paste usage carries `-G` | `.2` patch: `.args = { "db:Gprs:t:" … }`, `.usage = "[-dGpr] …"` |

## Trial-5 correction coverage

| Trial-5 item | Trial-6 CP3 | Result |
|---|---|---|
| 1 unparsed predicate | §4, §9 | **Met.** See source check A. |
| 2 capability probe | §6, §8, §9 | **Met.** See source check B. |
| 3 `.2` history location | §8 | **Met.** See check C. |
| non-blocking: preservation label | §9 | **Met.** `ordinary_send_keys_preserves_upstream_sibling_fanout` is labelled as a preservation test, expected to pass on `.2` and exempt from the new-regression RED rule. |

### A. Unparsed-input predicate (§4)

`window_pane_get_new_data(wp, wpo, &size)` (`window.c:1722-1729`) sets
`size = EVBUFFER_LENGTH(input) - (wpo->used - base_offset)`. With
`&wp->offset`, this is exactly the parser's unconsumed tail.
`input_parse_pane` (`input.c:1008-1015`) uses that same slice and then
advances `wp->offset`.

The evbuffer is drained only down to the minimum of `wp->offset`, the
pipe-pane offset and each control client's offset
(`server-client.c:2819-2856`). So bytes held back only for pipe or
control-client delivery give `unparsed == 0` and are already in the grid.
§4 now says exactly that. It keeps `FIONREAD == 0` and the fixed refusal
diagnostic, and it says in so many words that raw evbuffer length is not the
predicate.

Both named §9 cases match the KO wording. The deterministic-or-SOURCE-REVIEWED
rule applies explicitly to the stalled-control-client case and the
unparsed-input case.

Note for implementation: `window_pane_read_callback` (`window.c:1022-1044`)
always parses the full new slice. So in normal event-loop operation,
`unparsed` is zero at command time. The unparsed-input case therefore
probably needs a fault-injection hook. Otherwise it must be recorded as
SOURCE-REVIEWED / NOT EXECUTED. §9 already allows this. It must not be
reported as a fixture pass.

### B. Capability probe (§6)

§6 now binds the following:

- **Who runs the probe:** the adapter's tmux client, against the same target
  server as the operation.
- **When:** before the first buffer of every operation, and again for every
  operation. No result is cached across operations or server generations.
- **Version check:** `display-message -p '#{version}'` must return status 0
  and empty stderr. After whitespace stripping and strict ASCII decoding, the
  output must equal exactly `3.6a-agents.3`. This mirrors
  `process_supervisor_helper.py:4329-4334`.
- **Command check:** `list-commands` must return status 0 and empty stderr,
  and must list the exact `agents-submit-v1` and `paste-buffer` usage lines
  with `-G`.
- **Failure:** any failure returns `paste_unavailable` before any buffer or
  input exists.

The 3.6a `list-commands` template prints name, alias and usage on one line
per command (`cmd-list-keys.c:331-341`). That makes "match command names and
their own usage lines" implementable.

§8 adds the `.2` → `.3` update of the retained handshake to the synchronized
pin list. §9 adds `capability_probe_rejects_missing_submit_command_before_buffer`.

### C. `.2` history location (§8)

§8 names `plan/PROJECT_V6/reviews/evidence/A_0_4-trial1-tmux-3.6a-agents.2.patch`
and its adjacent `.patch.sha256` record. Both sit outside
`gateway/vendor/tmux-agents/` and outside the build inputs. Preservation is
explicitly a post-approval step. The directory does not exist yet, so no
archive was created early.

§8 says the `/tmp` binary is volatile. It defines the durable evidence as the
recorded hash plus a reproducible rebuild from the pinned archive and the
exact `.2` patch.

## Non-blocking observations (for root; no new trial required)

1. **Stale provenance in unchanged text.** The CP3 heading says "trial 5". The
   intro says it incorporates "corrections 1–9 from trial-4 KO". The first
   acceptance item says "all nine trial-4 corrections". None of these
   mentions the trial-5 corrections. The request explains that this task's
   edit scope was limited to §§4, 6, 8 and 9, and it binds the candidate by
   hash. I accept that. Root should refresh these provenance lines in a later
   scoped edit, or record this verdict's hash as the binding.
2. **Acceptance wording.** "Each named RED test records its failing assertion
   against `.2`" must be read with the §9 preservation exemption.
   "`.2` patch/binary evidence is preserved" must be read with §8's
   definition of binary evidence (recorded hash plus reproducible rebuild).
   §9 and §8 govern on these two points.
3. **Probe decoding.** `tmuxSync` defaults to `encoding: "utf-8"`
   (`tmux_client.js:55-57`). That default would silently replace invalid
   bytes, so the §6 strict-ASCII requirement means the probe must read raw
   bytes. Separately, the adapter client does not pass `-L`, while the
   retained supervisor path honours `AGENTS_TMUX_SOCKET_NAME`. "Same target
   server as the operation" holds only if the probe and the paste/submit
   calls share one invocation path. Tests should assert this.

## Disposition

The CP3 plan contract at SHA-256 `4fc93db0…59e4e1` is accepted. Only after root
records this verdict and authorizes implementation may CP3 TDD RED/GREEN
begin. The full set of open items remains, unchanged:

- live provider acceptance, versions, markers and settle timing;
- F4;
- native Darwin;
- the root-owned solo full gate;
- CI inventory reconciliation.

Only this verdict file was written. I made no production, policy, test,
patch or plan edits. I did no staging, commit or push, and made no Gateway
call, provider inference or tmux execution. The reviewer scratch extraction
is outside the tree. Root owns indexing this verdict in `reviews/README.md`
and committing it.
