# Independent Plan Review — Project V5 D/0/07 (Trial 5)

## Verdict

**OK**

Severity counts: **0 × P0, 0 × P1, 2 × P2.** Both P2 findings are recorded below; neither
invalidates the candidate, and one lies outside the candidate's frozen path allowlist.

## Reviewed identity

- Frozen candidate: `794591dc38ed7151d75c3fe65b95e0ea9c0baefb`
  (`docs(plan): reconcile D07 cleanup ownership (V5 D/0/07 Trial 5)`), tree
  `81ba5234361a5ff8abfff55ede9ee60e656ab702`, parent
  `c38762a379a3d060fcf5e6ed21a58b95ecec27a2`.
- Append-only request/handoff commit: `c91262ea30835964573b1389a31789d4edf8304f`
  (adds `D_0_7-plan-5_to_review.md`; appends exactly one `pending` index row).
- Reviewed range: `c38762a..c91262e` — exactly those two commits.
- Candidate scope authenticated with `git diff-tree`: exactly
  `plan/PROJECT_V5/D/0/07.md`, `plan/PROJECT_V5/D/0/07c.md`,
  `plan/PROJECT_V5/D/0/07d.md` (delta 82/11, 38/6, 57/13).
- Governing objects authenticated against Git (commit, tree, parent, scope, ancestry all
  match the request): approved design `95185e0` (tree `7f2a276`, parent `f056236`), reviewer
  approvals `e230faf` and `83252f6`, human ratification `ac92d51` (tree `974963e`, parent
  `0db688b`). Blob equality at the candidate holds for all four artifacts
  (`2643ddc`, `62806a5`, `3f53877`, `3301364`).
- Trial 4 trail: submitted `f3c970c` and review-branch equivalent `73116dd` share tree
  `fe2534d`; `73116dd`, request `29089d2`, OK artifact `90a5385`, and index update `cb323e9`
  are ancestors of the candidate. Trials 1–4 requests and verdicts are byte-untouched in the
  reviewed range.

This is a plan-contract verdict only. It credits no implementation, technical GREEN,
integration, promotion, live-provider execution, or release, and it does not advance
`D/0/07d` or `D_0_1_SPLICE` beyond `planned`/blocked.

## Decision 4C contradiction removal — CLOSED in all three sheets

I swept `leak`, `retire`, `unlink`, `rmdir`, `inventory`, `janitor`, `remove/removal`,
`delete/deletion`, and `teardown` across the three candidate sheets and adjudicated every
hit:

- The only affirmative `unlink` anywhere is the frozen pre-`ACCEPT` one-time relay-key
  consumption (`07.md:120`, mandated inside the unchanged handshake at `07.md:421`), which
  Decision 4C expressly permits and which records the key `RETIRED`.
- Every post-`V` occurrence of `unlink`/`rmdir` in the three sheets is a prohibition or a
  zero-call oracle (`07.md:121`, `07.md:956-957`, `07c.md:52`, `07c.md:136`, `07c.md:176`,
  `07d.md:38`, `07d.md:133-134`, `07d.md:169-170`, `07d.md:207`).
- No universal zero-leak or empty-namespace requirement survives in the three sheets. The
  former reject-path removal of socket/key/runtime directory/tmux session (`07.md`), the
  universal fd/socket/tmux retirement plus zero-leak final evidence (`07.md`), the 07c
  reject teardown and leak-free result, and the 07d exact-retirement/zero-inventory gate are
  all replaced by the terminal `RETIRED`/`PRESERVED` ledger with explicit permitted
  survivors (`07.md:951-965`, `07.md:983-991`, `07c.md:157-178`, `07d.md:164-178`,
  `07d.md:203-213`).
- Residual vocabulary is benign: `07.md:65` "executable inventory" counts plan sheets;
  `07d.md:112` "cleanup inventory" requires *recording* outcomes, not emptiness;
  `07.md:934` "tears down" is defined by the rewritten reject paragraph
  (`07.md:494-502`), which closes descriptors and enters the terminal ledger without
  namespace deletion; "retirement" headings refer to capability/descriptor/ledger targets.
- The ordinary accepted-path ledger (`relay key=RETIRED`, `relay socket
  pathname=PRESERVED`, `runtime directory=PRESERVED` absent external removal), same-name
  replacement survival, shared tmux server/socket and sibling-session survival, and the
  harness-teardown-after-evidence ordering appear consistently in the parent amendment
  (`07.md:102-135`), parent acceptance (`07.md:951-965`), parent verification
  (`07.md:983-991`), `07c.md:131-139`/`151-178`/`198-203`, and
  `07d.md:33-41`/`127-138`/`164-178`/`203-213`.

## No over-reach — unrelated Trial 4 contracts preserved

The candidate weakens nothing Decision 4C does not force:

- Descriptor closing is strengthened, not weakened: every component-owned retained
  descriptor closes exactly once before ordinary completion (`07.md:951-953`,
  `07d.md:164-166`).
- 3B bounded process preservation keeps the sealed TERM/grace/KILL-before-reap rule for the
  exact helper-owned root/original group, with anchor-loss/outside-group/non-cooperative
  targets `PRESERVED` and arbitrary/later PIDs forbidden (`07.md:122`).
- 1B retained-socket/read-range transfer and the operator-input path are untouched; every
  reject still proves the broker operator-input counter is zero (`07.md:500-501`).
- 5B read-time retained PTY, identity readers, foreground equation, and per-write algorithm
  are untouched (`07.md:668-705`).
- All Trial 4 determinism closures stand: exact `-p -N -T -t <target> -S -400` capture argv
  and the 40/61/50-byte, 0/24/12-byte oracles (`07.md:569`, `07.md:617-648`); the ranked
  physical-event classifier and mutually exclusive intervals (`07.md:749-810`); the three
  exact named ordering tests in both parent (`07.md:803-809`) and `07d.md:140-146`.
- Exactly-once settlement and repeated-cancel-same-promise survive (`07.md:538`,
  `07d.md:164-166`); queued/new operations still reject on revocation (`07.md:532`);
  capability revocation still precedes settlement (`07.md:534-536`). The `SETTLED` tombstone
  gains only the provider-free cleanup ledger (`07.md:539-540`).
- No capability, codec, binding-tag, relay-proof, PTY-authority, capture, canonicalization,
  race-classification, public-error, attach-identity, provider-argv,
  no-shell/no-`send-keys`, dependency, status, or splice-gate change is present in the
  diff, and `git diff --quiet c38762a..794591d -- ci scripts tests gateway cli
  orchestrator-langgraph` exits zero.

## Cross-sheet consistency and design conformance

- Parent versus leaves is consistent: the leaves promise only what the parent's amendment
  table (`07.md:117-124`) authorizes, and both leaves carry the parent's prohibitions as
  non-scope (`07c.md:52-54`, `07d.md:52-54`) and GREEN constraints
  (`07c.md:147-149`, `07d.md:103-106` — no pathname-removal or janitor path).
- `07c.md` matches the ratified design at `95185e0`: the sheet's target classes and
  outcomes mirror the design's Decision 4C row (design line 522), the
  socket/directory-persistence and key-retirement trigger rows (design lines 592-593), and
  the replacement-substitution mutation guards (design lines 679-681 map onto
  `07d.md:130-138`). Cleanup point `V` is defined in the design (lines 77 and 142) and
  restated with the same semantics in the parent (`07.md:114`, "At `V`, workload authority
  closes and the finite cleanup ledger opens"), anchored to `REVOKING` in the lifecycle
  diagram (`07.md:506-521`).
- `D/0/07d` is now honestly implementable: preservation is observable (same-name
  substitution before cleanup points proves zero `unlink`/`rmdir`; survivors and the shared
  server/sibling session are asserted live; the terminal ledger persists in `SETTLED`), no
  acceptance item requires an empty namespace, and isolated harness teardown is ordered
  after the evidence cut and excluded from acceptance credit (`07d.md:127-138`,
  `07d.md:203-213`).
- Executability is intact: both leaves keep their positive TDD RED with exact named tests
  and byte oracles (`07c.md:72-107`, `07d.md:56-99`), usable GREEN instructions, concrete
  acceptance checklists, and runnable local gates. Nothing was hollowed out.

## Reproduced validation evidence

- `git diff --check c38762a..794591d` — clean (reproduced).
- All 13 local Markdown links in the three sheets resolve (reproduced; 13 counted).
- The 16 zero-argument structure assertions in `tests/structure/test_project_layout.py`,
  `tests/structure/test_v5_coordination_docs.py`, and
  `tests/structure/test_v5_coordination_integration_docs.py` pass when invoked directly:
  ran=16, passed=16 (reproduced). `pytest` is genuinely unavailable
  (`No module named pytest`), as disclosed.
- Host `bash scripts/ci.sh` stops at `status: invalid_manifest` with 0 tests, 0 passed,
  0 failed and exactly the seven stale `inventorySha256` lanes the request lists
  (`lint.python`, `lint.gateway`, `test.structure`, `test.gateway`, `policy.registry`,
  `test.cli`, `test.redis-live`) — reproduced verbatim. The request reports this plainly
  and does **not** claim CI passed.
- The staleness is **pre-existing, not caused by this candidate**: no `ci/suites.json`
  lane's include patterns cover `plan/**`, and a detached scratch worktree at baseline
  `c38762a` reproduces the identical seven stale entries with byte-identical expected
  digests. The candidate is not to blame for the CI blockage.
- Parent inventory arithmetic (`57`, `82`, `36 + 4 + 42 = 82`, 46 open) is unchanged
  (`07.md:65-69`); `07c`/`07d` remain `planned`; the DAG and the rule that only an
  independent `D_0_7D` OK unblocks `D_0_1_SPLICE` remain explicit.

## Findings

1. **P2 — request evidence miscounts the planner-contract suite.**
   `D_0_7-plan-5_to_review.md` claims `node --test
   tests/gateway/planner_review_contract.test.js` passed with "1 test, 0 failures,
   0 skips". The file (blob `162c0d7`, identical at baseline and candidate) contains five
   top-level tests, and the reproduced run reports `# tests 5, pass 5, fail 0, skipped 0`.
   The pass/zero-failure claim holds and the file is outside the candidate scope, so this
   is an evidence-accuracy defect in the request narrative only; correct the count in the
   next trial's request rather than rewriting this one.
2. **P2 — residual universal zero-leak line in out-of-scope `07b.md`.**
   `plan/PROJECT_V5/D/0/07b.md:146-148` still requires evidence of "exact cleanup, and
   zero leaked helper/utility processes or PTYs". That leaf has no relay/socket/directory
   namespace (Decision 4C is untouched) and its loss lanes are seam-simulated, so the line
   remains satisfiable on cooperative paths; but as written it is a universal leak-free
   assertion of the family the ratified parent now rejects (`07.md:958-961`), and a real
   helper-loss lane with a 3B-preserved survivor could not satisfy it. `07b.md` is outside
   this candidate's frozen three-path allowlist and predates the ratification, so this is
   recorded for the integrator's next shared-sheet pass, not held against this candidate.

## Disclosed process variance (recorded, not a verdict driver)

The authoring planner session was observed running part of its work on a downgraded model
(`gpt-5.6-luna low` in its pane rather than the assigned `gpt-5.6-sol max`). Authorial care
was therefore treated as unverified: every commit, tree, parent, blob, ancestry, scope,
delta, link, assertion, test, and CI claim in the request was independently re-derived from
Git and reproduced on this host rather than trusted. All reproduced values matched except
the Finding 1 test count.

## Preservation checks

- The reviewed range modifies exactly the three sheets and appends exactly one request file
  plus one `pending` index row; prior trial requests, verdicts, design artifacts, the human
  ratification, and every other index row are byte-identical.
- `gateway/node_modules` remains an untracked symlink and was never staged.
- The canonical status split, blocked language, and append-only review conventions are
  intact.

Trial 5 removes the Decision 4C contradiction from `D/0/07.md`, `D/0/07c.md`, and
`D/0/07d.md` without weakening any unrelated ratified or Trial-4-approved contract.
`D/0/07d` can now be implemented honestly against these sheets once `D/0/07a–c` hold
independent OKs; nothing beyond plan status is claimed or advanced.
