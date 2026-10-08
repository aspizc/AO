# A/0/05 release-branch merge — review request 1

Date: 2026-10-08. `release/1.1.0` is mid-merge with target parent
`3e97d7043b07fa74cbdaa7a5e129fdc1544f3ecb` and source parent
`28fd256ee348492d8568f2a2a7be4b7cea18e94b`
(`integration/V6-A-0-05-reconcile`). The source is the independently reviewed
A/0/05 reconciliation commit with merge parents `69f222f` and `fbc4293`;
its `A_0_5-integration-1_reviewed_OK.md` is candidate-only, not a release
claim.

The sole conflict is `plan/PROJECT_V6/reviews/README.md`: target added the
A/0/01 post-integration status row, source added the A/0/05 integration
verdict row. Both rows are kept verbatim, in that order. The resolved staged
tree before this request is
`fd45d83e0fe36af32aac51706a650695ccd00fd5`.

Independent reviewer: verify exact parents, sole overlap, exact row union,
all target-only paths equal target parent, all source-only paths equal source
parent, no `policies/` edit, no unmerged entries, inventory validation and
hygiene, and `git diff --cached --check`. Check that no reviewed A/0/05 source
or reconciliation code changed in this release-branch merge. Write immutable
`A_0_5-root-merge-1_reviewed_OK.md` or `_KO.md` and index it. Do not commit,
push, tag, or assert A/0/05 integrated before the committed-tree gate and live
acceptance.
