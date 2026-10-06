# Review Submission — Project V5 C/0/02 Trial 2

## Requested review

Please perform an independent, local/offline review with **GPT-5.6 Sol**,
**ultra** reasoning, and **Fast/Priority** execution. Review the complete
technical diff and reproduce the adversarial cases; do not rely on this
submission's conclusions.

- Trial 1 KO/base:
  `0b66c2faa6d548f7e0768f9e8df7c7e3ae97a59d`
- Trial 2 technical candidate:
  `9d49f84365f82025ef177755d56103aa835f7c7c`
- Trial 2 technical tree:
  `c36d77e1decc429aadde5683d6331bd69105478a`
- Trial 2 parent:
  `0b66c2faa6d548f7e0768f9e8df7c7e3ae97a59d`
- Review target: Project V5 `C/0/02`
- Trial 1 request and KO artifacts are preserved byte-for-byte.

Do not integrate, promote, tag, or treat C/0/02 as complete unless the
independent verdict is OK. This request is evidence-only and is committed
separately from the technical candidate.

## What changed after Trial 1 KO

Trial 2 adds RED-first regressions and closes each accepted false-success path:

- exact existing Git refs replace revision expressions; one bounded,
  noninteractive, argv-only/no-shell Git wrapper handles every Git operation;
- governed bytes are read from the pinned technical tree and must match both
  index and checkout, with `skip-worktree` and `assume-unchanged` rejected;
- the technical candidate is frozen separately from the review evidence head,
  and every post-freeze commit is restricted to canonical review artifacts;
- Python production roots come from both manifests and non-development extras,
  every active lock node needs SHA-256, and markers are evaluated over the
  reviewed Linux/macOS/Windows CPython 3.11–3.14 matrix;
- a primary OSV querybatch snapshot preserves raw and canonical bytes/digests,
  exact ordered 1:1 component coverage, complete pagination, and individual
  vulnerability details; npm Bulk Advisory is corroboration only;
- compatible dependency updates remove every high/critical finding;
- independent reviews are canonical Ed25519 attestations bound to a reviewed
  public trust root, normalized identity/role, technical subject, and valid
  chronology;
- released-state evidence embeds recomputable canonical provenance and a
  four-item checklist bound to candidate, evidence head, review, integration,
  and promotion;
- waiver validity is bounded to exactly 30×24 hours;
- candidate/state schemas encode the same structural rules as runtime; and
- malformed external input returns one safe JSON failure without traceback or
  local paths.

The implementation keeps C/0/00's `ci/suites.json` and
`ci/suites-contract.json` as the only CI authorities. It does not introduce
`ci/release-suites.json`, change `message.*` or `agents:events`, or use the
shared MCP/Redis service. The empty production reviewer trust store is
deliberately fail-closed; onboarding a real reviewed public key is an explicit
operator action, while tests use ephemeral private keys that are never
committed.

## TDD evidence

### RED

After adding the 15 adversarial Trial 2 cases to
`tests/structure/test_release_candidate_contract.py`, the focused selection
reported **14 failed / 1 passed**. The failures reproduced:

- revision-expression refs;
- hidden `skip-worktree`/`assume-unchanged` bytes;
- unrelated advisory coverage;
- hard-coded Python roots, comment-derived graph authority, and hashless nodes;
- unsigned/author reviews and impossible chronology;
- arbitrary provenance and boolean checklist evidence;
- unlimited waivers;
- schema/runtime divergence;
- malformed-input `KeyError`; and
- unbounded Git execution.

The one pass was an already-conforming pre-existing behavior; no failing
assertion was weakened to reach GREEN.

### GREEN

All commands below ran on the exact final technical tree, without advisory,
package, MCP, Redis, Postgres, Temporal, or provider network access:

```text
python -m pytest -q tests/structure/test_release_candidate_contract.py
53 passed in 15.09s

python -m pytest -q tests/structure
275 passed in 27.38s

python scripts/release_candidate.py verify-repository --repo-root .
passed; 1 production advisory; 0 registered waivers

Draft202012Validator.check_schema(candidate/state schemas)
passed

python -m py_compile scripts/release_candidate.py \
  scripts/refresh_advisory_snapshot.py \
  tests/structure/test_release_candidate_contract.py
passed

./scripts/requirements_lock.sh --check-inputs
requirements.lock inputs are current

ruff check cli orchestrator-langgraph scripts/ci_gate.py \
  scripts/refresh_advisory_snapshot.py scripts/release_candidate.py \
  tests/structure
All checks passed

PATH=<lock-identical-offline-venv>/bin:$PATH \
  UV_OFFLINE=1 npm_config_offline=true ./scripts/ci.sh
1098 tests; 1086 passed; 12 exact allowed infrastructure/opt-in skips;
0 failed; every required non-service gate passed

git diff --check
passed
```

The aggregate CI status is `infrastructure_unavailable` only for the exact
allowlisted/opt-in Postgres, Gateway, Temporal, Redis, and real-provider
lanes. No required assertion failed.

## Final supply-chain corpus

- Snapshot schema: `offline-advisory-database/v2`
- Authority: OSV; npm Bulk Advisory is corroboration only
- Fetched: `2026-07-26T05:22:31Z`
- Valid until: `2026-08-09T05:22:31Z`
- Locked components: 210
- OSV ordered coverage/results: 210 / 210
- Pending continuation tokens: 0
- Primary vulnerability details: 1
- npm corroboration coverage: 134 npm components
- Findings: one moderate
  `GHSA-frvp-7c67-39w9` for
  `pkg:npm/%40hono/node-server@1.19.15`
- High/critical findings: 0
- Waivers: 0

Repository verification recomputes raw/canonical response digests, query and
component digests, coverage order, pagination exhaustion, detail identity, and
the derived finding list. A targeted corpus scan found no local absolute
paths, authorization/set-cookie headers, credential assignments, private-key
blocks, or common token signatures.

## Required independent probes

Please explicitly attempt each Trial 1 bypass against the Trial 2 candidate:

1. collect/verify with `refs/heads/name~0`, `^{commit}`, and a moved live ref;
2. alter a governed file behind `skip-worktree` and `assume-unchanged`, and
   alter the index blob independently of the checkout;
3. advance the evidence head with one allowed review artifact and then with an
   unrelated file;
4. remove a Python hash, add a manifest root, mutate `# via`, and exercise
   Windows/older-3.11 marker branches;
5. replace OSV evidence with an unrelated/fewer/reordered result, mutate raw or
   canonical bytes/digests, leave a continuation token unresolved, and change
   a vulnerability detail identity;
6. use an unknown/expired reviewer key, author-equivalent identity, bad
   signature, pre-commit/future attestation, and pre-attestation state time;
7. supply arbitrary provenance, a boolean checklist, or a checklist bound to a
   different evidence head;
8. test waiver validity at 30×24 hours and one second beyond;
9. rerun the shared schema/runtime mutation corpus and malformed CLI inputs;
10. force a blocking Git descendant/helper and confirm bounded cleanup plus one
    safe JSON failure.

Also verify dependency graph/license/SBOM consistency, the single CI authority,
the ADR/documentation against actual behavior, unchanged Trial 1 evidence,
absence of committed private material, and that this request commit contains
only this file.

## Commit

- `9d49f84365f82025ef177755d56103aa835f7c7c` —
  `fix(release): close C/0/02 review bypasses (trial 2)`
