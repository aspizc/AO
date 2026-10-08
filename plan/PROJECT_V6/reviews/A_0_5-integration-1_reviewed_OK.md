# Review A_0_5-integration-1 — OK (merge-candidate only)

**Task:** plan/PROJECT_V6/A/0/05.md (integration reconciliation onto release/1.1.0)
**Trial:** integration-1
**Branch:** integration/V6-A-0-05-reconcile (dedicated worktree `wt-v6-a05-integration`)
**Commit:** none — staged, uncommitted merge of MERGE_HEAD `fbc4293` onto HEAD `69f222f`
**Reviewer:** Claude reviewer agent (independent session; not the coder)
**Date:** 2026-10-08

## Summary

The staged merge candidate binds exactly to the parents and tested tree that the
request names. The only conflicts are the three regenerated or indexed paths. Every
one-sided path is byte-identical to its parent. A04 guarded ask, A00 write access,
A01 markers and A05 reattach/cleanup are all preserved semantically. The one
production change, in the tmux creation observer, is narrow and necessary: on the
automatic merge, every non-dry-run Linux spawn with markers under a request binding
threw `unsupported tmux creation observation`. RED and the 633-test focused GREEN
were reproduced independently. **OK as a merge candidate only.** This verdict grants
no integration, promotion or release status.

## Checks

- [x] Candidate binding. `HEAD` = `69f222f8…` (tree `9077ba00…`). `MERGE_HEAD` =
  `fbc42932…` (tree `df1eb600…`). Merge base = `b06f1f6b…`. No unmerged entries,
  no unstaged tracked changes and no untracked files. I removed the 15 request
  files (request, manifest and 13 archives) from a copy of the index. `git
  write-tree` on that copy gives exactly the tested tree `27515157…`.
- [x] Manifest. The 353 `changedPathsAgainstTarget` match the staged diff against
  HEAD exactly; the 15 files above are the only extra paths. All 353 SHA-256 values
  match both the working file and the index blob (0 mismatches). All 13 evidence
  archives match their `sha256` (gz) and `rawSha256` (decompressed) values and are
  staged byte-identically.
- [x] Conflict union. `git merge-tree` reports conflicts exactly in
  `ci/suites.json`, `gateway/contracts/mcp-tools-v1.json` and
  `plan/PROJECT_V6/reviews/README.md`. Nine paths changed on both sides; six of
  them auto-merged.
- [x] One-sided paths. Every target-only path equals HEAD. Every source-only path
  equals MERGE_HEAD, except `tests/gateway/request_context_reattach.test.js`, the
  declared correction. The `A_0_5-4_*` and `A_0_5-close-1_*` trail files equal
  MERGE_HEAD byte-for-byte.
- [x] Diff from the automatic merge (`b383d4b`) to the index. It touches only the
  declared paths:
  - the two inventory digests;
  - the projection digest;
  - the three conflict-marker blocks removed from the reviews README;
  - the README count changed from 33 to 34;
  - the observer change (+6/−2);
  - the reattach test (+54/−3).

  `request_context.js`, `agent_service.js`, `catalog.js` and
  `tool_catalog.test.js` equal the automatic merge.
- [x] Both parents' additions are preserved. A line-level check over the six
  auto-merged files found no lines that either parent added since the base missing
  from the merged files. The only exceptions are the two intended observer lines.
- [x] `policies/`: no staged changes, and neither parent changed it. No A06 paths
  are touched.
- [x] Tests. I reran them on the host with Node v22.22.1 and pinned tmux
  `3.6a-agents.3` (SHA-256 `6487f795…`, matching the request).
- [x] Global invariants: English text; no push or commit; MCP server name
  unchanged; no `orchestrator/`; logs unaffected.

## Semantic verification

1. **A04 guarded ask.**
   - `base_adapter.js`, `codex_adapter.js`, `claude_adapter.js` and the other
     adapters are byte-identical to HEAD.
   - `CodexAdapter.ask` still calls `submitPrompt`.
   - `catalog.js` keeps `AGENT_PROMPT_NOT_SUBMITTED` in the `agent.ask` allowlist
     and keeps its message.
   - Service `ask` keeps A05's revalidation of the request binding before and after
     the awaited calls, around the unchanged adapter call.
2. **A00 permissions.** In `agent_service.js`, both delegate and spawn keep these A00
   elements:
   - `resolveCliWriteAccess`;
   - the fallback to a `read-only` Codex sandbox;
   - `writeAccess` in every provider's result field list;
   - the strict `writeAccess` equality check.

   A05's ordering is retained: settle the launch, then validate the result, and
   settle again on failure. A spawn whose result fails A00/A01 validation therefore
   reaps its observed child through the catch path.
3. **A01 markers.**
   - `assertSpawnResultContract(result, execution)` still validates `newSessionArgv`
     data properties, the single `-s` target and the exact marker pairs.
   - `buildNewSessionCmd` still appends the `-e KEY=value` pairs.
   - The new test asserts the emitted `show-environment` values against `workerEnv`.
4. **A05 reattach and cleanup.**
   - `request_context.js` keeps HEAD's `resolveRegisteredRepositoryCwd` alongside
     A05's recovery, owner and expiry checks.
   - `withRequestLaunchCleanup` and the `transferRequestLaunch`/`settleRequestLaunch`
     wiring are intact.
   - `orchestration.reattach` is tool 34. The regenerated `catalogProjectionDigest()`
     equals the golden `sha256:a5f9b782…`, the 33 earlier names keep their order,
     and `renderToolCatalogMarkdown()` equals `docs/mcp-tool-catalog.md`.
5. **Observer change** (`gateway/src/adapters/tmux_client.js:97-105`). It accepts
   only `new-session -d -s <t> -c <cwd>` followed by `-e NAME=value` pairs, with an
   identifier-shaped NAME and no NUL, CR or LF in the value. Receipt parsing,
   live identity, timeout handling and the blank public stdout are unchanged. I ran
   an ad-hoc probe in scratch, not committed. Each of these shapes was rejected with
   `unsupported tmux creation observation` before any spawn:
   - a positional shell command;
   - `-x 80`;
   - a dangling `-e`;
   - `1A=b`;
   - `AB` (no `=`);
   - an embedded LF;
   - an embedded NUL;
   - `-e -e`;
   - a short argv;
   - `stdio` set.
6. **Witness shims** (`tests/gateway/request_context_reattach.test.js:265`, `:1275`).
   - These are fixture shims, not assertions. They now trigger on a non-literal
     `send-keys … Enter`, which is A04's separate `buildSubmitCmd` that follows the
     `-l` launch line (`base_adapter.js:493-495`).
   - The assertion that the provider actually started (`assert.ok(fs.existsSync(marker))`)
     and the child-settlement assertions are unchanged.
   - In the failed first attempt, these six failures appear exactly: the four
     provider cases fail on "must reach the disposable executable", and the two
     adapter-failure cases fail with `AGENT_PROMPT_NOT_SUBMITTED` before `child`
     was set. This matches the stated attribution. No assertions were removed and
     nothing was skipped.
7. **Reviews README.** Every row from HEAD and every row from MERGE_HEAD is present
   verbatim. No row exists outside the union of the two parents.

## TDD RED / GREEN (reproduced)

- **RED.** I exported the automatic-merge tree `b383d4b` to scratch, added the index
  version of the test, and ran it with `--test-name-pattern='A04 guarded ask after
  A05'`. Result: exit 1, 0 passed / 1 failed / 0 skipped, error `unsupported tmux
  creation observation`. This matches `A_0_5-integration-1-red-final.txt.gz`.
- **GREEN.** I ran the exact focused command from the request on the candidate
  worktree. Result: exit 0, **633 passed / 0 failed / 0 cancelled / 0 skipped /
  0 todo**. This matches `A_0_5-integration-1-focused-final.txt.gz`. The archived
  first attempt shows 627/6 failed, with the six failures above.
- **Other checks.**
  - `python3 scripts/ci_gate.py --validate-only`: status passed, no errors. This
    runs zero tests.
  - `python3 scripts/check_public_hygiene.py`: 0 findings.
  - `git diff --cached --check HEAD`: exit 0.

## Findings (non-blocking)

1. **No committed test for the observer's rejection branches.** No committed test
   asserts `unsupported tmux creation observation`. Before this change, A05's
   exact-shape guard also had no such test. The widened acceptance is verified only
   by my scratch probe. A mutation that accepted any trailing argv would still pass
   the 633 tests, although the receipt-format parse would still fail closed.
   Recommended follow-up: a table test in `tests/gateway/tmux_client.test.js`.
2. **The distinguishing test stubs the adapter.** Its `ask` calls the real A04
   `submitPrompt` on the original receipt pane, but it bypasses
   `CodexAdapter.ask`, including that method's `firstPromptProcess` and wrapping.
   The adapters are byte-identical to HEAD, so this limits coverage but is not a
   defect.
3. **`gemini_adapter.js:278` still creates sessions without markers.** This is
   inherited from A01 and is unchanged here.

## Explicit limits

- I did not run `bash scripts/ci.sh` on this candidate. It has no process-tree
  supervisor or residue gate.
- I did not run the Redis, PostgreSQL, Temporal, Python or real-agent lanes.
- The tests in the focused set use owned disposable tmux servers. They are not a
  global process-inventory proof.
- No live Codex restart, reattach and automatic ask was run on `.3`. The raw
  terminal test proves transport only; it is not real-provider acceptance or
  OS-principal bootstrap provenance.
- The feature closure evidence (`.1`, manual Enter) does not prove automatic
  submission on the integrated `.3`.
- These A05 limits remain as documented:
  - the Linux, local stdio and SQLite support boundary;
  - unobserved reparented descendants;
  - PID and tmux identity reuse races;
  - shell-startup containment limits;
  - possibly stale running rows;
  - reattached Claude sessions do not get A04's completed-turn eligibility, which
    applies to fresh launches only.
- This verdict does not commit, integrate, promote or release anything.

## Next step

Root commits the merge with an explicit pathspec, including this verdict and the
README row. Root then runs the full `.3` gate on the exact merged commit, and the
operator runs the live acceptance with no manual Enter, before any `integrated`
status claim.
