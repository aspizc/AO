import { test } from "node:test";
import assert from "node:assert/strict";
import { UnknownAgentError, createAdapterRegistry } from "../../gateway/src/adapters/index.js";

test("unknown agent returns clear error", () => {
  const registry = createAdapterRegistry({ config: {}, registries: {} });

  assert.throws(() => registry.get("nope"), UnknownAgentError);
  assert.throws(() => registry.get("nope"), /unknown agent nope/);
});

test("registered adapter can be retrieved", () => {
  const registry = createAdapterRegistry({ config: {}, registries: {} });
  const fake = { id: "x", spawn: async () => "ok" };

  registry.register("x", fake);

  assert.equal(registry.get("x"), fake);
});

test("has and list expose registered adapters", () => {
  const registry = createAdapterRegistry({ config: {}, registries: {} });
  const first = { id: "first" };
  const second = { id: "second" };

  registry.register("first", first);
  registry.register("second", second);

  assert.equal(registry.has("first"), true);
  assert.equal(registry.has("missing"), false);
  assert.deepEqual(registry.list(), ["first", "second"]);
});

test("duplicate registration fails", () => {
  const registry = createAdapterRegistry({ config: {}, registries: {} });

  registry.register("x", {});

  assert.throws(() => registry.register("x", {}), /adapter already registered for x/);
});

test("registry exposes construction context", () => {
  const config = { repoRoots: ["/tmp"] };
  const registries = { policies: true };
  const registry = createAdapterRegistry({ config, registries });

  assert.equal(registry.config, config);
  assert.equal(registry.registries, registries);
});
