# Cooperative local wave capacity

V7's capacity foundation provides a locked ledger API and
`agent-run wave budget-init`. Automated wave dispatch is still planned;
creating a budget does not launch work or make existing independent agents
use it. Cooperating callers must reserve before each effect.

## Initialize host limits

Use a private local directory outside project worktrees. On a supported
POSIX host with local filesystem locking and atomic replacement:

```bash
ao_runtime_dir="$(mktemp -d)"
cat > "$ao_runtime_dir/limits.json" <<'JSON'
{
  "gatewayInstances": 2,
  "agentSessions": 2,
  "checkProcesses": 1,
  "providerSessions": {"codex": 2},
  "memoryMiB": 8192,
  "memoryHeadroomMiB": 2048
}
JSON
agent-run wave budget-init \
  --budget "$ao_runtime_dir/budget.json" \
  --limits "$ao_runtime_dir/limits.json" --json
```

These numbers are illustrative host configuration. Choose them for the
machine and expected tasks. Every cooperating runner must use the same
canonical ledger. The example allows 6144 MiB of declared concurrent
reservations; it does not measure available RAM or enforce an OS memory cap.
Gateway, session and check declarations must include their expected child
process peaks. A provider absent from the map has zero capacity.

The budget and stable sibling lock are mode `0600`. Their immediate directory
must be private and owned by the current user. Symlink/hardlink targets,
unsafe ancestor permissions and unsupported primitives fail closed. Repeating
initialization with identical limits is idempotent; different limits are
rejected. Do not replace a ledger to work around retained reservations.

## API and recovery boundary

`orchestrator_langgraph.wave_budget` reserves the complete count/provider/
memory vector atomically. Callers record possible dispatch before launching,
then bind effect references. Failed vectors charge nothing. Possible or active
effects retain all capacity after crashes or lock release. Only the owning
run may release a reservation after known no effect or confirmed closure;
uncertain effects require reconciliation. A post-replacement durability error
may leave an observable charged record, so do not assume rollback.

Closed records remain for idempotence and count toward the 1024-record bound.
There is no TTL reclamation, force-reset command, PID killing, provider spend
meter or protection against arbitrary hostile callers. Shared accounting
does not grant Gateway, review, repository or coordination authority.

JSON errors use `wave-error/v1`. Exit 2 means invalid/configuration input;
exit 3 unsupported or unavailable state; exit 4 exhausted/busy/full; exit 5
recovery required. Later V7 sheets own automatic dispatch and recovery.
See [the capacity sheet](../plan/PROJECT_V7/A/0/01.md).
