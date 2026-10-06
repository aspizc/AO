import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const requireFromGateway = createRequire(
  new URL("../../../gateway/package.json", import.meta.url),
);
const { createClient } = requireFromGateway("redis");

const DEFAULT_REDIS_SERVER =
  "/home/carase/miniconda3/bin/redis-server";
const START_ATTEMPTS = 200;
const START_RETRY_MS = 10;
const STOP_TIMEOUT_MS = 2_000;

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  let timer;
  const exited = await Promise.race([
    new Promise((resolve) => {
      child.once("exit", () => resolve(true));
    }),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
  if (timer) clearTimeout(timer);
  return exited;
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  if (await waitForExit(child, STOP_TIMEOUT_MS)) return;
  child.kill("SIGKILL");
  await waitForExit(child, STOP_TIMEOUT_MS);
}

export async function withEphemeralRedis(operation) {
  const directory = await mkdtemp(path.join(tmpdir(), "ack-redis-"));
  const socketPath = path.join(directory, "r.sock");
  const serverBinary =
    process.env.AGENTS_TEST_REDIS_SERVER ?? DEFAULT_REDIS_SERVER;
  let output = "";
  const clients = new Set();
  const server = spawn(serverBinary, [
    "--unixsocket",
    socketPath,
    "--unixsocketperm",
    "700",
    "--port",
    "0",
    "--save",
    "",
    "--appendonly",
    "no",
    "--daemonize",
    "no",
    "--dir",
    directory,
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const recordOutput = (chunk) => {
    output = `${output}${chunk}`.slice(-65_536);
  };
  server.stdout.on("data", recordOutput);
  server.stderr.on("data", recordOutput);

  const newClient = () => {
    const client = createClient({
      RESP: 2,
      socket: {
        path: socketPath,
        connectTimeout: 250,
        reconnectStrategy: false,
      },
    });
    client.on("error", () => {});
    clients.add(client);
    return client;
  };

  let client;
  try {
    for (let attempt = 0; attempt < START_ATTEMPTS; attempt += 1) {
      if (server.exitCode !== null || server.signalCode !== null) break;
      const candidate = newClient();
      try {
        await candidate.connect();
        client = candidate;
        break;
      } catch {
        clients.delete(candidate);
        if (candidate.isOpen) candidate.destroy();
        await delay(START_RETRY_MS);
      }
    }
    if (!client) {
      throw new Error(
        `disposable redis-server did not become ready\n${output}`,
      );
    }
    return await operation(Object.freeze({
      client,
      createClient: newClient,
      serverPid: server.pid,
      socketPath,
      tempDirectory: directory,
    }));
  } finally {
    for (const ownedClient of clients) {
      if (ownedClient.isOpen) ownedClient.destroy();
    }
    await stopServer(server);
    await rm(directory, { recursive: true, force: true });
  }
}
