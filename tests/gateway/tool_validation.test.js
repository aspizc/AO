import { test } from "node:test";
import assert from "node:assert/strict";
import { defineTool, z } from "../../gateway/src/tools/tool_helpers.js";

const tool = defineTool({
  name: "demo.echo",
  description: "Echo for tests",
  schema: z.object({
    msg: z.string(),
    n: z.number().finite().optional(),
  }).strict(),
  handler: async ({ msg, n }) => ({ msg, n: n ?? 1 }),
});

test("valid tool arguments pass to handler", async () => {
  const result = await tool.handler({ msg: "hi" });
  const data = JSON.parse(result.content[0].text);

  assert.equal(data.msg, "hi");
  assert.equal(data.n, 1);
});

test("missing required tool arguments return invalid input", async () => {
  const result = await tool.handler({});
  const data = JSON.parse(result.content[0].text);

  assert.equal(result.isError, true);
  assert.equal(data.error, "INVALID_INPUT");
  assert.ok(data.issues.length > 0);
});

test("handler exceptions return structured tool errors", async () => {
  const boom = defineTool({
    name: "demo.boom",
    description: "Boom for tests",
    schema: z.object({}).strict(),
    handler: async () => {
      throw new Error("boom");
    },
  });

  const result = await boom.handler({});
  const data = JSON.parse(result.content[0].text);

  assert.equal(result.isError, true);
  assert.equal(data.error, "TOOL_ERROR");
  assert.equal(data.message, "tool operation failed");
});

test("input schema is converted to JSON Schema", () => {
  assert.equal(tool.inputSchema.type, "object");
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.equal(tool.inputSchema.properties.msg.type, "string");
  assert.deepEqual(tool.inputSchema.required, ["msg"]);
});
