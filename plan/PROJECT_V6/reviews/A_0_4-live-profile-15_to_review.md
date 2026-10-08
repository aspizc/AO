# A/0/04 — trial 15 pre-ask resize correction

Status: implemented; independent review pending. Dirty, uncommitted candidate on
HEAD `3cf3e6a225e92eb08f1059bef28fe98028cdd5b9`, branch `feat/V6-A-0-04-safe-submit`. No verdict,
integration, promotion or release is claimed. No source or evidence commit,
staging, push, policy edit, live provider session or subagent was performed.

## Contract and scope

Read AGENTS.md, the resolved orchestration profile, plan/README.md, Stage A
README, A/0/04, trial14 handoff and independent OK verdict; read both witnesses,
the shared submission caller/transport utilities and Claude spawn/ask callers.
The user explicitly assigned this existing coder session the surgical trial15
correction and requested focused tests and an immutable handoff, not a new
orchestration/reviewer loop. Historical trial14 OK remains evidence only for
its bound candidate. The independent reviewer owns the trial15 verdict.

Root reports an isolated live probe showing spawn at 80×24 followed by a
same-process/same-pane resize to 120×40 before the first ask. All ask frames
were 120×40 and the exact first completed reply was refused. This report is
the task's supplied evidence; I did not reproduce or inspect a live provider
run. The new spawn frame is synthetic (including its consistent 80×24 capture);
it is not a live snapshot or proof of refined-candidate live acceptance.

Only base_adapter.js, first-prompt tests, the matching Gateway README wording
and reviews index changed relative to entry. Existing dirty Claude adapter,
manifest and prior fixtures are preserved. No new abstraction, config, profile,
transport command, Enter retry, observation budget or acceptance marker.

## Implementation

`rememberFreshClaudeSpawn` now records only serverPid, target and panePid.
Both the 2.1.293 and 2.1.294 completed-response witnesses bind every frame to
that spawn process identity. Width and height of pending, guard and after are
separately bound to the first-ask ready observation. The measured after layout
still requires exactly 120×40; this does not add support for another ask size.
The existing 2.1.294 observation loop applies the same binding at every poll.

Before-ask resizing does not invalidate process provenance. Any observed resize
during the ask fails closed. Unsupported draft/guard geometry refuses before
Enter with `unknown_state`; a geometry mismatch after Enter returns
`acceptance_uncertain`, with no replay. Process replacement also stays uncertain.
The ready-frame geometry negatives use a valid source-backed shortcuts composer
so removing the geometry conjunct demonstrably admits the wrong completed reply.

[Entry hashes](evidence/A_0_4-live-profile-15-entry.json) and
[final source/test delta](evidence/A_0_4-live-profile-15-sealed-delta.patch)
bind the change relative to inherited trial14 work.

## TDD RED

Added seven named trial15 tests before production editing. Initial valid host
run of `node --test tests/gateway/claude_first_prompt.test.js` on unchanged
trial14 production source: exit 1, 41 tests, 39 passed, **2 intended failures**,
0 skipped. Failures were the two parameterized names:

- `trial15 2.1.293 same-process pre-ask resize accepts the first completed reply with one Enter`
- `trial15 2.1.294 same-process pre-ask resize accepts the first completed reply with one Enter`

Both call BaseAdapter.rememberFreshClaudeSpawn at 80×24 and then submitPrompt
with all ask frames at 120×40; they assert the returned exact completed
snapshot, one literal bracketed paste, one CR and no owned-buffer leaks.
Negative tests cover each spawn identity field, both dimensions at every ask
stage, and a 2.1.294 poll resize followed by a restored-size completion that
must never rescue acceptance. Inherited identity drift, first-ask eligibility,
blank-history, spinner, bounded-poll and kill tests remain unchanged.

The final strengthened tests reproduce the same two intended failures on the
archived trial14 source in a disposable scratch tree:

```bash
python3 plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-15-red-runner.py /home/carase/git/personal/AO/workspace/clones/wt-v6-a04
```

[Final RED log](evidence/A_0_4-live-profile-15-red-sealed.log.gz): exit 1,
41 tests, 39 pass, 2 fail, 0 skips.
[Baseline/test SHA and argv](evidence/A_0_4-live-profile-15-red-sealed-result.json).
The runner writes scratch results to /tmp; reproduction does not overwrite
immutable repository evidence. Baseline source SHA256:
`9b74e1a077b819946ebd4d4d570a374d0cabcf81575887d079544df4d6101035`.

Preliminary failures are retained and excluded from behavioral RED: a test
syntax typo, a sandbox file-level runner failure, and an accidental shared
working-frame reference that made a poll-count assertion fail. The reference
was corrected before the valid initial RED. Later test strengthening initially
used an unsupported idle footer outside 120×40; it failed closed with the
correct unknown-state refusal, not a source defect. Replaced it with the
source-backed shortcuts composer. The corresponding failed GREEN attempt is
archived as `test-strengthening-failure`, not counted as passing evidence.
Final synthetic spawn capture was made dimensionally consistent and reverified.
Earlier `green-initial`, `green-final`, and `red-reproduced` artifacts are
intermediate snapshots; the `sealed` files bind the final tests.

## Focused GREEN and distinguishing guard checks

Final host command, Node v22.22.1, patched tmux 3.6a-agents.3:

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
python3 scripts/ci_gate.py --validate-only
git diff --check
```

[Final GREEN](evidence/A_0_4-live-profile-15-green-sealed.log.gz): exit 0,
**246/246 passed**, 0 failed/cancelled/skipped/todo; includes 41 first-prompt
tests and real disposable tmux transport-input tests. Manifest validation:
exit 0, no errors, **0 suite tests executed**. Whitespace check: exit 0.

Scratch-only mutations, final tests, no candidate changes:

- Remove the first-ask geometry conjunct from both witnesses: exit 1, exactly
  the two trial15 geometry tests fail (one per version).
- Remove the spawn-process comparison from both witnesses: exit 1, seven
  tests fail, including both new process-replacement tests.

[Mutation runner](evidence/A_0_4-live-profile-15-mutation-runner.py),
[results and mutant hashes](evidence/A_0_4-live-profile-15-mutations-sealed.json),
[geometry log](evidence/A_0_4-live-profile-15-mutation-geometry-sealed.log.gz),
[process log](evidence/A_0_4-live-profile-15-mutation-process-sealed.log.gz).
These are coder verification, not an independent verdict.

## Hashes and limitations

Final base_adapter.js SHA256: `2041f12a68c29e24e0505fb5e52819e2a30862e6f7f328a7104a9bb0b5999891`.
Final first-prompt test SHA256: `81d5a4423f5e5909b18f522579fa06a65e0282567b5040e9e43f7f69fe39386c`.
The [candidate/evidence SHA map](evidence/A_0_4-live-profile-15-files.json)
binds source, fixtures, docs, manifest, review index, this handoff and every
trial15 evidence file. A separate seal binds the map and handoff. Trial14
historical evidence remains byte-identical to entry; no prior trial is rewritten.

Full gate `bash scripts/ci.sh`, live refined-candidate Claude/Codex acceptance,
fresh independent review and integration remain outstanding and root-owned.
Focused synthetic GREEN does not satisfy these sheet acceptance criteria.
Only observed frames are compared; a resize and reversal entirely between
captures is not proven detectable by this observational witness. Process IDs
are existing local provenance, not executable attestation or a general turn ID.
Only the measured 120×40 ask layouts are accepted. No broader provider/version,
supported/released or fully completed sheet claim. No trial15 verdict exists;
a fifteenth KO, if issued independently, requires paging the human under Rule 13.
