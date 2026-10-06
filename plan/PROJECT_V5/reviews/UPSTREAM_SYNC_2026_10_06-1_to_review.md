# Public upstream integration — review request 1

- Base commit: `9c22fb1e1d366c0b2da8891a86808c38cb360c1a`.
- Candidate implementation tree: `46b45bb78846ad775a1ad54a8a9f763007e93af5`.
- Source candidate: `393b056eeaefa0fc421c2f1fa4ba329def9ed97c`; snapshot baseline `30430e5`.
- Trace: `tr-ao-sync-1006-9b8c35ca-2590-4513-8115-67f5ab168316`.
- Status: implemented and verified within the declared skip budget; independent verdict pending.

## Authorized outcome and implementation

Import committed, reusable upstream improvements into public AO and push after
review. The operator explicitly authorized functional policy edits and session
agents because Gateway spawning rejected the AO path. Commit author and committer
email must be `carlos.aspizc@gmail.com`. Source working changes are excluded.

The candidate imports portable coordination lifecycle/consumer/ACK handling,
process supervision and relay, doctor/bootstrap, release verification, optional
providers, their tests/contracts/migrations, documentation and historical evidence.
It preserves AO branding, MIT/Carlos metadata, public sol/fable defaults, existing
repository registrations/restricted allowlists, published skills and CI protections.
Antigravity permission bypass is explicit opt-in. Personal source configurations,
memories, repository registrations, model preferences and uncommitted files were
not copied. Imported historical review emails were explicitly redacted, preserving
original commit identifiers and verdicts. No corporate ownership notice was found;
valid third-party license notices and negative portability canaries remain.

Seven npm and five Python packages were patched against primary advisory evidence.
The exact graph contains 210 components and zero advisory entries, with no waivers.
LangGraph 1.2.5/SDK 0.4.4 replaces the vulnerable incompatible old pin after an
isolated 81-pass/3-explicit-skip compatibility run. The reproducible lock cutoff,
bootstrap digest contract, metadata, SBOM, licenses and advisory bindings agree.

CI builds the existing pinned tmux package from its verified public source archive
using the existing offline Docker builder. Its real retained-channel probe is now
required; its isolated fixture selects its own server label. Redis runs as a
separate disposable 7.2 service. Original tmux isolation and failure reporting remain.

## TDD and verification

- Antigravity emitted argv/launch permissions: RED 3 failures, GREEN 10 passes.
- Configuration exact opt-in: RED 1 failure, GREEN 22 passes.
- Security dependency assertions: RED 3 failures, GREEN 4 passes.
- Bootstrap/public expectation repair: RED 14 structure and 2 Node failures;
  GREEN 119 structure and 6 Node passes.
- CI environment exact mapping: RED 1 failure, GREEN 8 passes.
- Real retained tmux probe: cross-server failure reproduced; fixture label bound;
  GREEN 1 pass, zero skips, all capture/move/retire/cleanup assertions retained.

The first full gate reported 2,549 passed, 69 failed and 13 skipped. Causes were
stale public/default expectations, the duplicated old bootstrap cutoff, testing
new assets against old HEAD, stock tmux and a Redis test-process lifecycle issue.
The second gate isolated the last CI mapping and real-probe server-label failures.
Neither failing run is represented as a success.

Final command: `bash scripts/ci.sh`, exit **0**, on an isolated Git checkout whose
HEAD tree is byte-identical to the staged candidate above. This is necessary for
portability tests that archive HEAD. It uses its own Python environment, copied
exact Node dependencies, verified tmux, and disposable Redis. The scratch fixture
commits are not integrated or published.

Final result: **2,619 passed, 0 failed, 12 skipped, 2,631 total; errors=[]**.
The truthful aggregate status is `infrastructure_unavailable`: nine declared
Gateway integration skips, three LangGraph integration skips, and the optional
real-provider suite unavailable. All available required lanes, including real
Redis and the pinned tmux probe, completed. The declared skip budget was unchanged.
Exact suite results and skipped IDs are in
[the machine-readable gate evidence](UPSTREAM_SYNC_2026_10_06-1_gate.json).
No live external-provider, PostgreSQL or Temporal support/release claim is made.

Policy validation, lock input binding, release repository verification, whitespace
checks and bounded credential/ownership scans passed. The independent reviewer
must verify final corrections, gate evidence, retained public scope, and issue a
separate verdict. Later changes may only add/index this review evidence; any
production change requires renewed verification. No integration/push has occurred.
