import fs from "node:fs";
import { readLinuxProcessIdentity } from "./process_supervisor.js";
import { tmuxSync } from "./tmux_client.js";

export function readKernelBootId() {
  let fd;
  try {
    fd = fs.openSync("/proc/sys/kernel/random/boot_id", fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const bytes = Buffer.alloc(38);
    const length = fs.readSync(fd, bytes, 0, bytes.length, 0);
    const value = bytes.subarray(0, length).toString("utf8");
    return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\n?$/.test(value) ? value.trimEnd() : null;
  } catch { return null; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}

export function createLocalRecoveryOwner(connectionId) {
  const processIdentity = readLinuxProcessIdentity(process.pid);
  const bootId = readKernelBootId();
  return processIdentity && bootId ? Object.freeze({ connectionId, pid: processIdentity.pid,
    startToken: processIdentity.startToken, bootId }) : null;
}

export function priorGatewayOwnerAbsent(owner) {
  if (!owner) return true;
  const bootId = readKernelBootId();
  if (!bootId) return false;
  if (bootId !== owner.bootId) return true;
  const current = readLinuxProcessIdentity(owner.pid);
  if (current) return current.startToken !== owner.startToken;
  // The process reader collapses permission/parse errors into null. Require
  // positive kernel absence in addition to a missing proc directory.
  try { fs.statSync(`/proc/${owner.pid}`); return false; }
  catch (error) { if (error.code !== "ENOENT") return false; }
  try { process.kill(owner.pid, 0); return false; }
  catch (error) { return error.code === "ESRCH"; }
}

export function probeExactTmuxTarget(target, timeout) {
  const result = tmuxSync(["has-session", "-t", `=${target}`], {
    timeout, maxBuffer: 4096, stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.signal) return null;
  if (result.status === 0) return true;
  if (result.status === 1 && /^(?:can't find session:|no server running on |error connecting to .*\(No such file or directory\))/m.test(result.stderr || "")) return false;
  return null;
}
