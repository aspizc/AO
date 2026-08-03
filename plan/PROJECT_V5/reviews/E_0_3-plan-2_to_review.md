# Review Submission — Project V5 E/0/03 Plan (Trial 2)

## What was done

- Preserved the Trial 1 submission and KO append-only and corrected all three
  blocking findings in `E/0/03.md`.
- Replaced the stale seven-tool statement with the exact ordered eight-tool
  catalog: status, register, heartbeat, discover, unregister, send, receive,
  and ack.
- Narrowed the D/0/05 claim to non-inheritance, auto-discovery prevention,
  configured mount exclusion, and recursive-writer protection. The plan now
  carries forward same-UID `host-unconfined` inspection risk and requires a
  separate exact execution grant plus current operator consent.
- Froze requiredness, defaults, enums, lower/upper bounds, conditional
  combinations, and exit behavior for every v1 control CLI option, filter, and
  positional argument.
- Added deterministic control/signer timeout semantics, cursor binding/error
  mapping, signer configuration selection/validation, required signer behavior
  in both modes, and explicit compatibility treatment for the current `-d`
  alias and `audit show --limit 50`.
- Expanded contractual RED/GREEN, acceptance, and verification evidence for
  parser boundaries, exact catalog preservation, signer selection, cursor
  behavior, and host-unconfined grant/consent.

## Why

Trial 1 froze an obsolete coordination count, represented D/0/05 more strongly
than its own non-scope permits, and left defaults that affect workload and
signer authority undecided. Those ambiguities would let separate
implementations produce different CLI behavior while each claimed conformance.
Trial 2 makes each choice testable without weakening the thin-client or
approval authority boundary.

## Decisions taken

- The unchanged catalog is exactly, in order:
  `coordination.status`, `coordination.register`, `coordination.heartbeat`,
  `coordination.discover`, `coordination.unregister`, `coordination.send`,
  `coordination.receive`, and `coordination.ack`. No ninth coordination tool is
  authorized.
- `--timeout-ms` defaults to 3000 and accepts 100–10000 inclusive per complete
  control exchange. `--signer-timeout-ms` defaults to 30000 and accepts
  1000–120000 inclusive per signer process.
- `inventory list --kind` defaults to `all`; every paginated command defaults
  `--limit` to 50 with range 1–100; `--cursor` is absent by default and bounded
  to 1–2048 UTF-8 bytes.
- Cursors are server-bound to version, audience, operation, filters, and page
  size. Invalid/filter-mismatched cursors map to exit 2; expired cursors map to
  exit 5.
- `--signer` is required in interactive and noninteractive decisions, has no
  default/first/environment provider, and retains the current `-d` decision
  alias. Noninteractive mode additionally requires exact `--confirm`;
  interactive mode forbids that option and uses the TTY prompt.
- A valid provider missing from valid signer configuration maps to exit 6;
  unsafe/malformed local configuration maps to exit 2. Signer configuration
  resolution never searches the repository/workspace.
- Configured child environments/mounts avoid inheritance and auto-discovery,
  but this is not same-UID host isolation. External signatures and server
  audience/context checks remain decision authority; they do not claim to
  neutralize an explicitly consented `host-unconfined` process.

## Verification

- Trial 2 pre-edit contract probe — expected RED:
  `eight-tool catalog`, `host-unconfined residual risk`, `timeout default`,
  `inventory kind default`, `approval limit default`, `required signer`, and
  `audit limit default` were all missing.
- Post-edit contract probe — GREEN for ten checks: exact eight-tool catalog,
  host-unconfined residual risk/grant/consent, control timeout default/range,
  inventory kind default, all limit defaults/range, cursor contract/error
  mapping, required signer/no default, signer timeout default/range, retained
  `-d`, and exit mapping.
- Static production catalog inspection — exactly eight names in the frozen
  order, beginning with `coordination.status`.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/pytest -q
  tests/structure/test_operator_cli_contract.py
  tests/structure/test_project_layout.py
  tests/structure/test_v5_coordination_docs.py` — 13 passed.
- Local-link resolver across `E/0/00–03`, `E/README.md`, `EPICS.md`,
  `SHEETS.md`, and `COVERAGE_MATRIX.md` — 78 local links checked, all
  resolved.
- `git diff --check -- plan/PROJECT_V5/E/0/03.md` — passed.
- Exact correction-commit scope — only `plan/PROJECT_V5/E/0/03.md`.
- No runtime code, network, MCP, Redis, live daemon, signer, key, credential,
  tmux session, or agent spawn was used or changed.

## Commit

- `ccea63c` — `docs(v5): correct operator CLI contract (E/0/03 trial 2)`

## Independent review request

Use **GPT-5.6 Sol**, reasoning **ultra**, and **Fast/Priority** execution if
available, and record the actual reviewer profile. Re-review the final plan
independently against the preserved Trial 1 KO. In particular, verify:

1. the eight exact current coordination operations—including
   `coordination.status`—are named, ordered, and covered by exact regression
   evidence while `message.*` and `agents:events` remain unchanged;
2. no sentence turns D/0/05 non-inheritance/mount exclusion into a claim of
   same-UID host-unconfined isolation or undiscoverability;
3. separate host-unconfined grant/current consent and the residual exposure
   are explicit;
4. every argument/filter/default/range/combination, both timeout classes,
   pagination cursor, and signer choice has one deterministic parse and exit
   result;
5. interactive and noninteractive paths both require an explicitly named
   signer with no implicit provider selection;
6. current compatibility flags/defaults are either retained (`-d`, audit limit
   50) or explicitly included in the versioned minor; and
7. the correction remains planning-only and does not authorize an MCP catalog
   mutation beyond E/0/02's separately owned `approval.respond` removal.

Publish either `E_0_3-plan-2_reviewed_OK.md` or
`E_0_3-plan-2_reviewed_KO.md`. Preserve all prior trial artifacts and report
only reproducible blockers. This plan review is not runtime implementation,
integration, promotion, or release evidence.
