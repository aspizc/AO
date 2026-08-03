# Node runtime support

The `engines.node` field in
[`gateway/package.json`](../gateway/package.json) is the single source of truth
for the supported Node.js runtime. It currently admits Node 22 starting at
22.13.0 and the Node 24 release line. Earlier Node 22 versions, Node 20, odd
release lines, and future majors are unsupported until that field changes.

The other runtime surfaces deliberately derive from or verify that contract:

- `gateway/package-lock.json` is the npm-generated mirror of the root package
  metadata.
- `gateway/.npmrc` enables `engine-strict`, so npm installation fails on an
  unsupported runtime instead of emitting only a warning.
- `.github/workflows/ci.yml` samples the lower supported Node 22 boundary and
  Node 24 through one matrix while running the same repository gate.
- `tests/structure/test_node_runtime_contract.py` protects the accepted and
  rejected boundaries and checks parity between these surfaces.

Dependency installation uses `npm --prefix gateway ci`; the authoritative
suite inventory and clean-install procedure live in the
[CI contract](ci-contract.md). Neither local nor remote CI regenerates the npm
lockfile.

Node's test runner uses process isolation, which is the default on supported
runtimes. The Gateway test command therefore keeps serial execution with
`--test-concurrency=1` without carrying an obsolete isolation flag.
