# Review Submission — Project V5 E/0/03 Plan (Trial 1)

## What was done

- Materialized E/0/03 as an executable operator-CLI contract rather than a
  feature summary.
- Made `D/0/05` and `E/0/00–02` explicit reviewed/integrated prerequisites and
  assigned inventory, approval, signature, audit projection, and CLI
  responsibilities without creating a second authority path.
- Froze the `inventory`, `status`, `approval`, and `audit` command surfaces,
  including the secure `approve` compatibility alias.
- Froze endpoint resolution, bounded timeouts, AF_UNIX-only thin-client
  behavior, strict DTOs, the JSON v1 envelope, human rendering, and exit codes
  0/1/2/3/4/5/6/7/70.
- Specified preview-before-consent-before-signer-before-effect ordering,
  context-bound interactive and noninteractive confirmation, external signer
  isolation, first-wins handling, and TOCTOU failure behavior.
- Added detailed RED/GREEN sequencing, acceptance criteria, verification
  commands, and canaries for raw data, secrets, subprocesses, files, shared
  services, and compatibility boundaries.

## Why

The current `agent-run audit show` and `agent-run approve` paths execute Node
helpers that read the audit JSONL or SQLite state directly. If retained, the
CLI could bypass the operator transport and turn an unavailable control daemon
into a misleading alternate authority path. The plan now requires one
authenticated local control channel and explicit failure when it is absent.

## Decisions taken

- A missing, non-socket, refused, closed, or timed-out control endpoint exits 3
  and never reads SQLite/audit, invokes a Node helper or public MCP, starts a
  Gateway, or connects to Redis.
- E/0/03 adds only bounded read-only `audit.list`/`audit.explain` projections
  to the E/0/00 control server; lifecycle, inventory, approval, signature, and
  authority changes return to their owning prerequisite sheets.
- Canonical decisions require the exact
  `DECIDE <decision> <approval-id> <context-digest>` phrase and an externally
  authorized signer. `--json` is rendering only; no `--yes` or unsigned
  compatibility path exists.
- Noninteractive decisions require `--non-interactive`, a configured signer
  ID, and exact context-bound confirmation. Signer configuration is
  operator-owned, argv-based, no-shell, bounded, and excluded from child
  environments/mounts.
- JSON success and failure each emit one allowlisted
  `agents-orchestrator/operator-cli/v1` envelope. Narrow human output wraps
  rather than truncating authority-bearing identifiers, refs, or digests.
- The existing direct audit/approve JSON shapes were not in the stable operator
  contract; a reviewed pre-1.0 CLI minor establishes the new versioned
  envelope. Existing policy command output remains unchanged.
- E/0/03 performs no MCP-catalog edit. E/0/02 alone owns the future versioned
  removal of `approval.respond`; the seven `coordination.*` tools,
  `message.*`, and `agents:events` remain unchanged.

## Verification

- `rg -n 'AUDIT_QUERY|APPROVAL_RESPOND|query-audit|approval-respond'
  cli/src/agents_cli/main.py gateway/scripts/query-audit.mjs
  gateway/scripts/approval-respond.mjs` — confirmed the two direct legacy
  paths that the implementation RED tests must eliminate from the CLI.
- Local-link resolver across `E/0/00–03`, `E/README.md`, `EPICS.md`,
  `SHEETS.md`, and `COVERAGE_MATRIX.md` — 78 local links checked, all
  resolved.
- `/home/carase/git/personal/agents-orchestrator/.venv/bin/pytest -q
  tests/structure/test_operator_cli_contract.py
  tests/structure/test_project_layout.py
  tests/structure/test_v5_coordination_docs.py` — 13 passed.
- `git diff --check -- plan/PROJECT_V5/E/0/03.md` — passed.
- Exact implementation-plan commit scope — only
  `plan/PROJECT_V5/E/0/03.md`.
- No runtime code, shared MCP/Redis operation, signer, key, credential,
  network access, tmux session, or temporary agent was used.

## Commit

- `ed5c304` — `docs(v5): freeze operator CLI contract (E/0/03)`

## Independent review request

Use **GPT-5.6 Sol**, reasoning **ultra**, and **Fast/Priority** execution if
available, and record the actual reviewer profile in the verdict. Review the
commit and final plan independently. In particular, verify:

1. every command has a server-side owner and the Python CLI remains a genuine
   thin client;
2. the compatibility commands cannot bypass the control socket, consent,
   signature, freshness, or first-wins state;
3. interactive/noninteractive confirmation and JSON behavior cannot grant by
   accident;
4. socket absence and all transport/protocol failures are total, bounded, and
   fallback-free;
5. signer configuration/output and hostile server fields cannot leak or
   execute;
6. output/exit contracts are complete and implementable without truncating
   authority-bearing values; and
7. no responsibility belonging to `E/0/00–02`, no public MCP catalog, and no
   `coordination.*`, `message.*`, or `agents:events` behavior was silently
   changed.

Publish either `E_0_3-plan-1_reviewed_OK.md` or
`E_0_3-plan-1_reviewed_KO.md`. Preserve this submission and report only
reproducible blockers. This is a plan review and must not be represented as
runtime implementation.
