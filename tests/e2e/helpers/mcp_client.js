import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SERVER = path.join(REPO_ROOT, "gateway", "src", "mcp_server.js");

function mkdirp(target) {
  fs.mkdirSync(target, { recursive: true });
  return fs.realpathSync(target);
}

function parseToolBody(result) {
  return JSON.parse(result.content[0].text);
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export async function startMcpClient({ env = {} } = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ag-mcp-e2e-"));
  const reposRoot = mkdirp(path.join(workspace, "repos"));
  const cvisionRepo = mkdirp(path.join(reposRoot, "cvision"));
  const sampleAppsRepo = mkdirp(path.join(reposRoot, "sample-apps"));
  const auditLog = path.join(workspace, "audit", "events.jsonl");
  const serverEnv = {
    ...process.env,
    AGENTS_WORKSPACE: workspace,
    AGENTS_DRY_RUN: "1",
    AGENTS_REPO_ROOTS: reposRoot,
    ...env,
  };
  const child = spawn(process.execPath, [SERVER], {
    cwd: REPO_ROOT,
    env: serverEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pending = new Map();
  let nextId = 1;
  let stdoutBuffer = "";
  let stderr = "";
  let stopped = false;

  function rejectPending(error) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
  }

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    while (stdoutBuffer.includes("\n")) {
      const newline = stdoutBuffer.indexOf("\n");
      const line = stdoutBuffer.slice(0, newline);
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        rejectPending(new Error("MCP server emitted invalid JSON"));
        continue;
      }
      const entry = pending.get(message.id);
      if (!entry) continue;
      pending.delete(message.id);
      clearTimeout(entry.timer);
      entry.resolve(message);
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-64_000);
  });
  child.on("error", rejectPending);
  child.on("exit", (code, signal) => {
    stopped = true;
    rejectPending(
      new Error(`MCP server stopped code=${code} signal=${signal}; stderr=${stderr}`),
    );
  });

  function request(method, params = {}) {
    if (stopped) {
      return Promise.reject(new Error(`MCP server is stopped; stderr=${stderr}`));
    }
    const id = nextId;
    nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}; stderr=${stderr}`));
      }, 5_000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
        (error) => {
          if (!error) return;
          clearTimeout(timer);
          pending.delete(id);
          reject(error);
        },
      );
    });
  }

  async function callTool(name, args = {}) {
    const response = await request("tools/call", { name, arguments: args });
    if (response.error) throw new Error(`${name} failed: ${JSON.stringify(response.error)}`);
    return { result: response.result, body: parseToolBody(response.result) };
  }

  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "mcp-e2e", version: "0" },
  });
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    })}\n`,
  );

  return {
    workspace,
    paths: {
      reposRoot,
      cvisionRepo,
      sampleAppsRepo,
      auditLog,
    },
    request,
    callTool,
    async cleanup() {
      if (!stopped) {
        child.stdin.end();
        await waitForExit(child, 2_000);
      }
      if (!stopped) {
        child.kill("SIGTERM");
        await waitForExit(child, 2_000);
      }
      fs.rmSync(workspace, { recursive: true, force: true });
    },
  };
}
