# A/0/04 live startup: release-branch merge candidate

Review the uncommitted `release/1.1.0` merge of reviewed branch
`feat/V6-A-0-04-live-startup-profile` into the release branch.

- First parent: `fa6da7c45db61e148826288d552f10a98d5199a2`.
- Second parent: `097f2e2ac8f1676fbca4adce3af14f0b29e22bf4`.
- Merge base: `b4506d26950ce7b9a6af92fc63c8c56db4daea09`.
- Staged merge tree before this request: `aba56557839eca63b097bbfeef4f0e9668979336`.
- Git reports an automatic merge with no unmerged paths. The staged diff has
  80 paths; none are under `policies/`; `git diff --cached --check` passes.
- The staged `base_adapter.js` SHA-256 is
  `bc039cb5fbdbb29dc6bd90cba66c0596043acc70a934201b04184dd10b3699e7`,
  equal to the trial-5 reviewed branch and the byte-identical live probe.
- The private live probe (same adapter bytes) completed two automatic asks,
  exact reversed-nonce replies, Gateway SIGTERM/restart, explicit same-principal
  and same-repository reattach, and exact owned-process cleanup. Protected
  inventory before and after: SHA-256
  `efe33b21b6187032e13becebb3cdbdd085dfc283cde0eac411571f2dd90282b0`.
  The raw run remains private at
  `/tmp/ao-a04-live-probe/workspace/a05-live-acceptance/run-72b4e312bb5e/`;
  it contains private paths and nonce material and must not be copied into
  the public repository.

Check that the staged tree preserves both parents' unique changes and the
reviewed A/0/04 code/evidence, with no policy change or review-index loss.
Confirm the live claim from the private evidence only if it is available to
the reviewer; otherwise mark it operator-observed and keep the review's claim
to merge correctness. Record an independent immutable verdict under
`A_0_4-live-startup-merge-1_reviewed_OK.md` or `_reviewed_KO.md`. The full
`ci.sh` and integration/status promotion remain root-owned after the merge.
