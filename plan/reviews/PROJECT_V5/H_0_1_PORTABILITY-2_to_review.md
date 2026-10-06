# Review Submission - Project V5 H/0/01 PORTABILITY (Trial 2)

## Requested independent review

Assign a fresh reviewer session under the repository orchestration profile.
The reviewer must be independent of every coder task named below and inspect
the frozen Trial 2 RED/GREEN candidate. Write the verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_PORTABILITY-2_result.md
```

The verdict must identify the exact reviewed commit, tree, ancestry, and
pathset; list every P0/P1/P2 finding; and record the commands and terminal
counters actually reproduced by the reviewer. It must preserve the immutable
Trial 1 request, KO result, and index entry.

No result or verdict existed when this request was committed. This document is
a coder-owned pending submission and cannot serve as its own verdict.

## Coder trace and task custody

All Trial 2 coder work remained under trace
`tr-6c7f03e0-0991-444b-b84d-e680c2d6d5c7`, on branch
`feat/V5-H-0-01-portability`, in worktree
`/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-portability-t1`.
Every task used `codex` / coder / `gpt-5.6-sol` / `max` / `priority` and had no
verdict authority.

| Task | Bounded responsibility | Disposition |
|---|---|---|
| `ts-c441aa49-ba0e-434c-8188-71ecf7201652` | Trial 2 semantic TDD RED | Committed RED `58cdb406a61f969be964a7cf006e51aac21f7f57` |
| `ts-c98c42fb-64b6-4419-9e7c-ebcaaf6040c3` | Initial Trial 2 GREEN analysis | Reached its 20,000-token budget after authentication; no edits |
| `ts-59281268-7255-424e-a64f-584af2bc8c13` | Fresh-budget GREEN design continuation | Reached its 20,000-token budget after required source reads; no edits or verification |
| `ts-b9980e52-bb42-44cd-9900-bb6609f0dd2b` | Exact two-file GREEN patch and focused lanes | Produced the authenticated unstaged patch and focused results; did not commit |
| `ts-37253888-423e-4341-a345-4a3b8380d365` | Accepted-lane verification and exact commit | Committed GREEN `88e76432a7cab434207e1679ec302c9acecde5de` |
| `ts-3146ac6f-e0c9-4b26-acd2-77a5f0c46255` | This immutable request and pending index row | No product edit, review, or verdict |

No sub-agent was delegated this handoff, and no coder task authored or is
authorized to author the independent verdict.

## Immutable Trial 1 KO to Trial 2 GREEN chain

The correction starts from the independently issued Trial 1 KO; it does not
rewrite or reinterpret that result.

| Point | Commit | Tree | Sole parent |
|---|---|---|---|
| Trial 1 technical GREEN | `2ce0ec115de259695254f050f5c0c4704461ae06` | `77b1a9f1ed9cb39f493a4a5a1a17a2eaa03d31f0` | `ea7a4c59258223a9297c655b9066042afb938d57` |
| Trial 1 request | `d820aef57a96d19ceac88818726da362571eeeaf` | `692a2391aac9fdf285ba22ce0ee6b9cbd75cff30` | `2ce0ec115de259695254f050f5c0c4704461ae06` |
| Trial 1 independent KO | `ee5b0975f7d4f1df1f37144b54c82e2f426404a9` | `58744c3439ef33d43442d04e2b45acb06bf048cb` | `d820aef57a96d19ceac88818726da362571eeeaf` |
| Trial 1 KO index custody | `fdde2e01858f63c7a4dda3752b611367211d72b1` | `b26f1a30479a1b46e413705fffa829a6def82c0a` | `ee5b0975f7d4f1df1f37144b54c82e2f426404a9` |
| Trial 2 RED | `58cdb406a61f969be964a7cf006e51aac21f7f57` | `97426b7da15b078a25904829c3e46b08b8cd1bfb` | `fdde2e01858f63c7a4dda3752b611367211d72b1` |
| Trial 2 GREEN candidate | `88e76432a7cab434207e1679ec302c9acecde5de` | `b6a065c56c18bead79bc6e50d6e6c127758837d1` | `58cdb406a61f969be964a7cf006e51aac21f7f57` |

The Trial 1 result is `reviewed_KO` with P0/P1/P2 `0/3/0`. The index-custody
commit changes only its pending cell to the immutable KO link. The exact
index-to-RED pathset is:

```text
M  ci/suites.json
A  tests/structure/test_h001_portability_mutations.py
```

The exact RED-to-GREEN pathset is only:

```text
M  tests/structure/test_h001_portability.py
M  tests/structure/test_h001_portability_mutations.py
```

Thus GREEN changes exactly two test files. The complete Trial 2 technical
range from `fdde2e0` to `88e7643` contains those two files plus the RED-only
mechanical `ci/suites.json` inventory refresh. The pre-existing untracked
`gateway/node_modules` symlink is outside every commit and candidate pathset.

## Trial 2 TDD RED

RED added one bounded mutation driver and only the mechanically required suite
inventory update. Its 17 parametrized cases each failed semantically with a
named `SURVIVING_MUTANT`; the run had no collection, setup, timeout, skip, or
zero-test defect. The recorded RED duration was 12.94 seconds.

The 17 surviving mutations were the five loopback proxy source predicates
(scheme, exact `127.0.0.1` host, username, password, and exact path); five
protected-value detectors (username, credential-bearing URL, owner home,
reviewer home, and repository path); the raw-configuration and rendered
exception-chain surfaces; and five inherited-state guards (`XDG_CACHE_HOME`,
`AWS_ACCESS_KEY_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `UV_CREDENTIALS`, and a
pre-existing `.venv`). This is the semantic RED for all three Trial 1 P1
findings, not a fixture-presence or source-shape assertion.

At RED, the mutation driver was 420 lines with blob
`69644db1befd345b257110724d3cdae65ffd9495` and SHA-256
`f98da9a26ee76648084e4f131f886b5eea491242d8dd675379ec671d3c6e214c`.

## Trial 2 GREEN witness design

GREEN preserves all 17 mutation identifiers and the existing 15-test
portability count. It strengthens evidence inside the existing parametrized
tests rather than inflating the outer test count.

- The proxy witness now submits five minimally distinguishing source URLs and
  binds each real scheme, host, username, password, or path rejection branch
  to a nonzero result before install materialization.
- Protected values are emitted independently across the bounded output
  surfaces. Expected probe values are defined independently of the detector
  inputs that each mutant deletes, so one mutation cannot alter both the
  detector and its witness.
- The raw-config witness writes an actual produced `raw-config.json` input to
  the scanner. The rendered-exception witness passes an actual chained
  exception through `traceback.TracebackException(...).format(chain=True)`;
  generic captured stderr is not substituted for that branch.
- The five exact missing inherited-state cases are paired into the existing
  five parametrized bootstrap cases. Each requires its named pre-npm rejection,
  no npm invocation, no install success, and no protected-value leak.
- Mutation pytest children start in owned process groups. Timeout and final
  cleanup kill the owned group, collect its output, remove the temporary source
  copy, and retain exact JUnit counts. A timeout, missing report, zero tests,
  skip, collection error, or setup error cannot be credited as a semantic kill.
- Only the two surface mutations were retargeted from synthetic insertion to
  deletion of the actual raw-config and rendered-exception scanner branches.
  The other mutations still delete their named real predicates or guards.

No assertion was removed, skipped, xfailed, collapsed into a structural
fixture check, or converted from failure to pass. No bootstrap/product source,
documentation, policy, dependency, workflow, or plan sheet changed in GREEN.

## Frozen candidate file identities

These are the authenticated GREEN blobs and byte-level SHA-256 identities:

| Path | Git blob | SHA-256 | Lines |
|---|---|---|---:|
| `tests/structure/test_h001_portability.py` | `ef40ab6b1da3f2e37f6b21572d24ab0519b581a8` | `e8a71747bb512f8b36471b44d5be283fa06801982ee1a8cf6d8a01d30e0974e7` | 875 |
| `tests/structure/test_h001_portability_mutations.py` | `66ea26cbef144a19295b9bccc53b09e86335ea8e` | `970eb3e6101a3f29539033f5bac2f6114167b5ed4c2efa2f2232512fdcebff71` | 452 |

The committed `ci/suites.json` is blob
`7185df8b430622cbf8b4adf4a0d5fe492e0f7668` with SHA-256
`5e4420ace312675b5c48ec6828e5ccb04abc4255b50b6f52599787cf43d206f1`;
it is byte-identical at RED and GREEN.

## Recorded verification evidence

The patch and verification tasks were deliberately separated. The following
table attributes each result to the task that actually retained it; this
handoff did not rerun product or test lanes.

| Lane | Provenance | Recorded terminal result |
|---|---|---|
| Trial 2 RED mutation lane | RED task | 17 semantic `SURVIVING_MUTANT` failures in 12.94s; no failed setup/collection, timeout, skip, or zero-test substitution |
| `python -m pytest -q tests/structure/test_h001_portability_mutations.py` | Patch task | 17 passed, 0 failed/error/skipped, in 17.40s |
| `python -m pytest -q tests/structure/test_h001_portability.py` | Patch task | 15 passed, 0 failed/error/skipped, in 3.64s |
| `python -m pytest -q -rs tests/structure/test_h001_bootstrap.py` | Verification task | 114 passed, 0 failed/error/skipped, in 11.19s |
| `python -m pytest -q -rs tests/structure/test_h001_sample.py` | Verification task | 5 passed, 0 failed/error/skipped, in 0.06s |
| Ruff on both GREEN files | Verification task | Passed with no findings |
| `bash -n scripts/bootstrap.sh` | Verification task | Exit 0, no syntax error |
| `python scripts/ci_gate.py --validate-only` | Verification task | Status `passed`, errors empty |
| Independent inventory recomputation | Verification task | `lint.python`: declared equals actual over 84 files; `test.structure`: declared equals actual over 41 files |
| `git diff --check` and exact path/index checks | Verification task | No whitespace errors; only the authorized two-file GREEN diff before commit; empty index before staging |
| Owned pytest process-family check | Verification task | No owned pytest descendants remained after the lanes |

The declared and independently recomputed inventory digests were:

```text
lint.python    sha256:68cb3f0db015279834976a20248a6adfd89421f638d3ed82a2397cd8e12dd2b6
test.structure sha256:fc643e5fff4550cd8424b6616d38fb5ec535df8087c40e30a8733879b60962c5
```

The 17.40s and 3.64s focused durations belong to the patch task. The later
verification task authenticated the exact patch and retained that the focused
lanes had passed, but did not independently retain or reproduce those two
durations. They must not be represented as fresh verification-task timings.

## Failed, unavailable, and budget-limited operations

Two earlier launcher attempts used an environment in which pytest was missing.
They executed zero tests and are preserved as uncredited launch attempts, not
as pytest failures and not as evidence for any passing lane. The credited
lanes above used the project-root virtual environment.

The initial GREEN task `ts-c98c42fb-64b6-4419-9e7c-ebcaaf6040c3` stopped at
its 20,000-token budget after authenticating the required inputs without edits.
The continuation `ts-59281268-7255-424e-a64f-584af2bc8c13` also stopped at its
20,000-token budget after the required source reads; it left a design
checkpoint but made no edits or verification claim. The fresh patch and
verification tasks then performed the bounded work described above. No budget
stop is converted into test or review evidence.

Aggregate `bash scripts/ci.sh` was deliberately not run for this docs-only
handoff and is not claimed. The independent reviewer must attribute any first
failure it observes rather than retrying it away.

## Required adversarial review

Please independently inspect and reproduce enough evidence to decide all of
the following:

1. Every mutation replacement deletes a real predicate, detector, surface, or
   inherited-state guard rather than manufacturing an unrelated failure.
2. Every witness input and expected protected value is independent of the
   detector bytes altered by its mutant.
3. Every protected source/value/state is actually emitted or exercised and is
   detected by a behavior assertion before any candidate credit is given.
4. Spawned pytest children and their descendants cannot escape the owned
   process-family timeout/final cleanup path.
5. All prior assertions and the original 15-test portability behavior remain
   at least as strong; no test count, skip, xfail, collection error, missing
   report, or zero-test path masks a surviving mutant.

## Limitations and lifecycle non-claims

- Trial 1's accepted real-network, cold-cache, and runnable native-addon
  limitations remain unchanged; runnable native proof still belongs to
  `I/0/04`.
- This candidate changes tests and one RED inventory digest only. It makes no
  product, bootstrap, policy, dependency, workflow, plan-sheet, or release
  change.
- The focused evidence is not aggregate CI and does not establish completion
  of all H/0/01 acceptance criteria.
- This pending request is not an independent review or verdict.
- The technical candidate is not claimed integrated into `main`, promoted,
  released, supported, published, tagged, or pushed.
- No merge, integration, promotion, release, tag, push, or policy authority is
  requested or implied.

The independent reviewer should issue only the separate Trial 2 result and
must not rewrite this request or the Trial 1 evidence chain.
