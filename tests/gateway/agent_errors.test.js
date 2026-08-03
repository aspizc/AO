import { test } from "node:test";
import assert from "node:assert/strict";

import { withTimeout } from "../../gateway/src/services/_with_timeout.js";
import { defineTool, z } from "../../gateway/src/tools/tool_helpers.js";

test("withTimeout rejects slow operations with TIMEOUT code", async () => {
  const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 50));

  await assert.rejects(() => withTimeout(slow, 1, "agent.delegate"), {
    code: "TIMEOUT",
  });
});

test("withTimeout resolves fast operations", async () => {
  const result = await withTimeout(Promise.resolve("ok"), 50, "agent.delegate");

  assert.equal(result, "ok");
});

test("tool errors expose the original code without stack traces", async () => {
  const tool = defineTool({
    name: "agent.fake",
    description: "Fake agent tool",
    schema: z.object({}).strict(),
    allowedErrorCodes: ["ADAPTER_DISABLED"],
    errorMessages: { ADAPTER_DISABLED: "adapter disabled" },
    handler: async () => {
      const err = new Error("adapter disabled");
      err.code = "ADAPTER_DISABLED";
      throw err;
    },
  });

  const result = await tool.handler({});
  const body = JSON.parse(result.content[0].text);

  assert.equal(result.isError, true);
  assert.equal(body.error, "ADAPTER_DISABLED");
  assert.equal(body.message, "adapter disabled");
  assert.equal(body.stack, undefined);
});
