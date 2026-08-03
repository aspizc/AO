import crypto from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function uuid() {
  return crypto.randomUUID();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24)
    .replace(/^-|-$/g, "");
}

export function newTraceId({ prefix } = {}) {
  const suffix = uuid();
  const slug = prefix ? slugify(prefix) : "";

  return slug ? `tr-${slug}-${suffix}` : `tr-${suffix}`;
}

export const newOrchestrationId = () => `os-${uuid()}`;
export const newChildTaskId = () => `ts-${uuid()}`;
export const newSessionId = () => `ss-${uuid()}`;
export const newArtifactId = () => `art-${uuid()}`;
export const newApprovalId = () => `apr-${uuid()}`;
export const newMessageId = () => `msg-${uuid()}`;
export const newPolicyDecisionId = () => `pd-${uuid()}`;

export function isUuid(value) {
  return UUID_RE.test(String(value));
}
