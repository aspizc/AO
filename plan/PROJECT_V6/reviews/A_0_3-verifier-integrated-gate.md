# A/0/03 Scope 0 integrated gate

Date: 2026-10-08. Candidate `release/1.1.0` commit
`b9b8bbdcbccc41c98b86f4fb3fd2bc87d95086f7` integrates the independently
reviewed release-verifier prerequisite (`A_0_3-verifier-1_reviewed_OK.md`).
This is Scope 0 only, not completion of A/0/03 or authorization to tag.

The root ran `bash scripts/ci.sh` on that exact commit with the repository
virtualenv, the pinned `tmux 3.6a-agents.3` binary
(`6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`),
an isolated `TMUX_TMPDIR` and bootstrap session, `D007C_TEST_TMUX_PATH` and
`D007C_RUN_REAL_TMUX_PROBE=1`, and a disposable `redis:7.2-alpine` container
on an ephemeral local port. The shell trap stopped that container and tmux
server. No existing user tmux or Redis service was used or stopped.

Final gate: exit **0**, **2,955 passed, 0 failed, 12 skipped** of 2,967.
The required Redis lane passed **22/22**. The 12 skips are nine declared
PostgreSQL cases and three declared Gateway/Temporal integration cases. The
optional real-provider lane was not enabled. Aggregate status is
`infrastructure_unavailable` solely for those declared unavailable cases;
`errors` is empty. Public hygiene found zero findings.

Final raw log SHA-256:
`ad281248fa5638931ef21eb31ccd15fc9b2fb1451f6daede939e1e3ffa702f82`.
Archived log: [evidence/A_0_3-verifier-integrated-gate.txt.gz](evidence/A_0_3-verifier-integrated-gate.txt.gz),
compressed SHA-256
`8f43599cd28660b1290d3ffc8d26502459b528edcbc95a62ac0b170cd73cb14b`.

Earlier attempts on the same commit were **not** successful gates:

| Attempt | Exit | Result | Cause |
|---|---:|---|---|
| Unprepared host | 1 | 1,835 passed, 31 failed, 10 skipped | Virtualenv executables were absent from `PATH`; tmux was not pinned. |
| Virtualenv plus obsolete tmux `.1` | 1 | 2,906 passed, 26 failed, 13 skipped | Guarded paste/submit tests require tmux `.3`; the real retained-channel probe was skipped. |
| Pinned tmux `.3`, no Redis | 1 | 2,933 passed, 0 failed, 12 skipped | The required live Redis lane was unavailable. |

These attempts did not change tracked source. Their raw `/tmp` logs are
SHA-256 `92e7d52ebcabf9d34aa7cb3445e30add5680538a45ec94938ba0ffd347c428ee`,
`7b2f561911cc8ed2633cbad20400bfbd1697841160e4779237b2b2e8612ea579`,
and `71014ca161eb91b66443ac97777d6694ea0aebb26237d3681c96e5bb148a8103`,
respectively. The final gate used the documented runtime and required service.

Remaining for A/0/03: release assembly, exact final candidate gate, promotion
and tag/main identity proof under the sheet's later scopes. Other V6 leaves
remain open.
