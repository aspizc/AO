# Review Submission — Project V5 D/0/07c Design Trial 2

## Status

`ready_for_review`

This is a design-only resubmission against
`plan/reviews/PROJECT_V5/D_0_7C_DESIGN-1_result.md`. It authorizes no
implementation, test change, Trial 4, D/0/07d gate, port surface, splice,
integration, promotion, or release.

## Candidate

- Design commit:
  `2a319e0e57b6e226bc0d2894481271e3f9d9873b`
  (`design(v5): close design trial 1 findings for D/0/07c`)
- Parent:
  `3149888ab1021a91053da4acf3d9cfd616a307f1`
- Tree:
  `2e27395a7ea8547983d39ba4ed69302dd6a0f2be`
- Candidate range:
  `3149888ab1021a91053da4acf3d9cfd616a307f1..2a319e0e57b6e226bc0d2894481271e3f9d9873b`
- Changed path:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`

## Rule disposition

The universal rule was not weakened. After `ACCEPT`, authority-bearing reads
and every write, capture, settlement, termination, or removal must use the
retained accepted authority and generation. Every mutable prerequisite must
come from the same indivisible handle-and-effect operation or the operation
MUST REJECT. Separate name-based observations are permitted only as
non-authorizing diagnostics: they may cause rejection but can never authorize
an effect, preserve readiness, or settle a result.

Under the current primitives, the newly identified PTY-side sites therefore
HARD FAIL with zero affected bytes. No D/0/07b exemption remains.

## Reviewed-point closure map

| Finding | Closure |
|---|---|
| P0 — provider/utility/foreground/PTY impossibility was omitted | R2 now covers the full utility executable/argv/cwd/pgid/sid tuple, PTY dev/ino/rdev and exact dimensions, foreground pgid/equation, generation, exact bytes/count, and effect disposition. `verify()` then `os.write()` and observation then `os.read()` are explicitly check-then-act and cannot authorize. Broker/operator writes, programmatic prompt writes, and provider-output reads reject with zero affected bytes until Decision 5 is resolved. |
| P1a.1 — broker/operator and programmatic PTY writes lacked R2 | Both inventory rows now require R1/R2/R4 and an atomic PTY-write effect. D/0/07b continues to own framing, FIFO ordering, partial-write accounting, and public disposition, but it receives no exception from R2. |
| P1a.2 — provider-output source authority was omitted | Provider output is split into a PTY-source effect and a relay-destination effect. The source must carry same-effect utility/PTY/foreground authority when bytes enter the PTY stream; the destination separately requires same-effect relay authority. Either failure crosses zero bytes. |
| P1a.3 — utility/process-tree retirement was omitted | The inventory now names the supervised utility process group and adopted descendants, plus relay process and separate tmux pane/session/server targets. `_signal_exact`/`_signal_utility_group`-style read-then-signal operations are rejected without a retained destruction capability. |
| P1a.4 — `RELAY_DATA_CLOSE` was omitted | The frame is now an explicit R2/R3/R4 site. The future design removes this unauthorizable protocol write and retires the accepted transport through retained-descriptor `shutdown`/`close`; the current path must send no close frame. |
| P1a — retained control/sideband closures were unnamed | The inventory names supervisor control, transcript, session-port request/response, and other retained sideband descriptors and requires direct, once-only closure. |
| P1b — R1 retained-endpoint proof was masked by R2 | The future R1 mutation baseline explicitly supplies valid PTY-source and relay-destination R2 records, a live R4 generation, and a reachable 25-byte transfer through the retained fd before endpoint substitution is tested. |
| P1b — atomic-capture generation mutant was untested | Capture geometry and capture generation are now separate cases. The generation case calls record acceptance with every field valid except H while G is required, and stops before R4 settlement. |
| P1b — R4 proof allowed R1/R2 to reject first | The sticky-settlement case keeps endpoints and R2 evidence unchanged, revokes G without replacement, and presents a valid authenticated G-tagged result. A separate direct transition case proves that G cannot become active again. |
| P1b — conditional proof-isolation requirements | The relay R2 case selects only one provider-output send. Each R3 mutation run selects one concrete target: utility group, adopted descendant, relay process, tmux pane, tmux session, tmux server, or socket inode. |
| Wording — `read` had two meanings | The binding sentence now says “consume bytes or state” for authority-bearing reads. Diagnostic observations are separately defined as non-authorizing and rejection-only. |

## Complete operator decision set

All five decisions remain required. No choice is made by this design
submission.

1. **Relay mutable identity.** Authorize a cross-platform kernel-enforced
   immutable relay execution domain or authoritative same-frame evidence, or
   narrow the frozen mutable relay identity. A retained Unix stream endpoint
   does not itself attest live executable, argv, cwd, pgid, and sid at each
   effect. Until resolved, relay input, output, and barriers HARD FAIL.

2. **Atomic tmux capture.** Authorize one retained-server operation returning
   identity, exact 120x40 geometry, configured history limit 400, metadata,
   generation, and captured bytes, or explicitly amend the frozen capture
   contract. Stock tmux 3.6 and the frozen separate direct argv cannot produce
   that indivisible record. Until resolved, capture HARD FAILS.

3. **Identity-bound retirement.** Authorize retained cross-platform
   destruction capabilities for the utility process, process group, adopted
   descendants, relay process, and tmux server/session/pane, or amend cleanup
   to preserve an object whose ownership is undecidable at the destructive
   boundary. Linux pidfds are only a partial process-instance mechanism; they
   do not supply the complete cross-platform utility-tree and tmux capability.
   PID/PGID/pane/session/target re-resolution remains forbidden.

4. **Conditional socket deletion.** Provide exclusive directory-mutation
   authority against the same-user actor or a portable atomic
   expected-inode-and-unlink primitive, or amend leak-free cleanup to permit
   preservation after rejection. Pathname `unlink` cannot prove that the
   entry removed is the accepted inode.

5. **Atomic utility/foreground/PTY effects — added in Design Trial 2.**
   Authorize an indivisible source/write facility returning the accepted
   generation, full utility identity, PTY identity and dimensions, foreground
   equation, exact bytes/count, and disposition, with provider bytes
   attributed when produced; alternatively narrow the frozen per-effect
   prerequisites to authority actually retained by the PTY descriptor.
   This decision is necessary because retaining the terminal does not bind the
   producing utility/foreground generation, while `verify()` then `os.write()`
   and observation then `os.read()` leave a mutation interval. Until resolved,
   PTY reads and writes HARD FAIL with zero affected bytes.

Decisions 1, 2, and 5 are required for the frozen positive 24-byte snapshot;
Decision 5 is also required for positive D/0/07b prompt writes. Decisions 3
and 4 are required for the frozen no-process/no-target/no-socket-leak
criterion. All five are required for the complete leaf objective.

## Verification

- `git diff --check
  3149888ab1021a91053da4acf3d9cfd616a307f1..2a319e0e57b6e226bc0d2894481271e3f9d9873b`
  — passed.
- `git diff --name-status
  3149888ab1021a91053da4acf3d9cfd616a307f1..2a319e0e57b6e226bc0d2894481271e3f9d9873b`
  — exactly one modified design document.
- No source, test, parent sheet, frozen contract, port, adapter, service,
  catalog, or D/0/07d file changed.
- No implementation or runtime test was performed; this trial is design-only.

## Review request

Review only whether the amended design closes the P0, P1a, P1b, and wording
findings from Design Trial 1 while preserving the strict HARD FAIL rule and
the previously confirmed Decisions 2, 3, and 4. Implementation remains
blocked pending reviewed design approval and explicit operator resolution of
all five decisions.
