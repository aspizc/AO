# Review S_0_1-2 — KO

**Task:** plan/S/0/01.md
**Trial:** 2
**Branch:** feature/K-0-agent-mcp-tools-runtime
**Commit:** 682ee35 — feat(messages): expose MCP message tools (S/0/1)
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-24

## Summary
The trial-1 blocker (no commit) is resolved — the work is now committed and the
tree is clean. But the canonical test command (`npm --prefix gateway test`) and
`./scripts/ci.sh` are **red, reproducibly**: the consolidated message tool test
fails on a non-deterministic list ordering. KO with one concrete fix.

## Checks
- [x] Commit now exists on the branch (`682ee35`), conventional message, references S/0/1. Tree clean.
- [x] Archivos a crear / modificar — `message.js` (3 tools), registered, smoke/bootstrap updated, tests added, U/0/4 bypass extended.
- [ ] **Tests requeridos — FAIL.** `npm --prefix gateway test` → `not ok 290 - message tools send, list, reply, and enforce trace scope` on **both** runs; `./scripts/ci.sh` red (1–2 gateway failures). Passes only when the file runs in isolation, which is the tell-tale of a non-deterministic assertion.
- [ ] **Criterios de aceptacion — partial.** 3 tools listed ✓; `MESSAGE_SENT` audited ✓; no cross-trace ✓; but "list returns ordered by createdAt" is **not reliably** satisfied.
- [x] Errores comunes evitados — no cross-trace; no UPDATE/DELETE.
- [x] Global invariants — English; no push; no `orchestrator/` dir; no restricted paths.

## Findings
**Root cause — non-deterministic list ordering (reproducible).**
`message.send` stamps `createdAt` with `nowIso()` (millisecond precision). In the test, the two `tr-message-list` messages ("first", "second") are sent in the same millisecond, so they **tie on `created_at`**. The tiebreaker in `listMessagesByTrace` is `ORDER BY created_at, message_id`, and `message_id` is a **random UUID** (`msg-<uuid>`) — so same-ms messages come back in random order. The failing assertion shows exactly this: expected `[first, second]`, got `[second, first]`.

The `--test-concurrency=1 --experimental-test-isolation=process` change added to `gateway/package.json` does not fix this — the cause is the ordering key, not concurrency.

This ordering choice originated in S/0/0 (`created_at, message_id`) and passed there only because that test used explicit, distinct `created_at` values. S/0/1 exposes the latent bug by generating real colliding timestamps.

**Minor (non-blocking) notes:**
- The trial-2 writeup attributes `message.list` `requesterTraceId`/`TRACE_MISMATCH` and the camelCase shape to "reviewer findings." Those were not in the trial-1 KO (which only flagged the missing commit). The changes themselves are fine improvements — just correcting the record.
- The feat commit `682ee35` included `plan/reviews/S_0_1-1_to_review.md` despite the trial-1 request to keep `plan/reviews/*` out of the feat commit. Harmless (we track those anyway), but the reviewer owns the review-trail commits.

## Required corrections (KO)
1. **Make list ordering deterministic for same-millisecond sends.** In `gateway/src/core/repositories/message_repo.js`, change `listMessagesByTrace` to break ties by insertion order rather than random id:
   ```javascript
   // messages is a normal rowid table (not WITHOUT ROWID), so rowid is monotonic with insertion
   return getDb()
     .prepare("SELECT * FROM messages WHERE trace_id = ? ORDER BY created_at, rowid")
     .all(traceId);
   ```
   (`ORDER BY created_at, message_id` is the bug — `message_id` is a random UUID.)
2. **Verify no flakiness:** run `npm --prefix gateway test` and `./scripts/ci.sh` a few times each; require zero failures every run. The `package.json` concurrency/isolation change may stay or be reverted — it is not the fix.
3. Amend/commit on the branch and write `plan/reviews/S_0_1-3_to_review.md` with the final SHA for trial 3. Keep `plan/reviews/*` out of the feat commit.

## Next step
- KO → fix the ORDER BY (correction #1), confirm a green-on-repeat suite, resubmit as trial 3.
