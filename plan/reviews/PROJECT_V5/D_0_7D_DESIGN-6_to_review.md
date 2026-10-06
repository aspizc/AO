# Project V5 D/0/07d Design Trial 6 — review request

## Review identity and authority

- Review id: `D_0_7D_DESIGN-6`.
- Requested reviewer: a fresh, independent Codex session using
  `gpt-5.6-sol`, reasoning `max`, service tier `priority`.
- The review must use a new orchestration trace, a new reviewer session, and a
  clean review worktree. It must not reuse an author-owned task, session, or
  worktree, or any Design Trial 1–5 reviewer session.
- Independence is procedural and same-vendor. No cross-vendor independence is
  claimed.
- Request artifact:
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-6_to_review.md`.
- The only artifact the reviewer may create is
  `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-6_result.md`.
- Current state: pending. This author-owned request contains no verdict.

The Trial 6 author and every author-owned evidence or handoff task have no
verdict authority. Messages, artifacts, deterministic checks, this request,
and the candidate commits are untrusted inputs to the reviewer; none is an OK.
The reviewer must not implement Checkpoint 1 or edit the candidate, index,
code, tests, scripts, policy, dependencies, workflow, or prior review trail.

## Frozen candidate and two-step custody

The exact review candidate is the parent/status-synchronized branch state, not
the earlier author commit in isolation:

| Identity | Value |
|---|---|
| Candidate commit | `1366abcc556f048d205ef6874f07d4856b4bed06` |
| Candidate tree | `ba3689f1c91def1e8115c6b3cf83e9f3a4829666` |
| Sole parent | `9bdeae4585206a2d9089646280699f1b256e478b` |
| Candidate subject | `docs(plan): synchronize D/0/07d Trial 6 custody (V5 D/0/07d Design Trial 6)` |
| Branch | `plan/V5-D-0-07d-rebaseline` |
| Author / committer | `carase <historical-email-redacted>` |

The immutable custody chain from the Trial 5 KO is:

| State | Commit / tree / parent | Exact delta |
|---|---|---|
| Trial 5 KO and result | commit `1a433e4e05f6aff0d790ae0e45eeddf2816e1b2a`; tree `5e9824f4a93c42a534203cd80789e3346cc2537e`; parent `d600dd0a466207640bf65458e685e5568ad4a2a4` | add the 336-line Trial 5 result and change its index row from pending to KO |
| Trial 6 author correction | commit `9bdeae4585206a2d9089646280699f1b256e478b`; tree `1ee506c523a476d61754876c74f18dc2b283c13b`; parent `1a433e4e05f6aff0d790ae0e45eeddf2816e1b2a` | only `plan/PROJECT_V5/D/0/07d.md`, 1,634 insertions / 102 deletions |
| Parent/status synchronization | commit `1366abcc556f048d205ef6874f07d4856b4bed06`; tree `ba3689f1c91def1e8115c6b3cf83e9f3a4829666`; parent `9bdeae4585206a2d9089646280699f1b256e478b` | `plan/PROJECT_V5/D/0/07.md`, 13/3; `plan/PROJECT_V5/D/0/07d.md`, 1/1 |

The Trial 5 result remains historical `reviewed_KO`. At the frozen candidate it
is blob `7bd784223888d53da8a843d3deb95d3791413fbe`, 18,567 bytes,
336 lines, SHA-256
`2107389f834cd329b74bc2f19ab94c998748cf0b00a6d0b421ffe6cb259140d8`.
Trial 6 does not rewrite or supersede that artifact; it asks whether the exact
corrections below discharge its six open requirements.

The complete `1a433e4..1366abc` candidate pathset is exactly:

~~~text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07d.md
~~~

| Path | Current blob | Aggregate numstat | Current bytes / SHA-256 |
|---|---|---:|---|
| `plan/PROJECT_V5/D/0/07.md` | `87a9bb76549fe93db30815ac5aee7231c4bf008d` | 13 / 3 | 79,901 / `68edff3ed8c6275ddb642acc0f3f979a8227c8f9149788cc6f2588088644c391` |
| `plan/PROJECT_V5/D/0/07d.md` | `705e7b41a230a7311b010f9ca705d0e4891eb8de` | 1,635 / 103 | 266,786 / `ea4e03f904dc0e8c475949704cebd7eb184e83e42288d743b81502b7429abfea` |

The aggregate delta is 1,648 insertions and 106 deletions across those two plan
documents only. No product, test, fixture, script, policy, dependency,
lockfile, workflow, vendor, result, or unrelated plan path is in the candidate.

## Frozen request-commit contract

This request commit must be a single-parent direct child of candidate commit
`1366abcc556f048d205ef6874f07d4856b4bed06`. It cannot embed its own commit or
tree without self-reference.

| Request property | Required value |
|---|---|
| Direct parent | `1366abcc556f048d205ef6874f07d4856b4bed06` |
| Parent tree | `ba3689f1c91def1e8115c6b3cf83e9f3a4829666` |
| Subject | `docs(review): request D/0/07d executable custody review (V5 D/0/07d Design Trial 6)` |
| Exact delta | this new request plus `plan/PROJECT_V5/reviews/README.md` |
| Pre-request index blob | `d3cd779625ab07207a292f73dc9346ad227c5d2a` |
| Index change | append exactly one pending Trial 6 row immediately after Trial 5 |
| Result at request commit | absent |

Before reviewing substance, the fresh reviewer must resolve the request branch
tip and record its commit, tree, author, and committer in the result. It must
prove that the request has exactly one parent, that the parent and subject are
the values above, that its delta is exactly the two request paths, that the
candidate blobs remain unchanged, that the branch is exact, and that the
result path was absent at request commit time.

## Six immutable Trial 5 corrections to adjudicate

These are candidate mechanisms and author evidence, not accepted findings.
The reviewer must decide each correction separately and must not average a
failure in one seam against strength in another.

| Trial 5 correction | Concrete Trial 6 mechanism | Required adjudication evidence |
|---|---|---|
| Correct the reached-contract paths | V4 `reachedContracts` names exactly `gateway/src/adapters/process_supervisor.js`, `gateway/src/adapters/process_supervisor_helper.py`, and `gateway/vendor/tmux-agents/manifest.json`; no stale `gateway/src/process_supervisor*` or extensionless manifest path is authority. | Independently resolve all three blobs from the frozen candidate and compare 3/3 with the extracted V4 oracle/spec. |
| Freeze one executable custody and reconciliation parent | The extracted V4 oracle is the sole parent/launcher, unit shim, frame/archive owner, evidence owner, Docker recorder/reconciler, and attack driver. Its only production entry is `AUTHORITY_PARENT run`; `run_parent` invokes the same `ParentCore` exercised by the direct parent-core proof. No candidate or reviewer-selected fourth executable is permitted. | Extract V4 bytes from the candidate blob with LF fidelity; compile them; prove the public dispatch reaches `run_parent` and `ParentCore`; reproduce selftest and direct parent-core transcripts. |
| Make public frame handling canonical | The spec freezes archive and test `publicArgv`; `frames_public` parses the canonical expectation JSON, accepts archive input only on fd 0 with a validated positive archive sink fd, accepts test only with sink token `-`, calls the same `validate_frames`, and emits one canonical decision. Invalid phase/fd/sink/schema is rejection. | Exercise the archive and test public entries plus the five invalid-fd cases independently; prove there is no wrapper-only or alternate parser authority. Prior Group B1 evidence is input, not reviewer acceptance. |
| Use one 700-second build budget inside one outer budget | The only deadline vector is operation/probe/build/reconciliation/finalization/outer `10/60/700/100/40/900`. The role slices are non-additive beyond the one outer deadline and the proof is `60 + 700 + 100 + 40 = 900`; forbidden `840` is absent. | Check spec, oracle constants, extracted argv, deadline formulas, `ParentCore`, and selftest agree; reject any second build allowance or deadline extension. |
| Define one EOF/transition contract | D7C2 and diagnostic EOF are observed facts only. The sole acceptance chain is `SHIM_WAIT_ACCEPTED -> SHIM_REAPED -> BOTH_EOF_ACCEPTED -> STREAMS_EOF`, followed by `CGROUP_EMPTY_TWICE -> UNIT_RECORDED`. Early EOF never advances state. | Reproduce the accepted state path and all six order/early-accept mutants; verify the spec, prose, `LaunchMachine`, `ParentCore`, and real-parent path use this same transition vocabulary. |
| Exercise an actual retained writer | `delayed_writer_proof` forks a validator and a holder that retains the archive writer, proves no terminal result during a 250 ms poll, releases the holder, then requires accepted EOF and a sealed archive. It is included in the exact selftest and the V4 `retained_fd_child` attack. | Reproduce the exact selftest and inspect that the forked holder—not a fixture assertion—causes delayed EOF. Confirm retained D7C2/diagnostic writers in the production threat model reach the deadline, cleanup, and rejection path. |

The corrected V4 spec also closes the six authenticated B2 inconsistencies:
`attackTotals` and `attackResults` have only their frozen keys, V4 totals and
result agree with the oracle, the oracle/selftest attestations are current,
and the spec identity was recomputed after the key edits. These integrity
corrections support, but do not replace, adjudication of the six mechanisms
above.

## Exact Trial 6 artifact custody

The following is author-side evidence. The reviewer must reproduce it from the
frozen candidate rather than accepting this table as a verdict.

| Evidence | Exact identity / result |
|---|---|
| Final V4 custody spec | 5,480 LF-preserved bytes; SHA-256 `5a0f50373feaa6e715b371d0f1737d4e50b6a1d06c8854d680da1a1347d0a20d` |
| V4 custody oracle | 99,495 LF-preserved bytes; SHA-256 `ee0696cce5a9cdf55080b41df8a9438c25595a7df009c709461590153a0c4764` |
| Complete selftest stdout | 4,455 bytes; SHA-256 `f78090151ef0afaf79b12871bfaa62c97c2031614a1af49f29e34fa378d1467f` |
| Direct `ParentCore` stdout | 213 bytes; SHA-256 `95d18a185f2f0f4f985737f855f714a19611179b2f00bdb98e8e9add6d6c70df` |
| Contracts stdout | 1,175 bytes; SHA-256 `8eadda886e57f5c0fb98ea2c318ae9f6269e31a6bff2c0546b3b762c538a5c9c` |
| Public attacks | 18/18 in exact order; stdout 1,988 bytes / SHA-256 `381ca12e1785ba15f43af8c0b932532b19fb819af1b5511060665b0fcf53bf7c` |
| Independently reached contracts | 3/3; stdout 848 bytes / SHA-256 `36b54e95b9d451064db3d9dec4aa63778a68286f768b2cffa9208b3496adf67a` |

The selftest records D7C2 accepted 2/rejected 76, canonical USTAR accepted
1/rejected 21, six rejected state mutants, four Docker reconciliation
branches with zero residue, and schema version 4. The direct parent-core proof
records four operations for each of `ALREADY_EXITED`, `KILL_EXITED`, `MISSING`,
and `TERM_EXITED`; cleanup retry 1; cleanup-zero 34; control-vector rejects 8;
event rejects 14; failure rejects 9; phases 2; and vector rejects 6. Public
attacks record historical 9/0/9/0/0 and V4 9/9/0/0/0 in
tests/pass/fail/skipped/cancelled order, with zero exit and residue sums.

The reached-contract blobs are exactly:

| Reached path | Blob |
|---|---|
| `gateway/src/adapters/process_supervisor.js` | `b0100b6c626207e6cc66bdc46e410efa48dc4655` |
| `gateway/src/adapters/process_supervisor_helper.py` | `e24376fce8b6b2919ca9ad1ba348a094dad4e413` |
| `gateway/vendor/tmux-agents/manifest.json` | `0c0f0c758a385d0a3ba727071213215d00c45f9e` |

Author evidence is checkpoint artifact
`art-dc4a7d17-94cf-4814-bdf8-728f996bc9d6`; its Group B2 input is artifact
`art-a96ec6dc-84f1-4149-86e5-a6fa4bf2f46d`. At author commit `9bdeae...`,
`07d.md` was 266,524 bytes with SHA-256
`e31cdc15d0a35071674d8ab68fda9c4ee1f805b7cc4fb79efab7515c2f6e8903`.
Its capture manifest was
`/tmp/d007d-t6-author-final.bdO8St/99-manifest.txt`, 215 entries / 23,788
bytes, SHA-256
`ffc060e5f3a3e5316f23eb17ced92a968cebb5caecc61d68800286095e117d46`.
That temporary path is provenance, not current authority.

Parent/status synchronization is checkpoint artifact
`art-f20452cf-52cc-4cf6-9a24-e78bafbf90e3`. It freshly extracted the current
embedded spec/oracle and reproduced selftest, parent-core, and contracts
byte-for-byte before commit `1366abc...`; it did not rerun public attacks or
the reached-contract comparison. Current document identities and Git blobs
are therefore frozen separately in the candidate table above.

No predecessor V3 oracle/spec is current Trial 6 authority. Preserved strings
such as `D007D_REVIEW_CUSTODY_V3`, `D007D_REVIEW_DONE_V3`, and the V3-named
argv/fd-seal contract digests are runtime or embedded-contract identifiers
inside the frozen V4 authority; they do not select a stale Trial 5 mechanism.

## Failed, unavailable, uncredited, and unrun lanes

Nothing in this section is passing evidence, and the reviewer must preserve
each limitation in its result.

- The author's first `13-scan` exited 1 with 0-byte stdout and 676-byte stderr
  (SHA-256
  `545b4194ad51b58e00935307af848132d27e3fe3eb31526869f04b1e5a90c927`)
  because its attestation regex crossed marker scopes. Only the corrected
  marker-scoped scan passed; the first attempt remains uncredited.
- The author's first commit attempt created no object because the sandbox
  denied the worktree `index.lock` as read-only. The exact explicit-path commit
  succeeded only on the minimally scoped approved rerun; no amend occurred.
- Retained Group B2 failures remain uncredited: attack-metadata shell quoting;
  reached-contract attempt 1's stale-attestation assertion; malformed capture
  in scan attempt 1; wrapper parse failure in attempt 2; overbroad EOF
  classification in attempt 3; and 480 bytes of invalid-escape warnings in
  attempt 4.
- Group A's first Markdown-wrapper extraction failed 0/8 before the corrected
  inside-fence comparison passed 8/8. The parent-core checkpoint's first
  absolute-line scan failed after line movement before its semantic-owner scan
  passed. Neither failed attempt is credited.
- Parent-core artifact `art-9b46bdbb-1b5d-440c-b33f-dfade758119f` was
  unavailable and was not silently recovered or treated as read. The direct
  parent-core transcript above is distinct deterministic output.
- The parent sync had no failed verification command. Its first external
  checkpoint copy exited 0 but emitted GNU `cp --no-clobber`'s non-fatal
  portability warning; the checkpoint was then refreshed from the validated
  explicit source/target. The warning is not passing evidence.
- Standalone public archive/test frame commands, five invalid-fd cases, and the
  standalone delayed-writer command were not rerun in the final correction.
  Authenticated Group B1 evidence and the selftest replay do not turn those
  standalone lanes into a fresh pass.
- Public attacks and the reached-contract comparison were run in the author
  capture but were deliberately not rerun by the parent synchronization.
- No complete parent `run` was executed. No real user-systemd/cgroup v2,
  bwrap namespace, AF_UNIX unit shim, Docker daemon/container/image, or
  Checkpoint 1 candidate was exercised. Deterministic parent-core, selftest,
  contracts, and attack evidence are not live-host evidence.
- Aggregate/full CI, including `bash scripts/ci.sh`, was not run. No live
  provider/network, Redis, PostgreSQL, dependency installation, product test,
  implementation, integration, tag, push, promotion, release, support, or
  publication lane was run or inferred.

The deliberately unrun live-host lane is the central review boundary. The
reviewer must decide whether the frozen design is mechanically executable and
reviewable despite that limitation. It must not relabel unavailable runtime
evidence as a pass or require this plan-only handoff to implement Checkpoint 1.
For future implementation, missing systemd/cgroup/bwrap/AF_UNIX/Docker
prerequisites are hard `infrastructure_unavailable` failures, never skips.

## Preserved scope and lifecycle boundary

- D/0/07d remains `planned` and unimplemented.
- Trial 5 remains immutable `reviewed_KO`; Trial 6 remains pending until a
  fresh result exists.
- Checkpoint 1 remains blocked. Its exact future pathset is still:

~~~text
ci/suites.json
tests/gateway/process_supervisor_session_port.test.js
tests/gateway/process_supervisor_session_port_fixture.py
tests/gateway/process_supervisor_session_port_pty.test.js
tests/gateway/process_supervisor_session_port_relay.test.js
tests/gateway/process_supervisor_session_port_fixture_owner.js
tests/gateway/run_process_supervisor_session_port_real_host.sh
~~~

- `D_0_1_SPLICE` remains blocked. A Design Trial 6 OK could authorize only the
  separately reviewed Checkpoint 1 implementation loop; it is not Checkpoint 1
  acceptance and cannot unblock the splice by itself.
- No review, implementation, integration, promotion, release, support,
  publication, merge, tag, or push is claimed by this request.

## Required independent review procedure

The fresh reviewer must perform these steps in order:

1. Authenticate its new trace, session, clean worktree, requested model,
   reasoning, and service tier. Record that the author and author-owned tasks
   have no verdict authority.
2. Resolve and authenticate the request HEAD as specified above: authorship,
   branch, single direct parent, subject, exact two-path request delta,
   pre-request index blob, one pending row, unchanged candidate blobs, and
   result absence at request commit.
3. Authenticate the complete `1a433e4..1366abc` chain, both commit boundaries,
   exact two-path aggregate candidate delta, current document hashes, and the
   immutable Trial 5 KO/result identity.
4. Read the frozen `07.md` and `07d.md`, the complete Trial 5 result, and the
   live reached source/vendor contracts. Do not import stale Trial 5 V3
   identities or superseded mechanisms as Trial 6 authority.
5. Extract the marked V4 spec and oracle from the frozen candidate blob with a
   reviewer-owned LF-preserving extractor. Recompute size/hash, parse the spec
   with duplicate-key rejection, compile the oracle, and verify the sole
   production/public dispatch and `ParentCore` ownership.
6. Reproduce the complete selftest, direct parent-core proof, contracts,
   public archive/test plus invalid-fd frame cases, public 18/18 attacks, and
   independent 3/3 reached-contract comparison. Record exact stdout identities,
   failures, skips, and unavailable lanes; a crash, timeout, or unrun case is
   not rejection evidence.
7. Adjudicate each of the six Trial 5 corrections separately, including the
   actual retained-writer process behavior and the one 900-second deadline
   composition. Check that V4 is the only authority and that all candidate,
   authority, expectation, output, Docker, EOF, and cleanup transitions are
   executable without reviewer invention.
8. Treat the live-host and aggregate-CI lanes exactly as deliberately unrun.
   Decide whether that boundary permits a design verdict; make no runtime,
   implementation, integration, promotion, or release claim from it.
9. Create only
   `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-6_result.md`. Include explicit P0,
   P1, and P2 findings, even when a severity has none; cite concrete
   `path:line` evidence; state `reviewed_OK` or `reviewed_KO` for this exact
   candidate; and explicitly decide whether Checkpoint 1 implementation may
   begin. Do not implement it and do not claim `D_0_1_SPLICE` is unblocked.

## Questions requiring an explicit verdict

1. Do the corrected reached paths bind all three actual candidate contracts,
   with no stale path or candidate-authored attestation deciding equality?
2. Is the byte-frozen V4 oracle a single, complete, executable parent for
   launch, public frames, evidence, Docker reconciliation, attacks, and final
   cleanup, including the same `ParentCore` on selftest and real paths?
3. Are public frame parsing, the non-additive 700-second build slice, and the
   one EOF/transition state machine closed and mutually consistent?
4. Does the exact retained-writer selftest create and hold a real writer long
   enough to prove that early EOF cannot be accepted, and does production
   custody fail closed on the analogous descendant case?
5. Are the V4 spec/oracle/transcripts, 18/18 attacks, 3/3 reached contracts,
   current candidate chain, failed evidence, and unrun live-host boundary
   sufficient to call the frozen design executable and reviewable without
   inventing implementation behavior?
6. Is candidate `1366abcc556f048d205ef6874f07d4856b4bed06` /
   tree `ba3689f1c91def1e8115c6b3cf83e9f3a4829666` `reviewed_OK` or
   `reviewed_KO`, and may only the separately reviewed Checkpoint 1
   implementation loop begin?

> Public import note (2026-10-06): the source Git evidence contains a corporate
> email address, redacted here as `historical-email-redacted`. Original commit
> identifiers and verdict content are preserved; this is a sanitized imported copy.
