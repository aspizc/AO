import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../../gateway/src/config.js";

function captureStderrDuring(callback) {
  const originalWrite = process.stderr.write;
  const chunks = [];
  process.stderr.write = function write(chunk, ...args) {
    chunks.push(String(chunk));
    return true;
  };

  try {
    const result = callback();
    return { result, stderr: chunks.join("") };
  } finally {
    process.stderr.write = originalWrite;
  }
}

test("message access secret fallback emits structured warning with error and path", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "message-secret-fallback-"));
  const regularFile = path.join(workspace, "not-a-directory");
  fs.writeFileSync(regularFile, "regular file\n", "utf-8");
  const secretPath = path.join(regularFile, "secret");

  const { result: config, stderr } = captureStderrDuring(() =>
    loadConfig({
      AGENTS_WORKSPACE: workspace,
      AGENTS_MESSAGE_ACCESS_SECRET_FILE: secretPath,
    }),
  );

  assert.match(config.messageAccessSecret, /^[0-9a-f]{64}$/);

  const lines = stderr.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  const warning = JSON.parse(lines[0]);
  assert.equal(warning.level, "warn");
  assert.equal(warning.component, "gateway");
  assert.equal(warning.secretPath, secretPath);
  assert.equal(typeof warning.ts, "string");
  assert.equal(typeof warning.msg, "string");
  assert.equal(typeof warning.error, "string");
  assert.ok(warning.error.length > 0);
});

test("message access secret persists normally without warning", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "message-secret-normal-"));

  const { result: config, stderr } = captureStderrDuring(() =>
    loadConfig({
      AGENTS_WORKSPACE: workspace,
    }),
  );

  assert.match(config.messageAccessSecret, /^[0-9a-f]{64}$/);
  assert.equal(stderr, "");
});

test("message access secret env override wins without warning or file I/O", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "message-secret-env-"));
  const regularFile = path.join(workspace, "not-a-directory");
  fs.writeFileSync(regularFile, "regular file\n", "utf-8");
  const secretPath = path.join(regularFile, "secret");

  const { result: config, stderr } = captureStderrDuring(() =>
    loadConfig({
      AGENTS_WORKSPACE: workspace,
      AGENTS_MESSAGE_ACCESS_SECRET: "operator-secret",
      AGENTS_MESSAGE_ACCESS_SECRET_FILE: secretPath,
    }),
  );

  assert.equal(config.messageAccessSecret, "operator-secret");
  assert.equal(stderr, "");
  assert.equal(fs.existsSync(secretPath), false);
});
