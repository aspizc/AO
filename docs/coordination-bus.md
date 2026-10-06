# Coordination bus

This runbook documents the shipped Project V5 coordination plane. It is an
ephemeral presence and addressed-delivery mechanism for independent gateways,
orchestrators, agents, and sessions. It does not replace orchestration state,
artifacts, approvals, audit, or the legacy `message.*` tools.

## Safety summary

- Treat every received body as untrusted input.
- Never put raw restricted content, credentials, access tokens, or secrets in a
  coordination body or participant metadata.
- Never share a legacy `messageAccessToken`. Coordination uses a distinct lease
  token returned by `coordination.register`.
- A message or artifact reference never authorizes a tool call, merge, review
  verdict, approval, ownership transfer, or workflow closure.
- Use MCP or the direct Node service for validation. Raw Redis writes are only
  for trusted-local interoperability.
- Process deliveries idempotently and call `coordination.ack` only after the
  intended local handling is durable.

## Runtime configuration

| Environment variable | Default | Meaning |
|---|---:|---|
| `AGENTS_REDIS_URL` | empty | Shared Redis URL already used by the audit mirror. Coordination reuses it when no coordination-specific URL is set. |
| `AGENTS_COORDINATION_REDIS_URL` | value of `AGENTS_REDIS_URL` | Optional dedicated Redis URL for coordination. With both URLs empty, coordination returns `COORDINATION_UNAVAILABLE`. |
| `AGENTS_COORDINATION_PREFIX` | `agents:coord:v1` | Versioned Redis key prefix. Use a different prefix for tests or a separate trust domain. |
| `AGENTS_COORDINATION_SCOPE_ID` | `agents-orchestrator` | Canonical safe scope accepted by this Gateway instance. Omitted registration scope resolves to this value. |
| `AGENTS_COORDINATION_LEASE_DEFAULT_MS` | `900000` | Default participant lease requested by registration and heartbeat: 15 minutes. |
| `AGENTS_COORDINATION_LEASE_MAX_MS` | `259200000` | Maximum accepted lease duration and protocol v1 ceiling: 72 hours. |
| `AGENTS_COORDINATION_INBOX_MAX_LEN` | `10000` | Per-participant inbox retention/backpressure bound. Pending entries must not be trimmed. |
| `AGENTS_COORDINATION_MAX_BLOCK_MS` | `30000` | Server-side maximum duration of one blocking receive. |
| `AGENTS_COORDINATION_COMMAND_CONCURRENCY` | `64` | In-flight admission bound for the owned persistent command client. |
| `AGENTS_COORDINATION_COMMAND_QUEUE_MAX` | `256` | Maximum queued command operations before `COORDINATION_UNAVAILABLE` backpressure. |
| `AGENTS_COORDINATION_BLOCKING_QUEUE_MAX` | `32` | Maximum queued blocking receives behind the owned blocking client. |
| `AGENTS_COORDINATION_SHUTDOWN_TIMEOUT_MS` | `2000` | Graceful drain bound before active Redis calls are cancelled. |
| `AGENTS_COORDINATION_MESSAGE_MAX_BYTES` | `65536` | Maximum UTF-8 byte length of one message body. |
| `AGENTS_COORDINATION_DEDUPE_TTL_MS` | `86400000` | Idempotency window for equal sender/message retries; an equal retry renews it. |
| `AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS` | `86400000` | Window in which an exact recipient-scoped transport ACK retry is a no-op success. |
| `AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS` | `86400000` | Retention applied after explicit unregister, or after discovery detects a participant whose presence TTL has expired. |

Callers choose a non-negative `reclaimIdleMs` for recovery and the service caps
blocking receives at `AGENTS_COORDINATION_MAX_BLOCK_MS`. Coordination numeric
configuration is parsed with JavaScript `Number`; every configured value must
be a positive safe integer, and invalid values fail Gateway startup rather than
silently weakening a guarantee. The default lease must not exceed the
configured maximum, and the configured maximum cannot exceed 72 hours (`259200000` ms). The original
ADR-V5-01 records an earlier one-hour design limit; current runtime constants,
schemas, and boundary tests define the expanded limit documented here.

The generated MCP input schema advertises `body` as a string but does not
advertise a `maxLength`; the shared service is authoritative for its UTF-8 byte
limit. The Gateway config loader accepts
`AGENTS_COORDINATION_MESSAGE_MAX_BYTES=65536` and rejects any larger override,
and the shared service independently rejects a larger direct configuration.
That cap also keeps every accepted body within the persisted version 1 envelope
JSON Schema's 65,536-character maximum.

`AGENTS_REDIS_STREAM`, whose default is `agents:events`, does not configure the
coordination plane. A prefix must contain only letters, digits, colon,
underscore, and hyphen, must not end in a colon, and must not derive the exact
legacy `agents:events` key. Invalid prefixes fail before any Redis connection.

Minimal local configuration:

```bash
export AGENTS_REDIS_URL=redis://127.0.0.1:6379/0
export AGENTS_COORDINATION_SCOPE_ID=agents-orchestrator
```

Dedicated coordination Redis:

```bash
export AGENTS_COORDINATION_REDIS_URL="rediss://coordination-user:${COORDINATION_PASSWORD}@redis.internal:6380/4"
export AGENTS_COORDINATION_PREFIX=team-a:agents:coord:v1
export AGENTS_COORDINATION_SCOPE_ID=project:team-a
```

Do not place real credentials in committed shell files, MCP configuration, or
diagnostic output.

Lease timing is hybrid. Redis enforces presence lifetime using a relative
`PX` Redis TTL measured by Redis. The Gateway clock constructs
`registeredAt`, `lastHeartbeatAt`, and `leaseExpiresAt` and performs local
expiry prechecks. Keep clock synchronization enabled on every Gateway and
Redis host; protocol v1 does not call Redis `TIME` to derive the public
timestamps.

## Redis wire layout

With the default prefix:

```text
agents:coord:v1:participants
agents:coord:v1:presence:<participant-key>
agents:coord:v1:inbox:<participant-key>
agents:coord:v1:dedupe:<sender-key>:<message-key>
agents:coord:v1:acked:<participant-key>:<delivery-key>
agents:coord:v1:events
```

Each dynamic component used in a key is UTF-8 percent encoded with semantics
equivalent to JavaScript `encodeURIComponent`. For example, participant
`pt:abc` becomes `pt%3Aabc`. Stored fields retain the original `pt:abc` value.

Types and ownership:

| Name | Redis type | Important fields or behavior |
|---|---|---|
| `...:participants` | set | candidate participant IDs; discovery removes stale members |
| `...:presence:<participant-key>` | JSON string + PX | protocol/public identity fields plus private lease digest; TTL follows lease |
| `...:inbox:<participant-key>` | Stream | one `envelope` JSON field per entry; group name is `coordination-v1` |
| `...:dedupe:<sender-key>:<message-key>` | JSON string + PX | canonical envelope plus original `deliveryId`; configured retry window |
| `...:acked:<participant-key>:<delivery-key>` | string `1` + PX | recipient-scoped ACK retry tombstone |
| `...:events` | Stream | one `event` JSON field per entry; body-free metadata only |

Redis 7 standalone is the acceptance-tested v1 target; an equivalent
single-shard endpoint is supported. Redis Cluster is not supported because
authoritative scripts span presence, inbox, dedupe, tombstone, and metadata
keys. Redis Sentinel discovery and automatic failover configuration are not
part of the v1 factory.

Every state-changing or data-returning queue operation compares the
authenticated participant's expected lease-token digest and `scopeId` with
current presence. A stale call cannot mutate or read a replacement participant
that reuses the same public ID. Blocking receive compares the fence before and
after `XREADGROUP`; failed post-validation returns no message and leaves any
claimed entry pending for valid reclaim.

Inbox admission uses an atomic `XLEN` capacity check and never blind
`XADD MAXLEN`. ACK validates the complete batch before `XACK` + `XDEL`, then
creates recipient-scoped tombstones. This is the basis for the at-least-once,
backpressure, cross-inbox, and bounded ACK-retry guarantees.

Presence expiry deletes the presence key through its Redis TTL, but it does not
by itself expire the inbox or remove the candidate SET member. That cleanup is
deferred until an authenticated discovery encounters the stale candidate.
Explicit unregister performs the same SET cleanup and starts the orphan inbox
TTL immediately.

The Redis metadata Stream emits exactly:

- `participant.joined`
- `participant.heartbeat`
- `participant.left`
- `message.sent`
- `message.acked`

It does not emit `participant.expired`, `message.received`, or
`message.reclaimed`. Receive, reclaim, and discovery metadata is available in
the local JSONL service audit. The metadata Stream has no automatic retention
limit in v1 and must be monitored independently from inbox capacity.

Do not confuse the three observability channels:

| Channel | Contents | Destination |
|---|---|---|
| coordination wire metadata | the five body-free event types above | `agents:coord:v1:events`, or the configured-prefix equivalent |
| coordination service audit | allowlisted `COORDINATION_*` metadata | local JSONL-only audit |
| coordination MCP-call audit | minimal `MCP_TOOL_CALL` metadata when telemetry is enabled | local JSONL-only audit |

Coordination audit does not publish either JSONL-only path to `agents:events`.
Existing non-coordination audit retains its current optional legacy Redis
publisher.

The public participant representation is:

```json
{
  "protocolVersion": 1,
  "participantId": "pt-2e7bde28-d982-4ae8-a0c2-17a2361dcf35",
  "participantType": "orchestrator",
  "scopeId": "agents-orchestrator",
  "displayName": "orchestrator-codex",
  "capabilities": ["coordination.v1", "review"],
  "metadata": {
    "protocol": "KYA",
    "protocolVersion": "1"
  },
  "registeredAt": "2026-07-25T10:00:00.000Z",
  "lastHeartbeatAt": "2026-07-25T10:00:00.000Z",
  "leaseExpiresAt": "2026-07-25T10:15:00.000Z"
}
```

`displayName` is optional. Lease tokens and their digests are never public
participant fields.

The persisted message envelope is:

```json
{
  "protocolVersion": 1,
  "scopeId": "agents-orchestrator",
  "messageId": "cm-3fbb5212-93be-4a4c-8a3a-d83620bec9bb",
  "fromParticipantId": "pt-sender",
  "toParticipantId": "pt-recipient",
  "messageType": "IMPACT_NOTICE",
  "classification": "internal",
  "body": "{\"paths\":[\"gateway/src/tools/index.js\"],\"baseSha\":\"abc123\",\"evidence\":\"tool registry changed\",\"action\":\"refresh before editing\"}",
  "createdAt": "2026-07-25T10:01:00.000Z",
  "traceId": "tr-example",
  "correlationId": "change-gateway-tools",
  "replyToMessageId": "cm-parent"
}
```

`traceId`, `correlationId`, and `replyToMessageId` are optional. `body` is a
string; protocols that use JSON must serialize it before sending and parse it
only after validation.

## MCP contract

All tools return structured JSON. Except for status and registration,
authenticated calls require both `participantId` and `leaseToken`. Each MCP definition first uses a
strict Zod object schema for required fields, root types, and unknown fields;
those failures return `INVALID_INPUT`. Requests that pass that layer use the
same domain service as direct callers, whose semantic rejections use the same
`COORDINATION_*` code on both surfaces.

### `coordination.status`

Input is the strict empty object `{}`. The operation performs one read-only
Redis `PING`; it does not create a participant, mutate coordination state, or
emit a coordination domain-audit event.

```json
{
  "protocolVersion": 1,
  "status": "ready",
  "scopeId": "agents-orchestrator",
  "queue": {
    "enabled": true,
    "prefix": "agents:coord:v1",
    "eventsStream": "agents:coord:v1:events",
    "consumerGroup": "coordination-v1"
  },
  "limits": {
    "leaseDefaultMs": 900000,
    "leaseMaxMs": 259200000
  }
}
```

The response deliberately excludes the Redis URL and credentials. Use it
before registration to prove that the channel is reachable and to compare the
canonical scope seen by independent orchestrators.

### `coordination.register`

Input:

```json
{
  "participantType": "orchestrator",
  "displayName": "orchestrator-codex",
  "capabilities": ["coordination.v1", "review"],
  "metadata": {
    "protocol": "KYA",
    "protocolVersion": "1"
  },
  "leaseTtlMs": 900000
}
```

`participantType` is one of `gateway`, `orchestrator`, `agent`, or `session`.
`participantId` is always generated by the service as `pt-<uuid>`; it is not
an accepted registration input. `scopeId` is optional: omission uses
`AGENTS_COORDINATION_SCOPE_ID`; an explicit equal value is accepted and a
different value returns `COORDINATION_SCOPE_MISMATCH` before any Redis write.

Output:

```json
{
  "protocolVersion": 1,
  "participantId": "pt-2e7bde28-d982-4ae8-a0c2-17a2361dcf35",
  "participantType": "orchestrator",
  "scopeId": "agents-orchestrator",
  "displayName": "orchestrator-codex",
  "capabilities": ["coordination.v1", "review"],
  "metadata": {
    "protocol": "KYA",
    "protocolVersion": "1"
  },
  "registeredAt": "2026-07-25T10:00:00.000Z",
  "lastHeartbeatAt": "2026-07-25T10:00:00.000Z",
  "leaseExpiresAt": "2026-07-25T10:15:00.000Z",
  "leaseToken": "<returned-once-secret>",
  "queue": {
    "enabled": true,
    "prefix": "agents:coord:v1",
    "eventsStream": "agents:coord:v1:events",
    "consumerGroup": "coordination-v1"
  }
}
```

This is a flat result: the public participant fields are not nested. The
`queue` descriptor is non-secret and does not contain a Redis URL or
credential.

Store `leaseToken` only in process memory or an approved secret store. Do not
put it in participant metadata, Redis metadata events, logs, artifacts, or
messages.

### `coordination.heartbeat`

Input:

```json
{
  "participantId": "pt-2e7bde28-d982-4ae8-a0c2-17a2361dcf35",
  "leaseToken": "<secret>",
  "leaseTtlMs": 900000
}
```

The result contains the renewed public participant. Heartbeat before roughly
half the lease has elapsed and add jitter when many processes start together.
Redis enforces the renewed relative TTL, while the Gateway clock computes the
new `lastHeartbeatAt` and `leaseExpiresAt` fields.

### `coordination.discover`

Input:

```json
{
  "participantId": "pt-2e7bde28-d982-4ae8-a0c2-17a2361dcf35",
  "leaseToken": "<secret>",
  "participantType": "agent",
  "capability": "review"
}
```

Filters are optional. `scopeId` may be supplied only when it equals the
authenticated participant scope. The result is an array of active public
participants sorted by `participantId`, never credentials. The array includes
the authenticated caller when it matches the filters, so select a recipient by
ID rather than assuming the first row is a peer. Expired entries are filtered;
their candidate SET member is removed and their orphan inbox TTL starts during
that discovery.

### `coordination.unregister`

Input:

```json
{
  "participantId": "pt-2e7bde28-d982-4ae8-a0c2-17a2361dcf35",
  "leaseToken": "<secret>"
}
```

Use this during an orderly shutdown. After a crash, Redis TTL removes presence;
the next discovery performs the deferred candidate/inbox cleanup described
above.

Output:

```json
{
  "participantId": "pt-2e7bde28-d982-4ae8-a0c2-17a2361dcf35",
  "unregistered": true
}
```

An already absent participant returns `unregistered: false`. The input still
requires a syntactically valid credential pair, but there is no remaining
digest to authenticate after presence is gone.

### `coordination.send`

Input:

```json
{
  "participantId": "pt-sender",
  "leaseToken": "<secret>",
  "toParticipantId": "pt-recipient",
  "messageId": "cm-3fbb5212-93be-4a4c-8a3a-d83620bec9bb",
  "messageType": "IMPACT_NOTICE",
  "classification": "internal",
  "body": "{\"paths\":[\"gateway/src/tools/index.js\"],\"baseSha\":\"abc123\",\"evidence\":\"tool registry changed\",\"action\":\"refresh before editing\"}",
  "traceId": "tr-example",
  "correlationId": "change-gateway-tools",
  "replyToMessageId": "cm-parent"
}
```

`messageType` is a bounded protocol label. `messageId` is optional; when it is
omitted the service generates `cm-<uuid>`. Supply a stable message ID when a
caller may retry: the same sender, ID, and envelope are idempotent; a different
envelope with the same ID returns `COORDINATION_MESSAGE_CONFLICT`.
The equality guarantee lasts for `AGENTS_COORDINATION_DEDUPE_TTL_MS` and an
equal retry renews that window. Consumers still deduplicate semantic handling
by `messageId` because delivery is at least once and a retry after the window
may create another delivery.

The service derives the sender, scope, and creation time. It rejects an expired
sender or recipient, cross-scope delivery, `restricted` classification,
detected secrets, and an oversized UTF-8 body.

The result contains the normalized message, its Redis `deliveryId`, and whether
the result came from an idempotent retry.

### `coordination.receive`

Input:

```json
{
  "participantId": "pt-recipient",
  "leaseToken": "<secret>",
  "consumerId": "worker-1723",
  "count": 20,
  "reclaimIdleMs": 60000,
  "blockMs": 5000
}
```

The operation first makes eligible abandoned pending entries available to the
current consumer, then reads new entries. `count` defaults to 10 and is limited
to 100. Reclaim is disabled when `reclaimIdleMs` is omitted; zero is allowed.
`blockMs` defaults to zero (a nonblocking poll) and cannot exceed
`AGENTS_COORDINATION_MAX_BLOCK_MS`.

The result is an array. Example:

```json
[
  {
    "deliveryId": "1753437660000-0",
    "recovered": true,
    "message": {
      "protocolVersion": 1,
      "scopeId": "agents-orchestrator",
      "messageId": "cm-3fbb5212-93be-4a4c-8a3a-d83620bec9bb",
      "fromParticipantId": "pt-sender",
      "toParticipantId": "pt-recipient",
      "messageType": "IMPACT_NOTICE",
      "classification": "internal",
      "body": "{\"paths\":[\"gateway/src/tools/index.js\"],\"baseSha\":\"abc123\",\"evidence\":\"tool registry changed\",\"action\":\"refresh before editing\"}",
      "createdAt": "2026-07-25T10:01:00.000Z"
    }
  }
]
```

Duplicate delivery is expected. Deduplicate semantic work by `messageId` or by
the protocol correlation key, not only by `deliveryId`.

### `coordination.ack`

Input:

```json
{
  "participantId": "pt-recipient",
  "leaseToken": "<secret>",
  "deliveryIds": ["1753437660000-0"]
}
```

Output:

```json
{
  "ackedCount": 1,
  "deliveryIds": ["1753437660000-0"]
}
```

This is a transport acknowledgment. It removes the entries from the
participant consumer group's pending set. It does not mean that a change
request was accepted, an artifact was approved, or a workflow completed.
One call accepts 1-100 unique canonical Redis Stream IDs. An exact retry inside
the tombstone window succeeds with the same `deliveryIds` and
`ackedCount: 0`; an unknown, expired-tombstone, or cross-inbox ID fails the
complete batch.

## Direct Node service

Trusted local Node code uses the same service implementation as MCP:

```js
import { createCoordination } from "../gateway/src/coordination.js";

const coordination = createCoordination({
  config: {
    coordinationRedisUrl:
      process.env.AGENTS_COORDINATION_REDIS_URL
      || process.env.AGENTS_REDIS_URL
      || "",
    coordinationPrefix:
      process.env.AGENTS_COORDINATION_PREFIX
      || "agents:coord:v1",
    coordinationScopeId:
      process.env.AGENTS_COORDINATION_SCOPE_ID
      || "agents-orchestrator",
    coordinationLeaseDefaultMs: 900_000,
    coordinationLeaseMaxMs: 3_600_000,
    coordinationInboxMaxLen: 10_000,
    coordinationMaxBlockMs: 30_000,
    coordinationMessageMaxBytes: 65_536,
    coordinationDedupeTtlMs: 86_400_000,
    coordinationAckTombstoneTtlMs: 86_400_000,
    coordinationOrphanInboxTtlMs: 86_400_000,
  },
});

await coordination.status({});
const registered = await coordination.register({
  participantType: "orchestrator",
  capabilities: ["coordination.v1"],
});

const participants = await coordination.discover({
  participantId: registered.participantId,
  leaseToken: registered.leaseToken,
});
const peer = participants.find(
  ({ participantId }) => participantId !== registered.participantId,
);
if (!peer) throw new Error("no coordination peer is active");

await coordination.send({
  participantId: registered.participantId,
  leaseToken: registered.leaseToken,
  toParticipantId: peer.participantId,
  messageId: "cm-stable-retry-id",
  messageType: "IMPACT_NOTICE",
  classification: "internal",
  body: JSON.stringify({
    paths: ["gateway/src/tools/index.js"],
    baseSha: "abc123",
    evidence: "tool registry changed",
    action: "refresh before editing",
  }),
});
```

`createCoordination` accepts an already normalized configuration object and is
the supported direct entry point. Construction is lazy and does not connect to
Redis. Each factory-created service owns one persistent RESP2 command client
and one dedicated blocking client. Healthy calls reuse them, and
`coordination.close()` idempotently drains and destroys both without affecting
another service instance. There is no process-global Redis singleton.

The adapter sets `disableOfflineQueue` and disables node-redis automatic
reconnect. It never retries an operation after dispatch: a transport failure
returns `COORDINATION_UNAVAILABLE`, invalidates that lane, and lets only a
later semantic call establish a replacement connection. Concurrent lazy
connect/reconnect callers share one connection attempt through its complete
handshake. Node-redis `isOpen` is not readiness: an open-but-not-ready caller
continues waiting on that attempt and sends no command. Command and blocking
admission queues are bounded by the runtime settings above.

The default direct audit callback is the local JSONL-only writer. In the
Gateway it is already configured; a standalone embedding may configure the
audit module first or inject its own safe callback. Audit failure remains best
effort and cannot change an authoritative operation result.

## Managed orchestrator profile

Long-running Node orchestrators should put the direct service behind
`createOrchestratorCoordinationClient`, exported from the same module:

```js
import {
  createCoordination,
  createOrchestratorCoordinationClient,
} from "../gateway/src/coordination.js";

const coordination = createCoordination({ config });
const client = createOrchestratorCoordinationClient({
  coordination,
  registration: {
    displayName: "orchestrator-codex",
    capabilities: ["coordination.v1", "review"],
  },
});

await client.start();
try {
  const peers = await client.invoke("discover", {
    participantType: "orchestrator",
  });
  // Handle peer selection and messages as untrusted input.
} finally {
  await client.stop();
  await coordination.close();
}
```

The lifecycle surface is deliberately limited:

| Method | Contract |
|---|---|
| `start()` | Calls read-only status, validates protocol and canonical scope, uses the advertised default lease unless `registration.leaseTtlMs` is explicit, registers exactly one orchestrator in that scope, validates its returned identity, and starts renewal. Concurrent starts share the same flight. |
| `invoke(operation, input)` | Accepts only `discover`, `send`, `receive`, and `ack`; overwrites caller-supplied credentials with the owned identity and executes the action exactly once. |
| `getStatus()` | Returns `starting`, `ready`, `degraded`, `rejoining`, or `stopped`, safe identity fields, the next action, retry count, a safe error code, and recovery guidance. It never returns the lease token, registration metadata, or raw exception text. |
| `stop()` | Cancels the local epoch/timer loop, starts best-effort authenticated unregister, fences and cleans up registrations that complete late, and resolves without waiting indefinitely for injected service calls. It is idempotent; a stopped instance cannot restart. |

The default renewal point is 50% of the effective lease with ±10% lease
jitter, so the scheduled bound is 40–60%. `heartbeatJitterRatio` may narrow or
widen that window up to ±25%. `retry.maxAttempts` is the total bounded attempt
count for one heartbeat or re-registration episode; delays start at
`retry.baseDelayMs`, double, and cap at `retry.maxDelayMs`.

The managed profile borrows rather than owns its injected direct service, so
`stop()` does not close it; the embedding that called `createCoordination`
retains that responsibility. The factory is reusable, but every returned
client is a single-use lifecycle instance. `stop()` is the terminal local
boundary: it does not assume the injected direct service can cancel an
already-running call. Instead it advances the lifecycle epoch, resolves
immediately from local state, suppresses late rejection handling, prevents
late success from returning to `ready` or starting rejoin, and performs
detached best-effort unregister if a late registration yields usable
credentials.

A transient heartbeat outage moves the profile to `degraded` while finite
heartbeat retries run. Exhaustion leaves no timer and tells the operator to
stop and create a new client. `COORDINATION_AUTH_FAILED`,
`COORDINATION_LEASE_EXPIRED`, or `COORDINATION_LEASE_CHANGED` moves it to
`rejoining`; one epoch-fenced flight obtains a replacement identity. Multiple
concurrent lease-loss observations cannot create multiple replacement
registrations. The failed discover/send/receive/ack call is still returned as
a failure and is never replayed because retrying an action could duplicate a
semantic side effect.

The plaintext lease token exists only in the profile's private process memory
and outbound authenticated service calls. Do not serialize client internals or
exception details. The profile itself performs no logging, artifact writes,
message-body persistence, or Redis access outside the injected coordination
service.

## Raw Redis interoperability

Raw access is useful for diagnostics and trusted local clients in another
language. It bypasses service validation. Do not expose this write surface to
untrusted or multi-tenant clients.

Set shell variables without printing secrets:

```bash
coord_redis_url="${AGENTS_COORDINATION_REDIS_URL:-${AGENTS_REDIS_URL:-}}"
coord_prefix=agents:coord:v1
participant_id=pt-recipient
inbox_key="${coord_prefix}:inbox:${participant_id}"
group_name=coordination-v1
consumer_name=manual-inspector
```

These examples assume a credential-free private development endpoint. Do not
put a password-bearing URL in command history or diagnostic output; use the
operator-approved secret injection method for authenticated deployments.

Create the inbox group idempotently:

```bash
redis-cli -u "$coord_redis_url" \
  XGROUP CREATE "$inbox_key" "$group_name" 0 MKSTREAM
```

`BUSYGROUP` means the group already exists and is normally safe to ignore.
`XGROUP CREATE` mutates Redis and should be used only to repair a verified
missing group.

Read new entries:

```bash
redis-cli -u "$coord_redis_url" \
  XREADGROUP GROUP "$group_name" "$consumer_name" COUNT 20 BLOCK 5000 \
  STREAMS "$inbox_key" '>'
```

`XREADGROUP` is not a passive inspection command: it assigns returned entries
to the named consumer and mutates the pending-entry list. Process them
idempotently and ACK them through the service, or leave them for later reclaim.

Inspect pending deliveries:

```bash
redis-cli -u "$coord_redis_url" \
  XPENDING "$inbox_key" "$group_name"
```

Reclaim work idle for at least 60 seconds:

```bash
redis-cli -u "$coord_redis_url" \
  XAUTOCLAIM "$inbox_key" "$group_name" "$consumer_name" 60000 0-0 COUNT 20
```

`XAUTOCLAIM` also mutates consumer ownership.

After durable, idempotent handling, acknowledge through
`coordination.ack`. The module keeps its atomic Lua scripts private and does not
export a raw ACK helper or approved script hash. Plain `XACK` is not
wire-compatible: it skips the participant fence, complete batch validation,
`XDEL`, and recipient-scoped tombstone.

Inspect candidate participant IDs and one presence value:

```bash
redis-cli -u "$coord_redis_url" \
  SMEMBERS "${coord_prefix}:participants"
redis-cli -u "$coord_redis_url" \
  GET "${coord_prefix}:presence:${participant_id}"
```

If an identifier contains `:`, percent-encode it in the Redis key. Never infer
the original ID by splitting a key on colons; read the stored JSON value.
The raw presence JSON contains the private lease-token digest. Do not paste,
persist, or include that output in logs, artifacts, or support reports. Prefer
`coordination.discover` for public participant data.

A raw writer that appends directly to an inbox must use the exact envelope
fields listed above and separately maintain the dedupe and body-free metadata
records. That multi-key operation must be atomic and reproduce the complete
fenced service contract. Plain `XADD` alone:

- does not authenticate the sender;
- does not verify either lease or scope;
- does not detect a secret or oversized body;
- does not provide `messageId` conflict detection; and
- does not emit complete metadata.

For those reasons, raw writes are not a supported third policy surface. Prefer
MCP or the direct Node service for sending.

## KYA compatibility workflow

The current KYA workaround can move onto the coordination plane without
changing its ownership or evidence rules.

### Bootstrap and JOIN

1. Call `coordination.status` and compare its non-secret `scopeId` with the
   other orchestrators. Every process for this channel must use the same
   configured canonical scope; trace IDs are not scopes.
2. Call `coordination.register` without a scope, or repeat the exact canonical
   value, with the orchestrator type, display name,
   capabilities, and non-secret metadata. The service generates its
   `participantId`.
3. Treat the resulting body-free participant joined metadata event as presence
   `JOIN`.
4. Put non-secret protocol/version information in participant metadata.
5. If peers require the complete JOIN payload, discover them and send an
   addressed `messageType: "JOIN"` body containing the orchestrator identity,
   version, base SHA, and exclusively owned scope.

Example semantic JOIN body:

```json
{
  "protocolVersion": 1,
  "orchestrator": "codex",
  "baseSha": "abc123",
  "ownedScope": ["gateway/src/services/**"]
}
```

Ownership remains exclusive until the owning participant explicitly changes
it through the application protocol. Discovery and JOIN do not grant ownership.

### Change coordination

Use the recommended `messageType` values:

- `CHANGE_REQUEST`
- `IMPACT_NOTICE`
- `RESPONSE`
- `ACK`

`CHANGE_REQUEST` and `IMPACT_NOTICE` bodies should include exact paths, the base
SHA used to assess the change, evidence, and the requested action:

```json
{
  "paths": [
    "gateway/src/services/coordination_service.js",
    "gateway/src/tools/index.js"
  ],
  "baseSha": "abc123",
  "evidence": "coordination tool registration changes the fixed MCP tool list",
  "action": "refresh your branch before editing the registry",
  "parent_artifact_id": "art-optional-evidence"
}
```

Keep one `correlationId` for the logical exchange. A `RESPONSE` sets
`replyToMessageId` to the request or notice. A semantic `ACK` sets
`replyToMessageId` to the response it acknowledges and repeats
`parent_artifact_id` when the KYA chain uses an artifact:

```json
{
  "participantId": "pt-owner",
  "leaseToken": "<secret>",
  "toParticipantId": "pt-requester",
  "messageType": "ACK",
  "classification": "internal",
  "body": "{\"parent_artifact_id\":\"art-optional-evidence\",\"status\":\"understood\"}",
  "correlationId": "coordination-service-change",
  "replyToMessageId": "cm-response"
}
```

After processing any of these messages, separately call `coordination.ack` with
its Redis `deliveryId`. The two acknowledgments mean different things:

| Operation | Meaning |
|---|---|
| semantic message `messageType: "ACK"` | A peer says it understood or accepted the protocol-level statement described in the body |
| `coordination.ack(deliveryIds)` | The receiver tells Redis it durably handled a transport delivery |

Poll with `coordination.receive` at workflow checkpoints: before editing owned
or shared surfaces, before publishing evidence, before review/verdict, before
merge, and before closure. Continue heartbeating while waiting.

Artifacts may carry evidence and link messages through `parent_artifact_id`.
They coordinate understanding; they never authorize merges, verdicts,
ownership transfers, approvals, or closure. Those decisions remain on their
existing authoritative surfaces.

### Notices versus decision evidence

Use coordination messages for ephemeral notification, wake-up, routing, and a
pointer to evidence. A decision, review disposition, accepted baseline, or
closure rationale must be written as a newly created artifact through the
Gateway artifact API; the message references that artifact ID and digest.
Artifacts are append-only at the Gateway API boundary: revise a decision by
creating a successor artifact, never by silently replacing the previous
record. This is an audit convention, not a WORM or cryptographic-immutability
claim, and an artifact reference still grants no authority.

## Recovery and shutdown

Recommended receive loop:

1. Heartbeat if renewal is due.
2. Receive reclaimed and new deliveries using a stable `consumerId`.
3. Validate `messageType` and parse the body according to the selected protocol.
4. Deduplicate semantic handling by `messageId` or `correlationId`.
5. Persist the local result or complete the safe local side effect.
6. Send a protocol `RESPONSE` or semantic `ACK` when required.
7. Call `coordination.ack` for the transport `deliveryId`.
8. Poll again at the next checkpoint.

If a process crashes between steps 5 and 7, another consumer can reclaim the
entry after `reclaimIdleMs`. The handler must detect that step 5 already
happened and avoid repeating a non-idempotent effect.

### WIRING-A runtime availability limit

The Redis reclaim above applies only to a pending transport delivery. It does
not provide automatic restart or crash recovery for the store-backed
WIRING-A consumer runtime.

The ratified WIRING-A part-A availability contract—not a claim that the
runtime is implemented or released—uses non-expiring store owner state. If
that runtime crashes, or if an operator restores a backup captured while the
owner state was active, the scope remains blocked indefinitely. Part A has no
automatic restart, takeover, clear, or crash-recovery path. Do not delete the
owner state or infer safe takeover from PID absence, elapsed time, heartbeat
loss, participant lease expiry, or a failed probe.

The same indefinite block can occur without a crash: a claim can commit before
later result validation fails; initialization compensation can fail; an
orderly stop's exact release can fail or remain uncertain; or the persistent
generation can reach its maximum. In each case the durable row remains the
authority and part A fails closed.

A released-state snapshot is not an online recovery shortcut. Restoring it can
roll the persistent generation backward and make an old generation reusable.
Any restore, copy, or store move for the same managed-client lineage—whether
the captured row is active or released—requires a separately reviewed offline
maintenance transition under enforced global quiescence: fence every process
that can use the store or participant, prevent restart and access, obtain
exclusive offline control, preserve and advance the durable generation, and
then reprovision. That transition is not implemented by part A. Durable epoch
fencing and crash/reclaim closure belong to WIRING part B.

On orderly shutdown:

1. stop accepting new local work;
2. finish or leave in-flight messages pending for recovery;
3. transport-ack only completed handling;
4. call `coordination.unregister`;
5. call `coordination.close()`; and
6. discard the closed service object.

`close()` stops admission, rejects queued work, drains active calls up to
`AGENTS_COORDINATION_SHUTDOWN_TIMEOUT_MS`, then destroys its owned clients to
cancel remaining transport work. At that deadline a lane-owned shutdown epoch
settles every remaining caller with `COORDINATION_UNAVAILABLE`; late transport
successes and failures are observed but cannot become caller results. A client
that finishes connecting after close is destroyed again in its now-open
post-handshake phase, even if its connecting-phase destroy was ignored.
`close()` is safe to call more than once. The Gateway invokes the same closure
once on stdin end, `SIGINT`, or `SIGTERM`.

If the lease token is lost, do not try to reconstruct it from Redis. Register a
new participant and let the old identity expire.

## Structured errors

| Code | Meaning and operator action |
|---|---|
| `INVALID_INPUT` | MCP/schema validation failed; correct field names, types, bounds, or enums. |
| `COORDINATION_INVALID_INPUT` | Shared service validation rejected a semantic bound, enum, identifier, credential shape, unknown field, or batch. Lease failures name the field and effective limit, for example `leaseTtlMs exceeds maximum 3600000`. |
| `COORDINATION_UNAVAILABLE` | No coordination Redis URL or Redis is unreachable; configure/check Redis. Other Gateway tools remain available. |
| `COORDINATION_INTERNAL_ERROR` | Redis returned corrupt or unexpected coordination state, or an injected dependency violated the contract; inspect safely without dumping bodies or credentials. |
| `COORDINATION_ID_COLLISION` | Registration exhausted its bounded generated-ID collision attempts; retry registration and investigate a deterministic/random-source fault if it repeats. |
| `COORDINATION_AUTH_FAILED` | Participant ID/token pair is invalid; do not reveal which part failed. Re-register if the token was lost. |
| `COORDINATION_LEASE_EXPIRED` | The participant lease elapsed; register a new identity. |
| `COORDINATION_LEASE_CHANGED` | A fenced operation observed a missing or replacement identity after authentication; discard the stale result and use the current registration. |
| `COORDINATION_TARGET_NOT_FOUND` | The addressed recipient is absent or no longer active; discover again. |
| `COORDINATION_SCOPE_MISMATCH` | Registration did not match the configured canonical scope, or discovery/send attempted to cross it; use the `scopeId` reported by status. |
| `COORDINATION_CLASSIFICATION_DENIED` | The body was classified `restricted`; publish protected data through the artifact path instead. |
| `COORDINATION_SECRET_REJECTED` | Secret detection rejected the body; remove the secret and rotate it if exposure may have occurred. |
| `COORDINATION_MESSAGE_TOO_LARGE` | The UTF-8 body exceeds the configured byte limit; reduce it without logging the rejected body. |
| `COORDINATION_MESSAGE_CONFLICT` | The sender reused `messageId` with a different envelope; retry the original envelope or use a new ID. |
| `COORDINATION_INBOX_FULL` | The target inbox reached its `XLEN` bound; let the recipient process and ACK work before retrying. |
| `COORDINATION_DELIVERY_NOT_FOUND` | Ack referred to an unknown or different participant inbox delivery; use the IDs returned by receive. |

Direct calls throw `CoordinationError` with one of the `COORDINATION_*` codes.
MCP structural validation uses `INVALID_INPUT`; shared service failures are
serialized with the same coordination code and a safe message.

## ACL, TLS, and network isolation

The local Docker Redis configuration is a development convenience, not a
multi-tenant security boundary. For anything beyond a single trusted operator:

- bind Redis to a private interface or container network;
- block public ingress to the Redis port;
- use `rediss://` and validate the server certificate;
- use a dedicated Redis database or prefix per trust domain;
- create a service credential with access only to
  `<configured-prefix>:*`; and
- keep human/untrusted clients on MCP rather than giving them Redis
  credentials.

A service ACL must cover the commands currently issued by the adapter and its
inline scripts: `EVAL`, `PING`, `GET`, `SET`, `DEL`, `EXISTS`, `TYPE`, `PERSIST`,
`PEXPIRE`, `SADD`, `SISMEMBER`, `SSCAN`, `SREM`, `XADD`, `XGROUP`,
`XREADGROUP`, `XPENDING`, `XAUTOCLAIM`, `XACK`, `XDEL`, `XLEN`, and `XRANGE`,
plus the connection/authentication commands required by node-redis. Restrict
key access to `<configured-prefix>:*`. The service does not currently use
`MGET`, `SMEMBERS`, or `EVALSHA`; `SMEMBERS` appears above only as an operator
diagnostic.

Do not give a raw peer `+@all`, `~*`, administrative commands, Lua script
loading, or access to `agents:events`. The service credential needs `EVAL`
because the shipped implementation sends inline scripts, but that does not make
`EVAL` appropriate for a human or arbitrary raw peer.

Redis key ACLs alone cannot enforce sender identity when a raw peer must write
arbitrary recipient inbox keys. Use MCP or an authenticated service/relay for
untrusted peers.

`rediss://` is supported through node-redis and uses its certificate validation
with the host system trust store. The current environment contract has no
custom CA or client-certificate variables. These ACL and TLS deployment
controls are not covered by the automated acceptance suite; validate
authentication, certificate name, trust chain, and command/key restrictions in
the deployment environment.

## Isolated verification and no-restart rollout

Do not stop or restart a shared MCP process to test Project V5. A Gateway builds
its tool registry once at process startup, so an already running process keeps
its existing tools and behavior. Deploy the additive code, leave the shared MCP
running, and let each MCP client start or reconnect to a new Gateway process
during its normal lifecycle. Configuration changes likewise take effect only
in a newly started process.

Live acceptance is the required `test.redis-live` CI lane. GitHub Actions
provisions one disposable `redis:7.2-alpine` standalone service per Node matrix
job, waits for its health check, and exposes its loopback URL only as
`AGENTS_TEST_REDIS_URL` to the test process. A local `./scripts/ci.sh` run must
receive the URL of an independently managed disposable Redis 7 standalone
instance. With no URL, the gate reports required infrastructure as
`infrastructure_unavailable` and returns nonzero instead of producing a false
skipped green result.

The required lane asserts Redis major version 7, standalone/non-cluster primary
topology, and repeated independent-client race schedules. It fails on a runtime
skip, zero tests, a protocol assertion, or leaked keys. Every live test derives
a UUID coordination prefix and removes only keys under that exact prefix; a
final read-only guard verifies that no `agents:test:v5:*` namespace remains.
Never point the live suite at a production or shared coordination namespace,
never reuse a different project's prefix, and never run `FLUSHDB`.

The ordinary unit, structure, MCP-list, and smoke checks require neither a live
Redis server nor an MCP restart. Tool-registry construction is lazy: all eight
tools are listed without connecting, an unavailable coordination call returns
`COORDINATION_UNAVAILABLE`, and unrelated legacy tools remain usable.

## Verification map

Operational claims in this runbook are backed by:

| Claim | Tests |
|---|---|
| config defaults, overrides, and rejection | `tests/gateway/config_paths.test.js` |
| keys, percent encoding, group, fences, retention contracts, and legacy isolation | `tests/gateway/coordination_contract.test.js` |
| register, heartbeat, discovery, unregister, send, receive/reclaim, and ACK shapes/errors | `tests/gateway/coordination_service_*.test.js` and `tests/gateway/coordination_service.test.js` |
| atomic Redis presence, send, receive, reclaim, capacity, and ACK | `tests/gateway/coordination_queue_*.test.js` |
| public direct factory, lazy config mapping, and `agents:events` rejection | `tests/gateway/coordination_factory.test.js` |
| eight MCP schemas, read-only status, and bidirectional direct/MCP parity | `tests/gateway/tool_coordination.test.js` and `tests/gateway/coordination_surface_parity.test.js` |
| JSONL-only coordination audit and unchanged legacy publisher | `tests/gateway/coordination_audit.test.js` |
| two independent services on Redis 7, isolated key inspection, replacement, recovery, and cleanup | `tests/gateway/coordination_two_instance_live.test.js` |
| repeated multi-client equality/conflict, pending/reclaim, replacement/expiry, connection-loss, and atomic ACK races | `tests/gateway/coordination_multi_client_race_live.test.js` |
| zero leaked test namespaces after the complete required live lane | `tests/gateway/zz_coordination_namespace_guard_live.test.js` |

ACL policy, TLS certificate handling, Redis Sentinel, Redis Cluster, and
multi-tenant network isolation are not exercised by that automated suite; they
remain deployment-specific validation gates.

## Troubleshooting

### Coordination returns `COORDINATION_UNAVAILABLE`

1. Confirm `AGENTS_COORDINATION_REDIS_URL` or `AGENTS_REDIS_URL` is set in the
   Gateway process, not only the interactive shell.
2. Resolve the same fallback into `coord_redis_url` without printing it, then
   run `redis-cli -u "$coord_redis_url" PING`.
3. For TLS, verify CA trust, hostname, and the `rediss://` scheme.
4. Check ACL errors in Gateway stderr.

### A participant is missing from discovery

- Call `coordination.status` from both clients and compare its `scopeId`,
  prefix, and protocol version without logging connection configuration.
- Check the presence key with `PTTL` without printing its JSON value.
- Inspect the raw candidate set with `SMEMBERS` or follow the service's bounded
  `SSCAN` behavior.
- Confirm the returned Gateway-clock `leaseExpiresAt` and the Redis TTL are
  plausible for the requested lease duration.
- Re-register instead of manually extending an unknown identity.

### Messages are delivered more than once

That is valid at-least-once behavior. Use stable `messageId` on send, make local
handling idempotent, and acknowledge only after durable handling. Inspect:

```bash
redis-cli -u "$coord_redis_url" \
  XPENDING "$inbox_key" coordination-v1
```

### Pending messages never recover

- Use the same `coordination-v1` consumer group.
- Ensure `reclaimIdleMs` has elapsed.
- Use a stable, unique `consumerId` per running process.
- Check `XPENDING` idle time and then `XAUTOCLAIM`.
- Do not acknowledge on receipt before processing.

### Send reports `COORDINATION_MESSAGE_CONFLICT`

The same sender reused a `messageId` with different content or routing. Compare
the complete canonical envelope, including target, type, classification,
correlation, reply relationship, and body. Use the original envelope for a
retry or create a new `cm-` ID.

### The metadata Stream has no body

This is intentional. Read the addressed participant inbox through the service.
Never change `agents:coord:v1:events` or `agents:events` to carry bodies.

### Redis reports `NOGROUP`

Create `coordination-v1` on that participant inbox with `XGROUP CREATE ... 0
MKSTREAM`. Service registration should do this automatically.

### Redis memory or inbox length keeps growing

- Find old pending entries before trimming.
- Reclaim or resolve abandoned consumers.
- Do not trim past the oldest pending ID.
- Apply backpressure if pending entries occupy the configured retention bound.
- Treat eviction of coordination keys as presence/delivery loss and investigate
  Redis memory policy.

### Raw Redis succeeds but MCP rejects

Raw access bypasses schema, lease, scope, content, and idempotency checks. MCP is
the authoritative application behavior. Correct the raw client or use the
direct Node service; do not weaken MCP validation to match an unsafe raw write.
