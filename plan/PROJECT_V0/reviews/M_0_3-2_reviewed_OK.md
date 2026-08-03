# Review M_0_3-2 — OK

**Task:** `plan/M/0/03.md`
**Trial:** 2 (trial 1 was KO for CI non-determinism)
**Branch:** `feature/M-0-3-sanitization-fail-closed`
**Commit:** `f600915` — `test(sanitization): isolate fail-closed sanitizer failure (M/0/3 trial 2)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
The trial-1 flakiness is **fixed and verified deterministic** (full gateway suite 10/10 green, 196 tests each). The fix injects the sanitizer-failure **locally** via a test-only seam instead of mutating the global sanitizer config, and removes the order-fragile `list()[1]` assumption. Production fail-closed logic is unchanged. **This task closes Stage M.**

## Checks
- [x] Determinism restored — **verified by me**, not just reported: ran the full `node --test tests/**/*.test.js ../tests/gateway/**/*.test.js` **10 consecutive times → `# pass 196 # fail 0` every run.** (Note: the trial-2 report's "`# pass 32`" lines were the focused 2-file subset, not the full suite — I re-ran the full suite to confirm.)
- [x] `./scripts/ci.sh` → `# pass 196 # fail 0` + structure 33 + CLI 25; `==> All checks passed.`
- [x] Production fail-closed behavior unchanged (diff below).
- [x] Criterios de aceptacion (still satisfied from trial 1) — sanitizer exception → raw stored, no sanitized, `SANITIZATION_FAILED`; cross-boundary get without sanitized → deny + `SANITIZATION_MISSING_DENY`, no raw leak.
- [x] Definition of done — commit on `feature/M-0-3-sanitization-fail-closed`; CHANGELOG line present.
- [x] Global invariants — English: OK · no push: OK · no restricted paths: OK · no `orchestrator/` component: OK.

## Findings
The trial-1 → trial-2 production diff is purely an injection seam (verified via `git diff ec0b692 f600915 -- artifact_store.js`):

```diff
-import { sanitize } from "./sanitizer.js";
+import { sanitize as defaultSanitize } from "./sanitizer.js";
+let sanitizeImpl = defaultSanitize;
-      const { sanitized, appliedRuleIds } = sanitize(content.toString("utf-8"), { kind });
+      const { sanitized, appliedRuleIds } = sanitizeImpl(content.toString("utf-8"), { kind });
+export function _setSanitizeForTests(fn) { sanitizeImpl = fn; }
+export function _resetSanitizeForTests() { sanitizeImpl = defaultSanitize; }
```

- The real path is unchanged: `sanitizeImpl` defaults to the real `defaultSanitize`. The fail-closed `try/catch` and the `artifact.get` missing-sanitized deny are byte-identical to trial 1 (which I already verified never leaks raw).
- The fail-closed test now injects a throwing sanitizer through `_setSanitizeForTests(...)` and restores it in `finally` — so it **never mutates the global sanitizer rules** that other concurrently-scheduled test files observe. Root cause of the flake is removed.
- `auto_sanitize_artifacts.test.js` now locates the sanitized row by `sanitized_from === raw.artifactId` instead of `list()[1]` — robust to the intentionally-random UUID sort order. Good secondary fix.

### Decision review (non-blocking)
- A test-only mutable seam (`sanitizeImpl` + `_setSanitizeForTests`) now lives in production `artifact_store.js`. This is a pragmatic, conventional DI hook (mirrors the existing `_resetForTests` convention, underscore-prefixed, defaults to the real impl). Acceptable — it removed the flake without a larger refactor of the module-singleton architecture. If the team later wants zero test seams in production code, a constructor/factory style for the store would be the cleaner long-term shape, but that's out of scope here.

## Stage M status — CLOSED
- [x] M/0/0 Sanitization rules registry
- [x] M/0/1 Sanitizer core
- [x] M/0/2 Automatic sanitized artifact generation
- [x] M/0/3 Fail-closed sanitization — **closed by this task (trial 2)**

The fail-closed boundary (TM-06) is blinded and the suite is deterministic again. Sanitization layer is complete: rules → engine → auto-generation at put → fail-closed serving on get.

## Next step
OK → per `plan/README.md` MVP order (`M + N`), coder advances to **Stage N** starting with **N/0/0** (`plan/N/0/00.md`) — artifact share + visibility matrix (TM-09 cross-trace, who-sees-what). New branch `feature/N-0-0-*` cut from `develop`.

> Lesson worth carrying forward: the gateway's core modules are **module-level singletons** (sanitizer, artifact store, state, audit). Any future test that needs a *degraded* dependency (broken sanitizer, missing DB, etc.) must inject it locally and restore it — never mutate the shared global config — or it will flake other concurrently-scheduled test files. Consider adding this note to the coder's test conventions.
>
> Operator: `C_0_4-1_to_check_by_human.md` (orchestrator-sanitization field) and `J_0_2-1_to_check_by_human.md` remain open.
