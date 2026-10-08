import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const api = await import("../../gateway/src/core/request_recovery_identity.js")
  .catch(() => ({}));

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reattach-identity-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const stateDb = path.join(root, "state.db");
  const machineIdFile = path.join(root, "machine-id");
  const machineId = "0123456789abcdef0123456789abcdef";
  fs.writeFileSync(stateDb, "fixture state", { mode: 0o600 });
  fs.writeFileSync(machineIdFile, `${machineId}\n`, { mode: 0o644 });
  let uid = 1000;
  let euid = 1000;
  let machineUid = 0;
  let stateUid = 1000;
  let directoryUid = 1000;
  const openFiles = new Map();
  const reads = [];
  const host = { platform: "linux", getuid: () => uid, geteuid: () => euid };
  // Simulate ownership observations because the sandbox remaps local owners.
  // Bytes, permissions, symlink refusal and descriptor reads use real files.
  const fileSystem = {
    ...fs,
    openSync(filename, flags) {
      const target = filename === "/etc/machine-id" ? machineIdFile : filename;
      const fd = fs.openSync(target, flags);
      openFiles.set(fd, filename);
      return fd;
    },
    fstatSync(fd) {
      const stat = fs.fstatSync(fd);
      const owner = openFiles.get(fd) === "/etc/machine-id" ? machineUid : stateUid;
      return Object.assign(Object.create(stat), { uid: owner });
    },
    statSync(filename) {
      const stat = fs.statSync(filename);
      return Object.assign(Object.create(stat), { uid: directoryUid });
    },
    readSync(fd, buffer, offset, length, position) {
      reads.push({ filename: openFiles.get(fd), length });
      return fs.readSync(fd, buffer, offset, length, position);
    },
    closeSync(fd) {
      openFiles.delete(fd);
      fs.closeSync(fd);
    },
  };
  return {
    root, stateDb, machineIdFile, machineId, host, fileSystem, openFiles, reads,
    setUid: (value) => { uid = value; },
    setEuid: (value) => { euid = value; },
    setMachineUid: (value) => { machineUid = value; },
    setStateUid: (value) => { stateUid = value; },
    setDirectoryUid: (value) => { directoryUid = value; },
    create(extra = {}) {
      assert.equal(typeof api.createLocalRecoveryIdentity, "function",
        "missing verified local recovery identity implementation");
      return api.createLocalRecoveryIdentity({
        stateDb, backend: "sqlite", host, fileSystem, ...extra,
      });
    },
  };
}

test("local recovery principal uses equal numeric OS credentials and only a machine HMAC", (t) => {
  const f = fixture(t);
  const identity = f.create();
  assert.equal(identity.principalId, "linux-uid:1000");
  assert.equal(identity.machineDigest, createHmac("sha256", "agents-gateway/local-reattach/v1")
    .update(Buffer.from(f.machineId, "hex")).digest("hex"));
  assert.equal(identity.statePath, fs.realpathSync(f.stateDb));
  assert.equal(identity.verify(), true);
  assert.equal(JSON.stringify(identity).includes(f.machineId), false,
    "raw machine identity must never be retained or persisted");
  assert.equal(f.openFiles.size, 0);
  assert.ok(f.reads.every(({ length }) => length <= 34), "identity reads must remain bounded");
});

test("identity ignores provider username and configured principal assertions", (t) => {
  const f = fixture(t);
  const first = f.create({ requestPrincipalId: "linux-uid:9", USER: "root", provider: "codex" });
  const second = f.create({ requestPrincipalId: "remote-user", LOGNAME: "other", provider: "claude-code" });
  assert.equal(first.principalId, second.principalId);
  assert.equal(first.principalId, "linux-uid:1000");
});

test("credentials are reread and a later real or effective UID change refuses recovery", (t) => {
  const f = fixture(t);
  const identity = f.create();
  f.setUid(1001);
  assert.equal(identity.verify(), false);
  f.setUid(1000);
  f.setEuid(1001);
  assert.equal(identity.verify(), false);
});

test("unavailable unequal negative or unsafe OS credentials fail closed", (t) => {
  const f = fixture(t);
  for (const value of [-1, NaN, 1.2, Number.MAX_SAFE_INTEGER + 1, "1000"]) {
    f.setUid(value);
    assert.equal(f.create(), null);
  }
  f.setUid(1001);
  assert.equal(f.create(), null);
  assert.equal(f.create({ host: { platform: "linux" } }), null);
  assert.equal(f.create({ host: { platform: "linux", getuid() { throw new Error("unavailable"); } } }), null);
});

test("Darwin and PostgreSQL identity refuse without attempting file observations", (t) => {
  const f = fixture(t);
  assert.equal(f.create({ host: { platform: "darwin" } }), null);
  assert.equal(f.create({ backend: "postgres" }), null);
  assert.equal(f.reads.length, 0);
});

test("machine ID format absence permissions ownership and symlinks refuse", (t) => {
  const f = fixture(t);
  for (const bytes of ["", "0".repeat(32), f.machineId.toUpperCase(), `${f.machineId}\n\n`, "a".repeat(35),
    Buffer.from(f.machineId).map((byte) => byte | 0x80)]) {
    fs.writeFileSync(f.machineIdFile, bytes);
    assert.equal(f.create(), null, `malformed machine identity ${bytes.length} bytes`);
  }
  fs.writeFileSync(f.machineIdFile, f.machineId);
  f.setMachineUid(1000);
  assert.equal(f.create(), null);
  f.setMachineUid(0);
  fs.chmodSync(f.machineIdFile, 0o666);
  assert.equal(f.create(), null);
  fs.chmodSync(f.machineIdFile, 0o644);
  fs.unlinkSync(f.machineIdFile);
  assert.equal(f.create(), null);
  fs.symlinkSync(f.stateDb, f.machineIdFile);
  assert.equal(f.create(), null);
  assert.equal(f.openFiles.size, 0, "failure paths must close identity descriptors");
});

test("state file and directory must retain current UID ownership and private write modes", (t) => {
  const f = fixture(t);
  f.setStateUid(65534);
  assert.equal(f.create(), null);
  f.setStateUid(1000);
  f.setDirectoryUid(65534);
  assert.equal(f.create(), null);
  f.setDirectoryUid(1000);
  fs.chmodSync(f.stateDb, 0o620);
  assert.equal(f.create(), null);
  fs.chmodSync(f.stateDb, 0o600);
  fs.chmodSync(f.root, 0o720);
  assert.equal(f.create(), null);
  fs.chmodSync(f.root, 0o700);
  const identity = f.create();
  fs.chmodSync(f.stateDb, 0o602);
  assert.equal(identity.verify(), false, "later exposure of durable authority must fail closed");
});

test("recheck refuses a changed machine digest or canonical state path", (t) => {
  const f = fixture(t);
  const identity = f.create();
  fs.writeFileSync(f.machineIdFile, "fedcba9876543210fedcba9876543210");
  assert.equal(identity.verify(), false);
  fs.writeFileSync(f.machineIdFile, f.machineId);
  fs.renameSync(f.stateDb, `${f.stateDb}.moved`);
  fs.symlinkSync(`${f.stateDb}.moved`, f.stateDb);
  assert.equal(identity.verify(), false);
});

test("machine ID descriptor validation rejects a directory and closes its handle", (t) => {
  const f = fixture(t);
  fs.unlinkSync(f.machineIdFile);
  fs.mkdirSync(f.machineIdFile);
  assert.equal(f.create(), null);
  assert.equal(f.openFiles.size, 0);
});
