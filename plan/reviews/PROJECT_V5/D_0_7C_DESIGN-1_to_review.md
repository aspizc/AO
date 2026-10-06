# Design Review Request — Project V5 D/0/07c post-`ACCEPT` binding

## Request

Please review the design-only post-`ACCEPT` binding decision for D/0/07c.
This is not Trial 4 and contains no implementation or test change.

| Field | Value |
|---|---|
| Review id | `D_0_7C_DESIGN-1` |
| Status | `ready_for_review` |
| Design commit | `81afc45086dc62b20a9ba55f405ed9e3de52d4d1` |
| Design tree | `35e76eba92f6754da5380bab8be4d039af5841d2` |
| Parent / Reviewer B verdict | `2090e43cebc8b14c81eac9f7f878840382c964b3` |
| Trial 3 GREEN retained as input only | `590e053fd4b9476df8618809eb9ae81d9c713e2b` |
| Design document | `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` |

The design commit changes exactly one file:

```text
plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
```

## Normative decision under review

The design's universal rule is:

> After `ACCEPT`, an operation may read, write, capture, settle, terminate, or remove only through the retained authority handle and generation bound by `ACCEPT`; if a mutable prerequisite is not delivered by that same indivisible handle-and-use operation, the operation MUST REJECT rather than re-resolve a name or use a check-then-act result.

It derives four rules:

1. transfer only through retained endpoint descriptors and the accepted
   generation;
2. obtain every mutable prerequisite from the same indivisible effect or
   reject;
3. perform destruction only through a retained destruction capability or an
   atomic compare-and-act primitive;
4. make revocation and settlement generation-sticky.

The design does not propose another pre/post identity check.

## Five-finding closure claim

| # | Independent finding | Claimed design closure |
|---:|---|---|
| 1 | Trial 1 reviewer A: post-`ACCEPT` input, barrier, and capture operations were detached from the accepted relay/tmux identity. | The one binding rule covers every effect, R1 forbids reconnection/name re-resolution, R2 rejects mutable evidence not inseparable from the effect, and the complete site table includes readiness, input, output, barriers, capture, settlement, retirement, and cleanup. |
| 2 | Trial 1 second reviewer: pane width and history-limit drift were accepted. | R2 makes exact `120x40`, history `400`, frozen tmux identity, metadata, and bytes fields of one atomic capture record. Missing or contradictory evidence rejects the whole record with no snapshot. |
| 3 | Trial 2 reviewer A: a real same-socket relay CWD change still received all 25 provider bytes. | R2 identifies the accepted stream fd as insufficient to hold mutable start/executable/argv/cwd/pgid/sid authority. The current protocol must HARD FAIL with zero transferred/queued bytes until an operator-approved immutable or same-effect mechanism exists. |
| 4 | Trial 2 reviewer B: an outside resize after the last preflight and before `capture-pane` returned `"drift-screen\n"`. | R2 prohibits split metadata/check and capture. Its isolated proof resizes to 121 for capture and restores 120 before any separate post-read, so only evidence inseparable from the capture can accept or reject it. Stock tmux 3.6 cannot supply that record under the frozen mechanism, so current capture rejects. |
| 5 | Trial 2 reviewer B: socket cleanup could unlink a same-path replacement inode. | R3 distinguishes retained inode evidence from a retained deletion capability. Pathname unlink is forbidden without atomic conditional deletion or exclusive mutation authority; rejection performs no unlink, so a replacement cannot be removed. |

## Complete-site claim

The design enumerates all post-`ACCEPT` sites in one table:

- private readiness publication;
- relay operator input receive and broker admission;
- broker/operator input forwarding to the PTY;
- provider output forwarding to the relay;
- the inherited D/0/07b programmatic prompt boundary;
- relay barrier send/receive and input observed during the barrier;
- pre-snapshot output drain;
- tmux identity, geometry, history, and metadata reads;
- `capture-pane`, canonicalization, and private/public settlement;
- retained descriptor closure;
- relay/tmux process and pane/session retirement;
- relay key/runtime and tmux socket cleanup;
- inert observation exposure.

The table states the governing rule and either its retained mechanism or its
required rejection. Polling, parsing, normalization, and tag calculation are
identified as non-authority steps whose first later effect remains governed
by the table.

## Frozen-contract conflicts and implementation stop

The design finds no honest implementation under the current frozen primitives
for:

1. atomically coupling the full mutable relay identity to a stream transfer;
2. atomically coupling tmux identity/geometry/history/metadata to the exact
   rendered capture bytes;
3. terminating a process or tmux object through a cross-platform retained
   destruction capability instead of a reused name;
4. conditionally deleting the retained socket inode on both Linux and Darwin.

It therefore says **REJECT**, not another check. It also states the necessary
operator decisions:

- authorize an immutable/same-effect relay mechanism or narrow the frozen
  post-`ACCEPT` identity;
- authorize an atomic tmux capture facility, which changes the frozen
  separate metadata/direct-capture mechanism;
- authorize retained process/tmux destruction capabilities or preservation;
- provide exclusive directory mutation/conditional unlink, or amend the
  zero-socket-leak requirement to permit preservation after rejection.

Implementation remains stopped until approval includes those choices. The
design makes no Trial 4, D/0/07d, integration, splice, promotion, or release
claim.

## Falsifiable future proof obligations

Each rule has a mutation and one isolated future test. The document explains
why no intact guard can reject first:

| Rule | Mutation boundary | Isolation |
|---|---|---|
| R1 | Replace retained fd use with path reconnect/reopen. | All peer/process/tmux readers return accepted values; only the endpoint handle differs. |
| R2 relay | Replace same-effect authority with an out-of-band process read. | CWD changes after that read and before a 25-byte transfer; all separate evidence has already passed. |
| R2 capture | Split the atomic record or ignore its geometry/generation. | Width is 121 only for capture and is restored before any separate post-read. |
| R3 retirement | Replace retained terminate with PID/PGID/tmux-name kill. | Equal-looking replacement survives only if destruction stays bound to the retained object. |
| R3 inode | Replace conditional deletion with `lstat` plus `unlink(path)`. | Replacement has the same uid, mode, basename, and serverless state; point-in-time guards all pass. |
| R4 | Clear revocation or accept a stale generation result. | Every visible value is restored; only the sticky generation distinguishes it. |

No tests are written by this design request.

## Preserved independently confirmed behavior

The design explicitly leaves these as future regression obligations:

- frozen canonicalization and snapshot DTO;
- real tmux 3.6 figures `40 -> 0`, `61 -> 24`, and `50 -> 12`;
- exact row-end spaces;
- stable `121x40` and `history-limit=401` terminal-changed rejection;
- rejected-generation non-revival;
- malformed/absent history fail-closed behavior;
- D/0/07a capability/codec and D/0/07b verified writes;
- direct provider `execve`, no shell, no `send-keys`, and no
  `capture-pane -e`/`-J`;
- inert public observation values.

## Review focus

Please return `reviewed_OK` only if:

1. the binding sentence has one unambiguous reading across every enumerated
   post-`ACCEPT` effect;
2. no rule authorizes check-then-act or a silently re-resolved name;
3. every unholdable mutable property says REJECT;
4. socket removal cannot delete a replacement under the rule;
5. each mutation proof isolates its named rule from all other guards;
6. every frozen-contract conflict and required operator decision is explicit;
7. the commit is design-only and does not claim implementation approval on
   unresolved choices.

## Mechanical evidence

```text
commit 81afc45086dc62b20a9ba55f405ed9e3de52d4d1
tree   35e76eba92f6754da5380bab8be4d039af5841d2
parent 2090e43cebc8b14c81eac9f7f878840382c964b3

git show --name-only --format= 81afc45086dc62b20a9ba55f405ed9e3de52d4d1
plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md

git diff --check 2090e43cebc8b14c81eac9f7f878840382c964b3..81afc45086dc62b20a9ba55f405ed9e3de52d4d1
exit 0
```

The pre-existing untracked `gateway/node_modules` symlink remains untouched.
