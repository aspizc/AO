import { createClient } from "redis";

import {
  COORDINATION_CONSUMER_GROUP,
  COORDINATION_PROTOCOL_VERSION,
  DEFAULT_COORDINATION_ORPHAN_INBOX_TTL_MS,
  DEFAULT_COORDINATION_PREFIX,
  coordinationKeys,
  createCoordinationLeaseFence,
  encodeCoordinationKeyPart,
} from "./coordination_contract.js";
import { coordinationConsumeKey } from "./coordination_consumer.js";
import {
  closeRedisClientLane,
  executeRedisClientLane,
  RedisClientLane,
  snapshotRedisClientLane,
} from "./redis_client_lifecycle.js";

const DEFAULT_MAX_INBOX_LENGTH = 10_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 2_000;
const DEFAULT_COMMAND_CONCURRENCY = 64;
const DEFAULT_COMMAND_QUEUE = 256;
const DEFAULT_BLOCKING_CONCURRENCY = 1;
const DEFAULT_BLOCKING_QUEUE = 32;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 2_000;
const DISCOVERY_BATCH_SIZE = 128;
const MAX_RECEIVE_COUNT = 100;
const MAX_ACK_COUNT = 100;
const CANONICAL_JSON_MAX_BYTES = 262_144;
const CANONICAL_JSON_MAX_WORK = 196_608;
const CANONICAL_JSON_MAX_STRING_BYTES = 131_072;
const CANONICAL_JSON_MAX_DEPTH = 64;
const SCAN_CURSOR = /^(?:0|[1-9][0-9]*)$/;
const MAX_SCAN_CURSOR = (1n << 64n) - 1n;
const DELIVERY_ID = /^((?:0|[1-9][0-9]*))-((?:0|[1-9][0-9]*))$/;
const MAX_DELIVERY_ID_COMPONENT = (1n << 64n) - 1n;
const MESSAGE_CLASSIFICATIONS = new Set(["internal", "unrestricted"]);
const CANONICAL_ISO_TIMESTAMP =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;
const PARTICIPANT_FIELDS = new Set([
  "protocolVersion",
  "participantId",
  "participantType",
  "scopeId",
  "displayName",
  "capabilities",
  "metadata",
  "registeredAt",
  "lastHeartbeatAt",
  "leaseExpiresAt",
  "leaseTokenHash",
]);
const MESSAGE_FIELDS = new Set([
  "protocolVersion",
  "messageId",
  "fromParticipantId",
  "toParticipantId",
  "scopeId",
  "messageType",
  "classification",
  "body",
  "createdAt",
  "traceId",
  "correlationId",
  "replyToMessageId",
]);
const FENCE_FIELDS = new Set([
  "participantId",
  "scopeId",
  "leaseTokenHash",
]);
const ACK_RECOVERY_IDENTITY_FIELDS = new Set([
  "consumeKey",
  "deliveryId",
  "scopeId",
  "fromParticipantId",
  "oldParticipantId",
  "messageId",
]);
const ACK_ORPHAN_FINALIZE_FIELDS = new Set([
  ...ACK_RECOVERY_IDENTITY_FIELDS,
  "tombstoneTtlMs",
]);
const ACK_RECOVERY_BUILD_FIELDS = new Set(["identity", "prefix"]);

const LUA_HELPERS = `
local function key_type(key)
  local reply = redis.call('TYPE', key)
  if type(reply) == 'table' then
    return reply.ok
  end
  return reply
end

local function key_type_is(key, expected)
  local actual = key_type(key)
  return actual == 'none' or actual == expected
end

local function decode_presence(raw)
  local ok, value = pcall(cjson.decode, raw)
  if not ok or type(value) ~= 'table' then
    return nil
  end
  if type(value.participantId) ~= 'string'
    or type(value.participantType) ~= 'string'
    or type(value.scopeId) ~= 'string'
    or type(value.leaseTokenHash) ~= 'string' then
    return nil
  end
  return value
end

local function fence_matches(value, participant_id, digest, scope_id)
  return value.participantId == participant_id
    and value.leaseTokenHash == digest
    and value.scopeId == scope_id
end

local function ensure_group(inbox_key, group_name)
  local reply = redis.pcall(
    'XGROUP', 'CREATE', inbox_key, group_name, '0', 'MKSTREAM'
  )
  if type(reply) == 'table' and reply.err then
    local is_busy = string.sub(reply.err, 1, 9) == 'BUSYGROUP'
      and (
        string.len(reply.err) == 9
        or string.sub(reply.err, 10, 10) == ' '
      )
    if not is_busy then
      return reply
    end
  elseif not (
    reply == 'OK'
    or (type(reply) == 'table' and reply.ok == 'OK')
  ) then
    return redis.error_reply('ERR invalid XGROUP reply')
  end
  return nil
end
`;

const BOUNDED_CANONICAL_JSON_LUA = `
local JSON_MAX_BYTES = ${CANONICAL_JSON_MAX_BYTES}
local JSON_MAX_WORK = ${CANONICAL_JSON_MAX_WORK}
local JSON_MAX_STRING_BYTES = ${CANONICAL_JSON_MAX_STRING_BYTES}
local JSON_MAX_DEPTH = ${CANONICAL_JSON_MAX_DEPTH}

local function consume_json_work(work, amount)
  work.remaining = work.remaining - (amount or 1)
  return work.remaining >= 0
end

local function skip_json_string(source, index, work)
  if string.byte(source, index) ~= 34
    or not consume_json_work(work) then
    return nil
  end
  local start = index
  index = index + 1
  local length = string.len(source)
  while index <= length do
    if index - start > JSON_MAX_STRING_BYTES
      or not consume_json_work(work) then
      return nil
    end
    local byte = string.byte(source, index)
    if byte == 34 then
      return index + 1
    end
    if byte == 92 then
      local escaped = string.byte(source, index + 1)
      if not escaped then
        return nil
      end
      if escaped == 117 then
        for offset = 2, 5 do
          local hexadecimal = string.byte(source, index + offset)
          if not hexadecimal
            or not (
              (hexadecimal >= 48 and hexadecimal <= 57)
              or (hexadecimal >= 65 and hexadecimal <= 70)
              or (hexadecimal >= 97 and hexadecimal <= 102)
            ) then
            return nil
          end
        end
        index = index + 6
      elseif escaped == 34
        or escaped == 47
        or escaped == 92
        or escaped == 98
        or escaped == 102
        or escaped == 110
        or escaped == 114
        or escaped == 116 then
        index = index + 2
      else
        return nil
      end
    elseif byte < 32 then
      return nil
    else
      index = index + 1
    end
  end
  return nil
end

local function skip_json_whitespace(source, index, work)
  local length = string.len(source)
  while index <= length do
    local byte = string.byte(source, index)
    if byte ~= 32 and byte ~= 9 and byte ~= 10 and byte ~= 13 then
      break
    end
    if not consume_json_work(work) then
      return nil
    end
    index = index + 1
  end
  return index
end

local function skip_json_number(source, index, work)
  local length = string.len(source)
  local start = index
  while index <= length do
    local byte = string.byte(source, index)
    if byte == 32
      or byte == 9
      or byte == 10
      or byte == 13
      or byte == 44
      or byte == 93
      or byte == 125 then
      break
    end
    if not consume_json_work(work) then
      return nil
    end
    index = index + 1
  end
  if index == start then
    return nil
  end
  return index
end

local function skip_json_value(
  source,
  index,
  depth,
  work,
  root_kinds,
  is_root
)
  if depth > JSON_MAX_DEPTH or not consume_json_work(work) then
    return nil
  end
  index = skip_json_whitespace(source, index, work)
  if not index then
    return nil
  end
  local byte = string.byte(source, index)
  if byte == 34 then
    return skip_json_string(source, index, work)
  end
  if byte == 123 then
    index = skip_json_whitespace(source, index + 1, work)
    if not index then
      return nil
    end
    local seen_keys = {}
    if string.byte(source, index) == 125 then
      return index + 1
    end
    while true do
      if not consume_json_work(work, 4) then
        return nil
      end
      local key_start = index
      local key_end = skip_json_string(source, key_start, work)
      if not key_end then
        return nil
      end
      local key_ok, key = pcall(
        cjson.decode,
        string.sub(source, key_start, key_end - 1)
      )
      if not key_ok or type(key) ~= 'string' then
        return nil
      end
      if seen_keys[key] then
        return nil
      end
      seen_keys[key] = true
      index = skip_json_whitespace(source, key_end, work)
      if not index or string.byte(source, index) ~= 58 then
        return nil
      end
      local value_start = skip_json_whitespace(
        source,
        index + 1,
        work
      )
      if not value_start then
        return nil
      end
      local value_byte = string.byte(source, value_start)
      local value_kind = 'scalar'
      if value_byte == 91 then
        value_kind = 'array'
      elseif value_byte == 123 then
        value_kind = 'object'
      end
      if is_root then
        root_kinds[key] = value_kind
      end
      index = skip_json_value(
        source,
        value_start,
        depth + 1,
        work,
        nil,
        false
      )
      if not index then
        return nil
      end
      index = skip_json_whitespace(source, index, work)
      if not index then
        return nil
      end
      local separator = string.byte(source, index)
      if separator == 125 then
        return index + 1
      end
      if separator ~= 44 then
        return nil
      end
      index = skip_json_whitespace(source, index + 1, work)
      if not index then
        return nil
      end
    end
  end
  if byte == 91 then
    index = skip_json_whitespace(source, index + 1, work)
    if not index then
      return nil
    end
    if string.byte(source, index) == 93 then
      return index + 1
    end
    while true do
      if not consume_json_work(work, 2) then
        return nil
      end
      index = skip_json_value(
        source,
        index,
        depth + 1,
        work,
        nil,
        false
      )
      if not index then
        return nil
      end
      index = skip_json_whitespace(source, index, work)
      if not index then
        return nil
      end
      local separator = string.byte(source, index)
      if separator == 93 then
        return index + 1
      end
      if separator ~= 44 then
        return nil
      end
      index = skip_json_whitespace(source, index + 1, work)
      if not index then
        return nil
      end
    end
  end
  if string.sub(source, index, index + 3) == 'true'
    or string.sub(source, index, index + 3) == 'null' then
    if not consume_json_work(work, 4) then
      return nil
    end
    return index + 4
  end
  if string.sub(source, index, index + 4) == 'false' then
    if not consume_json_work(work, 5) then
      return nil
    end
    return index + 5
  end
  if byte == 45 or (byte and byte >= 48 and byte <= 57) then
    return skip_json_number(source, index, work)
  end
  return nil
end

local function parse_canonical_json(source)
  if type(source) ~= 'string'
    or string.len(source) > JSON_MAX_BYTES then
    return nil
  end
  local work = { remaining = JSON_MAX_WORK }
  local root_kinds = {}
  local index = skip_json_value(
    source,
    1,
    1,
    work,
    root_kinds,
    true
  )
  if not index then
    return nil
  end
  index = skip_json_whitespace(source, index, work)
  if not index or index ~= string.len(source) + 1 then
    return nil
  end
  local ok, value = pcall(cjson.decode, source)
  if not ok then
    return nil
  end
  return value, root_kinds
end
`;

const REGISTER_PARTICIPANT_SCRIPT = `
${LUA_HELPERS}
if not key_type_is(KEYS[1], 'string')
  or not key_type_is(KEYS[2], 'set')
  or not key_type_is(KEYS[3], 'stream')
  or not key_type_is(KEYS[4], 'stream') then
  return 5
end
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 2
end
local incoming = decode_presence(ARGV[1])
if not incoming or incoming.participantId ~= ARGV[3] then
  return 5
end
local group_error = ensure_group(KEYS[3], ARGV[4])
if group_error then
  return group_error
end
redis.call('XADD', KEYS[4], '*', 'event', ARGV[5])
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
redis.call('SADD', KEYS[2], ARGV[3])
redis.call('PERSIST', KEYS[3])
return 1
`;

const RENEW_PARTICIPANT_SCRIPT = `
${LUA_HELPERS}
if not key_type_is(KEYS[1], 'string')
  or not key_type_is(KEYS[2], 'set')
  or not key_type_is(KEYS[3], 'stream')
  or not key_type_is(KEYS[4], 'stream') then
  return 5
end
local current_raw = redis.call('GET', KEYS[1])
if not current_raw then
  return 3
end
local current = decode_presence(current_raw)
local incoming = decode_presence(ARGV[1])
if not current or not incoming then
  return 5
end
if not fence_matches(current, ARGV[3], ARGV[4], ARGV[5]) then
  return 4
end
if not fence_matches(incoming, ARGV[3], ARGV[4], ARGV[5]) then
  return 5
end
local group_error = ensure_group(KEYS[3], ARGV[6])
if group_error then
  return group_error
end
redis.call('XADD', KEYS[4], '*', 'event', ARGV[7])
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
redis.call('SADD', KEYS[2], ARGV[3])
redis.call('PERSIST', KEYS[3])
return 1
`;

const DELETE_PARTICIPANT_SCRIPT = `
${LUA_HELPERS}
if not key_type_is(KEYS[1], 'string')
  or not key_type_is(KEYS[2], 'set')
  or not key_type_is(KEYS[3], 'stream')
  or not key_type_is(KEYS[4], 'stream') then
  return 5
end
local current_raw = redis.call('GET', KEYS[1])
if not current_raw then
  redis.call('SREM', KEYS[2], ARGV[1])
  if redis.call('EXISTS', KEYS[3]) == 1 then
    redis.call('PEXPIRE', KEYS[3], ARGV[4])
  end
  return 3
end
local current = decode_presence(current_raw)
if not current then
  return 5
end
if not fence_matches(current, ARGV[1], ARGV[2], ARGV[3]) then
  return 4
end
local event = cjson.encode({
  protocolVersion = ${COORDINATION_PROTOCOL_VERSION},
  eventType = 'participant.left',
  participantId = current.participantId,
  participantType = current.participantType,
  scopeId = current.scopeId,
  timestamp = ARGV[5]
})
redis.call('XADD', KEYS[4], '*', 'event', event)
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[1])
if redis.call('EXISTS', KEYS[3]) == 1 then
  redis.call('PEXPIRE', KEYS[3], ARGV[4])
end
return 1
`;

const LIST_PARTICIPANTS_SCRIPT = `
${LUA_HELPERS}
if not key_type_is(KEYS[1], 'string')
  or not key_type_is(KEYS[2], 'set') then
  return {5}
end
local caller_raw = redis.call('GET', KEYS[1])
if not caller_raw then
  return {4}
end
local caller = decode_presence(caller_raw)
if not caller then
  return {5}
end
if not fence_matches(caller, ARGV[1], ARGV[2], ARGV[3]) then
  return {4}
end

local output = {0}
local missing = {}
for index = 5, #ARGV do
  local pair_index = index - 5
  local presence_key = KEYS[3 + (pair_index * 2)]
  local inbox_key = KEYS[4 + (pair_index * 2)]
  if not key_type_is(presence_key, 'string')
    or not key_type_is(inbox_key, 'stream') then
    return {5}
  end
  local participant_id = ARGV[index]
  if redis.call('SISMEMBER', KEYS[2], participant_id) == 1 then
    local raw = redis.call('GET', presence_key)
    if raw then
      local value = decode_presence(raw)
      if not value or value.participantId ~= participant_id then
        return {5}
      end
      table.insert(output, participant_id)
      table.insert(output, raw)
    else
      table.insert(missing, {participant_id, inbox_key})
    end
  end
end

for _, stale in ipairs(missing) do
  redis.call('SREM', KEYS[2], stale[1])
  if redis.call('EXISTS', stale[2]) == 1 then
    redis.call('PEXPIRE', stale[2], ARGV[4])
  end
end
return output
`;

const SEND_MESSAGE_SCRIPT = `
${LUA_HELPERS}
local allowed_message_fields = {
  protocolVersion = true,
  messageId = true,
  fromParticipantId = true,
  toParticipantId = true,
  scopeId = true,
  messageType = true,
  classification = true,
  body = true,
  createdAt = true,
  traceId = true,
  correlationId = true,
  replyToMessageId = true
}

local function valid_timestamp(value)
  if type(value) ~= 'string' then
    return false
  end
  local year, month, day, hour, minute, second, millisecond =
    string.match(
      value,
      '^(%d%d%d%d)%-(%d%d)%-(%d%d)T'
        .. '(%d%d):(%d%d):(%d%d)%.(%d%d%d)Z$'
    )
  if not year then
    return false
  end
  year = tonumber(year)
  month = tonumber(month)
  day = tonumber(day)
  hour = tonumber(hour)
  minute = tonumber(minute)
  second = tonumber(second)
  millisecond = tonumber(millisecond)
  if month < 1 or month > 12
    or hour > 23
    or minute > 59
    or second > 59
    or millisecond > 999 then
    return false
  end
  local days = {
    31, 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31
  }
  local leap = (year % 4 == 0 and year % 100 ~= 0)
    or year % 400 == 0
  if leap then
    days[2] = 29
  end
  return day >= 1 and day <= days[month]
end

local function valid_envelope(
  value,
  sender_id,
  recipient_id,
  scope_id,
  message_id
)
  if type(value) ~= 'table' then
    return false
  end
  for key, _ in pairs(value) do
    if not allowed_message_fields[key] then
      return false
    end
  end
  if value.protocolVersion ~= ${COORDINATION_PROTOCOL_VERSION}
    or value.messageId ~= message_id
    or value.fromParticipantId ~= sender_id
    or value.toParticipantId ~= recipient_id
    or value.scopeId ~= scope_id
    or type(value.messageType) ~= 'string'
    or (
      value.classification ~= 'internal'
      and value.classification ~= 'unrestricted'
    )
    or type(value.body) ~= 'string'
    or not valid_timestamp(value.createdAt) then
    return false
  end
  if value.traceId ~= nil and type(value.traceId) ~= 'string' then
    return false
  end
  if value.correlationId ~= nil
    and type(value.correlationId) ~= 'string' then
    return false
  end
  if value.replyToMessageId ~= nil
    and type(value.replyToMessageId) ~= 'string' then
    return false
  end
  return true
end

local function valid_u64(value)
  if type(value) ~= 'string'
    or not string.match(value, '^%d+$')
    or (string.len(value) > 1 and string.sub(value, 1, 1) == '0') then
    return false
  end
  local max_value = '18446744073709551615'
  return string.len(value) < 20
    or (string.len(value) == 20 and value <= max_value)
end

local function valid_delivery_id(value)
  if type(value) ~= 'string' then
    return false
  end
  local timestamp, sequence = string.match(value, '^(%d+)%-(%d+)$')
  if not timestamp or not valid_u64(timestamp) or not valid_u64(sequence) then
    return false
  end
  return timestamp ~= '0' or sequence ~= '0'
end

local function same_message(left, right)
  local fields = {
    'protocolVersion',
    'messageId',
    'fromParticipantId',
    'toParticipantId',
    'scopeId',
    'messageType',
    'classification',
    'body',
    'traceId',
    'correlationId',
    'replyToMessageId'
  }
  for _, field in ipairs(fields) do
    if left[field] ~= right[field] then
      return false
    end
  end
  return true
end

local function decode_json(raw)
  local ok, value = pcall(cjson.decode, raw)
  if not ok or type(value) ~= 'table' then
    return nil
  end
  return value
end

local function decode_dedupe(raw)
  local value = decode_json(raw)
  if not value then
    return nil
  end
  local key_count = 0
  for key, _ in pairs(value) do
    if key ~= 'envelope' and key ~= 'deliveryId' then
      return nil
    end
    key_count = key_count + 1
  end
  if key_count ~= 2 or not valid_delivery_id(value.deliveryId) then
    return nil
  end
  return value
end

local function append_event(
  events_key,
  envelope,
  delivery_id,
  duplicate
)
  local event = cjson.encode({
    protocolVersion = ${COORDINATION_PROTOCOL_VERSION},
    eventType = 'message.sent',
    fromParticipantId = envelope.fromParticipantId,
    toParticipantId = envelope.toParticipantId,
    scopeId = envelope.scopeId,
    messageId = envelope.messageId,
    messageType = envelope.messageType,
    classification = envelope.classification,
    deliveryId = delivery_id,
    timestamp = envelope.createdAt,
    duplicate = duplicate
  })
  redis.pcall('XADD', events_key, '*', 'event', event)
end

if #KEYS ~= 5 or #ARGV ~= 10 then
  return {8}
end
if not key_type_is(KEYS[1], 'string')
  or not key_type_is(KEYS[2], 'string')
  or key_type(KEYS[3]) ~= 'stream'
  or not key_type_is(KEYS[4], 'string')
  or not key_type_is(KEYS[5], 'stream') then
  return {8}
end

local incoming = decode_json(ARGV[1])
if not incoming
  or not valid_envelope(
    incoming,
    ARGV[2],
    ARGV[5],
    ARGV[4],
    ARGV[8]
  )
  or ARGV[4] ~= ARGV[7] then
  return {8}
end

local sender_raw = redis.call('GET', KEYS[1])
if not sender_raw then
  return {3}
end
local sender = decode_presence(sender_raw)
if not sender then
  return {8}
end
if not fence_matches(sender, ARGV[2], ARGV[3], ARGV[4]) then
  return {3}
end

local recipient_raw = redis.call('GET', KEYS[2])
if not recipient_raw then
  return {4}
end
local recipient = decode_presence(recipient_raw)
if not recipient then
  return {8}
end
if not fence_matches(recipient, ARGV[5], ARGV[6], ARGV[7]) then
  return {5}
end

local existing_raw = redis.call('GET', KEYS[4])
if existing_raw then
  local existing = decode_dedupe(existing_raw)
  if not existing
    or not valid_envelope(
      existing.envelope,
      ARGV[2],
      ARGV[5],
      ARGV[4],
      ARGV[8]
    ) then
    return {8}
  end
  if not same_message(existing.envelope, incoming) then
    return {6}
  end
  if redis.call('PEXPIRE', KEYS[4], ARGV[9]) ~= 1 then
    return {8}
  end
  append_event(KEYS[5], incoming, existing.deliveryId, true)
  return {
    2,
    existing.deliveryId,
    cjson.encode(existing.envelope)
  }
end

if redis.call('XLEN', KEYS[3]) >= tonumber(ARGV[10]) then
  return {7}
end

local delivery_id = redis.call(
  'XADD', KEYS[3], '*', 'envelope', ARGV[1]
)
local dedupe = cjson.encode({
  envelope = incoming,
  deliveryId = delivery_id
})
local stored = redis.pcall(
  'SET', KEYS[4], dedupe, 'PX', ARGV[9]
)
if type(stored) == 'table' and stored.err then
  redis.call('XDEL', KEYS[3], delivery_id)
  return stored
end
if not (
  stored == 'OK'
  or (type(stored) == 'table' and stored.ok == 'OK')
) then
  redis.call('XDEL', KEYS[3], delivery_id)
  return redis.error_reply('ERR invalid SET reply')
end
append_event(KEYS[5], incoming, delivery_id, false)
return {1, delivery_id}
`;

const FENCE_INBOX_SCRIPT = `
${LUA_HELPERS}
if #KEYS ~= 2 or #ARGV ~= 3 then
  return 5
end
if not key_type_is(KEYS[1], 'string')
  or key_type(KEYS[2]) ~= 'stream' then
  return 5
end
local presence_raw = redis.call('GET', KEYS[1])
if not presence_raw then
  return 4
end
local presence = decode_presence(presence_raw)
if not presence then
  return 5
end
if not fence_matches(presence, ARGV[1], ARGV[2], ARGV[3]) then
  return 4
end
return 0
`;

const FENCED_AUTOCLAIM_SCRIPT = `
${LUA_HELPERS}
local function is_nogroup(reply)
  return type(reply) == 'table'
    and type(reply.err) == 'string'
    and string.sub(reply.err, 1, 7) == 'NOGROUP'
    and (
      string.len(reply.err) == 7
      or string.sub(reply.err, 8, 8) == ' '
    )
end

if #KEYS ~= 2 or #ARGV ~= 8 then
  return {5}
end
if not key_type_is(KEYS[1], 'string')
  or key_type(KEYS[2]) ~= 'stream' then
  return {5}
end
local presence_raw = redis.call('GET', KEYS[1])
if not presence_raw then
  return {4}
end
local presence = decode_presence(presence_raw)
if not presence then
  return {5}
end
if not fence_matches(presence, ARGV[1], ARGV[2], ARGV[3]) then
  return {4}
end
local reply = redis.pcall(
  'XAUTOCLAIM',
  KEYS[2],
  ARGV[4],
  ARGV[5],
  ARGV[6],
  ARGV[7],
  'COUNT',
  ARGV[8]
)
if type(reply) == 'table' and reply.err then
  if is_nogroup(reply) then
    return {6}
  end
  return reply
end
return {0, reply}
`;

const FENCED_READ_NEW_SCRIPT = `
${LUA_HELPERS}
local function is_nogroup(reply)
  return type(reply) == 'table'
    and type(reply.err) == 'string'
    and string.sub(reply.err, 1, 7) == 'NOGROUP'
    and (
      string.len(reply.err) == 7
      or string.sub(reply.err, 8, 8) == ' '
    )
end

if #KEYS ~= 2 or #ARGV ~= 6 then
  return {5}
end
if not key_type_is(KEYS[1], 'string')
  or key_type(KEYS[2]) ~= 'stream' then
  return {5}
end
local presence_raw = redis.call('GET', KEYS[1])
if not presence_raw then
  return {4}
end
local presence = decode_presence(presence_raw)
if not presence then
  return {5}
end
if not fence_matches(presence, ARGV[1], ARGV[2], ARGV[3]) then
  return {4}
end
local reply = redis.pcall(
  'XREADGROUP',
  'GROUP',
  ARGV[4],
  ARGV[5],
  'COUNT',
  ARGV[6],
  'STREAMS',
  KEYS[2],
  '>'
)
if type(reply) == 'table' and reply.err then
  if is_nogroup(reply) then
    return {6}
  end
  return reply
end
return {0, reply}
`;

const ACK_INBOX_SCRIPT = `
${LUA_HELPERS}
local function is_nogroup(reply)
  return type(reply) == 'table'
    and type(reply.err) == 'string'
    and string.sub(reply.err, 1, 7) == 'NOGROUP'
    and (
      string.len(reply.err) == 7
      or string.sub(reply.err, 8, 8) == ' '
    )
end

local function valid_u64(value)
  if type(value) ~= 'string'
    or not string.match(value, '^%d+$')
    or (string.len(value) > 1 and string.sub(value, 1, 1) == '0') then
    return false
  end
  local max_value = '18446744073709551615'
  return string.len(value) < 20
    or (string.len(value) == 20 and value <= max_value)
end

local function valid_delivery_id(value)
  if type(value) ~= 'string' then
    return false
  end
  local timestamp, sequence = string.match(value, '^(%d+)%-(%d+)$')
  if not timestamp or not valid_u64(timestamp) or not valid_u64(sequence) then
    return false
  end
  return timestamp ~= '0' or sequence ~= '0'
end

local allowed_message_fields = {
  protocolVersion = true,
  messageId = true,
  fromParticipantId = true,
  toParticipantId = true,
  scopeId = true,
  messageType = true,
  classification = true,
  body = true,
  createdAt = true,
  traceId = true,
  correlationId = true,
  replyToMessageId = true
}

${BOUNDED_CANONICAL_JSON_LUA}
local function is_continuation_byte(value)
  return value and value >= 128 and value <= 191
end

local function utf16_length(value)
  local byte_length = string.len(value)
  local index = 1
  local units = 0
  while index <= byte_length do
    local first = string.byte(value, index)
    if first <= 127 then
      index = index + 1
      units = units + 1
    elseif first >= 194 and first <= 223 then
      local second = string.byte(value, index + 1)
      if not is_continuation_byte(second) then
        return nil
      end
      index = index + 2
      units = units + 1
    elseif first >= 224 and first <= 239 then
      local second = string.byte(value, index + 1)
      local third = string.byte(value, index + 2)
      if not is_continuation_byte(second)
        or not is_continuation_byte(third)
        or (first == 224 and second < 160)
        or (first == 237 and second > 159) then
        return nil
      end
      index = index + 3
      units = units + 1
    elseif first >= 240 and first <= 244 then
      local second = string.byte(value, index + 1)
      local third = string.byte(value, index + 2)
      local fourth = string.byte(value, index + 3)
      if not is_continuation_byte(second)
        or not is_continuation_byte(third)
        or not is_continuation_byte(fourth)
        or (first == 240 and second < 144)
        or (first == 244 and second > 143) then
        return nil
      end
      index = index + 4
      units = units + 2
    else
      return nil
    end
  end
  return units
end

local function valid_nonempty_string(value, maximum)
  if type(value) ~= 'string' then
    return false
  end
  local length = utf16_length(value)
  return length and length > 0 and length <= maximum
end

local function valid_identifier(value)
  return valid_nonempty_string(value, 128)
    and string.match(
      value,
      '^[A-Za-z0-9][A-Za-z0-9._:%-]*$'
    ) ~= nil
end

local function valid_timestamp(value)
  if type(value) ~= 'string' then
    return false
  end
  local year, month, day, hour, minute, second, millisecond =
    string.match(
      value,
      '^(%d%d%d%d)%-(%d%d)%-(%d%d)T'
        .. '(%d%d):(%d%d):(%d%d)%.(%d%d%d)Z$'
    )
  if not year then
    return false
  end
  year = tonumber(year)
  month = tonumber(month)
  day = tonumber(day)
  hour = tonumber(hour)
  minute = tonumber(minute)
  second = tonumber(second)
  millisecond = tonumber(millisecond)
  if month < 1 or month > 12
    or hour > 23
    or minute > 59
    or second > 59
    or millisecond > 999 then
    return false
  end
  local days = {
    31, 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31
  }
  local leap = (year % 4 == 0 and year % 100 ~= 0)
    or year % 400 == 0
  if leap then
    days[2] = 29
  end
  return day >= 1 and day <= days[month]
end

local function valid_stored_envelope(value, recipient_id, scope_id)
  if type(value) ~= 'table' then
    return false
  end
  for key, _ in pairs(value) do
    if not allowed_message_fields[key] then
      return false
    end
  end
  if value.protocolVersion ~= ${COORDINATION_PROTOCOL_VERSION}
    or not valid_identifier(value.messageId)
    or not valid_identifier(value.fromParticipantId)
    or value.toParticipantId ~= recipient_id
    or not valid_identifier(value.toParticipantId)
    or value.scopeId ~= scope_id
    or not valid_identifier(value.scopeId)
    or not valid_identifier(value.messageType)
    or (
      value.classification ~= 'internal'
      and value.classification ~= 'unrestricted'
    )
    or type(value.body) ~= 'string'
    or not valid_timestamp(value.createdAt) then
    return false
  end
  if value.traceId ~= nil
    and not valid_nonempty_string(value.traceId, 128) then
    return false
  end
  if value.correlationId ~= nil
    and not valid_nonempty_string(value.correlationId, 128) then
    return false
  end
  if value.replyToMessageId ~= nil
    and not valid_identifier(value.replyToMessageId) then
    return false
  end
  return true
end

local count = tonumber(ARGV[7])
if not count
  or count < 1
  or count > ${MAX_ACK_COUNT}
  or count ~= math.floor(count)
  or #KEYS ~= 3 + count
  or #ARGV ~= 7 + count then
  return {5}
end
if not key_type_is(KEYS[1], 'string')
  or key_type(KEYS[2]) ~= 'stream'
  or not key_type_is(KEYS[3], 'stream') then
  return {5}
end
for index = 1, count do
  if not key_type_is(KEYS[3 + index], 'string') then
    return {5}
  end
end

local presence_raw = redis.call('GET', KEYS[1])
if not presence_raw then
  return {4}
end
local presence = decode_presence(presence_raw)
if not presence then
  return {5}
end
if not fence_matches(presence, ARGV[1], ARGV[2], ARGV[3]) then
  return {4}
end

local pending_ids = {}
local seen = {}
for index = 1, count do
  local delivery_id = ARGV[7 + index]
  local tombstone_key = KEYS[3 + index]
  if not valid_delivery_id(delivery_id) or seen[delivery_id] then
    return {5}
  end
  seen[delivery_id] = true

  local tombstone = redis.call('GET', tombstone_key)
  if tombstone == '1' then
    local tombstone_ttl = redis.call('PTTL', tombstone_key)
    if type(tombstone_ttl) ~= 'number' or tombstone_ttl <= 0 then
      return {5}
    end
  elseif tombstone then
    return {5}
  end

  local pending = redis.pcall(
    'XPENDING',
    KEYS[2],
    ARGV[4],
    delivery_id,
    delivery_id,
    '1'
  )
  if type(pending) == 'table' and pending.err then
    if is_nogroup(pending) then
      return {7}
    end
    return pending
  end
  if type(pending) ~= 'table' or #pending > 1 then
    return {5}
  end
  if #pending == 1 then
    local row = pending[1]
    if type(row) ~= 'table'
      or #row ~= 4
      or row[1] ~= delivery_id
      or type(row[2]) ~= 'string'
      or type(row[3]) ~= 'number'
      or type(row[4]) ~= 'number' then
      return {5}
    end
    local stream_rows = redis.call(
      'XRANGE',
      KEYS[2],
      delivery_id,
      delivery_id,
      'COUNT',
      '1'
    )
    if type(stream_rows) ~= 'table'
      or #stream_rows ~= 1
      or type(stream_rows[1]) ~= 'table'
      or #stream_rows[1] ~= 2
      or stream_rows[1][1] ~= delivery_id
      or type(stream_rows[1][2]) ~= 'table'
      or #stream_rows[1][2] ~= 2
      or stream_rows[1][2][1] ~= 'envelope'
      or type(stream_rows[1][2][2]) ~= 'string' then
      return {5}
    end
    local envelope_raw = stream_rows[1][2][2]
    local envelope = parse_canonical_json(envelope_raw)
    if not envelope
      or not valid_stored_envelope(envelope, ARGV[1], ARGV[3]) then
      return {5}
    end
    table.insert(pending_ids, delivery_id)
  elseif not tombstone then
    return {6}
  end
end

for index = 1, count do
  redis.call(
    'SET',
    KEYS[3 + index],
    '1',
    'PX',
    ARGV[5]
  )
end

local newly_acked = #pending_ids
if newly_acked > 0 then
  local acknowledged = redis.call(
    'XACK',
    KEYS[2],
    ARGV[4],
    unpack(pending_ids)
  )
  if acknowledged ~= newly_acked then
    return redis.error_reply('ERR invalid XACK reply')
  end
  local deleted = redis.call('XDEL', KEYS[2], unpack(pending_ids))
  if deleted ~= newly_acked then
    return redis.error_reply('ERR invalid XDEL reply')
  end
  local event = cjson.encode({
    protocolVersion = ${COORDINATION_PROTOCOL_VERSION},
    eventType = 'message.acked',
    participantId = ARGV[1],
    scopeId = ARGV[3],
    timestamp = ARGV[6],
    ackedCount = newly_acked,
    deliveryIds = pending_ids
  })
  redis.pcall('XADD', KEYS[3], '*', 'event', event)
end
return {1, newly_acked}
`;

const INSPECT_ACK_TOMBSTONE_SCRIPT = `
local reply = redis.call('TYPE', KEYS[1])
local key_type = type(reply) == 'table' and reply.ok or reply
if key_type == 'none' then
  return {1}
end
if key_type ~= 'string' then
  return {3}
end
local value = redis.call('GET', KEYS[1])
if value == '1' then
  local tombstone_ttl = redis.call('PTTL', KEYS[1])
  if type(tombstone_ttl) ~= 'number' or tombstone_ttl <= 0 then
    return {3}
  end
  return {2}
end
return {3}
`;

const FINALIZE_ORPHAN_ACK_SCRIPT = `
local function key_type(key)
  local reply = redis.call('TYPE', key)
  if type(reply) == 'table' then
    return reply.ok
  end
  return reply
end

local function key_type_is(key, expected)
  local actual = key_type(key)
  return actual == 'none' or actual == expected
end

${BOUNDED_CANONICAL_JSON_LUA}
local function is_continuation_byte(value)
  return value and value >= 128 and value <= 191
end

local function utf16_length(value)
  local byte_length = string.len(value)
  local index = 1
  local units = 0
  while index <= byte_length do
    local first = string.byte(value, index)
    if first <= 127 then
      index = index + 1
      units = units + 1
    elseif first >= 194 and first <= 223 then
      local second = string.byte(value, index + 1)
      if not is_continuation_byte(second) then
        return nil
      end
      index = index + 2
      units = units + 1
    elseif first >= 224 and first <= 239 then
      local second = string.byte(value, index + 1)
      local third = string.byte(value, index + 2)
      if not is_continuation_byte(second)
        or not is_continuation_byte(third)
        or (first == 224 and second < 160)
        or (first == 237 and second > 159) then
        return nil
      end
      index = index + 3
      units = units + 1
    elseif first >= 240 and first <= 244 then
      local second = string.byte(value, index + 1)
      local third = string.byte(value, index + 2)
      local fourth = string.byte(value, index + 3)
      if not is_continuation_byte(second)
        or not is_continuation_byte(third)
        or not is_continuation_byte(fourth)
        or (first == 240 and second < 144)
        or (first == 244 and second > 143) then
        return nil
      end
      index = index + 4
      units = units + 2
    else
      return nil
    end
  end
  return units
end

local function valid_nonempty_string(value, maximum)
  if type(value) ~= 'string' then
    return false
  end
  local length = utf16_length(value)
  return length and length > 0 and length <= maximum
end

local function valid_identifier(value)
  return valid_nonempty_string(value, 128)
    and string.match(
      value,
      '^[A-Za-z0-9][A-Za-z0-9._:%-]*$'
    ) ~= nil
end

local function valid_timestamp(value)
  if type(value) ~= 'string' then
    return false
  end
  local year, month, day, hour, minute, second, millisecond =
    string.match(
      value,
      '^(%d%d%d%d)%-(%d%d)%-(%d%d)T'
        .. '(%d%d):(%d%d):(%d%d)%.(%d%d%d)Z$'
    )
  if not year then
    return false
  end
  year = tonumber(year)
  month = tonumber(month)
  day = tonumber(day)
  hour = tonumber(hour)
  minute = tonumber(minute)
  second = tonumber(second)
  millisecond = tonumber(millisecond)
  if month < 1 or month > 12
    or hour > 23
    or minute > 59
    or second > 59
    or millisecond > 999 then
    return false
  end
  local days = {
    31, 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31
  }
  local leap = (year % 4 == 0 and year % 100 ~= 0)
    or year % 400 == 0
  if leap then
    days[2] = 29
  end
  return day >= 1 and day <= days[month]
end

local function valid_u64(value)
  if type(value) ~= 'string'
    or not string.match(value, '^%d+$')
    or (string.len(value) > 1 and string.sub(value, 1, 1) == '0') then
    return false
  end
  local max_value = '18446744073709551615'
  return string.len(value) < 20
    or (string.len(value) == 20 and value <= max_value)
end

local function valid_delivery_id(value)
  if type(value) ~= 'string' then
    return false
  end
  local timestamp, sequence = string.match(value, '^(%d+)%-(%d+)$')
  if not timestamp or not valid_u64(timestamp) or not valid_u64(sequence) then
    return false
  end
  return timestamp ~= '0' or sequence ~= '0'
end

local allowed_message_fields = {
  protocolVersion = true,
  messageId = true,
  fromParticipantId = true,
  toParticipantId = true,
  scopeId = true,
  messageType = true,
  classification = true,
  body = true,
  createdAt = true,
  traceId = true,
  correlationId = true,
  replyToMessageId = true
}

local function valid_stored_envelope(
  value,
  scope_id,
  sender_id,
  old_recipient_id,
  message_id
)
  if type(value) ~= 'table' then
    return false
  end
  for key, _ in pairs(value) do
    if not allowed_message_fields[key] then
      return false
    end
  end
  if value.protocolVersion ~= ${COORDINATION_PROTOCOL_VERSION}
    or value.scopeId ~= scope_id
    or value.fromParticipantId ~= sender_id
    or value.toParticipantId ~= old_recipient_id
    or value.messageId ~= message_id
    or not valid_identifier(value.scopeId)
    or not valid_identifier(value.fromParticipantId)
    or not valid_identifier(value.toParticipantId)
    or not valid_identifier(value.messageId)
    or not valid_identifier(value.messageType)
    or (
      value.classification ~= 'internal'
      and value.classification ~= 'unrestricted'
    )
    or type(value.body) ~= 'string'
    or not valid_timestamp(value.createdAt) then
    return false
  end
  if value.traceId ~= nil
    and not valid_nonempty_string(value.traceId, 128) then
    return false
  end
  if value.correlationId ~= nil
    and not valid_nonempty_string(value.correlationId, 128) then
    return false
  end
  if value.replyToMessageId ~= nil
    and not valid_identifier(value.replyToMessageId) then
    return false
  end
  return true
end

local allowed_presence_fields = {
  protocolVersion = true,
  participantId = true,
  participantType = true,
  scopeId = true,
  displayName = true,
  capabilities = true,
  metadata = true,
  registeredAt = true,
  lastHeartbeatAt = true,
  leaseExpiresAt = true,
  leaseTokenHash = true
}

local function valid_capabilities(value)
  if type(value) ~= 'table' then
    return false
  end
  local count = 0
  for key, capability in pairs(value) do
    if type(key) ~= 'number'
      or key < 1
      or key ~= math.floor(key)
      or not valid_nonempty_string(capability, 128) then
      return false
    end
    count = count + 1
  end
  for index = 1, count do
    if value[index] == nil then
      return false
    end
  end
  return true
end

local function valid_metadata(value)
  if type(value) ~= 'table' then
    return false
  end
  for key, _ in pairs(value) do
    if type(key) ~= 'string' then
      return false
    end
  end
  return true
end

local function valid_presence(
  presence,
  old_recipient_id,
  scope_id
)
  if type(presence) ~= 'table' then
    return false
  end
  for key, _ in pairs(presence) do
    if not allowed_presence_fields[key] then
      return false
    end
  end
  if presence.protocolVersion ~= ${COORDINATION_PROTOCOL_VERSION}
    or presence.participantId ~= old_recipient_id
    or presence.scopeId ~= scope_id
    or not valid_identifier(presence.participantId)
    or not valid_identifier(presence.scopeId)
    or not valid_nonempty_string(presence.participantType, 128)
    or not valid_capabilities(presence.capabilities)
    or not valid_metadata(presence.metadata)
    or not valid_timestamp(presence.registeredAt)
    or not valid_timestamp(presence.lastHeartbeatAt)
    or not valid_timestamp(presence.leaseExpiresAt)
    or type(presence.leaseTokenHash) ~= 'string'
    or string.match(presence.leaseTokenHash, '^[a-f0-9]+$') == nil
    or string.len(presence.leaseTokenHash) ~= 64 then
    return false
  end
  if presence.displayName ~= nil
    and not valid_nonempty_string(presence.displayName, 256) then
    return false
  end
  return true
end

if #KEYS ~= 3 or #ARGV ~= 8 then
  return {5}
end
if not key_type_is(KEYS[3], 'string') then
  return {5}
end

local old_recipient_id = ARGV[1]
local scope_id = ARGV[2]
local sender_id = ARGV[3]
local message_id = ARGV[4]
local consume_key = ARGV[5]
local delivery_id = ARGV[8]
if not valid_identifier(old_recipient_id)
  or not valid_identifier(scope_id)
  or not valid_identifier(sender_id)
  or not valid_identifier(message_id)
  or string.len(consume_key) ~= 81
  or string.match(
    consume_key,
    '^coord%-consume%-v1%-[a-f0-9]+$'
  ) == nil
  or not valid_delivery_id(delivery_id) then
  return {5}
end

local tombstone_raw = redis.call('GET', KEYS[3])
if tombstone_raw then
  if tombstone_raw == '1' then
    local tombstone_ttl = redis.call('PTTL', KEYS[3])
    if type(tombstone_ttl) ~= 'number' or tombstone_ttl <= 0 then
      return {5}
    end
    return {2}
  end
  return {5}
end

if not key_type_is(KEYS[1], 'string')
  or key_type(KEYS[2]) ~= 'stream' then
  return {5}
end

local presence_raw = redis.call('GET', KEYS[1])
if presence_raw then
  local presence_ttl = redis.call('PTTL', KEYS[1])
  if type(presence_ttl) ~= 'number' or presence_ttl <= 0 then
    return {5}
  end
  local presence, presence_kinds = parse_canonical_json(
    presence_raw
  )
  if not presence
    or presence_kinds.capabilities ~= 'array'
    or presence_kinds.metadata ~= 'object'
    or not valid_presence(
      presence,
      old_recipient_id,
      scope_id
    ) then
    return {5}
  end
  return {3}
end

local pending = redis.pcall(
  'XPENDING',
  KEYS[2],
  ARGV[6],
  delivery_id,
  delivery_id,
  '1'
)
if type(pending) == 'table' and pending.err then
  return {4}
end
if type(pending) ~= 'table'
  or #pending ~= 1
  or type(pending[1]) ~= 'table'
  or #pending[1] ~= 4
  or pending[1][1] ~= delivery_id
  or type(pending[1][2]) ~= 'string'
  or type(pending[1][3]) ~= 'number'
  or type(pending[1][4]) ~= 'number' then
  return {4}
end

local stream_rows = redis.call(
  'XRANGE',
  KEYS[2],
  delivery_id,
  delivery_id,
  'COUNT',
  '1'
)
if type(stream_rows) ~= 'table'
  or #stream_rows ~= 1
  or type(stream_rows[1]) ~= 'table'
  or #stream_rows[1] ~= 2
  or stream_rows[1][1] ~= delivery_id
  or type(stream_rows[1][2]) ~= 'table'
  or #stream_rows[1][2] ~= 2
  or stream_rows[1][2][1] ~= 'envelope'
  or type(stream_rows[1][2][2]) ~= 'string' then
  return {4}
end
local envelope_raw = stream_rows[1][2][2]
local envelope = parse_canonical_json(envelope_raw)
if not envelope
  or not valid_stored_envelope(
    envelope,
    scope_id,
    sender_id,
    old_recipient_id,
    message_id
  ) then
  return {5}
end

local acknowledged = redis.call(
  'XACK',
  KEYS[2],
  ARGV[6],
  delivery_id
)
if acknowledged ~= 1 then
  return redis.error_reply('ERR invalid XACK reply')
end
local deleted = redis.call('XDEL', KEYS[2], delivery_id)
if deleted ~= 1 then
  return redis.error_reply('ERR invalid XDEL reply')
end
local stored = redis.call('SET', KEYS[3], '1', 'PX', ARGV[7])
if not (
  stored == 'OK'
  or (type(stored) == 'table' and stored.ok == 'OK')
) then
  return redis.error_reply('ERR invalid SET reply')
end
return {1}
`;

export { coordinationKeys };

export class CoordinationQueueError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CoordinationQueueError";
    this.code = code;
  }
}

function unavailable() {
  return new CoordinationQueueError(
    "COORDINATION_UNAVAILABLE",
    "coordination requires a reachable Redis service",
  );
}

function invalidData(kind) {
  return new CoordinationQueueError(
    "COORDINATION_INVALID_DATA",
    `coordination ${kind} contains invalid data`,
  );
}

function parseJsonObject(value, kind) {
  if (typeof value !== "string") throw invalidData(kind);
  try {
    const parsed = JSON.parse(value);
    if (
      !parsed
      || typeof parsed !== "object"
      || Array.isArray(parsed)
      || Object.getPrototypeOf(parsed) !== Object.prototype
    ) {
      throw new TypeError("expected a plain object");
    }
    return parsed;
  } catch (err) {
    if (err instanceof CoordinationQueueError) throw err;
    throw invalidData(kind);
  }
}

function positiveSafeInteger(value, fallback, label) {
  const normalized = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return normalized;
}

function nonNegativeSafeInteger(value, fallback, label) {
  const normalized = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
  return normalized;
}

function assertFunction(value, label) {
  if (typeof value !== "function") {
    throw new TypeError(`${label} must be a function`);
  }
  return value;
}

function isDenseArray(value) {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) return false;
  }
  return true;
}

function invalidAckRecoveryReply(kind) {
  return new TypeError(`coordination ${kind} is invalid`);
}

function snapshotQueueReply(value, expectedLength, kind) {
  if (!Array.isArray(value)) throw invalidAckRecoveryReply(kind);
  const length = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !length
    || !Object.hasOwn(length, "value")
    || length.value !== expectedLength
  ) {
    throw invalidAckRecoveryReply(kind);
  }
  const expectedKeys = new Set([
    "length",
    ...Array.from(
      { length: expectedLength },
      (_, index) => String(index),
    ),
  ]);
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.size
    || keys.some((key) => (
      typeof key !== "string" || !expectedKeys.has(key)
    ))
  ) {
    throw invalidAckRecoveryReply(kind);
  }
  const snapshot = new Array(expectedLength);
  for (let index = 0; index < expectedLength; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw invalidAckRecoveryReply(kind);
    }
    snapshot[index] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function assertPlainObject(value, label) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
  return value;
}

function assertExactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} contains an unknown field`);
    }
  }
}

function snapshotExactOwnData(value, allowed, label) {
  const source = assertPlainObject(value, label);
  const snapshot = {};
  for (const key of Reflect.ownKeys(source)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new TypeError(`${label} contains an unknown field`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${label} must contain own data fields`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function assertTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (
    typeof value !== "string"
    || !CANONICAL_ISO_TIMESTAMP.test(value)
    || !Number.isFinite(parsed)
    || new Date(parsed).toISOString() !== value
  ) {
    throw new TypeError(`${label} must be a canonical ISO timestamp`);
  }
  return value;
}

function assertParticipantRecord(record, keys) {
  const value = assertPlainObject(record, "participant record");
  assertExactKeys(value, PARTICIPANT_FIELDS, "participant record");
  if (value.protocolVersion !== COORDINATION_PROTOCOL_VERSION) {
    throw new TypeError("participant protocolVersion is invalid");
  }
  const normalizedFence = createCoordinationLeaseFence(value);
  keys.presence(normalizedFence.participantId);
  if (
    typeof value.participantType !== "string"
    || value.participantType.length === 0
    || value.participantType.length > 128
  ) {
    throw new TypeError("participantType is invalid");
  }
  if (
    value.displayName !== undefined
    && (
      typeof value.displayName !== "string"
      || value.displayName.length === 0
      || value.displayName.length > 256
    )
  ) {
    throw new TypeError("displayName is invalid");
  }
  if (
    !isDenseArray(value.capabilities)
    || value.capabilities.some(
      (capability) =>
        typeof capability !== "string"
        || capability.length === 0
        || capability.length > 128,
    )
  ) {
    throw new TypeError("capabilities are invalid");
  }
  assertPlainObject(value.metadata, "participant metadata");
  assertTimestamp(value.registeredAt, "registeredAt");
  assertTimestamp(value.lastHeartbeatAt, "lastHeartbeatAt");
  assertTimestamp(value.leaseExpiresAt, "leaseExpiresAt");
  return {
    fence: normalizedFence,
    serialized: JSON.stringify(value),
    value,
  };
}

function participantEvent(record, eventType, timestamp) {
  return JSON.stringify({
    protocolVersion: COORDINATION_PROTOCOL_VERSION,
    eventType,
    participantId: record.participantId,
    participantType: record.participantType,
    scopeId: record.scopeId,
    timestamp: assertTimestamp(timestamp, "event timestamp"),
  });
}

function assertNonemptyString(value, label, max = 256) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > max
  ) {
    throw new TypeError(`${label} is invalid`);
  }
  return value;
}

function assertFence(value, label) {
  const source = assertPlainObject(value, label);
  assertExactKeys(source, FENCE_FIELDS, label);
  return createCoordinationLeaseFence(source);
}

function assertMessageEnvelope(envelope, keys) {
  const value = assertPlainObject(envelope, "message envelope");
  assertExactKeys(value, MESSAGE_FIELDS, "message envelope");
  if (value.protocolVersion !== COORDINATION_PROTOCOL_VERSION) {
    throw new TypeError("message protocolVersion is invalid");
  }
  assertNonemptyString(value.messageId, "messageId", 128);
  assertNonemptyString(value.fromParticipantId, "fromParticipantId", 128);
  assertNonemptyString(value.toParticipantId, "toParticipantId", 128);
  assertNonemptyString(value.scopeId, "scopeId", 128);
  assertNonemptyString(value.messageType, "messageType", 128);
  if (!MESSAGE_CLASSIFICATIONS.has(value.classification)) {
    throw new TypeError("classification is invalid");
  }
  if (typeof value.body !== "string") {
    throw new TypeError("body is invalid");
  }
  assertTimestamp(value.createdAt, "createdAt");
  for (const field of ["traceId", "correlationId", "replyToMessageId"]) {
    if (Object.hasOwn(value, field)) {
      assertNonemptyString(value[field], field, 128);
    }
  }
  keys.dedupe(value.fromParticipantId, value.messageId);
  keys.inbox(value.toParticipantId);
  return {
    serialized: JSON.stringify(value),
    value,
  };
}

function isCanonicalDeliveryId(value) {
  if (typeof value !== "string" || value.length > 128) return false;
  const match = DELIVERY_ID.exec(value);
  if (!match) return false;
  const timestamp = BigInt(match[1]);
  const sequence = BigInt(match[2]);
  return (
    (timestamp > 0n || sequence > 0n)
    && timestamp <= MAX_DELIVERY_ID_COMPONENT
    && sequence <= MAX_DELIVERY_ID_COMPONENT
  );
}

function isCanonicalStreamCursor(value) {
  if (typeof value !== "string" || value.length > 128) return false;
  const match = DELIVERY_ID.exec(value);
  if (!match) return false;
  return (
    BigInt(match[1]) <= MAX_DELIVERY_ID_COMPONENT
    && BigInt(match[2]) <= MAX_DELIVERY_ID_COMPONENT
  );
}

function compareStreamIds(left, right) {
  const leftMatch = DELIVERY_ID.exec(left);
  const rightMatch = DELIVERY_ID.exec(right);
  const leftTimestamp = BigInt(leftMatch[1]);
  const rightTimestamp = BigInt(rightMatch[1]);
  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp < rightTimestamp ? -1 : 1;
  }
  const leftSequence = BigInt(leftMatch[2]);
  const rightSequence = BigInt(rightMatch[2]);
  if (leftSequence === rightSequence) return 0;
  return leftSequence < rightSequence ? -1 : 1;
}

function assertAckDeliveryIds(value, keys, participantId) {
  if (
    !isDenseArray(value)
    || value.length === 0
    || value.length > MAX_ACK_COUNT
  ) {
    throw new TypeError("deliveryIds must be a dense array of 1 to 100 IDs");
  }
  const seen = new Set();
  return value.map((deliveryId) => {
    if (!isCanonicalDeliveryId(deliveryId) || seen.has(deliveryId)) {
      throw new TypeError("deliveryIds must contain unique canonical IDs");
    }
    seen.add(deliveryId);
    keys.acked(participantId, deliveryId);
    return deliveryId;
  });
}

function assertAckRecoveryIdentity(value, keys, { finalize = false } = {}) {
  const source = snapshotExactOwnData(
    value,
    finalize
      ? ACK_ORPHAN_FINALIZE_FIELDS
      : ACK_RECOVERY_IDENTITY_FIELDS,
    "ACK recovery identity",
  );
  const deliveryId = source.deliveryId;
  if (!isCanonicalDeliveryId(deliveryId)) {
    throw new TypeError("ACK recovery deliveryId is invalid");
  }
  for (const field of [
    "scopeId",
    "fromParticipantId",
    "oldParticipantId",
    "messageId",
  ]) {
    assertNonemptyString(source[field], field, 128);
  }
  const expectedConsumeKey = coordinationConsumeKey({
    protocolVersion: COORDINATION_PROTOCOL_VERSION,
    scopeId: source.scopeId,
    fromParticipantId: source.fromParticipantId,
    toParticipantId: source.oldParticipantId,
    messageId: source.messageId,
  });
  if (source.consumeKey !== expectedConsumeKey) {
    throw new TypeError("ACK recovery consumeKey does not match identity");
  }
  keys.presence(source.oldParticipantId);
  keys.inbox(source.oldParticipantId);
  keys.acked(source.oldParticipantId, deliveryId);
  return {
    consumeKey: expectedConsumeKey,
    deliveryId,
    scopeId: source.scopeId,
    fromParticipantId: source.fromParticipantId,
    oldParticipantId: source.oldParticipantId,
    messageId: source.messageId,
    ...(finalize
      ? {
          tombstoneTtlMs: positiveSafeInteger(
            source.tombstoneTtlMs,
            undefined,
            "tombstoneTtlMs",
          ),
        }
      : {}),
  };
}

function ackRecoveryBuildOptions(value, label) {
  const source = snapshotExactOwnData(
    value,
    ACK_RECOVERY_BUILD_FIELDS,
    label,
  );
  return {
    identity: source.identity,
    keys: coordinationKeys(
      source.prefix ?? DEFAULT_COORDINATION_PREFIX,
    ),
  };
}

export function buildCoordinationAckTombstoneInspectionCommand(
  options = {},
) {
  try {
    const { identity: rawIdentity, keys } = ackRecoveryBuildOptions(
      options,
      "ACK tombstone inspection command",
    );
    const identity = assertAckRecoveryIdentity(rawIdentity, keys);
    return Object.freeze([
      "EVAL",
      INSPECT_ACK_TOMBSTONE_SCRIPT,
      "1",
      keys.acked(
        identity.oldParticipantId,
        identity.deliveryId,
      ),
    ]);
  } catch {
    throw new TypeError(
      "coordination ACK tombstone inspection command is invalid",
    );
  }
}

export function buildCoordinationOrphanAckFinalizationCommand(
  options = {},
) {
  try {
    const { identity: rawIdentity, keys } = ackRecoveryBuildOptions(
      options,
      "orphan ACK finalization command",
    );
    const identity = assertAckRecoveryIdentity(
      rawIdentity,
      keys,
      { finalize: true },
    );
    const redisKeys = [
      keys.presence(identity.oldParticipantId),
      keys.inbox(identity.oldParticipantId),
      keys.acked(
        identity.oldParticipantId,
        identity.deliveryId,
      ),
    ];
    return Object.freeze([
      "EVAL",
      FINALIZE_ORPHAN_ACK_SCRIPT,
      String(redisKeys.length),
      ...redisKeys,
      identity.oldParticipantId,
      identity.scopeId,
      identity.fromParticipantId,
      identity.messageId,
      identity.consumeKey,
      COORDINATION_CONSUMER_GROUP,
      String(identity.tombstoneTtlMs),
      identity.deliveryId,
    ]);
  } catch {
    throw new TypeError(
      "coordination orphan ACK finalization command is invalid",
    );
  }
}

function sameSemanticMessage(left, right) {
  const fields = [
    "protocolVersion",
    "messageId",
    "fromParticipantId",
    "toParticipantId",
    "scopeId",
    "messageType",
    "classification",
    "body",
    "traceId",
    "correlationId",
    "replyToMessageId",
  ];
  return fields.every(
    (field) =>
      Object.hasOwn(left, field) === Object.hasOwn(right, field)
      && left[field] === right[field],
  );
}

function decodeSendResult(reply, attempted, keys) {
  if (
    !isDenseArray(reply)
    || reply.length === 0
    || !Number.isSafeInteger(reply[0])
  ) {
    throw invalidData("message result");
  }
  const [code] = reply;
  const statuses = new Map([
    [3, "sender_fence_mismatch"],
    [4, "target_missing"],
    [5, "recipient_fence_mismatch"],
    [6, "conflict"],
    [7, "inbox_full"],
  ]);
  if (statuses.has(code)) {
    if (reply.length !== 1) throw invalidData("message result");
    return { status: statuses.get(code) };
  }
  if (code === 8) throw invalidData("message state");
  if (
    (code !== 1 && code !== 2)
    || !isCanonicalDeliveryId(reply[1])
    || reply.length !== (code === 1 ? 2 : 3)
  ) {
    throw invalidData("message result");
  }
  if (code === 1) {
    return { status: "created", deliveryId: reply[1] };
  }

  let original;
  try {
    original = assertMessageEnvelope(
      parseJsonObject(reply[2], "message envelope"),
      keys,
    ).value;
  } catch (err) {
    if (err instanceof CoordinationQueueError) throw err;
    throw invalidData("message envelope");
  }
  if (!sameSemanticMessage(original, attempted)) {
    throw invalidData("message result");
  }
  return {
    status: "duplicate",
    deliveryId: reply[1],
    envelope: original,
  };
}

function decodeFencedReceiveResult(reply, kind) {
  if (
    !isDenseArray(reply)
    || reply.length === 0
    || !Number.isSafeInteger(reply[0])
  ) {
    throw invalidData(kind);
  }
  const [code] = reply;
  if (code === 4) {
    if (reply.length !== 1) throw invalidData(kind);
    return { status: "fence_mismatch" };
  }
  if (code === 5 || code === 6) throw invalidData(kind);
  if (code !== 0 || reply.length !== 2) throw invalidData(kind);
  return { status: "ok", value: reply[1] };
}

function decodeInboxEntries(
  rawEntries,
  {
    count,
    inboxKey,
    participantId,
    scopeId,
    recovered,
    keys,
    seen,
  },
) {
  if (!isDenseArray(rawEntries) || rawEntries.length > count) {
    throw invalidData("inbox entries");
  }
  const deliveries = [];
  for (const rawEntry of rawEntries) {
    if (
      !isDenseArray(rawEntry)
      || rawEntry.length !== 2
      || !isCanonicalDeliveryId(rawEntry[0])
      || !isDenseArray(rawEntry[1])
      || rawEntry[1].length !== 2
      || rawEntry[1][0] !== "envelope"
      || typeof rawEntry[1][1] !== "string"
      || seen.has(rawEntry[0])
    ) {
      throw invalidData("inbox entry");
    }
    let message;
    try {
      message = assertMessageEnvelope(
        parseJsonObject(rawEntry[1][1], "message envelope"),
        keys,
      ).value;
    } catch (err) {
      if (err instanceof CoordinationQueueError) throw err;
      throw invalidData("message envelope");
    }
    if (
      message.toParticipantId !== participantId
      || message.scopeId !== scopeId
      || keys.inbox(message.toParticipantId) !== inboxKey
    ) {
      throw invalidData("inbox entry");
    }
    seen.add(rawEntry[0]);
    deliveries.push({
      deliveryId: rawEntry[0],
      message,
      recovered,
    });
  }
  return deliveries;
}

function decodeReadGroupReply(raw, options) {
  if (raw === null) return [];
  if (
    !isDenseArray(raw)
    || raw.length !== 1
    || !isDenseArray(raw[0])
    || raw[0].length !== 2
    || raw[0][0] !== options.inboxKey
  ) {
    throw invalidData("inbox read");
  }
  return decodeInboxEntries(raw[0][1], options);
}

function decodeAutoClaimReply(raw, options) {
  if (
    !isDenseArray(raw)
    || raw.length !== 3
    || !isCanonicalStreamCursor(raw[0])
    || !isDenseArray(raw[2])
    || raw[2].some((deliveryId) => !isCanonicalDeliveryId(deliveryId))
  ) {
    throw invalidData("inbox reclaim");
  }
  if (raw[2].length > 0) throw invalidData("inbox reclaim");
  return {
    cursor: raw[0],
    deliveries: decodeInboxEntries(raw[1], options),
  };
}

function parseInboxFenceResult(result) {
  if (!Number.isSafeInteger(result)) throw invalidData("inbox fence");
  if (result === 0) return { status: "ok" };
  if (result === 4) return { status: "fence_mismatch" };
  if (result === 5) throw invalidData("inbox state");
  throw invalidData("inbox fence");
}

function decodeAckResult(reply, requestedCount) {
  if (
    !isDenseArray(reply)
    || reply.length === 0
    || !Number.isSafeInteger(reply[0])
  ) {
    throw invalidData("ack result");
  }
  const [code] = reply;
  if (code === 4 || code === 6) {
    if (reply.length !== 1) throw invalidData("ack result");
    return {
      status: code === 4 ? "fence_mismatch" : "delivery_not_found",
    };
  }
  if (code === 5 || code === 7) throw invalidData("ack state");
  if (
    code !== 1
    || reply.length !== 2
    || !Number.isSafeInteger(reply[1])
    || reply[1] < 0
    || reply[1] > requestedCount
  ) {
    throw invalidData("ack result");
  }
  return { status: "acked", ackedCount: reply[1] };
}

export function decodeCoordinationOrphanAckFinalizationReply(reply) {
  try {
    const snapshot = snapshotQueueReply(
      reply,
      1,
      "orphan ACK result",
    );
    if (!Number.isSafeInteger(snapshot[0])) {
      throw invalidAckRecoveryReply("orphan ACK result");
    }
    const statuses = new Map([
      [1, "orphan_acked"],
      [2, "ack_tombstone"],
      [3, "old_participant_present"],
      [4, "transport_state_unknown"],
      [5, "transport_state_unknown"],
    ]);
    const status = statuses.get(snapshot[0]);
    if (!status) throw invalidAckRecoveryReply("orphan ACK result");
    return Object.freeze({ status });
  } catch {
    throw invalidAckRecoveryReply("orphan ACK result");
  }
}

export function decodeCoordinationAckTombstoneInspectionReply(reply) {
  try {
    const snapshot = snapshotQueueReply(
      reply,
      1,
      "ACK tombstone inspection",
    );
    const statuses = new Map([
      [1, "absent"],
      [2, "ack_tombstone"],
      [3, "transport_state_unknown"],
    ]);
    const status = statuses.get(snapshot[0]);
    if (!status) {
      throw invalidAckRecoveryReply("ACK tombstone inspection");
    }
    return Object.freeze({ status });
  } catch {
    throw invalidAckRecoveryReply("ACK tombstone inspection");
  }
}

function parseLifecycleResult(result, statuses) {
  if (!Number.isSafeInteger(result)) throw invalidData("lifecycle result");
  if (result === 5) throw invalidData("participant state");
  const status = statuses.get(result);
  if (!status) throw invalidData("lifecycle result");
  return { status };
}

function decodeScanReply(reply) {
  if (
    !isDenseArray(reply)
    || reply.length !== 2
    || typeof reply[0] !== "string"
    || !SCAN_CURSOR.test(reply[0])
    || BigInt(reply[0]) > MAX_SCAN_CURSOR
    || !isDenseArray(reply[1])
    || reply[1].some((participantId) => typeof participantId !== "string")
  ) {
    throw invalidData("participant scan");
  }
  return {
    cursor: reply[0],
    participantIds: reply[1],
  };
}

function decodeParticipantBatch(reply, requestedIds) {
  if (
    !isDenseArray(reply)
    || reply.length === 0
    || !Number.isSafeInteger(reply[0])
  ) {
    throw invalidData("participant list");
  }
  if (reply[0] === 4) return { status: "fence_mismatch" };
  if (reply[0] === 5) throw invalidData("participant state");
  if (reply[0] !== 0 || (reply.length - 1) % 2 !== 0) {
    throw invalidData("participant list");
  }

  const requested = new Set(requestedIds);
  const seen = new Set();
  const participants = [];
  for (let index = 1; index < reply.length; index += 2) {
    const participantId = reply[index];
    if (
      typeof participantId !== "string"
      || !requested.has(participantId)
      || seen.has(participantId)
    ) {
      throw invalidData("participant list");
    }
    const record = parseJsonObject(reply[index + 1], "participant");
    if (record.participantId !== participantId) {
      throw invalidData("participant list");
    }
    seen.add(participantId);
    participants.push(record);
  }
  return { status: "listed", participants };
}

function isBusyGroupError(err) {
  return (
    err?.code === "BUSYGROUP"
    || /^BUSYGROUP(?:\s|$)/.test(
      typeof err?.message === "string" ? err.message : "",
    )
  );
}

function isNoGroupError(err) {
  return (
    err?.code === "NOGROUP"
    || /^NOGROUP(?:\s|$)/.test(
      typeof err?.message === "string" ? err.message : "",
    )
  );
}

const redisCoordinationQueueStates = new WeakMap();

function redisCoordinationQueueState(queue) {
  const state = redisCoordinationQueueStates.get(queue);
  if (!state) {
    throw new TypeError("invalid Redis coordination queue receiver");
  }
  return state;
}

export class RedisCoordinationQueue {
  constructor({
    redisUrl = "",
    prefix = DEFAULT_COORDINATION_PREFIX,
    maxInboxLength = DEFAULT_MAX_INBOX_LENGTH,
    connectTimeoutMs = DEFAULT_CONNECT_TIMEOUT_MS,
    orphanInboxTtlMs = DEFAULT_COORDINATION_ORPHAN_INBOX_TTL_MS,
    maxCommandConcurrency = DEFAULT_COMMAND_CONCURRENCY,
    maxCommandQueue = DEFAULT_COMMAND_QUEUE,
    maxBlockingQueue = DEFAULT_BLOCKING_QUEUE,
    shutdownTimeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
    clientFactory = createClient,
    onError = () => {},
  } = {}) {
    if (typeof redisUrl !== "string") {
      throw new TypeError("redisUrl must be a string");
    }
    const keys = coordinationKeys(prefix);
    const maxInboxLengthValue = positiveSafeInteger(
      maxInboxLength,
      DEFAULT_MAX_INBOX_LENGTH,
      "maxInboxLength",
    );
    const connectTimeoutMsValue = positiveSafeInteger(
      connectTimeoutMs,
      DEFAULT_CONNECT_TIMEOUT_MS,
      "connectTimeoutMs",
    );
    const orphanInboxTtlMsValue = positiveSafeInteger(
      orphanInboxTtlMs,
      DEFAULT_COORDINATION_ORPHAN_INBOX_TTL_MS,
      "orphanInboxTtlMs",
    );
    const normalizedClientFactory = assertFunction(
      clientFactory,
      "clientFactory",
    );
    const normalizedOnError = assertFunction(onError, "onError");
    const clientOptions = {
      url: redisUrl,
      RESP: 2,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: connectTimeoutMsValue,
        reconnectStrategy: false,
      },
    };
    const laneOptions = {
      clientFactory: normalizedClientFactory,
      clientOptions,
      shutdownTimeoutMs: positiveSafeInteger(
        shutdownTimeoutMs,
        DEFAULT_SHUTDOWN_TIMEOUT_MS,
        "shutdownTimeoutMs",
      ),
      unavailable,
      onError: normalizedOnError,
    };
    const commandLane = new RedisClientLane({
      ...laneOptions,
      kind: "command",
      concurrency: positiveSafeInteger(
        maxCommandConcurrency,
        DEFAULT_COMMAND_CONCURRENCY,
        "maxCommandConcurrency",
      ),
      queueLimit: positiveSafeInteger(
        maxCommandQueue,
        DEFAULT_COMMAND_QUEUE,
        "maxCommandQueue",
      ),
    });
    const blockingLane = new RedisClientLane({
      ...laneOptions,
      kind: "blocking",
      concurrency: DEFAULT_BLOCKING_CONCURRENCY,
      queueLimit: positiveSafeInteger(
        maxBlockingQueue,
        DEFAULT_BLOCKING_QUEUE,
        "maxBlockingQueue",
      ),
    });
    redisCoordinationQueueStates.set(this, {
      keys,
      group: COORDINATION_CONSUMER_GROUP,
      maxInboxLength: maxInboxLengthValue,
      orphanInboxTtlMs: orphanInboxTtlMsValue,
      enabled: redisUrl.length > 0,
      closed: false,
      closePromise: null,
      commandLane,
      blockingLane,
    });
  }

  get enabled() {
    return redisCoordinationQueueState(this).enabled;
  }

  describe() {
    const state = redisCoordinationQueueState(this);
    return Object.freeze({
      enabled: state.enabled,
      prefix: state.keys.prefix,
      eventsStream: state.keys.events,
      consumerGroup: state.group,
    });
  }

  lifecycle() {
    const state = redisCoordinationQueueState(this);
    return Object.freeze({
      state: state.closed ? "closed" : state.enabled ? "open" : "disabled",
      command: Object.freeze(snapshotRedisClientLane(state.commandLane)),
      blocking: Object.freeze(snapshotRedisClientLane(state.blockingLane)),
    });
  }

  close() {
    const state = redisCoordinationQueueState(this);
    if (state.closePromise) return state.closePromise;
    state.closed = true;
    state.closePromise = Promise.all([
      closeRedisClientLane(state.commandLane),
      closeRedisClientLane(state.blockingLane),
    ]).then(() => Object.freeze({ status: "closed" }));
    return state.closePromise;
  }

  async ping() {
    const reply = await this.#withClient((client) =>
      client.sendCommand(["PING"]),
    );
    if (reply !== "PONG") throw invalidData("health response");
    return { status: "ready" };
  }

  async putParticipant(record, {
    ttlMs,
    ifAbsent,
    fence,
  } = {}) {
    const state = redisCoordinationQueueState(this);
    const normalizedTtlMs = positiveSafeInteger(ttlMs, undefined, "ttlMs");
    if (typeof ifAbsent !== "boolean") {
      throw new TypeError("ifAbsent must be a boolean");
    }
    const validated = assertParticipantRecord(record, state.keys);
    const participantId = validated.fence.participantId;
    const keys = [
      state.keys.presence(participantId),
      state.keys.participants,
      state.keys.inbox(participantId),
      state.keys.events,
    ];

    if (ifAbsent) {
      if (fence !== undefined) {
        throw new TypeError("register does not accept a fence");
      }
      const event = participantEvent(
        validated.value,
        "participant.joined",
        validated.value.registeredAt,
      );
      const result = await this.#withClient((client) =>
        client.sendCommand([
          "EVAL",
          REGISTER_PARTICIPANT_SCRIPT,
          String(keys.length),
          ...keys,
          validated.serialized,
          String(normalizedTtlMs),
          participantId,
          state.group,
          event,
        ]),
      );
      return parseLifecycleResult(result, new Map([
        [1, "stored"],
        [2, "exists"],
      ]));
    }

    const expected = createCoordinationLeaseFence(fence);
    if (expected.participantId !== participantId) {
      throw new TypeError("participant record does not match its fence");
    }
    const event = participantEvent(
      validated.value,
      "participant.heartbeat",
      validated.value.lastHeartbeatAt,
    );
    const result = await this.#withClient((client) =>
      client.sendCommand([
        "EVAL",
        RENEW_PARTICIPANT_SCRIPT,
        String(keys.length),
        ...keys,
        validated.serialized,
        String(normalizedTtlMs),
        participantId,
        expected.leaseTokenHash,
        expected.scopeId,
        state.group,
        event,
      ]),
    );
    return parseLifecycleResult(result, new Map([
      [1, "stored"],
      [3, "missing"],
      [4, "fence_mismatch"],
    ]));
  }

  async getParticipant(participantId, { signal } = {}) {
    const state = redisCoordinationQueueState(this);
    const presenceKey = state.keys.presence(participantId);
    const raw = await this.#withClient((client) =>
      client.sendCommand(
        ["GET", presenceKey],
        // MUTATION_GUARD: participant-command-abort-signal
        { abortSignal: signal },
      ), {
      // MUTATION_GUARD: participant-lane-abort-signal
      signal,
    });
    return raw === null ? null : parseJsonObject(raw, "participant");
  }

  async listParticipants({ fence } = {}) {
    const state = redisCoordinationQueueState(this);
    const expected = createCoordinationLeaseFence(fence);
    const callerPresenceKey = state.keys.presence(expected.participantId);
    return this.#withClient(async (client) => {
      const participants = [];
      const returnedIds = new Set();
      const scannedIds = new Set();
      const seenCursors = new Set(["0"]);
      let cursor = "0";

      const evaluateBatch = async (participantIds) => {
        const batchKeys = [callerPresenceKey, state.keys.participants];
        for (const participantId of participantIds) {
          try {
            batchKeys.push(
              state.keys.presence(participantId),
              state.keys.inbox(participantId),
            );
          } catch {
            throw invalidData("participant registry");
          }
        }
        const reply = await client.sendCommand([
          "EVAL",
          LIST_PARTICIPANTS_SCRIPT,
          String(batchKeys.length),
          ...batchKeys,
          expected.participantId,
          expected.leaseTokenHash,
          expected.scopeId,
          String(state.orphanInboxTtlMs),
          ...participantIds,
        ]);
        const decoded = decodeParticipantBatch(reply, participantIds);
        if (decoded.status === "fence_mismatch") return decoded;
        for (const record of decoded.participants) {
          if (returnedIds.has(record.participantId)) {
            throw invalidData("participant list");
          }
          returnedIds.add(record.participantId);
          participants.push(record);
        }
        return { status: "listed" };
      };

      do {
        const scan = decodeScanReply(await client.sendCommand([
          "SSCAN",
          state.keys.participants,
          cursor,
          "COUNT",
          String(DISCOVERY_BATCH_SIZE),
        ]));
        const newIds = [];
        for (const participantId of scan.participantIds) {
          if (scannedIds.has(participantId)) continue;
          scannedIds.add(participantId);
          newIds.push(participantId);
        }
        for (
          let offset = 0;
          offset < newIds.length;
          offset += DISCOVERY_BATCH_SIZE
        ) {
          const result = await evaluateBatch(
            newIds.slice(offset, offset + DISCOVERY_BATCH_SIZE),
          );
          if (result.status === "fence_mismatch") {
            return { status: "fence_mismatch" };
          }
        }

        if (scan.cursor !== "0") {
          if (seenCursors.has(scan.cursor)) {
            throw invalidData("participant scan");
          }
          seenCursors.add(scan.cursor);
        }
        cursor = scan.cursor;
      } while (cursor !== "0");

      const finalFence = await evaluateBatch([]);
      if (finalFence.status === "fence_mismatch") {
        return { status: "fence_mismatch" };
      }
      return { status: "listed", participants };
    });
  }

  async deleteParticipant(participantId, {
    fence,
    timestamp,
  } = {}) {
    const state = redisCoordinationQueueState(this);
    const expected = createCoordinationLeaseFence(fence);
    if (expected.participantId !== participantId) {
      throw new TypeError("participantId does not match its fence");
    }
    const normalizedTimestamp = assertTimestamp(timestamp, "timestamp");
    const keys = [
      state.keys.presence(participantId),
      state.keys.participants,
      state.keys.inbox(participantId),
      state.keys.events,
    ];
    const result = await this.#withClient((client) =>
      client.sendCommand([
        "EVAL",
        DELETE_PARTICIPANT_SCRIPT,
        String(keys.length),
        ...keys,
        participantId,
        expected.leaseTokenHash,
        expected.scopeId,
        String(state.orphanInboxTtlMs),
        normalizedTimestamp,
      ]),
    );
    return parseLifecycleResult(result, new Map([
      [1, "deleted"],
      [3, "missing"],
      [4, "fence_mismatch"],
    ]));
  }

  async putMessage(envelope, {
    senderFence,
    recipientFence,
    dedupeTtlMs,
  } = {}) {
    const state = redisCoordinationQueueState(this);
    const message = assertMessageEnvelope(envelope, state.keys);
    const sender = assertFence(senderFence, "senderFence");
    const recipient = assertFence(recipientFence, "recipientFence");
    if (
      sender.participantId !== message.value.fromParticipantId
      || sender.scopeId !== message.value.scopeId
      || recipient.participantId !== message.value.toParticipantId
      || recipient.scopeId !== message.value.scopeId
    ) {
      throw new TypeError("message envelope does not match its fences");
    }
    const normalizedDedupeTtlMs = positiveSafeInteger(
      dedupeTtlMs,
      undefined,
      "dedupeTtlMs",
    );
    const keys = [
      state.keys.presence(sender.participantId),
      state.keys.presence(recipient.participantId),
      state.keys.inbox(recipient.participantId),
      state.keys.dedupe(sender.participantId, message.value.messageId),
      state.keys.events,
    ];
    const reply = await this.#withClient((client) =>
      client.sendCommand([
        "EVAL",
        SEND_MESSAGE_SCRIPT,
        String(keys.length),
        ...keys,
        message.serialized,
        sender.participantId,
        sender.leaseTokenHash,
        sender.scopeId,
        recipient.participantId,
        recipient.leaseTokenHash,
        recipient.scopeId,
        message.value.messageId,
        String(normalizedDedupeTtlMs),
        String(state.maxInboxLength),
      ]),
    );
    return decodeSendResult(reply, message.value, state.keys);
  }

  async readInbox({
    participantId,
    consumerId,
    count,
    reclaimIdleMs = null,
    blockMs = 0,
    now,
    fence,
  } = {}, { signal } = {}) {
    const state = redisCoordinationQueueState(this);
    const expected = assertFence(fence, "fence");
    const presenceKey = state.keys.presence(participantId);
    const inboxKey = state.keys.inbox(participantId);
    if (expected.participantId !== participantId) {
      throw new TypeError("participantId does not match its fence");
    }
    encodeCoordinationKeyPart(consumerId, "consumerId");
    const normalizedCount = positiveSafeInteger(count, undefined, "count");
    if (normalizedCount > MAX_RECEIVE_COUNT) {
      throw new TypeError(`count must not exceed ${MAX_RECEIVE_COUNT}`);
    }
    const normalizedReclaimIdleMs =
      reclaimIdleMs === null
        ? null
        : nonNegativeSafeInteger(
          reclaimIdleMs,
          undefined,
          "reclaimIdleMs",
        );
    const normalizedBlockMs = nonNegativeSafeInteger(
      blockMs,
      0,
      "blockMs",
    );
    nonNegativeSafeInteger(now, undefined, "now");
    const redisKeys = [presenceKey, inboxKey];
    const fenceArgs = [
      participantId,
      expected.leaseTokenHash,
      expected.scopeId,
    ];

    return this.#withClient(async (client) => {
      const deliveries = [];
      const seen = new Set();
      // MUTATION_GUARD: redis-command-abort-signal
      const sendCommand = (command) =>
        client.sendCommand(command, { abortSignal: signal });

      const decodeOptions = (remaining, recovered) => ({
        count: remaining,
        inboxKey,
        participantId,
        scopeId: expected.scopeId,
        recovered,
        keys: state.keys,
        seen,
      });

      const evaluateFence = async () =>
        parseInboxFenceResult(await sendCommand([
          "EVAL",
          FENCE_INBOX_SCRIPT,
          String(redisKeys.length),
          ...redisKeys,
          ...fenceArgs,
        ]));

      if (normalizedReclaimIdleMs !== null) {
        let cursor = "0-0";
        let pageCount = 0;
        while (deliveries.length < normalizedCount) {
          pageCount += 1;
          if (pageCount > state.maxInboxLength + 1) {
            throw invalidData("inbox reclaim");
          }
          const remaining = normalizedCount - deliveries.length;
          const result = decodeFencedReceiveResult(
            await sendCommand([
              "EVAL",
              FENCED_AUTOCLAIM_SCRIPT,
              String(redisKeys.length),
              ...redisKeys,
              ...fenceArgs,
              state.group,
              consumerId,
              String(normalizedReclaimIdleMs),
              cursor,
              String(remaining),
            ]),
            "inbox reclaim",
          );
          if (result.status === "fence_mismatch") {
            return { status: "fence_mismatch" };
          }
          const page = decodeAutoClaimReply(
            result.value,
            decodeOptions(remaining, true),
          );
          if (
            page.cursor !== "0-0"
            && compareStreamIds(page.cursor, cursor) <= 0
          ) {
            throw invalidData("inbox reclaim");
          }
          deliveries.push(...page.deliveries);
          if (
            page.cursor === "0-0"
            || deliveries.length === normalizedCount
          ) {
            break;
          }
          cursor = page.cursor;
        }
      }

      const remaining = normalizedCount - deliveries.length;
      if (remaining === 0) {
        return { status: "read", deliveries };
      }

      if (deliveries.length > 0 || normalizedBlockMs === 0) {
        const result = decodeFencedReceiveResult(
          await sendCommand([
            "EVAL",
            FENCED_READ_NEW_SCRIPT,
            String(redisKeys.length),
            ...redisKeys,
            ...fenceArgs,
            state.group,
            consumerId,
            String(remaining),
          ]),
          "inbox read",
        );
        if (result.status === "fence_mismatch") {
          return { status: "fence_mismatch" };
        }
        deliveries.push(...decodeReadGroupReply(
          result.value,
          decodeOptions(remaining, false),
        ));
        return { status: "read", deliveries };
      }

      const before = await evaluateFence();
      if (before.status === "fence_mismatch") {
        return { status: "fence_mismatch" };
      }
      let raw;
      try {
        raw = await sendCommand([
          "XREADGROUP",
          "GROUP",
          state.group,
          consumerId,
          "COUNT",
          String(remaining),
          "BLOCK",
          String(normalizedBlockMs),
          "STREAMS",
          inboxKey,
          ">",
        ]);
      } catch (err) {
        if (isNoGroupError(err)) throw invalidData("consumer group state");
        throw err;
      }
      const after = await evaluateFence();
      if (after.status === "fence_mismatch") {
        return { status: "fence_mismatch" };
      }
      deliveries.push(...decodeReadGroupReply(
        raw,
        decodeOptions(remaining, false),
      ));
      return { status: "read", deliveries };
    }, {
      blocking: normalizedBlockMs > 0,
      // MUTATION_GUARD: blocking-lane-abort-signal
      signal,
    });
  }

  async ackInbox({
    participantId,
    deliveryIds,
    tombstoneTtlMs,
    timestamp,
    fence,
  } = {}) {
    const state = redisCoordinationQueueState(this);
    const expected = assertFence(fence, "fence");
    const presenceKey = state.keys.presence(participantId);
    const inboxKey = state.keys.inbox(participantId);
    if (expected.participantId !== participantId) {
      throw new TypeError("participantId does not match its fence");
    }
    const normalizedDeliveryIds = assertAckDeliveryIds(
      deliveryIds,
      state.keys,
      participantId,
    );
    const normalizedTombstoneTtlMs = positiveSafeInteger(
      tombstoneTtlMs,
      undefined,
      "tombstoneTtlMs",
    );
    const normalizedTimestamp = assertTimestamp(timestamp, "timestamp");
    const keys = [
      presenceKey,
      inboxKey,
      state.keys.events,
      ...normalizedDeliveryIds.map((deliveryId) =>
        state.keys.acked(participantId, deliveryId)),
    ];
    const reply = await this.#withClient((client) =>
      client.sendCommand([
        "EVAL",
        ACK_INBOX_SCRIPT,
        String(keys.length),
        ...keys,
        participantId,
        expected.leaseTokenHash,
        expected.scopeId,
        state.group,
        String(normalizedTombstoneTtlMs),
        normalizedTimestamp,
        String(normalizedDeliveryIds.length),
        ...normalizedDeliveryIds,
      ]),
    );
    return decodeAckResult(reply, normalizedDeliveryIds.length);
  }

  async ensureInboxGroup(participantId) {
    const state = redisCoordinationQueueState(this);
    const inboxKey = state.keys.inbox(participantId);
    return this.#withClient(async (client) => {
      let result;
      try {
        result = await client.sendCommand([
          "XGROUP",
          "CREATE",
          inboxKey,
          state.group,
          "0",
          "MKSTREAM",
        ]);
      } catch (err) {
        if (isBusyGroupError(err)) return { status: "exists" };
        throw err;
      }
      if (result !== "OK") throw invalidData("consumer group result");
      return { status: "created" };
    });
  }

  async #withClient(operation, { blocking = false, signal } = {}) {
    const state = redisCoordinationQueueState(this);
    if (!state.enabled || state.closed) throw unavailable();
    const lane = blocking ? state.blockingLane : state.commandLane;
    try {
      return await executeRedisClientLane(lane, operation, { signal });
    } catch (err) {
      if (err instanceof CoordinationQueueError) throw err;
      throw unavailable();
    }
  }
}

export function createRedisCoordinationQueue(options = {}) {
  return new RedisCoordinationQueue(options);
}
