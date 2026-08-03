# Independent Review — Project V5 E/0/03 Plan (Trial 2)

Verdict: **OK**

Reviewer profile: model **GPT-5.6 Sol**, reasoning **ultra**, execution profile
**Fast/Priority**.

No blocking findings.

## Reviewed scope

- Preserved Trial 1 verdict:
  `E_0_3-plan-1_reviewed_KO.md`.
- Correction commit:
  `ccea63c7dd866a099bbaab7d607f28d2d184a3ae`.
- Trial 2 submission:
  `0bc0492d1baa279d8646c525eb8b537c27cee9c4`.
- Primary artifact: `plan/PROJECT_V5/E/0/03.md`.
- Contract context: `D/0/05`, `E/0/00–02`, `C/1/01`, `D/0/04`,
  `EPICS.md`, `SHEETS.md`, `COVERAGE_MATRIX.md`, the current Python CLI,
  and the current coordination catalog.

This is approval of the corrected implementation plan only. E/0/03 remains
`planned`; this verdict is not runtime implementation, integration, promotion,
or release evidence.

## Trial 1 blockers

All three blockers are closed.

1. **The current eight-tool coordination catalog is preserved exactly.**

   The plan and current source now name the same ordered catalog:
   `coordination.status`, `coordination.register`,
   `coordination.heartbeat`, `coordination.discover`,
   `coordination.unregister`, `coordination.send`,
   `coordination.receive`, and `coordination.ack`
   (`E/0/03.md:49-56`). RED, GREEN, acceptance, and verification require those
   eight entries, explicitly including `coordination.status`, and reject a
   missing or ninth operation (`E/0/03.md:331-339`,
   `E/0/03.md:390-391`, `E/0/03.md:431-434`,
   `E/0/03.md:448-461`). E/0/03 still owns no public MCP registry mutation;
   `message.*` and the legacy `agents:events` behavior remain unchanged.

2. **The same-UID `host-unconfined` limitation is explicit and no longer
   represented as isolation.**

   The dependency narrative now limits D/0/05 to non-inheritance,
   auto-discovery controls, configured mount exclusion, peer/audience checks,
   and recursive-writer prevention. It expressly says that these controls do
   not make the endpoint or operator files undiscoverable to a same-UID
   `host-unconfined` child (`E/0/03.md:24-39`).

   Endpoint and signer sections consistently preserve the residual ability to
   inspect the predictable socket, operator configuration, host files,
   processes, and possibly operator executables
   (`E/0/03.md:121-128`, `E/0/03.md:236-267`). Such a launch requires a
   separate exact execution grant and current operator consent. The external
   signature and server audience/context checks remain decision authority, but
   are not described as a same-UID sandbox. This matches D/0/05's explicit
   non-scope and acceptance boundary.

3. **The v1 CLI parse, signer, cursor, timeout, compatibility, and exit
   behavior is deterministic.**

   The input matrix freezes root-versus-leaf placement, requiredness, defaults,
   enums, lexical limits, byte bounds, combinations, and inclusive numeric
   ranges (`E/0/03.md:75-109`). In particular:

   - control timeout defaults to 3000 ms and is bounded to 100–10000 ms per
     complete exchange;
   - inventory kind defaults to `all`;
   - every page limit defaults to 50 and is bounded to 1–100;
   - cursors default absent, are bounded to 1–2048 UTF-8 bytes, remain opaque
     to the client, and are server-bound to version, audience, operation,
     filters, and page size;
   - `--signer` is required in both modes with no default, first-provider, or
     environment selection;
   - signer timeout defaults to 30000 ms and is bounded to 1000–120000 ms;
   - interactive use forbids `--confirm`, while noninteractive use requires
     its exact server-projected value;
   - the current `-d` alias and `audit show --limit 50` default are retained.

   Socket/config resolution and invalid-input timing are total
   (`E/0/03.md:104-128`). Cursor mismatch and expiry have stable protocol and
   exit mappings (`E/0/03.md:192-197`). Signer config path selection,
   ownership/mode checks, provider selection, no-shell execution, and failures
   are deterministic (`E/0/03.md:236-259`). Exit classes
   0/1/2/3/4/5/6/7/70 cover success/domain, usage/config, transport, protocol,
   conflict/expiry, signer, consent, and unexpected safe failure respectively
   (`E/0/03.md:269-310`).

## Unchanged safety and ownership checks

- Dependencies remain exactly `D/0/05` and `E/0/00–02`; inventory/status,
  immutable approval context, and signed first-wins mutation remain owned by
  their prerequisite sheets.
- The Python CLI remains a bounded AF_UNIX thin client. It does not import
  Gateway code, start/reconnect MCP, start another Gateway, connect to Redis,
  execute Node helpers, or directly open SQLite, JSONL, state, artifact, or
  policy files.
- Missing or unhealthy control transport fails explicitly with exit 3 and has
  no database, audit-file, public-MCP, Node-helper, Redis, or daemon fallback.
- Preview includes untruncated server-derived authority fields and precedes
  exact consent; consent precedes external signing; signing precedes atomic
  decision submission. `--json` remains rendering only.
- Human rendering escapes terminal controls and does not truncate
  authority-bearing values. JSON success and failure each use one allowlisted
  v1 envelope without banners, prompts, tracebacks, or arbitrary server data.
- The only future MCP catalog mutation named here remains E/0/02's separately
  owned removal of `approval.respond`.

## Independent verification

- `/home/carase/git/personal/agents-orchestrator/.venv/bin/pytest -q
  tests/structure/test_operator_cli_contract.py
  tests/structure/test_project_layout.py
  tests/structure/test_v5_coordination_docs.py` — **13 passed**.
- Independent static catalog comparison — the plan and
  `gateway/src/tools/coordination.js` contain the same eight ordered
  operations, with `coordination.status` first.
- Independent contract probes — all required defaults, inclusive ranges,
  explicit signer rules, cursor classes, retained `-d`, and exit rows are
  present; the host-unconfined residual-risk/no-isolation clauses are present.
- Local Markdown-link resolution across E/0/00–03, E README, `EPICS.md`,
  `SHEETS.md`, and `COVERAGE_MATRIX.md` — **78 targets resolved**.
- `git diff --check 0a0a841..ccea63c`,
  `git diff --check ccea63c..0bc0492`,
  `git diff --check 0a0a841..0bc0492`,
  `git show --check ccea63c`, and
  `git show --check 0bc0492` — passed.
- Commit ancestry and scope checks confirmed that `ccea63c` changes only
  `plan/PROJECT_V5/E/0/03.md`, while `0bc0492` adds only the Trial 2 review
  submission.

No network, MCP, Redis, live daemon, signer, private key, tmux session, agent
spawn, runtime implementation, or test/plan correction was used or changed by
this review.
