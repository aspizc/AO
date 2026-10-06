import { test } from "node:test";
import assert from "node:assert/strict";

import { createCoordination } from "../../gateway/src/coordination.js";

test("coordination factory exposes idempotent closure of its owned queue", async () => {
  let closeCalls = 0;
  const queue = {
    enabled: true,
    async close() {
      closeCalls += 1;
      return { status: "closed" };
    },
  };
  const coordination = createCoordination({ queue });

  assert.equal(typeof coordination.close, "function");
  assert.equal(Object.keys(coordination).includes("close"), false);
  assert.deepEqual(
    await Promise.all([coordination.close(), coordination.close()]),
    [{ status: "closed" }, { status: "closed" }],
  );
  assert.equal(closeCalls, 1);
});
