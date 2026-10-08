# A/0/05 trial-4 operator-run live acceptance

Date: 2026-10-08. Candidate: the independently reviewed uncommitted A/0/05
feature tree on `6317df1`. Runtime: Linux local stdio/SQLite, Node
22.22.1, Codex 0.160.1 with `gpt-6.1-sol`/medium/priority, and pinned tmux
`3.6a-agents.1` (SHA-256
`d4fa7abcfee5bd7d8688b8ffc2b489cd5faca56411e033625d6a0ba8b5346d21`).
The disposable repository, SQLite state, socket and transcript remain in the
ignored private `workspace/a05-live-acceptance/run-56bff9322b95/` directory.
No credential values or private runtime transcript are published here.

The first run (`run-f6b7d8f0d1b3`) stopped before a prompt because the local
harness compared the model banner case-sensitively. It reported
`FAILED_NOT_PASS`, cleaned its exact owned processes and verified an unchanged
protected inventory. The harness comparison was corrected to accept the
displayed `GPT-6.1-Sol medium` spelling; this is harness-only, ignored code.

The second run (`run-56bff9322b95`) exited **0** with
`LIVE_SEQUENCE_OBSERVED_OPERATOR_ACCEPTED`,
`EXACT_OWNED_IDENTITIES_ABSENT` cleanup and `UNCHANGED` protected inventory.
It used a real Codex executable in an isolated tmux server and a real Node
MCP Gateway with private SQLite state. The first Gateway created the trace,
task and session; `agent.ask`/`agent.view` observed a nonce-reversal response.
The harness signalled only the exact original Gateway PID, verified the Codex
process/pane/server survived, started a second Gateway with the same UID,
machine and state, saw discovery without ownership, observed protected
pre-reattach denials, then explicitly called `orchestration.reattach`.
The result returned exactly the original task and session IDs with no skipped
sessions. A second nonce-reversal answer was observed via both `agent.view`
and the same pane. Two real response observations and four actual Codex
runtime checks are in the private transcript. The stored expiry was unchanged.

**Feature-branch limitation:** this branch forks before A/0/04's guarded
prompt-submission integration. Each `agent.ask` pasted the inspected exact
challenge, but it stayed as a draft. The operator sent one Enter to the
bound private pane for each prompt, recorded in the private interventions
file. This proves A/0/05's live restart and reattach path, but does not prove
automatic A/0/04 prompt submission on this feature branch. The integrated
candidate must be retested with the `.3` runtime and no manual Enter.

Private evidence bindings (SHA-256):

- `recovery-cleanup.json`: `e6e617c039f02434e876c053e83cbcc2781521c62db0651637b7ec6dfb664e13`
- `evidence.jsonl`: `572af2fceb0dd4f6fbcd059f327230dc29c61d6e96238c1c12d21a9e485b9000`
- `operator-interventions.jsonl`: `957f7e9e961bbad29524351c0759f9ee4183299c06437f5b44304d4a83a94bbe`
- protected inventory before and after: identical SHA-256
  `6676ae5612a8367562c57dd50816fb2c40009928036640b5cca91934bb124691`

This is operator-run feature acceptance, separate from the full feature gate,
independent source review, serial integration and release. The private files
are intentionally not committed or pushed.
