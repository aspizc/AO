# Project V5 D/0/07d Design Trial 9 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-9`.
- Baseline: `c6afab2882fc88e220b1df97951d65125215a3d6`, tree
  `173dd9415435e8cb2ae592ec4b8150b257aad292`.
- Candidate: `9b5e6b509e431ffe49be4caab7bf2e39cab26bf7`.
- Candidate tree: `9e746d999c9ef52a41a3fa5866b118bdeae2d622`.
- Candidate branch: `plan/V5-D-0-07d-trial9`.
- Candidate range: `c6afab2882fc88e220b1df97951d65125215a3d6..9b5e6b509e431ffe49be4caab7bf2e39cab26bf7`.
- Candidate delta: only `plan/PROJECT_V5/D/0/07d.md`, 263 insertions and
  66 deletions.
- Sheet blob: `459b88b26286ea62c664550dabd9d49a37941545`.
- Sheet size: 6,557 lines / 363,924 bytes.
- Sheet SHA-256:
  `6378d01927fd37b81b61e797b14683d42261bfcbbce6a780e13b6b5596fef0fe`.
- Stable range patch-id:
  `a645ea5be239f296be0622ed79fe5ae60c7bb6a6`.

The range is exactly these two commits in order:

| Commit | Tree | Parent | Exact subject | Sheet delta |
|---|---|---|---|---:|
| `b0aa2c181e334baf7100d25d4b44a968bdf3000d` | `bfdbbfa301136bcd57dd79b41a36f39d6fb14653` | `c6afab2882fc88e220b1df97951d65125215a3d6` | `docs(plan): correct D/0/07d authority lifecycle (V5 D/0/07d Design Trial 9)` | `+102/-47` |
| `9b5e6b509e431ffe49be4caab7bf2e39cab26bf7` | `9e746d999c9ef52a41a3fa5866b118bdeae2d622` | `b0aa2c181e334baf7100d25d4b44a968bdf3000d` | `docs(plan): freeze D/0/07d authority inputs (V5 D/0/07d Design Trial 9)` | `+167/-25` |

The intermediate sheet is blob
`c9b62652608c6d38f92b165eb6f9eef0cdc8b2a3`, SHA-256
`fe6c09037bf04d34608e44b7b767f72c5ef197066c0694fdd82621065f7f9529`.
A fresh independent reviewer must authenticate the range, inspect the
mechanisms, and author the immutable result. This request, its hashes, and the
author's deterministic transcripts are untrusted inputs, not approval.

This request claims no implementation, implementation review, integration,
promotion, release, support, host-custody pass, or Docker pass. Checkpoint 1
GREEN work remains paused pending an independent Design Trial 9
`reviewed_OK` for this exact candidate.

## Motivation: CP1 Trial 2 KO and Trial 3 RED

The baseline commit is the imported CP1 Trial 2 KO. Its immutable result is
`plan/reviews/PROJECT_V5/D_0_7D_CHECKPOINT_1-2_result.md`, blob
`a0daf4d434da3ef670b41052dca54bc93b09760c`, SHA-256
`9a32f936dad48bd142c4a6e5161d81fa8d1cd91636d7578b2d4df28117d32cf7`.
That review found the first mandatory V4 parent gate unformable: the request
supplied no concrete Python, authority parent, ODB, candidate/tree, source,
toolchain, `node_modules`, Docker, expectation-ledger, or review-base operands.
Candidate-local and broad gate results could not substitute for the absent
reviewer-authority invocation.

The subsequent CP1 Trial 3 RED commit
`a292e90e255e8ea434b85612dbfbba9be1b1fedc` (tree
`c9cb6667a8779dda3ffe297c7527d6a3aff77b82`, parent
`55d25f0460fcb9e95e928093f4505241aa8758f3`) is motivation only. It is not in
the candidate range, is not GREEN, grants no implementation or review
authority, and changed only
`tests/gateway/process_supervisor_session_port.test.js` (`+143/-1`). Its six
named REDs expose the remaining frozen-contract gaps:

1. `frozen V4 full CI emits the test TAP D7C2 schema`: full CI did not emit
   type `3`, type `1`, then type `2` D7C2 test frames;
2. `frozen V4 TAP accounting uses root results instead of nested Subtest
   lines`: accounting could mistake nested `# Subtest` lines for root results;
3. `frozen V4 teardown evidence carries the required fixture ledger`:
   teardown framing emitted no ledger capable of satisfying required outcomes;
4. `frozen V4 full CI binds rc0 to passed and rc1 to infrastructure
   unavailable`: child exit and canonical report status were not bound;
5. `frozen V4 full CI rejects an undeclared infrastructure skip id`: an
   undeclared skip was not independently rejected; and
6. `frozen V4 accepts bare fixedMode and bootstrap conventions`: the wrapper
   accepted dashed conventions while the parent passes bare `fixedMode`.

Trial 9 changes the plan authority needed to make those REDs implementable and
the reviewer gate formable. It does not claim to make the RED commit GREEN.

## Candidate correction 1: executable authority lifecycle

The frozen V4 parent now enforces this exact sequence:

```text
candidate archive -> validate and seal canonical USTAR
-> Docker ownership probe -> Docker build
-> validate and seal held tmux output
-> candidate test with populated read-only fd 4
-> final revalidation and single cleanup
```

The candidate test no longer runs before Docker has populated the held output.
The output memfd is created with `MFD_ALLOW_SEALING`; the parent validates the
Linux/amd64 ELF header, applies and verifies all four write/grow/shrink/seal
seals, remeasures it, and refuses the test phase unless the seal state is
established. SCM_RIGHTS fd 4 now carries `output_fd`, not `archive_fd`.

`PARENT_EXECUTION_ORDER` and the returned `executionOrder` make the sequence
observable. The selftest rejects a seal failure and an executor that merely
claims but does not establish `unsealed-held-output`. Finalization rechecks the
seal set and executable bytes, and all failure paths retain the one-cleanup
contract.

The reviewer must verify that the lifecycle correction preserves the Trial 8
authentication, observed Docker transaction, deadline, reconciliation,
EOF/cgroup, held-object, and cleanup conjunctions. A reordered phase, writable
test input, archive supplied as fd 4, or unsealed output is KO.

## Candidate correction 2: D7C2 mode and test protocol

The oracle now defines ordered `MODE_ORDER` and proves all eleven enum values
are bare D7C2-v3 tokens through both authenticated systemd/unit-shim and final
candidate argv. It independently rejects 33 dashed substitutions: one binding,
one systemd argv, and one candidate argv mutant per mode.

Absence of `/inputs/tmux` selects archive `[4,EOF]`; presence selects test
`[3 x N,1,2,EOF]`. The candidate receives no phase flag and no expectation
bytes, path, fd, digest, names, or totals. Every reached test phase—including
bootstrap, Docker integration, focused, and full CI—must emit type-3 TAP,
type-1 summary, type-2 ledger, then EOF. Unit/focused names and totals come
from the actual serial root TAP parser. Bootstrap, Docker integration, and
full CI use the sheet's exact one-result canonical synthetic TAP derivation;
only a completed child/check result selects `ok` or `not ok`. Missing,
malformed, signalled, timed-out, or unexpected-exit children emit no invented
terminal evidence.

The reviewer must inspect the exact TAP byte recipe, root-result accounting,
summary arithmetic, required-ledger comparison, exit/report binding, and
undeclared-skip rejection. Expected totals or planned names cannot be
converted into observed run evidence.

## Candidate correction 3: formable frozen inputs

The sheet now requires a concrete `CP1_AUTHORITY_INPUTS_V1` request manifest.
It binds the authority and interpreter file identities, Python version, every
bare ODB and object inventory, candidate commit/tree, source archive, toolchain
inventory, `node_modules` inventory/lock identities, Docker client identity and
version, and the design blob used for extraction. Ambient lookup and
candidate-produced attestations are forbidden.

Each of the eleven CP1 rows must carry a literal argv array with no unresolved
operand, its exact four-entry environment, candidate identity, request-frozen
canonical expectation JSON bytes/count/SHA-256, exact required ledger, and a
unique review-base identity. The reviewer exclusive-creates each no-LF ledger
as a reviewer-owned regular mode-`0400`, link-count-one file. Eleven empty,
distinct reviewer-owned mode-`0700` review bases are required; the parent alone
creates one mode-`0700` run child in each. The executable oracle rejects wrong
ledger/base modes, linked or empty/oversized ledgers, embedded LF, or nonempty
review bases. Ledger directories and review bases are distinct, and the
candidate never receives an expectation artifact.

The CP1 handoff table freezes all eleven invocation ids, bare modes, exact
unit/custody totals, exact bootstrap/Docker/full-CI synthetic names/totals, and
the request-derived focused root-TAP manifest. The future CP1 request must
embed the concrete manifests, ledger byte strings, argv arrays, aggregate
hashes, and construction transcript. If row 01 cannot run solely from request
bytes plus the declared reviewer-owned construction, it is immediate KO.

## Frozen deterministic evidence

The author extracted the marked fences from candidate blob
`459b88b26286ea62c664550dabd9d49a37941545`, preserving the final LF, compiled
the oracle, and ran all three public deterministic entry points. A reviewer
must independently reproduce, not trust, this table:

| Evidence | Lines / bytes | SHA-256 |
|---|---:|---|
| V4 custody spec | 126 / 5,480 | `1cb01a4287cb61c81adfb106e8ea058d2b217a7ef8972f6c311d2bbef1e969de` |
| BWRAP argv V3 | 23 / 1,323 | `87b9dfbe5730fcac337879d00767f22a06aaa35e2b388a53030e988262f92c01` |
| V4 custody oracle | 3,788 / 179,603 | `3deaeb91839e4212e3f039c398f1b9a25b0ac92876356bdec5f56b8b380411e6` |
| `selftest` stdout | 1 / 58,915 | `31c1f31e85b0fd0f9d2b7d412c9717832582081a0f0077bc39af11f7740ef072` |
| `owner-proof` stdout | 1 / 53,063 | `ca4d8db9be029e9efcc89dc0621a615a53e2096fe46642a596d03e5c160007b4` |
| `contracts` stdout | 1 / 43,323 | `2f0af32faad55352421ed5d4749724138ddd4e1bf1d28d9882b0b87c5c3478db` |

The reproduced selftest includes the exact lifecycle order and the mode proof
`bareCandidateArgvToken=true`, `protocol=D7C2-v3`, the ordered eleven modes,
and `dashedMutantsRejected=33`. `owner-proof` retains the exact lifecycle order
and rejects ten injected failures plus 83 owner mutants. The frame oracle still
accepts two canonical streams and rejects the same 76 named frame mutants.

## Author verification and boundary

The author reproduced:

- candidate range, parent chain, two commit trees and subjects;
- exactly one changed sheet and exact `+263/-66` range delta;
- sheet blob, bytes, lines, SHA-256, and stable patch-id;
- LF-exact fence sizes and hashes;
- duplicate-key-rejecting spec parse and Python compile;
- successful `selftest`, `owner-proof`, and `contracts` executions; and
- `git diff --check c6afab2..9b5e6b5` with no output.

No product, test, script, dependency, workflow, or policy path is in the
candidate range. The author did not run `bash scripts/ci.sh`, the privileged
real-host custody matrix, Docker, or CP1 GREEN for this documentation-only
design correction. Those lanes are not green and cannot be inferred from the
deterministic oracle runs.

## Required independent disposition

The reviewer must authenticate the exact range and separately adjudicate:

1. archive/Docker/output/test/cleanup order and actual fd-4/seal causality;
2. bare-mode closure and complete D7C2 test framing without invented evidence;
3. exact expectation-ledger construction and non-exposure to the candidate;
4. concrete identity/argv/review-base handoff sufficient to form all eleven
   CP1 commands; and
5. preservation of every still-applicable Trial 8 custody, deadline, Docker,
   reconciliation, EOF, and cleanup invariant.

Write `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-9_result.md`, replace only the
pending Trial 9 index cell with the immutable verdict link, and commit those
two evidence paths explicitly. `reviewed_OK` is available only if the sheet is
executable without hidden input, phase, protocol, or evidence choices.
Otherwise issue `reviewed_KO` with exact mechanism evidence and the smallest
required correction. Do not edit the candidate sheet or any implementation,
test, script, dependency, workflow, or policy path.
