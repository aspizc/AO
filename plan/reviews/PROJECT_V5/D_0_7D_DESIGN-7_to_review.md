# Project V5 D/0/07d Design Trial 7 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-7`.
- Candidate: `f2b19488b267f6b94ae570c4acba148464d38774`.
- Candidate tree: `644f458030051981a152c45500db26f6bfbfb166`.
- Sole parent: `88270d7d3567989d69f1dcb0262363db34bc349b`
  (immutable Design Trial 6 `reviewed_KO` result).
- Candidate branch: `plan/V5-D-0-07d-rebaseline`.
- Trace: `tr-v5-d007d-design-t7-7e448e92-917f-4497-ad19-986b54de2bd5`.
- Candidate delta: only `plan/PROJECT_V5/D/0/07d.md`, 1,864 insertions
  and 231 deletions.
- Sheet blob: `a9e0ec74df9abf19ea7c8f0b5b24ce85d290c73d`.
- Sheet SHA-256:
  `60ef16700cb971f2382496f74ac2209e2c181002d449118f6ada1e7f426384d9`.
- Stable patch-id:
  `1976bd201f630d5ca33696760e7583ec6ca5dc4b`.

A fresh independent reviewer must authenticate these values and write only the
immutable Trial 7 result plus its index verdict. The author, this request,
messages, hashes, and deterministic transcripts are untrusted inputs, not an
OK. This request makes no implementation, integration, promotion, release, or
support claim.

## Trial 6 findings to adjudicate

Trial 6 is immutable `reviewed_KO` at parent `88270d7`. Trial 7 claims to close
its complete P0/P1 register; the reviewer must decide each seam independently:

1. Use two retained Unix stream socketpairs and bind their custody to the sole
   executable production parent.
2. Authenticate MainPID, reviewer uid/gid, peer credentials, pidfds, held
   executables, argv, start tokens, direct systemd child, cgroup identity, and
   a no-reresolution snapshot before release.
3. Bind Docker evidence to the observed operation transcript, not a reported
   constant; require exact ten operations per role and the derived
   reconciliation branches 3/6/8/10.
4. Enforce one non-resettable T0 and the executable 10/60/700/100/40 slices
   under the 900-second outer deadline, including separated scans,
   finalization, and exactly one cleanup.
5. Use exact container argv, private Docker environment, direct child pidfd
   custody, held-dirfd/no-follow cidfile adoption with metadata and
   run/role/name/candidate binding, and stream build stdout directly to the
   retained output inode.
6. Route production, contracts, attacks, finalization, and cleanup through the
   same parent custody mechanism.
7. Include candidate-owned public mutation-sensitive cases named
   `missing-d7c2-after-shim-reaped` and
   `missing-diagnostic-after-shim-reaped`, each rejecting independently before
   `BOTH_EOF_ACCEPTED`.

Any unresolved P0/P1 seam is KO. Strong evidence in another seam cannot
average it away.

## Frozen deterministic evidence

The reviewer must extract the spec and oracle from the candidate sheet with LF
fidelity, compile the oracle, and reproduce the commands in the sheet rather
than trusting this table:

| Evidence | Lines / bytes | SHA-256 |
|---|---:|---|
| V4 custody spec | 126 / 5,480 | `8a57001c...` |
| V4 custody oracle | 3,687 / 175,394 | `84373c02...` |
| selftest stdout | 1 / 58,405 | `18e59298...` |
| owner-proof stdout | 1 / 52,841 | `64311ff9...` |
| contracts stdout | 1 / 42,933 | `cafbcb0d...` |

The candidate claims zero executable `PENDING`, exact B2 20-operation
evidence, the 3/6/8/10 branches, the absolute-deadline proof, both missing EOF
cases, and the exact three-variable D007C real-host gate contract:

```text
D007C_TEST_TMUX_PATH=<absolute verified custom tmux directory>
D007C_RUN_REAL_TMUX_PROBE=1
D007C_TMUX_SOCKET_NAME=d007c-control-probe
```

With all three variables the current integrated root independently ran the
two session-port suites at 80/80 with zero skips. Omitting the socket name can
couple to the user's default tmux server and is not an authoritative RED.
Review the design's executable requirement and its mutation sensitivity; do
not relabel that already integrated product lane as Trial 7 implementation.

## Verification and failed lane boundary

The author reports: extracted spec/oracle checks green; selftest,
owner-proof, contracts and B2/C/D assertions green; planner contract 5/5;
zero `PENDING`; `git diff --check` clean; one-file scope clean. Reproduce these
from the frozen candidate and inspect mechanisms, not only transcript hashes.

The author's `bash scripts/ci.sh` attempt is explicitly **not passing
evidence**: the unbootstrapped plan worktree reported 693 tests / 604 passed /
91 failed / 1 skipped, including missing Node and Python dependencies and
system Ruff drift. A reviewer may bootstrap or reuse read-only dependency
stores and the locked `.venv`, but must record the exact environment and must
not turn the author's failed run into pass credit. Aggregate product CI is not
a substitute for the plan-specific deterministic and semantic review.

## Required disposition

Write `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-7_result.md`, update only the
pending Trial 7 index row, and commit those two evidence paths with an explicit
pathspec. `reviewed_OK` is available only if all Trial 6 P0/P1 findings are
mechanically closed and the plan is executable without a hidden human choice.
Otherwise issue `reviewed_KO` with exact line/mechanism evidence and the next
required correction. Do not edit the candidate sheet or any product, test,
script, dependency, workflow, or policy path.
