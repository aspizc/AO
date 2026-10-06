# Independent Review Result — Project V5 H/0/01 PROBES (Trial 1)

## Verdict

reviewed_KO

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

These counts cover only this pass's blocker-first scope. This is a
deliberately narrow adjudication issued after an earlier reviewer pass
exceeded the mandatory 20k task budget without a verdict. One material
prescribed-gate failure is sufficient for a trial KO; the absence of further
findings in this table is explicitly not certified.

## Reviewer identity and partial coverage

- Fresh independent Claude Fable 5 (max) reviewer session; it did not
  implement any part of this trial and reused no prior reviewer context.
- This pass adjudicated exactly one question: whether the disclosed fresh
  Ruff format-check failure on the candidate's immutable composition test
  blocks Trial 1 under the repository's prescribed handoff/quality
  conventions.
- Coverage is partial by design. The production implementation was not
  inspected and the broad Python/Node suites were not rerun. The provider,
  coordination, authority, and composition behavioral lanes, schema/leakage
  evidence, and adversarial coverage of the request were NOT fully
  adjudicated here and receive neither OK nor KO individually.

## Authenticated identities

All identities below were recomputed locally; the untrusted request's claims
were verified, not assumed.

```text
branch                 feat/V5-H-0-01-probes
request commit (HEAD)  86240addb01ae03d56e9e0202aa9e1ac25f2e54e
request tree           2d976cb605e2c04005c289608e7582f22556c614
request file blob      2805742e04eb215ef7ca3ff270265312aff83458
                       plan/reviews/PROJECT_V5/H_0_1_PROBES-1_to_review.md
technical candidate    a2c0e2dd44c38e44eccd4e859b80feb2fae26104
candidate tree         49916f2cea845b036909a755cad67cba7a8e49b4
composition RED        af8e0c94065cd60e02cef17ecbfb02e0c14bc57a
composition test blob  873579557e50353179d33d3c6404ae6f5ace7750
                       tests/cli/test_doctor_probe_composition.py
```

- The request commit's parent is the technical candidate, and
  `git diff --name-status a2c0e2d 86240ad` shows exactly one added path, the
  review request file. The candidate is an ancestor of the request.
- The composition test blob `8735795…` is byte-identical at the RED commit
  `af8e0c9`, at the candidate `a2c0e2d`, and in the reviewed working tree:
  the file is the immutable Trial 1 RED evidence and was not modified by the
  handoff.
- The working tree was clean apart from the pre-existing untracked
  `gateway/node_modules` symlink, which is acceptable.

## Finding P2-1 (blocking) — prescribed Ruff format gate exits 1 on the frozen candidate

The disclosed non-green gate reproduces exactly with both
repository-provisioned Ruff executables.

Exact seven-path handoff gate (Ruff 0.15.22, `cli/.venv/bin/ruff`):

```text
cli/.venv/bin/ruff format --check --no-cache \
  cli/src/agents_cli/doctor.py cli/src/agents_cli/doctor_probes.py \
  tests/cli/test_doctor.py tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_probe_composition.py

Would reformat: tests/cli/test_doctor_probe_composition.py
1 file would be reformatted, 6 files already formatted
exit=1
```

Single-file reproduction: exit `1` with `1 file would be reformatted` under
both Ruff 0.15.22 (`cli/.venv`) and Ruff 0.15.16 (repository `.venv`
cross-check). `ruff format --diff` shows exactly one hunk: in
`projected_status_codes` (lines 63–66) the comprehension element
`(check["id"], check["status"], check["code"])` and its
`for check in projection["checks"]` clause are split across two lines where
the formatter joins them into one 88-column line.

Configuration note: no Ruff configuration exists at the repository root or
under `tests/`, and `cli/pyproject.toml` defines only lint options
(`[tool.ruff.lint]`, `E501` ignored) with no `[tool.ruff.format]` section, so
default formatter settings govern this gate identically under both
executables and either config resolution. The deferred-wrapping comment in
`cli/pyproject.toml` covers the `E501` lint rule for pre-existing files; it
does not exempt a file newly added by this candidate from the format gate.

Why this is blocking under the prescribed conventions:

- The H/0/01 Verification section prescribes explicit lint inventories for
  task lanes, and the sheet's Trial 10 correction gate requires Ruff
  regressions to remain green in this sheet's lanes.
- The handoff itself declares Ruff format over the seven changed Python
  files a prescribed fresh static gate and discloses this result as its only
  non-green prescribed gate; the other six files in the same candidate are
  format-clean, confirming the lane convention for new/changed files.
- The failing file is the immutable Trial 1 composition RED blob. Under the
  immutable review-trail convention it cannot be reformatted within this
  trial without breaking the authenticated RED→GREEN evidence chain, so the
  failure is not remediable in Trial 1 and the trial cannot be accepted.

Precise correction (one line): In a Trial 2 tests-first commit, reformat only
`tests/cli/test_doctor_probe_composition.py` with
`cli/.venv/bin/ruff format tests/cli/test_doctor_probe_composition.py`
(joining the `projected_status_codes` comprehension onto one line), rerun the
prescribed handoff gates on the new candidate, and resubmit, leaving every
Trial 1 blob immutable.

## Limits and non-claims

- Provider, coordination, authority, and composition behavior was not fully
  adjudicated in this pass; no gate other than the reproduced Ruff format
  gate (and the identity/scope authentication above) was adjudicated, and
  nothing here implies the remaining evidence is OK or KO.
- No integration, full-sheet H/0/01 completion, portability,
  native-runtime, promotion, tagging, or release claim exists.
- `bash scripts/ci.sh` and the disposable lock-graph checks are
  integrator-owned and were not run in this lane pass.
- This verdict is Trial 1 scoped. Trial 1 request/result artifacts are
  append-only; the correction belongs to a fresh Trial 2 candidate under a
  fresh orchestration trace and reviewer session.
