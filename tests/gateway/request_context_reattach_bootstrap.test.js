import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { startMcpClient } from "../e2e/helpers/mcp_client.js";
import { readLinuxProcessIdentity } from "../../gateway/src/adapters/process_supervisor.js";
import { readKernelBootId } from "../../gateway/src/adapters/request_recovery_observations.js";

const require = createRequire(new URL("../../gateway/package.json", import.meta.url));
const Database = require("better-sqlite3");

test("actual stdio startup principal comes from OS credentials despite configured identity assertions", { timeout: 15000 }, async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "a05-bootstrap-private-"));
  const stateDb = path.join(directory, "state.db");
  fs.writeFileSync(stateDb, "", { mode: 0o600 });
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.equal(fs.statSync(directory).uid, process.geteuid(), "host-only prerequisite: sandbox-created private directory is remapped to another UID");
  assert.equal(fs.statSync(stateDb).uid, process.geteuid());
  const principals = [];
  for (const agent of ["codex", "pi"]) {
    const client = await startMcpClient({ env: { AGENTS_WORKSPACE: directory, AGENTS_STATE_DB: stateDb,
      AGENTS_DB_URL: "", AGENTS_REDIS_URL: "", AGENTS_COORDINATION_REDIS_URL: "",
      AGENTS_REQUEST_PRINCIPAL_AGENT: agent, AGENTS_REQUEST_PRINCIPAL_ID: `untrusted-${agent}`,
      USER: `changed-${agent}`, LOGNAME: `changed-${agent}`, AGENTS_DRY_RUN: "1" } });
    let database;
    try {
      const created = await client.callTool("orchestration.create", { callerAgent: agent, callerRole: "orchestrator" });
      assert.equal(created.result.isError, undefined);
      database = new Database(stateDb, { readonly: true });
      const row = database.prepare("SELECT * FROM request_context_lineage WHERE trace_id = ?").get(created.body.traceId);
      assert.ok(row, "real bootstrap did not persist verified local recovery provenance");
      assert.equal(row.principal_id, `linux-uid:${process.getuid()}`); principals.push(row.principal_id);
      assert.equal(row.state_path, fs.realpathSync(stateDb));
      assert.equal(row.owner_start_token, readLinuxProcessIdentity(row.owner_pid).startToken);
      assert.equal(row.owner_boot_id, readKernelBootId());
      assert.notEqual(row.owner_pid, process.pid); assert.equal(typeof row.owner_connection_id, "string");
      assert.match(row.machine_digest, /^[0-9a-f]{64}$/);
      const machineId = fs.readFileSync("/etc/machine-id", "utf8").trim();
      assert.doesNotMatch(JSON.stringify(row), new RegExp(machineId), "raw machine identity must not be stored");
      await client.cleanup();
      const released = database.prepare("SELECT owner_connection_id,owner_pid,owner_start_token,owner_boot_id FROM request_context_lineage WHERE trace_id = ?").get(row.trace_id);
      assert.deepEqual(Object.values(released), [null, null, null, null], "actual shutdown must release ownership after revocation");
    } finally {
      database?.close(); await client.cleanup();
    }
  }
  assert.deepEqual(principals, [`linux-uid:${process.getuid()}`, `linux-uid:${process.getuid()}`]);
});
