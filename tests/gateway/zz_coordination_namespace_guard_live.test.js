import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const redisUrl = process.env.AGENTS_TEST_REDIS_URL;
const requireFromGateway = createRequire(
  new URL("../../gateway/package.json", import.meta.url),
);
const { createClient } = requireFromGateway("redis");

test(
  "required Redis lane leaves no test coordination namespaces behind",
  { skip: redisUrl ? false : "AGENTS_TEST_REDIS_URL is not set" },
  async () => {
    const raw = createClient({
      url: redisUrl,
      RESP: 2,
      socket: { reconnectStrategy: false },
    });
    await raw.connect();
    try {
      const leaked = [];
      let cursor = "0";
      do {
        const reply = await raw.sendCommand([
          "SCAN",
          cursor,
          "MATCH",
          "agents:test:v5:*",
          "COUNT",
          "100",
        ]);
        cursor = reply[0];
        leaked.push(...reply[1]);
      } while (cursor !== "0");
      assert.deepEqual(
        [...new Set(leaked)].sort(),
        [],
        "live Redis tests leaked keys outside their exact-prefix cleanup",
      );
    } finally {
      if (raw.isOpen) raw.destroy();
    }
  },
);
