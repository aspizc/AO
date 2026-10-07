# V7 A/0/01 — Independent implementation Trial 1 review

Verdict: **OK — implementation accepted for the exact bound candidate bytes**.
No integration, promotion, supported-release or release approval is issued.
Date: 2026-10-07. Reviewer: root-assigned independent Codex session
`/root/review_v7_a01_final`, distinct from the coder session. This is the
first implementation verdict; no coder-owned verdict was used.

## Candidate and review authority

- Sheet: `plan/PROJECT_V7/A/0/01.md`; branch:
  `feat/V7-A-0-01-shared-capacity`.
- Base and observed HEAD: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.
- Final manifest: `/tmp/ao-v7-a01-review-candidate-v2.json`, **45 files**,
  SHA-256 `ad124afd818f8e67f424c50188bafec4e9896c449ef7c9013a7f45d569ff700b`.
- Original preserved manifest: `/tmp/ao-v7-a01-review-candidate.json`, 44 files,
  SHA-256 `90e471b8a03f762a342c2947991a8130797a0eed89b9f396752284391c675f8a`.
- Every original file matched both its SHA-256 and Git blob hash at the first
  inspection. Every final bound file matched both hashes after the supplement.
  Between manifests, exactly `plan/PROJECT_V7/README.md` changed and
  `A_0_1-1_root_binding_supplement.md` was added. Reversing the two-line status
  arithmetic correction reproduced the original README's SHA-256 and blob hash.
  All other 43 original files, including every runtime/test/schema/gate artifact,
  are unchanged. No paths were removed.
- A candidate Git tree/commit is unavailable because `.git` is read-only in
  this environment. This verdict accepts the manifest's exact path/blob set
  plus base, not an invented tree SHA. Root must bind those bytes to a real
  candidate tree/commit and persist/index this review before integration.
  A changed bound file requires a new binding and appropriate review.

The operator's no-Claude instruction and root's separate reviewer assignment
establish the documented built-in fallback after Gateway `task.assign`
returned `REQUEST_CONTEXT_DENIED`; canonical provider defaults are unchanged.
Historical review trace:
`tr-r1-v7-a01-review-2e3268c8-abf5-46ce-beb4-f04ea0e7515e`.
After the environment transition, `artifact.put` against that trace was denied.
Current root continuation provenance is
`tr-ao-v6-v7-resume-b5f36fd5-b6a3-44f0-b8ed-d2dc46ee7cea`, with checkpoint
`art-707d830e-497f-4913-836c-51de1fe1aa42`. Historical trace metadata and artifacts
are not treated as a successful current grant or integration authority.

## Findings and acceptance assessment

No blocking implementation defect was found in the reviewed scope.
Read AGENTS.md, the resolved orchestration profile, ao-build-orchestration,
plan README, V7/stage indexes, the sheet, request and additive correction trail.
Reviewed the runtime, immediate CLI caller/output helper, both schemas, tests,
documentation, status changes and CI inventory changes against the base.

1. **Atomic admission.** `reserve_capacity` validates a closed complete vector,
   reads fresh state under the stable sibling flock and checks global counts,
   canonical-provider limits and declared memory after immutable headroom before
   one durable update. Failed admission leaves all counters and revision intact.
   Existing held provider totals are validated even when a new request omits
   that provider. Closed records do not contribute to used capacity.
2. **Path and persistence behavior.** Budget and lock targets require private
   current-owner regular single-link files; symlinks, unsafe ancestry and special
   targets fail closed. Lexical aliases canonicalize to one lock. Updates sync a
   private temporary, replace atomically and sync the parent; initialization
   publishes exclusively without replacing an existing ledger. Before-replace
   failures preserve complete prior bytes. After-replace sync uncertainty returns
   unavailable while the observable reservation remains charged. Lock files are
   never replaced or removed by the API. Primitive checks do not claim reliable
   remote-filesystem detection.
3. **Crash and ownership behavior.** Possible/active records retain the entire
   vector after crash or unlock. Missing retirement confirmation returns recovery
   required. Owner matching, unknown IDs, conflicting references, repeated state
   transitions, duplicate release and retained terminal records are deterministic.
   Cooperative confirmation is explicitly not authenticated authority. There is
   no TTL release or numeric-PID destruction path.
4. **Contracts and command.** Safe errors project only validated identifiers and
   integer counters, with declared exit classes. Corrupt state is rejected without
   resetting capacity or echoing canaries. The real CLI registers budget-init and
   emits the actual written DTO. The budget schema closes structural shapes and
   effect/unit relations; its comment correctly leaves cross-field arithmetic,
   uniqueness and strict integer decoding to runtime. Provider parity uses the
   existing canonical profile schema.
5. **Test intent and lifecycle.** Required distinguishing tests use real spawned
   contenders/barriers, observed admissions, owner crash exit 23 and a live owned
   surviving child followed by event-directed exit 0. They distinguish every
   count/provider dimension, memory/headroom rejection, no partial charge,
   retained crash memory, corruption, owner violations and durability boundaries.
   Retry tests assert revision stability and conflicting references. The tracker
   correction checks for surviving workers, collects retired resources and only
   closes/reaps a tracker created by this module; it does not mask worker leaks
   or signal arbitrary PIDs. Archived owned-runner RED/GREEN confirms the external
   cleanup check, not merely passing pytest output.

The README's stale arithmetic was identified during this first review and
corrected before the verdict through the immutable supplement. The final
status consistently describes one implemented candidate and four planned
leaves, with no integration or release claim. No policies changes are present
in the base diff or manifest. Scope stays cooperative declared capacity;
automatic waves, measured RAM, OS enforcement, token/cost limits and stronger
V5 authority/process guarantees remain outside this implementation.

## Verification and limits

Independent read-only checks:

- Final 45-file SHA-256/Git blob verification: **PASS**, zero mismatches.
- CI suite contract/inventory validation via unchanged
  `scripts/ci_gate.py::validate_manifest`: **PASS**, errors empty.
- `git diff --check <base>`: **PASS**, exit 0. Policies diff: empty.
- All 22 bound gzip evidence archives decompress successfully. Verified the
  named RED evidence for missing modules, exact-mode creation, root command
  registration, missing budget schema and owned-process cleanup.

Independent focused command in the current sandbox:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src:orchestrator-langgraph/src .venv/bin/python -m pytest -p no:cacheprovider -q orchestrator-langgraph/tests/test_wave_budget.py tests/cli/test_wave_budget_command.py tests/cli/test_cli_scaffold.py tests/cli/test_cli_output.py
```

**25 passed, 55 failed, 0 skipped**, exit 1, 13.01 seconds. These remain failures,
not skips or passes. The 52 ledger-dependent cases reject ancestry during
initialization; the three positive CLI cases receive that same configuration
error. Observed effective UID is 1000; this sandbox exposes `/tmp` as UID 65534,
mode 1777, and `/home` as UID 65534. The required root/current-owner ancestry
precondition is therefore unavailable. No guard was weakened and no unsupported
ancestry workaround was used. Positive process/admission behavior could not be
independently rerun here; the disposition uses the bound host evidence plus
source and test review for those cases. The 25 passing cases cover configuration
rejection, safe error/CLI output and existing CLI regressions.

Preserved host verification, independently inspected rather than rerun:

- Final focused evidence: **80 passed, 0 failed, 0 skipped**, observed exit 0.
- Final aggregate gate: **2721 passed, 0 failed, 12 skipped, 2733 total**,
  errors empty, status **`infrastructure_unavailable`**. This is not an
  unconditional green or live-infrastructure claim. Counts comprise structure
  456; Gateway 1632 plus nine PostgreSQL skips; E2E 25; CLI 436; LangGraph 143
  plus two Gateway integration and one Temporal skip; Redis 22; seven command
  lanes. Optional real-provider verification did not run.
- Final gate archive: `A_0_1-1-full-gate-final.txt.gz`; uncompressed SHA-256
  `5ec1022a78b6b9120fc2a40373eebba5a8b6aa524cf4254ebb5e07b48935e526`.
  Its complete terminal JSON report is present. The original host exec handle
  was lost after the environment transition; no final process exit code is
  inferred from that report.
- Earlier aggregate failure remains **2578 passed, 1 failed, 9 skipped**:
  pytest's passing counts did not satisfy owned-process cleanup. Its retained
  archive hash is `61cb09237c1900e17b46b6e65e10b28811e98ca218df7c89e0f94647749f7f1c`.
  The corrected tracker ownership and subsequent owned-runner evidence address
  that failure. The obsolete hash sampled from a reused log is not credited.

No full gate, provider, commit, push, tag, integration or sub-agent was run by
this reviewer. Root owns evidence indexing, artifact persistence and the later
Git tree binding. This implementation OK does not close later V7 acceptance,
V6 release work, the declared infrastructure omissions or V5's open guarantees.
