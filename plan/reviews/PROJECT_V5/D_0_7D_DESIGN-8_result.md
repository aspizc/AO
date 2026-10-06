# Project V5 D/0/07d Design Trial 8 — independent review result

## Formal disposition

| Property | Adjudicated value |
|---|---|
| Review id | `D_0_7D_DESIGN-8` |
| Formal verdict | `reviewed_OK` |
| Candidate commit | `bc7e4d725d6ca379c367f3d8fbfca2844013e1d3` |
| Candidate tree | `a55df0adbec7ba15de1c189de376f6a299eaa9dc` |
| Sole parent | `a62ab24fe93af8ea3214d11fa31849541794b3b0` (immutable Trial 7 KO) |
| Request commit reviewed | `ccb857eebe2afd1302b1d2edb2293b2404fd1801` |
| Sheet blob / SHA-256 | `d1b01e9af747fd56177e88a18748426bcdad43b1` / `ca4883a396898dfe33c1e2f93d5ae337887e5b9c8114b856e021768e4f7b5dcd` |
| Stable patch-id | `c363c472ca7bacc889a60a03d0fcf4426b1b1093` |
| Independent reviewer | fresh Claude `claude-fable-5` session, branch `review/V5-D-0-07d-design-t8-fable` |
| Verdict session trace / task | `tr-v5-d007d-design-t8-9a494198-c4da-4add-b309-70e8a409be1f` / `ts-8c90209d-b235-4622-a834-cf658979d6ed` |
| Request trace (author session, no review authority) | `tr-v5-d007d-design-t8-ec8cc47b-3fe0-4bd3-8c32-a439fdc2d9d1` |

Candidate `bc7e4d7` is formally **`reviewed_OK`** for Design Trial 8. Every
identity value, all four corrected blockers, the Trial 7 provenance
disclosure, and all seven conjunctive Trial 6 seams were independently
reproduced or mechanically authenticated in this session. This verdict is
design/plan authority only: it makes no implementation, integration, CI-pass,
promotion, release, or support claim, and Checkpoint execution remains
governed by the sheet's own reviewer-custody gates.

## Authentication

- HEAD of this review worktree is `ccb857e`; `git cat-file` confirms
  candidate `bc7e4d7` carries tree `a55df0a` and sole parent `a62ab24`.
- Candidate delta is exactly one file, `plan/PROJECT_V5/D/0/07d.md`,
  88 insertions / 56 deletions; `git patch-id --stable` reproduces
  `c363c472ca7bacc889a60a03d0fcf4426b1b1093`; `git diff --check` is clean.
- Sheet blob `d1b01e9…` and SHA-256 `ca4883a3…b5dcd` reproduce from
  `bc7e4d7:plan/PROJECT_V5/D/0/07d.md` (6,360 lines).
- Trial 7 provenance: the immutable Trial 7 result at `a62ab24` was not
  rewritten; its `Request trace` line still reads
  `tr-v5-d007d-design-t7-7e448e92-917f-4497-ad19-986b54de2bd5` exactly as the
  request discloses. Commit `5a98b22` exists; `a62ab24` is its import on this
  lane and remains the sole parent. The disclosure grants no authority to any
  request trace, matching this result's own request-trace/verdict-trace split.

## Blocker adjudication (all four corrected)

1. **P0 — prospective authority only.** Sheet Checkpoint 1 states work begins
   only after `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-8_result.md` records
   independent OK for the exact Trial 8 candidate, and that Design Trials 1–7
   are immutable KO/historical evidence granting no implementation authority.
   Reviewer-custody extraction is pinned to the Trial 8 blob/digest above; no
   KO trial is mislabeled as approved. **Closed.**
2. **P1 — integration baseline and inventory.** Independently reproduced from
   commit `07556feb30aafe4040382993bc199bb9fe0bcd97`
   (tree `8368598438ef0dda88f6a43fc7fdaa190d576841`) using its own
   `ci/suites.json` include/exclude globs with segment-aware `**` matching
   over the full tracked pathset, sorted, LF-joined, no terminal LF:
   `test.gateway` = 126 paths, `f6bf19a001a01341c9dad63ab55f21bfd7b68571565b061f42b4a0e097f3922e`;
   plus the sole planned path
   `tests/gateway/process_supervisor_session_port.test.js` (absent from the
   baseline) = 127 paths,
   `1dd0cc26a0f8c165e4ff536641acf470b7b6c7ad17342450027cdaa9fff2431d`;
   `lint.gateway` = 83 paths, unchanged
   `854bc480c875e835c81de3b1a0f7e0865f01304c7f570a2a6ec56b69db2e7cd4`.
   The sheet freezes exactly this single `inventorySha256` refresh and no
   other suite value. The seven declared `07a–c` paths produce an empty
   `git diff` between `d0bf521` and `07556fe` and resolve to the seven listed
   blobs in the sheet's exact order (`b0100b6…` … `58b4e71…`). **Closed.**
3. **Unadjudicated C — D007C path shape.** Verified in both the sheet
   contract and the executable oracle `bwrap_argv`: the verified custom
   binary mounts at `/inputs/tmux` (fd-bound when output is present) while
   `D007C_TEST_TMUX_PATH` is set to the absolute containing directory
   `/inputs`, jointly with `D007C_RUN_REAL_TMUX_PROBE=1` and
   `D007C_TMUX_SOCKET_NAME=d007c-control-probe`. **Closed.**
4. **Unadjudicated D — total provenance.** The sheet inherits no numeric
   `80/80`: authenticated Checkpoint 1 RED derives and freezes the complete
   ordered root-TAP test-name manifest, count, and canonical digest; GREEN
   must reproduce the same manifest/count with every test passing and zero
   skip/cancel; a run missing only the socket-name variable fails at
   `join-pane` and is recorded as false setup RED only. **Closed.**

## Deterministic evidence reproduced in this session

Fences extracted from the candidate blob with LF fidelity: V4 custody spec
126 lines / 5,480 bytes /
`1cb01a4287cb61c81adfb106e8ea058d2b217a7ef8972f6c311d2bbef1e969de`;
`BWRAP_ARGV_V3` text 23 lines / 1,323 bytes /
`87b9dfbe5730fcac337879d00767f22a06aaa35e2b388a53030e988262f92c01`;
V4 custody oracle 3,687 lines / 175,351 bytes /
`c24b6b31bc976daae905ed6ad37d3f140cee67afef83b4fc18f0b5b1ca20d116`.
Duplicate-key-rejecting JSON parse of the spec passed; the oracle compiles.
`CONTRACT_DIGESTS["bwrapArgvV3"]` equals the recomputed fence digest, and the
sheet binds the spec digest with a required reviewer recompute. Executed
stdout hashes reproduce exactly: `selftest` 1 line / 58,405 bytes /
`b8521d64…00eb7c3`; `owner-proof` 1 line / 52,841 bytes / `64311ff9…80599e`;
`contracts` 1 line / 42,933 bytes / `0503bf64…c7501d`.

## Trial 6 conjunctive seams — all adjudicated present

1. Two retained `socketpair(AF_UNIX, SOCK_STREAM|SOCK_CLOEXEC)` pairs bound
   to the sole production parent (sheet §channel custody; oracle
   `SOCKET_MECHANISM`, held parent/child endpoints).
2. Full pre-release authentication conjunction with no re-resolution: oracle
   `AUTHENTICATION_CONJUNCTS` enumerates MainPID/uid/gid/peer/pidfd/
   executable/argv/start-token/systemd-child/cgroup conjuncts plus
   `snapshotOnce` and `noAuthorityReresolution`.
3. Docker evidence bound to observed operation transcripts with derived
   reconciliation branches restricted to token counts 3/6/8/10
   (oracle branch validation).
4. One non-resettable `T0` with executable `10/60/700/100/40` slices under
   the 900-second outer deadline (`operationFormula`/`probeFormula`/
   `buildFormula`/`reconcileFormula`, `postReconcileReserve: 40`), residue
   scans at least 250 ms apart, and one cleanup per rejecting mutant.
5. Exact container argv with private Docker environment (selftest rejects
   non-private environments), direct child pidfd custody, held-dirfd/
   no-follow (`O_NOFOLLOW`) cidfile adoption, and direct build streaming into
   the retained output inode.
6. Production, contracts, attacks, finalization, and cleanup all route
   through the same `ParentCore` custody mechanism (owner-proof and
   contracts derive from the identical parent core).
7. Independent candidate cases `missing-d7c2-after-shim-reaped` and
   `missing-diagnostic-after-shim-reaped` are present and required to reject
   before `BOTH_EOF_ACCEPTED`.

## Boundary statement

The sheet contains zero executable `PENDING` markers and no hidden human
choice; every command, digest, deadline, and gate value is frozen. As the
request states, no `bash scripts/ci.sh`, host-custody, or privileged
real-host/Docker attack-matrix run was performed by the author, and none was
available to this plan review; those lanes are explicitly deferred to
reviewer-custody Checkpoint execution and are recorded here as not-run, not
green. This `reviewed_OK` authorizes proceeding under the sheet's Checkpoint 1
contract only.
