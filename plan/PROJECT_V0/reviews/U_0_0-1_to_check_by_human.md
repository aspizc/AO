# U/0/0 Trial 1 - Human Check

## Decision Needing Human Review

The U/0/0 task pseudocode expects sharing a raw restricted artifact to the orchestrator and receiving a sanitized result. The accepted N/0/2 visibility matrix says:

- `claude-code` / `orchestrator` is denied raw restricted diffs.
- `claude-code` / `orchestrator` may read sanitized internal diffs.
- `claude-code` / `reviewer` receives a sanitized replacement when requesting raw restricted diffs.

I implemented the E2E according to the accepted N/0/2 matrix instead of the U/0/0 pseudocode.

## Impact

The E2E still verifies the required invariant: raw restricted content never crosses to the orchestrator. It also proves the reviewer path can receive sanitized replacement from raw restricted input.

## Human Review Question

Please confirm whether U-stage documentation and acceptance wording should be updated to match the N/0/2 visibility matrix, or whether the policy should change so orchestrator raw requests return sanitized replacement instead of denial.
