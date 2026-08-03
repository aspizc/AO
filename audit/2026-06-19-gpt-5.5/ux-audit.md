# UX & Interaction-Design Audit — agents-orchestrator

**Auditor:** Staff product designer / usability specialist (read-only — no UI or code changed)
**Date:** 2026-06-19
**Method:** This product has **no graphical UI**. Its interface is (1) the `agent-run` operator **CLI** (Typer + Rich), (2) the **MCP tool surface + orchestrator prompts** that the human-facing LLM operates, and (3) the **terminal/tmux** supervision experience. Per the skill's "operate the interface" mandate, I **ran the real CLI** across its allow/deny/approval/error/empty states against the live 915-event audit log and the shipped policies, and read the CLI's "design system" (`cli/src/agents_cli/output.py`). Findings are **[OBSERVED]** (reproduced in the running CLI) or **[INFERRED]** (from code). WCAG is applied where meaningful for a terminal; where it isn't, I say so.

---

## Executive Summary

**UX-quality grade: C (clean CLI primitives; the two defining interactions are under-designed).** **Accessibility: WCAG 2.2 AA is not directly applicable (no GUI); terminal-output accessibility is reasonable** — decisions render a text label *and* a color (not color-alone), errors are prefixed `error:` on stderr, and exit codes are mostly sane (`2` usage / `1` logical / `0` ok, all observed). The peripheral CLI surface is genuinely good: `agent-run policy validate` renders a clean table; `policy check` prints `DECISION ruleId=… reason=…` that is scannable and machine-readable via `--json` (including a full per-layer decision trace); Typer auto-generates clear `--help` with required-flag markers and a "Try --help" recovery hint on missing args. The grade is held down by the **two interactions that matter most for this product**, both of which I reproduced as broken-by-design. **(1) The audit view — the operator's only window into "what is the system doing?" — is information-poor:** `agent-run audit show` renders only `ts / type / traceId / eventId`, so it shows a list of event *type names* with **no action, agent/role, decision, or session**, and it **truncates the `traceId`** (the one correlation key the whole system is built on) to ~18 chars with **no way to read or copy the full value** — forcing the operator into a wall of single-line `--json` to understand anything or to obtain a traceId to filter by. **(2) The approval flow — the product's headline human-in-the-loop safety gate — is under-designed:** there is **no command to list pending approvals** (the operator cannot discover what is waiting on them), and `agent-run approve <id> -d granted` authorizes an action **by opaque `apr-…` id with zero preview** of *what* is being approved (which agent, action, repo, branch), then offers **no undo**. A safety gate whose entire purpose is informed human consent currently grants consent without information. Compounding both: the CLI **cannot drive an orchestration at all** (its only verbs are `policy/audit/approve`), so the operator has no first-class console for the core loop — they watch via the LLM and a sparse audit tail. **Top 3 usability risks:** (a) blind approval-by-id breaks the trust the whole product exists to provide; (b) the operator cannot answer "what's running / what's waiting on me / what just happened?" from the human UI; (c) the truncated traceId severs the core "filter the audit by trace" workflow from the human view. **Top 3 opportunities:** (a) an `approve` flow that lists pending approvals and shows what each authorizes before asking y/n — high impact, small effort; (b) a richer `audit show` (action/role/decision columns, full/copyable traceId, `--wide`) — small effort, large clarity gain; (c) a read-only `agent-run status --trace-id` operator console for the core loop. The interface is an MVP that designed the *primitive* states well and left the *defining* interactions unbuilt.

---

## Interface Map

**Surfaces (the "screens"):**
| Surface | Role | Maturity |
|---|---|---|
| `agent-run` CLI — `policy validate`, `policy check`, `audit show`, `approve` | The human operator's interface | MVP, clean primitives |
| MCP tool surface (`orchestration.*`, `task.*`, `agent.*`, `artifact.*`, `approval.*`, `session.*`, `message.*`) | The **LLM's** interface (orchestrator role) | Built; consumed by prompts/scripts, not a human UI |
| Orchestrator **prompts** (`prompts/orchestrator_system_prompt.md`, `…mvp2…`, `…planning…`, `kya_*`) | Interaction design *for the LLM user* | Well-structured but **fragmented** (4 variants) |
| **tmux** supervised panes (`session.attach_info` → `tmux attach -t <target>`) | Live agent observation/intervention | Power-user; best-effort guard rails |

**Design system (CLI):** `output.py` — a `rich` `Console`, two `Table` patterns (borderless key/value for `validate`; bordered header table for `audit`), a `render_decision` color map (`allow`→green, `deny`→red, `require_approval`→yellow, `allow_with_sanitization`→cyan) that **always prints the decision word**, a uniform `error: <msg>` on stderr, and `--json` everywhere for machine output. Tone: terse, technical, lowercase keys. Consistent and small — a real (if minimal) system.

**Platforms / input modes:** Linux/macOS/WSL terminal; keyboard-only (it's a CLI); English-only; output assumes a wide-ish terminal (Rich truncates to width). No mouse/touch/responsive concerns. Screen-reader use = whatever the user's terminal SR provides over linear text.

**Key flows (walked in Phase 2):** **A** — first dry-run orchestration (onboarding/activation); **B** — approve a pending action (the human-in-the-loop core loop); **C** — inspect what happened (audit/observability).

**Surprises:** the human CLI covers only 3 *peripheral* actions while the *core* orchestration loop is LLM-only; the `eventId` (least useful to a human) gets a dedicated audit column while `action`/`role`/`decision` get none and the all-important `traceId` is truncated.

---

## Interaction Flow Walkthroughs

### Flow A — First dry-run orchestration (onboarding/activation) — *mixed, high-friction*
| step | user action | expected feedback | what actually happens | friction | sev |
|---|---|---|---|---|---|
| A1 | `pip install`, `npm install`, `agent-run policy validate` | "you're set up" | ✅ clean table: status OK, counts (3/7/8) | none — **good** | — |
| A2 | `./scripts/ci.sh` | gate passes | runs; **fails mid-run if venv not active** (`agent-run` not found) | env-fragility, no bootstrap | Med |
| A3 | Configure MCP host to spawn `mcp_server.js` + inject a prompt | guided | manual host config; **which of 4 prompts?** unclear | no one-command start; prompt fragmentation | High |
| A4 | Run the core loop | a command to run | **none exists** — hand-call ~8 MCP tools, copying `traceId`/`taskId`/`sessionId` between each | no operator console; manual id-threading | High |
| A5 | Point at a repo | a sample to use | registry lists `cvision`/`sample-apps` that **don't ship** | no seed target | High |
| A6 | `agent-run audit show` | see what happened | sparse table, truncated traceId (see Flow C) | weak payoff | Med |

**Blocking steps:** A4 (no way to run the loop from the human side), A5 (nothing to point at).

### Flow B — Approve a pending action (the human-in-the-loop core) — *under-designed, the worst flow*
| step | user action | expected feedback | what actually happens | friction | sev |
|---|---|---|---|---|---|
| B1 | Learn an approval is pending | a queue/notification | **no `approvals list`**; you learn only if the LLM says so or you grep `audit show` for `APPROVAL_REQUIRED` | **discovery has no surface** | High |
| B2 | Find the `approvalId` | shown to me | it's an opaque `apr-…`; **not a column** in `audit show`; obtained only from `--json` or the LLM | recall-not-recognition | High |
| B3 | See *what* I'm approving | "GRANT git.push→main for codex?" | **nothing** — `approve <id> -d granted` shows no action/repo/agent/branch | **blind consent on a safety gate** | **High (blocking trust)** |
| B4 | Decide | confirm prompt | runs immediately; ✅ clear result/`error:` (observed: clean errors for bad id / bad decision) | no "are you sure" | Med |
| B5 | Undo a mis-grant | revoke | **impossible** — first decision wins silently; no CLI revoke | unrecoverable | Med |

**Blocking step:** B3 — approving by opaque id with no preview defeats the purpose of the gate. B1/B2 make the decision undiscoverable without side channels.

### Flow C — Inspect what happened (audit/observability) — *information-poor*
| step | user action | expected feedback | what actually happens | friction | sev |
|---|---|---|---|---|---|
| C1 | `agent-run audit show` | what/who/decision per event | only `ts / type / traceId / eventId`; **no action/agent/role/decision/session** | can't tell what happened | High |
| C2 | Read/copy a `traceId` to filter | full id | **truncated** `tr-v3-d03-7a19fef2-…`; uncopyable from the table | core "filter by trace" broken from human UI | High |
| C3 | Get detail | readable record | `--json` = one long unwrapped line per event | human-hostile detail mode | Med |
| C4 | See scope | "last 6 of N, range…" | no count/range header | no "where am I" | Low |

**Blocking step:** C2 — the truncated traceId severs the audit's own primary filter from the human view.

---

## UX Audit

### Heuristic compliance (Nielsen) & interaction design
- **UX1 — High — Visibility of system status: no "what's running / pending / waiting on me" surface.** **[OBSERVED]** The CLI exposes no orchestration/approval *state* view; `audit show` lists event types only. *Impact:* the operator of a human-in-the-loop system cannot see the queue of decisions the system needs from them. (Heuristic 1.)
- **UX2 — High — Error prevention on the approval gate: consent without information.** **[OBSERVED]** `approve <id> -d granted` authorizes by opaque id with no rendered description of the action/repo/agent/branch. *Impact:* the operator can approve the wrong thing (e.g., a protected-branch push) believing it's something benign — the exact failure the gate exists to prevent. (Heuristics 5, 9.)
- **UX3 — High — Recognition over recall: opaque ids must be carried by hand.** **[OBSERVED]** `approvalId`, `traceId`, `taskId`, `sessionId` are `*-…` opaque strings the operator must copy between commands/tools; none are discoverable from the human table (traceId is even truncated). *Impact:* high cognitive load and copy errors across the core loop. (Heuristic 6.)
- **UX4 — Medium — User control & freedom: no undo on approve.** **[INFERRED→OBSERVED]** `respond` is first-decision-wins (`approval_service.js:81`); a second `approve` returns the original status. *Impact:* a mis-grant cannot be revoked from the CLI; correct for *security*, but the UI offers neither an "are you sure" nor a recovery path. (Heuristics 3, 9.)
- **UX-strength — Match to the real world & consistency.** **[OBSERVED]** Decision words (`ALLOW/DENY/REQUIRE_APPROVAL`) + `ruleId` + plain-language `reason` ("push to protected branch main") read clearly; `error:`-prefixed stderr and `--json` are uniform across commands.

### Information architecture & content (the audit & decision output)
- **UX5 — High — The audit table shows the least-useful columns and hides the most-useful.** **[OBSERVED]** Columns are `ts/type/traceId/eventId`; `eventId` (an 8-char UUID prefix, near-useless to a human) gets a full column while `action`, `agent/role`, `decision`, and `sessionId` get none. *Impact:* the operator's primary observability surface can't answer "did sanitization fire? who pushed? which approval?" without `--json`. (Heuristic 1; recognition.)
- **UX6 — High — `traceId` truncation breaks the audit's own filter.** **[OBSERVED]** The table truncates `traceId` to ~18 chars; `--trace-id` needs the full value; the full value is only in `--json`. *Impact:* the headline "everything is correlated by traceId" is unusable from the human UI. (Heuristic 7 — flexibility/efficiency.)
- **UX7 — Medium — `--json` is a single unwrapped line.** **[OBSERVED]** Great for `jq`, hostile for a human eyeballing one event. *Impact:* the only detailed view is hard to read. (A `--json` pretty/`--detail` mode would close it.)
- **UX8 — Low — No result-scope header.** **[OBSERVED]** `audit show` gives no "showing last N of M / time range" cue. *Impact:* the operator can't tell if they're seeing the whole picture.

### Onboarding & flexibility/shortcuts
- **UX9 — High — No operator console for the core loop.** **[OBSERVED]** `agent-run` does `policy/audit/approve` only; create/assign/spawn/share/complete have no human command. *Impact:* the operator cannot start, drive, or inspect an orchestration from their own interface — the central interaction has no human front-end. (Cross-referenced in product/architecture audits; it is also a UX gap.)
- **UX10 — Medium — Onboarding has no one-command start and no sample target** (Flow A3/A5). *Impact:* a first-time operator cannot reach the aha unaided. (Heuristic 10 — help & onboarding.)

### The LLM-facing interface (prompts as interaction design)
- **UX11 — Medium — Four competing "orchestrator" prompts with no canonical pointer.** **[OBSERVED]** `orchestrator_system_prompt.md`, `…mvp2_two_agent.md`, `…planning_loop.md`, `kya_*` — each a different "UI" with different agents/models. *Impact:* the operator/LLM can't tell which interaction model is current. (Consistency.)
- **UX-strength — The prompts are well-structured interaction specs.** **[OBSERVED]** Clear "Tools / Standard flow / Hard limits / Approval semantics / When in doubt" sections; non-blocking approval semantics are explained. Good "UI copy" for the LLM user — preserve this structure, consolidate the variants.

### tmux supervision
- **UX12 — Medium — Live tmux intervention is a trap-prone power affordance.** **[OBSERVED/INFERRED]** `session.attach_info` yields `tmux attach -t <target>`; typing into a live agent pane can corrupt its input, and intervention detection is best-effort (with a units bug, `intervention_detector.js:4`). *Impact:* an operator "just looking" can accidentally derail an agent; there's no read-only attach guidance or guard. (Heuristic 5 — error prevention.)

### Accessibility (terminal)
- **UX-strength — No color-alone signaling.** **[OBSERVED]** Decisions print the word + color; corrupt audit rows print `CORRUPT` text + red. Satisfies the spirit of WCAG 1.4.1 in a terminal.
- **UX13 — Low — 4-decision color palette leans on hue (yellow vs cyan).** **[INFERRED]** `require_approval`(yellow) vs `allow_with_sanitization`(cyan) are close for some color-vision types; mitigated because the text label always carries the meaning. *Impact:* minor; keep the text labels as the source of truth.
- **Note — WCAG 2.2 AA contrast/target-size/focus criteria don't map to a CLI;** terminal contrast depends on the user's theme (out of the product's control). No keyboard traps (it's a CLI).

### Strengths to preserve
1. `policy check` output — decision word + `ruleId` + human reason + a full `--json` **layer trace** — is genuinely excellent for understanding *why* (observed).
2. Clean, consistent CLI design system (`output.py`): uniform `error:`/stderr, `--json` everywhere, sane exit codes (2/1/0, observed).
3. Typer `--help` discoverability with required-flag markers and recovery hints.
4. `policy validate` table is a clear, friendly success state.
5. Empty state exists (`(no events)`) and corrupt-line handling is graceful.

---

## UX Strategy

**Themes:**
1. **"The primitives are designed; the defining interactions aren't."** Allow/deny/validate/error states are clean (UX-strengths), but approve (UX2/3/4) and observe (UX1/5/6) — the two things the operator actually does — are unbuilt. *Target:* the human-in-the-loop and observability flows get the same care as the primitives. *Principle: design the interaction the product is **for**, not just the states that were easy.*
2. **"Consent without information."** The approval gate authorizes by opaque id with no preview/undo. *Target:* every approval shows what it authorizes and asks for confirmation before granting. *Principle: a safety gate must present the decision, not just collect a keystroke.*
3. **"The operator is blind to system state."** No pending-queue, no status, sparse audit, truncated correlation key. *Target:* the operator can answer "what's running / waiting on me / what happened" from one surface. *Principle: make system status visible — especially the work the system needs **from** the human.*
4. **"No human front-end for the core loop."** The CLI covers the periphery; the LLM owns the center. *Target:* a read-only operator console (then, optionally, drive-from-CLI). *Principle: the human needs a window into the loop even when an LLM drives it.*

**Trade-offs — what NOT to do:**
- **Don't build a GUI/TUI dashboard.** The terminal CLI fits the developer persona; richer *commands* (status, approvals list, wider audit) deliver the value without a new platform.
- **Don't add interactive prompts to the *machine* path.** Keep `--json`/`--yes` non-interactive for scripting/CI; add confirmation/preview to the *human* path only.
- **Don't redesign the prompt copy.** It's good; just consolidate to one canonical + thin variants (UX11).
- **Don't chase terminal-contrast "WCAG AA."** It's the user's theme; keep relying on text labels, not color.

**"Done" signals (measurable):**
- A first-time operator approves the *correct* pending action **unaided**, seeing what it authorizes, in a usability test (Flow B success).
- The operator answers "what's running / waiting on me / what just happened?" using only `agent-run` (no `--json`, no LLM) — task success in a test.
- Full `traceId` is readable/copyable from `audit show`; `audit show` surfaces `action`/`role`/`decision`.
- Zero "approved the wrong thing" events in a moderated test of Flow B.

---

## Design Plan

### Quick wins (high impact, S effort)
| # | Item | Surface | Effort |
|---|---|---|---|
| QW1 | `audit show`: add `action`/`role`/`decision` columns; stop truncating `traceId` (or add `--wide`/`--full-id`) | `output.py render_audit_table` | S |
| QW2 | `audit show`: add a scope header ("last N of M, <from>→<to>") | `output.py` | S |
| QW3 | `--json` pretty option (`--json --detail` or default indent) for single-event reading | `output.py emit` | S |
| QW4 | Add `agent-run approvals list` (pending `apr-…` with action/repo/agent/branch) | new CLI command | S–M |
| QW5 | Designate one canonical orchestrator prompt; mark the others "variant of" (UX11) | `prompts/` | S |

### Milestone 0 — Baseline & instrument
| Item | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|
| M0.1 Heuristic + task baseline | Record current Flow A/B/C task success + screenshots of each CLI state | M | none | — |
| M0.2 Define operator personas/context | Written persona (expertise, when/why they approve) to anchor Flow B design | S | none | — |

### Milestone 1 — Fix blocking usability
| Item | Interaction outcome (acceptance) | Effort | Risk | Deps |
|---|---|---|---|---|
| M1.1 Informed approval flow | `approve` (human mode) **shows what it authorizes** (action, repo, agent, branch, requestedBy) and asks confirm before granting; `--yes`/`--json` keep machine mode non-interactive; mis-id'd approvals are caught pre-grant | L | med (don't break scripted approve) | QW4, M0.2 |
| M1.2 Discoverable pending queue | `agent-run approvals list` shows every pending decision with its id + what it authorizes; the operator finds work without the LLM | M | low | QW4 |
| M1.3 Readable audit | `audit show` shows action/role/decision + full/copyable traceId; `--trace-id` is usable from what the human sees | M | low | QW1 |

### Milestone 2 — High-leverage interaction
| Item | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|
| M2.1 Read-only operator console | `agent-run status [--trace-id]` shows tasks, sessions (running/closed), pending approvals, last verdict — the loop at a glance | L | low | M1.3 |
| M2.2 One-command onboarding + sample | `agent-run`-driven (or scripted) hero loop against a **shipped** sample repo; first aha unaided | L | med | Flow A fixes (product audit) |
| M2.3 Safer tmux supervision | `session.attach_info` documents read-only viewing vs. intervention; an `intervention_note` reminder after attach | M | low | — |

### Milestone 3 — Polish & delight
| Item | Effort |
|---|---|
| M3.1 Color/label review for the 4 decisions; ensure labels always lead (UX13) | S |
| M3.2 Consolidate orchestrator prompts to one canonical + variants (UX11) | M |
| M3.3 Friendlier empty/zero states ("no pending approvals ✓", "no events yet — run an orchestration") | S |

### Design sketches — top 3

**M1.1 — Informed approval (Flow B fix).**
*Before→after:* today `approve apr-… -d granted` → silent grant. After: `agent-run approve apr-…` (no `-d`) prints a card —
```
Approval apr-7a19  requested by codex (coder)
  action:  git.push.protected   repo: cvision   branch: main
Grant this? [g]rant / [d]eny / [c]ancel:
```
— and only then records the decision; `-d granted --yes` (or `--json`) preserves today's non-interactive path for scripts/CI. *Gotchas:* the approval row already stores `action`/`payload` (`approvals` table) — render those; never make CI interactive; keep the security idempotency (first-wins) but warn if already decided. *Validate:* moderated Flow B test — users approve the *right* action and reject a planted protected-push; zero mis-grants.

**M1.3 + QW1 — Readable audit.**
*Before→after:* add columns so a `SANITIZATION_APPLIED` / `APPROVAL_REQUIRED` / `SESSION_CLOSED` row shows *who/what/decision*; render the full `traceId` (or a `--full-id` that prints copyable ids), and add `--wide`. *Gotchas:* Rich truncates to width — prioritize `traceId` and `action` over `eventId` when space is tight; keep the table readable at 80 cols by dropping `eventId` first. *Validate:* task test — "find the trace where sanitization fired and re-filter by it" completed using only `audit show`.

**M2.1 — Read-only operator console.**
*Before→after:* `agent-run status --trace-id tr-…` → a compact panel: orchestration goal/status, tasks (agent·role·status), sessions (running/closed + tmux target), **pending approvals**, last review verdict. *Gotchas:* read-only (no policy bypass); reuse the state repos; degrade gracefully when a trace is partial. *Validate:* task test — "what is this orchestration waiting on?" answered in one command, no `--json`.

---

## Open Questions

1. **Accessibility duty:** is there any obligation beyond "reasonable terminal output" (e.g., a screen-reader-using operator)? If not, terminal a11y stays low-priority (text labels already lead).
2. **Primary persona & context for approvals (Flow B):** who approves, how urgently, and from where (same terminal, or notified async)? Determines whether M1.2 needs notifications, not just a list.
3. **Should the human ever drive the core loop from the CLI,** or is "LLM drives, human supervises + approves" the intended division? Decides whether M2.1 stays read-only or grows write verbs.
4. **Canonical interaction model:** which of the four orchestrator prompts is *the* product UI (two-agent review vs. plan-driven/KYA)? Drives UX11 and onboarding (M2.2).
5. **Locale:** English-only acceptable (owner/devs), or is a Spanish operator surface wanted given the Spanish master plan?
6. **Terminal target:** is a minimum width / non-Rich fallback (dumb terminals, CI logs) in scope for `audit show`/tables?
