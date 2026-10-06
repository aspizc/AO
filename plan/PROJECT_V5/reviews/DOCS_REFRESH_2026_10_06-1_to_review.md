# Public project documentation refresh — review request 1

## Scope and candidate

- AO base: `ea18f4e01e76bfe2cd087ae8ffb06ea3975202e3`.
- Documentation candidate tree: `b0651d0dfe887834cfd26dc51a92122999629f3e`.
- User requested all relevant project information refreshed, beginning with the
  README, and explicitly requested push. Author/committer remain
  `carlos.aspizc@gmail.com`.
- Root implements; `/root/review_project_docs` independently reviews and authors
  only its verdict. The standing authorized session-agent workflow applies.
- No runtime, policy, dependency, or executable example configuration changes.
  Two existing documentation-install tests were tightened to the lock-only
  commands. Their required tests failed before the prose was updated.

## Changes and acceptance criteria

- README leads with accurate published-main status, no unsupported release tag,
  reproducible setup, executable providers and optional model selections.
- New project-status overview binds implementation claims to the already
  verified published candidate and preserves declared infrastructure limits.
- Operator, MCP host, adapter, CI, coordination, Doctor, LangGraph and workflow
  guidance matches actual runtime contracts. Connection identity, canonical
  repository naming and Linux/tmux/Redis gate requirements are explicit.
- Imported planning source SHAs remain historical provenance. H/0/01 slices,
  D/0/07d Design Trial 10, and the CP1 Trial 2 KO index match existing evidence;
  no open sheet, promotion or release is marked complete.
- Historical ADRs and verdict contents are preserved. The newer coordination
  ceiling is distinguished from the original one-hour ADR proposal.
- Newly discovered legacy smoke failures remain visible and are excluded from
  quickstart success claims. No failure is disguised as a passed check.

## Verification

TDD RED: the revised lock-install documentation tests yielded **2 failed,
8 passed** against the old documentation. Existing assertions were strengthened,
not weakened or removed to hide a failing setup.

An intermediate documentation candidate passed **447 structure tests** with the
pinned tmux and isolated server. After late documentation corrections for the
legacy smoke limitations, the final affected-doc selection passed **54 tests**.
The selections overlap and are not summed. The final runtime code is unchanged.

Additional checks: **6 MCP catalog tests passed**, **1 persistent-connection
MCP two-agent E2E test passed**, `node scripts/smoke_mcp.mjs` reported
`MCP smoke OK`, and `agent-run doctor --help` confirmed the implemented command
and `--json` option. Checked **575 relative Markdown file links**, zero missing
targets; `git diff --cached --check` passed. No claim of rendered browser QA
or comprehensive anchor validation is made.

Known failing execution: `node scripts/smoke_mvp2.mjs` exited 1 at
`task.assign` with `REQUEST_CONTEXT_DENIED`. Its fresh process per request
loses the connection context. The independent reviewer also reproduced this
failure for `smoke_planning.mjs`. Code inspection identified the same process
pattern in the KYA runner; it was not executed here. Current docs describe all
three limitations and the persistent-host path. The old MVP2 smoke acceptance
criterion is reopened. Production repairs are outside this documentation change.

The full runtime gate was **not rerun for this documentation change**. Its
last verified implementation remains `ea18f4e`: 2,625 passed, 0 failed,
12 declared integration skips. That evidence is explicitly identified as the
prior implementation gate, not recounted as tests of this documentation tree.

## Local raw evidence hashes

- `/tmp/ao-docs-red.log`: `76b6f24c0da5597a33040f8e55347a99c362c07721fadd5a3690736ef80a48be`
- `/tmp/ao-docs-structure.log`: `c801661350d2d290a149af602bdb945437107103701d4adb5ba7cbae9e5b6a6d`
- `/tmp/ao-docs-final-focused.log`: `aa68f0ee5faf8ae27ee893082ece61fb3f94e2323868fc15238ac71dcacf1afd`
- `/tmp/ao-docs-catalog.log`: `f247ba00e8b10dcfade81b5f95030eb35397a0ec8a7f3437cedefc2f66f54d46`
- `/tmp/ao-docs-smoke-mcp.log`: `c292e9cbb1c2881b5e585bde9d59a2663b0f9ea049f92f2a1dfc9d44b554d037`
- `/tmp/ao-docs-smoke-mvp2.log`: `8294c196c6b0ac493344988514665822fd0d3f835a70199ee6d5e39d680d2069`
- `/tmp/ao-docs-e2e.log`: `b84c06b51904ee07464f1f10f0d4f41a690307f4fb9a1fe41d0c0e56b4d1825f`

## Integration boundary

The verdict binds the named tree plus additive review/index evidence. Only an
independent OK permits commit/merge. Verify the merge tree, author/committer,
normal push, and remote main SHA separately. No tag/release is requested.
