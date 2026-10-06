# Independent Review Result — Project V5 H/0/01 PROBES (Trial 4 integration)

## Verdict

reviewed_OK

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |

No P0, P1, or P2 finding was identified in the frozen Trial 4 review
boundary. The two-parent merge preserves the reviewed PROBES bytes and the
already integrated DOCTOR Trial 13 behavior. Its only manual merge resolution
is the deterministic union inventory digest in `ci/suites.json`.

This is a review state only. It is not H/0/01 completion, integration into a
moving `main`, a green full-CI claim, promotion, publication, tagging, or
release.

## Independent reviewer custody

- Trace:
  `tr-tr-v5-h001-probes-t4-sol-c2ae640f-9dab-4bef-85a0-3cb050d2e1fb`
- Task: `ts-a464111a-3437-4b42-8466-5de285730483`
- Review brief:
  `art-5d5eee0b-8540-417c-a65e-72e607eee7b8`
- Spawn-fallback governance:
  `art-65b145a7-a585-442e-8018-55409ac3a878`
- Reviewer instruction: `codex` / `gpt-5.6-sol` / `max` / `priority`
- Branch: `review/V5-H-0-01-probes-t4-sol`

`artifact.get` authenticated both artifacts against this trace. The fallback
artifact records that canonical `agent.spawn` returned generic `TOOL_ERROR`,
no reviewer tmux was created, and this persistent supervised fallback retained
the same trace/task/model profile. `orchestration.view` showed the trace
active and this task assigned to role `reviewer`. Historical Fable results
were immutable context only, never this verdict's authority.

The reviewer read `AGENTS.md`, `.claude/orchestration-profile.md`,
`plan/README.md`, the Stage H README, H/0/01 sheet and registry references,
all 34 `H_0_1_DOCTOR*` / `H_0_1_PROBES*` artifacts (11,828 lines total),
and all 587 Trial 4 request lines. The request SHA-256 is:

```text
d8a0c22a37e0e8f7e450678eca6529f6757520f45de372fe80939175ce2eec0a
```

The trail is coherent: DOCTOR Trials 1–12 are KO evidence; operator-ratified
Option B is DOCTOR Trial 13 reviewed OK; PROBES Trials 1–2 are KO and Trial 3
is reviewed OK. Fresh Trial 4 execution below replaces no historical verdict.

## Frozen identities and ancestry

Authenticated with `git show -s --format='%H%n%T%n%P%n%s' <sha>`:

```text
request
  commit  7472c3758c0f26158d66f3f6b4ea4fc5cd37a532
  tree    30a0beaa092c431fc45dc030fb253f634265d48a
  parent  6fecc59ed9d18eed31b20c8185b5f250a37a777b
  subject docs(review): request H_0_1 PROBES Trial 4 integration review

candidate
  commit  6fecc59ed9d18eed31b20c8185b5f250a37a777b
  tree    6c0f5e5280dd2cb045897431b223922da0eeebcf
  parents 2e368b1f81db35bc41f7dfe1759e6b077e15b281
          8c39fbec49b025480b71f8149b4c1e3f192166e0
  subject merge(v5): integrate H/0/01 PROBES candidate

first parent
  commit  2e368b1f81db35bc41f7dfe1759e6b077e15b281
  tree    ac582da210e0f2ac722a4c6b6077090d1310eb60
  parents 837206cca88686020a5e079aab8c7f3c46548263
          f904a2884f19fe5a9aafa9af58b3070a0b29059c
  subject feat(coordination): integrate epoch migration foundation (PROJECT_V5 G/0/02)

second parent
  commit  8c39fbec49b025480b71f8149b4c1e3f192166e0
  tree    ac2e132def1b192c5175db4429e3ac0a597388aa
  parent  9cc7cd4f4c2c08bfdc3b93530680ea2e3cce4536
  subject docs(review): index H/0/01 PROBES trials (V5 H/0/01)

merge base
  commit  9f075e181ef257b4b5b4b4cac3c0870af97110ec
  tree    1c7019a856950e2cabe3c4267454fb02c9b882e2
  parents 4236b765fbf18fa519fb4692fea551f9485fe506
          0e25400e359a0387636f9ce2d96bc43bd3ba7a0f
  subject merge: integrate reviewed V5 D/0/07 plan reconciliation
```

`git merge-base 2e368b1... 8c39fbe...` returned the exact stated base.
Both `git merge-base --is-ancestor <parent> 6fecc59...` commands exited 0.
The second parent is not an ancestor of exact main (exit 1), and the candidate
is the request's exact parent (exit 0).

The request changes exactly one pending index row plus the 587-line request.
`git cat-file -e 6fecc59...:plan/reviews/PROJECT_V5/H_0_1_PROBES-4_result.md`
exited 128 with the expected absent-path diagnostic; the result is also absent
from the request tree. This verdict leaves the pending row unchanged.

## Exact first-parent allowlist and conflict reconstruction

`git diff --name-status 6fecc59...^1 6fecc59...` returned exactly:

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

That is 19 expected and 19 actual, with no policy, dependency, lockfile,
workflow, or other protected path. `git diff --check HEAD^1 HEAD` exited 0.

The merge was reconstructed in fresh temporary clone
`/tmp/h001-probes-t4-review.5yF7rb/repo`:

```text
git checkout --detach 2e368b1f81db35bc41f7dfe1759e6b077e15b281
  exit 0
git merge --no-ff --no-commit 8c39fbec49b025480b71f8149b4c1e3f192166e0
  exit 1 (expected unresolved merge)
```

Git reported only `CONFLICT (content): Merge conflict in ci/suites.json`.
`git diff --name-only --diff-filter=U` returned only that path. `git status
--short` showed the other 18 paths staged. The unmerged index was:

```text
base   a03baf112271222cfd08b07f9023b2d1c7fe79ad
ours   c040d144c1efcc51438d2e36fce87e6024464f26
theirs 536320e213d441578adc184ffc50ad49956b8bdd
```

The sole hunk was `test.gateway.inventorySha256`: main carried
`sha256:b19fd095...`, the reviewed parent `sha256:5e69d010...`, and neither
represented the union. Candidate `sha256:22de7706...` is recomputed below.
No other path required manual resolution.

An exploratory `git diff-tree -m --first-parent` printed both per-parent merge
comparisons; it was not credited. The explicit `git diff <merge>^1 <merge>`
above is the authoritative pathset.

## Inventory recomputation and schema validation

The reviewer loaded candidate `scripts/ci_gate.py` and called its real
`discover_files` / `inventory_digest` over separate detached candidate and
first-parent clones. Probe SHA-256:

```text
68edaff6c424c21b0cd85d976e7fd538164c6cb276932f2ee49b3792db6a3cb6
  /tmp/h001-probes-t4-review.5yF7rb/inventory_probe.py
```

```text
/usr/bin/time -p python3 /tmp/h001-probes-t4-review.5yF7rb/inventory_probe.py \
  /tmp/h001-probes-t4-review.5yF7rb/repo \
  /tmp/h001-probes-t4-review.5yF7rb/mainrepo
exit 0; real 0.09s; suite_count=13; candidate_stale=; main_stale=
changed_values=lint.python,test.cli,test.gateway
```

| Suite | Main → candidate files | Main digest | Candidate digest |
|---|---:|---|---|
| `lint.gateway` | 82 → 82 | `b1a9921e7035f268221987c6a5f70aa0dd77b73b190d1418a934bb00df1651c7` | same |
| `lint.python` | 81 → 82 | `13f8d5ce6eb8d7d3532cdd954321cbe374122f05039a398c0a8f34045fc45376` | `2b3b68c399e090ba49de62adf111331db077249f3efaac37f89a1ef8df89fd43` |
| `lock.python` | 5 → 5 | `42f95e8c8838094c0ad6b517ae32fff984bf1439abda48e875c877f170be6b3c` | same |
| `policy.registry` | 21 → 21 | `ba7f5a4c10b15d8e7d4654d1327df6f5e80781be535a116873a647a714623388` | same |
| `release.candidate` | 24 → 24 | `20cb664a01ba9a3074fba98eb7e43ca4f4768d66b586773a0fcd99d9f45912a5` | same |
| `smoke.mcp` | 1 → 1 | `66cdfeadf01e2ce09f4e8b06d77e67f419c2bd63b549d54a76a462ee3d1ebf3a` | same |
| `test.cli` | 8 → 12 | `53068934504f8b8d10cf117d7150ec35bc035c39554b37698941ff5558ebf2a5` | `73d29da027f9ee1d7c40220ae87649d10367b97bc1318ce40dffa5549814d5ed` |
| `test.e2e` | 3 → 3 | `a6513e2fc4a177041a575acdd97fbe12757bac8bb71a1f2e8bc58906e8c01ec5` | same |
| `test.gateway` | 124 → 125 | `b19fd095f6f4fe6f5a4b8d6fb854286302169242b236ddf68a0bcd2c6d8c1a55` | `22de7706fd67ceb8ceb0f6ed9cef2d9b01d62f4a627929dc5c5a6f3a1aece401` |
| `test.langgraph` | 15 → 15 | `eeb386bcb94567f44d5f4bd18d1ff8a47c2c61afc0f129d7eb41385b847a62dd` | same |
| `test.real-agents` | 1 → 1 | `764826308fa9ba70bfecff60447ce6ca06ff335511121424efc38a4da8661b46` | same |
| `test.redis-live` | 9 → 9 | `41092de443884a5d1196e7177eb4c33412afd1abb427c5c43c1ba99b96504e42` | same |
| `test.structure` | 39 → 39 | `85c68c926f8540bf0d198d176d09aa247d7ab179ac88df6129e5b2d0c25c06c5` | same |

The table omits only the common `sha256:` prefix. Additional validation:

```text
python3 scripts/ci_gate.py --validate-only
  exit 0; real 0.06s; status=passed; errors=[]; no suites executed
parse ci/suites.json + doctor-result-v1.schema.json;
Draft202012Validator.check_schema(schema)
  exit 0; real 0.13s; parsed_json=2; suites=13; schema_valid=1
```

This was manifest/schema validation only, not `scripts/ci.sh`.

## Reviewed-byte and history authentication

Each candidate blob below exactly equals the reviewed second-parent blob:

| Path | Git blob |
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
| `H_0_1_PROBES-1_result.md` | `ec12c11e14b4c4c496cc7a5745c11e468662d78b` |
| `H_0_1_PROBES-1_to_review.md` | `2805742e04eb215ef7ca3ff270265312aff83458` |
| `H_0_1_PROBES-2_result.md` | `f9103ef906a50d53a9d8fb03b6d4175660f1adca` |
| `H_0_1_PROBES-2_to_review.md` | `fa87fb4c0bca927086908f66b9790e3661855037` |
| `H_0_1_PROBES-3_result.md` | `a08b3cff021f30609e8bfaa8dfbf36c54b14d05d` |
| `H_0_1_PROBES-3_to_review.md` | `f237bc52ecada557a72a712c634a51f28cbe97b7` |

The intentional candidate-only blobs are `ci/suites.json`
`264877c9e554e8c96669446e52ea6bbc34b9a3e2` and the unioned review index
`40576599ef68ddc4b8f2f590fa0fc793cd97a4d9`. Its first-parent diff is exactly
the three Trial 1–3 rows. The request then adds only the pending Trial 4 row;
this verdict does not edit it.

`git log --all -- <doctor.py> <test_doctor.py>` and both merge-base diffs
were inspected. DOCTOR Trial 13 integration
`616a4de12d047d1cee4fbfb2f7be32921c627907` is an ancestor of the merge
base. At both objects:

```text
cli/src/agents_cli/doctor.py  7b4c178411b93cbcf6d3a32ba82ce4ba66861a54
tests/cli/test_doctor.py      5c3b8e8b6675344cdde1397f2d4259960ed15056
```

Exact main has those same blobs. Main therefore made no overlapping text
change after the merge base. The base-to-candidate Doctor diff adds the six
PROBES check IDs, explicit twelve-check order, closed outcomes/remediation,
and matching registry validation. The test diff changes only six-to-twelve
inventory/order/index expectations while retaining the complete Trial 13
retirement/lifecycle matrix.

The reviewed second-parent history was independently observed as the exact
linear chain:

```text
34f211d -> 747cd1f -> 6f3b16b -> 632218a -> d02bf4e -> 3d9df43
-> 85c8115 -> af8e0c9 -> a2c0e2d -> 86240ad -> d52318b
-> 4b151e7 -> 24218ea -> 095ca22 -> 91dbdfe -> 7e1a606
-> 2f54ab2 -> 37d1892 -> 9cc7cd4 -> 8c39fbe
```

Commit/tree/parent/subject output matched the frozen request for each member.
The net merge-base-to-second-parent pathset is the same 19 paths above.

## Executed behavioral evidence

Python tests used Python 3.11.15 and pytest 9.1.1 from the Trial 3 environment.
Its `requirements.lock` SHA-256 exactly matches the candidate:

```text
a44cfb604bc3cbc17fa901cff64ea53432b700d7382e42bac60fa3351c937166
```

All pytest commands ran in detached candidate clone
`/tmp/h001-probes-t4-review.5yF7rb/repo` with
`PYTHONDONTWRITEBYTECODE=1`, `PYTHONPATH=cli/src`, and
`-p no:cacheprovider`.

### Complete Doctor/PROBES/sample inventory

```text
/usr/bin/time -p env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  <python-3.11.15> -m pytest -p no:cacheprovider -q -rs \
  tests/cli/test_doctor.py \
  tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_coordination_probes.py \
  tests/cli/test_doctor_authority_probes.py \
  tests/cli/test_doctor_probe_composition.py \
  tests/structure/test_h001_sample.py \
  tests/structure/test_h001_bootstrap.py
```

Exit 0: `503 passed` in pytest `87.26s`; wall `87.67s`; no failures,
skips, xfails, retries, or unavailable cases.

### Exact Trial 13 selector

```text
-k 'descriptor_mutation_releases_previous_probe_before_finalizer_waits or
every_discovered_retirement_callback_has_no_writable_standard_state or
scalar_callback_rewrite_cannot_leave_a_stale_issuance_record or
callback_self_cycle_cannot_retain_a_binding_or_probe_capability or
callback_call_function_state_cannot_retain_binding_and_probe or
dto_lifecycle_function_state_cannot_retain_binding_and_probe or
retirement_specific_surfaces_expose_no_python_function_state or
manual_dto_lifecycle_invocation_cannot_remove_live_exact_record'
```

Exit 0: `21 passed, 292 deselected` in pytest `2.06s`; wall `2.42s`.

### Hostile/composition, schema/render, and leak selections

```text
pytest ... test_doctor_provider_probes.py test_doctor_probe_composition.py \
  -k 'hostile_provider_key_lookup or six_probe_factories'
  exit 0; 5 passed, 24 deselected; pytest 0.89s; wall 1.29s

pytest ... test_doctor.py test_h001_sample.py \
  -k 'schema or render or projection'
  exit 0; 34 passed, 284 deselected; pytest 12.35s; wall 12.75s

pytest ... test_doctor.py test_h001_sample.py \
  -k 'leak or secret_canaries'
  exit 0; 13 passed, 305 deselected; pytest 0.66s; wall 1.05s
```

### Independent adversarial probe

The reviewer-authored probe used no coder test helper. It exercised both
public factories with an exact `dict` and hash-colliding hostile key;
ordinary `RuntimeError` and exact-identity `BaseException` sentinels;
zero-call runners; registry-only zero execution; ordered six-probe
composition; four fixed runner calls; one authority call; Draft 2020-12
validation; golden order; JSON/human/repr leak canaries; and collection of
completed run/binding/runner/authority graphs back to the ledger baseline.

```text
probe SHA-256
f4e072a4c23064c90f4699d73ccacfdd5fe4d0b52d1d322c3e6b77912d291b77

/usr/bin/time -p env PYTHONDONTWRITEBYTECODE=1 \
  PYTHONPATH=/tmp/h001-probes-t4-review.5yF7rb/repo/cli/src \
  <python-3.11.15> /tmp/h001-probes-t4-review.5yF7rb/adversarial_probe.py
exit 0; real 1.12s
hostile_factories=2 ordinary_fail_closed=2 baseexception_identity=2
runner_non_invocation=hostile+registry-only
composition_checks=12 runner_calls=4 authority_calls=1
schema_valid=1 golden_order=1 render_leak_free=1
lifecycle_ledger_baseline=328 lifecycle_ledger_final=328
```

This confirms ordinary-exception fail-closed behavior, unchanged
`BaseException` propagation through both factories, no construction-time
runner call, complete six-probe semantics, and no lifecycle retention
regression inside the stated supported boundary.

### Gateway bridge

```text
/usr/bin/time -p node tests/gateway/doctor_coordination_probe.test.js
exit 0; 10 tests, 10 pass, 0 fail, 0 skipped; Node 19.556ms; wall 0.19s
```

The ten named cases cover no `loadConfig`, one direct owned instance, the
real factory with fake queue/no domain operations, exact/hostile scope,
unavailable status, anomalous/throwing status, close failure, invalid pure
projection, invalid/throwing factory, and invalid-instance retirement.

## Static, exact-lock, failures, and warnings

### Python and syntax checks

```text
ruff check <seven changed Python paths>
  exit 0; All checks passed; wall 0.01s; Ruff 0.16.0
ruff format --check <same seven paths>
  exit 0; 7 files already formatted; wall 0.01s
in-memory compile(<same seven paths>)
  exit 0; compiled=7; bytecode=0; wall 0.04s
node --check gateway/src/coordination.js
  exit 0; wall 0.08s
node --check tests/gateway/doctor_coordination_probe.test.js
  exit 0; wall 0.07s
```

### Canonical npm lint failure retained

The reviewer reproduced the coder-visible canonical command:

```text
/usr/bin/time -p npm --prefix gateway run lint
exit 2; wall 0.40s
```

The review worktree had no local `gateway/node_modules`, so npm fell through
to global ESLint `v6.4.0`. It failed loading the ESM flat config at line 1:
`SyntaxError: Cannot use import statement outside a module`. This failure is
not reported as a pass and is not used as JS validation.

Unlike the coder worktree in the request, this fresh worktree had no untracked
`gateway/node_modules` symlink (`ls -ld` exit 2). Local
`.venv/bin/python` and `.venv/bin/ruff` discovery exited 127, and
`uv --version` exited 1 because snap confinement refused startup. The review
therefore used the candidate-lock-matching Python environment above and a
fresh exact-lock Node install under `/tmp`; no repository dependency was
created or changed.

### Isolated offline Node validation

Candidate lock SHA-256:

```text
71bf2f56b4326be0a8b5e6fec1ce69ddf6fe1b63c39c3b01c9d58b772d0203f0
```

The unrelated primary-checkout lock remained different
(`824886ba7012c266370088117d435d0ef89000c57e845bc23d72d06c8d835088`)
and was not used.

```text
/usr/bin/time -p npm ci --offline --ignore-scripts --no-audit --no-fund
  exit 0; added 197 packages; npm 0.639s; wall 0.84s
  candidate-lock ESLint v10.8.0
```

The install emitted three sandbox
`Failed to create stream fd: Operation not permitted` warnings and the
upstream `prebuild-install@7.1.3` deprecation warning. Install scripts stayed
disabled; no native/live dependency claim is made.

The first isolated ESLint invocation passed `src/coordination.js` but warned
that `../tests/gateway/doctor_coordination_probe.test.js` was outside the
config base and ignored. Its exit 0 is not credited as test validation. The
test was then copied byte-for-byte to a temporary in-base `gateway/tests/`
path:

```text
diff -q original exact-copy
  exit 0
SHA-256 original/copy
  b9e91b559554bf2b25361ff038c358f2d7642b854e4cb75c09e8214db216eadb
SHA-256 gateway/src/coordination.js
  7bdf4d684cd426c440e1db8a1729cff59b8cae4a5793efe03b171f70fc8eb0cc

./node_modules/.bin/eslint --config eslint.config.js \
  src/coordination.js tests/reviewer_external_doctor_coordination_probe.test.js
  exit 0; no lint output; wall 0.25s
```

The recurring three stream-fd warnings also appeared on several successful
isolated Python, Git, Node, and ESLint commands. They changed no exit or test
total and remain explicitly disclosed.

## Adjudication

- Exact two-parent custody, ancestry, tree identity, subjects, and the 19-path
  first-parent allowlist are authenticated.
- An actual clean merge replay proves `ci/suites.json` was the sole manual
  conflict and all other 18 paths merged automatically.
- All 13 inventories independently recompute; both trees are current; only
  `lint.python`, `test.cli`, and `test.gateway` differ.
- Every immutable source/test/doc/schema byte and all six prior PROBES
  request/result blobs match the reviewed second parent.
- DOCTOR Trial 13 is in the shared base; history plus the exact 21-case replay
  prove its behavior survives with the six PROBES additions.
- Complete focused, adversarial, schema, leak, lifecycle, Gateway, static, and
  exact-lock JS evidence is green. The canonical lint failure is fully
  attributed to missing worktree-local ESLint and is superseded only for the
  exact changed bytes by the disclosed isolated-lock replay.

Therefore the frozen candidate is `reviewed_OK` within this integration-only
boundary.

## Limitations and non-claims

- Full `bash scripts/ci.sh` was not run. It is orchestrator-owned and must run
  alone on the host.
- The prior canonical full-gate state remains
  `infrastructure_unavailable`: `2363 passed`, `0 failed`,
  `12 unavailable`, plus service-less Redis-live and optional real-agent
  lanes. This review does not relabel it green.
- Fresh behavioral execution used Python 3.11.15 only; no Python 3.13 replay
  was performed in this Trial 4 worktree.
- No real provider, network, Redis, PostgreSQL, Gateway/MCP process, Temporal,
  Docker, shared service, or real-agent path was contacted.
- Provider, coordination, isolation, and ownership evidence uses closed
  fakes, static snapshots, and injected capabilities. It proves the closed
  contract, not live availability or real isolation/ownership.
- The candidate is bound only to exact main anchor `2e368b1...`. Moving-main
  integration, full-sheet exit, promotion, publication, release, local tag,
  and push remain outside this review and were not performed or inferred.
