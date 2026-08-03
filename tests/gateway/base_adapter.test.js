import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BaseAdapter, CwdViolation, assertSafeCwd } from "../../gateway/src/adapters/base_adapter.js";

function tmpRoot(prefix = "adapter-root-") {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

test("cwd inside allowed root passes and returns real path", () => {
  const root = tmpRoot();
  const inner = path.join(root, "inner");
  fs.mkdirSync(inner);

  assert.equal(assertSafeCwd(inner, [root]), fs.realpathSync(inner));
});

test("cwd outside allowed root fails", () => {
  const root = tmpRoot();
  const outside = tmpRoot("adapter-outside-");

  assert.throws(() => assertSafeCwd(outside, [root]), CwdViolation);
});

test("realpath escape via symlink is rejected", () => {
  const root = tmpRoot();
  const outside = tmpRoot("adapter-outside-");
  const linkInside = path.join(root, "trap");
  fs.symlinkSync(outside, linkInside);

  assert.throws(() => assertSafeCwd(linkInside, [root]), CwdViolation);
});

test("dot dot path normalized outside the root is rejected", () => {
  const root = tmpRoot();
  const sibling = tmpRoot("adapter-sibling-");
  const escapePath = path.join(root, "..", path.basename(sibling));

  assert.throws(() => assertSafeCwd(escapePath, [root]), CwdViolation);
});

test("root prefix sibling does not match without path separator", () => {
  const parent = tmpRoot();
  const root = path.join(parent, "repo");
  const evil = path.join(parent, "repo-evil");
  fs.mkdirSync(root);
  fs.mkdirSync(evil);

  assert.throws(() => assertSafeCwd(evil, [root]), CwdViolation);
});

test("missing cwd or roots fail closed", () => {
  assert.throws(() => assertSafeCwd("", ["/tmp"]), CwdViolation);
  assert.throws(() => assertSafeCwd("/tmp", []), CwdViolation);
  assert.throws(() => assertSafeCwd("/tmp", null), CwdViolation);
});

test("missing cwd path fails with CwdViolation", () => {
  const root = tmpRoot();

  assert.throws(() => assertSafeCwd(path.join(root, "missing"), [root]), CwdViolation);
});

test("base adapter methods must be implemented by subclasses", async () => {
  const adapter = new BaseAdapter({ id: "test-adapter", config: {}, registries: {} });

  await assert.rejects(() => adapter.delegate({}), /test-adapter must implement delegate/);
  await assert.rejects(() => adapter.spawn({}), /test-adapter must implement spawn/);
  await assert.rejects(() => adapter.ask({}), /test-adapter must implement ask/);
  await assert.rejects(() => adapter.view({}), /test-adapter must implement view/);
  await assert.rejects(() => adapter.kill({}), /test-adapter must implement kill/);
});
