import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const HELPER = new URL(
  "../../gateway/src/adapters/process_supervisor_helper.py",
  import.meta.url,
).pathname;
const SESSION_PORT_FIXTURE = new URL(
  "./process_supervisor_session_port_fixture.py",
  import.meta.url,
).pathname;

function configuredPython() {
  const candidates = [
    process.env.PROCESS_SUPERVISOR_TEST_PYTHON,
    process.env.CONDA_PREFIX
      ? path.join(process.env.CONDA_PREFIX, "bin", "python")
      : null,
    process.env.VIRTUAL_ENV
      ? path.join(process.env.VIRTUAL_ENV, "bin", "python")
      : null,
    "/usr/bin/python3",
  ];
  const configured = candidates.find(
    (candidate) => candidate && path.isAbsolute(candidate) && fs.existsSync(candidate),
  );
  if (!configured) throw new Error("absolute configured test Python unavailable");
  return fs.realpathSync(configured);
}

test("Darwin seam registers kqueue NOTE_EXIT before releasing the direct utility leader", async (t) => {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "agents-process-supervisor-darwin-"),
  );
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const probe = path.join(workspace, "probe.py");
  fs.writeFileSync(
    probe,
    [
      "import importlib.util",
      "import json",
      "import sys",
      "spec = importlib.util.spec_from_file_location('process_supervisor_helper', sys.argv[1])",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "events = module.probe_darwin_kqueue_ordering()",
      "print(json.dumps(events))",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );

  const { stdout, stderr } = await execFileAsync(
    configuredPython(),
    [probe, HELPER],
    {
      env: {
        LANG: "C",
        PATH: "/definitely/no/python",
      },
      shell: false,
    },
  );
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), [
    "kqueue_created",
    "note_exit_registered",
    "utility_released",
  ]);
});

test("Darwin capability declaration is limited to the direct child leader and same PGID", async () => {
  const source = fs.readFileSync(HELPER, "utf8");
  assert.match(source, /DARWIN_CLEANUP_SCOPE\s*=\s*"child-leader\+same-pgid"/);
  assert.doesNotMatch(source, /PR_SET_CHILD_SUBREAPER.*darwin/i);
});

test("Darwin session-port identity reads exact libproc argv cwd and executable evidence", async () => {
  const { stdout, stderr } = await execFileAsync(
    configuredPython(),
    [
      "-I",
      SESSION_PORT_FIXTURE,
      "darwin-reader-probe",
      HELPER,
    ],
    {
      env: {
        LANG: "C",
        PATH: "/definitely/no/python",
      },
      shell: false,
    },
  );
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), {
    calls: [
      "proc_pidinfo:PROC_PIDTBSDINFO",
      "proc_pidpath",
      "sysctl:KERN_PROCARGS2",
      "proc_pidinfo:PROC_PIDVNODEPATHINFO",
    ],
    identity: {
      argvNulHex: Buffer.from(
        "/opt/provider/bin/agent\0--literal\0$(touch /tmp/never)\0",
      ).toString("hex"),
      cwd: "/safe/repository",
      executable: "/opt/provider/bin/agent",
      pgid: 8123,
      pid: 8123,
      sid: 8123,
      startToken: "17:23",
    },
  });
});
