import fs from "node:fs";
import { spawn } from "node:child_process";

function linuxIdentity(pid = process.pid) {
  const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
  const close = stat.lastIndexOf(")");
  const fields = stat.slice(close + 2).trim().split(/\s+/);
  return {
    pid,
    startToken: fields[19],
    pgid: Number(fields[2]),
    sid: Number(fields[3]),
  };
}

function writeMarker(pathname, value) {
  fs.writeFileSync(pathname, `${JSON.stringify(value)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

async function writeLargeOutput(byteCount) {
  const block = Buffer.alloc(64 * 1024, 0x78);
  let remaining = byteCount;
  while (remaining > 0) {
    const chunk = block.subarray(0, Math.min(block.length, remaining));
    remaining -= chunk.length;
    if (!process.stdout.write(chunk)) {
      await new Promise((resolve) => process.stdout.once("drain", resolve));
    }
  }
}

async function writePersistentOutput(markerPath, delayMs) {
  writeMarker(markerPath, {
    role: "persistent-output",
    identity: linuxIdentity(),
  });
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  process.stdout.write("persistent-provider-output");
  setInterval(() => {}, 10_000);
}

function runTermResistantDescendant(markerPath, escaped) {
  process.on("SIGTERM", () => {});
  if (escaped) process.on("SIGHUP", () => {});
  writeMarker(markerPath, {
    role: escaped ? "escaped-descendant" : "same-group-descendant",
    identity: linuxIdentity(),
  });
  setInterval(() => {}, 10_000);
}

function spawnTermResistantTree(markerPath, escaped) {
  process.on("SIGTERM", () => {});
  const child = spawn(
    process.execPath,
    [
      new URL(import.meta.url).pathname,
      escaped ? "escaped-descendant" : "same-group-descendant",
      markerPath,
    ],
    {
      detached: escaped,
      shell: false,
      stdio: "ignore",
      env: {},
    },
  );
  child.unref();
  writeMarker(`${markerPath}.leader`, {
    role: "utility-leader",
    identity: linuxIdentity(),
    descendantPid: child.pid,
  });
  setInterval(() => {}, 10_000);
}

const [mode, ...args] = process.argv.slice(2);

switch (mode) {
  case "large-output":
    await writeLargeOutput(Number(args[0]));
    break;
  case "persistent-output":
    await writePersistentOutput(args[0], Number(args[1] ?? 100));
    break;
  case "argv-env":
    writeMarker(args[0], {
      argv: args.slice(1),
      env: {
        EXACT_VALUE: process.env.EXACT_VALUE,
        PATH: process.env.PATH ?? null,
      },
      identity: linuxIdentity(),
    });
    break;
  case "same-group-tree":
    spawnTermResistantTree(args[0], false);
    break;
  case "escaped-tree":
    spawnTermResistantTree(args[0], true);
    break;
  case "same-group-descendant":
    runTermResistantDescendant(args[0], false);
    break;
  case "escaped-descendant":
    runTermResistantDescendant(args[0], true);
    break;
  case "exit":
    process.exit(Number(args[0] ?? 0));
    break;
  default:
    process.exit(64);
}
