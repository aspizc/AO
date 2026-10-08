# A/0/05 integration status and live acceptance review request

Candidate: uncommitted documentation/status change on `release/1.1.0` at
`7982e422577ad6dfb37ef0c7b1e3c8433735430a`. Source code is unchanged.
Review the new [committed-tree acceptance](A_0_5-integrated-acceptance.md)
and status changes in `README.md`, `docs/project-status.md`,
`plan/PROJECT_V6/{README.md,SHEETS.md,A/README.md,A/0/05.md}`.

The release-branch code merge `b4506d2` and A/0/04 live refinement merge
`7982e42` have independent OK verdicts. `bash scripts/ci.sh` on `7982e42`
exited 0 with 3,265 passed, 0 failed and 12 declared infrastructure skips
(nine PostgreSQL, two Gateway integration, one Temporal). Redis passed 22/22;
public hygiene found 0. Its raw private output has SHA-256
`c7091f1c3c1d8758814d9fb2fbd60f3103220f20185bcaa0bebe5ff7f906d600`.

The operator-run live harness used the byte-identical adapter, a private
Linux local stdio/SQLite Gateway and one real Codex 0.160.1 supervised child.
It completed two automatic asks with exact replies, Gateway SIGTERM/restart,
explicit reattach and same-child view. The independent A/0/04 merge reviewer
inspected private evidence read-only and confirmed challenge/reply equality,
the event sequence and cleanup hashes. The operator owns the principal and
repository-binding live claim; the private evidence is intentionally excluded
from the public snapshot.

Please independently verify the seven A/0/05 acceptance boxes against the
reviewed A/0/05 trail, candidate gate, private live run if available, and
the support boundary. Check that public status surfaces agree at five
integrated/two unfinished, all relative links resolve, no release/promotion
claim is made, no private paths or secrets have been copied, and `policies/`
is unchanged. Give an immutable `A_0_5-status-1_reviewed_OK.md` or `_KO.md`
with exact evidence and limitations. Do not edit the candidate, index,
policies or any prior review; do not commit or push.
