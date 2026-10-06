# Independent Review Result — Project V5 H/0/01 PORTABILITY (Trial 2)

## Verdict

`reviewed_OK`

Candidate findings: **P0/P1/P2 = 0/0/0**. No candidate correction is
required by this verdict.

This final adjudication was issued by independent reviewer task
`ts-8934948d-e704-4e5b-8172-860bdb9528cd` under trace
`tr-v5-h001-portability-t2-s-a1e4c9b3-2904-4cf4-9e4e-36fadbf4a738`, using
`codex` / reviewer / `gpt-5.6-sol` / `max` / `priority`. The reviewer was not
one of the Trial 2 coder tasks named in the request.

## Authenticated custody and reviewed candidate

The four bounded adjudication inputs were authenticated through EOF before
the verdict:

| Input | Lines | Bytes | SHA-256 | Artifact |
|---|---:|---:|---|---|
| `plan/reviews/PROJECT_V5/H_0_1_PORTABILITY-2_to_review.md` | 228 | 13,008 | `bc7f8b513f62fefbda09a5bd55ec1f1295024aa12e62e7084571a03c2aba53ed` | Not assigned in the final-adjudication brief |
| `.h001-portability-t2-review-source.md` | 248 | 21,687 | `cb2207c8752a8e25887d3b7065a83c25487df5cd948c4755f2ce1f48d4bc3c88` | `art-8207c763-590b-4cc4-aafe-cc2dfa7419a1` |
| `.h001-portability-t2-review-dynamic.md` | 129 | 12,275 | `b978147cd9854df60999452f870203ce3948394134b9bbb7c63e17608999c9d7` | `art-c8886c64-c029-4268-90b6-be4380190603` |
| `.h001-portability-t2-review-accepted.md` | 159 | 11,855 | `5843882ab7d4c2d72869a231a2bb0bca1d05d110862e2d060aa9c27913d49880` | `art-03bdb3b2-0f26-4ecd-8228-abe999e9b71b` |

The final reviewer authenticated this repository state before writing the
result:

- Branch: `review/V5-H-0-01-portability-t2-sol`.
- Request HEAD: `8a0f9d9f21af3c1137aed4256f8ed75d0ac1894f`.
- Request tree: `5746bf8d4186c276a6b791dd0933949dc9b90084`.
- Request sole parent / technical candidate:
  `88e76432a7cab434207e1679ec302c9acecde5de`.
- Technical candidate tree:
  `b6a065c56c18bead79bc6e50d6e6c127758837d1`.
- Technical candidate sole parent / Trial 2 RED:
  `58cdb406a61f969be964a7cf006e51aac21f7f57`.
- Trial 2 RED tree: `97426b7da15b078a25904829c3e46b08b8cd1bfb`.
- Trial 2 RED sole parent / Trial 1 KO index custody:
  `fdde2e01858f63c7a4dda3752b611367211d72b1`.

The exact RED-to-GREEN candidate pathset is:

```text
M  tests/structure/test_h001_portability.py
M  tests/structure/test_h001_portability_mutations.py
```

The exact index-custody-to-RED pathset is:

```text
M  ci/suites.json
A  tests/structure/test_h001_portability_mutations.py
```

The exact candidate-to-request pathset at request HEAD is:

```text
M  plan/PROJECT_V5/reviews/README.md
A  plan/reviews/PROJECT_V5/H_0_1_PORTABILITY-2_to_review.md
```

Thus the complete Trial 2 technical range contains only the two test files
and the mechanically refreshed `ci/suites.json` inventory digests. The
inventory file is byte-identical at RED and GREEN. The authenticated GREEN
file identities are:

| Path | Git blob | SHA-256 | Lines | Bytes |
|---|---|---|---:|---:|
| `ci/suites.json` | `7185df8b430622cbf8b4adf4a0d5fe492e0f7668` | `5e4420ace312675b5c48ec6828e5ccb04abc4255b50b6f52599787cf43d206f1` | 380 | 10,724 |
| `tests/structure/test_h001_portability.py` | `ef40ab6b1da3f2e37f6b21572d24ab0519b581a8` | `e8a71747bb512f8b36471b44d5be283fa06801982ee1a8cf6d8a01d30e0974e7` | 875 | 28,412 |
| `tests/structure/test_h001_portability_mutations.py` | `66ea26cbef144a19295b9bccc53b09e86335ea8e` | `970eb3e6101a3f29539033f5bac2f6114167b5ed4c2efa2f2232512fdcebff71` | 452 | 13,164 |

Before this result was created, the tracked worktree and index were clean,
the result path was absent, and the only porcelain entry was the tolerated
unchanged untracked `gateway/node_modules` symlink to
`/home/carase/git/personal/agents-orchestrator/gateway/node_modules`.

## Findings and adjudication

### Candidate findings

No P0, P1, or P2 candidate finding survives adjudication.

The authenticated source review establishes that all 17 mutations remove a
real current predicate, detector, scanner surface, or inherited-state guard;
that their distinguishing witnesses are independent of the bytes removed;
and that the behavior assertions reject a survivor without crediting a skip,
collection/setup error, missing report, timeout, or zero-test outcome. The
five proxy predicates, five protected-value detectors, raw-config and rendered
exception-chain surfaces, and five inherited-state guards are all bound to
specific behavioral consequences. The original 15-test behavior and prior
assertions remain intact or stronger.

The password mutation proves exact branch binding, not that deleting the
password predicate alone permits egress: the independent username guard still
rejects the exercised credential URL. Likewise, overlapping credential URL,
home, and repository detectors prove exact longest-value detector behavior,
not disappearance of every shorter overlapping defense. These are accurate
scope qualifications, not defects.

The process-group helper is proven for the authenticated frozen call graph and
the observed executions. It is not an absolute containment primitive for a
hypothetical future descendant that deliberately calls `setsid` or `setpgid`;
an escaped process retaining a captured pipe could expose the unbounded second
`communicate()` discussed in the source checkpoint. No reviewed mutation or
current helper can take that escape path, and the dynamic evidence observed no
remaining descendant. This is an accepted robustness limitation on broad
wording, not a current candidate finding or an absolute descendant-containment
claim.

### Reviewer-harness failures and unavailable inventory evidence

The accepted-lane inventory recomputation is **unavailable and unrun**, not a
pass. Both reviewer-owned wrappers failed before invoking candidate inventory
logic:

1. The first wrapper exited 1 with `ModuleNotFoundError: No module named
   'scripts'`; neither required inventory function was called.
2. The sole correction exited 1 with `KeyError: 'inventory'` after import but
   before `discover_files` or `inventory_digest` was called.

These are reviewer-harness failures, not candidate failures, and contribute
no passing candidate evidence. This final adjudication therefore does not
independently reproduce the declared-to-actual comparisons, file counts
`84/41`, or inventory digests. The request's recorded values
`sha256:68cb3f0db015279834976a20248a6adfd89421f638d3ed82a2397cd8e12dd2b6`
for `lint.python` and
`sha256:fc643e5fff4550cd8424b6616d38fb5ec535df8087c40e30a8733879b60962c5`
for `test.structure` remain coder-recorded corroboration only.

The remaining authenticated evidence is sufficient for `reviewed_OK`: the
source checkpoint independently proves the mutation-to-witness bindings and
exact scope; the dynamic checkpoint independently executes every mutation and
the full baseline; the accepted checkpoint independently executes the
bootstrap, sample, Ruff, shell-syntax, and validate-only lanes; candidate
identities remain stable throughout; and no candidate lane fails or
contradicts the recorded inventory values. The missing independent inventory
recomputation is retained as an evidence limitation and cannot be promoted
into either a pass or a candidate defect.

## Reproduced and observed evidence

### TDD and focused runtime

- The coder-recorded RED was 17 named semantic `SURVIVING_MUTANT` failures in
  12.94 seconds, with no setup/collection error, timeout, skip, or zero-test
  substitution. It was not rerun during final adjudication.
- The independent dynamic checkpoint ran the exact mutation lane in the
  project virtual environment: exit 0, `17 passed in 17.51s`, outer monotonic
  duration `18.235689035s`, empty stderr. Its 17 unique cached node IDs account
  for all five inherited guards, five protected detectors, five proxy
  predicates, raw config, and rendered exception chain.
- In the same persistent PID namespace, the independent dynamic checkpoint
  then ran the exact portability baseline: exit 0, `15 passed in 4.17s`, outer
  monotonic duration `4.825778481s`, empty stderr.
- The positive totals and exits establish no failure, error, skip, xfail,
  timeout, deselection, or zero-test substitution in either credited focused
  execution.

The dynamic checkpoint's first attempt also produced `17 passed in 16.69s`
and `15 passed in 4.10s`, but its before/between/after process captures were in
different sandbox PID namespaces. That attempt is uncredited. The reviewer
attributed the harness defect and corrected it once with both serial commands
and all process captures in one persistent namespace; only the corrected
results above are credited.

### Accepted lanes

The independent accepted-lane checkpoint recorded these first-run results:

| Lane | Exit | Exact result |
|---|---:|---|
| Bootstrap pytest | 0 | `114 passed in 12.31s`; outer duration `13.080060403s` |
| Sample pytest | 0 | `5 passed in 0.07s`; outer duration `0.621630396s` |
| Ruff on both GREEN files | 0 | `All checks passed!` |
| `bash -n scripts/bootstrap.sh` | 0 | Empty stdout/stderr; syntax accepted |
| `scripts/ci_gate.py --validate-only` | 0 | `status=passed`, `errors=[]`, `suites=[]`, counts `tests=0, passed=0, failed=0, skipped=0` |

The validate-only result is schema/configuration validation and is not
represented as a test execution. `git diff --check` also exited 0 with empty
stdout/stderr in that checkpoint.

Two earlier coder launcher attempts ran in an environment without pytest and
executed zero tests. They remain uncredited launch failures, not pytest
failures or passing evidence. Two earlier GREEN tasks stopped at their
20,000-token budgets after authentication/source work and made no edit or
verification claim. Neither circumstance is credited as candidate evidence.

### Exact process-boundary observations

The credited dynamic harness used one persistent namespace. Its before table
contained only PID 1 (`bwrap`), PID 2 (the harness shell), and instantaneous
`ps`, all in PGID/SID 1. Mutation timeout PID 10 and main mutation pytest PID
13 were observed; 27 unique inner mutant-pytest identities were observed, 26
as their own process-group/session leaders and one as PID 315 in PGID/SID 311.
The between table again contained only PID 1, PID 2, and instantaneous `ps`:
no mutation pytest, worktree worker, mutant-source pytest, fake helper, or test
descendant remained before baseline. Baseline timeout PID 971, main pytest PID
974, and helper descendants were observed in the baseline group. The final
table contained only PID 1, PID 2, and instantaneous `ps`; no baseline or
mutation descendant remained.

The accepted-lane before and after tables were likewise captured inside their
persistent harness namespace and contained only the sandbox supervisor,
harness shell, and instantaneous `ps`; no accepted-lane pytest descendant
remained. The correction wrapper did not spawn pytest, and its final boundary
contained only its supervisor, shell, and `ps`.

These observations prove boundary cleanup for the credited executions. They
do not prove that `/tmp` was file-residue-free: pytest temp trees rotated, and
the auxiliary sweep could not inspect system-private and snap-private paths.
They also do not prove absolute containment of hypothetical deliberately
detached future descendants.

## Failed, unavailable, and unrun lanes

- Candidate lanes failed: none observed.
- Reviewer-harness failures: the two inventory wrappers described above.
- Required but unavailable/unrun candidate evidence: independent inventory
  recomputation and declared-to-actual comparison for `lint.python` and
  `test.structure`.
- Deliberately unrun in final adjudication: mutation, baseline, accepted tests,
  inventory, aggregate `bash scripts/ci.sh`, all other suites, dependency
  operations, and every product/network/provider/native-addon lane.
- Trial 1's accepted real-network, cold-cache, cross-platform, compiler,
  toolchain/header, runnable `better-sqlite3`, Redis, provider, MCP, and public
  egress limitations remain unchanged. Runnable native proof remains assigned
  to I/0/04.
- The focused evidence is not aggregate CI, does not establish every H/0/01
  acceptance criterion, and does not prove general descendant containment.

## Lifecycle non-claims

This verdict reviews only the frozen Trial 2 candidate and its bounded
evidence. It does not claim or authorize integration into `main`, promotion,
release, support, publication, a tag, a push, or any policy change. It does
not change the plan-sheet status or establish aggregate release confidence.
