# A/0/03 release candidate: trial 2 — OK

Reviewer: independent Claude Opus 5.5 (`claude-opus-5-5`) Claude Code session in the read-only worktree
`wt-v6-a03-review`, detached at `39c5be251855adaefe9cb1dcbedc1413a4d34290` (the local `release/1.1.0` tip).
The brief gave no Gateway trace, task or session id. This session wrote none of the candidate, the
corrections, the operator decision or the request, and took part in no earlier trial. No sub-agents.
Date: 2026-10-09.

- Candidate: `b2c1ff91f2a379e16c9a453892eb783143e985c8`, tree `3ca60fe345a5d73513a9cef75352af64013cd0ea`.
- Base: annotated `1.0.0` and `refs/heads/release-base/1.0.0` both resolve to
  `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`.
- Request: `A_0_3-candidate-2_to_review.md`, SHA-256
  `75fa1b0eabf54a2626ce8283dd1e780f0c21890c93cd46519598feb86cd3208c`. It was added by `39c5be2`, the only
  commit after the candidate.
- Bound bytes (SHA-256):
  - `ci/reviewer-trust-roots.json`: `69176f8ad96a7dd721e4aabdbdd23133490079ef184e003002768d082ddc8a7d`
  - `CHANGELOG.md`: `a504edcb418989eafc656645a20e6f86cada547532ab762551ab79f50285efb3`
  - `plan/PROJECT_V6/reviews/A_0_3_signing_decision.md`:
    `9ff84eff03f9937ef4dcc2abd90ca40e301d446e8bf26813444f3c1f37c18276`
  - gate log `workspace/tmux-pinned/gate-b2c1ff9-wt.log`:
    `ec0647609ec7c677eb393c2d5fff6e1afcf3e9888a6f690523d753c2e1fdc9ff`

## Verdict

**OK.** Trial 1's KO-1, KO-2 and KO-3 are resolved, and both of its "Required in the next request" items
are met. I reproduced:

- the gate claims, from the log and the host state;
- the TDD RED hygiene and ledger outputs;
- the cheap repository checks.

No blocking finding remains.

This verdict does not decide promotion, tagging, signing or publication. It integrates, promotes and
releases nothing.

## Trial-1 findings

### KO-1. Reviewer trust root: resolved by a recorded operator decision

**The decision.** `A_0_3_signing_decision.md` (added by `c7573c4`, indexed at `reviews/README.md:117`)
settles all four points:

- **(a) Scope.** It admits exactly one trust root. A/0/03 Non-scope (`A/0/03.md:87-90`) and the write scope
  at `SHEETS.md:17` are amended to match.
- **(b) Custody.** The operator generated the key and accepts same-OS-account custody as a documented
  residual.
  - This departs from trial 1's ask that the key be "kept where no agent session can read it".
  - Accepting that residual is the operator's security decision (Rule 15), as in
    `A_0_6_operator_response_decision.md`. I do not override it.
- **(c) What the signature means.** It is an operator countersignature of the committed independent
  verdict, under a role pseudonym. `docs/release-candidate.md:21-26` states this model.
- **(d) Validity.** The window equals the trust-root entry.

The decision file follows the same "recorded from the operator's direct answers" form as the other
operator decisions in this trail.

**Trust-root bytes, re-reviewed.** The file is unchanged since `2d9d7ca`; `git diff 2d9d7ca b2c1ff9` does
not list it.

- It is canonical under the repo's own `read_canonical_json`, and `_validate_reviewer_trust_roots`
  returns no errors.
- Every field equals the decision: keyId, `ed25519`, the public key, the subject, the role and the window.
- The 32-byte key decodes to an on-curve Ed25519 point, not a trivial small-order encoding.
- `validFrom` (21:09:14Z) precedes the candidate commit (21:39:05Z), so an attestation for this candidate
  can fall inside the window.
- The candidate tree and the `1.0.0..b2c1ff9` diff contain no private-key blocks or token-shaped secrets.

**Custody: observable parts only.** I read no key bytes.

- `~/.config/ao-release/reviewer-ed25519.pem` exists with mode 600, in a mode-700 directory, owned by the
  operator account.
- It is 119 bytes, the size of an unencrypted PKCS#8 Ed25519 PEM.
- Its mtime is 21:08:58Z, 16 s before `validFrom`.
- The gitignored `workspace/release-tools/keygen.py` creates the file with `O_EXCL` and mode 600, and
  prints only the public key.
- That the operator ran it, and not an agent, rests on the orchestrator-recorded decision. The same holds
  for every other operator decision in this trail.

**Independence check.** The candidate's author and committer are both `carlos.aspizc@gmail.com`. The
attestation identity `mailto:release-reviewer@ao.invalid` will pass the string-only actor check
(`release_candidate.py:3555-3565`). The decision and the doc both say so, which makes this the
documented, accepted model.

### KO-2. Release docs and the tmux runbook: resolved

**Live-acceptance status.** Every location trial 1 listed now records the acceptance as passed:

- `README.md:36-37`
- `docs/project-status.md:118-120` and `:183-185`
- `plan/README.md:17-18`
- `plan/PROJECT_V6/README.md:13-15`
- `plan/PROJECT_V6/A/README.md:4,13`
- `plan/PROJECT_V6/SHEETS.md:23`

These agree with `CHANGELOG.md:37`, `SHEETS.md:4,16` and `A/0/06.md:5,88`. Live-3 records a pass with Codex
0.162.0 on `3.6a-agents.4`.

**tmux runbook.** `docs/tmux-runtime.md:56-70` now covers any older server, including 1.0.0's `.1` and the
unreleased `.3`. Its `exit-empty=0` premise also holds for `.1`: 1.0.0's `tmux-3.6a-agents.1.patch` sets
the same `options-table.c:372` default to 0.

**Tag-neutral wording.**

- "unfinished" and "not AO `1.1.0` yet" are replaced by "A/0/03 assembles and reviews the `1.1.0`
  release".
- `plan/PROJECT_V6/README.md` drops its "No V6 feature is promoted ..." sentence.
- No shipped doc says the A/0/06 live check is open.

### KO-3. CHANGELOG A/0/00 bullet: resolved

`CHANGELOG.md:10-16` uses trial 1's suggested wording verbatim, and it matches the code:

- **Codex.** Non-writers get the `read-only` sandbox (`codex_adapter.js:324,462`).
- **pi.** Non-writers get `--tools read,grep,find,ls` and no shell (`pi_adapter.js:45,54`,
  `docs/adapters/pi.md:95`). Leaving pi out of the shell residual is therefore correct.
- **Claude Code and OpenCode.** Their shell residual is documented at `docs/adapters/claude-code.md:91-92`
  and `docs/adapters/opencode.md:92`.
- **Antigravity.**
  - `resolveCliWriteAccess` grants write only when `code.write` is `allow` (`policy_engine.js:359-361`).
  - Non-writers reach the adapter's own `assertPolicyAllowed`, which throws `POLICY_DENIED` for any
    non-allow decision (`antigravity_adapter.js:143-150`). This happens on both delegate and spawn
    (`:218-222` and `:339-343`).
  - Base policy lets Antigravity take planner and reviewer (`policies/agent-capabilities.json`
    `allowedRoles`), and both roles deny `code.write` (`policies/roles.json:33,58`).

## Trial 1's "Required in the next request" items

### TDD RED evidence: present in the request and reproduced

**Hygiene.** I ran the candidate's scanner, byte-identical to the `b2c1ff9` blob. The 1.0.0 runs used a
shared, no-checkout scratch clone at `41f9ce2` (tree `2186cd58…`), because the scanner enumerates files with
`git ls-files`.

| Tree | Result |
|---|---|
| `1.0.0` as-is | exit 2: `ci/public-hygiene-fixtures.json` is missing |
| `1.0.0` plus the candidate's allowlist | exit 1, 10 findings |
| Candidate | exit 0, 0 findings |

The 10 findings are:

- two non-public ids, `engineering_graph` and `kya`, at `policies/repositories.json:30,35`;
- two `prompts/kya_*` home paths;
- three `scripts/kya_*` home paths;
- three home paths in tests.

**Ledger.** For a ledger that skips `promoted`, `validate_state_ledger_shape` returns exactly
`stateLedger.transitions[4]: impossible transition: 'integrated' -> 'released'`. An in-order control
ledger reports no ordering error. `verify` reaches this function through
`validate_state_ledger_repository` (`release_candidate.py:3617-3629`).

### Post-freeze layout: decided and compatible with the verifier

- `b2c1ff9..release/1.1.0` changes only the request. That path matches `REVIEW_ONLY_PATH`
  (`release_candidate.py:56-59`), and so does the planned verdict name.
- The gate totals now live in the request.
- Index rows come after the evidence head. That is compatible with the ledger:
  - integration and promotion only need to contain the evidence head (`:3758`, `:3775`);
  - the tag must equal the promoted commit (`:3785`).

## Gate

I verified the gate from the log and the host state. I did not re-run it.

- **Log.** The log's SHA-256 matches the request. Its final aggregate is `infrastructure_unavailable`,
  `errors: []`: **3,407 passed, 0 failed, 12 skipped, 3,419 tests**.
- **Suites.** All 14 contract suites are present.
  - 11 required suites passed outright.
  - `test.gateway` (2,260 passed, 9 skipped) and `test.langgraph` (165 passed, 3 skipped) are
    `infrastructure_unavailable` only because of declared per-test skips.
  - The optional `test.real-agents` lane ran zero tests.
- **Skip budget.** Every skip is listed in its suite's `allowedSkips` in `ci/suites-contract.json`: 12 of
  12 allowed, namely 9 postgres, 2 gateway-integration and 1 temporal.
- **Exit code.** `ci_gate.py:2425-2434` exits non-zero only on `failed` or `timed_out`, or when a required
  suite's service is wholly unavailable. No suite meets either condition, so exit 0 follows. The log itself
  does not print the exit code.
- **Worktree.** The run used `workspace/clones/wt-v6-a03-cand`.
  - It is detached at `b2c1ff9`, with a single reflog entry (the 21:39:12Z checkout) and a clean tracked
    status.
  - The wrapper `workspace/tmux-pinned/run-gate-at.sh` derives the log name from that HEAD.
  - The wrapper unsets inherited `AGENTS_*` and `TMUX*` variables and adds only `AGENTS_TEST_REDIS_URL`.
  - It uses an isolated `TMUX_TMPDIR`, a disposable `redis:7.2-alpine` and the pinned binary.
- **tmux binary.** `bin4/tmux` reports `tmux 3.6a-agents.4`. Its SHA-256 `837d01039a0f…7aac` is the hash
  recorded in the reviewed A/0/06 evidence.
- **Node dependencies.** `gateway/node_modules` in that worktree is a symlink to the main checkout's tree.
  Its installed `.package-lock.json` matches the candidate's `gateway/package-lock.json`: 197 of 197
  packages, with no version or integrity difference.

## Verified independently for this candidate

**Lineage.**

- `b2c1ff9` is a commit with tree `3ca60fe`.
- `1.0.0`, `main` (`fb93756`) and the trial-1 candidate `2d9d7ca` are all its ancestors.
- All 13 integration merges that trial 1 listed are two-parent merges on the first-parent chain.

**Delta since trial 1.** `2d9d7ca..b2c1ff9` is four first-parent commits: `46f5e6d`, `41c35d0`, `c7573c4`
and `b2c1ff9`. They touch 15 paths (+440/-23), all docs and `plan/`. There is no code, test, config,
policy or trust-root change.

**Trail integrity.** The committed trial-1 KO is byte-identical to that reviewer's saved output. The
trial-1 request still hashes to `e757adf0…7b74`, as the KO recorded.

**Verifier.** `release_candidate.py` (`1552f096…`) and its contract test (`87c18f19…`) equal the
verifier-1 OK hashes. The only production change since `1.0.0` is `v` → `v?` in `SEMVER_TAG`.

**Diff size.** `git diff 1.0.0..b2c1ff9 --stat` reports 1,342 files, +98,321/-370.

**Checks run.** These ran in this worktree, which is the candidate plus one review file, with no bytecode
or cache writes.

| Check | Result |
|---|---|
| `verify-repository` | exit 0, `"status": "passed"`, 0 advisories, 0 waivers |
| `ci_gate.py --validate-only` | exit 0 |
| `tests/structure/test_release_candidate_contract.py` | 73 passed, 0 skipped |
| `check_public_hygiene.py` | 0 findings, exit 0 |
| `git diff --check 2d9d7ca b2c1ff9` | clean |
| `git diff --check 1.0.0 b2c1ff9`, outside `plan/` | clean |
| Private-key blocks or token-shaped secrets in the release diff | none |

## Non-blocking notes

1. **The request miscounts the delta.** It says the candidate is `2d9d7ca` "plus two commits". It also
   contains `46f5e6d` (the trial-1 request) and `41c35d0` (the trial-1 gate record). I reviewed the full
   four-commit delta.
2. **The ledger RED evidence is function-level.** The sheet's TDD RED names the `verify` CLI. That
   command needs a collected candidate, which cannot exist before this OK. The function it calls rejects
   the ledger as shown above.
3. **`plan/README.md:22` will ship at the tag.** It says "No `1.1.0` release is claimed." That stays true
   until the ledger reaches `released`; reword it after publication.
4. **Commits after the evidence head are outside this review.** Anything committed after the evidence
   head and before the tag is not covered here. Keep those commits to review-index rows, so the tagged
   tree differs from `3ca60fe` only in review records. Name both in the tag message.
5. **The signing tool does not check for a verdict.** `workspace/release-tools/sign_review.py` is
   gitignored and was written by the orchestrator.
   - It signs a hard-coded `verdict: OK` for any commit, without checking that a committed
     `_reviewed_OK.md` exists.
   - Under the accepted custody, any session on the account could run it.
   - The countersignature means what the decision says only if the operator runs it after reading this
     verdict.
   - Optional hardening: refuse unless the evidence head contains the matching verdict.
6. **The signature does not cover the verdict file.** The `release-review/v1` signature covers the
   verdict, identities, `issuedAt` and the subject commit/tree (`_review_signature_material`,
   `release_candidate.py:293`). The link to the committed verdict file goes through the collected
   evidence head. This is acceptable under "no new provenance formats".
7. **Carried over from trial 1, all optional:**
   - no gate lane validates the committed trust root, although `collect` and `verify` do and fail closed;
   - `CHANGELOG.md:36` is 81 columns wide;
   - the A/0/05 bullet names neither `orchestration.reattach` nor migration 005;
   - the `plan/**` home-path exemption;
   - the `Claude-Session:` trailers that pushing `main` would publish.
8. **The decision file will be published with the key's location.** It gives the key path and says the
   key is unencrypted, and it ships in the public `plan/` tree. The risk is low, since local access already
   implies access to the key. This is the operator's call.
9. **`gateway/README.md` keeps stale A/0/04 trial wording.** The trial narrative still says refined live
   acceptance is outstanding (`:201-202`, `:227-228`, `:246-247`, `:344-345`). `docs/project-status.md:99-100`
   records the completed live check at `7982e42`, and the CHANGELOG makes no A/0/04 live claim. Optional
   cleanup.

## Limits

- **Gate.** I did not re-run `bash scripts/ci.sh`. The gate evidence is the log, the wrapper, the worktree
  state, the binary hash and the dependency match.
- **Not run.** I ran no `collect`, ledger, signing, tag, live provider, tmux server or Redis.
- **Key and operator.** I did not read the private key or check that it pairs with the trust-root public
  key. I did not authenticate the operator's answers; both rest on the operator decision.
- **Scratch use.** The 1.0.0 hygiene runs used a shared clone in this session's scratchpad, deleted
  afterwards. I wrote no repository files, commits, refs or tags, and `git status --porcelain --ignored`
  is empty.
- **Budget (Rule 6).** This review exceeded both the 20,000-token per-task budget and the 150,000-token
  per-session budget, at about 200k tokens. I am surfacing that here rather than splitting a release
  verdict mid-review.

## Status and next step

- **Status.** Candidate `b2c1ff91f2a379e16c9a453892eb783143e985c8` (tree
  `3ca60fe345a5d73513a9cef75352af64013cd0ea`) is independently reviewed OK. This verdict alone does not
  complete A/0/03, and nothing is integrated, promoted, tagged or released.
- **Next steps:**
  1. Commit this file as `plan/PROJECT_V6/reviews/A_0_3-candidate-2_reviewed_OK.md`, the only path in
     that commit.
  2. Run `collect` with the pinned base and branch refs.
  3. The operator countersigns after reading this verdict.
  4. Advance the ledger, then tag and hand off publication as the sheet describes.
