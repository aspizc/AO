# Review M_0_3-1 — KO

**Task:** `plan/M/0/03.md`
**Trial:** 1
**Branch:** `feature/M-0-3-sanitization-fail-closed`
**Commit:** `ec0b692` — `feat(sanitization): fail closed on sanitization errors (M/0/3)`
**Reviewer:** Claude reviewer agent
**Date:** 2026-05-23

## Summary
The **fail-closed production logic is correct** — I verified adversarially that a broken sanitizer never leaks raw restricted content. **But the deliverable makes the project's CI gate (`./scripts/ci.sh` / `npm --prefix gateway test`) non-deterministic (flaky).** A previously-green test (`auto_sanitize_artifacts.test.js`) now fails intermittently because the new `sanitization_fail_closed.test.js` installs **bad** sanitizer rules into a shared module-level singleton while other test files run concurrently, and M/0/3's new swallow-the-error `catch` in `put` turns that transient pollution into a silently-missing sanitized artifact. **KO**: the suite must be deterministic before this task can close.

## What is correct (keep it)
- `put` wraps `sanitize` in try/catch, audits `SANITIZATION_FAILED`, persists the raw row, and does **not** create a sanitized artifact on failure. ✅
- `artifact.get` on `allow_with_sanitization`: serves the linked sanitized artifact when present; when missing → `POLICY_DENIED` (`ruleId: "sanitization.missing"`) + `SANITIZATION_MISSING_DENY` audit, **no raw content**. ✅
- Adversarial probe (broken regex rules, reviewer requests raw restricted): `decision: POLICY_DENIED`, **raw secret not present in the response** ✅ — TM-06 boundary holds in production.

## The blocking problem — flaky CI

`npm --prefix gateway test` is the command `./scripts/ci.sh` runs. Three consecutive runs on this machine:

```
# pass 196 # fail 0   (run 1)
# pass 195 # fail 1   (run 2)
# pass 195 # fail 1   (run 3)
```

The failing test is `auto_sanitize_artifacts.test.js → "sanitized artifact links to raw and contains sanitized content"`:

```
Expected values to be strictly equal:
+ null               (actual: sanitized.sanitized_from)
- 'art-...'          (expected: raw.artifactId)
location: tests/gateway/auto_sanitize_artifacts.test.js:59
```

i.e. the auto-sanitize `put` did **not** create the sanitized companion artifact, so `listArtifactsByTrace(...)[1]` is the wrong row.

### Root cause
1. The gateway core uses **mutable module-level singletons** — the sanitizer in particular: `let rules = null;` set by `configureSanitizer(...)` (`gateway/src/core/sanitizer.js`).
2. `node --test` runs the test files in a **shared runner with concurrent/interleaved scheduling** (the files are not process-isolated in this setup; the failure is order- and timing-dependent — it reproduces more often on high-core machines, which is likely why your local run passed and a CI box would not).
3. M/0/3's **new** `sanitization_fail_closed.test.js` is the first test to call `configureSanitizer(badRulesPath)` (pattern `"("`, an invalid regex).
4. When that bad config is transiently active during `auto_sanitize_artifacts.test.js`'s `put`, `sanitize()` throws — and **M/0/3's new `try/catch` swallows it** (correct for production, but here it means the auto-sanitize test silently gets no sanitized artifact and fails).

Determinism check: `--test-concurrency=1` did **not** fix it (still flaked run 2 of 4), so simply serializing files is insufficient — the shared singleton + interleaving must be addressed directly.

## Required corrections (trial 2)

Make the gateway test suite **deterministic** without weakening the (correct) production fail-closed behavior. Pick an approach and **prove it**:

1. **Stop the bad-rules test from mutating shared global sanitizer state seen by other files.** Preferred options:
   - Inject the failure **locally** instead of via the global `configureSanitizer`: have `sanitization_fail_closed.test.js` exercise the fail path through a sanitizer instance/stub it controls (e.g. dependency-inject a throwing `sanitize`, or temporarily monkey-patch and **restore in a `finally`/`after` hook**), so no other file ever observes bad rules.
   - And/or add `sanitizer._resetForTests()` and have **every** test's `fresh()` reset+reconfigure the sanitizer (matching the state/audit reset pattern), so no file inherits another's rules.
2. **OR isolate test files in separate processes** so module singletons can't leak. Note: `--test-isolation=process` is **not** valid on this Node (`v22.22.1`) — find the mechanism that actually works here (e.g. invoking `node --test` per file, or the supported isolation flag for this version) and confirm it.
3. Whichever you choose, the production code in `artifact_store.js` / `artifact.js` should stay as-is (the fail-closed logic is correct).

### Proof required in the trial-2 `to_review`
- Run `npm --prefix gateway test` **10 times in a row** and paste the `# pass / # fail` summary for each — all must be green.
- Confirm `./scripts/ci.sh` is green.

## Errores comunes reference
This is exactly the spirit of the M/0/3 spec's "no flaky security tests" intent — the sanitizer-failure path must be testable **without** making the rest of the suite observe a broken sanitizer.

## Next step
KO → fix the test isolation/determinism as above and resubmit `M_0_3-2_to_review.md` with the 10× green proof. Keep the production fail-closed logic unchanged. Do **not** advance to N until `./scripts/ci.sh` is reliably green.
