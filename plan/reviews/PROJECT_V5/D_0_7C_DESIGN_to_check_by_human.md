# Human decision required — Project V5 D/0/07c post-`ACCEPT` binding design

Status: **design approved, implementation blocked on operator ratification**.

## What is being asked

Ratify one option for each of five amendments to the frozen `D/0/07` parent contract, or decline any
of them. The amendments and their full costs are in the ratification section of
[`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`](../../PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md).
**Read that section, not this summary, before deciding** — this file exists to explain why you are
being asked and what the reviewers established, not to restate the table.

The five amendments are **independently ratifiable**. You may approve some and decline others; the
design states, per decision, what ratifying it means alone and what declining it costs. Declining any
one leaves its dependent paths HARD FAIL, and `D/0/07c` as a whole cannot leave HARD FAIL until all
five are resolved.

| Decision | Sole ratifiable option |
|---|---|
| 1. Relay transfer authority | 1B — retained-socket/read-range amendment |
| 2. Atomic tmux capture and owned-object retirement | 2A — maintained custom shared-server tmux amendment |
| 3. Process/tree retirement | 3B — bounded process-preservation amendment |
| 4. Owned namespace retirement | 4C — namespace-preservation amendment |
| 5. PTY source/write authority | 5B — read-time retained-PTY amendment |

## Why there is only one option per decision

Earlier design trials offered a "strong facility" option alongside each amendment. An independent
reviewer ruled, per platform and with specifics, that **all five strong options specified facilities
that do not exist** on both Linux and Darwin under the frozen topology: no Unix stream operation can
condition `recv`/`send` on another process's live executable/argv/cwd/pgid/sid; `unlinkat`/`rmdir`
select a directory entry by basename on both platforms and accept no expected-inode condition;
ordinary DAC grants directory mutation by principal rather than by one process among same-uid
processes; POSIX PTYs attach no per-byte writer identity at production; and Darwin has no general
cgroup-v2 equivalent admitting every descendant before escape. Those options were removed rather than
left in as choices that could not be built.

A later reviewer independently re-verified each removal and confirmed none was buildable. So the real
decision is which capabilities to give up, not which mechanism to build.

## Why this took nine design trials

`D/0/07c` was KO'd three implementation trials running on one defect class — an operation
authenticated at `ACCEPT` later acting on a re-resolved name instead of the identity bound at
acceptance. Per doctrine the lane switched to design-first. Each design trial was reviewed by two
independent reviewers under different lenses, and the second lens found a real defect in six
consecutive trials, including:

- the impossibility analysis omitted the PTY side, making the decision set incomplete;
- an "indivisible effect" that returned evidence but never **conditioned** on it — so the bytes still
  crossed, the exact failure that killed the implementation trials;
- the active-generation rule suppressed the cleanup that revocation itself requires;
- Decision 3 surrendered more capability than the impossibility required;
- five individually accurate cells that together did not disclose the combined contract;
- outcomes disclosed as possibilities without saying which occur in an ordinary run.

Trial 9 was approved by **both** reviewers with zero findings at every severity. The second reviewer
wrote: *"I would sign it. The document is ready for operator ratification."*

## What the reviewers established that you can rely on

- No P0 since design trial 4. The operative rules — signal boundary, retained-object selection,
  generation ordering, exact capture, bounded original-group signal, preservation fallbacks — were
  independently confirmed safe in four consecutive rounds.
- Unapproved workload paths remain closed; cleanup preserves rather than acts on an unresolved
  replacement; no replacement target is ever authorized.
- Independent ratification does not weaken the all-five implementation gate: no governing decision can
  be bypassed by approving a subset.

## What you should look at hardest

**The combined-effect subsection.** Each amendment's cost is disclosed in its own row, but approving
them together permits outcomes no single row conveys — most importantly that an atomic, field-exact
capture may render bytes whose producer, production time, foreground job or binding state were
admitted by Decision 5 and are **not** established by the capture.

**The trigger-class table**, and specifically the rows marked *expected in a conforming ordinary run*.
Under Decision 4, cleanup closes descriptors but never unlinks the relay socket and never removes the
runtime directory, so absent external removal **both remain after every ordinary accepted
generation**. That is selected baseline behaviour, not a failure mode.

## Exact response needed

For each of the five decisions, ratify the stated option or decline it. If you ratify all five,
implementation of `D/0/07c` is authorized and nothing else — the approval is not an integration,
promotion or release claim. If you decline any, its dependent paths stay HARD FAIL and this lane
remains blocked; say whether you want the affected scope deferred or redesigned.

## Evidence

Design commit `95185e0` at trial 9 · requests and results
`D_0_7C_DESIGN-1..9_to_review.md` and `..._result.md` / `..._result_b.md` on
`feat/V5-D-0-07c-relay-snapshot` · trial 9 approvals `e230faf` (reviewer A) and `83252f6`
(reviewer B) · the three implementation KOs at `D_0_7C-1_result.md`, `D_0_7C-1_result_second.md`,
`D_0_7C-2_result_a.md` and `D_0_7C-2_result_b.md`.
