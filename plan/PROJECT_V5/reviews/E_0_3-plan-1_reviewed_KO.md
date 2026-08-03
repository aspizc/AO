# Independent Review — Project V5 E/0/03 Plan (Trial 1)

Verdict: **KO**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **ultra**, execution profile
**Fast/Priority**.

## Reviewed scope

- Candidate plan commit:
  `ed5c30492c5a629a1083763c990857f8d3a72846`.
- Review submission:
  `0140a0d7febec8bdd72b9373e7894378ca70ddec`.
- Primary artifact: `plan/PROJECT_V5/E/0/03.md`.
- Contract context: `D/0/05`, `E/0/00–02`, `C/1/01`, `D/0/04`,
  `EPICS.md`, `SHEETS.md`, `COVERAGE_MATRIX.md`, the current Python CLI,
  and the current coordination catalog.

This is a plan verdict only. No runtime implementation, integration,
promotion, or release is credited.

## Blocking findings

1. **The preservation contract freezes the wrong coordination catalog.**

   E/0/03 says the public MCP boundary retains “the seven
   `coordination.*` tools” (`E/0/03.md:47-51`), and the review submission
   repeats that count (`E_0_3-plan-1_to_review.md:50-54`). That was the
   historical A-foundation count, but completed B/0/01 explicitly requires an
   exact eight-tool catalog and adds the eighth direct/MCP operation
   (`B/0/01.md:35-44`). The current implementation contains
   `coordination.status`, `register`, `heartbeat`, `discover`, `unregister`,
   `send`, `receive`, and `ack`.

   The later generic statement that `coordination.*` remains unchanged does
   not resolve the contradictory exact count. Trial 2 must preserve **all
   eight** current operations, name `coordination.status` explicitly, and make
   the catalog regression evidence exact. `message.*` and the legacy
   `agents:events` behavior must remain unchanged as already required.

2. **The dependency narrative overclaims the isolation guaranteed by
   D/0/05.**

   E/0/03 says D/0/05 guarantees that child agents “cannot inherit or
   discover” the operator endpoint (`E/0/03.md:26-30`). D/0/05 deliberately
   makes the narrower guarantee that children do not inherit or
   auto-discover the control plane, while explicitly refusing to claim that a
   same-UID `host-unconfined` child cannot inspect other host files
   (`D/0/05.md:31-34`, `D/0/05.md:47-53`).

   This distinction matters because E/0/03 uses a predictable runtime socket
   location and operator-local signer configuration. Trial 2 must carry the
   `host-unconfined` residual risk forward and describe non-inheritance and
   mount/environment exclusion without representing them as isolation or
   undiscoverability. The external signature and server-side audience/context
   checks must remain the authority boundary.

3. **The surface labelled “Frozen CLI v1” still leaves authority-relevant
   invocation semantics undecided.**

   The plan gives a range but no default for root `--timeout-ms`
   (`E/0/03.md:70-80`); it does not say whether `inventory list --kind` is
   required or has an all-kinds default, and gives no defaults for the new
   inventory/approval limits (`E/0/03.md:82-89`). It also marks
   `--signer <provider-id>` optional for interactive decisions but defines
   neither a default provider nor an interactive selection rule
   (`E/0/03.md:89`, `E/0/03.md:149-176`). The retained `audit show` surface
   calls `--limit` “existing” without freezing its current CLI default of 50.

   These choices change parsing, exit 2 behavior, bounded workload, and—most
   importantly—which external executable is authorized to sign. They cannot
   be deferred while calling the command surface frozen. Trial 2 must state
   requiredness and defaults for every such option, define deterministic
   interactive signer selection (or require `--signer`), and preserve or
   explicitly version every compatibility flag.

## Verified non-blocking properties

- The dependency row correctly names `D/0/05` and `E/0/00–02`, and the
  transitive ownership chain is consistent with the current V5 DAG.
- The plan keeps status `planned`, gates implementation on reviewed and
  integrated prerequisites, and does not claim runtime completion.
- The proposed Python client is a bounded local AF_UNIX thin client with no
  Gateway import, MCP reconnect/start, Redis access, direct SQLite/JSONL read,
  Node-helper execution, or fallback when the control service is unavailable.
- The approval flow orders immutable detail/challenge, full untruncated
  preview, exact context-bound consent, external signing, server
  revalidation, atomic first-wins application, and authoritative outcome.
  `--json` is rendering only.
- JSON output is one allowlisted envelope, human output escapes hostile
  terminal content, authority-bearing values are not truncated, and exit
  codes 0/1/2/3/4/5/6/7/70 have distinct stated classes.
- Public MCP catalog ownership remains with E/0/02 for the removal of
  `approval.respond`; E/0/03 itself does not authorize a catalog edit.

## Independent verification

- `pytest -q tests/structure/test_operator_cli_contract.py
  tests/structure/test_project_layout.py
  tests/structure/test_v5_coordination_docs.py` — **13 passed**.
- Local Markdown-link resolution across E/0/00–03, E README, `EPICS.md`,
  `SHEETS.md`, and `COVERAGE_MATRIX.md` — passed.
- `git diff --check ed5c304^..ed5c304`,
  `git diff --check ed5c304..0140a0d`, and
  `git diff --check ed5c304^..0140a0d` — passed.
- Commit ancestry and scope checks confirmed that `ed5c304` changes only
  `E/0/03.md`, while `0140a0d` adds only the review submission.
- Static catalog inspection found exactly eight current
  `coordination.*` tool definitions and reproduced the stale seven-tool
  statement in the submitted review artifact.

No network, MCP, Redis, live daemon, signer, private key, tmux session, or
runtime implementation was used or changed.
