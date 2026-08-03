# Independent Review — Project V5 C/0/01 Trial 2

## Verdict

**OK** for technical candidate
`205abe03adbac89d87f2ba5459238c2e541c4ddd`.

Both P0 blockers from Trial 1 were independently reproduced on the KO tree and
are closed in Trial 2. Runtime Zod validation and the published JSON Schemas
now agree for non-finite numbers and Unicode code-point boundaries throughout
the catalog, and all three legacy `message.*` validation envelopes again match
the pre-C/0/01 base exactly. No new blocker was found in the complete
`55221a5..205abe0` result or the focused `b424c50..205abe0` correction.

## Reviewer

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Execution: Fast/Priority
- Reviewed Wave base:
  `55221a581ba53a34c85d073ec7d99157b6f1991d`
- Trial 1 KO:
  `b424c5051f117f85f822851ba496289e6211b3fa`
- Technical candidate:
  `205abe03adbac89d87f2ba5459238c2e541c4ddd`
- Evidence-only submission:
  `a2f2e75611b8a423cd940d21f5b2ad49e451148f`
- Review request:
  [`C_0_1-2_to_review.md`](C_0_1-2_to_review.md), preserved unchanged

This was an independent local/offline review. The implementation skill,
project instructions, task sheet, both Trial 1 artifacts, Trial 2 request,
complete technical delta, and submission-only delta were read before the
verdict. Submission claims were not treated as review evidence.

## Trial 1 blocker reproduction and closure

### Numeric and Unicode parity

The exact Trial 1 probes were rerun against the KO tree and the candidate:

| Input | Trial 1 Zod / AJV | Trial 2 Zod / AJV |
|---|---:|---:|
| `approval.wait.timeoutMs = JSON.parse("1e400")` | accept / reject | reject / reject |
| `coordination.register.metadata.limit = JSON.parse("1e400")` | accept / reject | reject / reject |
| `coordination.register.displayName = "😀".repeat(256)` | reject / accept | accept / accept |
| `coordination.register.displayName = "😀".repeat(257)` | reject / reject | reject / reject |
| `coordination.send.traceId = "😀".repeat(128)` | reject / accept | accept / accept |
| `coordination.send.traceId = "😀".repeat(129)` | reject / reject | reject / reject |

An independent exhaustive catalog probe then covered all seven typed numeric
paths and all 29 bounded-string paths:

- 55 numeric checks exercised `Infinity`, `-Infinity`, `NaN`, parsed exponent
  overflow, integer/fraction behavior, and every published minimum/maximum.
- 199 string checks exercised ASCII and non-BMP values at, below, and above
  each applicable boundary. This included unrestricted strings, min-only
  `body`/`note`, safe identifiers, lease tokens, capability items, metadata
  keys and values, and delivery IDs.
- Result: **254/254 parity and expected-boundary checks passed**.
- A bare `z.number()` remains rejected by the projector unless it carries an
  explicit finite guarantee.

### Exact legacy `message.*` compatibility

A real base-versus-candidate handler probe covered 21 invalid-input cases over
`message.send`, `message.list`, and `message.reply`. The complete serialized
validation results were byte-equivalent, with shared SHA-256:

`5e1f396c3c4aa369369237ad3d3d3c8ed6c70051d3b2977c14654e82669c5b84`.

The three inputs from the Trial 1 KO were also checked explicitly. Each result
has `isError: true`, a body containing only `error` and `issues`, and issues
containing exactly `path`, `message`, and `code`, in base order.

Valid calls with unknown fields, all three trace-access failures,
`PARENT_NOT_FOUND`, sent/listed payload projections, and the resulting
`MESSAGE_SENT` audit shape were compared after removing only generated IDs and
timestamps. The normalized base and candidate results shared SHA-256:

`f72a6ae72ae11b13fb1e361b69ed181f4b35226bca97e449191b7516d5133f35`.

Thus unknown-field stripping, domain-error bodies, absence of `isError` on
legacy payload errors, and audit exclusion of ignored fields remain compatible.

## Preserved public contract

- The recursively frozen catalog still contains exactly 33 tools in protocol
  order and exactly eight `coordination.*` tools.
- The generated projection recomputes to the unchanged pinned digest
  `sha256:460c0ed512756c0a63a1a61980664a23acf59de9ad50275f76d44d5ca630e58a`
  on both the Trial 1 and Trial 2 trees.
- `gateway/contracts/mcp-tools-v1.json`,
  `docs/mcp-tool-catalog.md`, and `ci/suites.json` are unchanged by the Trial 2
  correction. Generated documentation is byte-current.
- Removing only `inventorySha256` makes the cumulative candidate
  `ci/suites.json` identical to the Wave base. The only cumulative inventory
  changes remain `lint.gateway` and `test.gateway`.
- A 126-check independent sweep across all 33 tools confirmed that thrown,
  returned, validation, allowed-code, policy, and unknown-tool errors remain
  non-reflective and catalog-allowlisted.
- `gateway/src/tools/message.js` is byte-identical to the Wave base, SHA-256
  `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- `gateway/src/core/audit.js` is byte-identical to the Wave base, SHA-256
  `39f636110c123b27f95932de1fb401e81478310debd4926739e29933e48e615d`.
- Coordination domain and MCP audit paths stayed local-only in the exercised
  paths; only the legacy control call reached the fake `agents:events`
  publisher.

## Verification

- Focused catalog, property, projection, error, legacy-message, coordination,
  audit, telemetry, agent, approval, session, and bypass selection:
  **114 passed / 0 failed / 0 skipped**.
- Independent structure run: **222 passed / 0 failed**.
- Authoritative offline `bash scripts/ci.sh`: exit 0; aggregate
  `infrastructure_unavailable`; **1,087 tests / 1,075 passed / 12 exact
  declared infrastructure skips / 0 failed**.
- Gateway: **723 total / 714 passed / 9 declared PostgreSQL skips**.
- E2E: **24/24**.
- CLI: **29/29**.
- LangGraph: **84 total / 81 passed / 3 declared Gateway/Temporal skips**.
- Lock input, Python lint, Gateway lint, MCP smoke, and policy registry:
  passed.
- All 38 cumulatively changed JavaScript files passed `node --check`.
- `git diff --check` passed for both the complete candidate range and the
  Trial 2 correction range.
- Added-line credential-signature scan: zero matches.

Two preliminary full-gate invocations were discarded as reviewer-environment
evidence: the first selected incomplete ambient runners, and the second used a
split dependency tree missing `@eslint/js`. Neither produced a candidate test
failure. The authoritative rerun used the single lock-matched offline
dependency tree (package-lock SHA-256
`824886ba7012c266370088117d435d0ef89000c57e845bc23d72d06c8d835088`)
and passed as reported above.

All live-service, cloud-credential, provider, real-agent, and integration
selectors were unset. No network fetch, Redis, PostgreSQL, Temporal, provider,
shared MCP process, or real tmux/agent session was used.

## Commit and append-only verification

The technical candidate has the Trial 1 KO as its direct parent. The submission
has the technical candidate as its direct parent and adds only
`C_0_1-2_to_review.md`. Both Trial 1 artifacts are blob-identical to their KO
versions. The review dependency symlinks and private test directories were
removed after validation, preserving their targets.

This verdict approves only the reviewed technical candidate. It does not by
itself integrate, promote, release, or alter the task status.
