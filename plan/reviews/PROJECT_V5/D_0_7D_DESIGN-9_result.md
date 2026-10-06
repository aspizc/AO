# Project V5 D/0/07d Design Trial 9 — reviewed_OK

Verdict: **reviewed_OK** for candidate `9b5e6b509e431ffe49be4caab7bf2e39cab26bf7`
(tree `9e746d99…`), range `c6afab2..9b5e6b5`, baseline tree `173dd941…`.

Authenticated independently: both commit trees/parents/exact subjects; single
changed sheet `plan/PROJECT_V5/D/0/07d.md` (+263/-66; +102/-47 then +167/-25);
blob `459b88b` 6,557 lines / 363,924 bytes SHA-256 `6378d019…fef0fe`;
intermediate blob SHA-256 `fe6c0903…`; patch-id `a645ea5b…`; diff-check clean.
Extracted the three marked fences per the sheet's LF-preserving marker rule:
spec 126/5,480 `1cb01a42…`, bwrap 23/1,323 `87b9dfbe…`, oracle 3,788/179,603
`3deaeb91…` — all equal to the request table. Spec parses duplicate-key-strict;
oracle compiles; `selftest`/`owner-proof`/`contracts` all rc=0 at 58,915 /
53,063 / 43,323 bytes, SHA-256 `31c1f31e…`/`ca4d8db9…`/`2f0af32f…`, byte-exact.

Invariants: (1) lifecycle `unit:archive -> docker:ownership-probe ->
docker:build -> output:sealed -> unit:test` via `PARENT_EXECUTION_ORDER`; memfd
`MFD_ALLOW_SEALING`, all four seals applied/verified, test refused unless
sealed, SCM_RIGHTS fd 4 carries `output_fd`, never the archive. (2) `MODE_ORDER`
holds exactly eleven bare D7C2-v3 tokens; `bareCandidateArgvToken=true`,
`dashedMutantsRejected=33` (3×11). (3) Synthetic TAP `ok`/`not ok` derives only
from a completed child/check exit 0/1; signal/timeout/malformed exits suppress
terminal frames. (4) `CP1_AUTHORITY_INPUTS_V1` plus eleven literal argv rows,
four-entry env, no-LF mode-0400 link-count-one ledgers, and eleven distinct
empty mode-0700 review bases form every CP1 command; none exposes expectations.
