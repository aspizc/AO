# Project V5 D/0/07d Design Trial 8 — review request

## Review identity

- Review id: `D_0_7D_DESIGN-8`.
- Candidate: `bc7e4d725d6ca379c367f3d8fbfca2844013e1d3`.
- Candidate tree: `a55df0adbec7ba15de1c189de376f6a299eaa9dc`.
- Sole parent: `a62ab24fe93af8ea3214d11fa31849541794b3b0`
  (immutable Design Trial 7 `reviewed_KO` result imported onto this lane).
- Candidate branch: `plan/V5-D-0-07d-rebaseline`.
- Request trace: `tr-v5-d007d-design-t8-ec8cc47b-3fe0-4bd3-8c32-a439fdc2d9d1`.
- Candidate delta: only `plan/PROJECT_V5/D/0/07d.md`, 88 insertions and
  56 deletions.
- Sheet blob: `d1b01e9af747fd56177e88a18748426bcdad43b1`.
- Sheet SHA-256:
  `ca4883a396898dfe33c1e2f93d5ae337887e5b9c8114b856e021768e4f7b5dcd`.
- Stable patch-id:
  `c363c472ca7bacc889a60a03d0fcf4426b1b1093`.

A fresh independent reviewer must authenticate these values and write only the
immutable Trial 8 result plus its index verdict. The author, this request,
messages, hashes, and deterministic transcripts are untrusted inputs, not an
OK. This request makes no implementation, integration, promotion, release, or
support claim.

## Trial 7 verdict custody and provenance correction

Trial 7 is immutable `reviewed_KO` at parent `a62ab24`. Its result file must
not be rewritten. That file's `Request trace` field contains
`tr-v5-d007d-design-t7-7e448e92-917f-4497-ad19-986b54de2bd5`, which is the
Trial 7 request/attempt trace, not the session that issued the verdict. The
actual independent verdict session was:

- trace:
  `tr-v5-d007d-design-t7c-0102c840-f2e5-4c23-8952-1234724e114e`;
- task: `ts-63e9eea7-5ec7-4f46-aad6-471631eaa0eb`;
- branch: `review/V5-D-0-07d-design-t7-fable-c`;
- reviewer-authored commit: `5a98b22`, imported on this lane as `a62ab24`.

This disclosure corrects provenance for Trial 8 review only. It neither edits
nor invalidates the append-only Trial 7 result, and it grants no review
authority to the request trace.

## Trial 7 findings and unadjudicated seams

Trial 8 claims these exact corrections; the reviewer must decide each one:

1. **P0 prerequisite and authority source.** Checkpoint 1 now requires a
   prospective independent OK in
   `D_0_7D_DESIGN-8_result.md`; Trials 1–7 grant no implementation authority.
   Reviewer-custody execution extracts the Trial 8 spec, oracle/attack driver,
   and fd-seal bytes from the exact independently approved Trial 8 blob, with
   no KO Trial mislabeled as approved.
2. **P1 integration baseline and inventory.** The sheet is rebaselined on
   integrated `main` `07556feb30aafe4040382993bc199bb9fe0bcd97`, tree
   `8368598438ef0dda88f6a43fc7fdaa190d576841`, and freezes the reproducible
   `test.gateway` 126-to-127 path transition below.
3. **Unadjudicated C — D007C path shape.** The verified custom binary is
   mounted as `/inputs/tmux`, while `D007C_TEST_TMUX_PATH` is the absolute
   containing directory `/inputs`; the two companion variables remain
   `D007C_RUN_REAL_TMUX_PROBE=1` and
   `D007C_TMUX_SOCKET_NAME=d007c-control-probe`.
4. **Unadjudicated D — total provenance.** The design inherits no numeric
   `80/80` total. The authenticated Checkpoint 1 RED must derive and freeze the
   complete ordered root-TAP name manifest, count, and canonical digest; GREEN
   must reproduce the same manifest/count with every test passing and zero
   skip/cancel. The socket-name-missing run remains false setup RED only.

The seven Trial 6 seams remain conjunctive and require fresh adjudication:

1. two retained Unix stream socketpairs bound to the sole production parent;
2. the complete pre-release MainPID/uid/gid/peer/pidfd/executable/argv/start
   token/systemd-child/cgroup authentication conjunction with no re-resolution;
3. Docker evidence bound to observed operation transcripts and the derived
   3/6/8/10 reconciliation branches;
4. one non-resettable T0 and executable 10/60/700/100/40 slices under the
   900-second outer deadline, including separated scans and one cleanup;
5. exact container argv and private Docker environment, direct child pidfd
   custody, held-dirfd/no-follow cidfile adoption, and direct build streaming
   into the retained output inode;
6. production, contracts, attacks, finalization, and cleanup routed through
   the same parent custody mechanism; and
7. independent candidate cases `missing-d7c2-after-shim-reaped` and
   `missing-diagnostic-after-shim-reaped`, each rejecting before
   `BOTH_EOF_ACCEPTED`.

Any unresolved seam is KO. Evidence in another seam cannot average it away.

## Reproduced integration inventory

The author read `ci/suites.json` and the tracked path set from the exact
`07556fe` tree, applied the frozen `test.gateway` includes
`gateway/tests/**/*.test.js` and `tests/gateway/**/*.test.js`, applied the
exclude `tests/gateway/*_live.test.js`, sorted the matched paths, and hashed
their LF-joined names with no terminal LF, matching `ci_gate.inventory_digest`.
The reproduced facts are:

| Inventory | Paths | SHA-256 |
|---|---:|---|
| `07556fe` `test.gateway` | 126 | `sha256:f6bf19a001a01341c9dad63ab55f21bfd7b68571565b061f42b4a0e097f3922e` |
| plus the sole planned path | 127 | `sha256:1dd0cc26a0f8c165e4ff536641acf470b7b6c7ad17342450027cdaa9fff2431d` |
| `07556fe` `lint.gateway` unchanged | — | `sha256:854bc480c875e835c81de3b1a0f7e0865f01304c7f570a2a6ec56b69db2e7cd4` |

The sole planned path is
`tests/gateway/process_supervisor_session_port.test.js`; it is absent from
`07556fe`. The reviewer must independently reproduce all three claims.

The seven declared `07a–c` paths are byte-identical between the prior baseline
`d0bf521` and `07556fe`. Their ordered blobs are:

```text
b0100b6c626207e6cc66bdc46e410efa48dc4655
e24376fce8b6b2919ca9ad1ba348a094dad4e413
0c0f0c758a385d0a3ba727071213215d00c45f9e
73ec705c12c72a80203422812544415ab8cb025d
67d60009e342e96221ea0f375de618e0d8609391
b4d174f937d995540265b55549cab3794ad6df97
58b4e71b91225e68def87282907fb33dd61acf91
```

The candidate sheet names the corresponding paths in the same order.

## Frozen deterministic evidence

The reviewer must extract each fence from the candidate sheet with LF fidelity,
reject duplicate JSON keys, compile the oracle, verify the packed contract
bytes, and reproduce the commands rather than trusting this table:

| Evidence | Lines / bytes | SHA-256 |
|---|---:|---|
| V4 custody spec | 126 / 5,480 | `1cb01a4287cb61c81adfb106e8ea058d2b217a7ef8972f6c311d2bbef1e969de` |
| BWRAP argv V3 | 23 / 1,323 | `87b9dfbe5730fcac337879d00767f22a06aaa35e2b388a53030e988262f92c01` |
| V4 custody oracle | 3,687 / 175,351 | `c24b6b31bc976daae905ed6ad37d3f140cee67afef83b4fc18f0b5b1ca20d116` |
| selftest stdout | 1 / 58,405 | `b8521d642192d11700ec6f3adc620d45b4da254fffed2f2aafbad214800eb7c3` |
| owner-proof stdout | 1 / 52,841 | `64311ff9691f94333e953f0b118f153f3200fe708ab59a97a34088e62080599e` |
| contracts stdout | 1 / 42,933 | `0503bf6448d42126a4d7da17bd38a580f46ea55209c615dfd61c5beaa3c7501d` |

The author reproduced all three one-line stdout hashes, proved the packed
`BWRAP_ARGV_V3` bytes equal the text fence, proved the JSON and oracle digest
constants equal that fence, and exercised `bwrap_argv` with an output present.
Its exact mount target and three D007C environment pairs match the Trial 8
contract above.

## Verification and full-gate boundary

The author also reports: duplicate-key-rejecting spec parse green; oracle
compile green; seven-of-seven rebaseline blob identity green; exact 126-to-127
inventory derivation green; zero executable `PENDING`; `git diff --check`
clean; one-file candidate scope clean. The reviewer must reproduce these and
inspect the mechanisms, not only the reported hashes.

The author did **not** run `bash scripts/ci.sh` for this documentation-only plan
candidate and did not run the privileged real-host/Docker attack matrix. There
is therefore no aggregate CI, host-custody, Docker, or implementation pass
claim in this request. Those omissions cannot be recorded as green evidence;
the independent design review must execute every environment-available
deterministic authority check and state any unavailable lane exactly.

## Required disposition

Write `plan/reviews/PROJECT_V5/D_0_7D_DESIGN-8_result.md`, update only the
pending Trial 8 index row, and commit those two evidence paths with an explicit
pathspec. `reviewed_OK` is available only if the Trial 7 P0/P1 findings, both
unadjudicated C/D seams, and every Trial 6 seam are mechanically closed and the
plan is executable without a hidden human choice. Otherwise issue
`reviewed_KO` with exact line/mechanism evidence and the next required
correction. Do not edit the candidate sheet or any product, test, script,
dependency, workflow, or policy path.
