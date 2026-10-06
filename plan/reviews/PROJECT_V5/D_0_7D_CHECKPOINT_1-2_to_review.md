# Project V5 D/0/07d Checkpoint 1 — Trial 2 review request

## Requested reviewer

Assign a fresh independent reviewer that did not implement Trial 2. Review the
exact technical candidate against the immutable
[`Trial 1 request`](D_0_7D_CHECKPOINT_1-1_to_review.md) and
[`Trial 1 KO`](D_0_7D_CHECKPOINT_1-1_result.md).

This file is evidence, not a self-verdict. Trial 2 is **pending**. The
reviewer-owned `D_0_7D_CHECKPOINT_1-2_result.md` does not exist in this
submission. This request does not complete Checkpoint 1 or `D_0_7D`, and it
makes no integration, promotion, release, or support claim.

## Frozen identity, ancestry, and pathset

```text
Trial 1 request       5a29dabba37cb40193b0fdb59b4884bcda378bdc
Trial 1 KO/base       a6dc84052178fcdd934cb05ebdf99a8b1f6d5331
Trial 1 KO/base tree  53ce93e060b34fe35f050b1e1acb9e5b10388e9f
final candidate       b1e3877cc23fe045da10ab1ea087ba8afc8d816d
candidate tree        0447a2b7c3476815b1d4aa5413e8c777a24b33df
candidate parent      8967f3e37c7e80869cfe0a9526708f551bc48a55
request parent        b1e3877cc23fe045da10ab1ea087ba8afc8d816d
```

The Trial 2 range is a linear descendant of the immutable Trial 1 KO and
changes exactly four files:

```text
tests/gateway/process_supervisor_session_port.test.js
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_fixture_owner.js
tests/gateway/run_process_supervisor_session_port_real_host.sh
```

Exact candidate blobs:

```text
8d40b64156adbc9202942746543e676ac40c7d0e  tests/gateway/process_supervisor_session_port.test.js
dd46b54bbafb4eb7accdb19c8c5ad1fffdd8dca1  tests/gateway/process_supervisor_session_port_fixture.py
0a2f22de047a5c398e77facb643758c709b4e21d  tests/gateway/process_supervisor_session_port_fixture_owner.js
eb175af3d38fe4a60c2d2f15aa3e8697014d02dd  tests/gateway/run_process_supervisor_session_port_real_host.sh
```

No Trial 1 artifact, product adapter, policy, dependency, lockfile, suite
manifest, suite contract, CI script, workflow, or plan sheet changed.

## Trial 1 KO interpretation and correction

The Trial 1 KO remains immutable and correctly identified two fatal gaps:
every authority build invokes the wrapper as `--verify-extension <binary>`,
and the CP1 `full-ci` path invokes wrapper mode `--full-ci`. Trial 2 also
closed the unreviewed `--focused` defect: Trial 1's wrapper ran only the
dedicated suite instead of one serial invocation containing the dedicated,
PTY, and relay suites with all three D/0/07c real-tmux environment values.

The KO overstates one point: the frozen parent deliberately does **not** call
wrapper mode `--docker-integration`. It performs `--stream-build`, always
performs `--verify-extension`, and invokes `"--$mode"` only when the parent
mode is not `docker-integration`. Trial 2 therefore does not add a speculative
`--docker-integration` wrapper arm. This correction narrows the KO's reading;
it does not rewrite its evidence or relax the real Docker authority gate.

## What Trial 2 implements

- `--verify-extension <absolute-binary>` performs bounded discovery of
  `agents-capture-v1` with private `HOME` and `TMUX_TMPDIR`, fixed no-config
  argv, exact server cleanup, and residue rejection. It uses the supplied
  binary rather than ambient tmux.
- `--focused` sets `D007C_TEST_TMUX_PATH` to the directory containing
  `D007D_BUILT_TMUX`, sets `D007C_RUN_REAL_TMUX_PROBE=1` and
  `D007C_TMUX_SOCKET_NAME=d007c-control-probe`, and executes one serial Node
  test argv containing the dedicated, PTY, and relay suites before framing
  the result through the fixed coordinator.
- `--full-ci` uses the canonical absolute Bash and candidate
  `scripts/ci.sh` path in its own mode with the same three real-tmux values.
  The coordinator validates the canonical CI report and emits
  candidate-bound D7C2 evidence.
- CI framing rejects failed, erroneous, unreconciled, malformed, unexpected,
  or inconsistent reports while accepting only declared infrastructure
  unavailability with internally consistent totals.
- Test fixtures expose extension socket/server residue and prevent detached
  Git maintenance from escaping the owned harness process domain.

## Durable TDD chain

The following commits form the exact, unbroken Trial 2 sequence:

| Phase | Commit | Durable causal purpose |
|---|---|---|
| RED 1 | `19734b73cf303f8fd09f3f850e62c741af93e895` | Exposed rejected `--verify-extension`/`--full-ci` and the incomplete focused argv/environment. |
| GREEN | `0c1bbe741b484753af2295db28484e0e33b8eaf7` | Added the minimum wrapper/coordinator gate modes. |
| RED 2 | `3f72b1b71aa604469b2d642b992c341a6f66880b` | Reproduced private extension socket residue after probe completion. |
| Fix | `4f0eb1d53402105b022f7abb0a7e5add4959e331` | Cleaned and proved the private extension probe domain. |
| RED 3 | `547f782ad350649e483816aab1ca9520173fc691` | Reproduced nested TAP name/count mismatch. |
| Fix | `47375c4a707b93e065219cf3b2e0332f90f4e45f` | Counted nested TAP subtests consistently with the terminal summary. |
| RED 4 | `31900af1044817cd7a955da9e78bb9cde9815400` | Exposed missing canonical full-CI report validation and D7C2 framing. |
| RED 5 | `7f40e6fb1c03087246ee9644ecf34842e3b00ac0` | Exposed detached Git maintenance escaping the harness boundary. |
| Fix | `e6c206874cb3048fb0b63fce1f6e116ab545b9aa` | Disabled detached harness maintenance and retained process ownership. |
| RED 6 | `6e1dbf86e786a1fd852545c52b30c7eeb5745aa6` | Exposed a surviving private extension tmux server. |
| GREEN seal | `a1ca1f5ce27e84ba3747d95c7f6cabd0e826da9f` | Sealed extension cleanup and the reviewer-facing wrapper gates. |
| RED 7 | `8967f3e37c7e80869cfe0a9526708f551bc48a55` | Exposed rejection of a canonical report containing only declared infrastructure unavailability. |
| Final GREEN | `b1e3877cc23fe045da10ab1ea087ba8afc8d816d` | Accepted only the declared, reconciled infrastructure form while preserving every negative rejection. |

The behavioral tests assert emitted argv, environment, child effects, D7C2
frames, report fields, and residue. They do not accept source-text presence as
proof.

## Accredited candidate evidence

| Verification | Exact recorded outcome |
|---|---|
| Targeted dedicated suite | `19/19` passed |
| Real focused wrapper seal | rc `0`; `28,601` D7C2 bytes |
| `test.gateway` | `1604` tests, `1595` pass, `0` fail, `9` skips |
| End-to-end wrapper `full-ci` | exit `0`; `9,056` D7C2 bytes; SHA-256 `0b54f2b88933b01c36b744d276058d6ed2dd18673283150f6bc8b810a02722bf` |
| Canonical full-CI report carried by that wrapper run | `2574` tests, `2562` pass, `0` fail, `12` declared infrastructure outcomes |
| Post-run process check | zero D/0/07c or D/0/07d processes |
| Range/worktree hygiene | `git diff --check` clean |

The targeted `19/19` comprises the original 13 teardown/stream/custody
regressions plus six wrapper/report behaviors: bounded extension verification,
the complete focused argv, absolute full CI, canonical declared-infrastructure
framing, malformed/failing/unreconciled report rejection, and exit-one or
unexpected-report rejection.

## Explicitly not executed or credited

The coder/integrator did **not** execute the frozen V4 reviewer-owned authority
parent, its real user/mount/PID/cgroup custody attacks, the independently held
nine-attack RED/GREEN sequence, bootstrap-substitution authority proof, or the
real Docker probe/build/reconciliation transcript. None of those modes is
claimed GREEN, skipped, or replaced by candidate-owned `19/19`, focused, or
full-CI evidence.

The fresh reviewer **must** independently extract and authenticate the frozen
V4 authority artifacts and run every mandatory custody/Docker/attack mode. An
unavailable prerequisite is handled according to the frozen authority
contract; this request does not authorize treating it as candidate success.

## Required independent review

The reviewer must:

1. authenticate the candidate commit/tree, linear ancestry, exact four-file
   pathset, blobs, and every durable RED/fix/GREEN commit above;
2. reproduce the causal REDs and final `19/19`, focused, Gateway, and wrapper
   full-CI evidence, including D7C2 length/hash and zero residue;
3. verify the corrected parent dispatch: Docker integration uses
   `--stream-build` plus `--verify-extension` and never requires a speculative
   wrapper `--docker-integration` mode;
4. inspect private extension cleanup, exact focused/full-CI argv and
   environment custody, nested TAP accounting, CI reconciliation, and process
   ownership; and
5. run the independent frozen V4 custody/Docker authority gates before writing
   `D_0_7D_CHECKPOINT_1-2_result.md`.

Checkpoint 2 remains blocked unless that fresh result records OK for this
exact Trial 2 candidate.
