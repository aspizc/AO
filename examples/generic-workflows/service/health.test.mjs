import { test } from "node:test";
import assert from "node:assert/strict";
import { health } from "./health.mjs";

test("health endpoint reports readiness", () => {
  assert.equal(health().status, "ready");
});
