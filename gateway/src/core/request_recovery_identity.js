import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MACHINE_KEY = "agents-gateway/local-reattach/v1";

function credentials(host) {
  const uid = host.getuid();
  const euid = host.geteuid();
  if (!Number.isSafeInteger(uid) || uid < 0 || uid !== euid) return null;
  return uid;
}

function machineDigest(fileSystem) {
  const fd = fileSystem.openSync("/etc/machine-id", fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fileSystem.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== 0 || (stat.mode & 0o022) !== 0
      || ![32, 33].includes(stat.size)) return null;
    const bytes = Buffer.alloc(34);
    let count = 0;
    while (count < bytes.length) {
      const read = fileSystem.readSync(fd, bytes, count, bytes.length - count, count);
      if (read === 0) break;
      count += read;
    }
    const value = bytes.subarray(0, count).toString("utf8");
    if (!/^[0-9a-f]{32}\n?$/.test(value) || /^0{32}\n?$/.test(value)) return null;
    return createHmac("sha256", MACHINE_KEY).update(Buffer.from(value.trimEnd(), "hex")).digest("hex");
  } finally {
    fileSystem.closeSync(fd);
  }
}

function privateStatePath(stateDb, uid, fileSystem) {
  const canonical = fileSystem.realpathSync(stateDb);
  const directory = fileSystem.statSync(path.dirname(canonical));
  if (!directory.isDirectory() || directory.uid !== uid || (directory.mode & 0o022) !== 0) return null;
  const fd = fileSystem.openSync(canonical, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fileSystem.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== uid || (stat.mode & 0o022) !== 0) return null;
    return canonical;
  } finally {
    fileSystem.closeSync(fd);
  }
}

// host/fileSystem are server-side observation dependencies, never MCP input.
// Call only after initState; unsupported recovery must not prevent normal startup.
export function createLocalRecoveryIdentity({
  stateDb, backend, host = process, fileSystem = fs,
} = {}) {
  if (host.platform !== "linux" || backend !== "sqlite") return null;
  function observe() {
    try {
      const uid = credentials(host);
      if (uid === null) return null;
      const digest = machineDigest(fileSystem);
      const statePath = privateStatePath(stateDb, uid, fileSystem);
      return digest && statePath ? { principalId: `linux-uid:${uid}`, machineDigest: digest, statePath } : null;
    } catch {
      return null;
    }
  }
  const startup = observe();
  if (!startup) return null;
  return Object.freeze({
    ...startup,
    verify() {
      const current = observe();
      return current !== null && current.principalId === startup.principalId
        && current.machineDigest === startup.machineDigest && current.statePath === startup.statePath;
    },
  });
}
