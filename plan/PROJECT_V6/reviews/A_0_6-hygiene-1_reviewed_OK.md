# Review A_0_6-hygiene-1 — OK

**Task:** public-hygiene fix for the RED live-fix merged gate (four home-directory paths in public test content).
**Trial:** 1
**Branch:** `feat/V6-A-0-06-hygiene`
**Commit:** uncommitted candidate on HEAD `ad97a96` (`ad97a9699e4dd15340dc314be68dc77e8b18c7d8`), which adds only the trial-1 request and its nine `A_0_6-hygiene-1-*.txt.gz` logs on top of `838b449` (tree `753723da33b6aec3865dbfeab87dff8b30c22c1a`).
**Contract:**
- `A_0_6-livefix-merged-gate-1.md` (SHA-256 `db7c29053f79f35a086526c997fb9bf6d80afc102d6957e5b0ec4d9e86bc0e9a`): fix exactly the four public-hygiene findings with a non-home path of identical length, and nothing else;
- the handoff `A_0_6-hygiene-1_to_review.md` (SHA-256 `d88b05aab0041d59866556b721f8db217c75b966d0f90a8527758add77453b86`).

**Reviewer:** fresh independent Claude Code reviewer session (Opus 5.5), brief `workspace/briefs/a06-hygiene-reviewer-1.md` (SHA-256 `4815c98c771715e307d2c7203edb0bdd277e191c70793889aae55c8a980230a8`). I did not write this change and took no part in the live-fix trials or the gate. No sub-agents were used. I read the coder's logs for comparison only; no coder material counts as verdict evidence.
**Date:** 2026-10-09

## Verdict

**OK.** The candidate replaces the 13-byte prefix `/home/tester/` with the 13-byte `/tmp/a06-fix/` at exactly the four gate locations: fixture lines 4, 16 and 20, and `session_prompt.test.js:416`. It changes nothing else. I reproduced each requirement:

- **Hygiene.** The scanner reports 4 findings (exit 1) on HEAD and 0 findings (exit 0) on the candidate. The scanner and its allowlist are unchanged. The structure suite passes 6/6.
- **Fixture shape.** The fixture keeps its 829 bytes, its 24 rows and every row width. The persistent option still wraps across two rows at 80 columns.
- **Recognition.** For every input the F1 tests build, the recognizer returns the HEAD result with only the prefix replaced.
- **Tests.** On the pinned `.4` binary, the F1 tests pass 2/2 and the focused prompt lanes pass 528/528.
- **Personal data.** The new path carries nothing personal.

This OK covers exactly the bytes in the SHA-256 table below. It is an implementation review only. It does not turn the RED merged gate green; only a new host `bash scripts/ci.sh` run on the committed fix can do that. It grants no integration, promotion or release.

## What I verified (measured)

### 1. Scope and byte identity

- **Scope.** `git status --porcelain=v1` lists exactly the two modified tracked files. There is nothing staged and nothing untracked.
- **Lineage.** HEAD differs from the gated commit `4656d51` (tree `7e0e528a2dbf8168e2eb8c802b2cd6c738e80c05`, as the gate report records) only under `plan/PROJECT_V6/reviews/`. Both candidate files are byte-identical between `4656d51` and HEAD. Their HEAD blobs (`499ad053…`, `cbc6ddd6…`) are the bytes approved in `A_0_6-livefix-2_reviewed_OK.md`.
- **Bytes.** A scratchpad script compared each file with its HEAD blob:

| File | Bytes, HEAD → candidate | `/home/tester/` in HEAD | HEAD with prefix replaced == candidate | Differing bytes outside the replaced spans | Newline positions |
| --- | --- | --- | --- | --- | --- |
| fixture | 829 → 829 | 3 (lines 4, 16, 20) | yes | none (33 differing bytes, all inside the spans) | identical (24 LF) |
| test | 28,546 → 28,546 | 1 (line 416) | yes | none (11 differing bytes, all inside the span) | identical (441 LF) |

- **Encoding.** Neither file contains CR or TAB, and both decode as UTF-8. The replaced spans are pure ASCII. `git diff` shows the fixture as binary only because `.gitattributes` sets `-diff` on `tests/gateway/fixtures/session_prompts/*.txt`.

### 2. Fixture geometry at 80 columns

I computed row widths with Unicode East Asian Width, counting ambiguous characters as 1 column. The only non-ASCII characters are `›`, `•`, `…` and `’`; they are unchanged and lie outside the spans.

- **All rows.** The 24 row widths are identical to HEAD, with a maximum of 80.
- **Row 4.** 80 columns: `• Running touch /tmp/a06-fix/…/outs…`, truncated at the same offset as before.
- **Row 16.** 75 columns. The command path is still 73 characters.
- **Row 20.** 79 columns, ending with `` `touch /tmp/a06-fix/ ``. The next breakable segment, `git/`, needs 4 columns and only 1 remains. A width-based wrap therefore breaks at the same place as in the live capture.
- **Row 21.** Five leading spaces, then `` git/…/outside-marker` (p) ``, 70 columns.

The coder's `wrap` log reports the same numbers.

### 3. Same recognized command (F1)

I ran `recognizeCodexPrompt` (`gateway/src/adapters/codex_adapter.js`, unchanged, `4f89c108…`) directly in Node on both fixture versions. I used all 16 inputs the two F1 tests build: `session_prompt.test.js:418-419`, the 9 row replacements at `:435` and the 5 pane variants at `:438`.

- **Base and the alternate wrap at `:419`.** Both return `{ kind: "command", command: "touch\n/tmp/a06-fix/git/personal/AO/workspace/a06-live/run-154702/outside-marker", options: ["y", "p", "esc"] }`. That equals the HEAD result with the prefix replaced, and it equals the new `wrappedExpected`.
- **The 14 malformed variants.** All return `null` on both HEAD and the candidate.
- **Sensitivity.** Reverting only fixture row 16 changes the recognized command. So `:418` binds the fixture's command rows to the expectation at `:416`.

### 4. Hygiene RED → GREEN

- **RED.** I reproduced it on a pristine local clone of HEAD (tree `967479cd9e32d5fd0991d7a952f3d186ae512812`) in my scratchpad. `python3 scripts/check_public_hygiene.py --repo-root <clone>` exited 1 with exactly the four gate findings: fixture `:4`, `:16` and `:20`, and test `:416`.
- **GREEN.** On the candidate, `python3 scripts/check_public_hygiene.py` printed `public hygiene: 0 finding(s)` and exited 0.
- **No allowlisting.** `scripts/check_public_hygiene.py` and `ci/public-hygiene-fixtures.json` are byte-identical between HEAD and the candidate. The findings were removed, not allowlisted.
- **Structure.** With the AO venv (Python 3.11.15, pytest 9.1.1), `tests/structure/test_public_hygiene.py` gave 6 passed, exit 0. That includes the two gate failures: `test_real_tree_has_no_unallowlisted_personal_paths` and `test_real_tree_public_registry_ids`.

### 5. F1 and focused lanes on the pinned `.4`

Paths here are relative to the AO checkout root.

**Environment.** Every Node run used `env -i` with:

- `HOME`, `USER` and `LANG=C.UTF-8`;
- `PATH` = `workspace/tmux-pinned/bin4`, then the AO venv, then `~/miniconda3/bin`, then the system directories;
- `A04_TEST_TMUX` = `workspace/tmux-pinned/bin4/tmux`;
- `D007C_TEST_TMUX_PATH` = `workspace/tmux-pinned/bin4`;
- `D007C_RUN_REAL_TMUX_PROBE=1`;
- `TMUX_TMPDIR=/tmp/claude-1000/a06h1r`.

**In-run check.** Those four were the only `AGENTS_*`, `TMUX*`, `A04_*` or `D007C_*` variables. `tmux` resolved through `PATH` to `bin4/tmux`, which links to `workspace/tmux-pinned/a06-impl-1-A/tmux-3.6a-agents.4-linux-amd64`. `tmux -V` printed `tmux 3.6a-agents.4`, and the SHA-256 through the link was `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac`. My session inherited 11 `AGENTS_*` variables plus `TMUX` and `TMUX_PANE`; none reached the tests. Node was v22.22.1.

**F1.** `node --test --test-concurrency=1 --test-reporter=tap --test-name-pattern="live Codex 0.162 persistent option|wrapped persistent option" tests/gateway/session_prompt.test.js` gave 2/2 pass, with 0 failed, cancelled, skipped or todo; exit 0.

**Focused lanes.** I ran the 12 files from the handoff, the same set as the live-fix trial-2 review:

- `session_prompt`, `session_prompt_diagnostics`, `session_prompt_guard`, `session_prompt_transport`;
- `session_prompt_external`, `session_prompt_crash`;
- `guarded_submit`, `guarded_paste`, `prompt_submission`;
- `request_context_reattach`, `process_supervisor_session_port_relay`, `claude_first_prompt`.

**Focused result.** 528 of 528 passed, with 0 failed, cancelled, skipped or todo; exit 0 in 70 s. The TAP output has 528 `ok` lines under a top-level plan of `1..526`. 28 passing tests have "real" in their names, and the relay probe `runs the pinned custom tmux retained-channel probe under the exact isolated label` passed. The two F1 tests also passed in this run (`ok 461`, `ok 462`).

These totals equal the coder's host logs and the live-fix trial-2 review.

### 6. Nothing personal in the replacement

- **Prefix.** `/tmp/a06-fix/` is a neutral temporary root plus the task id. It has the same style as the sanitized `/tmp/a06-fixture…` paths already in the sibling fixtures (`codex-command.txt`, `codex-trust.txt`, `claude-permission.txt`) and in `session_prompt.test.js:20`.
- **Both files.** Neither candidate file contains `/home/`, `/Users/`, `tester`, or the operator's username, name or e-mail.
- **Tail.** The unchanged tail `git/personal/AO/workspace/a06-live/run-154702/outside-marker` names no person, host or credential. See note 2.

### 7. Lint and whitespace

- **Whitespace.** `git diff --check` exits 0, and there are no untracked files.
- **Lint.** The gateway lint script does not reach `tests/gateway/`. So I ran the Gateway ESLint config directly on `tests/gateway/session_prompt.test.js` from the repo root. The file was linted, not ignored, with 0 errors and 0 warnings.

### 8. Handoff accuracy

All nine log hashes match the handoff, and its disclosures are accurate:

- `green.txt.gz` is a pre-edit RED rerun: 4 findings and 2 structure failures.
- The sandbox `f1` log (1 file-level pass) and `focused` log (5 pass and 7 fail at file level) prove nothing about individual tests. The handoff does not credit them.
- `green-verified`, `f1-host` and `focused-host` agree with my runs.

## Non-blocking notes

1. **Rows 4 and 20 are not bound by the F1 tests.** The recognizer reads only from the "Would you like to run the following command?" title down, and it never compares the persistent option's text with the command rows. A fixture with only row 20 reverted still passes. This behaviour predates the trial, since the recognizer is unchanged. For this trial, the consistency of rows 4 and 20 is shown by the byte comparison in section 1, not by the tests.
2. **The tail mirrors the operator's checkout layout.** The tail `git/personal/AO/workspace/…` follows the operator's local checkout layout. It is not personal data, and it was already in the reviewed bytes. The history-exempt `plan/` trail carries the same layout (156 lines in 41 files at HEAD). Outside `plan/` and `audit/`, only these two files carry it. Changing it was outside this contract ("nothing else"). If the operator wants a neutral tail, a later trial can replace it with a segment of equal length.
3. **The `Reason:` text is a reconstruction.** The fixture's `Reason:` text says the destination is read-only. With a `/tmp` path, that narrative is a sanitized reconstruction, not a capture of a real sandbox decision. The recognizer checks only the row's shape (`codex_adapter.js:55`), so no assertion depends on it.
4. **Commit the reviewed bytes.** When this candidate is committed, the committed bytes must equal the table below. Any change needs a new trial.

## Human-gated (listed, not decided)

1. **New host gate.** Run `bash scripts/ci.sh` on the committed fix, with the same `.4` pin and setup as the merged gate, to replace the RED result in `A_0_6-livefix-merged-gate-1.md`.
2. **Integration, promotion and release.** These decisions stay with the operator.

## Not measured

- `bash scripts/ci.sh` (the brief forbids it).
- The full Gateway, CLI, e2e, Redis and Postgres lanes, and the lock, release-candidate, MCP-smoke and policy-registry lanes.
- A live Codex 0.162 rendering of the new path at 80 columns. I checked the geometry arithmetically on the static fixture.
- Source mutants. No source, vendor file, pin, binary or policy changed.

## Reviewer SHA-256 table (computed by this reviewer)

Candidate (2 modified tracked files, nothing else):

| File | SHA-256 |
| --- | --- |
| `tests/gateway/fixtures/session_prompts/codex-0.162-wrapped-command.txt` | `5f944b61b4801e99839a36d0f3331ad1761e1cdf894382e88c22ae55aff1ebc7` |
| `tests/gateway/session_prompt.test.js` | `49ddcaabb036d8751f5b9965ffc1734f40729de4969e76cc15fa951f8f229748` |

Both values equal the handoff's table.

Base (HEAD blobs, equal to the `A_0_6-livefix-2_reviewed_OK.md` table):

| File | SHA-256 |
| --- | --- |
| `tests/gateway/fixtures/session_prompts/codex-0.162-wrapped-command.txt` (HEAD) | `499ad0532bcfe00896ea2b9b86f0091a4eccc6467698d6dc837f2cd8c4daf584` |
| `tests/gateway/session_prompt.test.js` (HEAD) | `cbc6ddd6a46bc0492f0c6a97b3573bc175fbe3ccd9ef497928e7d6514117bc83` |

Contract, request and brief:

| File | SHA-256 |
| --- | --- |
| `plan/PROJECT_V6/reviews/A_0_6-livefix-merged-gate-1.md` | `db7c29053f79f35a086526c997fb9bf6d80afc102d6957e5b0ec4d9e86bc0e9a` |
| `plan/PROJECT_V6/reviews/A_0_6-hygiene-1_to_review.md` | `d88b05aab0041d59866556b721f8db217c75b966d0f90a8527758add77453b86` |
| `workspace/briefs/a06-hygiene-reviewer-1.md` (outside the repo) | `4815c98c771715e307d2c7203edb0bdd277e191c70793889aae55c8a980230a8` |

Unchanged references (identical at HEAD and in the candidate):

| File | SHA-256 |
| --- | --- |
| `scripts/check_public_hygiene.py` | `df9f652113dc05dc0618f0775ace4b5be3b05308be136c09befd620ef886d503` |
| `tests/structure/test_public_hygiene.py` | `0a8878edc5879cfa3153790db8fac03748561309dd4ce610a4857093fe381a37` |
| `ci/public-hygiene-fixtures.json` | `d1b646f02a5fb0fedd65be3142bf172ada0d626cd32efbe9bf4e39b9019c611f` |
| `gateway/src/adapters/codex_adapter.js` | `4f89c1087c5b635211f3dbbe4f55be59fa1302ac5424c000b6f93ec4e10b2720` |

Coder logs (each equals the handoff's value):

| File | SHA-256 |
| --- | --- |
| `A_0_6-hygiene-1-f1-host.txt.gz` | `a5e8c5516a8e0ad2fc7bc1976fadec699033eaa7cf191ecc7e4d828167d6e4f3` |
| `A_0_6-hygiene-1-f1.txt.gz` | `5925f1ab6b056257a737847eb3fcf894530c0a0e85aa3b9972fac8a9ca92c7cd` |
| `A_0_6-hygiene-1-focused-host.txt.gz` | `28ee527d48a63baf37df3549529459d5a6f6778ad8ef0a38166aa8e659a011b1` |
| `A_0_6-hygiene-1-focused.txt.gz` | `37b78dd3cf1b57627a1c024305bb2b5d5908ad1b91b165d8264722127d455986` |
| `A_0_6-hygiene-1-green-verified.txt.gz` | `9a80cfb0cd392764dcf72e91e954ec3abac59f910c3f691dee42dd7057aed2b1` |
| `A_0_6-hygiene-1-green.txt.gz` | `c78bbbaa8324a57bc387d89c20593e4a7c216c3277f4bf79368d5e0a435b39a3` |
| `A_0_6-hygiene-1-red-structure.txt.gz` | `e51e1727d72026e01ed46485b1edc51894cf5a20e7545bd18774da7301b9c24e` |
| `A_0_6-hygiene-1-red.txt.gz` | `c4bd89f1715e8df9f6f84fa02574ff4a069921b7a1e9a0408631ea84922bcfe9` |
| `A_0_6-hygiene-1-wrap.txt.gz` | `d6cde55a0a0ece717e6279d6e6ec97cfa9d6f2e84f8370c4df6a0e32efa7e760` |

| Executable | SHA-256 | Use |
| --- | --- | --- |
| `.4` (`workspace/tmux-pinned/bin4/tmux` → `a06-impl-1-A/tmux-3.6a-agents.4-linux-amd64`) | `837d01039a0f7635c833e9346ab86ac9255e539a9b8c55e51b58c33211be7aac` | All Node runs in this review |

Reviewer logs (scratchpad only, not committed): `rev-f1.txt` `fb6f12c7d4da88909d454ba2af40e5a4295f0a6ceae631db49b5ca869210e2f0`; `rev-focused.txt` `b99908330149a70c3032b2a411bb53916ee54c1ed9a35576819513673dbf10db`.

## Process

- **Read-only review.** This verdict is the only file written to the repository. I made no edits, commits, staging, stash, reset or checkout in the worktree. Before and after my runs, `git status --porcelain=v1` showed the same two entries and HEAD stayed `ad97a96`. The `--ignored` listing digest stayed `4ca91b93…`.
- **Scratch work.** The HEAD clone used for the RED baseline, the byte, width and recognizer scripts, and every log stayed in the reviewer scratchpad. The clone does not touch the shared repository.
- **tmux isolation.** `TMUX_TMPDIR` was the dedicated `/tmp/claude-1000/a06h1r`. It was empty after the runs, and I removed it. `/tmp/tmux-1000` held only `default` before and after, and no `.4` process is left. I touched no user or Gateway session.
- **Indexing and commit.** Indexing in `reviews/README.md` and committing are left to the orchestrator.
- **Budget breach.** This review exceeded the AGENTS.md Rule 6 per-task budget of 20k tokens. The session counter showed about 135k tokens used before I wrote this file, close to the 150k per-session budget. Most of it went on reading the trail and on reproduction. I am surfacing it here rather than hiding it.

## Status

A/0/06 hygiene fix, trial 1 (uncommitted candidate on `ad97a96`): **implemented and reviewed OK**. It is not integrated, promoted or released. The live-fix merged gate stays RED until a new host gate passes on the committed fix.
