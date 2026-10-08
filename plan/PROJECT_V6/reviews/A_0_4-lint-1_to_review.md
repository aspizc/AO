# A/0/04 lint correction — independent review request 1

Status: uncommitted candidate, source review pending. Base HEAD:
`8e92565ada31f3301005b88b6a9899850997ab0a`.

The root's full `bash scripts/ci.sh` run with owned Redis 7.2 and pinned
`tmux 3.6a-agents.3` failed only `lint.gateway`: four `no-regex-spaces`
diagnostics in `gateway/src/adapters/base_adapter.js` at lines 12, 15, 17 and
178. Aggregate: 2,765 passed, 1 failed, 12 skipped, 2,778 total. The local
unpublished full log has SHA-256
`9da1017138bfe25bcadb71c39730b42c699f40fdc9888b55005a02d7684f43f8`.

The candidate changes only those four anchored regexes from two literal ASCII
spaces to ` {2}`. `gateway/src/adapters/base_adapter.js` SHA-256 is
`f77309f78e4bdb541fb75984110fb2c7be25f1d097335fd6fc99f8d3cb6ddb1d`.

Verification after the edit: `npm run lint` in `gateway/` exited 0;
the affected Node suites passed 191/191 with no skips; `git diff --check`
passed. These are behavior-preserving syntax substitutions, so no new TDD
behavior test was added. The prior behavioral RED/GREEN and source review
remain in the A/0/04 trail. The full gate on this corrected candidate has not
run. Claude live acceptance and the remaining A/0/04 sheet criteria are open.

Review the exact four-line diff, regex semantics, file hash, lint and affected
tests. Write an independent immutable verdict and index it. Do not edit source,
policies or existing review artifacts, commit, push or claim sheet closure.
