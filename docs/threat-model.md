# Threat Model

This document is the source of truth for known abuse cases of the cumulative
agents-orchestrator V5 system. Each threat references a test that demonstrates
the implemented control or locks an explicitly documented residual risk.

It is a **living document**: every incident, new adapter, or new tool must add
or update entries here.

## Scope

- In: Gateway, registries, adapters for Gemini, Claude, and Codex, artifact
  store, sanitizer, audit log, approvals, the coordination service, and its
  dedicated Redis namespace.
- Out: hosting platforms, cloud infrastructure, and multi-user authentication.

## Threats

### TM-01 - Prompt injection against the orchestrator LLM

- **Description:** An attacker-controlled artifact, review note, sanitized
  diff, or message instructs the LLM in role `orchestrator` to call tools it
  should not, such as requesting a raw restricted artifact.
- **Attacker capability:** Can place text inside artifacts the orchestrator
  reads. Cannot tamper with Gateway code.
- **Primary control:** Policy engine denies forbidden actions regardless of
  orchestrator intent.
- **Defense in depth:** Sanitizer redacts secrets, audit logs every denied
  attempt, and bypass regression tests assert deny decisions.
- **Tested by:** `C/0/2`, `tests/e2e/bypass_regression.test.js#prompt_injection_against_orchestrator_cannot_get_raw_restricted`

### TM-02 - Child tries to leak raw restricted content in summaries

- **Description:** A `restricted-coder` produces a summary that smuggles raw
  restricted strings, hoping the orchestrator forwards it.
- **Attacker capability:** Controls subprocess output. Cannot change artifact
  visibility rules.
- **Primary control:** Restricted raw artifact kinds are sanitized before they
  cross role or classification boundaries.
- **Defense in depth:** Sanitizer fails closed and visibility matrix tests lock
  allowed reads.
- **Tested by:** `M/0/2`, `M/0/3`, `tests/e2e/bypass_regression.test.js#child_summary_does_not_leak_raw_restricted_after_sanitizer`

### TM-03 - Bypass via shared filesystem

- **Description:** A child writes outside the artifact store, hoping another
  role can read it directly.
- **Attacker capability:** Can write inside its allowed working directory.
  Cannot add sibling repositories to the allowlist.
- **Primary control:** The artifact store is the only legitimate channel for
  transferring artifacts or restricted content across roles. V5 coordination
  carries only addressed, untrusted `unrestricted` or `internal` message bodies;
  it rejects restricted and secret-bearing bodies and grants no action
  authority.
- **Defense in depth:** Adapters are confined to safe working directories,
  policy denies cross-trace artifact lookups, and bypass tests cover arbitrary
  filesystem reads.
- **Tested by:** `H/0/2`, `tests/e2e/bypass_regression.test.js#filesystem_bypass_outside_artifact_store_is_not_visible_to_other_role`

### TM-04 - Bypass via direct cwd

- **Description:** A caller passes a `cwd` that escapes allowed roots using
  `..`, symlinks, or absolute paths.
- **Attacker capability:** Can choose request parameters. Cannot alter
  configured repository roots.
- **Primary control:** `assertSafeCwd` resolves paths with `realpath` and
  checks them against `AGENTS_REPO_ROOTS` before any spawn.
- **Defense in depth:** Policy independently checks repository classification.
- **Tested by:** `H/0/2`, `tests/e2e/bypass_regression.test.js#cwd_outside_allowlist_is_rejected_before_spawn`, `tests/e2e/bypass_regression.test.js#cwd_symlink_escape_is_rejected`

### TM-05 - Unaudited tmux intervention

- **Description:** An operator attaches to a child tmux session and types
  commands; the system does not learn about it.
- **Attacker capability:** Has local operator access to a tmux session. Cannot
  silently change Gateway audit records.
- **Primary control:** `intervention_detector` emits
  `HUMAN_TMUX_INTERVENTION` on best-effort detection, and
  `session.intervention_note` records manual notes.
- **Defense in depth:** Documentation classifies tmux as best-effort
  observation and intervention, not a primary control plane.
- **Tested by:** `R/0/1`, `R/0/2`, `tests/e2e/bypass_regression.test.js#tmux_intervention_is_audited_or_flagged`

### TM-06 - Sanitizer failure or partial redaction

- **Description:** A sanitizer rule misses a secret, or the sanitizer crashes
  while processing raw output.
- **Attacker capability:** Can craft output to evade known patterns. Cannot
  force Gateway to return raw restricted data across boundaries.
- **Primary control:** Fail closed: if sanitization fails, raw content is not
  returned across classification or role boundaries.
- **Defense in depth:** Sanitizer rules are versioned, tested, and expanded
  with regression fixtures.
- **Tested by:** `M/0/3`, `tests/e2e/bypass_regression.test.js#sanitizer_failure_blocks_cross_boundary_get`

### TM-07 - Approval spoofing or replay

- **Description:** A caller responds with a stolen `approvalId`, or replays a
  granted approval to escalate more than once.
- **Attacker capability:** Can call approval tools and guess or replay IDs
  visible in its context. Cannot mutate the approval state store directly.
- **Primary control:** `approvalId` is UUID v4 and transitions are one-shot
  from `pending` to `granted` or `denied`; duplicate responses are rejected.
- **Defense in depth:** State machine tests and audit log integrity checks.
- **Tested by:** `Q/0/0`, `tests/e2e/bypass_regression.test.js#approval_respond_replay_does_not_grant_again`, `tests/e2e/bypass_regression.test.js#approval_respond_with_unknown_id_is_rejected`

### TM-08 - Artifact poisoning

- **Description:** A child publishes artifacts crafted to confuse the
  orchestrator LLM, such as fake review notes instructing dangerous actions.
- **Attacker capability:** Controls artifacts it is allowed to publish. Cannot
  grant itself extra role permissions.
- **Primary control:** Orchestrator privileges are limited; even if confused,
  policy blocks `code.write` and raw restricted reads.
- **Defense in depth:** Sanitizer, visibility matrix, and deny metrics per
  orchestrator session.
- **Tested by:** `C/0/2`, `N/0/2`, `tests/e2e/bypass_regression.test.js#prompt_injection_against_orchestrator_cannot_code_write`

### TM-09 - Cross-trace data leakage

- **Description:** A session asks for an artifact or legacy `message.*` record
  from another `traceId`.
- **Attacker capability:** Can provide IDs from a different trace if they are
  guessed or leaked. Cannot bypass service repository filters.
- **Primary control:** Artifact and legacy-message service/repository queries
  scope by `traceId`; no global lookup is exposed.
- **Defense in depth:** Policy denies if requester and target are not in the
  same trace. V5 coordination is a separate plane fenced by participant
  `scopeId`, as covered by TM-16. `artifact.list` now requires the same legacy
  requester fields as `artifact.get`, evaluates policy, and audits the
  decision through JSONL only without changing `agents:events`; those fields
  remain caller assertions rather than authentication, so V5 D/0/00 must
  replace them with server-derived `RequestContext`.
- **Tested by:** `L/0/2`, `S/0/0`, `S/0/1`,
  `tests/e2e/bypass_regression.test.js#cross_trace_artifact_access_denied`,
  `tests/e2e/bypass_regression.test.js#cross_trace_message_access_denied`

### TM-10 - MCP stdout corruption

- **Description:** The Gateway accidentally writes a log line to stdout,
  corrupting the MCP protocol stream.
- **Attacker capability:** Can trigger errors or noisy code paths. Cannot
  require logs to be emitted on stdout.
- **Primary control:** All logs go to stderr; stdout is reserved for MCP
  protocol frames.
- **Defense in depth:** Smoke tests and CI checks assert stdout cleanliness.
- **Tested by:** `G/0/0`, `tests/e2e/bypass_regression.test.js#mcp_stdout_only_contains_protocol_frames`

### TM-11 - Approval wait DoS or hung session

- **Description:** A long approval wait freezes an MCP client or holds a
  session indefinitely.
- **Attacker capability:** Can request approvals and wait calls. Cannot exceed
  server-enforced time caps.
- **Primary control:** `approval.request` is non-blocking, and
  `approval.wait` is bounded by `AGENTS_APPROVAL_MAX_WAIT_MS`.
- **Defense in depth:** Poll fallback and timeout audit event.
- **Tested by:** `Q/0/4`, `tests/e2e/bypass_regression.test.js#approval_wait_never_exceeds_server_cap`

### TM-12 - Auto-approval abuse or over-broad enablement

- **Description:** Operator enables too broad a scope, or orchestrator
  repeatedly requests approvals hoping autonomous mode grants dangerous
  actions.
- **Attacker capability:** Can influence requested approval actions/context
  through prompt/tool flow. Cannot set Gateway environment or mutate approval
  state directly.
- **Primary control:** Auto-approval is operator-only via `AGENTS_AUTOAPPROVE`,
  default off, scope allowlist, immutable `NEVER_AUTO`, and restricted contexts
  excluded.
- **Defense in depth:** Orchestrator cannot call `approval.respond`;
  auto-grants emit `APPROVAL_AUTO_GRANTED`; ADR-006 documents boundaries;
  bypass regression covers protected and restricted cases.
- **Tested by:** `Q/0/5`,
  `tests/gateway/autoapprove_mechanism.test.js`,
  `tests/e2e/bypass_regression.test.js#autoapproval_never_grants_protected_or_restricted_even_if_listed`

### TM-13 - Stale lease or replacement-incarnation mutation

- **Description:** A crashed or replaced participant reuses old credentials to
  renew, discover, send, receive, ACK, or unregister state owned by its
  replacement.
- **Attacker capability:** Possesses an earlier participant ID and lease token.
- **Primary control:** Every state-changing or data-returning Redis operation
  carries the expected token digest and scope fence; replacement or expiry
  fails closed.
- **Defense in depth:** Service prechecks use constant-time digest comparison
  and Redis repeats the authoritative fence at the mutation/read boundary.
- **Tested by:** `tests/gateway/coordination_service_lifecycle.test.js`,
  `tests/gateway/coordination_service_receive.test.js`,
  `tests/gateway/coordination_queue_receive.test.js`,
  `tests/e2e/bypass_regression.test.js#stale_coordination_lease_cannot_act_as_a_replacement_incarnation`

### TM-14 - Coordination body injection or authority confusion

- **Description:** A sender embeds instructions, secrets, an oversized body, or
  forged routing fields so a recipient treats message content as authority.
- **Attacker capability:** Can call `send` as an authenticated participant.
- **Primary control:** The service builds the canonical envelope, binds sender
  and scope from authenticated presence, rejects restricted/secret-bearing or
  oversized bodies, and validates received envelopes again.
- **Defense in depth:** Recipients must treat `body` as untrusted data and use
  `messageType`, participant identity, and their own policy before acting.
- **Tested by:** `tests/gateway/coordination_service_send.test.js`,
  `tests/gateway/coordination_service_receive.test.js`,
  `tests/e2e/bypass_regression.test.js#coordination_treats_bodies_as_data_and_binds_routing_to_authenticated_presence`

### TM-15 - Lease token, digest, or metadata disclosure

- **Description:** Credentials or caller metadata leak through participant
  discovery, errors, audit, telemetry, or logs.
- **Attacker capability:** Can choose metadata, body, trace fields, and invalid
  input intended to trigger diagnostics.
- **Primary control:** Plaintext lease tokens are returned only once by
  registration; Redis presence stores only a SHA-256 digest; public projections
  and safe errors omit both; coordination audit is allowlisted and JSONL-only.
- **Defense in depth:** Generic coordination MCP audit has a minimal projection
  and never publishes to `agents:events`.
- **Residual risk:** Participant metadata is public to same-scope discovery and
  is not secret-scanned. Callers must never place credentials in metadata.
- **Tested by:** `tests/gateway/coordination_service_register.test.js`,
  `tests/gateway/coordination_service_foundation.test.js`,
  `tests/gateway/coordination_audit.test.js`,
  `tests/e2e/bypass_regression.test.js#coordination_public_and_audit_projections_do_not_disclose_lease_material`

### TM-16 - Cross-scope delivery or cross-inbox ACK

- **Description:** A participant discovers or sends to another scope, or ACKs
  a delivery belonging to another participant.
- **Attacker capability:** Has valid credentials for one scope and may know
  participant or delivery IDs from another.
- **Primary control:** Discovery and send are same-scope only. ACK executes
  against the authenticated recipient inbox and rejects unknown/cross-inbox
  IDs atomically. Each Gateway instance admits one canonical scope; omitted
  registration scope inherits it and a different explicit value is rejected
  before Redis mutation. `coordination.status` lets peers compare that
  non-secret value before registration.
- **Defense in depth:** Dynamic Redis key components are encoded and every
  operation repeats the participant scope/digest fence.
- **Tested by:** `tests/gateway/coordination_service_discovery.test.js`,
  `tests/gateway/coordination_service_register.test.js`,
  `tests/gateway/coordination_service_foundation.test.js`,
  `tests/gateway/coordination_service_send.test.js`,
  `tests/gateway/coordination_service_ack.test.js`,
  `tests/e2e/bypass_regression.test.js#coordination_rejects_cross_scope_delivery_and_cross_inbox_acknowledgement`

### TM-17 - Raw Redis client bypasses the coordination service

- **Description:** Code with direct Redis credentials writes malformed presence
  or inbox state, bypassing validation, classifications, secret checks, and
  audit projection.
- **Attacker capability:** Can connect to the coordination Redis namespace.
- **Primary control:** Redis must be network-isolated, TLS-protected where
  appropriate, and restricted with a least-privilege ACL. Supported callers use
  the MCP tools or `createCoordination`; no public raw-write API exists.
- **Defense in depth:** The service strictly decodes Redis values and fails
  closed on malformed records.
- **Residual risk:** A principal with raw write permission can bypass service
  controls. ACL/TLS posture is an operator responsibility, not an automated
  V5 acceptance claim.
- **Tested by:** `tests/gateway/coordination_contract.test.js`,
  `tests/gateway/coordination_factory.test.js`,
  `tests/e2e/bypass_regression.test.js#supported_coordination_boundary_fails_closed_on_raw_malformed_store_state`

### TM-18 - Coordination accidentally reaches the legacy audit Stream

- **Description:** A coordination domain or generic MCP-call event is mirrored
  to `agents:events`, turning the legacy audit channel into a second
  coordination bus or exposing new metadata to old consumers.
- **Attacker capability:** Can invoke known or unknown `coordination.*` tool
  names and influence safe trace/error fields.
- **Primary control:** Namespace routing selects the local-only JSONL writer for
  all `coordination.*` calls; domain coordination audit uses the same local-only
  path.
- **Defense in depth:** Publisher-spy regressions preserve one legacy
  publication while proving zero coordination publications.
- **Tested by:** `tests/gateway/coordination_factory.test.js`,
  `tests/gateway/coordination_audit.test.js`,
  `tests/e2e/bypass_regression.test.js#coordination_domain_and_namespace_audit_never_publish_to_agents_events`

### TM-19 - Replay after the bounded dedupe window

- **Description:** A sender retries the same message ID after dedupe expiry and
  creates another at-least-once delivery.
- **Attacker capability:** Has valid sender credentials and can delay/replay a
  previously accepted request.
- **Primary control:** Equal retries return the original delivery while the
  configured dedupe record exists; conflicting retries fail.
- **Defense in depth:** Consumers must deduplicate by `messageId` for any
  business guarantee longer than the configured window. ACK tombstones are
  independently bounded and are transport idempotency, not permanent history.
- **Tested by:** `tests/gateway/coordination_service_send.test.js`,
  `tests/gateway/coordination_queue_send.test.js`,
  `tests/gateway/coordination_two_instance_live.test.js`,
  `tests/e2e/bypass_regression.test.js#bounded_dedupe_contract_allows_redelivery_after_the_backing_record_expires`

## Living document

This document grows with the system. New stages must update it when they
introduce new abuse vectors. The bypass regression suite
(`tests/e2e/bypass_regression.test.js`, see U/0/4) MUST cover every threat
listed here.
