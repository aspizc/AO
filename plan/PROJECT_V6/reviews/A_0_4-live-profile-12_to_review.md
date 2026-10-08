# A/0/04 — trial 12 Claude 2.1.294 bounded first-ask observation

Status: implemented; fresh independent **Opus 5.5 medium** review pending.
No verdict, commit, integration, promotion or release is claimed.
Candidate is dirty on HEAD `e6d241ed2d6981121f739d0b9941384295b2fb54`,
branch `feat/V6-A-0-04-safe-submit`. Root owns commit/integration after review.

## Intake and scope

Read AGENTS.md, `.claude/orchestration-profile.md`, `plan/README.md`,
[A/0/04](../A/0/04.md), [Stage A](../A/README.md), the
[trial11 handoff](A_0_4-live-profile-11_to_review.md) and
[trial11 independent OK](A_0_4-live-profile-11_reviewed_OK.md).
Read `base_adapter.js`, Claude spawn/ask/kill callers, agent service ask caller,
`tmux_client.js` capture/guard/cleanup utilities and the first-prompt tests.
Read the private `workspace/root-a04-live-acceptance-result.json`; its raw
content is deliberately excluded from committed artifacts.

The disposable run used Claude Code 2.1.294. At the initial observation the
unique submitted prompt was echoed, with an empty assistant cell and spinner;
seven seconds later the exact reply was complete. Server/pane identity and
120×40 geometry remained unchanged. Unlike trial11's fixture, rows 1–3 retain
the launch header, row 34 is the effort hint, and completion adds a timing row.
The conversation between header and hint was blank before submission.
[Non-identifying observation summary](evidence/A_0_4-live-profile-12-observation-summary.json).

User authorization is limited to this refinement, focused verification and
handoff. No subagents, self-review, policies, push/tag, full gate or new live
provider run. The resolved profile's reviewed-OK commit restriction governs
over the TDD skill's generic pre-review commit instruction.

## Implementation and safety boundary

Only `base_adapter.js`, its first-prompt test/fixture, the corresponding Gateway
README explanation and review index change relative to trial12 entry. The
existing dirty Claude adapter and suite manifest are byte-identical to entry.
All historical trial11 files remain untouched. [Entry identity](evidence/A_0_4-live-profile-12-entry.json)
and [source/test delta](evidence/A_0_4-live-profile-12-delta.patch) bind this scope.

The additional witness is deliberately restricted to the observed 2.1.294
Opus 5.5 medium layout, a locally remembered fresh plain launch, and attempt 0.
Spawn, ready, pending draft, final guard and every observed frame must have the
same server PID, pane PID, target and geometry. The launch header stays exact
and unchanged; prior conversation rows 4–33 must be blank. The effort hint,
empty composer, cursor, borders and footer must match the measured layout.
The exact ASCII prompt appears in one user cell and cannot be duplicated.

An exact prompt echo plus measured empty assistant cell and Twisting spinner
allows **observation only**, not successful acceptance. Poll up to eight times
at one-second intervals, after the normal initial ask delay. Return only on
the measured printable single-line assistant reply and Sautéed completion row.
An unexpected intermediate capture immediately fails uncertain; a later valid
frame cannot rescue it. Exhaustion fails uncertain. There is no additional
paste or Enter on this path and no fallthrough into the existing composer
retry. The maximum additional sleep is 8 seconds (default total sleeps 9.65s;
configured initial delays retain their existing caps). At most eight additional
captures/buffers are made; all owned buffers are cleaned on success/failure.

Existing trial10/11 completed witness, first-ask capability consumption, kill
revocation, composer retry and other providers retain their behavior. Reused,
reattached, restarted, stale, ambiguous and unrecognized variants do not gain
first-ask authority. The new layout is observational evidence, not a stable
turn ID or binary attestation. No general renderer support is claimed.

## TDD RED

Six new tests precede independent review. The first five were written before
production changes. The added immediate-completion/retry test was subsequently
verified against the same archived trial11 source in a disposable scratch copy.
Final reproducible command on the host:

```bash
python3 /tmp/a04-trial12-red.py /home/carase/git/personal/AO/workspace/clones/wt-v6-a04
```

[Archived runner](evidence/A_0_4-live-profile-12-red-runner.py) copies source,
contracts, tests and fixtures into a temporary tree, links existing dependencies
read-only, and replaces only scratch `base_adapter.js` with the archived entry
source. Copy runner to `/tmp` before reproduction and use fresh output filenames
to preserve immutable evidence. [Final result](evidence/A_0_4-live-profile-12-red-result.json)
and [RED log](evidence/A_0_4-live-profile-12-red-final.log.gz): exit 1,
17 tests, 13 passed, **4 intended failures**, 0 skipped:

- `trial12 delayed Claude 2.1.294 first reply is observed without another Enter`
  — baseline returns uncertainty instead of observing completion.
- `trial12 unchanged first-turn spinner exhausts a finite poll without replay`
  — baseline makes no further observations (delay sequence mismatch).
- `trial12 immediate 2.1.294 completion needs the first Enter and cannot credit a retry`
  — baseline fails the new immediate completed layout.
- `trial12 identity drift or ambiguous intermediate cells cannot be rescued by later completion`
  — baseline returns before observing the intermediate frame (delay mismatch).

The two other new tests verify stale/reused refusal and malformed completed
cells. They also pass on the rejecting baseline; they are negative regression
coverage, not distinguishing RED claims. All 11 inherited tests remain green.

The first sandbox attempt exited before individual tests and is excluded from
RED evidence. The first host RED had 16 tests / 3 intended failures. The first
GREEN had one test aliasing failure: cloning an array preserved the repeated
working-frame reference, so the intermediate mutation affected the initial
frame too. It was corrected to clone each frame separately. These logs are
archived as `red-sandbox`, `red-initial-host`, `green-initial-first` and
`green-initial-host`; only the final logs establish the final candidate.
The scratch runner's initial setup failed on nonexistent root package.json
before tests; the summary records it and the corrected runner is archived.

## Focused GREEN and manifest

Final host command (Node v22.22.1, patched tmux `3.6a-agents.3`):

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
```

[GREEN log](evidence/A_0_4-live-profile-12-green-host.log.gz): exit 0,
**222/222 passed**, 0 failed/cancelled/skipped/todo. This includes 17 first-prompt
tests and real owned disposable tmux input fixtures. The delayed fixture checks
one literal paste, exactly one CR, eight additional one-second observations and
zero leaked buffers. Intermediate server/pane drift, unsafe pane modes, changed
header/effort/composer, duplicate echoes and decision text all fail uncertain
without reading through to later completion. Immediate completion passes;
completion after a retry remains uncertain. This is coder verification only.

```bash
python3 scripts/ci_gate.py --refresh-inventory
python3 scripts/ci_gate.py --validate-only
.venv/bin/pytest -q tests/structure/test_ci_suite_manifest.py -k 'repository_manifest_is_authoritative_and_complete or manifest_validation_rejects_missing_glob_and_stale_inventory or inventory_refresh_does_not_rewrite_an_invalid_manifest'
git diff --check
```

Archived refresh/validation: exit 0, 0 errors, 0 suite tests executed.
[Manifest tests](evidence/A_0_4-live-profile-12-manifest-tests.log.gz): exit 0,
3 passed, 76 deselected, no skips. Whitespace check exit 0. Inventory digest
remains `sha256:6406044a37fa09cccdefd91885a60dfed8224af421988d25b260931c3ba17b5f`:
the new JSON fixture is not a discovered suite test path. The manifest is
byte-identical to entry; no synthetic digest change is made.

## Immutable evidence and outstanding work

[Candidate SHA map](evidence/A_0_4-live-profile-12-files.json) binds source,
tests, sanitized fixture, manifest, docs, review index, handoff and all trial12
artifacts. The map is separately bound by the handoff seal. New evidence files
were exclusively created, and prior trials were not overwritten. No private
pane text, live prompt token, home path or live process/session ID was copied
into the fixture, logs or summary. Synthetic process IDs and paths preserve
only the acceptance-relevant shape.

Stop for a separately assigned fresh independent **Opus 5.5 medium** reviewer
trace/session. The reviewer must reproduce focused checks and inspect the
first-Enter, identity, prior-transcript and finite-observation boundaries.
No self-issued verdict is present. Candidate is uncommitted.

Full gate and successful refined-candidate live Claude/Codex acceptance remain
**outstanding**, not passed or satisfied by fixtures. Root must run the full
gate solo on the host after sessions are inactive, with the patched runtime,
disposable Redis 7, exact totals and skip budget. Root also owns any later live
acceptance run, review-trail commit and integration. This handoff does not close
the sheet or claim supported/released behavior.
