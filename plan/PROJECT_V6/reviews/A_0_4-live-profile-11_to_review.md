# A/0/04 — trial 11 guard-coverage correction handoff

Status: tests-only correction implemented; fresh independent review pending.
No independent verdict, commit, integration, promotion or release is claimed.
Base HEAD: `73223e9a1a46b27f97cb59144cb85a348e9d732f`.
Branch: `feat/V6-A-0-04-safe-submit`; candidate remains dirty.

Correction contract: [trial 10 independent KO](A_0_4-live-profile-10_reviewed_KO.md),
required corrections 1–4 only. Read A/0/04, its stage README, `plan/README.md`,
AGENTS.md and the [trial 10 operator memo](A_0_4-live-profile-10_operator-decision-memo.md).
The non-blocking findings are outside this correction. No production source
change was needed or made. Trial 10 source, docs, manifest and artifacts match
[trial 11 entry SHA map](evidence/A_0_4-live-profile-11-entry.json), apart from
the explicitly changed test file; historical review files remain untouched.

## Three distinguishing tests

Added exactly three tests in `tests/gateway/claude_first_prompt.test.js`:

1. `trial11 an older identical completed turn already on screen cannot confirm the first ask`.
   Copies after-frame transcript rows 0–34 into ready, pending and guard,
   preserving their composer/footer and keeping after unchanged. Asserts
   `acceptance_uncertain`, exact bracketed prompt plus one CR, and no owned
   buffers. Unlike the earlier stale-history case, the old identical cells
   also satisfy the prefix and post-transcript checks; this isolates the
   blank-prior guard against crediting an existing turn.
2. `trial11 a completed response after the retry Enter cannot use the attempt-zero witness`.
   Attempt 0 after is the unchanged pending composer. A second guard remains
   exact; attempt 1 after is the completed fixture. Asserts uncertainty, one
   text paste plus exactly two CRs (the existing bound), and no owned buffers.
   This distinguishes first-Enter authority from completion after retry.
3. `trial11 killing a plain-launch Claude revokes eligibility before its first ask`.
   Uses actual ClaudeAdapter spawn/kill/ask wiring with fake tmux and an
   injected successful launch, registers fresh identity, then kills before
   ask. The fake kill deliberately leaves the same frames available, so
   only eligibility revocation distinguishes this from successful first ask.
   Asserts kill success, uncertain ask, one paste/CR and no buffers.
   No Claude executable or Gateway agent session is launched.

[Scoped test delta](evidence/A_0_4-live-profile-11-tests.patch) compares against
[the recovered eight-test file](evidence/A_0_4-live-profile-11-entry-test.js).
The existing eight tests remain unchanged. No helper refactor or adjacent
non-blocking correction was introduced.

## TDD RED — isolated mutations

Each new test was written before mutation verification and GREEN. The
[reproducible runner](evidence/A_0_4-live-profile-11-mutations.py) copies source,
contracts and the exact current test/fixture into a temporary directory, uses
the existing node_modules read-only, changes exactly one predicate per run,
then restores that scratch file. It never writes repository production source.

Executed on the host:

```bash
python3 /tmp/a04-trial11-mutations.py /home/carase/git/personal/AO/workspace/clones/wt-v6-a04
```

The archived runner has identical bytes to the executed script. To reproduce,
copy it to `/tmp` and use a fresh evidence destination/prefix so immutable logs
are not overwritten. [Mutation manifest](evidence/A_0_4-live-profile-11-mutations.json)
records exact node argv, replacements, original/mutant/test SHA-256s, exit
codes and assertions on each RED result.

| Guard removed in scratch | Distinguishing RED evidence | Result |
|---|---|---|
| blank-prior transcript predicate → `false` | [stale log](evidence/A_0_4-live-profile-11-red-stale.log.gz) | exit 1; one test fails, `Missing expected rejection` |
| witness `attempt === 0` removed | [attempt log](evidence/A_0_4-live-profile-11-red-attempt.log.gz) | exit 1; one test fails, `Missing expected rejection` |
| `forgetFreshClaudeSpawn` removed only from kill | [kill log](evidence/A_0_4-live-profile-11-red-kill.log.gz) | exit 1; one test fails, `Missing expected rejection` |

These are intentional behavioural failures: accepting a stale/completed turn
causes the rejection assertion to fail. They are not import-error RED claims.
The initial scratch setup lacked the orchestrator-profile contract fixture:
[setup failure](evidence/A_0_4-live-profile-11-mutation-setup-failure.log.gz).
That attempt never reached the test. The runner was corrected to copy contracts;
no candidate source/test change followed the setup failure. Its evidence is
retained separately and excluded from the three distinguishing RED claims.

## TDD GREEN and inventory verification

The independently reviewed trial 10 baseline was 213/213. Fresh host command:

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
```

[Host GREEN](evidence/A_0_4-live-profile-11-green-host.log.gz): exit 0,
216/216 passed, 0 failed/cancelled/skipped/todo, including all 11 first-prompt
tests and real owned-tmux input-capture fixtures. Node v22.22.1; patched tmux
`3.6a-agents.3`, binary SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
This is coder verification, not self-issued independent review.

```bash
python3 scripts/ci_gate.py --refresh-inventory
python3 scripts/ci_gate.py --validate-only
.venv/bin/pytest -q tests/structure/test_ci_suite_manifest.py -k 'repository_manifest_is_authoritative_and_complete or manifest_validation_rejects_missing_glob_and_stale_inventory or inventory_refresh_does_not_rewrite_an_invalid_manifest'
git diff --check
```

Canonical [refresh](evidence/A_0_4-live-profile-11-inventory-refresh.log.gz) and
[validation](evidence/A_0_4-live-profile-11-manifest-validation.log.gz): exit 0,
no errors, 0 suite tests executed. [Selected manifest tests](evidence/A_0_4-live-profile-11-manifest-tests.log.gz):
exit 0, 3 passed, 76 deselected, no skips. Whitespace check exit 0.

[Inventory proof](evidence/A_0_4-live-profile-11-inventory.json) records the
refreshed `test.gateway` digest:
`sha256:6406044a37fa09cccdefd91885a60dfed8224af421988d25b260931c3ba17b5f`.
It is unchanged because inventory_digest hashes sorted discovered file paths;
this correction adds tests inside an existing inventoried path. No new file
path enters the suite and ci/suites.json is byte-for-byte unchanged from trial
11 entry. Changing the digest without a path change would be incorrect.

## Immutable identity and next step

[Trial 11 SHA map](evidence/A_0_4-live-profile-11-files.json) binds the candidate
source, test, fixture, manifest, handoff, review index and every trial 11 artifact.
Entry evidence also binds all trial 10 artifacts, including the KO contract.
Hashes were verified before stopping; the code candidate cannot be identified
by HEAD alone. Trial 11 files were newly created, never used as trial 10 edits.
The dirty test and review index are mutable candidate paths; the archived test
delta, entry test, SHA maps and logs provide immutable trial-specific evidence.
No files were staged or committed; root owns review-trail commit/integration.

Stop here for a separately assigned fresh independent reviewer trace/session.
No subagents, self-review, policy edits, push or tag. No full gate or live check
ran. Root still owns `bash scripts/ci.sh` solo on the host after agent sessions
are inactive, with patched runtime and disposable Redis 7, exact totals and
skip budget, plus new live Claude/Codex acceptance. Focused GREEN does not close
those outstanding acceptance criteria.
