# Review Submission - Project V5 H/0/01 PROBES (Trial 4 integration)

## Requested reviewer and verdict

Assign a fresh independent Codex reviewer with exactly:

- agent/model: `codex` / `gpt-5.6-sol`;
- reasoning effort: `max`;
- service tier: `priority`;
- a new trace, session, and worktree; and
- no reuse of this coder process or worktree.

The reviewer must inspect the frozen integration commit below and write the
verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_PROBES-4_result.md
```

The result must use `reviewed_OK` or `reviewed_KO`, list every P0/P1/P2
finding, identify the exact reviewed commit/tree/pathset, and state the exact
commands actually run. A verdict commit must change only the result path. The
reviewer must not rewrite this request or any Trial 1-3 evidence.

No Trial 4 result existed when this request was committed. This document is a
request, not a coder verdict.

## Gateway and coder identity

This integration intentionally reused the existing PROBES coder context:

```text
trace: tr-v5-h001-probes-t3-d85a20bd-c431-4d38-a5f3-3c3f68d16679
task: ts-e4db809f-ad19-463f-a0f5-a7f48f95f131
role: coder
agent/model: codex / gpt-5.6-sol
reasoning effort: max
service tier: priority
worktree: /home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes-t3
branch: integration/V5-H-0-01-probes-main-t1
```

No internal sub-agents were spawned and no review was self-authored. The coder
tmux/process remains alive only for independently requested corrections.

## Review boundary

Trial 4 is an integration replay, not a fourth implementation. It asks whether
the already reviewed PROBES Trial 3 head was mechanically integrated onto the
exact current-main anchor without regressing the already integrated DOCTOR
Trial 13 behavior.

Review only:

1. the exact two-parent integration and authorized first-parent pathset;
2. preservation of all immutable Trial 1-3 evidence and reviewed bytes;
3. the DOCTOR Trial 13 plus PROBES semantic union in `doctor.py` and
   `test_doctor.py`;
4. the single inventory conflict and deterministic three-digest refresh;
5. the focused Python, Node, schema, formatting, inventory, and Git evidence;
   and
6. whether the stated limitations and non-claims remain accurate.

Do not treat this request as H/0/01 completion, integration into a moving main,
promotion, release, publication, tag, push, or full-CI approval.

## Frozen anchors and ancestry

Exact current main was authenticated from Git before mutation:

```text
commit  2e368b1f81db35bc41f7dfe1759e6b077e15b281
tree    ac582da210e0f2ac722a4c6b6077090d1310eb60
parents 837206cca88686020a5e079aab8c7f3c46548263
        f904a2884f19fe5a9aafa9af58b3070a0b29059c
subject feat(coordination): integrate epoch migration foundation (PROJECT_V5 G/0/02)
```

The exact reviewed PROBES head was:

```text
commit  8c39fbec49b025480b71f8149b4c1e3f192166e0
tree    ac2e132def1b192c5175db4429e3ac0a597388aa
parent  9cc7cd4f4c2c08bfdc3b93530680ea2e3cce4536
subject docs(review): index H/0/01 PROBES trials (V5 H/0/01)
```

Their authenticated merge base was:

```text
commit  9f075e181ef257b4b5b4b4cac3c0870af97110ec
tree    1c7019a856950e2cabe3c4267454fb02c9b882e2
parents 4236b765fbf18fa519fb4692fea551f9485fe506
        0e25400e359a0387636f9ce2d96bc43bd3ba7a0f
subject merge: integrate reviewed V5 D/0/07 plan reconciliation
```

`8c39fb...` is not an ancestor of `2e368b...` (the ancestry guard returned
exit 1 as expected). Both are ancestors of the integration commit.

The integrated DOCTOR Trial 13 request/result anchors are:

```text
6e35f85e15dd6fc711198bbface87e06d15263cd
  docs(review): request DOCTOR trial 13 review (V5 H/0/01 Trial 13)
f967c4e95d513da2f159d3a3ea030fc76ec6966f
  review(v5): record H_0_1_DOCTOR trial 13 result
```

## Immutable PROBES Trial 1-3 chains

The complete linear candidate history was authenticated from Git. Each line
is `commit tree parent role`.

### Trial 1

```text
34f211d8ab7a1537d6137731aa4ccc6de007de3c d5865c309f76a97ef6e59d2afbf21e9a66ee4b08 9f075e181ef257b4b5b4b4cac3c0870af97110ec provider RED
747cd1f76ca9fc5e32d23718a094ce24e32b09f0 bf00a4b144b8e6643cc61f874412d675d43d6a6b 34f211d8ab7a1537d6137731aa4ccc6de007de3c provider GREEN
6f3b16bea1db6561ffd3bef87691009e1764f97f 4d7792747140ccdbc42a7b5f6da025f8f77d2ee8 747cd1f76ca9fc5e32d23718a094ce24e32b09f0 coordination RED
632218a575a56db5c3b7d803b601c0486756c2a7 ba121c1b93919052c0fe05be6c71d27d77e9d8ae 6f3b16bea1db6561ffd3bef87691009e1764f97f coordination GREEN
d02bf4ec3423b4876c91f89b39a473d47d005db5 197a868ad958d1557d97e1536b4fd4facfde3918 632218a575a56db5c3b7d803b601c0486756c2a7 authority RED
3d9df4308545b3be7219e20b4058d5948864367a baa4126da92e9fc5e141261dd13655cfeac8ccd3 d02bf4ec3423b4876c91f89b39a473d47d005db5 authority RED correction
85c8115e257bd2557d2186c9dba3e732b2598e10 6e2fdce3efb8b95cbc4bf4daf9d8c8ded32cbd90 3d9df4308545b3be7219e20b4058d5948864367a authority GREEN
af8e0c94065cd60e02cef17ecbfb02e0c14bc57a 16a8ee4400dd89feb2e2f8643bd2ed092e4fa352 85c8115e257bd2557d2186c9dba3e732b2598e10 composition RED
a2c0e2dd44c38e44eccd4e859b80feb2fae26104 49916f2cea845b036909a755cad67cba7a8e49b4 af8e0c94065cd60e02cef17ecbfb02e0c14bc57a composition GREEN
86240addb01ae03d56e9e0202aa9e1ac25f2e54e 2d976cb605e2c04005c289608e7582f22556c614 a2c0e2dd44c38e44eccd4e859b80feb2fae26104 review request
d52318b35a3800740657d5b63d853915338c034d cc81d1261ab7ab75a6831fc5f3ee410ad1d94904 86240addb01ae03d56e9e0202aa9e1ac25f2e54e independent KO result
```

### Trial 2

```text
4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e f8d23fcf67f9fcae54c6decab46fbb930c92c9ba d52318b35a3800740657d5b63d853915338c034d format correction
24218eada09c0dbeab41c220b4021ff92efdb9ba 40e654c510f1d29fe589336ee2897d03a53c9dd9 4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e review request
095ca221b9e24abf3d96604b331aaccde7ccea94 0d4d18e7a291701c18326e3e32868bf9279ca1be 24218eada09c0dbeab41c220b4021ff92efdb9ba independent KO result
```

### Trial 3

```text
91dbdfe605f6410b3fe38cb9eb4b4a7927a07f02 5e63598fe16b2a237852ea0f58f8f4c1115ba715 095ca221b9e24abf3d96604b331aaccde7ccea94 RED
7e1a606d7756dfae4ab3f7bf6ff996e80ae7cd76 d208b1fe7a6e6cf29b7bac302a705b95dc9cad67 91dbdfe605f6410b3fe38cb9eb4b4a7927a07f02 GREEN
2f54ab25de9f5057124c3f081822c430a69fd6ea 36c0a5e8686d071a0c90b2aeafdc93555144b80c 7e1a606d7756dfae4ab3f7bf6ff996e80ae7cd76 review request
37d18920aeaa7fa0341d389799dc73b835eaec9a 231d4c3889b535e68b4befc11319cbc5f9a7b898 2f54ab25de9f5057124c3f081822c430a69fd6ea inventory overlay
9cc7cd4f4c2c08bfdc3b93530680ea2e3cce4536 9609e3df5315da66d33ac2be974af37636ecd288 37d18920aeaa7fa0341d389799dc73b835eaec9a independent reviewed_OK result
8c39fbec49b025480b71f8149b4c1e3f192166e0 ac2e132def1b192c5175db4429e3ac0a597388aa 9cc7cd4f4c2c08bfdc3b93530680ea2e3cce4536 index head
```

Trial 3's independent result remains authoritative only for that narrow
historical correction. Its canonical prior full-gate status was
`infrastructure_unavailable`: `2363 passed`, `0 failed`, `12 unavailable`.
It must not be relabeled green.

## Candidate range and deferred merge

The reviewed net range `9f075e...8c39fb...` contained exactly the 19 paths
listed under the first-parent pathset below and no others. The worktree began
tracked-clean at `8c39fb...`, with only `gateway/node_modules` untracked. The
integration branch was created from exact `2e368b...`, then the immutable hash
was merged with commit deferred:

```text
git merge --no-ff --no-commit 8c39fbec49b025480b71f8149b4c1e3f192166e0
```

Before resolution, Git automatically staged these 18 paths:

```text
cli/src/agents_cli/doctor.py
cli/src/agents_cli/doctor_probes.py
docs/doctor.md
gateway/src/coordination.js
plan/PROJECT_V5/reviews/README.md
plan/reviews/PROJECT_V5/H_0_1_PROBES-1_result.md
plan/reviews/PROJECT_V5/H_0_1_PROBES-1_to_review.md
plan/reviews/PROJECT_V5/H_0_1_PROBES-2_result.md
plan/reviews/PROJECT_V5/H_0_1_PROBES-2_to_review.md
plan/reviews/PROJECT_V5/H_0_1_PROBES-3_result.md
plan/reviews/PROJECT_V5/H_0_1_PROBES-3_to_review.md
schemas/doctor-result-v1.schema.json
tests/cli/test_doctor.py
tests/cli/test_doctor_authority_probes.py
tests/cli/test_doctor_coordination_probes.py
tests/cli/test_doctor_probe_composition.py
tests/cli/test_doctor_provider_probes.py
tests/gateway/doctor_coordination_probe.test.js
```

The only unresolved path was `ci/suites.json`. Its index stages were:

```text
base   a03baf112271222cfd08b07f9023b2d1c7fe79ad
ours   c040d144c1efcc51438d2e36fce87e6024464f26
theirs 536320e213d441578adc184ffc50ad49956b8bdd
```

The conflict was one line: `test.gateway.inventorySha256`. Main had the digest
for its newer gateway tests; the reviewed branch had the digest for its Doctor
bridge test. Neither parent digest described the union. The conflict markers
were removed with `apply_patch`, then `scripts/ci_gate.py
--refresh-inventory` computed the union digest.

The two known semantic overlaps, `doctor.py` and `test_doctor.py`, produced no
textual conflict. This was authenticated, not assumed: their exact-main blobs
equal their merge-base blobs:

```text
cli/src/agents_cli/doctor.py
  main/base 7b4c178411b93cbcf6d3a32ba82ce4ba66861a54
tests/cli/test_doctor.py
  main/base 5c3b8e8b6675344cdde1397f2d4259960ed15056
```

Therefore Git applied the reviewed PROBES additions directly on top of the
already integrated Trial 13 bytes. The resulting overlap blobs equal the
reviewed branch (`aec7f905...` and `62392879...`). No new behavior, refactor,
or hidden RED/GREEN correction was introduced. The complete Doctor inventory
and the exact Trial 13 lifecycle selection below are the runtime regression
proof.

## Integration commit and first-parent pathset

```text
commit  6fecc59ed9d18eed31b20c8185b5f250a37a777b
tree    6c0f5e5280dd2cb045897431b223922da0eeebcf
parents 2e368b1f81db35bc41f7dfe1759e6b077e15b281
        8c39fbec49b025480b71f8149b4c1e3f192166e0
subject merge(v5): integrate H/0/01 PROBES candidate
```

The exact first-parent pathset is:

```text
M ci/suites.json
M cli/src/agents_cli/doctor.py
A cli/src/agents_cli/doctor_probes.py
M docs/doctor.md
M gateway/src/coordination.js
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-1_result.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-1_to_review.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-2_result.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-2_to_review.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-3_result.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-3_to_review.md
M schemas/doctor-result-v1.schema.json
M tests/cli/test_doctor.py
A tests/cli/test_doctor_authority_probes.py
A tests/cli/test_doctor_coordination_probes.py
A tests/cli/test_doctor_probe_composition.py
A tests/cli/test_doctor_provider_probes.py
A tests/gateway/doctor_coordination_probe.test.js
```

The pathset guard reported `19` expected, `19` actual, zero extras, and zero
protected/dependency/lock/workflow hits.

## Reviewed-byte and evidence authentication

Every source/test/schema/docs path other than the intentionally refreshed CI
manifest and unioned review index is byte-identical to reviewed head
`8c39fb...`. This includes both automatically resolved semantic-overlap files.

| Path | Integration/reviewed blob |
|---|---|
| `cli/src/agents_cli/doctor.py` | `aec7f9057f7ae414c3d3103dff4b7408f9c7ff28` |
| `cli/src/agents_cli/doctor_probes.py` | `b66f5fa75131772ef171d25d7e679ef737765b21` |
| `docs/doctor.md` | `552de94cd1df3fae052d0dcdd6a698b210835648` |
| `gateway/src/coordination.js` | `f70c158c90adcef1020b800d7cbaccd0760b386c` |
| `schemas/doctor-result-v1.schema.json` | `20f611fa67e54b70ec25111a293a6463d9ba7265` |
| `tests/cli/test_doctor.py` | `6239287946e6c72fac6c26da5caeacb845a3dfcf` |
| `tests/cli/test_doctor_authority_probes.py` | `eedadbaa6df1fb205feb79ea7e67532979119dfa` |
| `tests/cli/test_doctor_coordination_probes.py` | `ed75ca10febd614cfac99c7e902b26c0ad08787c` |
| `tests/cli/test_doctor_probe_composition.py` | `6a311a8149ef6dc6efeb5cf28a7e7ca26c66acfb` |
| `tests/cli/test_doctor_provider_probes.py` | `e6adc06f6cfd9d32726f3bfe16e5bb12652f5c39` |
| `tests/gateway/doctor_coordination_probe.test.js` | `f8d87ca08d563e1e04c131bff184659cef7eab87` |

Every prior request/result artifact is also byte-identical:

| Immutable artifact | Integration/reviewed blob |
|---|---|
| `H_0_1_PROBES-1_result.md` | `ec12c11e14b4c4c496cc7a5745c11e468662d78b` |
| `H_0_1_PROBES-1_to_review.md` | `2805742e04eb215ef7ca3ff270265312aff83458` |
| `H_0_1_PROBES-2_result.md` | `f9103ef906a50d53a9d8fb03b6d4175660f1adca` |
| `H_0_1_PROBES-2_to_review.md` | `fa87fb4c0bca927086908f66b9790e3661855037` |
| `H_0_1_PROBES-3_result.md` | `a08b3cff021f30609e8bfaa8dfbf36c54b14d05d` |
| `H_0_1_PROBES-3_to_review.md` | `f237bc52ecada557a72a712c634a51f28cbe97b7` |

The integration CI blob is
`264877c9e554e8c96669446e52ea6bbc34b9a3e2`. The integration review-index
blob, before this Trial 4 row, is
`40576599ef68ddc4b8f2f590fa0fc793cd97a4d9`; its first-parent diff added only
the three historical PROBES Trial 1-3 rows while retaining all main rows.

## Deterministic inventory refresh

The actual `scripts/ci_gate.py` algorithm is:

```python
payload = "\n".join(sorted(paths)).encode("utf-8")
"sha256:" + hashlib.sha256(payload).hexdigest()
```

`discover_files` applies each suite's include globs, filters its excludes, and
sorts the path set. `--refresh-inventory` changed only the three values made
stale by the added reviewed files:

| Suite | Exact main value | Integrated value |
|---|---|---|
| `lint.python` | `sha256:13f8d5ce6eb8d7d3532cdd954321cbe374122f05039a398c0a8f34045fc45376` | `sha256:2b3b68c399e090ba49de62adf111331db077249f3efaac37f89a1ef8df89fd43` |
| `test.gateway` | `sha256:b19fd095f6f4fe6f5a4b8d6fb854286302169242b236ddf68a0bcd2c6d8c1a55` | `sha256:22de7706fd67ceb8ceb0f6ed9cef2d9b01d62f4a627929dc5c5a6f3a1aece401` |
| `test.cli` | `sha256:53068934504f8b8d10cf117d7150ec35bc035c39554b37698941ff5558ebf2a5` | `sha256:73d29da027f9ee1d7c40220ae87649d10367b97bc1318ce40dffa5549814d5ed` |

The refresh returned `status=passed`, zero errors, in `0.06s` wall time.
Pre-commit validation returned the same status in `0.05s`; post-commit
`--validate-only` returned the same status with zero stale inventories in
`0.07s`.

## Process isolation before verification

Before proportional gates, process polling found two long-lived C/0/03 Codex
sessions, but `pgrep -a -P` returned exit 1 for each (no child process), and:

```text
pgrep -af 'agents-orchestrator.*contract|contract.*agents-orchestrator'
exit 1
```

Thus no active agents-orchestrator C/0/03 contract command was running when
these gates began. Nothing was killed, signalled, or otherwise disturbed.

## Proportional verification

Toolchain:

```text
Python 3.11.15
pytest 9.1.1
Ruff 0.16.0
Node v22.22.1
isolated exact-lock ESLint v10.8.0
```

All Python commands used `PYTHONDONTWRITEBYTECODE=1`, `PYTHONPATH=cli/src`,
and `-p no:cacheprovider` where pytest was invoked.

### Complete Doctor/PROBES/sample inventory

```text
env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  .venv/bin/python -m pytest -p no:cacheprovider -q -rs \
  tests/cli/test_doctor.py \
  tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_probe_composition.py \
  tests/structure/test_h001_sample.py \
  tests/structure/test_h001_bootstrap.py
```

Result: `503 passed`, `0 failed`, `0 skipped` in pytest `95.12s` (wall
`95.55s`). Collection authenticated the exact file totals:

```text
313 tests/cli/test_doctor.py
 28 tests/cli/test_doctor_provider_probes.py
 19 tests/cli/test_doctor_coordination_probes.py
 23 tests/cli/test_doctor_authority_probes.py
  1 tests/cli/test_doctor_probe_composition.py
  5 tests/structure/test_h001_sample.py
114 tests/structure/test_h001_bootstrap.py
503 total
```

The exact DOCTOR Trial 13 retirement/lifecycle selector from its immutable
request passed `21`, failed `0`, skipped `0`, with `292 deselected` in pytest
`2.52s` (wall `3.04s`). This explicitly covers the narrowed retirement
criterion plus preserved callback, stale-record, retention, lifecycle, and
displaced-value cases.

```text
env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  .venv/bin/python -m pytest -p no:cacheprovider -q -rs \
  tests/cli/test_doctor.py \
  -k 'descriptor_mutation_releases_previous_probe_before_finalizer_waits or
      every_discovered_retirement_callback_has_no_writable_standard_state or
      scalar_callback_rewrite_cannot_leave_a_stale_issuance_record or
      callback_self_cycle_cannot_retain_a_binding_or_probe_capability or
      callback_call_function_state_cannot_retain_binding_and_probe or
      dto_lifecycle_function_state_cannot_retain_binding_and_probe or
      retirement_specific_surfaces_expose_no_python_function_state or
      manual_dto_lifecycle_invocation_cannot_remove_live_exact_record'
```

The Trial 3 hostile-key matrix plus the all-six-probe composition path passed
`5`, failed `0`, skipped `0`, with `24 deselected` in pytest `0.91s` (wall
`1.37s`). The four hostile cases cover ordinary-exception fail-closed behavior
and exact `BaseException` propagation through both provider and composed
public factories; the fifth case exercises the six-probe composition.

```text
env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  .venv/bin/python -m pytest -p no:cacheprovider -q -rs \
  tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_probe_composition.py \
  -k 'hostile_provider_key_lookup or six_probe_factories'
```

Schema/render/projection selection over `test_doctor.py` and
`test_h001_sample.py`: `34 passed`, `0 failed`, `0 skipped`, `284 deselected`
in pytest `13.77s` (wall `14.30s`). Leak/secret-canary selection over the same
files: `13 passed`, `0 failed`, `0 skipped`, `305 deselected` in pytest
`0.72s` (wall `1.23s`).

```text
# schema/render/projection
env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  .venv/bin/python -m pytest -p no:cacheprovider -q -rs \
  tests/cli/test_doctor.py tests/structure/test_h001_sample.py \
  -k 'schema or render or projection'

# leak/secret canaries
env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  .venv/bin/python -m pytest -p no:cacheprovider -q -rs \
  tests/cli/test_doctor.py tests/structure/test_h001_sample.py \
  -k 'leak or secret_canaries'
```

### Gateway bridge and JavaScript static checks

An initial test-runner invocation:

```text
node --test --test-concurrency=1 tests/gateway/doctor_coordination_probe.test.js
```

returned exit 0 but collapsed the file into one passing wrapper (`1 pass`,
`0 fail`, `0 skipped`, Node duration `230.15ms`, wall `0.32s`). It was rerun
directly for granular reporting: all `10` named bridge tests passed with zero
failures/skips (Node duration `21.46ms`, wall `0.24s`).

```text
node tests/gateway/doctor_coordination_probe.test.js
```

Because the preserved untracked dependency symlink had drifted as described
below, the authoritative bridge replay was also executed from an isolated
offline install of this candidate's exact lock. Exact copies of the complete
`gateway/src` tree and bridge test were authenticated (`diff -qr` exit 0 and
test SHA-256 equality). It again produced `10 passed`, `0 failed`, `0 skipped`
(Node duration `25.34ms`, wall `0.24s`). No live Redis or network path ran.

`node --check` passed for both changed JS files: `coordination.js` in `0.06s`
and its bridge test in `0.09s`. Their exact copied bytes passed ESLint 10.8.0
in `0.33s`.

### Python/static/schema/inventory checks

```text
ruff check \
  cli/src/agents_cli/doctor.py \
  cli/src/agents_cli/doctor_probes.py \
  tests/cli/test_doctor.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_probe_composition.py \
  tests/cli/test_doctor_provider_probes.py
  All checks passed; wall 0.01s
ruff format --check \
  cli/src/agents_cli/doctor.py \
  cli/src/agents_cli/doctor_probes.py \
  tests/cli/test_doctor.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_probe_composition.py \
  tests/cli/test_doctor_provider_probes.py
  7 files already formatted; wall 0.01s
in-memory compile(the same seven paths)
  compiled=7, bytecode=0; wall 0.04s
scripts/ci_gate.py --validate-only
  status=passed, errors=[], zero stale inventories; wall 0.07s
JSON parse ci/suites.json + schemas/doctor-result-v1.schema.json
Draft202012Validator.check_schema(doctor schema)
  parsed_json=2, suites=13, schema_valid=1; wall 0.11s
```

## Failures, retries, warnings, and environment facts

Nothing is omitted from the command history:

1. The canonical `npm --prefix gateway run lint` attempt failed with exit 2
   in `0.47s`. The preserved symlink target lacked local ESLint, so npm fell
   through to global ESLint 6.4.0, which cannot load the ESM flat config.
2. Recovery used a fresh `/tmp/h001-probes-eslint.556XVz` verification tree.
   `npm ci --offline --ignore-scripts --no-audit --no-fund` consumed this
   candidate's exact `gateway/package-lock.json`, added 197 packages in
   `0.834s` (wall `1.09s`), and made no repository change. It emitted three
   sandbox `Failed to create stream fd: Operation not permitted` warnings and
   one upstream `prebuild-install` deprecation warning but exited 0. The same
   stream-fd warning appeared on the successful isolated ESLint/Node commands.
3. The first JSON/schema one-liner failed before reading either file (exit 1,
   wall `0.01s`) because its reporting f-string contained shell-escaped quotes.
   The corrected non-f-string invocation is the successful `parsed_json=2`
   result above.
4. The first Node command was successful but reported only a file wrapper;
   the direct and exact-lock reruns supplied the required 10-test totals.
5. There were no pytest failures, skips, xfails, retries, races, or unavailable
   cases in the proportional test commands.

The preserved untracked symlink is:

```text
gateway/node_modules -> /home/carase/git/personal/agents-orchestrator/gateway/node_modules
```

It was never staged, edited, or repointed. Its target now has a different
package-lock hash from the frozen candidate:

```text
candidate gateway/package-lock.json 71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0
target    gateway/package-lock.json 824886ba7012c266370088117d435d0ef89000c57e845bc23d72d06c8d835088
```

Accordingly, no exact-lock claim is made for commands that resolved through
that symlink. The isolated offline replay is the exact-lock evidence. Native
install scripts were deliberately disabled and no native/live dependency path
was exercised.

## Git and protected-path guards

All of these guards passed after the integration commit:

- exact commit/tree/two-parent/subject authentication;
- exact 19-path first-parent allowlist (`19 expected == 19 actual`);
- main and reviewed-head ancestor checks;
- historical reviewed head remains not-an-ancestor of exact main;
- all 17 non-inventory/non-index reviewed blobs equal `8c39fb...`;
- all six prior request/result blobs equal `8c39fb...`;
- zero policy, dependency, lockfile, or workflow paths in the first-parent
  diff;
- `git diff --check` and `git diff HEAD^1 HEAD --check` clean;
- index and tracked worktree clean; and
- no Trial 4 request/result existed before request creation, and no Trial 4
  result exists now.

## Explicit limitations and pending work

- Full `scripts/ci.sh` was not run; it is orchestrator-owned and must run
  alone. Full CI and independent adjudication are pending.
- The prior canonical full-gate status remains `infrastructure_unavailable`
  (`2363 passed`, `0 failed`, `12 unavailable`), not green.
- This integration verification used Python 3.11.15 only; no Python 3.13
  replay was run.
- No real provider, Redis, PostgreSQL, Gateway/MCP, Temporal, Docker, network,
  promotion, release, publication, tag, or push operation was run or inferred.
- Provider, coordination, and authority tests used closed fakes/static
  snapshots; they do not establish live-service availability.
- The candidate is bound to exact main `2e368b...`; it does not claim to be
  integrated into any moving branch or later main commit.
- H/0/01 status, plan/status files, policies, dependencies, locks, workflows,
  main, tags, promotion, and release state were not changed.

## Required reviewer checks

The fresh reviewer should independently:

1. authenticate every anchor, parent, subject, tree, range, and pathset;
2. prove the only actual conflict was the CI inventory line and independently
   recompute all suite inventories from the frozen integration tree;
3. verify every prior evidence artifact and untouched reviewed path against
   `8c39fb...` by blob identity;
4. inspect both overlap histories and prove all DOCTOR Trial 13 behavior and
   tests survive alongside the complete reviewed PROBES behavior;
5. rerun the exact Trial 13 21-case selection and complete Doctor inventory;
6. independently reproduce the Trial 3 hostile exact-dict collision matrix,
   including ordinary `Exception` fail-closed behavior, unchanged
   `BaseException` propagation, both factories, two static observations, and
   zero runner calls;
7. exercise all six-probe composition, schema/golden/render/leak contracts,
   and the Gateway Doctor bridge without inferring live-service success;
8. account for the failed canonical ESLint attempt and validate changed JS
   against the candidate's exact lock rather than the drifting symlink target;
9. confirm the request commit changes only this request and one pending index
   row and that no Trial 4 result pre-exists; and
10. write only the lane-native verdict path in a new independent
    Codex/Sol/max/priority trace, session, and worktree.
