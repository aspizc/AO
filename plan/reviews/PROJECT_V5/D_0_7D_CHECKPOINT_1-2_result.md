# Project V5 D/0/07d Checkpoint 1 — Trial 2 result: KO

Independent reviewer verdict: **KO**. Checkpoint 1 remains blocked.

## Authentication (passed)

- HEAD = `8e5104f3503bd2500e9d6ef22a73ecf96cd4b88b`; branch `review/V5-D-0-07d-cp1-t2c`; working tree clean.
- Declared candidate `b1e3877cc23fe045da10ab1ea087ba8afc8d816d` is a commit and is HEAD's parent (request parent).
- Candidate tree `0447a2b7c3476815b1d4aa5413e8c777a24b33df` matches the request.
- Diff base `a6dc840` → candidate touches exactly the four declared test files, with blobs `8d40b64`, `dd46b54`, `0a2f22d`, `eb175af` — all matching the request.

## Dispositive finding

The approved sheet (`plan/PROJECT_V5/D/0/07d.md` lines 5840–5865) makes the
byte-frozen V4 `PYTHON AUTHORITY_PARENT run cp1-unit-teardown` invocation
mandatory and first. Its form is:

```text
env -i LC_ALL=C LANG=C TZ=UTC PATH=/usr/bin:/bin PYTHON AUTHORITY_PARENT run \
  cp1-unit-teardown <red-odb> <C1-red> <C1-red-tree> <source> <toolchain> \
  <node-modules> <docker> <teardown-red-expectation-ledger> <teardown-red-review-base>
```

This command **cannot be formed** from any concrete bytes, paths, digests, or
deterministic construction supplied by the Trial 2 request or its tree:

- The two mandatory teardown operands `<teardown-red-expectation-ledger>` and
  `<teardown-red-review-base>` — plus `PYTHON`, `AUTHORITY_PARENT`, and every
  odb/`C1-red`/tree/source/toolchain/node-modules/docker operand — have no
  concrete binding anywhere in the request. Direct search of the request for
  `expectation-ledger|review-base|AUTHORITY_PARENT|red-odb|C1-red-tree`
  returned nothing.
- The candidate tree carries no such artifact: `git ls-tree -r` over
  `b1e3877` for `expectation-ledger|review-base|authority.?parent|
  cp1-unit-teardown` returned nothing. The tree changes only four
  `tests/gateway/` files, none an authority artifact, ledger, or review base.
- The request itself concedes (its "Explicitly not executed or credited"
  section) that the frozen V4 authority parent was not run and that the fresh
  reviewer "must independently extract and authenticate the frozen V4
  authority artifacts" — i.e., they are neither supplied nor deterministically
  reconstructable from this submission.

Per the task contract, an unformable mandatory authority command is
dispositive: the first and mandatory gate cannot be executed, so no candidate
evidence (the `19/19`, focused, Gateway, or wrapper full-CI runs) can stand in
for it. Broad gates were therefore not run.

## Verdict

KO. The mandatory AUTHORITY_PARENT cp1-unit-teardown gate is unformable from
the Trial 2 request/tree; Checkpoint 1 and D/0/07d stay blocked. A future
trial must supply, or deterministically bind, the frozen V4 authority parent,
its interpreter, and the concrete teardown expectation-ledger and review-base
operands so the mandatory gate can be executed.
