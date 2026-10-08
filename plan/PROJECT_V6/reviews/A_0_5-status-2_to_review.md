# A/0/05 integration status: trial 2 review request

Base: `be320891cb9b35d168a058eb0f6e451e870f6e83` on `release/1.1.0`.
It adds only the immutable trial-1 KO trail to the previously gated code at
`7982e42`. The current uncommitted candidate updates seven public status
documents and adds `A_0_5-integrated-acceptance.md`; no production code or
policies changed.

Read [trial-1 KO](A_0_5-status-1_reviewed_KO.md) as the correction contract.
Trial 2 fixes:

1. `plan/README.md` and the later planning-boundary paragraph in
   `docs/project-status.md` now include A/0/05 among the integrated sheets
   and name A/0/06 plus A/0/03 as the two unfinished V6 sheets. A separate
   `plan/README.md` phrase about three remaining **V7** sheets remains
   historical V7 status, not a stale V6 count.
2. Root `README.md` now qualifies recovery as Linux local stdio/SQLite for
   the same OS principal, machine and state.
3. The A/0/05 sheet explicitly distinguishes its historical plan-only
   refinement note from the later integrated acceptance.

The gate/live evidence and code tree are unchanged from trial 1. Check all
public V6 status surfaces, the seven acceptance boxes, relative links,
English, public hygiene and `git diff --check`. Issue one fresh, independent
`A_0_5-status-2_reviewed_OK.md` or `_reviewed_KO.md` with evidence and
limitations. Do not edit candidate, prior trail, index, code or policies;
do not commit or push.
