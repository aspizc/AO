# Plan Review Submission — Project V5 D/0/07 determinism closure (plan trial 4)

## Requested reviewer

- Model profile: GPT-5.6 Sol, reasoning `max`, service Priority/Fast
- Review mode: independent plan review of exactly the two remaining Trial 3 determinism defects
- Claim boundary: plan documents only; no implementation, test code, technical GREEN,
  integration, promotion, live-provider execution, or release is claimed

## Frozen candidate

- Candidate commit:
  `f3c970cafa29b2349307e42faf3cec7bbacbc44c`
  (`docs(v5): freeze capture flags and cancel-cause table (trial 4)`).
- Candidate parent:
  `e7fa55524bd1a2bb96143660b68c2d1d67a2d25b`.
- Candidate tree:
  `fe2534d9a84e0d15ccd517df91e6560e57adb2fb`.
- Branch: `plan/V5-D-0-07-trial4`.
- Frozen implementation baseline: integrated `D_0_1_CORE` lineage `a7c09b0`.
- Binding verdict:
  [`D_0_7-plan-3_reviewed_KO.md`](D_0_7-plan-3_reviewed_KO.md).

Review only the frozen candidate plus this append-only request/index update. Trial 1–3
submissions and verdicts, the integrated core, the ratified topology, and the four-leaf
decomposition remain immutable.

## What is submitted

- revised shared contract/index [`D/0/07`](../D/0/07.md);
- capture-owner leaf [`D/0/07c`](../D/0/07c.md);
- composition/race-owner leaf [`D/0/07d`](../D/0/07d.md).

Candidate path allowlist:

```text
plan/PROJECT_V5/D/0/07.md
plan/PROJECT_V5/D/0/07c.md
plan/PROJECT_V5/D/0/07d.md
```

No `07a`/`07b`, production, test, fixture, manifest, lockfile, policy, schema, migration, ADR,
runbook, workflow, registry, inventory, or historical review artifact changed.

## Two-defect closure map

| Trial 3 defect | Exact closure section | Re-derived oracle bytes / exact public results | Required named tests |
|---|---|---|---|
| 1. Capture producer strips meaningful row-end spaces | `D/0/07.md:515-601` freezes the exact direct vector `["capture-pane","-p","-N","-T","-t",tmuxTarget,"-S","-400"]`, explains that `-N` retains rendered trailing spaces while `-T` removes non-character cell padding, and keeps the seven-step canonicalizer. `D/0/07c.md:25-38,101-119,131-171` owns the real tmux proof and gate. | Isolated-socket tmux 3.6 rederivation: untouched capture = 40 LF bytes → public 0 bytes; positive capture = 61 bytes (`ready\nstatus\nack:status\n` + 37 LF) → public 24 bytes; row-end-space capture = 50 bytes (`edge  \nnext\n` + 38 LF) → public 12 bytes with both U+0020 cells retained. | Existing zero/24-byte names remain. New non-synthetic host test: `preserves two rendered row-end spaces through real tmux capture-pane -N -T`. |
| 2. Cancel/loss cause table is not total or mutually exclusive | `D/0/07.md:628-762` makes a post-`D` cancel request pending intent with no ordinal until authenticated `ERROR(0x0005,0x06)` validates as zero-PTY-byte proof, maps proof-path loss first to `SESSION_PORT_WRITE_ABORTED`, and classifies helper-origin loss, terminal-component-origin close, unattributed control loss, readable mismatch, live-but-unreadable identity, and generic snapshot failure in disjoint precedence. `D/0/07d.md:23-32,97-146` owns the exact real-host cases. | Cancel-first then proof-response loss → exactly `SESSION_PORT_WRITE_ABORTED`; helper death before `F` → exactly `SESSION_PORT_WRITE_ABORTED`; relay disappearance during snapshot → exactly `SESSION_PORT_TERMINAL_CLOSED`. No `may return` branch remains. | `returns SESSION_PORT_WRITE_ABORTED when cancel is requested first and its proof response is lost`; `returns SESSION_PORT_WRITE_ABORTED when the helper dies before F`; `returns SESSION_PORT_TERMINAL_CLOSED when the relay disappears during a snapshot`. |

## Closed-finding and decomposition preservation

The candidate does not reopen the four CLOSED Trial 3 findings:

1. **Positive RED remains closed.** The factory/write/24-byte snapshot/observation transaction
   and its `a7c09b0` failure remain in `D/0/07.md:764-841`; `D/0/07d.md:46-89` still owns the
   final composition RED.
2. **Helper trust-boundary wire remains closed.** The 48-byte big-endian `ASP1` codec, tag, and
   `ASR1` peer/proof handshake in `D/0/07.md:267-460` are unchanged.
3. **Attach topology remains closed.** Helper-owned inner PTY, outer relay-only tmux pane,
   literal provider `execve`, no shell/`send-keys`, exact target identity, attach command, and
   separate operator R/W authority in `D/0/07.md:99-171` are unchanged.
4. **Registry reconciliation remains closed.** No registry or inventory surface changed.

The structurally closed decomposition also remains exactly
`07a → 07b → 07c → 07d → D_0_1_SPLICE`; the parent remains a non-executable index, and only an
independent `D_0_7D` OK can unblock the splice. No leaf was added, removed, renamed, or
re-split.

## Inventory arithmetic

Inventory is intentionally unchanged:

```text
B 6 + C 8 + D 11 + E 6 + F 5 + G 5 + H 6 + I 10 = 57 active B–I
25 delivered A + 57 active B–I = 82 total
36 complete + 4 in progress + 42 planned = 82 total
4 in progress + 42 planned = 46 open
```

## Review focus

1. Execute the byte derivation against the exact `-N -T` capture vector and confirm unused
   padding stays empty while the two rendered row-end spaces survive.
2. Confirm post-dispatch cancel receives no ordinal before its authenticated zero-byte proof,
   and that loss of that proof path has exactly one result.
3. Confirm each physical helper/terminal/control/identity failure enters exactly one ranked
   class before ordinal assignment, including the three named result oracles.
4. Confirm the four CLOSED findings, four-leaf DAG, parent/index status, splice gate, and
   `82 = 25 + 57 = 36 + 4 + 42` inventory remain unchanged.

## Author verification

- `git diff --check` and `git diff --cached --check` passed for the candidate.
- All 13 local Markdown targets in the three candidate documents resolve.
- An isolated `/tmp` socket on tmux 3.6 produced the exact 40/61/50-byte capture inputs and
  zero/24/12-byte public oracles above. The probe server and socket were destroyed.
- The candidate changes exactly the three allowlisted Markdown paths.
- No sub-agent, default tmux socket, live provider, network, Redis, PostgreSQL, shared service,
  production edit, test edit, push, or historical-review mutation was used.

## Verdict contract

Write `plan/PROJECT_V5/reviews/D_0_7-plan-4_reviewed_OK.md` or
`D_0_7-plan-4_reviewed_KO.md` (append-only; every KO finding must be actionable from the
submitted files alone). Stage only the verdict with an explicit pathspec and commit on the
review branch with message `review(v5): approve|reject D/0/07 plan trial 4`. Then print exactly
`REVIEW D007 PLAN DONE`.
