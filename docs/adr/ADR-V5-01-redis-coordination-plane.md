# ADR-V5-01 - Redis coordination plane

Date: 2026-07-25
Status: accepted

## Context

Independent orchestrators, agents, and supervised sessions need a small
coordination plane for ephemeral identity, discovery, and addressed delivery.
The repository already has two adjacent mechanisms, but neither has that
contract:

- `agents:events` is a sanitized audit and observability mirror.
- `message.*` is a legacy, trace-scoped persistent message API.

Changing either mechanism in place would mix observability, durable domain
state, and transient coordination. It would also make existing consumers
interpret message bodies as audit metadata or change the legacy MCP contract.

Project V5 therefore adds an independent, versioned Redis namespace and an
additive `coordination.*` API.

## Decision

### Separate namespaces and authority

`agents:events` keeps its existing meaning. It remains a best-effort,
body-free observability mirror and is not a queue, presence registry, or
authorization source.

The coordination plane defaults to the prefix `agents:coord:v1`. Redis is the
authority only for:

- leased participant presence;
- participant inbox Streams and pending deliveries;
- send idempotency records; and
- body-free coordination metadata events.

This authority is deliberately ephemeral. Redis does not become the authority
for orchestration sessions, tasks, artifacts, approvals, policy decisions,
repository state, audit history, merge authority, review verdicts, or workflow
closure.

If Redis is not configured or cannot be reached, coordination operations fail
explicitly with `COORDINATION_UNAVAILABLE`. Other Gateway tools continue to
work. There is no silent in-memory or `message.*` fallback because such a
fallback would give callers inconsistent discovery and delivery semantics.

Coordination has three deliberately separate observability paths:

- the coordination wire Stream at `<configured-prefix>:events`, containing
  body-free protocol metadata;
- allowlisted `COORDINATION_*` service events appended JSONL-only; and
- generic coordination `MCP_TOOL_CALL` events appended JSONL-only when Gateway
  telemetry and tool-call audit are enabled.

The latter two use the local-only audit writer and do not publish to
`agents:events`. Existing tools retain their current JSONL plus optional
`agents:events` publisher path.

### One service contract, two supported call surfaces

The MCP tools and the importable Node service call the same coordination
service:

```text
MCP client --------------------> coordination.* tools ---+
                                                        |
trusted local Node client ----> coordination service ---+--> Redis
```

The additive MCP surface is:

1. `coordination.status`
2. `coordination.register`
3. `coordination.heartbeat`
4. `coordination.discover`
5. `coordination.unregister`
6. `coordination.send`
7. `coordination.receive`
8. `coordination.ack`

MCP adds a strict structural Zod layer before the shared service. A failure in
that layer normally returns `INVALID_INPUT`; lease validation is deliberately
mapped to `COORDINATION_INVALID_INPUT` with the field and exact effective
limit. Direct calls and Zod-valid MCP calls then
use the same domain validation, lease checks, scope checks, classification
rules, idempotency behavior, and envelope. A domain rejection throws
`CoordinationError` with a stable `COORDINATION_*` code directly, and MCP
serializes that same code into its tool error result. The supported direct
entry point is `createCoordination` from `gateway/src/coordination.js`; it
constructs the same service used by the MCP registry. The legacy `message.*`
tools are not renamed, wrapped, or migrated.

`coordination.status` is the unauthenticated, read-only readiness surface. It
uses Redis `PING` and returns the protocol version, canonical scope, safe queue
descriptor, and lease limits without exposing a URL or credential. It creates
no participant, changes no Redis coordination state, and emits no coordination
domain event.

Raw Redis access is wire-level interoperability, not a third policy surface. It
is allowed only inside the trusted-local boundary described below. A raw Redis
writer can bypass application validation and therefore cannot claim MCP/service
parity.

### Managed orchestrator lease lifecycle

The direct module also exports `createOrchestratorCoordinationClient`, a
trusted-local lifecycle adapter over the public service contract. It does not
add a ninth MCP tool, a second server, a policy boundary, or a Redis wire
variant.

The profile calls status before its first registration, validates the protocol
and canonical scope, forces participant type `orchestrator`, and rejects a
returned identity that changes that type or scope. It keeps the plaintext lease
token in private process memory and injects credentials only into discover,
send, receive, and transport ACK. It schedules heartbeat at 50% of the
effective lease with bounded jitter. Known authentication, expiry, or
lease-fence loss starts one epoch-fenced re-registration flight. Transient
heartbeat and registration failures use a finite exponential backoff and
become `degraded` after exhaustion; there is no infinite retry or implicit
scope fallback.

User actions are never retried by the profile. An action may have crossed the
service boundary before its error became visible, so replaying it would weaken
the existing idempotency and at-least-once contracts. A lease-loss error can
start background identity recovery, but the original action still fails and
the caller decides whether its semantic identifier makes a later retry safe.

The public lifecycle states are `starting`, `ready`, `degraded`, `rejoining`,
and `stopped`. Status includes only safe identity/timing fields, bounded retry
metadata, safe error codes, and recovery guidance. It excludes the lease token,
registration metadata, queue credentials, and raw exception messages. The
factory is reusable, while each returned client instance is single-use. Stop is
terminal, bounded, and idempotent: it cancels local scheduled work, advances
the epoch, attempts authenticated unregister without waiting indefinitely, and
best-effort unregisters any replacement registration that completes after the
stop boundary. Pending dependency calls are not assumed cancellable; their
late results are fenced from lifecycle state.

### Leased participant identity

A participant is an ephemeral identity of type `gateway`, `orchestrator`,
`agent`, or `session`. Every Gateway instance has one canonical non-secret
scope from `AGENTS_COORDINATION_SCOPE_ID`, defaulting to
`agents-orchestrator`. Registration may omit `scopeId` and inherit that value,
or repeat it exactly; a different value fails with
`COORDINATION_SCOPE_MISMATCH` before Redis is written. Registration may also
include a display name, capabilities, and bounded scalar metadata. The service
always generates the public ID as `pt-<uuid>`; callers cannot supply or reuse a
participant ID through the public registration contract.

Registration returns:

- the public participant fields at the top level;
- a high-entropy lease token; and
- a non-secret `queue` descriptor containing the active prefix, metadata
  Stream, and consumer-group name.

The plaintext lease token is returned only by registration. Redis stores its
digest, never the plaintext token. All later operations authenticate with
`participantId` plus the lease token. The service uses constant-time digest
comparison and reports authentication failures without exposing stored
digests.

Service authentication is followed by a Redis authorization fence. Every
authoritative mutation or data-returning read compares the authenticated
participant's expected lease-token digest and `scopeId` with current presence.
This prevents a stale call from mutating or reading a replacement participant
that reuses the same public ID. Nonblocking operations compare inside their
authoritative operation. A blocking receive compares before and after
`XREADGROUP`; a failed post-check returns no messages and leaves any claimed
entry pending for a later valid consumer.

Lease timing is hybrid. Redis enforces presence lifetime with a relative `PX`
Redis TTL measured by the Redis server. The Gateway clock produces
`registeredAt`, `lastHeartbeatAt`, and `leaseExpiresAt` and performs the
service-side expiry precheck. Clock synchronization between Gateway hosts and
Redis is therefore an operational requirement; v1 does not fetch Redis `TIME`
to construct those timestamps. `heartbeat` may renew the lease up to the
configured maximum. The default is 900,000 ms (15 minutes), the default and
protocol-v1 maximum is 3,600,000 ms (one hour), and explicit lower operator
overrides remain authoritative. Excess values fail with
`leaseTtlMs exceeds maximum <effective-max>`. Any authenticated operation first
verifies that the lease is still active; normal traffic does not implicitly
make an expired identity valid.
Expired participants:

- are removed or filtered from discovery;
- cannot heartbeat, discover, unregister, send, receive, or acknowledge; and
- must register again and receive a new lease token.

`unregister` invalidates presence and credentials immediately. Redis TTLs are
still required so crashed participants disappear without an explicit
unregister. Presence expiry alone does not schedule the orphan inbox TTL:
cleanup is deferred until an authenticated discovery scans the stale candidate,
or until an explicit unregister handles that participant. Until then the stale
SET member and inbox may remain.

Discovery is scope-bound. By default a participant discovers only active peers
with the same `scopeId`; an explicitly supplied different scope is rejected
with `COORDINATION_SCOPE_MISMATCH`. Discovery returns public participant fields
and never returns lease tokens or token digests.

### Notice and evidence roles

Coordination messages carry ephemeral notices, wake-ups, routing, and pointers.
Decisions, review dispositions, accepted baselines, and closure evidence are
new artifacts created through the Gateway artifact API; a coordination message
may reference the artifact ID and digest. Artifacts are append-only at the
Gateway API boundary—revisions create successors—but this is not a WORM or
cryptographic-immutability guarantee. Neither a message nor an artifact
reference grants authority to execute, approve, review, merge, or close work.

### Key model

For the default prefix `agents:coord:v1`, v1 reserves:

| Redis key or name | Type | Purpose |
|---|---|---|
| `agents:coord:v1:participants` | set | Candidate participant IDs; stale members are removed during discovery |
| `agents:coord:v1:presence:<participant-key>` | JSON string with PX | Public participant fields, lease timestamps, and private lease-token digest |
| `agents:coord:v1:inbox:<participant-key>` | Stream | Addressed message deliveries for exactly one participant |
| `agents:coord:v1:dedupe:<sender-key>:<message-key>` | JSON string with PX | Canonical envelope and original delivery ID for bounded idempotent retry |
| `agents:coord:v1:acked:<participant-key>:<delivery-key>` | string with PX | Recipient-scoped tombstone for bounded idempotent transport ACK |
| `agents:coord:v1:events` | Stream | Body-free participant and delivery metadata |
| `coordination-v1` | consumer group | Group created independently on every participant inbox Stream |

Every dynamic key component is UTF-8 percent encoded with semantics equivalent
to JavaScript `encodeURIComponent`. The unencoded identifier remains in stored
fields. Encoding each component prevents an allowed `:` inside an identifier
from aliasing adjacent components. Implementations must use the configured
prefix everywhere and must not derive coordination keys from
`AGENTS_REDIS_STREAM`.

Presence JSON contains the protocol version, `participantId`, `scopeId`,
`participantType`, optional `displayName`, `capabilities`, `metadata`,
`registeredAt`, `lastHeartbeatAt`, `leaseExpiresAt`, and the lease-token
digest. Its TTL follows the lease. The digest is private and never appears in
public results, metadata events, JSONL audit, or telemetry.

Each inbox Stream entry has one field named `envelope`, whose value is the
serialized version 1 envelope:

- `protocolVersion`
- `scopeId`
- `messageId`
- `fromParticipantId`
- `toParticipantId`
- `messageType`
- `classification`
- `body`
- `createdAt`
- optional `traceId`
- optional `correlationId`
- optional `replyToMessageId`

The service derives `scopeId`, `fromParticipantId`, and `createdAt`; callers
cannot use those fields to impersonate another sender or backdate a message.

Each metadata Stream entry has one field named `event`, whose value is
serialized JSON. The shipped Redis adapter emits exactly
`participant.joined`, `participant.heartbeat`, `participant.left`,
`message.sent`, and `message.acked`. It does not emit
`participant.expired`, `message.received`, or `message.reclaimed`; discovery
and receive/reclaim observability is available only through the allowlisted
local JSONL service audit.

The metadata Stream never contains a message body, plaintext lease token,
token digest, participant metadata, secret, prompt, raw artifact, or restricted
content. Lifecycle scripts require their joined/heartbeat/left event append to
succeed before changing presence. Send and ACK treat their metadata append as
best effort after the authoritative delivery mutation. Protocol v1 applies no
automatic retention limit to this metadata Stream, so operators must monitor
its memory separately from inbox capacity.

The dedupe value is serialized JSON containing exactly `envelope` and
`deliveryId`. An ACK tombstone stores the string `1` under the
recipient-scoped key for its configured TTL.

### Addressed, at-least-once delivery

Every participant owns a separate inbox Stream and a `coordination-v1`
consumer group. `coordination.send` validates both leases and requires sender
and recipient to share a scope before it appends to the recipient inbox.

Delivery is at least once:

- new work is read through `XREADGROUP`;
- each service process uses an explicit `consumerId`;
- an entry stays pending until `coordination.ack` succeeds;
- abandoned pending entries become reclaimable after the configured idle
  interval, using `XAUTOCLAIM` or equivalent behavior; and
- receivers must make semantic processing idempotent because a crash after the
  side effect but before transport acknowledgment causes redelivery.

The Redis Stream entry ID is the `deliveryId`. Acknowledgment is scoped to the
authenticated participant inbox. A participant cannot acknowledge an entry
owned by another inbox. One atomic ACK operation validates the participant
fence and every requested ID before it mutates anything. Pending entries are
removed with `XACK` plus `XDEL`, freeing capacity. A recipient-scoped tombstone
makes an exact retry idempotent during the configured ACK window. An unknown
or cross-inbox ID fails with `COORDINATION_DELIVERY_NOT_FOUND`; after the
tombstone expires, an old retry is intentionally unknown.

The configured inbox length is a retention and backpressure bound, not
permission to discard pending work. Send checks `XLEN` atomically and returns
`COORDINATION_INBOX_FULL` at capacity. Inbox `XADD` never uses blind `MAXLEN`.
Only validated ACK removes entries, so pending or unread work is never silently
trimmed.

### Message idempotency

A caller may supply `messageId`; generated IDs use the `cm-` prefix. A retry
from the same sender with the same `messageId` and the same canonical envelope
returns the original delivery result and does not append a second entry.

Reuse of the same sender/message ID with a different target, type,
classification, body, scope, trace, correlation, or reply relationship fails
with `COORDINATION_MESSAGE_CONFLICT`.

This guarantee is bounded by `AGENTS_COORDINATION_DEDUPE_TTL_MS`, which defaults
to 24 hours. An equal retry renews the window. After it expires, the
at-least-once contract permits another delivery with the same message ID;
consumers therefore keep semantic processing idempotent by `messageId`.
Transport ACK retry is independently bounded by
`AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS`, also 24 hours by default.

### Content and authority boundary

Coordination messages are untrusted input. They are never executed
automatically and never grant permission. The service accepts only
`unrestricted` and `internal` bodies, enforces the byte limit, and rejects
`restricted` or detected secret-bearing content.

References to an artifact, path, commit, task, approval, or session are data,
not capabilities. Any operation that changes repositories, sessions,
artifacts, approvals, merge state, review verdicts, or workflow closure still
uses the existing Gateway tool and policy surface.

This distinction also applies to the KYA collaboration convention:

- presence `JOIN` maps to `coordination.register` and a body-free joined
  metadata event;
- addressed protocol messages use `messageType` values `JOIN`,
  `CHANGE_REQUEST`, `IMPACT_NOTICE`, `RESPONSE`, and `ACK`;
- a semantic `ACK` is an ordinary coordination message linked with
  `correlationId`, `replyToMessageId`, and, when applicable,
  `parent_artifact_id` inside the JSON body;
- `coordination.ack` only acknowledges Redis transport delivery; and
- no participant shares a legacy `messageAccessToken`.

Exclusive ownership of files or scopes remains an application convention.
Coordination can announce and negotiate ownership but cannot transfer it,
authorize a merge, declare a verdict, or close work.

### Direct-access trust boundary

The direct Node service is intended for trusted local processes and retains
service validation. Raw Redis access is more privileged: a client with write
access to the coordination prefix can forge fields or bypass content checks.

The supported default boundary is one operator on one trusted machine, with
Redis reachable only from that machine or its private container network.
Protocol v1 is acceptance-tested against Redis 7 standalone and supports an
equivalent single-shard endpoint. Redis Cluster is outside v1 because its
authoritative `EVAL` scripts span participant, inbox, dedupe, tombstone, and
metadata keys. Redis Sentinel discovery and automatic failover configuration
are also outside the v1 factory contract.

That acceptance is a required CI lane rather than an operator opt-in. Each
remote matrix job uses a health-checked disposable Redis 7.2 standalone
service. The lane runs independent clients through repeated send contention,
replacement/expiry fences, pending reclaim, all-or-nothing ACK, and bounded
tombstone behavior. It rejects skips, zero tests, the wrong Redis
version/topology, or keys left under the isolated test namespace. A missing
local test URL is reported as unavailable required infrastructure and returns
nonzero without contacting a shared Redis instance.

Outside that boundary, deployments must use all of:

- dedicated Redis credentials and least-privilege ACLs;
- TLS (`rediss://`) with certificate validation;
- network isolation and no public Redis listener;
- separate prefixes or Redis databases for trust domains; and
- the MCP/direct service path for untrusted clients.

Basic Redis key ACLs cannot both let an arbitrary peer write every possible
recipient inbox and prevent that peer from forging other senders. Consequently,
raw multi-tenant writes are not supported. A deployment needing that model must
put an authenticated relay/service in front of Redis.

The shipped adapter sends inline `EVAL` scripts through two clients owned by
each service instance: one persistent multiplexed command client and one
persistent serialized blocking client. Both connect lazily. Command
concurrency, command waiters, blocking waiters, and graceful shutdown are
bounded; there is no process-global client singleton.

Node-redis offline queuing and automatic reconnect are disabled. A transport
failure never causes the adapter to replay the dispatched semantic operation.
It invalidates and destroys that lane, returns the safe unavailable error, and
allows only a later caller to perform one coalesced reconnect. Orderly
service/Gateway shutdown stops admission, rejects queued work, drains to the
configured deadline, then advances a lane-owned shutdown epoch before
destroying its owned clients. Every admitted operation carries that epoch: an
unsettled caller receives `COORDINATION_UNAVAILABLE` at the deadline, while
its eventual transport result or error is consumed and cannot cross the
shutdown fence. A destroy attempted while connect is pending does not suppress
the required cleanup if that client later becomes open. Client errors and
listener cleanup cannot alter fencing or result semantics.

The lane's in-flight connect promise is authoritative until its handshake
settles. Node-redis may report `isOpen` while `isReady` is still false, so the
adapter never uses `isOpen` as successful-handshake evidence. Only the
lane-owned `ready` state permits dispatch. Cleanup attempts are deduplicated by
connection generation and lane phase; a connecting-phase destroy therefore
cannot suppress the post-handshake destroy required by a concurrent close.

The adapter does not publish script hashes or expose a supported raw ACK/send
helper. A client in another language may interoperate only by implementing the
complete documented wire operation, including every fence and atomic mutation;
plain `XADD` or `XACK` is not service-equivalent.

`rediss://` delegates certificate verification to node-redis and the host
system trust configuration. The v1 environment surface does not expose custom
CA or client-certificate options. ACL and TLS deployments are required outside
the trusted-local boundary but are not covered by the automated acceptance
suite; operators must validate them in their target environment.

## Consequences

- Independent local orchestrators and sessions can discover and communicate
  without changing `message.*`.
- Presence and delivery disappear with Redis data loss or eviction by design;
  durable business records remain elsewhere.
- Clients must heartbeat, poll at useful checkpoints, process idempotently,
  and acknowledge deliveries explicitly.
- Operators must monitor pending entries, lease expiry, safe retention, Redis
  memory (including the unbounded metadata Stream), clock synchronization, and
  rejected coordination operations.
- Direct Node clients can share behavior with MCP without duplicating policy
  or validation.
- Raw Redis interoperability is possible, but its trust and operational costs
  are explicit.
- Healthy calls reuse per-service connections; bounded admission fails
  explicitly instead of growing an offline/in-memory queue without limit.
- A failed non-idempotent operation is never transport-retried. Callers choose
  whether a later request is safe under the documented message/ACK contracts.
- The required live lane proves the Redis-specific race contract on every
  remote CI matrix job; fake-client tests remain complementary unit evidence.
- `agents:events` consumers remain compatible because coordination uses a
  separate prefix and coordination service/tool-call audit uses the JSONL-only
  writer instead of the legacy Redis publisher.
