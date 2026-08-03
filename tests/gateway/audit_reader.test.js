import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { configureAudit, append, query, _resetForTests } from "../../gateway/src/core/audit.js";

async function setup() {
  _resetForTests();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-reader-"));
  const file = path.join(dir, "audit.jsonl");
  configureAudit({ auditLog: file });
  return { dir, file };
}

test("query_by_trace_id", async () => {
  await setup();
  append({ type: "X", traceId: "t1" });
  append({ type: "X", traceId: "t2" });

  const result = await query({ traceId: "t2" });

  assert.equal(result.length, 1);
  assert.equal(result[0].traceId, "t2");
});

test("query_by_type", async () => {
  await setup();
  append({ type: "A", traceId: "t1" });
  append({ type: "B", traceId: "t1" });

  const result = await query({ type: "B" });

  assert.equal(result.length, 1);
  assert.equal(result[0].type, "B");
});

test("query_combines_trace_id_and_type_filters", async () => {
  await setup();
  append({ type: "A", traceId: "t1" });
  append({ type: "B", traceId: "t1" });
  append({ type: "B", traceId: "t2" });

  const result = await query({ traceId: "t1", type: "B" });

  assert.equal(result.length, 1);
  assert.equal(result[0].type, "B");
  assert.equal(result[0].traceId, "t1");
});

test("query_limit_returns_most_recent_matching_events_in_chronological_order", async () => {
  await setup();
  for (let i = 0; i < 5; i += 1) {
    append({ type: "X", traceId: "t", index: i });
  }

  const result = await query({ limit: 2 });

  assert.deepEqual(
    result.map((event) => event.index),
    [3, 4],
  );
});

test("corrupt_line_is_visible_not_silent", async () => {
  const { file } = await setup();
  fs.appendFileSync(file, "{not json}\n", "utf-8");
  append({ type: "X", traceId: "t" });

  const result = await query({});

  assert.ok(result.some((event) => event._corrupt));
  assert.ok(result.some((event) => event.type === "X"));
});

test("query_missing_file_returns_empty_list", async () => {
  _resetForTests();
  configureAudit({ auditLog: path.join(os.tmpdir(), "missing-audit", `${crypto.randomUUID()}.jsonl`) });

  assert.deepEqual(await query({}), []);
});
