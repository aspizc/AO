import crypto from "node:crypto";

const PROCESS_DEFAULT_SECRET = crypto.randomBytes(32).toString("hex");

function secretFrom(config = {}) {
  return config.messageAccessSecret || PROCESS_DEFAULT_SECRET;
}

export function createTraceAccessToken(traceId, config = {}) {
  return crypto.createHmac("sha256", secretFrom(config)).update(traceId).digest("hex");
}

export function verifyTraceAccessToken(traceId, accessToken, config = {}) {
  if (!accessToken) return false;
  const expected = createTraceAccessToken(traceId, config);
  const provided = String(accessToken);
  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
