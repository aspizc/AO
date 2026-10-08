# A/0/04 — trial 10 independent review request

Status: implemented dirty candidate, independent review pending. Not committed,
integrated, promoted or released. Stop here for separately assigned Claude
Opus 5.5 medium review; no coder-owned verdict is valid.

Base HEAD: `73223e9a1a46b27f97cb59144cb85a348e9d732f`.
Branch: `feat/V6-A-0-04-safe-submit`.
The prior Codex Gateway tmux session died unexpectedly (operator report).
Its session/trace/task identifiers were not recovered. No session was spawned,
submitted, approved, killed or otherwise operated during this recovery.

## Authority and scope

Read [the operator memo](A_0_4-live-profile-10_operator-decision-memo.md),
[A/0/04](../A/0/04.md), [stage README](../A/README.md), `plan/README.md`,
`AGENTS.md`, the immutable live-profile trials 5–9, and the final-submit design
trial 6 review. The historical pending human request remains unchanged;
this session's explicit operator authorization selects first-prompt-only
completed Claude acceptance. General reused-session turn identity is still
unproven. No new live acceptance is claimed.

Recovered candidate files: `gateway/src/adapters/base_adapter.js`,
`gateway/src/adapters/claude_adapter.js`, `gateway/README.md`, and
`tests/gateway/claude_first_prompt.test.js`. Their bytes are unchanged from
recovery entry. This turn changed only the justified inventory digest and added
this evidence/memo/index. No policies, push, tag, staging or commit.

The candidate records process identity after a plain supervised Claude launch,
consumes eligibility synchronously on the first submit attempt (including
failure), and forgets it on kill. A new adapter has no remembered eligibility.
It accepts only the measured blank-transcript, stable-identity 120×40 completed
single-line ASCII user/assistant layout following the exact guarded draft.
No text replay is added; existing active-busy acceptance remains separate.
Configured executable arguments disable this witness; an executable-path
wrapper is an operator-controlled assumption. This is a narrow observational
witness, not binary/version attestation or a general accepted-turn contract.
The trial 9 sanitized fixture is reused, not a new production live observation.

## Preserved candidate and evidence

[Entry hashes and inventory proof](evidence/A_0_4-live-profile-10-entry.json)
and [entry patch including the untracked test](evidence/A_0_4-live-profile-10-entry.patch)
preserve the dirty candidate. [Final file/evidence SHA-256 map](evidence/A_0_4-live-profile-10-files.json)
binds source, test, fixture, manifest, memo and archived logs. Verify hashes
before review; HEAD alone does not identify this dirty candidate.

All logs are immutable trial-specific gzip copies, with deterministic gzip
mtime. Earlier trial files were not overwritten. The original `/tmp` logs are
retained. Review trail remains uncommitted pending independent review/root
integration; this handoff is not a committed-review claim.

## TDD RED and GREEN

Recovered [host RED](evidence/A_0_4-live-profile-10-prior-red-host.log.gz):
7 tests, 5 pass, 2 fail, 0 skips. The positive test
`trial10 newly spawned Claude first prompt accepts the exact completed boundary frames with one Enter`
failed with `AGENT_PROMPT_NOT_SUBMITTED`; eligibility registration also failed
because `rememberFreshClaudeSpawn` was absent. The earlier
[RED log](evidence/A_0_4-live-profile-10-prior-red.log.gz) reports a single
file-level failure and is weaker evidence. These are recovered logs, not
replayed RED in this turn. Exact original commands/pre-RED source hashes were
not recovered, and the final test file has eight tests rather than seven:
the later spawn-wiring test has no recovered baseline RED execution evidence.
Do not treat that gap as proven TDD or independent acceptance.

Recovered [host GREEN](evidence/A_0_4-live-profile-10-prior-green-host.log.gz):
191/191 passed; failed/cancelled/skipped/todo all 0. Original command provenance
was not recovered. Current independently rerun host command below verifies the
present files; it is coder verification, not an independent review verdict.

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
```

[Fresh pinned-runtime host result](evidence/A_0_4-live-profile-10-resume-focused-pinned-host.log.gz):
exit 0, 213/213 passed; failed/cancelled/skipped/todo all 0. Node v22.22.1.
Includes all eight trial 10 tests and a real foreground-owned tmux capture test
with exact emitted byte assertions. It launches fixture programs/fake transport,
not a Claude provider or Gateway agent session.

[Initial broader host run](evidence/A_0_4-live-profile-10-resume-focused-default-host.log.gz)
used the same command without `A04_TEST_TMUX`: exit 1, 212 pass/1 fail/0 skips.
The real capture test failed at `capability`'s required `3.6a-agents.3` version
check. Source was unchanged for the rerun. The selected binary reports
`tmux 3.6a-agents.3`, SHA-256
`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
The rerun resolves this runtime selection failure, not a hidden code change.

Tests cover exact one-Enter positive response; absent provenance; prior history
and spoofed cells; identity changes at every frame; duplicate/missing/reflowed/
non-ASCII cells; unsafe modes; exact final guard; first-ask consumption including
invalid-input failure; and actual adapter spawn/ask wiring with failed launch,
configured arguments and dry-run controls. The reviewer must independently
assess whether these cover every intended conjunct and the narrow authority.

## Inventory repair and additional checks

The [prior gate attempt](evidence/A_0_4-live-profile-10-prior-full-gate.log.gz)
returned `invalid_manifest`, `suites: []`, tests/pass/fail/skips all 0. No suite
ran; this is not a full-gate pass. The sole error was `test.gateway` stale
inventory SHA after adding `claude_first_prompt.test.js`.

Canonical discovery minus exactly that test reproduces the old digest
`sha256:404c273b299560d51ef72aa6d1278ecd84397aa37576a99c28d7750f720ce638`.
Including it produces
`sha256:6406044a37fa09cccdefd91885a60dfed8224af421988d25b260931c3ba17b5f`.
`python3 scripts/ci_gate.py --refresh-inventory` validated against the suite
contract and changed exactly one digest in `ci/suites.json`; includes, excludes,
required lanes, minimum counts, timeout and skip budgets were untouched.

```bash
python3 scripts/ci_gate.py --validate-only
.venv/bin/pytest -q tests/structure/test_ci_suite_manifest.py -k 'repository_manifest_is_authoritative_and_complete or manifest_validation_rejects_missing_glob_and_stale_inventory or inventory_refresh_does_not_rewrite_an_invalid_manifest'
node gateway/node_modules/eslint/bin/eslint.js --config gateway/eslint.config.js gateway/src/adapters/base_adapter.js gateway/src/adapters/claude_adapter.js
git diff --check
```

Validation exit 0, errors empty, 0 tests (validation only):
[log](evidence/A_0_4-live-profile-10-resume-manifest-validation.log.gz).
Selected manifest tests exit 0: 3 passed, 76 deselected, no skips:
[log](evidence/A_0_4-live-profile-10-resume-manifest-tests.log.gz).
Source lint exit 0, empty output:
[log](evidence/A_0_4-live-profile-10-resume-lint.log.gz).
`git diff --check` exit 0. The scoped pytest selection is not the complete
structure suite. File hashes reconfirm source/test preservation.

## Outstanding gates and reviewer handoff

No full gate was run during recovery. Root must run `bash scripts/ci.sh` solo
on the host after agent sessions are inactive, with the patched runtime and
required disposable Redis 7, recording exact counts and skip budget. No full-gate
totals, Redis service verification or release claim is inferred from focused
checks. A new live acceptance check remains required before integration.

Independent Opus 5.5 medium must verify the operator-limited witness, plain
launch provenance/consumption, ambiguous/reused/reattached behavior, cleanup,
no replay, scope and evidence gaps. Use a fresh root-owned Gateway trace/session;
receipt of this handoff is not review or integration authority. Do not run the
full gate while sessions are active. Issue only a separately authored immutable
trial 10 verdict and index it; no verdict has been issued here.
