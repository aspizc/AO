# Review Submission — Project V5 H/0/00 (Trial 5)

Status: **Trial 5 technical candidate committed; independent review pending**.

No verdict, integration result, or promotion result is asserted by the
implementation author. Review the exact technical range independently and
publish a separate result without rewriting this request.

## Identity

- Sheet: `plan/PROJECT_V5/H/0/00.md`
- Review id: `H_0_0`
- Trial 4 independent KO / frozen Trial 5 base:
  `5f2aeaf751b92f66ca792945f3aac19cd6c7c1ac`
- Branch: `feat/V5-H-0-00-orchestrator-profile`
- Worktree:
  `/tmp/agents-orchestrator-v5-h000.rq46zM/worktree`
- Trial 5 technical commit:
  `0b407200998038dada5062669d2a663d5e7e1673`
- Trial 5 technical tree:
  `197309d4a6330161999c385e705c5b1021f90da1`
- Exact technical range:
  `5f2aeaf751b92f66ca792945f3aac19cd6c7c1ac..0b407200998038dada5062669d2a663d5e7e1673`
- Canonical profile digest:
  `sha256:fbca366c3479e4e3e00b038e54c866281b6d0e442f9889d125f47e5c83b7212a`

The technical commit is the direct child of the frozen Trial 4 result-only KO.
No earlier candidate, request, result, integration commit, shared manifest, or
provider adapter was amended, rebased, reset, or rewritten.

## Why

Trial 4 closed the structural adapter-result boundary, but treated every
non-empty result string as semantically valid. An adapter could therefore:

- return an unknown Codex sandbox and reach MCP plus
  `AGENT_MODEL_RESOLVED`; or
- return whitespace/control-only spawn identifiers and commands, persist the
  unusable identity for a real task, and emit a successful model audit.

Trial 5 closes those semantic fields without parsing provider argv or changing
the provider adapters, config loader, canonical profile, policy engine,
schemas, catalogs, Redis/coordination, legacy messages, or audit transport.

## What was done

### Codex sandbox authority

- The service recognizes exactly `read-only`, `workspace-write`, and
  `danger-full-access`.
- An omitted service setting has the explicit `workspace-write` default.
- A Codex delegate result must equal that effective service-owned setting.
- Invalid Codex configuration fails before adapter lookup for delegate and
  spawn. Unknown, whitespace, and mismatched results fail before successful
  audit or persistence.
- Rejections retain the existing stable
  `POLICY_DENIED` / `EFFECTIVE_SELECTION_INVALID` body and never disclose the
  rejected value.

### Spawn identity and command envelope

- `sessionId` and `tmuxTarget` must be identical, lowercase ASCII tmux targets:
  one leading alphanumeric followed only by alphanumerics/hyphens, at most 96
  characters.
- `attachCommand` must be exactly `tmux attach -t <tmuxTarget>`.
- `launchCommand` must be non-empty, trim-stable, NFC-stable, at most 8,192
  UTF-16 code units, and contain no Unicode `Cc`, `Cf`, `Zl`, or `Zp`
  character.
- Legitimate internal spaces and NFC Unicode paths remain valid.
- The service validates the closed envelope only. It does not tokenize,
  reconstruct, or otherwise take ownership of provider argv; D/0/01 retains
  that responsibility.

### Effect ordering and compatibility

Validation completes before task-backed session persistence,
`AGENT_MODEL_RESOLVED`, service success, and MCP success serialization.
Nested Proxy/toJSON carriers still execute zero traps and disclose no
sentinel. The one historical runtime fake spawn literal changed only from a
noncanonical attach placeholder to the already-shipped canonical attach form;
no historical assertion or test name changed.

## TDD evidence

### RED

The new authority probes were first run against the frozen Trial 4
implementation, before production code changed:

```text
env -u AGENTS_REDIS_URL -u AGENTS_DRY_RUN \
  -u AGENTS_CODEX_MODEL -u AGENTS_CODEX_REASONING_EFFORT \
  -u AGENTS_CODEX_SERVICE_TIER -u AGENTS_CODEX_SANDBOX \
  -u ANTHROPIC_API_KEY -u OPENAI_API_KEY -u GEMINI_API_KEY \
  node --test --test-concurrency=1 \
  tests/gateway/orchestrator_profile_authority.test.js
```

Result: `130 tests`; `91 passed`, `39 failed`.

The failures reproduced the unknown/mismatched sandbox reaching success,
invalid configuration reaching adapter lookup, unsafe identities/commands
being accepted, task-backed persistence, and successful MCP responses.
Canonical sandbox values, the default, bounded safe identity/command values,
and all retained Trial 3/4 probes were already green.

### GREEN

The final authority file passes `134/134`. It covers:

- default and all three configured sandbox values;
- unknown, whitespace, mismatch, and invalid-config cases;
- invalid config before adapter lookup for Codex delegate and spawn;
- spaces, tab, newline, NUL, another control, non-ASCII, and overlong
  identities;
- exact attach-command correspondence;
- empty/trim-unstable, control/format, non-NFC, and overlong launch commands;
- the 96-character target and an NFC Unicode command with internal spaces;
- null and persisted task paths, stable MCP bodies, zero successful
  audit/persistence, and no sentinel disclosure; and
- every prior selection-provenance, exact-shape, nested Proxy/toJSON, exit
  code, provider-specific, registry-only, and frozen-result probe.

## Verification

| Check | Result |
|---|---|
| Trial 5 authority focus | `134 passed`, `0 failed`, `0 skipped` |
| H profile/authority/contract/runtime/tool focus | `170 passed`, `0 failed`, `0 skipped` |
| D/0/00 request-context/binding/approval/error/bypass group | `171 passed`, `0 failed`, `0 skipped` |
| Codex/Claude real-fixture, dry-run, supervised, registry, and registry-only Gemini group | `60 passed`, `0 failed`, `0 skipped` |
| Explicit no-real-provider E2E inventory | `25 passed`, `0 failed`, `0 skipped` |
| Explicit Gateway inventory excluding `tests/gateway/tmux_client.test.js` | `116` JS paths; list SHA-256 `5e018a1adfe537a8184c5ec99c30a6e0ab58cfe227523fabd321768282d4c12b`; `1,024 tests`, `1,005 passed`, `19` service-gated skips, `0 failed` |
| Gateway lint and syntax checks | passed |
| Policy registry validation | passed: `3` agents, `7` repositories, `8` roles |
| Structure suite | `289 passed`; `1` manifest-only failure for exactly the three integration-owned hashes below |
| Authoritative manifest validate-only | exited `2`, ran zero suites, and reported exactly the three stale hashes below |
| `git diff --check` for the exact technical range | passed |
| Redacted gitleaks scan | exact one-commit range scanned; no leaks found |

The explicit Gateway command built a sorted file array, asserted exactly 116
paths, and exited if `tests/gateway/tmux_client.test.js` appeared before
passing that array to `node --test --test-concurrency=1`. All applicable
commands unset shared Redis, provider keys, ambient model/effort/tier/sandbox,
and dry-run variables.

No shared Redis, MCP/KYA service, real provider, real agent, external network,
tmux operation, YOLO launch, or unconfined child was started, listed, killed,
changed, flushed, restarted, or stopped.

## Explicit CI limitation and integrator action

This lane did not run `tests/gateway/tmux_client.test.js`,
`npm --prefix gateway test`, `scripts/ci.sh`, or any aggregate that could
operate tmux. Read-only manifest validation stopped before executing suites
with exactly:

```text
lint.gateway: stale inventorySha256; expected sha256:7988ced5b2b5c0baf4ecad0a34e52c97d3f9956b9470c783dadb328cc8704c22
test.gateway: stale inventorySha256; expected sha256:b81bc1a16e2ac4b0e485f3aaf3ef56f598323565bbcb6d97717166dcb982e6ab
policy.registry: stale inventorySha256; expected sha256:05873e6acdc570e306947afbbf5b3a4f45a33420ff0a132a172069606bcdfef3
```

The integration owner must refresh only those shared inventories through the
repository-owned mechanism and run the complete safe gate on the exact
reviewed integration tree. No green authoritative aggregate is inferred here.

## Technical paths

```text
gateway/src/services/agent_service.js
plan/PROJECT_V5/H/0/00.md
tests/gateway/orchestrator_profile_authority.test.js
tests/gateway/orchestrator_profile_runtime.test.js
```

## Commit

- `0b407200998038dada5062669d2a663d5e7e1673` —
  `fix(profile): validate semantic result envelopes (H/0/00 Trial 5)`

## Requested independent probes

1. Reproduce both Trial 4 findings through the real service and MCP wrapper:
   unknown sandbox plus whitespace/control spawn values. Confirm no successful
   model audit, persistence, response, or rejected-value disclosure.
2. Exercise all supported sandbox configurations, omitted/default config,
   mismatches, unknown/boxed/null values, and invalid config for delegate and
   spawn. Confirm invalid Codex config stops before adapter lookup.
3. Probe target boundaries at 0, 1, 96, and 97 characters; uppercase,
   whitespace, punctuation, Unicode, NUL, C0/C1 controls, and mismatched
   identities. Confirm attach text names only the exact accepted target.
4. Probe launch text at 0, 1, 8,192, and 8,193 code units; leading/trailing
   whitespace, internal spaces, NFC/NFD Unicode, every control/format class,
   line separators, and boxed/Proxy values.
5. Repeat the nested Proxy/toJSON, provider-specific exact-result,
   task-backed persistence, D/0/00 binding-first, registry-only Gemini, and
   safe-body probes.
6. Confirm provider argv builders, adapters, config, policy, profile, catalogs,
   schemas, manifests, coordination/messages, and audit transport are
   unchanged.
7. Have the integrator refresh only the three stated inventories and run the
   complete safe gate on the exact independently reviewed integration tree.

## Requested reviewer profile

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Service tier: Priority/Fast
- Review mode: independent, adversarial, evidence-based
