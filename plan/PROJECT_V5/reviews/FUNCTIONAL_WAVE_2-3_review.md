# Independent Review — Project V5 Functional Wave 2 promotion candidate (Trial 3)

## Verdict

**reviewed_KO**

| Severity | Count | Finding |
|---|---:|---|
| P0 | 0 | None. |
| P1 | 1 | The promotion candidate's live status registries contradict its own per-sheet status, commit graph, and independently reviewed D/0/07 plan Trial 6 evidence. |
| P2 | 3 | Review-index coverage gap; stale handoff accounting; mis-anchored commit-distance claim in the Trial 3 request. |

The candidate is mechanically sound, honestly gated, secret-free, and
promotion-eligible by ancestry. Promotion is nevertheless blocked by one
canonical-status defect: the tree that `main` would permanently resolve to
declares, in its four top-level plan registries and in the sheet registry it
itself names authoritative, a sheet accounting (`36 complete / 4 in progress /
42 planned`) and stage narratives that its own reviewed evidence proves false.
Under the canonical status rule ("label BUILT versus PLANNED explicitly"),
the Wave 2 Trial 1 precedent (one status contradiction → KO, do not promote),
and Rule 13's index obligation, a promotion candidate must not enthrone a
false authoritative index on `main`. The correction is bounded and
documentation-only.

This verdict is a review result only. It performs and authorizes no
integration, promotion, release, tag, publication, deployment, or support
claim, and it does not un-review any previously reviewed increment.

## Reviewer identity and independence

- Agent/model: `claude-code`, `claude-fable-5`, reasoningEffort `max`.
- Fresh session; this reviewer did not implement, merge, or gate the
  candidate; no subagents were used; no coder-owned conclusion was accepted
  as independent evidence.
- Orchestration trace `tr-wave2-main-candidate-ec89e7e0-6d0f-49c3-9117-7b8977d8cec1`,
  task `ts-d24a1a18-b795-4d65-9257-f130b589ae6c`. Canonical Gateway task
  assignment succeeded; `agent.spawn` returned `TOOL_ERROR` because the
  running Gateway is rooted to another repository, so this review ran through
  the documented supervised direct tmux fallback. This is a process deviation
  disclosure, not a claim of profile compliance.
- Work confined to
  `workspace/clones/wt-wave2-promotion-review-t3` on branch
  `review/V5-functional-wave-2-promotion-3`.

## Authenticated identity

All identities were verified directly against the object database:

| Object | Value | Verified |
|---|---|---|
| Review branch | `review/V5-functional-wave-2-promotion-3` | yes |
| Review-request HEAD | `6f3f0e19917f21454fb7c59b9bd2e1ba7c32babc` | yes; direct child of the candidate; its whole delta over the candidate is `A plan/PROJECT_V5/reviews/FUNCTIONAL_WAVE_2-3_to_review.md` + one pending index row |
| Candidate commit | `cc9c97521034a5a9abfff7e07eb2a53b8fa33e7b` | yes |
| Candidate tree | `944a827ce12ef6e054e5b7ae541761157b784834` | yes |
| Parent 1 (`main`) | `608a5be06e7a58e51d51b912ee3ecbe5d97f42e1` | yes, in order |
| Parent 2 (Wave 2) | `9f075e181ef257b4b5b4b4cac3c0870af97110ec` | yes, in order |
| Candidate branch ref | `integration/V5-wave2-main-candidate` → `cc9c975` | yes |
| Worktree | clean before and during review | yes |

Merge mechanics authenticate exactly:

- merge base of the two parents is `7039a0bf9e08cd1f0e380844791409e75f4fdbdb`;
- `git merge-tree --write-tree 608a5be 9f075e1` independently recomputes tree
  `944a827ce12ef6e054e5b7ae541761157b784834` — the merge is a pure,
  conflict-free textual merge of its two parents with zero manual edits;
- the two parent ranges changed fully disjoint path sets: 11 `main`-side
  files (`AGENTS.md`, `.claude/orchestration-profile.md`, the `.claude`/
  `.codex` `ao-*` and reviewer skills) versus 415 Wave-side files; the
  intersection is empty;
- the three `main`-only commits (`538dbc2`, `b870d1c`, `608a5be`) are
  documentation/skills only and touch no product, test, gate, or policy path;
- `main@608a5be` is parent 1 and an ancestor of the candidate; `develop@b870d1c`
  is an ancestor of `main`, exactly 2 commits behind it, with a byte-identical
  tree (`9914308b...`); therefore both branches reach the candidate by
  ordinary non-force fast-forward;
- the candidate is 390 commits ahead of `main` (389 Wave commits plus the
  merge itself); no release tag or remote publication exists;
- `git diff --check 7039a0b..cc9c975` is clean;
- Trial 2's accepted candidate `d23c78b` is an ancestor of both `main` and
  the Wave 2 parent — the Trial 2 promotion actually happened and the prior
  trial artifacts (`FUNCTIONAL_WAVE_2-1_*`, `-2_*`) are immutable in place.

## Post-Trial-2 scope actually reviewed

Trial 2 accepted `d23c78b`. The current Wave 2 parent is **413 commits**
(102 first-parent, 26 merges) beyond it — not 17; see P2-c. Every integrated
increment in that range carries a numbered request and an independent verdict,
with all KO trials preserved, verified against the commit graph and the 163
lane-evidence files under `plan/reviews/PROJECT_V5/` in the candidate tree:

| Increment | Independent result | Integration merge (ancestor of candidate) |
|---|---|---|
| C/0/02 candidate contract | Trial 4 OK `9766979` | `2111f89`, promoted via `744e1ac` |
| G/0/00 required Redis race lane | Trial 1 OK `5058a59` | `77cb418`, promoted via `7039a0b` |
| Audit coverage reconciliation | Trial 2 OK `4b74ef4` | `6e17d0e` |
| G/0/01 Redis lifecycle | Trial 3 OK `3cef36c` (Trials 1–2 KO preserved) | `54ae76a` |
| D/0/00 request context | Trial 4 OK `7244852` (Trials 1–3 KO preserved) | `b711b92` |
| H/0/00 provider selection | Trial 5 OK `89c3899` (Trials 1–4 KO preserved) | `d732441` |
| D/0/01 CORE | Trial 4 OK `8198698` (Trials 1–3 KO preserved) | `a7c09b0` |
| H/0/01 SAMPLE | Trial 5 OK `c4aec92` (Trials 1–4 KO preserved) | `744291f` |
| G/0/02 CORE | Trial 4 OK `2415578` (Trials 1–3 KO preserved) | `7cc2682` |
| G/0/02 STORE | Trial 4 OK `2a49bd4` (Trials 1–3 KO preserved) | `cf8c8ed` |
| C/1/00 rebaseline CORE | Trial 2 OK `4faec5e` (Trial 1 KO and Trials 1–15 chain preserved) | content integrated by `37bc85c`-era commits; lane merge `4236b76` introduces zero file changes (evidence-only) |
| G/0/02 durable ACK OUTBOX | Trial 3 OK `be6fe6d` (Trials 1–2 KO preserved) | `cc1c10e` |
| G/0/02 WIRING-A (+3 design trials, human gate) | Trial 6 OK `e90fb8a` (Trials 1–5 KO/partial preserved) | `b52b661` |
| G/0/02 ACK reconciliation | Trial 5 OK `b80a76b` (Trials 1–4 KO preserved; operator-ratified ephemeral-Redis harness) | `ef38763` |
| H/0/01 DOCTOR | Trial 13 OK `f967c4e` (Trials 1–12 KO preserved; operator-ratified Option B; residual registered as `V5-H-0-01-D01` in `DEFERRED.md`) | `616a4de` |
| D/0/07a issuer/codec | Trial 3 OK `f100ceb` (Trials 1–2 KO preserved) | `aaf4817` |
| D/0/07b PTY identity | Trial 2 OK `e6c832b` (Trial 1 KO preserved) | `d65e9f4` |
| Wave 2 lifecycle fix / structure-leak fix | independent OKs | `85e6156`, `f1e372a` |
| D/0/07 plan Trials 4–6 | OKs (`90a5385`, `03b2994`-blob at `f2a05ba`, `0e25400`) | plan-only; Trial 6 tip merge `9f075e1` |
| D/0/01 SPLICE | Trial 1 `blocked_confirmed`, operator ratified Option 1 | evidence only; no splice code integrated |

For each OK above, the verdict commit was verified to be a parent-side
ancestor of its integration merge, and each verdict file in the candidate
tree opens with an explicit independent `reviewed_OK` (or preserved KO). No
accepted verdict was found to be coder-owned.

## Exact gate result and skip budget adjudication

The request records the full host gate on the candidate:

```text
bash scripts/ci.sh   (host, tree .venv on PATH)
aggregate: infrastructure_unavailable, exit 1
tests 2294 / passed 2282 / failed 0 / skipped 12
```

Verification performed without re-running the full gate (other lanes are
active; the request forbids a concurrent full gate):

- The orchestrator-owned, committed attribution record
  (`plan/reviews/PROJECT_V5/FUNCTIONAL_WAVE_2_ci_attribution.md`) documents an
  honest fail-loud trail: a red gate at `13fada7`
  (1792/10/12) was attributed to exact causes, closed by three independently
  reviewed fixes (OUTBOX merge, lifecycle-expectation fix `85e6156`,
  structure-leak fix `f1e372a` — with the leak detector proven not weakened),
  re-run to `2237/2225/0/12`, and re-run again after WIRING-A plus the
  mechanical ADR-007 `inventorySha256` refresh (`f629dfb`) to exactly
  **2294/2282/0/12** — the same totals the Trial 3 request reports.
- **Tree-equivalence bridge:** between the recorded-gate tree (`42d17e5`) and
  the candidate `cc9c975`, every changed path is under `plan/` or the
  `main`-side `.claude/`/`.codex/`/`AGENTS.md` docs. Code, tests, and gate
  inputs are byte-identical, so the recorded result applies to the exact
  candidate tree.
- Suite split re-checked for internal consistency: structure 410/410;
  Gateway 1418 passed of 1427 with 9 PostgreSQL infrastructure skips;
  E2E 25/25; CLI 342/342; LangGraph 81/84 with 2 Gateway-integration and 1
  Temporal skips; lint/lock/release-candidate/smoke/policy lanes passed.
  9 + 3 = 12 skips; totals sum correctly.
- The referenced Gateway artifact `art-2ba860f3-716b-433b-8cb4-e5de6ef53980`
  is `NOT_FOUND` from this session's Gateway, consistent with the disclosed
  Gateway-root mismatch; the in-tree attribution record and the bridge above
  carry the verification instead.

**Adjudication of the 12 unavailable infrastructure tests/services:** the
skip budget is acceptable for this promotion step, and only for it.

- It is explicit and enumerated: 9 opt-in PostgreSQL cases
  (`AGENTS_PG_INTEGRATION` + docker), 2 LangGraph Gateway-integration cases,
  1 Temporal recovery case; plus two zero-test lanes reported
  `infrastructure_unavailable` (`test.redis-live` — a required lane for
  release confidence — and optional `test.real-agents`).
- Its composition is identical to Trials 1 and 2 (the same 12) while the test
  count grew 1087 → 2294 with zero failures — growth added no new skips.
- It is honestly labeled: aggregate `infrastructure_unavailable`, exit 1
  preserved and disclosed; the request does not relabel it, and neither does
  this verdict. **These 12 skips and the unavailable lanes are not passes and
  are not credited as live evidence here.**
- Precedent: C/0/02 and G/0/00 were promoted to `main@7039a0b` under the same
  offline regime; promotion moves branch pointers over reviewed work and makes
  no support/release claim.
- Boundary: any release, support, or publication claim (I/0/04 territory)
  must actually run the required `test.redis-live` lane and either run or
  explicitly re-justify the PostgreSQL/Temporal/provider lanes for that exact
  release object, per the canonical status rule. Promotion records must keep
  the exit-1 aggregate visible.

## P1 (blocking) — the candidate's live registries contradict its own reviewed status evidence

### Adjudication of the disclosed 36/4/42 versus 38/5/39 conflict

The two accounts were not averaged. An independent census was derived from
the authoritative per-sheet Status headers in the candidate tree, the commit
graph, and the independently reviewed D/0/07 plan Trial 6 adjudication
(`D_0_7-plan-6_reviewed_OK.md`, recorded at `0e25400`, tip merge `9f075e1`):

- complete (38): the 25 delivered A sheets; B/0/00, B/0/01, B/0/02, B/0/05;
  C/0/00, C/0/01, C/0/02; D/0/00; **D/0/07a** (Trial 3 OK `f100ceb`,
  integrated `aaf4817`); **D/0/07b** (Trial 2 OK `e6c832b`, integrated
  `d65e9f4`); G/0/00; G/0/01; H/0/00.
- in progress (5): C/1/00; D/0/01; **D/0/07c** (design dual-reviewed
  `e230faf`/`83252f6`, all five amendments operator-ratified at `ac92d51`,
  Trial 3 implemented at `d7873eb` and under independent review at
  `c38762a`, not reviewed or integrated); G/0/02; H/0/01.
- planned (39): B/0/03–04; C/0/03; C/1/01–03; D/0/02–06; D/0/07d;
  E/0/00–05; F/0/00–04; G/0/03–04; H/0/02–05; I/0/00–09.

38 + 5 + 39 = 82; open = 5 + 39 = 44. The sheet headers in the candidate say
exactly this (`D/0/07a.md` and `D/0/07b.md`: `complete`; `D/0/07c.md`:
`in_progress`; `D/0/07d.md`: `planned`; the `D/0/07.md` index header matches).

**Verdict on the conflict: `38 complete / 5 in progress / 39 planned` is the
evidence-supported account.** `36/4/42` was true when plan Trial 4 approved it
and became false inside this candidate when `aaf4817` (07a), `d65e9f4` (07b),
and the 07c start landed. The delta is exactly the disclosed one.

### Why it blocks promotion

The stale account is not confined to a dated snapshot; it is asserted in the
candidate's live, load-bearing registries:

1. `plan/README.md:26` — counter `36 + 4 + 42`, "`4 + 42 = 46` open".
2. `plan/PROJECT_V5/README.md:93` — same counter; this same file declares
   "The linked sheet registry is the authoritative index for status".
3. `plan/PROJECT_V5/EPICS.md:185` — same counter; narrative still calls
   07a–d "four separately reviewed **planned** leaves", still requires the
   splice to wait until "the four leaves are implemented and independently
   reviewed" without recording that two already are, still states DOCTOR
   "Trial 10 is sealed … Trial 11 must remove that remaining P2 route"
   (Trials 11–13 exist; Trial 13 is OK and integrated; the residual is
   operator-ratified into `DEFERRED.md`), and still describes ACK
   reconciliation as waiting on Trial 4 (Trial 5 is OK and integrated).
4. `plan/PROJECT_V5/SHEETS.md:31` — same counter; **the declared
   authoritative index's Stage D row says "`07a–d` and remainder planned"**,
   directly contradicting the sheet headers, the D/README.md rows, and the
   independently reviewed Trial 6 adjudication in the same tree.
5. `plan/PROJECT_V5/D/0/07.md:69` — same counter inside the otherwise-current
   index sheet.
6. `plan/PROJECT_V5/D/README.md:35` — still claims 07c is "**blocked on
   operator ratification of five contract amendments**; no integrated
   candidate": the ratification happened at `ac92d51`; Trial 3 is implemented
   and under review. (This exact residual was disclosed, but not fixed, by
   the Trial 6 verdict.)
7. `plan/PROJECT_V5/H/README.md:8–19,38` — still records DOCTOR at
   "Trials 1–10 KO … Trial 11 owns the remaining route", contradicting
   `SHEETS.md`'s own H row, the in-tree Trial 13 OK, merge `616a4de`, and
   `DEFERRED.md`.
8. `plan/PROJECT_V5/reviews/README.md` (trailing note) — affirmatively states
   `G_0_2_ACK-4` is "with its independent review in progress" while the
   candidate contains ACK Trial 5 reviewed OK (`b80a76b`) and integrated
   (`ef38763`).

Direction matters and was checked both ways: **no overclaim was found
anywhere** — every updated status row claims exactly what the commit graph
proves, and every defect above understates progress. This is why the finding
is P1 rather than Trial 1's P0 (which credited an unearned later state). It
still blocks promotion, for reasons the project's own rules make
non-negotiable:

- The canonical status rule requires labeling BUILT versus PLANNED
  explicitly. D/0/07a and D/0/07b are BUILT (reviewed, integrated,
  security-critical execution-authority leaves) and the authoritative
  registry labels them PLANNED. After promotion, an operator or planner
  consulting `SHEETS.md`/`EPICS.md` on `main` would mis-assess what authority
  surface `main` already contains and could schedule duplicate implementation
  of already-integrated session-port code — the exact failure mode the
  absorption/one-owner machinery exists to prevent.
- Wave 2 Trial 1 established the precedent that one canonical-state
  contradiction in the registries blocks promotion of an otherwise-green
  candidate ("Do not promote this candidate"), and Trial 2 accepted only
  after the registry was corrected in a reviewed increment. The same standard
  applies symmetrically.
- Rule 13 requires the project review index to index every verdict; the
  index's own liveness note is affirmatively false (item 8).
- Promotion cannot be repaired after the fact by editing `main` — the
  correction must exist in the promoted object, and adding it to `cc9c975`
  would change the object. Hence KO now, cheap Trial 4 next.

### Minimum bounded correction (documentation-only)

One reviewed, append-only documentation increment on the Wave 2 branch; no
product, test, gate, or policy path may change:

1. Replace the counter in exactly the five live locations
   (`plan/README.md:26`, `plan/PROJECT_V5/README.md:93`,
   `plan/PROJECT_V5/EPICS.md:185`, `plan/PROJECT_V5/SHEETS.md:31`,
   `plan/PROJECT_V5/D/0/07.md:69`) with the re-derived
   `38 complete + 5 in progress + 39 planned = 82`, `5 + 39 = 44` open
   (re-derive at commit time; do not copy this verdict blindly).
2. Rewrite the `SHEETS.md` Stage D row to the per-leaf truth: 07a/07b
   reviewed-OK and integrated, 07c in progress (design ratified; Trial 3
   under independent review), 07d planned and blocked on reviewed 07c.
3. Update the `EPICS.md` D/0/07, DOCTOR, and ACK/OUTBOX/WIRING narratives to
   the current ratified states (including the `DEFERRED.md` residual
   `V5-H-0-01-D01` and WIRING-A integrated / WIRING-B open); while editing
   the G material, re-derive the `SHEETS.md` G-row sub-slice claims (e.g.
   "migration 003 … still open") against the OUTBOX/WIRING-A verdicts.
4. Update the same three narrative zones in `plan/PROJECT_V5/README.md`.
5. Fix `D/README.md:35` (drop the false ratification-block clause) and the
   `H/README.md` DOCTOR prose and row 38.
6. In `plan/PROJECT_V5/reviews/README.md`: correct the false ACK-4 note and
   add append-only index rows for the integrated-but-unindexed series
   (D_0_0 2–4, D_0_1_CORE 1–4, H_0_0 1–5, G_0_1 1–3, C_1_0 3–15 with the
   human decision, H_0_1_DOCTOR 1–6 and 11–13, G_0_2_OUTBOX 1–3,
   G_0_2_WIRING_A 1–6 plus DESIGN 1–3 and human gate, G_0_2_ACK 4–5,
   D_0_7A 1–3, D_0_7B 1–2, the two Wave 2 fixes, and the D_0_1_SPLICE-1
   `blocked_confirmed` with its ratification), or an equivalently explicit
   reviewed pointer that names each series' exact location and current state.
7. Then build a fresh no-ff promotion candidate from the then-current `main`
   and the corrected Wave 2 tip, and submit Trial 4 with its own identity and
   gate statement. The delta over `cc9c975` being documentation-only, the
   profile's docs-only gate rule (doc/structure checks + `git diff --check`,
   with the recorded full-gate bridge restated for the unchanged code tree)
   applies at the orchestrator's discretion.

## P2 findings (non-blocking, fold into the same correction)

- **P2-a — review-index coverage.** Beyond the false ACK-4 note (part of P1),
  `reviews/README.md` indexes no verdict for most post-handoff integrated
  series (list in correction item 6) even though all verdict files exist in
  the candidate at `plan/reviews/PROJECT_V5/`. Rule 13 expects the index to
  cover them once integrated.
- **P2-b — stale handoff accounting.** `plan/PROJECT_V5/HANDOFF_YOLO.md:315`
  still says "79 V5 sheets: 36 complete, 4 in progress" — pre-split total and
  pre-07a/b counts — while `PROJECT_V5/README.md` links it as current Wave 2
  state. Refresh the line or mark the document as a dated, superseded
  snapshot.
- **P2-c — mis-anchored distance claim in the Trial 3 request.** The request
  states the Wave 2 parent "is 17 commits later" than Trial 2's `d23c78b`.
  Measured: `d23c78b..9f075e1` is 413 commits (102 first-parent, 26 merges);
  17 is exactly `f629dfb..9f075e1` — the distance from the recorded-gate
  tree, a different anchor. The request file lives on the review branch, not
  in the candidate, and the error did not narrow this review (the full range
  was reviewed), so it is recorded for accuracy only. Trial 4's request must
  state the true post-Trial-3 distance.

## Verified non-blocking evidence

- **No secret introduction.** `policies/`, `.mcp.json`, and `docker/` are
  byte-untouched across the whole candidate delta (`7039a0b..cc9c975`). A
  high-confidence pattern scan over the full 413-commit post-Trial-2 diff
  (private keys, AWS/GitHub/OpenAI/Slack signatures, credential-bearing Redis
  URLs, JWT headers) found 3 hits, all the same class, all deliberate
  synthetic secret-canary fixtures of the H/0/01 doctor credential detector
  (`tests/cli/test_doctor.py:2639–2640` parametrized IDs named
  `…-secret-canary…`, and the matching denylist description in
  `plan/reviews/PROJECT_V5/H_0_1_DOCTOR-2_to_review.md:24`). No live
  credential; values are kept redacted in this verdict.
- **No shared-service or policy mutation, no branch movement, no tag, no
  push, no remote publication** exists in or is claimed by the candidate.
- **Canonical distinctions hold everywhere else.** Every promoted claim in
  the tree names the promoted lineage exactly (`C/0/02`, `G/0/00` through
  `main@7039a0b`); Wave 2 material consistently says integration only, with
  "promotion remains pending" / "none of these increments claims promotion
  yet". Review ≠ integration ≠ promotion ≠ release ≠ tag ≠ publication ≠
  support is respected in all claims checked except the understatements in
  P1.
- **Identity chain (request item 8).** Promoting the exact object `cc9c975`
  without adding review bytes is the correct mechanism: this request and
  verdict live on the review branch; the candidate object is immutable; the
  evidence chain (lane files in-tree, verdict commits in ancestry) survives
  promotion intact. The mechanism is endorsed; this KO blocks only this
  object's content, and Trial 4's fresh candidate should use the same
  mechanism.

## Probes and boundaries

Read-only probes: `git rev-parse`/`cat-file`/`log`/`rev-list`
(counts/ancestry)/`merge-base --is-ancestor`/`diff --name-only`/
`diff --check`/`ls-tree`/`grep` over the candidate ancestry;
`git merge-tree --write-tree` to recompute the merge (no ref created or
moved); one Gateway `artifact.get` read attempt (`NOT_FOUND`, disclosed). No
full gate was launched (other lanes active); no network, provider launch,
policy edit, branch movement, tag, push, merge, shared-service mutation, or
destructive cleanup was performed. Scratch listing files were confined to the
session scratchpad and removed. The only repository writes are this verdict
file and the one Trial 3 index cell, committed on the review branch with
explicit pathspecs.
