# Operator decision required — G/0/02 ACK Lua-execution test harness (V5 Wave 2)

Date: 2026-07-27
Status: **RATIFIED — Option A** (operator decision, 2026-07-27): install `redis-server` on the
host and build an isolated ephemeral-instance test harness (each test starts a throwaway
`redis-server` on an isolated socket/port, runs the actual ACK Lua, observes real
stream/PEL/tombstone/repository effects, tears it down — never the shared 6379). Trial 5 rewrites
the four RED families to execute the real Lua so the four predicates become mutation-sensitive.
Options B and C were NOT taken.
Evidence: [`G_0_2_ACK-4_to_review.md`](G_0_2_ACK-4_to_review.md) (Trial 4 candidate, `c53f9c4`) ·
[`G_0_2_ACK-4_result.md`](G_0_2_ACK-4_result.md) (independent `reviewed_KO`, P0=0 P1=4, `27759db`)

## Why this needs you (one paragraph)

Trial 4 is the **third** KO on the G ACK lane, but a qualitatively different one. The reviewer
confirmed that all four production corrections from the Trial 3 KO are now **present and
statically correct in source** (WeakMap authority, `PTTL>0` tombstone guards, bounded canonical
JSON parser, per-object duplicate-key rejection), the exact npm lint gate is green, all four RED
families reproduce, and the 203-test injected-fake inventory passes 203/203. The KO is that the
**tests do not observe what they claim**: the four RED families use fake Redis handlers that
synthesize the expected reply from source-fragment matching instead of executing the actual Lua
scripts, so the reviewer deleted each of the four protected predicates in a disposable copy and
every relevant test stayed green (classic "declared, not observed" defect). The required fix for
all four is identical: **execute the real Lua and observe real Redis effects.** But this sandbox
has **no `redis-server`, no `redis-cli`, and no Lua interpreter**, and the handoff explicitly
forbade live Redis in this lane. That constraint is yours, and satisfying the reviewer requires
either relaxing it or adding infrastructure — an agent must not decide either.

## The options

- **A — Isolated ephemeral Redis harness (recommended).** Install `redis-server` on the host
  (one-time), then Trial 5 builds a disposable-instance test harness: each test starts a
  throwaway `redis-server` on an isolated random port/unix-socket, runs the actual ACK Lua
  against it, observes real stream/PEL/tombstone/repository effects, and tears it down. This is
  **not** the shared `127.0.0.1:6379` the handoff protects — it honors the handoff's real intent
  (don't disrupt shared services) while giving the reviewer genuine execution proof, and the
  four RED families become mutation-sensitive. Cost: a one-time host `redis-server` install +
  the harness build. The existing `*_live.test.js` files show the project already models a real
  redis path, so a disposable variant is a natural extension.

- **B — Opt-in live suite against the shared instance.** Relax "no live Redis in this lane" to
  let the four ACK families run through the existing `_live.test.js` opt-in pattern against the
  shared `6379`, gated by the env flag, executed on the host outside the default gate. No
  install, but it uses the shared instance and the Lua proof runs **only** in the opt-in live
  suite, never in the default `bash scripts/ci.sh` — so the default gate still cannot catch a
  regression of these four predicates.

- **C — Accept the fakes as a documented bounded limitation.** Keep the statically-verified
  source, mark the Lua-execution proof as DEFERRED to a follow-up gate task, and proceed. This
  is the weakest: the reviewer demonstrated four independent mutations that remove
  release-relevant behavior while staying green, so this ships unproven predicates and violates
  the exit bar's "tests verify intent" rule. Not recommended.

## Orchestrator recommended default

**Option A.** It is the only option that both satisfies the reviewer (real Lua, real effects,
mutation-sensitive) and honors the handoff's actual concern (never touch the shared Redis). If
you approve A, confirm you can install `redis-server` on the host (or authorize me to request
it), and I will run Trial 5 with a harness-first coder brief (design the disposable-instance
harness, verify it starts/tears down cleanly, then rewrite the four RED families to execute the
real Lua). The G coder session holding the Trial 4 context stays parked for that KO→fix.

## What the operator must answer

Reply with A, B, or C. If A, confirm `redis-server` can be installed on the host. The
ratification will be recorded here and drive Trial 5.
