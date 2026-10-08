# Review A_0_4-live-startup-merge-1 — OK (merge candidate only)

**Reviewer:** independent Claude Opus 5.5 (medium) merge-review session, no
subagents.
**Trace:** `tr-v6-a04-startup-merge-r1-0bbb9fd9-5794-4fb9-8274-5b1dd3f7d1f1`
**Task:** `ts-af392c9d-484f-433d-8013-cd3880f1635c`
**Request:** [A_0_4-live-startup-merge-1_to_review.md](A_0_4-live-startup-merge-1_to_review.md)
**Commit:** none. Uncommitted staged merge on `release/1.1.0`.

## Scope

This verdict covers only the correctness of the staged merge of
`feat/V6-A-0-04-live-startup-profile` into `release/1.1.0`. It is not a full
`ci.sh` gate, an integration claim, a status promotion or a release claim.

## Merge identity

- `HEAD` = `fa6da7c45db61e148826288d552f10a98d5199a2` (first parent).
- `MERGE_HEAD` = `097f2e2ac8f1676fbca4adce3af14f0b29e22bf4` (second parent).
- `git merge-base HEAD MERGE_HEAD` = `b4506d26950ce7b9a6af92fc63c8c56db4daea09`.
- `git write-tree` = `aba56557839eca63b097bbfeef4f0e9668979336`.
- `git ls-files -u` is empty, so there are no unmerged entries.
- I reproduced the merge independently with
  `git merge-tree --write-tree fa6da7c 097f2e2`. It gives the same tree,
  `aba56557…`.
- Worktree vs index: no tracked differences. The only untracked path is the
  merge handoff.

## Both parents preserved

- **First parent (A/0/05 side):** `b4506d2..fa6da7c` touches only 2 paths:
  `reviews/A_0_5-pre-live-gate.md` and
  `reviews/evidence/A_0_5-pre-live-gate.txt.gz`. `git diff 097f2e2 aba56557`
  is exactly those 2 additions. The first parent's changes are present, and
  nothing else differs from the second parent.
- **Second parent (A/0/04 side):** `b4506d2..097f2e2` touches 80 paths. For
  each one, the staged blob equals the `097f2e2` blob (0 mismatches).
- **Overlap:** neither parent changed any of the same paths. No path needed a
  content merge, including `reviews/README.md`, `gateway/README.md`,
  `base_adapter.js` and `tests/gateway/prompt_submission.test.js`.
- **A/0/05 code and status kept:** `git diff fa6da7c aba56557` outside
  `plan/` has 8 paths, all from A/0/04. `gateway/README.md` and the test file
  are additions only. `base_adapter.js` has +206/−2. The 2 removed lines are
  the trial-1/2 warning-draft row check and its return statement, which A/0/04
  replaced on purpose. Both are in the reviewed trial diffs. No A/0/05
  recovery path is touched.
- **Review index:** the second parent adds 5 rows to `reviews/README.md`
  (live-startup-1 through live-startup-5). It removes no rows. The A/0/05
  root-merge-1, A/0/01 status-1 and A/0/05 integration-1 rows are still
  there, word for word.

## Binding to reviewed A/0/04 work

- The branch is linear on the base: `71425f1` (trial-1 KO), `82f8e74`,
  `fecc3e5`, `3504b49` (trial 4), `097f2e2` (trial 5).
- Trial-5 OK reviewed code tree `0a243817…`. Its diff to `097f2e2` under
  `gateway tests cli orchestrator-langgraph scripts` is empty. The only
  differences are the 18 committed trial-5 evidence files under
  `reviews/evidence/`.
- Trial-5 OK reviewed full tree `6378ef47…`. Its diff to `097f2e2` is the
  trial-5 verdict file and its index row (+241, additions only).
- The staged `base_adapter.js` has SHA-256 `bc039cb5…99e7`. This equals the
  value in the trial-5 verdict and the handoff.
- The trial-4 OK commit `3504b49` is an ancestor of `097f2e2`. Trial 5 built
  on it.

## Checks run

| Check | Result |
|---|---|
| Changes under `policies/`: base→staged, HEAD→staged, base→MERGE_HEAD | none |
| `git diff --cached --check` | clean |
| `python3 scripts/check_public_hygiene.py` on the worktree (= index) | exit 0, 0 findings |
| `node --test tests/gateway/prompt_submission.test.js` on the staged content | 166/166 pass, 0 skipped |

`ci.sh` was not run.

## Private live evidence (inspected read-only, nothing copied)

I read the run directory named in the handoff. I copied nothing from it into
the repository. I list no private paths, nonces or identities here.

- The probe checkout's `base_adapter.js` has SHA-256 `bc039cb5…99e7`, the same
  bytes as the staged adapter.
- `protected-before.json` and `protected-after.json` both have SHA-256
  `efe33b21…82b0`. This matches the handoff.
- `evidence.jsonl` has 88 events:
  - 2 `real-response-observed` events, at the first-prompt and after-prompt
    stages. In both, the ACK equals the reversed challenge nonce. I checked
    this as a boolean only.
  - `restart-signal`, then `gateway-exited-child-pane-server-survived`, then
    `restart-after-discovery-denials`, `reattached-state` and
    `restart-readiness`.
  - `cleanup` = `EXACT_OWNED_IDENTITIES_ABSENT`.
- In `recovery-cleanup.json`, `guardStatus` = `UNCHANGED` and
  `cleanupStatus` = `EXACT_OWNED_IDENTITIES_ABSENT`.
- I did not independently re-check the same-principal and same-repository
  reattach semantics beyond the event sequence. I also did not re-check that
  the probe ran Codex with the reviewed tree itself, rather than only the same
  adapter bytes. Treat the live claim as operator-run evidence, consistent
  with the private artifacts. It does not take the place of the root-owned
  live acceptance record.

## Verdict

**OK — merge candidate only.** The staged tree `aba56557` is the exact
conflict-free union of both parents:
- The A/0/05 first-parent additions are present.
- All reviewed A/0/04 code, fixtures, tests, review trail and evidence from the
  second parent are byte-identical.
- No edits were lost, no review-index rows were dropped and `policies/` is
  unchanged.

Still outstanding and owned by the root:
- the merge commit
- the full `bash scripts/ci.sh` gate on the committed tree, with its skip
  budget
- the A/0/04 integration record and status promotion
- indexing this verdict
- any release or tag claim

I did not modify the staged merge, code, earlier reviews, policies or the
index. I made no commit and no push.
