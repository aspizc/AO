# Plan Review Submission — Project V5 D/0/07 session-port split (plan trial 3)

## Requested reviewer

- Model profile: GPT-5.6 Sol, reasoning `max`, service Priority/Fast
- Review mode: independent plan review of the Trial 3 trust-boundary/determinism correction,
  four executable sub-leaves, and reconciled live registries
- Claim boundary: plan documents only; no implementation, technical GREEN, integration,
  promotion, live-provider execution, or release is claimed

## Frozen candidate

- Candidate commit:
  `f12a454e9bc3c2aad44b7f4f706f81bebbdbe750`
  (`docs(v5): decompose D/0/07 and freeze wire/capture specs (trial 3)`).
- Candidate parent:
  `e814606a14a8e655f140955fa03be34af891ca23`.
- Candidate tree:
  `51719e9ac1d9ea7462ab613671f5a0321c44780f`.
- Branch: `plan/V5-D-0-07-trial3`.
- Frozen implementation baseline: integrated `D_0_1_CORE` lineage `a7c09b0`.
- Trial 2 contract:
  [`D_0_7-plan-2_reviewed_KO.md`](D_0_7-plan-2_reviewed_KO.md).

Review only the frozen candidate plus this append-only request/index update. Trial 1 and Trial 2
requests/verdicts, the integrated core, and ratified splice evidence remain immutable.

## What is submitted

- revised [`D/0/07`](../D/0/07.md), now a non-executable shared contract/index retaining the
  frozen positive oracle, Option 1 topology, internal API, public errors, terminal contract, and
  provider-data boundary;
- four separately RED/GREEN/reviewed executable leaves:
  [`D/0/07a`](../D/0/07a.md) issuer/codec,
  [`D/0/07b`](../D/0/07b.md) PTY/identity/write,
  [`D/0/07c`](../D/0/07c.md) authenticated relay/tmux snapshot, and
  [`D/0/07d`](../D/0/07d.md) composition/real-host acceptance;
- registry/dependency updates in [`D/README.md`](../D/README.md),
  [`D/0/01.md`](../D/0/01.md), [`SHEETS.md`](../SHEETS.md), and
  [`EPICS.md`](../EPICS.md), with `D_0_1_SPLICE` consuming only reviewed `D/0/07d`;
- one canonical inventory across [`SHEETS.md`](../SHEETS.md),
  Project V5 [`README.md`](../README.md), [`EPICS.md`](../EPICS.md), and top-level
  [`plan/README.md`](../../README.md):
  82 total = 25 delivered A + 57 active B–I =
  36 complete + 4 in progress + 42 planned, with 46 open.

Candidate path allowlist:

```text
plan/PROJECT_V5/D/0/01.md
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07a.md
plan/PROJECT_V5/D/0/07b.md
plan/PROJECT_V5/D/0/07c.md
plan/PROJECT_V5/D/0/07d.md
plan/PROJECT_V5/D/README.md
plan/PROJECT_V5/EPICS.md
plan/PROJECT_V5/README.md
plan/PROJECT_V5/SHEETS.md
plan/README.md
```

No production, test, fixture, manifest, lockfile, policy, schema, migration, ADR, runbook,
workflow, or historical review artifact changed.

## Trial 2 finding-by-finding closure map

| Trial 2 finding | Trial 3 disposition and exact location |
|---|---|
| 1. Positive RED — CLOSED | Preserved, not redesigned. `D/0/07.md:691-768` retains the exact authorized factory/write/24-byte snapshot/observation transaction and its `a7c09b0` failures. `D/0/07d.md:45-88` owns the final composition RED without counting negative guards. |
| 2. Helper trust-boundary wire — STILL-OPEN | **Closed by specification.** `D/0/07.md:267-335` is the sole big-endian 48-byte `ASP1` codec registry: exact request/response opcodes, payloads, error/phase ids, validation precedence, malformed/unknown/duplicate/out-of-order dispositions, and named tests. `D/0/07.md:336-361` freezes the raw 32-byte HMAC-SHA-256 tag, exact key, domain constant with NUL, fixed input order/encoding of launch/lease/terminal values, and constant-time comparisons. `D/0/07.md:362-460` freezes the separate `ASR1` relay handshake, key/proof derivations, Linux `SO_PEERCRED`, Darwin `getpeereid` + `LOCAL_PEERPID`, exact pane PID/live identity, accept/reject ids, 2,000 ms deadline, and named accept/every-reject tests before fd 0 polling. `D/0/07.md:498-513` keeps raw prompt/terminal bytes off JSON. `07a` owns codec/tag implementation review; `07c` owns relay review. |
| 3. Attach topology — CLOSED | Preserved, not reopened. `D/0/07.md:99-171` retains helper-owned inner PTY + outer direct-argv relay, literal provider `execve`, no shell/`send-keys`, exact `sessionId === tmuxTarget`, literal attach command, and separate operator R/W authority. |
| 4a. Capture canonicalization — STILL-OPEN | **Closed by specification.** `D/0/07.md:515-590` freezes barrier-paused metadata/capture argv and a seven-step byte algorithm: exact history/visible row counts, unused-row proof, preservation of blank history/completed rows/content below cursor/emitted trailing whitespace, exactly one LF per retained row, zero bytes for an untouched pane, and derivation of the exact 24-byte positive snapshot. Named tests cover every rule and fail closed on metadata/row drift. `D/0/07c.md:64-159` owns its RED/GREEN/review gate. |
| 4b. Overlapping cancellation/loss races — STILL-OPEN | **Closed by specification.** `D/0/07.md:607-689` defines one settlement lock/cause ordinal; half-open `A/D/F/L/B/R` intervals; public commit only at validated response `R`; and one result per sole first cause. It expressly assigns `SESSION_PORT_WRITE_ABORTED` to helper/control/response loss after full dispatch and before response when the actual terminal write was zero, partial, or full. Snapshot cancel before `R` always discards capture, even after the barrier. `D/0/07b` owns verified writes and `07d` owns the real-host race matrix. |
| 4c. Bundle was not an S/M branch — STILL-OPEN | **Closed structurally.** `D/0/07.md:41-78` is the indexed `07a → 07b → 07c → 07d → D_0_1_SPLICE` DAG and effort table. Each leaf has its own header, Depends-on/Blocks edge, positive RED, GREEN, acceptance criteria, local gate, and review id (`D_0_7A–D`). `D/0/07.md:770-843` freezes ownership and the final composition gate. The parent is not a fifth executable leaf. |
| 5. Registry reconciliation — CLOSED | Preserved and mechanically reconciled for the required split. `SHEETS.md:17-72`, `D/README.md:16-40`, and `EPICS.md:19-158` register all four leaves and both directions of the acyclic dependency. `D/0/01.md:5-7,86-96` depends on reviewed `07d`, not the former bundle. The four inventory surfaces publish the same 82/25/57/36/4/42/46 split. |

## New sheet tree and inventory summary

| Executable leaf | Review id | Direct prerequisite | Exit consumer | Status |
|---|---|---|---|---|
| `D/0/07a` | `D_0_7A` | integrated `D_0_1_CORE` | `D/0/07b` | `planned` |
| `D/0/07b` | `D_0_7B` | reviewed `D/0/07a` | `D/0/07c` | `planned` |
| `D/0/07c` | `D_0_7C` | reviewed `D/0/07a–b` | `D/0/07d` | `planned` |
| `D/0/07d` | `D_0_7D` | reviewed `D/0/07a–c` | `D_0_1_SPLICE` | `planned` |

The parent `D/0/07.md` is a shared index/contract and is not double-counted. Stage counts are:

```text
B 6 + C 8 + D 11 + E 6 + F 5 + G 5 + H 6 + I 10 = 57 active B–I
25 delivered A + 57 active B–I = 82 total
36 complete + 4 in progress + 42 planned = 82 total
4 in progress + 42 planned = 46 open
```

## Review focus

1. **Wire completeness:** confirm the codec contains one numeric value/shape/disposition for
   every request, response, error, malformed/unknown/duplicate/out-of-order case, with no raw
   provider bytes on JSON.
2. **Trust boundary:** confirm the tag and relay proof have unambiguous key/input/domain
   encodings, constant-time checks, exact Linux/Darwin peer identity, same-user instance
   separation, and zero pre-auth operator queue access.
3. **Determinism:** derive the empty and 24-byte snapshots from the canonicalizer and confirm
   every cancellation/exit/change/close/helper/control ordering has one result under the sole
   first-cause intervals.
4. **Decomposition:** confirm each leaf is an independently testable/reviewable bounded branch,
   its RED is positive on its declared baseline, and only `D_0_7D` unblocks the splice.
5. **Closed-finding preservation:** confirm positive RED, attach topology, and registry
   semantics were not weakened while counts/dependencies were mechanically updated.
6. **Registry integrity:** confirm links, acyclic edges, security-critical ownership, and
   `82 = 25 + 57 = 36 + 4 + 42`, with 46 open and no parent double-count.

## Author verification

- Required contracts were read in the prescribed order: Trial 2 KO, Trial 2 sheet, all seven
  bound source files, then repository `AGENTS.md`.
- `git diff --check` and `git diff --cached --check` passed for the candidate.
- 171 local Markdown links across the eleven candidate documents resolved.
- Physical B–I executable files, excluding the D/0/07 index, count
  `6,8,11,6,5,5,6,10`, totaling 57 and 82 with delivered A.
- Structural assertions confirmed all four leaves have header dependency/block/effort fields,
  positive RED, GREEN, acceptance criteria, and local gate; the parent contains every required
  codec/tag/peer/canonicalization/race contract; all four inventory surfaces contain the same
  totals.
- Two isolated tmux 3.6 byte-shape probes were used only to confirm the specified untouched and
  three-row capture inputs; both temporary servers/sockets were destroyed. No agent work ran
  in tmux.
- No sub-agent, live provider, MCP/shared service, Redis, PostgreSQL, network, push, production
  edit, test edit, or historical-review mutation was used.
- The candidate commit contains exactly the eleven allowlisted Markdown paths.

## Verdict contract

Write `plan/PROJECT_V5/reviews/D_0_7-plan-3_reviewed_OK.md` or
`D_0_7-plan-3_reviewed_KO.md` (append-only; numbered actionable findings, with every KO fixable
from the submitted files alone). Stage only the verdict with an explicit pathspec and commit on
the review branch with message `review(v5): approve|reject D/0/07 plan trial 3`. Then print
exactly `REVIEW D007 PLAN DONE`.
