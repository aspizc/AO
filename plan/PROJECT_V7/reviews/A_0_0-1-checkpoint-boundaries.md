# V7 A/0/00 Trial 1 boundary checkpoint

First GREEN: Python 24 passed, Node host 12 passed, no skips. Retained failed
attempts: MCP lazy import encountered the test's Popen replacement (typing
subscription); test now imports the runtime before installing the effect
guard. Sandbox Node spawnSync returns EPERM: failed sandbox results remain
evidence and do not count as passes. Host verification is separately recorded.
Removing inherited NODE_TEST_CONTEXT alone did not resolve sandbox EPERM.

Additional TDD identified and corrected three boundaries: JSON Schema accepts
integral floats as integers, but this contract requires Python/JSON integer
values; a dangling symlink must not qualify as an absent write leaf; provider
presence must use the adapter's executable binding, not its provider ID.
RED outputs are immutable boundary/provider/dangling evidence files.

Remaining: final focused verification, lint and whitespace checks, runnable
example checks and candidate manifest/handoff. No independent verdict, commit,
shared CLI/CI/status/index update or full gate has been performed.
