# Review Submission — Project V5 C/0/01 (Trial 2)

## Outcome

Trial 2 corrects both P0 blockers from the independent Trial 1 KO while
preserving the rest of the frozen public contract. Runtime validation now
rejects every non-finite catalog number, bounded strings use the same Unicode
code-point length semantics as JSON Schema, and the three legacy `message.*`
tools explicitly retain their exact review-base validation envelopes.

The sheet remains `in_progress; Trial 2 review pending`. This submission does
not claim independent review, completion, promotion, or integration.

## Review range

- Reviewed Wave base:
  `55221a581ba53a34c85d073ec7d99157b6f1991d`.
- Trial 1 technical candidate:
  `f46918ca4b224a9abe9faa99602456743bf54bf1`.
- Trial 1 submission:
  `605c93a994faf1898f848ed789bdb85d0e84f82f`.
- Independent Trial 1 KO:
  `b424c5051f117f85f822851ba496289e6211b3fa`.
- Trial 2 technical candidate:
  `205abe03adbac89d87f2ba5459238c2e541c4ddd`.
- Review the complete result in `55221a5..205abe0` and the Trial 2 correction
  in `b424c50..205abe0`.
- Technical commit:
  `205abe0 fix(gateway): close contract parity gaps (V5 C/0/01 Trial 2)`.

## Trial 1 blocker dispositions

### Zod and JSON Schema parity

- Every catalog number is now an explicit finite Zod number. The projector
  fails closed when a bare `z.number()` lacks that finite guarantee.
- Parsed exponent overflow from `JSON.parse("1e400")` is rejected by both
  runtime Zod validation and AJV for `approval.wait.timeoutMs` and numeric
  `coordination.register.metadata`.
- A shared projectable string refinement counts Unicode code points with
  `Array.from(value).length` and emits the corresponding JSON Schema
  `minLength`/`maxLength`.
- All constrained catalog strings use that explicit shared length semantic.
  Property/boundary regressions cover every unrestricted bounded string and
  every typed numeric property in the published catalog.
- `coordination.register.displayName` accepts 256 non-BMP code points and
  rejects 257 in both validators. `coordination.send.traceId` accepts 128 and
  rejects 129 in both validators; the same exhaustive check covers
  `correlationId` and metadata text.

### Legacy message validation compatibility

- `message.send`, `message.list`, and `message.reply` explicitly select a
  legacy validation serializer in the typed runtime catalog.
- Their validation results again contain only top-level `error` and `issues`;
  every issue contains the exact `path`, Zod `message`, and `code` fields from
  the review base, and the outer result retains `isError: true`.
- Exact regressions cover the three inputs used by the independent reviewer:
  `{}`, `{traceId: 7, accessToken: null}`, and
  `{traceId: "tr", accessToken: "token"}`.
- All other catalog tools retain the new non-reflective safe validation
  envelopes. Legacy unknown-field stripping and legacy payload-error behavior
  remain unchanged.

## Frozen contract preservation

- The recursively frozen catalog still contains exactly 33 tools in protocol
  order and exactly eight `coordination.*` tools.
- The generated projection remains byte-current and its digest is unchanged:
  `sha256:460c0ed512756c0a63a1a61980664a23acf59de9ad50275f76d44d5ca630e58a`.
- Closed schemas, safe error allowlists, canonical policy-rule filtering,
  semantic examples, generated documentation, and coordination audit
  isolation remain enforced by their existing tests.
- `ci/suites.json` is unchanged. All modified tests were already selected by
  existing inventory paths, so inventory refresh was not required.

## TDD evidence

RED was reconstructed in a temporary tree containing Trial 1 KO
`b424c50` plus only the new/changed Trial 2 tests, without copying any
implementation changes:

- 17 tests total: 8 passed, 9 failed, exit 1.
- The nine granular failures were the three exact legacy validation subtests
  plus their parent, the bare-number projector guard, parsed exponent
  overflow, non-BMP boundaries, exhaustive typed-number coverage, and
  exhaustive Unicode-bounded-string coverage.

After implementation:

- Expanded schema/property/message/coordination/error/audit focus: 72/72.
- Broad legacy bootstrap/tool/adapter regression: 72/72.
- Structure suite: 222/222.
- `python3 scripts/ci_gate.py --validate-only`: passed.
- Gateway lint: passed.
- All eight changed JavaScript files passed `node --check`.
- `git diff --check`: passed.
- Added-line credential-signature scan: zero matches.

## Authoritative offline gate

`bash scripts/ci.sh` ran with live Redis, PostgreSQL, Gateway-integration,
Temporal, real-agent, and provider selectors unset and with private temporary
and Python-cache directories.

- Exit 0; aggregate `infrastructure_unavailable`: 1,087 tests, 1,075 passed,
  12 exact declared infrastructure skips, 0 failed.
- Structure: 222/222.
- Gateway: 723 total, 714 passed, 9 declared PostgreSQL skips, 0 failed.
- E2E: 24/24.
- CLI: 29/29.
- LangGraph: 84 total, 81 passed, 3 declared Gateway/Temporal skips.
- Lock input, Python lint, Gateway lint, MCP smoke, and policy registry:
  passed.

No Redis, PostgreSQL, Temporal, provider, shared MCP process, external network
service, or real tmux/agent session was used.

## Owner guards and append-only evidence

- `gateway/src/tools/message.js` remains byte-identical to the Trial 1 KO and
  review base, SHA-256
  `6ee1c4e218d857aca6397b3c5aa1aca22637cf6b03b662cc9d8eb76b78906aac`.
- `gateway/src/core/audit.js` remains byte-identical, SHA-256
  `39f636110c123b27f95932de1fb401e81478310debd4926739e29933e48e615d`.
- Trial 1 request and KO artifacts are unchanged.
- The owned `.venv` symlink, real `gateway/node_modules` review dependency
  directory, and private gate directory were path-validated and removed before
  staging. The linked dependency target was preserved.

## Review request

Independently reproduce both Trial 1 boundary probes and all three exact
legacy validation envelopes. Search the full catalog for remaining numeric
and bounded-string constraints, verify the projector fails closed without an
explicit finite guarantee, and recheck the frozen catalog, unchanged digest,
owner guards, audit isolation, legacy message behavior, and authoritative
offline gate.

Publish `C_0_1-2_reviewed_OK.md` or `C_0_1-2_reviewed_KO.md`. Preserve both
Trial 1 artifacts and this submission, list only reproducible blockers in a
KO, and do not integrate or promote the candidate while review is pending.
