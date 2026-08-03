# Independent Review — Project V5 C/0/01 Trial 1

## Verdict

**KO** for technical candidate
`f46918ca4b224a9abe9faa99602456743bf54bf1`.

The candidate establishes the requested 33-tool catalog, generated projection,
safe error machinery, and CI drift guards, and the authoritative suite is
green. Two independently reproduced P0 compatibility defects nevertheless
contradict the frozen contract: Zod and the published JSON Schemas disagree at
valid parser/Unicode boundaries, and all three legacy `message.*` validation
envelopes changed through a shared helper even though `message.js` itself is
unchanged.

## Reviewer

- Model: GPT-5.6 Sol
- Reasoning effort: ultra
- Execution: Fast/Priority
- Review base:
  `55221a581ba53a34c85d073ec7d99157b6f1991d`
- Technical candidate:
  `f46918ca4b224a9abe9faa99602456743bf54bf1`
- Submission:
  `605c93a994faf1898f848ed789bdb85d0e84f82f`
- Review request:
  [`C_0_1-1_to_review.md`](C_0_1-1_to_review.md), preserved unchanged

This was an independent local/offline review. The implementation skill,
project instructions, task sheet, review protocol, request, complete technical
diff, and submission diff were read before the verdict. Submission conclusions
were not treated as review evidence.

## Blocking findings

### P0 — Runtime Zod validation and published JSON Schema are not equivalent

An independent probe validated the same values through the catalog's runtime
Zod path and its AJV-compiled public schema. It reproduced four disagreements:

| Tool | Input mutation | Zod | JSON Schema/AJV |
|---|---|---:|---:|
| `approval.wait` | `timeoutMs: JSON.parse("1e400")` | accepts | rejects (`type`) |
| `coordination.register` | `metadata: {limit: JSON.parse("1e400")}` | accepts | rejects (`type`) |
| `coordination.register` | `displayName: "😀".repeat(256)` | rejects | accepts |
| `coordination.send` | `traceId: "😀".repeat(128)` | rejects | accepts |

The probe output was:

```text
{"name":"approval.wait","zod":true,"jsonSchema":false,"jsonKeyword":"type"}
{"name":"coordination.register","zod":true,"jsonSchema":false,"jsonKeyword":"type"}
{"name":"coordination.register","zod":false,"jsonSchema":true,"jsonKeyword":null}
{"name":"coordination.send","zod":false,"jsonSchema":true,"jsonKeyword":null}
```

This is not limited to a caller constructing `Infinity` directly:
`JSON.parse("1e400")` yields a non-finite JavaScript number. The runtime
schemas use unrestricted `z.number()` for scalar metadata at
`gateway/src/tools/catalog.js:58-63` and
`z.number().positive()` for `approval.wait.timeoutMs` at
`gateway/src/tools/catalog.js:440-447`. The projection emits JSON Schema
`number`, while explicitly ignoring a Zod finite check if one exists, at
`gateway/src/tools/schema_projection.js:79-90`.

The string mismatch comes from different length units. Zod's `.max()` observes
UTF-16 code units, while JSON Schema `maxLength`/AJV observes Unicode code
points. The generic bounded string is defined at
`gateway/src/tools/catalog.js:70`, used for the 256-character display name at
`gateway/src/tools/catalog.js:536-545` and 128-character trace ID at
`gateway/src/tools/catalog.js:629-641`, then projected directly to
`maxLength` at `gateway/src/tools/schema_projection.js:24-35`.

Required correction: reject non-finite numbers consistently in both runtime
paths, including exponent overflow in parsed JSON, and give runtime and
published schemas the same Unicode length semantics. At the published limits,
256 Unicode code points for `displayName` and 128 for `traceId` must be
accepted by both validators; 257 and 129 respectively must be rejected by
both. Add parity regressions for exponent overflow and non-BMP strings at and
over each affected boundary. Preserve closed schemas and all existing
redaction/security constraints.

### P0 — The shared serializer changes all legacy `message.*` validation envelopes

The owner file guard is true:
`gateway/src/tools/message.js` is byte-identical to the review base. Behavior
still changed because the shared validation branch at
`gateway/src/tools/tool_helpers.js:93-119` now routes failures through
`validationErrorBody()` at `gateway/src/tools/tool_errors.js:84-90`.

An independent base-versus-candidate probe invoked the real tool handlers with
these inputs:

- `message.send`: `{}`
- `message.list`: `{"traceId":7,"accessToken":null}`
- `message.reply`: `{"traceId":"tr","accessToken":"token"}`

It observed:

```text
{"name":"message.send","baseKeys":["error","issues"],"candidateKeys":["error","code","message","issues"],"baseIssueKeys":["path","message","code"],"candidateIssueKeys":["path","code"]}
{"name":"message.list","baseKeys":["error","issues"],"candidateKeys":["error","code","message","issues"],"baseIssueKeys":["path","message","code"],"candidateIssueKeys":["path","code"]}
{"name":"message.reply","baseKeys":["error","issues"],"candidateKeys":["error","code","message","issues"],"baseIssueKeys":["path","message","code"],"candidateIssueKeys":["path","code"]}
```

For example, the base body is shaped as
`{"error":"INVALID_INPUT","issues":[{"path":"traceId","message":"Required","code":"invalid_type"},...]}`
while the candidate body is shaped as
`{"error":"INVALID_INPUT","code":"INVALID_INPUT","message":"invalid input","issues":[{"path":"traceId","code":"invalid_type"},...]}`.
The outer MCP result remains an error in both versions, but additive top-level
fields and removal of each issue's `message` are observable compatibility
changes.

Required correction: preserve the exact review-base validation body for all
three legacy `message.*` tools, including field presence and issue shape,
while retaining their existing unknown-field stripping. Keep the new
non-reflective safe envelopes for the rest of the catalog; do not broaden
schema closure, expose attacker values, or weaken safe-error filtering. Add
exact base-versus-candidate regression assertions for validation failures on
`message.send`, `message.list`, and `message.reply`.

## Confirmed contract work

The blockers do not negate the following independently verified work:

- The recursively frozen catalog has exactly 33 entries in protocol order and
  exactly eight `coordination.*` entries, including `coordination.status`.
- The generated contract has the same names/count and pins digest
  `sha256:460c0ed512756c0a63a1a61980664a23acf59de9ad50275f76d44d5ca630e58a`.
- Unknown exceptions and unknown tools use fixed, non-reflective public
  messages. Domain detail is allowlisted, and policy output is limited to a
  safe decision plus a canonical catalogued rule ID.
- `gateway/src/tools/message.js` remains byte-identical to base, with SHA-256
  `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`;
  the second blocker is the indirect shared-helper behavior change.
- `gateway/src/core/audit.js` remains byte-identical to base, and the exercised
  coordination paths publish nothing new to `agents:events`.
- Removing only `inventorySha256` fields makes `ci/suites.json` identical to
  base. The only inventory changes are `lint.gateway` and `test.gateway`.
- Generated documentation and semantic prompt/example drift checks are
  present and pass.

## Verification

- Independent affected selection covering catalog, projection, errors,
  messages, coordination, audit, tracing, and bypass behavior:
  **76 passed / 0 failed / 0 skipped**.
- Structure suite: **222 passed**.
- Authoritative `bash scripts/ci.sh`: exit 0; aggregate
  `infrastructure_unavailable`; **1079 tests / 1067 passed / 12 exact
  infrastructure skips / 0 failed**.
- Gateway: **715 total / 706 passed / 9 declared PostgreSQL skips**.
- E2E: **24/24**.
- CLI: **29/29**.
- LangGraph: **84 total / 81 passed / 3 declared Gateway/Temporal skips**.
- Lock input, Python lint, Gateway lint, MCP smoke, and policy registry:
  passed.
- All 38 affected JavaScript files passed `node --check`.
- `git diff --check
  55221a581ba53a34c85d073ec7d99157b6f1991d..
  f46918ca4b224a9abe9faa99602456743bf54bf1`: passed.
- The two independent boundary probes above fail the claimed contract despite
  all committed tests being green.

The authoritative run used isolated offline dependencies with live-service,
cloud-credential, and real-agent opt-ins unset. No network fetch, Redis,
PostgreSQL, Temporal, provider, shared MCP process, or real tmux/agent session
was used.

## Commit and append-only verification

The technical candidate has the exact review base as its direct parent. The
submission has the technical candidate as its direct parent and adds only
`C_0_1-1_to_review.md`. The task sheet, submission, technical files, and prior
review artifacts were preserved unchanged; this verdict is the only review
change.

C/0/01 must remain `in_progress; Trial 1 review pending`. Do not integrate or
promote this candidate. A corrected Trial 2 is required.
