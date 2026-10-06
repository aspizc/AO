# Independent Review Result — Project V5 G/0/02 STORE-BINDING Trial 4 Integration

## Verdict

**reviewed_KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

The frozen merge candidate is mechanically well formed: its tree, parent
order, ancestries, 11-path first-parent scope, 21-path second-parent scope,
combined diff, preserved blobs, review-index union, generated CI inventory,
and focused/proportional behavior all independently match the repository.

Trial 4 is nevertheless rejected because its immutable request makes one
false Git-custody claim. It assigns tree
`8b9e8a9c7504ddf8385d167ed54eae2aa1120399` to Trial 3 request commit
`45ca68c80fe441ee8e91959dde37f831f3afc7d8`. Git derives tree
`8b9e8a9c5193a32a821e8c19cdd44e3904c28a0f`, while the claimed object does
not exist. Exact object identity is the subject of this integration review,
so the inaccurate authenticated-custody record is a concrete blocking P2.

This result reviews only Trial 4's frozen integration request and candidate.
It does not reject or reopen the independently accepted Trial 3 product
semantics. It does not integrate to `main`, complete G/0/02, promote, tag,
publish, release, or establish production support.

## Reviewer identity and independence

- Role: fresh independent reviewer; no candidate source, test, request, or
  prior evidence was authored by this session.
- Agent/model: Codex / `gpt-5.6-sol`; reasoning effort `max`; service tier
  `priority`.
- Trace: `tr-60ebb326-27af-41b1-b888-5e37ef46ba94`.
- Task: `ts-6a2b5cd9-cab7-4ae2-a0fd-759806aab497`.
- Branch: `review/V5-G-0-02-binding-t4-sol`.
- Evidence collection and verdict were not delegated.

## Governing material read

The review read the complete enclosing `AGENTS.md`, canonical orchestration
profile, build/reviewer/TDD instructions, `plan/README.md`, Stage G README,
G/0/02 sheet, all 321 lines of the Trial 3 request, all 383 lines of the
Trial 3 result, and all 377 lines of the Trial 4 request. Discovery remained
bounded to the integration scope and the preserved Trial 3 change.

## Independently authenticated Git objects

All identities below came from Git rather than request prose.

| Role | Commit | Tree | Parent(s), in order |
|---|---|---|---|
| Trial 4 request / review HEAD | `baeecae2b402081091d3513b4a57a826b9c03735` | `8c2011859f0d41f7feefe892f50d15eee7adf147` | `51b0c0de69a568daf47773046895a5840a3128df` |
| Frozen merge candidate | `51b0c0de69a568daf47773046895a5840a3128df` | `be46f33ad48852eb721c93e08c83d8562fdf80bf` | `81bb05ec09f8d8c64027d1106e81f834d96b7742`, then `76317eb812083d5b83e4ae34d315c026f3e3fd3b` |
| Current-main parent | `81bb05ec09f8d8c64027d1106e81f834d96b7742` | `013091ad72ec7386ed344758f74d053bec098a73` | `3615aeb26bf0f83a417c13b189f12ec3025579e0` |
| Reviewed STORE-BINDING parent | `76317eb812083d5b83e4ae34d315c026f3e3fd3b` | `01a55dba2a1fc1d10de92d4d3e1a264fc4e3257e` | `45ca68c80fe441ee8e91959dde37f831f3afc7d8` |
| Merge base | `f904a2884f19fe5a9aafa9af58b3070a0b29059c` | `ac582da210e0f2ac722a4c6b6077090d1310eb60` | `485a499c78c8df304ffff07a6c745751b831758e` |
| Trial 3 request | `45ca68c80fe441ee8e91959dde37f831f3afc7d8` | `8b9e8a9c5193a32a821e8c19cdd44e3904c28a0f` | `63ba3e1ca9783f7f76d32bcfd14dc041a92cb22e` |
| Trial 3 GREEN | `63ba3e1ca9783f7f76d32bcfd14dc041a92cb22e` | `970ef365ce940e7045986b13bc20f32f3da1ec1c` | `1146c14f0eeb26a8a37005f8f4b4efe064c20e9b` |

The request subject is
`docs(review): request G_0_2 STORE-BINDING Trial 4 integration review`; the
merge subject is `merge(v5): integrate G/0/02 STORE-BINDING candidate`.

`git merge-base --all 81bb05ec09f8d8c64027d1106e81f834d96b7742
76317eb812083d5b83e4ae34d315c026f3e3fd3b` returned exact base
`f904a2884f19fe5a9aafa9af58b3070a0b29059c`. Each of these commands exited
`0` with no output:

```text
git merge-base --is-ancestor f904a2884f19fe5a9aafa9af58b3070a0b29059c 81bb05ec09f8d8c64027d1106e81f834d96b7742
git merge-base --is-ancestor f904a2884f19fe5a9aafa9af58b3070a0b29059c 76317eb812083d5b83e4ae34d315c026f3e3fd3b
git merge-base --is-ancestor 81bb05ec09f8d8c64027d1106e81f834d96b7742 51b0c0de69a568daf47773046895a5840a3128df
git merge-base --is-ancestor 76317eb812083d5b83e4ae34d315c026f3e3fd3b 51b0c0de69a568daf47773046895a5840a3128df
git merge-base --is-ancestor 51b0c0de69a568daf47773046895a5840a3128df baeecae2b402081091d3513b4a57a826b9c03735
```

`git ls-files -u` exited `0` with no output: there are no unmerged index
entries.

### Request pathset

`git diff-tree --no-commit-id --name-status -r HEAD^ HEAD` returned exactly:

```text
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-4_to_review.md
```

The index diff adds exactly one pending Trial 4 row and deletes nothing.

### First-parent pathset

`git diff --name-status 81bb05ec09f8d8c64027d1106e81f834d96b7742
51b0c0de69a568daf47773046895a5840a3128df` returned exactly 11 paths:

```text
M ci/suites.json
A gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js
M gateway/src/core/coordination_consumer_runtime_test_profile.js
M plan/PROJECT_V5/reviews/README.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_result.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_to_review.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_result.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_to_review.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-3_result.md
A plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-3_to_review.md
A tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

`git diff --shortstat` reported 11 files, 4,565 insertions, and 2 deletions.

### Second-parent pathset

`git diff --name-status 76317eb812083d5b83e4ae34d315c026f3e3fd3b
51b0c0de69a568daf47773046895a5840a3128df` returned exactly 21 paths:

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
A plan/reviews/PROJECT_V5/H_0_1_PROBES-4_result.md
A plan/reviews/PROJECT_V5/H_0_1_PROBES-4_to_review.md
M schemas/doctor-result-v1.schema.json
M tests/cli/test_doctor.py
A tests/cli/test_doctor_authority_probes.py
A tests/cli/test_doctor_coordination_probes.py
A tests/cli/test_doctor_probe_composition.py
A tests/cli/test_doctor_provider_probes.py
A tests/gateway/doctor_coordination_probe.test.js
```

The combined diff is exactly:

```text
MM ci/suites.json
MM plan/PROJECT_V5/reviews/README.md
```

## Byte preservation and review-index union

The following exact byte-preservation command exited `0`; candidate and
reviewed-parent `git ls-tree` output agreed on every blob:

```text
git diff --quiet 76317eb812083d5b83e4ae34d315c026f3e3fd3b 51b0c0de69a568daf47773046895a5840a3128df -- gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js gateway/src/core/coordination_consumer_runtime_test_profile.js tests/gateway/coordination_consumer_epoch_store_binding.test.js plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_result.md plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-1_to_review.md plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_result.md plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-2_to_review.md plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-3_result.md plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-3_to_review.md
```

| Preserved path | Git blob | SHA-256 where applicable |
|---|---|---|
| `gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js` | `a76cc1c6022835ca4a9d291fe2bbd5ba6396f521` | `c65e7a6ccf969b2dcac0c21577af3998ca553310652f935aa2264617abf690f5` |
| `gateway/src/core/coordination_consumer_runtime_test_profile.js` | `24be1a2b34c6e85c99a6a4a08e4b0795cea17051` | `3048b606ce76b38ece3648c3bdbb2f6f442d61923a11f524733cf198cc2cb2aa` |
| `tests/gateway/coordination_consumer_epoch_store_binding.test.js` | `60b966abfdb2ffe74505c1913f00d9b2487fd92b` | `985d3b7f27317a4fb24c35753f71ccf206d7455b0f20bb7184d2740b7407dc7f` |
| Trial 1 result | `641e9421aaa68a1d84eb5230a602e8bed6d8ebdb` | — |
| Trial 1 request | `366d8c82c245f6e562736e23ee63e7d8b24012a9` | — |
| Trial 2 result | `6242f9bc24fac547fb261c8ad8f0b2080c688962` | — |
| Trial 2 request | `419de75383a4a818d0daa52a2211e489740aef1c` | — |
| Trial 3 result | `2460a919dd6b820dca47159d83a9a427d6cd16ca` | — |
| Trial 3 request | `196e3484b37a0fd73bd80af0fc87809d9e09163a` | — |

The exact current-main preservation command also exited `0`:

```text
git diff --quiet 81bb05ec09f8d8c64027d1106e81f834d96b7742 51b0c0de69a568daf47773046895a5840a3128df -- cli/src/agents_cli/doctor.py cli/src/agents_cli/doctor_probes.py docs/doctor.md gateway/src/coordination.js plan/reviews/PROJECT_V5/H_0_1_PROBES-1_result.md plan/reviews/PROJECT_V5/H_0_1_PROBES-1_to_review.md plan/reviews/PROJECT_V5/H_0_1_PROBES-2_result.md plan/reviews/PROJECT_V5/H_0_1_PROBES-2_to_review.md plan/reviews/PROJECT_V5/H_0_1_PROBES-3_result.md plan/reviews/PROJECT_V5/H_0_1_PROBES-3_to_review.md plan/reviews/PROJECT_V5/H_0_1_PROBES-4_result.md plan/reviews/PROJECT_V5/H_0_1_PROBES-4_to_review.md schemas/doctor-result-v1.schema.json tests/cli/test_doctor.py tests/cli/test_doctor_authority_probes.py tests/cli/test_doctor_coordination_probes.py tests/cli/test_doctor_probe_composition.py tests/cli/test_doctor_provider_probes.py tests/gateway/doctor_coordination_probe.test.js
```

The merge's review-index blob is
`e83f6ccd031fd44bfb985c06328353edc2a2724f`, SHA-256
`2cecebcf8bd6ff3cdc795728ba56408a8534a7c2949fb106a87f488f602d1bbd`.
Its first-parent diff adds exactly the three STORE-BINDING Trial 1-3 rows;
its second-parent diff adds exactly the four H/0/01 PROBES Trial 1-4 rows.
Neither diff deletes a row. The request child adds only the pending Trial 4
row.

## CI inventory regeneration and JSON validation

The exact candidate was archived to disposable root
`/tmp/g002-binding-t4-review.FAzdHZ`. No candidate path was modified.

```text
git archive 51b0c0de69a568daf47773046895a5840a3128df | tar -x -C /tmp/g002-binding-t4-review.FAzdHZ
python3 /tmp/g002-binding-t4-review.FAzdHZ/scripts/ci_gate.py --repo-root /tmp/g002-binding-t4-review.FAzdHZ --refresh-inventory
python3 /tmp/g002-binding-t4-review.FAzdHZ/scripts/ci_gate.py --repo-root /tmp/g002-binding-t4-review.FAzdHZ --refresh-inventory
python3 /tmp/g002-binding-t4-review.FAzdHZ/scripts/ci_gate.py --repo-root /tmp/g002-binding-t4-review.FAzdHZ --validate-only
python3 scripts/ci_gate.py --repo-root . --validate-only
```

`ci/suites.json` SHA-256 was
`444e3310a0455c1e01aeef4a207c57ec955ccd0465ad5bb581b7ecd10cdfe2d0`
before refresh, after the first refresh, and after the second refresh. This
matches candidate blob `18b8e41d2b410f9d97ee6dca0f0511586d86f30b` and proves byte-level
idempotence. Both validation commands exited `0` with:

```json
{"counts":{"failed":0,"passed":0,"skipped":0,"tests":0},"errors":[],"schemaVersion":1,"status":"passed","suites":[]}
```

The regenerated union contains:

```text
lint.gateway inventorySha256 sha256:854bc480c875e835c81de3b1a0f7e0865f01304c7f570a2a6ec56b69db2e7cd4
test.gateway inventorySha256 sha256:f6bf19a001a01341c9dad63ab55f21bfd7b68571565b061f42b4a0e097f3922e
```

Parent manifest blobs are `264877c9e554e8c96669446e52ea6bbc34b9a3e2`
and `c040d144c1efcc51438d2e36fce87e6024464f26`. The candidate contract,
both parents' contracts, and the request contract share blob
`7dc1d29de072d344ab0933879a7492a953bcf78e`. `python3 -m json.tool`
parsed both `ci/suites.json` and `ci/suites-contract.json` in the worktree and
the disposable copy with exit `0`.

## Serial semantic verification

Commands ran one after the other, always with explicit concurrency 1.

| Exact command | Exit and terminal TAP counters | Duration |
|---|---|---:|
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_store_binding.test.js` | exit 0; 54 tests, 54 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo | 1662.795136 ms |
| `node --test --test-concurrency=1 tests/gateway/coordination_consumer_epoch_migrations.test.js tests/gateway/coordination_consumer_runtime.test.js tests/gateway/coordination_consumer_store_ownership.test.js` | exit 0; 76 tests, 76 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo | 15174.620209 ms |

Combined: 130 tests, 130 passed, 0 failed, 0 cancelled, 0 skipped, and
0 todo. The TAP output contained no stream-fd warning.

## Preserved Trial 3 semantics

The reviewer inspected the exact RED and GREEN diffs rather than relying on
the request summary. Trial 3's sole product change wraps the exact bound
readback after a committed bind reply is lost and calls the existing
`latchFault(error)` boundary if that readback also fails. The frozen tests
execute the submitted Lua against disposable Redis, discard bind/read replies
only after execution, prove ordinal 1 remains exactly bound, prove the counter
stays at 1 and ordinal 2 is absent, and prove later create/admit calls perform
no Redis work. Separate actual-Lua witnesses cover positive authority expiry
before bind/read and same-length bound-record corruption.

The merge candidate preserves the reviewed source and test blobs exactly, the
54-test lane passes, and the proportional migration/runtime/ownership lane
passes. Therefore the merge did not alter Trial 3's reviewed semantics.

## Syntax, lint, diff, ancestry, and protected-path guards

- `node --check` separately passed the binding source, runtime-profile
  re-export, and focused test: three exits `0`, no diagnostics.
- These exact whitespace commands exited `0` with no diagnostics:

  ```text
  git diff --check 81bb05ec09f8d8c64027d1106e81f834d96b7742 51b0c0de69a568daf47773046895a5840a3128df
  git diff --check 76317eb812083d5b83e4ae34d315c026f3e3fd3b 51b0c0de69a568daf47773046895a5840a3128df
  git diff --check 51b0c0de69a568daf47773046895a5840a3128df baeecae2b402081091d3513b4a57a826b9c03735
  git diff --check 81bb05ec09f8d8c64027d1106e81f834d96b7742 baeecae2b402081091d3513b4a57a826b9c03735
  git diff --check 76317eb812083d5b83e4ae34d315c026f3e3fd3b baeecae2b402081091d3513b4a57a826b9c03735
  ```
- `git diff --name-only 81bb05ec09f8d8c64027d1106e81f834d96b7742
  51b0c0de69a568daf47773046895a5840a3128df | wc -l` returned `11`;
  the equivalent command from
  `76317eb812083d5b83e4ae34d315c026f3e3fd3b` returned `21`.
- The first-parent pathset piped to
  `rg '^(policies/|\.github/workflows/|gateway/migrations/|gateway/package(-lock)?\.json$|requirements[^/]*$|pyproject\.toml$|gateway/src/.+production|gateway/src/.+public)'`
  returned exit `1`, the expected no-match result. There is no policy,
  workflow, dependency, lockfile, migration, production-profile, or public
  path in that scope.
- Parent order and ancestry checks are recorded above; every expected
  `merge-base --is-ancestor` returned exit `0`.

### ESLint attempts and environmental accounting

No unavailable or ignored ESLint attempt is represented as a pass:

1. The exact current-worktree command
   `gateway/node_modules/.bin/eslint --no-cache --config gateway/eslint.config.js <three paths>`
   exited `127`: that symlink target has no ESLint binary. This attempt is
   unavailable environment evidence.
2. Invoking the sibling repository-local ESLint binary directly against the
   current config exited `2` with `ERR_MODULE_NOT_FOUND` for `@eslint/js`,
   because config imports still resolved through the incomplete current
   symlink. This attempt is also unavailable environment evidence.
3. The first disposable-copy invocation used absolute candidate paths. It
   exited `0` but emitted three `File ignored because outside of base path`
   warnings. It inspected no file and is discarded, not passed evidence.
4. From the exact candidate archive as working directory, with its
   `gateway/node_modules` linked to the disclosed sibling cache, the relative
   repository-local command inspected all three files and exited `0` with no
   ESLint diagnostic. It emitted exactly three environmental lines:
   `Failed to create stream fd: Operation not permitted`. This is credited as
   zero ESLint findings, but not as clean-output evidence; the three host
   warnings remain explicit.

The successful lint command was:

```text
gateway/node_modules/.bin/eslint --no-cache --config gateway/eslint.config.js \
  gateway/src/core/coordination_consumer_epoch_store_binding_test_profile.js \
  gateway/src/core/coordination_consumer_runtime_test_profile.js \
  tests/gateway/coordination_consumer_epoch_store_binding.test.js
```

## Dependency-custody limitation

The review worktree's sole pre-existing untracked entry is:

```text
gateway/node_modules -> /home/carase/git/personal/agents-orchestrator/gateway/node_modules
```

Candidate `gateway/package-lock.json` SHA-256 is
`71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0`;
the current symlink target's adjacent lockfile is
`824886ba7012c266370088117d435d0ef89000c57e845bc23d72d06c8d835088`.
The semantic tests therefore used available repository-local dependencies,
but not a candidate-lock-authenticated installation.

The disposable lint used the disclosed sibling cache whose adjacent lockfile
hash is
`16fd3f43d3154dae064b31d0a4a0fae1a970e8b7edaea65aff11b0202f07418a`.
Its ESLint `10.8.0` and `@eslint/js` `10.0.1` versions match the exact versions
recorded in the candidate lock, but the installation as a whole is still not
authenticated to the candidate lock. No install, dependency edit, lockfile
edit, or network access was attempted.

## Finding

### P2-01 — Trial 4 asserts a nonexistent tree for the authenticated Trial 3 request commit

Evidence:

- `plan/reviews/PROJECT_V5/G_0_2_WIRING_B_EPOCH_CORE_BINDING-4_to_review.md:53`
  states tree `8b9e8a9c7504ddf8385d167ed54eae2aa1120399` for commit
  `45ca68c80fe441ee8e91959dde37f831f3afc7d8`.
- `git rev-parse 45ca68c80fe441ee8e91959dde37f831f3afc7d8^{tree}`
  exited `0` and returned
  `8b9e8a9c5193a32a821e8c19cdd44e3904c28a0f`.
- `git cat-file -t 8b9e8a9c7504ddf8385d167ed54eae2aa1120399`
  exited `128`: `fatal: git cat-file: could not get object info`.
- `git cat-file -t 8b9e8a9c5193a32a821e8c19cdd44e3904c28a0f`
  exited `0` and returned `tree`.

Impact: the candidate merge is independently recoverable and correct, but
the immutable Trial 4 custody narrative falsely labels a nonexistent object
as the exact tree of its reviewed lineage. That defect is material to an
integration-only review whose core acceptance condition is exact Git-object
authentication.

Required correction: do not edit or overwrite Trial 4. Create the next
immutable trial request that explicitly corrects the lineage forward: name
actual tree `8b9e8a9c5193a32a821e8c19cdd44e3904c28a0f`, identify the nonexistent
Trial 4 value, preserve this KO result, and re-request an independent review
of the same frozen merge only if no candidate bytes change. Any new request
must authenticate its own commit/tree/pathset from Git.

## Limitations and lifecycle non-claims

- Aggregate `bash scripts/ci.sh` was deliberately not run; the prompt assigns
  aggregate CI to the orchestrator. No aggregate lane is inferred.
- Shared Redis/PostgreSQL, Docker composition, live Gateway/MCP, cluster,
  replication/failover, persistence/restart, production support, promotion,
  rollout, tag/main equality, release, publication, and push were not run and
  are not claimed.
- The semantic lane uses disposable local Redis and the private test-profile
  STORE-BINDING foundation. It does not add or attest a public service/tool/
  MCP surface, production profile, health inventory, WIRING-B crash/reclaim,
  or G/0/02 completion.
- Skipped, cancelled, todo, and unavailable semantic test cases: zero.
  Unavailable/discarded ESLint attempts and the final stream-fd warnings are
  accounted for above and are not silently promoted into evidence.
- Before this result was written, tracked state was clean; only the disclosed
  untracked dependency symlink existed.

## Final disposition

The exact merge candidate's mechanical and behavioral checks pass, but the
immutable Trial 4 evidence contains one concrete false Git identity. Trial 4
is **reviewed_KO** with P0 `0`, P1 `0`, and P2 `1`.
