# V6 A/0/06 — Trial 5 review request

Uncommitted candidate in `wt-v6-a06`, branch
`feat/V6-A-0-06-permission-prompts`, HEAD
`c0405b1dc9c19c505a61ed48e4244b4e0228baaf`.
Implementation baseline remains `7982e422577ad6dfb37ef0c7b1e3c8433735430a`.
This is a coder handoff for the operator-requested Git attribute, not an
independent verdict. Trial 4's independent OK remains historical for its bound
candidate. The new attribute needs independent review before any commit.

## Sole candidate addition

Top-level `.gitattributes` contains exactly one rule and a final newline:

```gitattributes
tests/gateway/fixtures/session_prompts/*.txt -diff
```

The sanitized raw terminal grids require their exact trailing spaces and blank
rows. The tracked attribute makes Git treat only these `.txt` fixtures as
non-text diffs in clones carrying this file; it does not trim or transform blob
bytes. Textual Git diffs for these fixtures will show binary-file changes.
JSON fixtures and source files retain normal diff behavior. The scope does not
relax repository-wide whitespace checks or change local Git configuration.

All **23 Trial 4 candidate hashes are unchanged**. No source, test, fixture,
policy, README, CI inventory or prior review artifact was edited. Only the
attribute and new Trial 5 review/evidence artifacts were added.

## Staged-check RED before the attribute

The canceled commit attempts left exactly the 28 operator-authorized paths
staged and HEAD unchanged. Before any attribute addition, all reviewed
candidate hashes matched and the full staged check was recorded:

```bash
git diff --cached --check
```

[Staged-check RED](evidence/A_0_6-5-staged-check-red.log): **exit 2**. Every
reported error is trailing whitespace or blank EOF rows in the three raw-pane
`.txt` fixtures. No commit occurred and no check was bypassed.

Exactly the original 28 paths were then unstaged with
`git restore --staged -- <explicit paths>`. All working-tree hashes before and
after matched, and the index was empty. The complete explicit path list is
retained as `initialUnstagedPaths` in the command evidence below.

The prior unstaged `git diff --check` claims did not check the then-untracked
fixtures. They therefore did not establish that the staged candidate passed.
Trial 4 full ESLint evidence remains valid and is unrelated to this staged
whitespace defect. Prior immutable handoffs were not rewritten.

## Staged-check GREEN after the attribute

For verification only, the same 28 exact reviewed paths plus `.gitattributes`
were temporarily staged with an explicit pathspec. The staged path set was
asserted to be exactly these 29 files, with no logs, policies or extra paths.
All 29 staged blob hashes matched their working-tree bytes, and all 23 reviewed
candidate hashes matched the Trial 4 manifest.

```bash
git diff --cached --check
git check-attr --cached diff -- \
  tests/gateway/fixtures/session_prompts/claude-permission.txt \
  tests/gateway/fixtures/session_prompts/codex-command.txt \
  tests/gateway/fixtures/session_prompts/codex-trust.txt \
  tests/gateway/fixtures/session_prompts/README.json \
  tests/gateway/session_prompt.test.js
```

- [Staged-check GREEN](evidence/A_0_6-5-staged-check-green.log): **exit 0**, no
  diagnostics, with the attribute staged alongside the entire reviewed set.
- [Scoped attribute GREEN](evidence/A_0_6-5-scoped-attributes-green.log): the
  three `.txt` fixtures have `diff: unset`; JSON and source controls have
  `diff: unspecified`.
- [Command/path/hash evidence](evidence/A_0_6-5-command-results.json) records
  RED/GREEN exit codes, all explicit unstage/stage path lists, preserved Trial
  4 candidate hashes and every temporary staged blob hash.

Exactly the temporary 29-path set was subsequently unstaged with
`git restore --staged -- <explicit paths>`. The index is empty. All working-tree
bytes still match the pre-stage hashes. The prior staged check was not bypassed;
its failure is retained, and the scoped tracked attribute makes the new check
pass while preserving fixture bytes.

Behavior suites were not rerun for this Git metadata-only addition. Trial 4's
301 focused tests, six real-tmux cases, three crash tests and full Gateway lint
remain historical evidence for the unchanged 23-file implementation. This
handoff claims only the new staged-check and attribute verification. Full CI
and live acceptance remain root-owned and were not run.

## Immutable bindings

- Trial 4 handoff SHA256:
  `eded916cb253b86884d12eb4e5701b5c45bca833d45ad85c3422c7d93a31b58e`.
- Trial 4 candidate/evidence manifest SHA256:
  `bd5c996404981df407a0324c4e53372c966ed3b9354b51652f773e9fa0ce94ee`.
- Trial 4 independent OK SHA256:
  `3f9c4c16d6d2cfc80ffda540e05e215229456149a17d85554b6aec76badf12da`.
- `.gitattributes` SHA256:
  `9b11142cb8669010a8963af230a1ada76d144a2c40d7a9da940681bd87e166d0`.
- [Trial 5 candidate/evidence manifest](evidence/A_0_6-5-candidate-and-evidence-sha256.json)
  SHA256: `a324d8a8cc30b35b65c176c459b69fd7e2333a3e752b2cbbd60eeccc424ca529`.
  It binds 24 candidate files (23 unchanged plus the attribute), four new
  evidence files and historical review bindings. Trial 4's seven evidence
  hashes and all prior artifacts bound by its manifest were rechecked.

This handoff and its evidence were exclusively created and made read-only.
No commit, push, policies edits, subagents, self-review or full `ci.sh` run.
Independent review is required before any mechanical commit of Trial 5.
