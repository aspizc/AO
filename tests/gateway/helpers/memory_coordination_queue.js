import { isDeepStrictEqual } from "node:util";

export class MemoryCoordinationQueue {
  constructor({
    enabled = true,
    prefix = "test:coord:v1",
  } = {}) {
    this.enabled = enabled;
    this.prefix = prefix;
    this.participants = new Map();
    this.messages = new Map();
    this.inboxes = new Map();
    this.acknowledged = new Map();
    this.nextDelivery = 1;
  }

  describe() {
    return {
      enabled: this.enabled,
      prefix: this.prefix,
      eventsStream: `${this.prefix}:events`,
      consumerGroup: "coordination-v1",
    };
  }

  async ping() {
    if (!this.enabled) {
      throw Object.assign(new Error("coordination unavailable"), {
        code: "COORDINATION_UNAVAILABLE",
      });
    }
    return { status: "ready" };
  }

  matchesFence(fence) {
    const current = this.participants.get(fence?.participantId);
    return Boolean(
      current
      && current.participantId === fence.participantId
      && current.scopeId === fence.scopeId
      && current.leaseTokenHash === fence.leaseTokenHash
    );
  }

  async putParticipant(record, { ifAbsent = false, fence } = {}) {
    if (ifAbsent && this.participants.has(record.participantId)) {
      return { status: "exists" };
    }
    if (!ifAbsent && !this.participants.has(record.participantId)) {
      return { status: "missing" };
    }
    if (!ifAbsent && !this.matchesFence(fence)) {
      return { status: "fence_mismatch" };
    }

    this.participants.set(record.participantId, structuredClone(record));
    if (!this.inboxes.has(record.participantId)) {
      this.inboxes.set(record.participantId, []);
    }
    if (!this.acknowledged.has(record.participantId)) {
      this.acknowledged.set(record.participantId, new Set());
    }
    return { status: "stored" };
  }

  async getParticipant(participantId) {
    return structuredClone(this.participants.get(participantId) ?? null);
  }

  async listParticipants({ fence }) {
    if (!this.matchesFence(fence)) return { status: "fence_mismatch" };
    return {
      status: "listed",
      participants: [...this.participants.values()].map(
        (participant) => structuredClone(participant),
      ),
    };
  }

  async deleteParticipant(participantId, { fence }) {
    if (!this.participants.has(participantId)) return { status: "missing" };
    if (!this.matchesFence(fence)) return { status: "fence_mismatch" };
    this.participants.delete(participantId);
    return { status: "deleted" };
  }

  async putMessage(envelope, { senderFence, recipientFence }) {
    if (!this.matchesFence(senderFence)) {
      return { status: "sender_fence_mismatch" };
    }
    if (!this.participants.has(envelope.toParticipantId)) {
      return { status: "target_missing" };
    }
    if (!this.matchesFence(recipientFence)) {
      return { status: "recipient_fence_mismatch" };
    }

    const dedupeKey = `${envelope.fromParticipantId}:${envelope.messageId}`;
    const existing = this.messages.get(dedupeKey);
    if (existing) {
      const semanticEnvelope = ({ createdAt: _createdAt, ...message }) => message;
      if (
        !isDeepStrictEqual(
          semanticEnvelope(envelope),
          semanticEnvelope(existing.envelope),
        )
      ) {
        return { status: "conflict" };
      }
      return {
        status: "duplicate",
        envelope: structuredClone(existing.envelope),
        deliveryId: existing.deliveryId,
      };
    }

    const deliveryId = `${this.nextDelivery}-0`;
    this.nextDelivery += 1;
    this.messages.set(dedupeKey, {
      envelope: structuredClone(envelope),
      deliveryId,
    });
    this.inboxes.get(envelope.toParticipantId).push({
      deliveryId,
      message: structuredClone(envelope),
      consumerId: null,
      deliveredAt: null,
      acked: false,
    });
    return { status: "created", deliveryId };
  }

  async readInbox({
    participantId,
    consumerId,
    count,
    reclaimIdleMs,
    now,
    fence,
  }) {
    if (!this.matchesFence(fence)) return { status: "fence_mismatch" };
    const inbox = this.inboxes.get(participantId) ?? [];
    const deliveries = [];

    if (Number.isInteger(reclaimIdleMs) && reclaimIdleMs >= 0) {
      for (const delivery of inbox) {
        if (
          deliveries.length < count
          && !delivery.acked
          && delivery.consumerId
          && now - delivery.deliveredAt >= reclaimIdleMs
        ) {
          delivery.consumerId = consumerId;
          delivery.deliveredAt = now;
          deliveries.push({
            deliveryId: delivery.deliveryId,
            message: structuredClone(delivery.message),
            recovered: true,
          });
        }
      }
    }

    for (const delivery of inbox) {
      if (deliveries.length >= count) break;
      if (delivery.acked || delivery.consumerId) continue;
      delivery.consumerId = consumerId;
      delivery.deliveredAt = now;
      deliveries.push({
        deliveryId: delivery.deliveryId,
        message: structuredClone(delivery.message),
        recovered: false,
      });
    }

    return {
      status: "read",
      deliveries,
    };
  }

  async ackInbox({ participantId, deliveryIds, fence }) {
    if (!this.matchesFence(fence)) return { status: "fence_mismatch" };
    const inbox = this.inboxes.get(participantId) ?? [];
    const tombstones = this.acknowledged.get(participantId) ?? new Set();
    const byId = new Map(
      inbox.map((delivery) => [delivery.deliveryId, delivery]),
    );

    for (const deliveryId of deliveryIds) {
      if (!tombstones.has(deliveryId) && !byId.has(deliveryId)) {
        return { status: "delivery_not_found" };
      }
    }

    let ackedCount = 0;
    for (const deliveryId of deliveryIds) {
      const delivery = byId.get(deliveryId);
      if (delivery && !delivery.acked) {
        delivery.acked = true;
        ackedCount += 1;
      }
      tombstones.add(deliveryId);
    }
    this.acknowledged.set(participantId, tombstones);
    return { status: "acked", ackedCount };
  }

  snapshot() {
    return {
      participants: [...this.participants.entries()].map(
        ([participantId, participant]) => ({
          participantId,
          record: structuredClone(participant),
        }),
      ),
      messages: [...this.messages.entries()].map(([key, value]) => ({
        key,
        value: structuredClone(value),
      })),
      inboxes: [...this.inboxes.entries()].map(([participantId, inbox]) => ({
        participantId,
        deliveries: structuredClone(inbox),
      })),
      acknowledged: [...this.acknowledged.entries()].map(
        ([participantId, deliveryIds]) => ({
          participantId,
          deliveryIds: [...deliveryIds],
        }),
      ),
    };
  }
}
