import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import * as tmuxClient from "../../gateway/src/adapters/tmux_client.js";
import { readLinuxProcessIdentity } from "../../gateway/src/adapters/process_supervisor.js";
import { ownedTmuxFixture } from "./helpers/owned_tmux_fixture.js";

test("creation observation retains frozen real identity and failed creation grants no receipt", async (t) => {
  const fixture = await ownedTmuxFixture(t);
  const realTmux = spawnSync("sh", ["-c", "command -v tmux"], { encoding: "utf8" }).stdout.trim();
  const shim = path.join(fixture.directory, "bin"); fs.mkdirSync(shim);
  const log = path.join(fixture.directory, "argv.jsonl");
  fs.writeFileSync(path.join(shim, "tmux"), `#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + "\\n");
const result = spawnSync(${JSON.stringify(realTmux)}, process.argv.slice(2), { stdio: "inherit" });
process.exit(result.status ?? 2);
`, { mode: 0o700 });
  const opts = { env: { ...process.env, PATH: `${shim}:${process.env.PATH}` } };
  const args = tmuxClient.buildNewSessionCmd({ target: "observed-child", cwd: fixture.directory });
  const observed = [];
  const create = tmuxClient.withTmuxCreationObserver(value => observed.push(value), () => tmuxClient.tmuxSync(args, opts));
  assert.equal(create.status, 0);
  assert.deepEqual(args, ["new-session", "-d", "-s", "observed-child", "-c", fixture.directory]);
  assert.deepEqual(JSON.parse(fs.readFileSync(log, "utf8").split("\n")[0]),
    [...args, "-P", "-F", "a05-create-v1 #{session_id} #{pane_id} #{pane_pid}"],
    "only the A05 scope adds the fixed creation-output flags to the actual argv");
  assert.equal(create.stdout, "", "observation must not replace command output with a receipt");
  assert.equal(observed.length, 1);
  const receipt = observed[0];
  assert.ok(Object.isFrozen(receipt)); assert.ok(Object.isFrozen(receipt.identity));
  assert.match(receipt.sessionId, /^\$\d+$/); assert.match(receipt.paneId, /^%\d+$/);
  assert.deepEqual(receipt.identity, readLinuxProcessIdentity(receipt.identity.pid));
  assert.equal(fixture.run(["list-panes", "-t", receipt.sessionId, "-F", "#{pane_id}"]).stdout.trim(), receipt.paneId);
  const collision = tmuxClient.withTmuxCreationObserver(value => observed.push(value), () => tmuxClient.tmuxSync(args, opts));
  assert.notEqual(collision.status, 0);
  assert.equal(observed.length, 1, "a failed create against an existing name must grant no cleanup receipt");
  assert.equal(readLinuxProcessIdentity(receipt.identity.pid)?.startToken, receipt.identity.startToken);
  const ordinaryArgs = tmuxClient.buildNewSessionCmd({ target: "ordinary-child", cwd: fixture.directory });
  assert.equal(tmuxClient.tmuxSync(ordinaryArgs, opts).status, 0);
  const emitted = fs.readFileSync(log, "utf8").trim().split("\n").map(line => JSON.parse(line));
  assert.deepEqual(emitted.at(-1), ordinaryArgs, "ordinary calls retain the original argv");
});

for (const malformed of ["", "wrong-version $0 %0 2\n", "a05-create-v1 $0 %0 2\nextra\n",
  "a05-create-v1 $0 %0 2 trailing\n", "a05-create-v1 $0 %0 9007199254740992\n",
  "a05-create-v1 $0 %0 2\n\n"]) test(`malformed creation output grants no receipt: ${JSON.stringify(malformed)}`, async (t) => {
  const fixture = await ownedTmuxFixture(t);
  const realTmux = spawnSync("sh", ["-c", "command -v tmux"], { encoding: "utf8" }).stdout.trim();
  const shim = path.join(fixture.directory, "bin"); fs.mkdirSync(shim);
  fs.writeFileSync(path.join(shim, "tmux"), `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const args = process.argv.slice(2);
const result = spawnSync(${JSON.stringify(realTmux)}, args, { encoding: "utf8" });
process.stdout.write(args[0] === "new-session" && result.status === 0 ? ${JSON.stringify(malformed)} : result.stdout);
process.exit(result.status ?? 2);
`, { mode: 0o700 });
  const observed = [];
  const opts = { env: { ...process.env, PATH: `${shim}:${process.env.PATH}` } };
  assert.throws(() => tmuxClient.withTmuxCreationObserver(value => observed.push(value),
    () => tmuxClient.tmuxSync(tmuxClient.buildNewSessionCmd({ target: "malformed-child", cwd: fixture.directory }), opts)),
  /creation identity unavailable/);
  assert.equal(observed.length, 0, "malformed response must never fall back to observing the named live child");
  assert.equal(fixture.run(["has-session", "-t", "=malformed-child"]).status, 0,
    "fixture created a real child; receipt refusal must not invent cleanup authority");
});

test("creation observer stays scoped across awaits and ignores unrelated and non-creation commands", async (t) => {
  await ownedTmuxFixture(t);
  let release; const waiting = new Promise(resolve => { release = resolve; });
  const observed = [];
  const scoped = tmuxClient.withTmuxCreationObserver(value => observed.push(value), async () => {
    await waiting;
    return tmuxClient.tmuxSync(tmuxClient.buildNewSessionCmd({ target: "scoped-child", cwd: "/tmp" }));
  });
  const outside = tmuxClient.tmuxSync(tmuxClient.buildNewSessionCmd({ target: "unrelated-child", cwd: "/tmp" }));
  assert.equal(outside.status, 0); assert.equal(observed.length, 0);
  release(); assert.equal((await scoped).status, 0); assert.equal(observed.length, 1);
  tmuxClient.withTmuxCreationObserver(value => observed.push(value), () => tmuxClient.tmuxSync(["has-session", "-t", "=unrelated-child"]));
  assert.equal(observed.length, 1, "reading a named target must not grant launch cleanup authority");
});
