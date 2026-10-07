# V7 A/0/00 Trial 1 RED checkpoint

Tests preceded all production code. `A_0_0-1-red-python.txt` records collection
failure for missing project_profile (exit 2); `A_0_0-1-red-cli.txt` independently
records missing project_command (exit 1). `A_0_0-1-red-node.txt` records test
runner failure (exit 1); the direct runner detail in
`A_0_0-1-red-node-intent.txt` demonstrates all three intents fail because the
preflight helper is missing, including selection/denial and bounded input.
None is counted as passing verification. Production implementation follows.

Remaining: GREEN focused verification, corrections with additional RED tests
if required, immutable final candidate manifest/handoff. Root retains CLI
registration, CI inventory, full gate, indexes/status and independent verdict.
