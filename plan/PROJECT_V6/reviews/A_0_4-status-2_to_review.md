# A/0/04 integration status — trial 2 review request

Date: 2026-10-08. Candidate is documentation-only on `release/1.1.0`, HEAD
`343222e`, after [trial 1 KO](A_0_4-status-1_reviewed_KO.md). The KO is immutable.

Corrections:

1. `plan/PROJECT_V6/README.md` names A/0/02's `7df29bd` and A/0/04's
   `343222e` separately and says five remain. `plan/README.md` and
   `plan/PROJECT_V6/SHEETS.md` agree: two integrated, five unfinished.
2. `plan/PROJECT_V6/HUMAN_DECISIONS.md` records the operator's 2026-10-08
   lift of the temporary no-Claude restriction and selection of Claude Opus
   5.5 medium. The A/0/04 sheet checks each acceptance criterion with evidence
   and replaces its stale deferral paragraph.
3. `docs/project-status.md` qualifies the live source hash: it predates the
   independently reviewed syntax-only trial-18 lint correction.
4. The root gate record names the aggregate `infrastructure_unavailable`
   status from 12 permitted skips and links a durable compressed copy of the
   complete log. Decompressed SHA-256 matches the recorded raw-log hash.

The branch has no code/test/policy changes. Reviewer: verify each KO item,
links and exact SHAs; reproduce public hygiene, inventory validation and
`git diff --check`; inspect the log archive and status claims. Write one
immutable trial-2 OK or KO verdict and index it. No commit, push, tag or
full gate. A/0/05 and the other four V6 implementation/release sheets remain
open.
