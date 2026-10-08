# A/0/04 implementation trial 5 — independent review verdict

Review task: `ts-27dd9157-1fb0-4a26-b4b2-c8b337070737`.
Handoff: [A_0_4-5_to_review.md](A_0_4-5_to_review.md), HEAD `6a0ecf6`.
Reviewer: Claude reviewer session, separate from the coder. No candidate
file was edited. No provider or corporate account was used. Nothing was
staged, committed or pushed.

## Process disclosure (void evidence)

Early in this session the reviewer launched five read-only sub-reviewers.
That broke the operator's limit of three concurrent reviewers. The operator
stopped them. Their partial output was never read and is **void**: it is not
used anywhere in this verdict. Every result below comes from this session's
own commands.

## Candidate identity

- `sha256sum evidence/A_0_4-trial4-candidate-files.json` gives
  `c841c54e…f7c0`, which matches the handoff.
- All 73 bound paths match on disk, with 0 mismatches. The `null` entry
  `tmux-3.6a-agents.1.patch` is absent.
- The only dirty path outside the manifest is `A_0_4-5_to_review.md`.
- `git diff 03d7f45 6a0ecf6` touches only trial-4 review and evidence files.
- Conclusion: the candidate is unchanged since trial 4, and the trial-4 F1
  acceptance still applies to these bytes.

## Covered in this trial

1. **Surface 3 — patch identity: PASS.**
   - The `.2` evidence file hashes to `c488dccadb08…74c2`, which equals its
     `.sha256` sidecar.
   - Neither `.2` nor `.3` touches `cmd-send-keys.c`, so ordinary send-keys
     is upstream tmux in both.
   - The `cmd-paste-buffer.c` hunk (guarded paste) is byte-identical between
     `.2` and `.3`: 823 bytes each, and `cmp` reports them equal.
   - `options-table.c` is identical.
   - The rest of the `.2`→`.3` delta is limited to:
     - the new file `cmd-agents-submit.c`;
     - its registration in `Makefile.am` and `cmd.c`;
     - the version string `-agents.2`→`-agents.3` in `tmux.c`.
   - `.1` touched only `Makefile.am`, `Makefile.in`, `cmd.c`,
     `options-table.c` and `tmux.c`.
   - No builder, workflow, doc or README outside `plan/` references `.1`
     or `.2`.
   - The `.3` SHA `e8139a40…955d` equals `manifest.json` `patch.sha256`.
2. **Surface 4 — adapters, errors, catalog: PASS.**
   - In the `claude_adapter.js` and `opencode_adapter.js` diffs, the raw
     `buildSendKeysCmd` calls and the sleep-then-capture logic are replaced
     by `submitLaunchCommand` / `submitPrompt`.
   - All five supported adapters (codex, claude, opencode, pi, antigravity)
     call the guarded path. None of them references `buildSendKeysCmd` any
     more.
   - Audit now records `promptLength`, not the prompt text
     (`base_adapter.js:351-354`).
   - `tool_errors.js` exposes `reason` only from a fixed allowlist, and only
     for `AGENT_PROMPT_NOT_SUBMITTED`.
   - The catalog change is additive: one new error code. The contract
     `projectionSha256` is updated, and `tool_catalog.test.js` runs 6
     passed / 0 failed / 0 skipped.
   - F6: `gemini_adapter.js:280,318` still uses raw send-keys. The exact
     gate command
     `node --test --test-name-pattern='rejects registry-only Gemini before adapter' tests/gateway/orchestrator_profile_runtime.test.js`
     gives 2 passed / 0 failed. Gemini is refused before the adapter. Direct
     Gemini adapter behaviour was not inferred.
3. **Surface 5 — evidence: PASS, with one bound.**
   - `trial4-scoped-green-host.log.gz` shows 83 tests, 83 pass, 0 fail,
     cancelled, skipped or todo.
   - `f1-build5-retained-green1.log.gz` shows 62 tests, 62 pass, 0 fail,
     0 skipped.
   - The trial-4 lint log contains only the eslint invocation, with no
     reported problems.
   - The scoped GREEN was rerun on this tree with the checkpoint's exact
     six-file command and
     `A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux`, which reports
     `tmux 3.6a-agents.3`. Result: 83/83 pass, 0 fail, cancelled, skipped
     or todo.
   - `git diff --check HEAD` is clean.
   - Bound: the provenance of that `/tmp` binary (whether it was built from
     the bound `.3` patch) was not verified.
   - The RED logs were not re-read by content in this trial.
4. **Surface 6 — content scan: no Signicat or corporate identifier found.**
   - Scope: all candidate files plus the trial-3 and trial-4 `.gz`
     evidence.
   - The README owner lines and the `github.com/aspizc` URLs already exist
     at HEAD; they are not added by this diff.
   - P3: the new public fixture
     `tests/gateway/fixtures/claude_2_1_292_composer.json:3` embeds the
     local absolute path `/home/carase/.local/share/claude/versions/2.1.292`,
     which exposes the local username. Its source hash and anchors work
     without that path.
   - P3, historical evidence only: the committed trial-3 and trial-4 `.gz`
     logs contain 89 `/home/carase/git/personal/AO/workspace/clones/…`
     paths. They are not candidate source, and no change is required for
     this sheet.
5. **Surface 2 — F3 builders, workflow and handshake: partial PASS.**
   - `bash -n` passes for both builders.
   - Both builders verify the `.3` SHA before running `patch --fuzz=0`.
   - Both builders assert `tmux -V` equals `tmux 3.6a-agents.3`.
   - `ci.yml:74` links the `.3` binary.
   - The supervisor helper's version check changed from `agents.1` to
     `agents.3`.

## Not examined (task budget reached; no credit either way)

- **Surface 1 (F2)**, all of it:
  - the framing and PID-isolation source logic;
  - the isolated tests' first and retry controls;
  - reproducing the mutants in `A_0_4-trial3-mutation-proof.json`;
  - the fixture's atomic mode-file publication.
- **Surface 2 (F3)**, remainder:
  - the wording of `gateway/README.md`, `docs/tmux-runtime.md` and
    `gateway/vendor/tmux-agents/README.md`, checked line by line against
    the source;
  - YAML and test-inventory checks for `ci/suites.json` and `ci.yml`;
  - the full handshake field and error-code comparison beyond the version
    string;
  - `bash -n` on `build-offline.sh` checks syntax only. Nothing was built.
- The content of the RED logs.
- The provenance of the `/tmp` tmux binary.

Still open regardless of any source OK:

- the three pending-output cases (SOURCE-REVIEWED / NOT EXECUTED);
- positive Antigravity acceptance;
- live provider markers, versions and timing;
- native Darwin;
- CI inventory;
- the root solo full gate;
- sheet closure.

## Verdict

**KO (bounded).**

- Surfaces 3 and 4 pass. Surfaces 5 and 6 pass within the bounds above.
- No P1 or P2 defect was found in the examined scope.
- One P3 is optional to fix: drop the absolute local path from the
  fixture's `binary` field.
- The combined source review cannot close, because F2 and the F3 doc
  wording are still unexamined.
- **No code change is required by this verdict.**
- Next step: a fresh reviewer session on a new trace covers only the
  "Not examined" list above, against the same manifest SHA.

This verdict is not integration, promotion or release evidence, and it does
not close A/0/04.
