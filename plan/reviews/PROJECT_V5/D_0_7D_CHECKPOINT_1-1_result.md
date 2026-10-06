# Project V5 D/0/07d Checkpoint 1 — Trial 1 verdict

**Verdict: reviewed_KO**

Issued from a fresh independent reviewer session that did not implement this
checkpoint (AGENTS.md Rule 13). This verdict is scoped: it stops at the first
dispositive, structurally-fatal defect and does not run the broader custody,
Docker, or full-CI authority gates, which are moot once the wrapper cannot be
invoked with the required modes.

## Authenticated identity

- `git HEAD` = `5a29dabba37cb40193b0fdb59b4884bcda378bdc` (request commit).
- Candidate `e27d8a7f89cfdb870ffd4b4c7a78d72eee3bc398` resolves to tree
  `9cd04f26375e88abca00a98d373956b7f40e9a4f`, matching the request's declared
  `candidate tree`.
- Working tree clean (`git status --porcelain` empty).

## Dispositive defect — wrapper rejects every required CP1 mode

The candidate wrapper `tests/gateway/run_process_supervisor_session_port_real_host.sh`
dispatches on `$mode` with arms only for `--bootstrap-probe`,
`--cp1-unit-teardown`, `--cp1-unit-stream`, `--cp1-unit-custody`, `--focused`,
and `--stream-build`; the `*)` default is `exit 64` (usage error).

The frozen parent and CP1 verification in `plan/PROJECT_V5/D/0/07d.md` require
modes the wrapper does not implement:

- Lines 5320–5321: the frozen V4 parent's `verify_binary()` invokes
  `"$wrapper" --verify-extension "$run_root/tmux-3.6a-agents.1" 3>&3` on **every**
  authority build.
- Line 5326: for non-`docker-integration` runs the parent invokes
  `"$wrapper" "--$mode"`, e.g. `--full-ci`.
- Lines 5852/5854/5856: CP1 verification mandates `docker-integration` and
  `full-ci` authority runs, both of which reach the wrapper (and every build
  first passes through `verify_binary` → `--verify-extension`).

## Reproduction (exit codes recorded)

Invoked with valid absolute `D007D_CANDIDATE_ROOT` (candidate repo root) and
`D007D_COORDINATOR` (existing absolute file); `node v22.22.1` present and the
coordinator file present, so all pre-`case` guards pass and the exit code
reflects the mode dispatch itself (the `*) exit 64` arm), not a pre-check
failure:

| Mode | Exit code |
|---|---:|
| `--verify-extension` | `64` |
| `--docker-integration` | `64` |
| `--full-ci` | `64` |

All three required CP1 modes are rejected with `64`. The very first authority
step — `verify_binary`'s `--verify-extension` call — aborts with `64`, so no
authority build, Docker integration, or full-CI run this candidate claims can
even be reached through the frozen parent contract.

## Conclusion

The candidate cannot satisfy the Checkpoint 1 verification contract of
`D/0/07d` (lines 5310–5330 and 5825–5860): the wrapper does not implement
`--verify-extension`, `--docker-integration`, or `--full-ci`. Per the review
instruction, a candidate that rejects required CP1 modes is an immediate KO.

**reviewed_KO.** Checkpoint 2 must not begin. Corrections go in the next trial
(Rule 13); this verdict file is immutable.
