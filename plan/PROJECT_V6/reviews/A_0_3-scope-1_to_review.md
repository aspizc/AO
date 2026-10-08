# A/0/03 existing V7 lineage: plan change review request

Base: `b2ed3af0fff38aa2be3dfff2c2e1cd84c23ccff0` on `release/1.1.0`.
Read [changelog trial 1](A_0_3-changelog-1_reviewed_OK.md) and inspect the
uncommitted diffs of only `plan/PROJECT_V6/A/0/03.md` and `CHANGELOG.md`.

The release branch selected by the operator descends from 1.0.0 and already
contains reviewed PROJECT_V7 A/0/00 and A/0/01 integrations. The original
A/0/03 non-scope line said no feature beyond six V6 leaves. This plan
clarification makes the two existing V7 foundations explicit in the candidate
and acceptance review, while continuing to exclude new V7 runtime work. The
changelog includes both and now names the capacity sheet id. Verify the V7
commits, verdicts, sheet statuses, ancestry, changelog baseline and absence of
any unreviewed runtime addition. Reject if this would silently broaden release
scope beyond work already reviewed and integrated or misstate A/0/06's open
live acceptance. Check English, links, public hygiene and `git diff --check`.

Issue an independent `A_0_3-scope-1_reviewed_OK.md` or `_reviewed_KO.md` with
evidence and limitations. Do not edit candidate, prior trail, index, code or
policies; do not commit or push. This is plan/changelog review, not the final
candidate-bound release verdict.
