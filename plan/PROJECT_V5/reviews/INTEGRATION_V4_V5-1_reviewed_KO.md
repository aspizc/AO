# Independent Review — V4/V5 Integration Candidate (Trial 1)

## Verdict

**KO** for candidate
`24992c22435ef0278a0f6f2095fbb8b1ee95ad11` over
`develop@3625b8d16d5abcc11f2d905caff0827bbce60a0c`.

## Reviewer profile

- Model: `gpt-5.6-sol`
- Reasoning effort: `ultra`
- Execution profile: `priority/fast`
- Branch: `integration/V4-V5-combined`

## Reproducible blocking finding

1. **The root plan still falsely marks the expanded Project V5 as complete and
   integrated into `main`/`develop`.**

   `plan/README.md:16` says Project V5 implementation/review is complete and
   integrated into aligned `main`/`develop`; `plan/README.md:21-26` still
   describes only the historical five-epic, 25-sheet A delivery. The combined
   candidate instead makes Project V5 explicitly active, with the remaining
   B–I roadmap in progress (`plan/PROJECT_V5/README.md:3-4`) and an active
   registry containing 50 B–I sheets: 3 complete, 1 `in_progress`, and 46
   planned (`plan/PROJECT_V5/SHEETS.md:15-26`).

   The Git state also disproves the integration claim: both `main` and
   `develop` resolve to `3625b8d`, while the B implementation commit
   `75076d4` is not an ancestor of `develop`; only the review candidate at
   `24992c2` contains it. This contradicts the canonical state rule in
   `plan/README.md:35-42` and required invariant 5's prohibition on false
   completion claims.

   Reproduction:

   ```text
   git rev-parse --short=12 main develop HEAD
   # 3625b8d16d5a
   # 3625b8d16d5a
   # 24992c22435e

   git merge-base --is-ancestor 75076d4 develop
   # exits 1
   ```

## Independent verification

- `npm ci --offline` in `gateway/`: passed; 196 packages installed from local
  cache and 0 vulnerabilities reported.
- Final offline `scripts/ci.sh`, with Redis URLs and real-run opt-ins unset:
  passed — structure 143/143; Gateway 669 total, 653 passed and 16 declared
  skips (including the deliberately unavailable `tmux` lane); E2E 24 passed
  and 1 protected real-run skip; CLI 29/29; LangGraph 81 passed and 3 declared
  skips; MCP smoke, policy validation, Ruff, and ESLint passed.
- V4 materialization checks: 72 task files, 12 epics, bijective membership,
  navigable indexes, and local links passed in the structure gate.
- Independent V5 parser: 50 sheets (`6/7/7/5/5/5/6/9`), 114 internal
  dependency edges plus 3 delivered-A edges, 0 missing dependencies, 0 cycles,
  and 350/350 required sections. The coverage matrix has 37 distinct existing
  owners and 71 unique traced IDs (65 required plus 6 retained lower-priority
  IDs). Across 192 Project V5 Markdown files, 293 local links resolve with 0
  missing.
- C/0/00 remains honestly partial: only its Node runtime increment is checked;
  manifest and suite/lane sentinels remain open. The absorption ledger says no
  V4 task is closed and keeps M0/4/00 partial.
- `message.*` production/schema path diff: 0 files. Coordination and
  artifact-list isolation/parity regressions passed in the Gateway/E2E gate.
- `git diff --check 3625b8d...24992c2`: passed. Added-line
  credential-signature scan: 0 hits. Merge-conflict marker scan: 0 hits.

No Redis, shared MCP/Gateway process, container, network service, real agent,
or real `tmux` session was contacted or started.
