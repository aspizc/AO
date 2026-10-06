# Project V5 G/0/02 WIRING-B EPOCH-CORE/MIGRATIONS Trial 1 — operator clarification

This append-only clarification supersedes one tooling-environment sentence in
`G_0_2_WIRING_B_EPOCH_CORE_MIGRATIONS-1_to_review.md` at request commit
`1304684fcc41d1a15b8bd6f8776fa280b13b29d1`. It does not amend that immutable
request and does not change the RED or GREEN candidate.

The request says that the untracked `gateway/node_modules` symlink “remains
untouched.” That statement is inaccurate. After the ordinary npm lint wrapper
proved that the symlink targeted the repository-root incomplete installation
and fell back to system ESLint `v6.4.0`, the operator repointed only that
untracked symlink to the preserved Trial 22 `npm ci` installation at:

```text
/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-c003-t22-parser/gateway/node_modules
```

The intervention is recorded under orchestration trace
`tr-v5-g002-epoch-core-migra-d760bb92-ff9a-4983-b608-6c56002bfc50` and session
`ag-tr-v5-g002-epoch-core-mi-codex-coder`. Repository-local ESLint `v10.8.0`
was then invoked explicitly and completed the changed-file and Gateway lint
checks recorded by the request.

The symlink remains untracked and is absent from RED `972e427269a56a172b751e03e4a01ab18515aec9`,
GREEN `1787547c56a1329c261974aef1e4ae2a1ec0f62b`, and request
`1304684fcc41d1a15b8bd6f8776fa280b13b29d1`. No tracked source, test, migration,
manifest, policy, dependency, or review artifact was changed by the tooling
intervention. The independent reviewer must authenticate this clarification
and must not treat the superseded “untouched” sentence as evidence.
