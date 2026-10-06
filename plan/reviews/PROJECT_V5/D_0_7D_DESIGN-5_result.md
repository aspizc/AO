# Project V5 D/0/07d Design Trial 5 — independent review result

## Verdict

**reviewed_KO** for exact candidate
`5894ebea50df8b7e65236247e10fb1c53713d282` (tree
`e41cae0a200adc63b97663b24bce3c7fbb2126f0`) at exact request
`d600dd0a466207640bf65458e685e5568ad4a2a4` (tree
`9b0592f48f7ff7c65ed25883c450790baaf8f1f5`).

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No product, public runtime contract, deletion authority, integration, promotion, or release state changed. |
| P1 | 3 | Launch custody, independent D7C2 authority, and Docker reconciliation are still not closed executable contracts. |
| P2 | 1 | The request's reached-contract inventory names three paths that do not exist at the authenticated candidate. |

This is a design rejection, not implementation authority. Checkpoint 1 **must not begin**.
`D_0_1_SPLICE` remains `blocked_before_GREEN` and `blocked_confirmed`; no prerequisite for
implementation or splice has been satisfied.

## Reviewer identity, independence, and evidence custody

- Final-synthesis trace/task:
  `tr-5d7e5702-151d-4520-b877-aad7bfc56aac` /
  `ts-d23b48e9-1f20-4e62-9be6-ef3f3dae1809`.
- Reviewer: Codex, `gpt-5.6-sol`, reasoning `max`, service tier `priority`.
- Role: fresh independent Trial 5 reviewer; no delegation and no author/self-review evidence
  was accepted.
- The same logical reviewer collected phase-A evidence under task
  `ts-546b6411-9522-4db7-ba7a-494023846309` and stopped without a verdict or repository write.
- The 579-line evidence checkpoint
  `/home/carase/git/personal/agents-orchestrator/workspace/.d007d-design-t5-review-evidence-a.md`
  authenticated at SHA-256
  `8ccc0ec0605bc5925ad619f4e5b5ea2d745b0cb743854f2cd0c61e2c97bbe194`.
  Its identity/custody opening, artifact control tables, and sections 6–10 were read completely.
- Decisive cheap facts were rerun directly in the exact review worktree. No full CI, product
  implementation, live user-systemd/cgroup/bwrap lane, or Docker daemon operation was run.

The checkpoint is cited for custody and retained control output, but the findings and
reproductions below stand on their own.

## Authenticated Git custody and exact scope

| Object | Commit | Tree | Sole parent | Subject |
|---|---|---|---|---|
| Trial 4 KO | `2d9470baa63e27a08f3fe8b5e8bb0f4e176a3eab` | `e48c504278fd822843fe1907c562abb54d76dc33` | `c8b26c24b685fa6ff4576b2bc744f31474ca55a1` | `review(v5): reject D/0/07d Design Trial 4 build-ready plan` |
| Trial 5 candidate | `5894ebea50df8b7e65236247e10fb1c53713d282` | `e41cae0a200adc63b97663b24bce3c7fbb2126f0` | `2d9470baa63e27a08f3fe8b5e8bb0f4e176a3eab` | `docs(plan): close D/0/07d custody gaps (V5 D/0/07d Design Trial 5)` |
| Trial 5 request | `d600dd0a466207640bf65458e685e5568ad4a2a4` | `9b0592f48f7ff7c65ed25883c450790baaf8f1f5` | `5894ebea50df8b7e65236247e10fb1c53713d282` | `docs(review): request D/0/07d build-ready review (V5 D/0/07d Design Trial 5)` |

All three objects were authored and committed by `carase <historical-email-redacted>`.
The declared product/test baseline is
`d0bf521799b16f7d3300163ce40bd7dfca49864d`, tree
`0c577aef5bd864c51bf60086b9b3cb5daa254000`. The exact uninterrupted
first-parent chain from that baseline to the request is:

```text
c249e49becbef44b7385791be76e3f7ebb8afa93
8a193e50d8a2891b6e42f43839b8000ef4c03955
462c65039538fa55e751dd2ead51b8507178b8ec
f0c5813f0a9b989e98ae204b8aebb9f6210d82f1
4075736d8eafa022e844559279d31a0162af516d
2c4612c5cf6875615bfe529e96c0781aeb25abea
e3e16cb7d22c85e06d5a8f8312ed889054ceb251
218ac0afa60f8df2e71b398ffb43ed8b8b996151
99935c53473a996b0b2650fe7435658930271c5a
4bfbaba3dfc94e5dd67b7ed9049d9e3bd639d2c6
c8b26c24b685fa6ff4576b2bc744f31474ca55a1
2d9470baa63e27a08f3fe8b5e8bb0f4e176a3eab
5894ebea50df8b7e65236247e10fb1c53713d282
d600dd0a466207640bf65458e685e5568ad4a2a4
```

Candidate pathset, and no other candidate path:

| Status | Numstat | Blob | Path |
|---|---:|---|---|
| M | 22 / 14 | `543a0c81b4d681aaf3e4b33e9aa1a95a22b36714` | `plan/PROJECT_V5/D/0/07.md` |
| M | 1483 / 62 | `5bf8264dcb39d32fd1855b27f5c513f7c9d02c4f` | `plan/PROJECT_V5/D/0/07d.md` |

Request pathset, and no other request path:

| Status | Numstat | Blob | Path |
|---|---:|---|---|
| M | 1 / 0 | `486a38b1966eba35672620d4e37d0382533de4e3` | `plan/PROJECT_V5/reviews/README.md` |
| A | 452 / 0 | `6d2bf7a7d33719b365c3b76440fda8190513449d` | `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-5_to_review.md` |

The pre-request index blob is `cc04cbbbfa131d4ec056ee331a3d0b87dd386181`.
The request added exactly one pending Trial 5 row, retained both candidate blobs, and had no
`D_0_7D_DESIGN-5_result.md`. Initial status, unstaged pathset, staged pathset, and untracked
pathset were empty. Baseline-to-candidate changes are plan-only; the protected Gateway, tests,
CI, scripts, workflow, policy, dependency, lock, and vendor path guard was empty.

## Findings

### P1-1 — launch custody still depends on an unspecified executable parent

**Trial 4 adjudication: not closed.** This ruling is based on Trial 5 facts, not inherited from
the earlier KO.

Trial 5 correctly adds `systemd-run --wait --remain-after-exit --service-type=exec`, bwrap
`--block-fd 3`, held-object `--ro-bind-fd 5`, an authenticated unit-shim protocol, fd
normalization, pidfd-bound release, and a 14-state/13-transition launch specification. The
fd-seal probe also proved that inherited fd 9 does not reach the candidate. Those are accepted
controls.

They do not freeze the program that owns and enforces them. The candidate has ten current
authority blocks:

```text
D007D_CUSTODY_SPEC_V3
D007D_SYSTEMD_ARGV_V3
D007D_BWRAP_ARGV_V3
D007D_FD_SEAL_V3
D007D_CUSTODY_ORACLE_V3
D007D_DOCKER_LIMIT_ARGV_V3
D007D_DOCKER_BUILD_ARGV_V3
D007D_DOCKER_PROBE_ARGV_V3
D007D_USTAR_PARSER_V2
D007D_CONTAINER_PROGRAM_V2
```

The eleventh marked block, `D007D_REVIEW_LAUNCHER_V1`, is explicitly historical. There is no
current `D007D_REVIEW_CUSTODY_V3` or equivalent executable parent. Direct marker inventory found
exactly those 11 balanced artifacts.

The current oracle exposes only `selftest`, `unit-shim`, `frames`, and `attacks`. In
`unit_shim`, lines 1266–1276 accept any nonempty string-array `bwrapArgv` supplied by the control
peer; lines 1291–1305 execute that array. The shim never compares it with
`D007D_BWRAP_ARGV_V3`. Therefore systemd child/MainPID/cgroup authentication, exact argv
comparison, transition enforcement, evidence lifecycle, and cleanup remain responsibilities of
an external parent defined only by prose.

The EOF contract is also internally inconsistent:

- the frozen spec transitions `RELEASED -- WAIT_AND_EOF --> DRAINING`, then
  `DRAINING -- CGROUP_EMPTY_TWICE --> UNIT_RECORDED`;
- prose says D7C2 EOF is accepted only after shim wait **and two empty cgroup scans**; and
- the prose transition table again requires EOF in `RELEASED` and empty scans only in
  `DRAINING`.

No observed-versus-accepted EOF state or event is defined. An implementer would have to invent
both the parent and the ordering semantics. An unspecified `REVIEWER_PARENT` is not frozen
executable authority, so the launch/held-inode boundary is not build-ready.

### P1-2 — D7C2 schemas improved, but the public archive and independent attack authority fail

**Trial 4 adjudication: not closed.** The schema/parser controls are accepted; the authority
contract is not.

The frozen self-test accepted exactly `canonical_archive` and `canonical_test`, rejected all 76
named mutants, emitted one 4,095-byte LF-terminated line, and hashed to
`3e6e85ec067c18e83cdf0237efcf357a0be8dd95a6ce8554ce561aa3b7601f1a`.
An independent USTAR generator/parser harness accepted its valid 4,096-byte archive and rejected
21/21 unique byte-distinct mutants. This closes the record-schema and independent USTAR-parser
parts of the prior finding.

The exposed archive interface nevertheless rejects its own canonical input. The direct rerun
fed a canonical type-4 `D7C2` frame containing `ustar-selftest` to the exact extracted oracle
with this command from the request worktree:

```bash
set -o pipefail
python3 -c 'import struct,sys; p=b"ustar-selftest"; sys.stdout.buffer.write(b"D7C2"+bytes((3,4))+b"\0\0"+struct.pack(">I",len(p))+p)' \
  | python3 <(git show 5894ebea50df8b7e65236247e10fb1c53713d282:plan/PROJECT_V5/D/0/07d.md \
      | sed -n '719,1383p') frames archive \
    '{"candidateSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","mode":"cp1-unit-custody","names":["custody"],"requiredLedger":[],"totals":{"cancelled":0,"fail":0,"pass":1,"skipped":0,"tests":1}}'
```

It exited 1 at `validate_frames` line 284 with `ValueError: archive order`. The CLI calls
`validate_frames(0, phase, expected)` with no `archive_fd`, while archive validation requires a
non-null `archive_fd`. Internal selftest passes only because `decide()` creates and supplies a
memfd. This is a canonical public-mode failure, not a malformed fixture.

The oracle's `attacks` mode also does not execute a custody attack. Lines 1353–1368 invoke
`[REVIEWER_PARENT, "attack", ...]` and accept the child program's canonical result object. No
current frozen artifact implements that parent or injects the nine effects. The exact 76-name
self-test contains no retained-writer case, so delayed kernel EOF remains dependent on the same
unexecuted runtime lane.

Thus parsers can reject malformed records, but the plan still cannot independently establish
that the runtime facts encoded by a canonical success record occurred.

### P1-3 — Docker identity is specified statically, but deadline and reconciliation authority conflict

**Trial 4 adjudication: not closed.** The static Docker improvements are accepted independently.

The exact build/probe arrays now carry parent-owned names, cidfiles, three labels, 2 GiB
memory/swap equality, PID limit 128, one CPU, three ulimits, stop timeout 10, init, read-only/no
network/cap-drop/no-new-privileges, non-root identities, and exact owned tmpfs mounts. The normal
transcript is operations `01..10` per role, and reconciliation branches have exact counts
3/6/8/10. Worst-case reconciliation is stated as 95.25 seconds within 100 seconds.

Two incompatible texts are both normative:

- the frozen spec and Docker section require 60 seconds for probe, **700** for build, 100 for
  reconciliation, and 40 reserve, totaling the 900-second outer deadline; but
- checkpoint-1 GREEN text at candidate line 2604 calls 60-second probe, **840-second build**, and
  900-second outer deadlines exact.

Both cannot be the exact deadline contract. Separately, a direct scan of the extracted current
oracle for Docker/cidfile/resource/reconciliation terms returned only the mode string
`docker-integration` and attack id `docker_escape`. It contains no Docker argv constructor,
recorder comparison, deadline, inspect/wait/kill/remove state machine, or residue scan. Those
checks again reside in the missing external parent.

The design therefore cannot deterministically tell checkpoint 1 which timeout budget or
executable reconciliation authority to implement and review.

### P2-1 — request reached-contract inventory cites nonexistent paths

The Trial 5 request assigns authenticated blobs to:

```text
gateway/src/process_supervisor.js
gateway/src/process_supervisor_helper.py
gateway/vendor/tmux-agents/manifest
```

All three `git cat-file -e <candidate>:<path>` checks exit 128. The same blob IDs exist at:

| Actual path | Blob |
|---|---|
| `gateway/src/adapters/process_supervisor.js` | `b0100b6c626207e6cc66bdc46e410efa48dc4655` |
| `gateway/src/adapters/process_supervisor_helper.py` | `e24376fce8b6b2919ca9ad1ba348a094dad4e413` |
| `gateway/vendor/tmux-agents/manifest.json` | `0c0f0c758a385d0a3ba727071213215d00c45f9e` |

Candidate sheet anchors use the actual adapter paths, so this does not create a second runtime
defect. It does make the request's claimed reached-contract path custody inaccurate and must be
corrected in a new immutable trial.

## Accepted controls and non-findings

Artifact extraction was LF-exact and all declared byte counts, hashes, and syntax checks match:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `D007D_CUSTODY_SPEC_V3` | 2,966 | `949f7cf28566c567d5e8874697ed6356b7311bc175f9e16cd74ec79d980a5749` |
| `D007D_SYSTEMD_ARGV_V3` | 602 | `0c2161937b37aff5aa193c142d9efb96aa71551485fbfe7dadab1bbf58427d42` |
| `D007D_BWRAP_ARGV_V3` | 1,160 | `f8ed2e5ff1b0b04c4a22e3424f98b0bfec15e72b811e87d0d302c9e0b3a68c9c` |
| `D007D_FD_SEAL_V3` | 740 | `136130354a4f9df53a1601397a8e27ba057d2260d5b547039b11a23db97b3e47` |
| `D007D_CUSTODY_ORACLE_V3` | 29,713 | `46a02317ee5c43f1e0696eba348f7e72629eb6dca8b414061041719b0e1d05ed` |
| `D007D_DOCKER_LIMIT_ARGV_V3` | 384 | `7bdb943f16872a9f83b17f8348d156f6a92c2f69d6eada8baeadc415086a7387` |
| `D007D_DOCKER_BUILD_ARGV_V3` | 1,313 | `a8cf8964ca012f0669073f0b372041b2228a4fa21820463e254b9723489d6295` |
| `D007D_DOCKER_PROBE_ARGV_V3` | 1,185 | `39b846649a56d1df506460a6ac8bcc494b377c225746311b7ae85883937685b9` |
| `D007D_USTAR_PARSER_V2` | 2,752 | `77e20732a688b6db779002cc6728a6dc8d604e2112f505a15d7046657e09ef4a` |
| `D007D_CONTAINER_PROGRAM_V2` | 2,908 | `fe8ab5b912eaf4ca6eda2a7ae408f965f390e3e80cb918f5b083b5ec717501d0` |
| `D007D_REVIEW_LAUNCHER_V1` (historical) | 8,327 | `789b74670a9313120ce4e1e1f29ee44b25476cce4d086103e4e51c43b7a01263` |

Other accepted controls:

- D7C2 selftest: 78 unique cases, 2 accepted / 76 rejected, no acceptance after the two
  canonical controls.
- Independent USTAR: valid control accepted; 21 unique mutants / 21 rejected / 0 accepted.
  Valid archive SHA-256 is
  `5e93ff7918d07f80c2fd7fd9aa9030a02aa0ab838e4f38bebb86071db36e6081`;
  canonical report SHA-256 is
  `724a712b3417eff7d0b8aec6e908c7b6622a1c1468cc16467d8844203a11fbf3`.
- `python3 scripts/ci_gate.py --repo-root "$PWD" --validate-only`: exit 0, status `passed`,
  errors `[]`, tests/pass/fail/skipped `0/0/0/0`. This is structural validation, not full CI.
- Markdown: 26 and 78 balanced fences; 12 relative links, six unique targets, zero unresolved.
- Current `test.gateway`: 123 paths, digest
  `sha256:132a5af375807e8d272ddf01516939a7834e33ca9d6dce61a22401b2af3a44f5`.
  Adding only the planned dedicated test gives 124 paths, digest
  `sha256:cc4b83a31abc1f1305f963d4fee40278fcf335c02f90dbd52210c1bd06d07bad`.
- Sheet status: 25 delivered-A complete; active B–I has 57 executable sheets; aggregate is
  39 complete + 4 in progress + 39 planned = 82, with 43 open. The in-progress paths are
  `C/1/00`, `D/0/01`, `G/0/02`, and `H/0/01`; D/0/07d remains planned.
- Checkpoint 1 remains this unconditional seven-path set, with no conditional path:

  ```text
  ci/suites.json
  tests/gateway/process_supervisor_session_port.test.js
  tests/gateway/process_supervisor_session_port_fixture.py
  tests/gateway/process_supervisor_session_port_pty.test.js
  tests/gateway/process_supervisor_session_port_relay.test.js
  tests/gateway/process_supervisor_session_port_fixture_owner.js
  tests/gateway/run_process_supervisor_session_port_real_host.sh
  ```

- Trial 1–4 request/result blobs are unchanged. There are no artifact hash/size, candidate or
  request pathset, protected-path, inventory, sheet-status, fence, link, whitespace, or USTAR
  mutant-acceptance discrepancies.

These controls are real but do not cure the missing parent authority, public archive failure, or
contradictory state/deadline contracts.

## Failed, unavailable, and uncredited lanes

- The canonical public frames/archive rerun is a substantive failure and is P1-2 evidence.
- The first final-synthesis process-substitution slice included the Markdown opening fence and
  produced `SyntaxError` before oracle execution. It is not credited. The clean rerun used exact
  source lines 719–1383 and reached `validate_frames`, producing the reported `archive order`
  failure.
- In phase A, initial suffixless-module loading, literal `manifest` lookup, escaped inventory
  command, delivered-A topology assumption, and two command-wrapper drafts failed setup. Each
  was discarded and rerun correctly; none is credited as a product or contract result.
- The nine external-parent attacks were not executed or credited because no frozen executable
  parent exists. Author-side or coordination observations are not substitute evidence.
- Live user-systemd/cgroup, bwrap namespace, AF_UNIX unit-shim, custom tmux, Docker daemon,
  container/image, provider, network, Redis, and PostgreSQL lanes were unavailable or outside
  this review and were not run.
- Full CI, product tests, product implementation, dependency installation, integration,
  promotion, release, tagging, and pushing were not run or credited.

## Limitations

This verdict reviews whether the plan is build-ready at the frozen request. It does not claim a
live systemd, cgroup, bwrap, Docker, custom-tmux, or full-CI result. Static option availability
is not daemon behavior, parser correctness is not custody authority, and the accepted
validate-only lane executed zero tests. Those limitations are why the missing executable parent
and contradictory contracts cannot be resolved by inference.

## Required correction before another review

1. Freeze a current executable custody/reconciliation parent, or an equivalently complete
   mechanically generated artifact whose exact bytes are determined by this plan. It must enforce
   the systemd/bwrap argv and identities, launch transitions, evidence lifecycle, Docker argv and
   recorder state machine, and real attack injections. A reviewer-selected external program is
   not sufficient.
2. Make the public `frames archive` interface accept the canonical archive with a bound sink fd,
   and add executable delayed-writer/EOF authority rather than claiming it through prose.
3. Define one executable EOF/cgroup order and one Docker budget; remove the 700/840 conflict.
4. Correct the reached-contract paths in the next immutable request and reproduce its exact
   candidate/request path custody.

## Disposition and lifecycle non-claims

The candidate is a **planned** design and is now independently **reviewed_KO**. It is not an
implemented, integrated, promoted, or released product state. This result does not authorize
checkpoint 1, does not unblock `D_0_1_SPLICE`, does not approve any external
`REVIEWER_PARENT`, and does not grant deletion, merge, tag, push, promotion, or release
authority.

No product, test, plan candidate, policy, dependency, workflow, prior evidence, or request file
was modified by this review. Only this result and the Trial 5 pending-to-KO index transition are
authorized review outputs.

> Public import note (2026-10-06): the source Git evidence contains a corporate
> email address, redacted here as `historical-email-redacted`. Original commit
> identifiers and verdict content are preserved; this is a sanitized imported copy.
