# Review Submission — V5 E0/S02 (Trial 1)

## Scope

- `gateway/src/core/coordination_contract.js`
- `tests/gateway/coordination_contract.test.js`
- Redis wire/fence/lifetime sections of the V5 ADR and runbook

## Verification requested

Check key encoding/layout, digest-and-scope fences, blocking-read pre/post
behavior, dedupe/ACK windows, pending-safe backpressure, Redis 7 target, legacy
stream isolation, and safe examples.

## Verification

- `node --test tests/gateway/coordination_contract.test.js` — 5 tests passed.
- `git diff --check` — passed.
