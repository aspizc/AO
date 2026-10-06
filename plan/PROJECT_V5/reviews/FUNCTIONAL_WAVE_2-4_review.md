# Project V5 functional Wave 2 — promotion review verdict, Trial 4

## Verdict

**reviewed_OK**

Fresh independent continuation review (prior reviewer stopped at the 20,000
token limit; checkpoint `art-d06553e6-b22d-4fb8-a860-b7c761d9e1f3` treated as
an untrusted lead only). Reviewer: `claude-code` / `claude-fable-5` / `max`,
trace `tr-tr-wave2-t4-cont-3f83c527-ae5e-43c0-bb83-a72dd72fb33d`, task
`ts-e0df68a2-c6fb-43a2-9b03-2d815d703611`, worktree
`wt-wave2-promotion-review-t4`. This reviewer did not form, gate, or implement
the candidate and repaired nothing.

Findings: **P0 = 0, P1 = 0, P2 = 1** (documentation-only; does not gate local
promotion).

## Candidate identity (authenticated)

- Candidate `2986b09f02d2119a8d89b25e9696d9325b27b339`, tree
  `c4661b2c4c9e557abe17d321e482987f5b3ace32`, parent
  `c22920ff5f87c7365b94d6bcb66f8c54ba6f02b6` — all confirmed by
  `git rev-parse` / `git log --format='%H %T %P'`.
- Formation chain confirmed hop-by-hop: `9f075e1 -> 7ac2e25` (single parent);
  `0795f25` = merge(`main@608a5be`, `7ac2e25`); `0795f25 -> f6aa6b5 ->
  c22920f -> 2986b09` linear.
- Independent `git merge-tree --write-tree 608a5be 7ac2e25` recomputed exactly
  `e3bf408f154f0d93d07fc7e68620fa59a8c13784` = tree of `0795f25`; the two
  parent-side path sets after merge base `7039a0b` have **zero** intersection
  (`comm -12` = 0).
- `f6aa6b5` adds only the Trial 3 request (+1 README line); `c22920f` adds
  only the Trial 3 KO verdict (+1 README cell). `9f075e1 -> 7ac2e25` is 12
  files, 190/191, zero non-Markdown. `c22920f -> 2986b09` is exactly the five
  plan documents (`D/0/07c.md`, `D/README.md`, `EPICS.md`, `README.md`,
  `SHEETS.md`), 32 insertions / 23 deletions.
- Worktree clean (`git status --porcelain` empty, `git diff --check` clean);
  review branch `review/V5-functional-wave-2-promotion-4` at `dcf215f`
  differs from the candidate only by the Trial 4 request and one README row.

## Gate and skip adjudication

Audited the completed reproduced gate (log `reviewer-gate.log`, wrapper
`b93aq3640.output`); the full gate was not rerun.

- Wrapper tail prints candidate hash `2986b09...` and `GATE_EXIT=1`.
- Final JSON arithmetic exact: aggregate **2294 tests / 2282 passed /
  0 failed / 12 skipped** (2282 + 12 = 2294); `test.gateway` 1427/1418 with 9
  PostgreSQL skips; `test.langgraph` 84/81 with exactly the three named
  unavailable cases (2 × `gateway-integration`, 1 × `temporal`); structure
  410/410; E2E 25/25; CLI 342/342; lint/lock/release-candidate/MCP/policy
  registry passed; `test.redis-live` required with 0 tests and
  `test.real-agents` optional-service, both `infrastructure_unavailable`
  (5 such statuses total, none relabeled as passing; aggregate
  `infrastructure_unavailable`, exit 1 preserved).
- Candidate-bound `python3 scripts/ci_gate.py --validate-only` at this tree:
  `{"status": "passed", ...}`, exit 0. HEAD/tree/cleanliness rechecked after.
- **Skip budget adjudication:** the 12 skips (9 PostgreSQL +
  2 gateway-integration + 1 Temporal) plus the empty required Redis-live lane
  and optional real-agent lane are byte-identical in shape to the budget the
  immutable Trial 3 verdict explicitly summed and accepted
  ("9 + 3 = 12 skips; totals sum correctly"). Accepted here **for local
  promotion only**: they remain `infrastructure_unavailable`, are not
  converted to pass, and this acceptance does not extend to release, support,
  publication, or the future real protected pilot gate.
- The earlier wrong-toolchain gate attempt is rejected evidence and was not
  credited.

## Full-range forbidden scan (merge base `7039a0b` → `2986b09`)

Name and content scan over the complete 397-commit range:

- Buckets: 261 plan, 77 tests, 54 gateway, 11 docs, plus
  cli/ci/schemas/scripts/docs/examples/dotfiles. **No `policies/` path, no
  `.github/` path, no `.env`, no secret material** (AKIA / private key / token
  pattern content scan = 0 hits).
- The gateway policy-engine sources, `gateway/migrations/*.sql`,
  `schemas/*.json`, and policy tests in the range are Wave 2 sheet content
  covered by the immutable in-tree review trail: 37 `reviewed_OK` verdicts
  (A/B/C/D_0_7/E-series/H_0_0, G/0/02 WIRING-A Trial 6 OK, G/0/02 ACK Trial 5
  OK per the reviews index), with KO trails preserved (e.g. H/0/01 DOCTOR
  Trials 1–6 KO). No changed code path is claimed reviewed-OK beyond that
  trail; in-progress sheets are labeled `in_progress`, so no overclaim.
- No unsupported release/tag/deployment claims: no remote configured, no tag
  contains the candidate.

## Census and Trial 3 closure (independently re-derived subset)

- In-progress set re-derived from per-sheet Status rows at `2986b09`: exactly
  `C/1/00`, `D/0/01`, `D/0/07c`, `G/0/02`, `H/0/01` — matches the P1 claim.
- Planned count re-derived: exactly **39**. `SHEETS.md` states
  `38 complete + 5 in progress + 39 planned = 82` and `5 + 39 = 44` open —
  consistent with the request.
- `D/0/07c` wording verified at `2986b09`: `in_progress`; Trial 3
  `reviewed_KO` at `1d8c952`; Trial 4 technical GREEN `5ffdf51`; append-only
  candidate `cf3b172` pending fresh review; explicitly "not reviewed OK,
  integrated, or promoted"; `D/0/07d` planned and blocked. No external
  D/0/07c verdict is transferred into this Wave and none is granted here.
- Trial 3 verdict confirmed immutable in-tree as `reviewed_KO`; its P1/P2
  subjects (canonical census, D/0/07c wording, review index, distances) are
  closed by `7ac2e25` + `2986b09` as verified above.

**P2 (documentation-only):** the 38-complete component of the 82-sheet
inventory decomposes across 25 delivered A sheets plus file-level sheets, four
of which carry verbose non-canonical Status strings; a mechanical file census
(59 status-bearing sheet files found) cannot reproduce the 38 without that
mapping. Open-set truthfulness (exactly 5 + 39, no overclaim) is fully
verified. Smallest follow-up: a one-line reconciliation note in `SHEETS.md`
normalizing the four verbose Status strings. Not a promotion blocker.

## Refs and authorization

Rechecked immediately before commit: `main` = `608a5be`, `develop` =
`b870d1c`, both `merge-base --is-ancestor` of `2986b09` (candidate 394/396
ahead respectively; 397 commits from merge base including main-side).

This OK authorizes **only** ordinary local `--ff-only` movement of `main` and
then `develop` to exact commit `2986b09f02d2119a8d89b25e9696d9325b27b339`. It
does **not** authorize release, tag, push, publication, deployment, support
claims, D/0/07c or D/0/07d integration, or any D/0/07c review claim. No ref
was moved by this review; nothing under `policies/` was touched; no push,
tag, merge, promote, `git add -A`, `reset --hard`, `checkout -- .`, or stash
was used. The only writes are this verdict and the Trial 4 review-index cell,
committed with explicit pathspecs on the review branch.
