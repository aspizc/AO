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

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function runMcpRequest({ env, method, params = {} }) {
  const requests = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "mcp-e2e", version: "0" },
      },
    },
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    { jsonrpc: "2.0", id: 2, method, params },
  ];
  return new Promise((resolve, reject) => {
    const requestDir = fs.mkdtempSync(path.join(env.AGENTS_WORKSPACE, "mcp-call-"));
    const inputFile = path.join(requestDir, "input.jsonl");
    const stdoutFile = path.join(requestDir, "stdout.log");
    const stderrFile = path.join(requestDir, "stderr.log");
    fs.writeFileSync(inputFile, `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`);
    const command = [
      ...Object.entries(env).map(([key, value]) => `${key}=${shellQuote(String(value))}`),
      shellQuote(process.execPath),
      shellQuote(SERVER),
      "<",
      shellQuote(inputFile),
      ">",
      shellQuote(stdoutFile),
      "2>",
      shellQuote(stderrFile),
    ].join(" ");
    const child = spawn("bash", ["-lc", command], {
      cwd: REPO_ROOT,
      stdio: "ignore",
    });
    const timer = setTimeout(() => {
      child.kill();
      const stderr = fs.existsSync(stderrFile) ? fs.readFileSync(stderrFile, "utf-8") : "";
      reject(new Error(`MCP request timed out: ${method}; stderr=${stderr}`));
    }, 5000);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      const stdout = fs.existsSync(stdoutFile) ? fs.readFileSync(stdoutFile, "utf-8") : "";
      const stderr = fs.existsSync(stderrFile) ? fs.readFileSync(stderrFile, "utf-8") : "";
      if (code !== 0) {
        reject(new Error(`MCP server failed code=${code} signal=${signal} stderr=${stderr}`));
        return;
      }
      const responses = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const response = responses.find((item) => item.id === 2);
      if (!response) {
        reject(new Error(`missing MCP response for ${method}; stdout=${stdout}; stderr=${stderr}`));
        return;
      }
      resolve(response);
    });
  });
}

export function startMcpClient({ env = {} } = {}) {
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

  function request(method, params = {}) {
    return runMcpRequest({ env: serverEnv, method, params });
  }

  async function callTool(name, args = {}) {
    const response = await request("tools/call", { name, arguments: args });
    if (response.error) throw new Error(`${name} failed: ${JSON.stringify(response.error)}`);
    return { result: response.result, body: parseToolBody(response.result) };
  }

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
    cleanup() {
      fs.rmSync(workspace, { recursive: true, force: true });
    },
  };
}
