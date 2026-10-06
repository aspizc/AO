# Independent Review — Project V5 C/0/02 Trial 3

## Verdict

**KO** for technical candidate
`e1714ba41e583e28ad370014ceeed6d74ed73bba`.

The focused Trial 3 suite is green, but the Git subprocess environment is not
deterministic. An inherited `GIT_GRAFT_FILE` pointing to an alternate ancestry
file changes repository validation for the same checkout, candidate document,
and validation clock. This is the decisive failure requested for this review.

Trial 3 must not be integrated, promoted, tagged, or treated as the completed
C/0/02 release contract.

## Reviewer and reviewed identity

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Execution: Fast/Priority
- Review type: ordinary independent software-quality review
- Trial 2 KO/base:
  `b3cc904b927364e8816afce1eb1b4c38b6b163fa`
- Trial 3 technical candidate:
  `e1714ba41e583e28ad370014ceeed6d74ed73bba`
- Trial 3 technical tree:
  `19de26ad451bf16b6face9135fb78e654411fa98`
- Submission/request:
  `10d9827ead89b28b645003c73723a4f425aee0ca`

The technical candidate is the direct child of the Trial 2 KO commit. The
submission is the direct child of the technical candidate and adds only
`C_0_2-3_to_review.md`. Both prior KO verdict blobs are preserved unchanged.

## Blocking finding

### P0 — Inherited `GIT_GRAFT_FILE` changes candidate validation

`_git_environment()` begins with a complete copy of `os.environ` and removes
several repository-local Git variables, including `GIT_REPLACE_REF_BASE`, but
does not remove `GIT_GRAFT_FILE`
(`scripts/release_candidate.py:1208-1226`). `_run_git()` supplies that
environment to every Git subprocess
(`scripts/release_candidate.py:1284-1315`).

Git itself reports `GIT_GRAFT_FILE` as a repository-local environment variable:

```text
git rev-parse --local-env-vars
...
GIT_GRAFT_FILE
...
```

The new legacy-graft check inspects only
`<git-common-dir>/info/grafts`
(`scripts/release_candidate.py:1362-1379`). Its regression likewise covers
only `.git/info/grafts`
(`tests/structure/test_release_candidate_contract.py:2087-2100`), so an
alternate file selected by the inherited variable bypasses that inspection.

An isolated fixture first validated the collected candidate with no errors.
The review then wrote an alternate graft file containing the technical commit
as a parentless graft and set only
`GIT_GRAFT_FILE=<that external file>`. The same validator invocation produced:

```json
{
  "alternateAncestryErrors": ["git command failed"],
  "baselineErrors": [],
  "inheritedGIT_GRAFT_FILE": "/var/tmp/c002-trial3-graft-.../alternate-ancestry",
  "restoredErrors": [],
  "validationChanged": true
}
```

Removing the variable restored the original empty error list. The candidate
therefore succeeds or fails according to caller-local ancestry configuration,
not solely according to the repository and candidate evidence. Failing closed
in the influenced run does not make the release check reproducible: identical
evidence has two validation outcomes.

Required correction: remove `GIT_GRAFT_FILE` from the subprocess environment
before any Git command and add a regression that proves an inherited external
graft file cannot change collection, identity, merge-base, or ancestry
validation. The deterministic-environment review should use Git's complete
repository-local variable inventory rather than covering only the variables
already exercised by fixtures.

## Verification

- Focused release contract:
  `python -m pytest -q
  tests/structure/test_release_candidate_contract.py` —
  **62 passed in 19.53s**.
- Decisive inherited alternate-ancestry probe —
  baseline `[]`; with inherited `GIT_GRAFT_FILE`,
  `["git command failed"]`; after removal, `[]`.
- Commit topology and expected technical tree —
  **passed**.
- Trial 3 request-only advancement and preservation of prior KO blobs —
  **passed**.
- `git diff --check
  b3cc904b927364e8816afce1eb1b4c38b6b163fa..
  e1714ba41e583e28ad370014ceeed6d74ed73bba` —
  **passed**.

The probe used an automatically removed `/var/tmp` fixture. No network, MCP
service, Redis, database, provider credential, container, shared service, or
implementation modification was used.

## Required Trial 4 correction

Make the Git subprocess environment invariant to inherited
`GIT_GRAFT_FILE`, preserve the explicit default-graft rejection, and add the
external-graft-file regression described above.

This file is the sole intended Trial 3 verdict artifact. It must be committed
separately from the technical candidate and request. No integration, promotion,
tag, or technical-file change is authorized by this review.
