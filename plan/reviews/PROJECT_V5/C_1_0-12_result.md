# C/1/00 Trial 12 — independent review result

Verdict: **KO**.

Execution profile: **GPT-5.6 Sol; reasoning: ultra; execution:
Priority/Fast.**

This review is independent of the author. It inspected the submitted Git
objects, the actual correction range, the authoritative Trial 11 result,
implementation, tests, manifests, ADRs, and operator documentation. It also
ran the focal and complete gates plus independent hostile-runtime and
raw-control probes rather than accepting the Trial 12 request's claims.

## Reviewed identity and scope

- Authoritative Trial 11 `KO` / Trial 12 base:
  `fc2c5aed6443d606f97e39cbbc2c6bdcd0c2962a`
  (`tree 728aa550db410ab06bffa6a771c34f1d1029f15d`).
- Trial 12 technical commit:
  `939b04cc48c18cb25e93dfbc65ee2ee65603561b`
  (`tree be2845390a2389954850e7ab75d55345c8869fa3`).
- Trial 12 request commit:
  `9d62f2b686746c012042b83fd76cebb94d2c0964`
  (`tree 47bda316aea627243bfd99068a393acf5df2fa36`).
- The technical commit is the direct child of the authoritative Trial 11
  result. The request is the direct child of the technical commit and adds
  only `plan/reviews/PROJECT_V5/C_1_0-12_review.md`.
- The technical range contains the declared **16 files, 714 insertions, and
  67 deletions**. No implementation is hidden in the request commit.

## Blocking findings

### P1 — four magic bytes still let an invalid host image reach Node's shell fallback

`hasSupportedExecutableHeader` treats the first four bytes as a complete
native-image decision at
`gateway/src/adapters/sync_process.js:155-160`.
`verifyRunnerExecutable` then accepts that decision without establishing that
the file is a loadable host-native executable at lines 296-307.

An independent real Linux probe created a regular mode-`0700` file beginning
with the host ELF magic `7f454c46`, followed by non-ELF shell text. Direct
Node execution proved that the kernel `ENOEXEC` reached Node's shell fallback:

```json
{
  "malformedHostImageDirect": {
    "status": 0,
    "signal": null,
    "error": null,
    "shellDiagnostic": true
  }
}
```

The same file through the submitted real `spawnSyncWithDeadline` path
reported:

```json
{
  "throw": "SYNC_RUNNER_FAILED",
  "runnerCode": "INVALID_CONTROL"
}
```

It therefore did not expose the required
`SYNC_RUNNER_UNAVAILABLE`. The added regression at
`tests/gateway/sync_process_deadline.test.js:2168-2182` checks only a
foreign-host four-byte header and a plain-text interpreter, not a malformed
same-host image. This leaves the real `ENOEXEC`/shell-fallback class open
behind a forgeable prefix and contradicts ADR-009's statement at
`docs/adr/ADR-009-synchronous-provider-boundary.md:36-46` that only host-native
images are admitted and no shell fallback participates. It also contradicts
the unsupported-image claim in the sheet and operator guidance.

Minimal correction: make the initial configured-runtime launch incapable of
using Node's `ENOEXEC` shell fallback for a malformed same-host image, map the
authenticated failure to `SYNC_RUNNER_UNAVAILABLE`, and regress a real
truncated/corrupt host-magic image through the native path. Four prefix bytes
alone are not a sufficient proof.

### P2 — an `env` shebang target is not required to be bare

The declared contract requires an `env` wrapper to name one bare host-native
target resolved through the effective cwd and `PATH`. However,
`envShebangTarget` at
`gateway/src/adapters/sync_process.js:222-232` rejects whitespace, comments,
options, and assignments but does not reject `/`. `resolveExecutable` at
lines 121-137 deliberately accepts slash-bearing absolute and relative paths.

An independent real two-stage launcher/runner probe used:

```text
#!/usr/bin/env /tmp/agents-orchestrator-c100-t11-venv/bin/python
```

The wrapper completed the provider path with native status 0:

```json
{
  "nonBareEnvTargetBoundary": {
    "status": 0,
    "signal": null,
    "error": null
  }
}
```

This bypasses the promised bare-name/PATH contract. The positive tests at
`tests/gateway/sync_process_deadline.test.js:2219-2263` exercise bare
`python3` and `python-v5-relative` names but contain no negative absolute- or
relative-slash case. The accepted behavior contradicts ADR-009 at
`docs/adr/ADR-009-synchronous-provider-boundary.md:37-41`, the operator guide
at `docs/operator-guide.md:105-110`, and the Trial 12 sheet claim.

Minimal correction: reject any `env` target containing `/`, add absolute- and
relative-slash negative cases, and retain the existing effective-cwd relative
`PATH` positive case.

## Passing independent evidence and retained boundaries

- The Darwin manifest now accounts for exactly **15** Linux-kernel structure
  skips and exactly two Linux-only Gateway skips. The Gateway IDs bind to
  `linux-prctl-parent-death` for parent-death cleanup and
  `linux-pidfd-subreaper` for adopted-child deadline drain in both
  `ci/suites.json` and `ci/suites-contract.json`. The macOS Python 3.11/3.12
  rows still invoke the unchanged `scripts/ci.sh`.
- The bounded shebang reader uses one nonblocking/CLOEXEC descriptor, an
  `fstat` size, positional reads, and a loop that does not infer EOF from a
  short read. The focal real paths reject the submitted empty, whitespace,
  relative, CR/NUL, comment, multiword, missing, foreign-loader,
  boundary-truncated, FIFO, and directory cases, and the direct/bare-`env`
  positive wrappers traverse both launcher and runner. These passes do not
  cure the two concrete counterexamples above.
- Both Python producers now emit compact `sort_keys=True` JSON. An independent
  hostile-control probe exercised reordered and duplicate-key forms of all
  seven frames: READY, provider outcome, provider exec, runner error, runner
  deadline, runtime exec, and launcher error. All **14/14** forms failed
  closed as `INVALID_CONTROL` or `INVALID_LAUNCH_CONTROL`.
- Provider outcome, provider exec code/errno, runtime exec, and launcher
  internal-error records remain bound to native status, signal, and spawn
  error. An authenticated `launcher_error` retains its typed code only for
  exit 126, null signal, and no native spawn error; the focal mismatch cases
  report `LAUNCHER_OUTCOME_MISMATCH`.
- Trial 12 changes the runner's containment implementation only to sort JSON
  keys. The retained Linux/Darwin ownership, `waitid(..., WNOWAIT)`,
  subreaping, parent-death cleanup, absolute deadline, adopted-session drain,
  two-empty-snapshot rule, PGID confinement, native `ENOBUFS`, kqueue
  registration, and exception-safe invalidation seams remain present. The
  **44/44** focal run exercised the applicable Linux real-process cases and
  deterministic Darwin seams.
- ADR-007, the CI contract, and the manifests agree on the exact **15+2**
  Darwin skip boundary. ADR-009, architecture, the operator guide, MVP2
  runbook, C/1/00 sheet, Stage C ledger, and sheet registry are mutually
  aligned on the intended Trial 12 contract, but the P1 and P2 above make the
  executable behavior and the associated claims false.
- No native macOS host or executor was available:
  `uname -a` identified Linux and `sw_vers` was unavailable. This review does
  not convert Linux execution, manifest configuration, or deterministic
  Darwin seams into completed native macOS Python 3.11/3.12 evidence.

## Verification

- Isolated focal with
  `AGENTS_PYTHON_BIN=/tmp/agents-orchestrator-c100-t11-venv/bin/python`:
  `node --test --test-concurrency=1 tests/gateway/sync_process_deadline.test.js`
  — **44 passed, 0 failed, 0 skipped**.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure/test_ci_suite_manifest.py` — **87 passed, 0 failed**.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python -m pytest -q
  tests/structure` — **232 passed, 0 failed**.
- `/tmp/agents-orchestrator-c100-t11-venv/bin/python
  scripts/ci_gate.py --validate-only` — passed with zero errors.
- The strongest practical isolated `./scripts/ci.sh` run in the supplied venv,
  with Redis, PostgreSQL, Temporal, real-provider, and real-E2E opt-ins absent,
  exited zero and accounted for **1,201 tests / 1,189 passed / 12 exact
  allowed skips / 0 failed**. It included Gateway **818 passed / 9 PostgreSQL
  skips**, E2E **24/24**, CLI **29/29**, LangGraph **81 passed / 3 opt-in
  skips**, lock/lint/policy validation, and the disposable MCP smoke.
- Independent seven-frame raw-control probe — **7/7 reordered and 7/7
  duplicate-key records rejected**.
- Independent real malformed-host-image and non-bare-`env` probe — reproduced
  the P1 `SYNC_RUNNER_FAILED/INVALID_CONTROL` and the P2 successful status 0
  quoted above.
- `git diff --check` passed for both the technical range and request range.

## Integrity and containment

- `gateway/src/tools/message.js` remains byte-identical at
  `sha256:6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- The technical range changes no Trial 1-11 request/result artifact,
  `message.*`, `agents:events`, coordination Redis/service transport, policy,
  migration, dependency manifest, lockfile, provider, tmux, root README,
  audit, Wave 2, or Project V5 D reference.
- Shared Redis/MCP, PostgreSQL, Temporal, real providers, tmux, credentials,
  policies, migrations, dependencies, `message.*`, and `agents:events` were
  not mutated or used as external integration targets. The MCP smoke was
  disposable and isolated.

## Final status

Task `V5 C/1/00`, Trial 12: **reviewed KO**.

Trial 12 cannot close while a corrupt same-host magic prefix can still reach
Node's shell fallback and produce the wrong stable error, and while an `env`
wrapper can bypass the declared bare-name/PATH contract. This result does not
authorize integration, promotion, release, or a Trial 12 `OK` claim.
