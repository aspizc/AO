# Project V5 D/0/07d Design Trial 10 — review result

## Verdict

`reviewed_OK` — documentation design candidate only.

This OK covers only plan sheet candidate `95745bd471265080f7d196f0acf2e32fd3c442d4`. It grants
no CP1 implementation review, integration, promotion, release, splice, Docker, or real-host
custody authority. CP1 Trial 3 candidate `289b446b` remains unreviewed and paused; RED 4
`9635baec` remains failing evidence only.

## Authenticated identity (independently reproduced)

- Candidate `95745bd471265080f7d196f0acf2e32fd3c442d4`, tree
  `24bd128530969f9a322d2a9544f13a81a2225280`, sole parent = baseline
  `946ede37877b4f2ff6b2af1799bc3ab0a1c6517d`, subject
  `docs(plan): close D/0/07d frozen protocol gaps (V5 D/0/07d Design Trial 10)`.
- Pathset: exactly `plan/PROJECT_V5/D/0/07d.md`, +211/−56; `git diff --check` clean.
- Sheet blob `7f3776204aaca459ff1fc3ba62d661b1b6cfa184`, 6,712 lines / 376,268 bytes, SHA-256
  `b1e840b05031183e21d983edbe31ad595bd420b62e04397e36275d0dda0c7868`.
- Stable patch-id `06687f53c49e136da06f087bf0421a23288c4ea3`.
- Request commit `0816c382` is a child of the candidate and outside the reviewed range.

## Independent deterministic evidence

Fences extracted LF-preserving from blob `7f37762` (not a checkout); spec parsed with
duplicate-key rejection; oracle compiled with CPython 3; all three entry points run rc=0:

| Artifact | Lines / bytes | SHA-256 (matches request table) |
|---|---:|---|
| V4 custody spec | 126 / 5,480 | `01970f6227ab9eb487515201d2811ae6efba9f07023b69884ce4a10384d49639` |
| BWRAP argv V3 | 24 / 1,372 | `75b099560fa13264c7b4428b3e08e81f93d0db0face17fa7d016e2666e7cef09` |
| V4 custody oracle | 3,826 / 181,652 | `3ea37af1b7ed6032a52125e6f1710a04fc2d827ef2e1da5c4147b20091662301` |
| `selftest` stdout | 1 / 58,951 | `ddcfd068467fad9e2b5bd49f902476c2b980c4429cafb52b7720fe8337e3ac79` |
| `owner-proof` stdout | 1 / 53,063 | `ca4d8db9be029e9efcc89dc0621a615a53e2096fe46642a596d03e5c160007b4` |
| `contracts` stdout | 1 / 43,359 | `68284666b7d9a0ce798454479bd02a1fbea3baf0c10b2b3823390904bf592b22` |

Selftest internals independently confirmed: eleven ordered modes exactly
`bootstrap-probe, cp1-unit-custody, cp1-unit-teardown, cp1-unit-stream, cp2-unit,
cp3-unit-cancel, cp3-unit-ordering, cp3-unit-matrix, docker-integration, focused, full-ci`;
`dashedMutantsRejected=33`; `candidateShaEnvironmentExact=true`; frames `accepted=2`,
`rejected=82`; USTAR `accepted=1` with the full 21-class mutant rejection list intact.

## Adjudication of the five required questions

1. **Sole parent-bound candidate identity — OK.** The bwrap fence contains exactly one
   `D007D_CANDIDATE_SHA` token (the inserted `--setenv` triple after `--clearenv`, bound from
   `bindings["candidateSha"]`), and the spec binds the extracted fence's digest. Under
   `D007D_CANDIDATE_PROTOCOL=D7C2-v3` the wrapper requires lowercase 40-hex input, uses those
   bytes in every frame, and never invokes Git/ODB/`HEAD`. Legacy protocol-unset
   `rev-parse HEAD` derivation stays explicit but unreachable — never a fallback. Outer
   authority environment remains the exact four-entry frozen array.
2. **Eleven handlers, CP2/CP3 immutability — OK.** The dispatch table freezes all eleven bare
   modes with exact name sources (three synthetic; CP1 custody/teardown/stream, CP2 unit, CP3
   cancel/ordering patterns; `d007d race matrix: ` prefix; three-file focused order). The CP1
   fake-runner oracle must reach eleven distinct handlers framing their own mode without
   fabricating future CP2/CP3 evidence. "No later checkpoint may add, replace, or reinterpret a
   wrapper handler"; CP2 changes only its two declared test/fixture paths; CP3 never changes
   the wrapper; any change returns to plan review, no conditional pathsets.
3. **Byte-exact terminal TAP — OK.** Handlers reject zero bytes and byte 2,097,153 before
   framing, decode once with fatal UTF-8, require byte round-trip equality, chunk only on
   scalar boundaries (≤64 nonempty chunks, ≤32,768 encoded bytes) with reassembly equality;
   `tapBytes`/`tapSha256` bind original bytes. The parent's terminal root-TAP grammar rejects
   `Bail out!`, invalid UTF-8, second header, duplicate/non-sequential ids, plan/result/summary
   inconsistency, nonterminal plan/summary, trailing records/bytes; after `# todo 0` only EOF
   or one exact `# duration_ms <nonnegative-decimal>` line plus EOF (fullmatch regex in the
   oracle). Frame selftest: 2 accepted / 82 named mutants rejected, including the new
   duplicate-id, plan-mismatch, nonterminal-summary, trailing-header/byte, bailout,
   oversized-byte-buffer (`summary_tap_bytes_over_cap` at 2,097,153), and UTF-8/chunk cases.
4. **Minimal RED4→GREEN — OK.** The sheet records CP1 Trial 3 as unreviewed/paused and RED 4
   (`+184/−2`, 4/0/4/0/0, four exact names) as evidence only, granting no authority. Resumption
   requires an independent Design Trial 10 OK first; the resumed test preserves the RED 4 blob
   or makes only the minimum ODB-expectation-to-parent-SHA correction, renames the third case
   to `frozen V4 consumes parent candidate SHA without Git or ODB resolution`, and reruns the
   same argv (third pattern alternative renamed) to exactly `4/4/0/0/0`.
5. **Trial 9 invariants preserved — OK.** The delta is additive corrections plus status
   rewording; custody/lifecycle/expectation/deadline/reconciliation/EOF/cleanup contracts
   (owner-proof and contracts entry points) still execute rc=0 with unchanged claimed hashes,
   the USTAR canonical-parse mutant wall is intact, and the status row still claims no
   `D_0_7D` review, integration, promotion, release, or support.

## Findings

No material findings. One non-blocking observation: the request's Gateway planner-spawn denial
(`agent.service_tier.allowed`) is operational context only and was correctly excluded from
candidate evidence.

## Boundary

Not run (out of scope per review charter): `bash scripts/ci.sh`, Docker, privileged real-host
custody matrix, CP1 GREEN. Nothing in this result may be cited as evidence for those lanes.
