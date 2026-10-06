import fs from "node:fs";
import path from "node:path";

import {
  createProcessSupervisor,
  readLinuxProcessIdentity,
} from "../../gateway/src/adapters/process_supervisor.js";

const CHILD_FIXTURE = new URL(
  "./process_supervisor_fixture_child.js",
  import.meta.url,
).pathname;
const [gate, workspace, wrapper] = process.argv.slice(2);

function emitReady(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function sameIdentity(expected, current) {
  return current
    && ["pid", "startToken", "pgid", "sid"].every(
      (field) => expected[field] === current[field],
    );
}

async function waitForFile(pathname, timeoutMs = 2_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (fs.existsSync(pathname)) {
      return JSON.parse(fs.readFileSync(pathname, "utf8"));
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("owned fixture marker was not created");
}

function launchRequest(argv, overrides = {}) {
  return {
    runtimePlan: {
      executable: wrapper,
      args: [],
      env: {
        LANG: "C",
        PATH: "/definitely/no/python",
        PYTHONIOENCODING: "utf-8",
      },
    },
    argv,
    env: {},
    cwd: path.dirname(CHILD_FIXTURE),
    sessionId: `caller-loss-${gate}`,
    mode: "one-shot",
    deadlineAt: Date.now() + 10_000,
    terminationGraceMs: 80,
    ...overrides,
  };
}

const caller = readLinuxProcessIdentity(process.pid);
if (!caller) process.exit(70);

if (gate === "supervisor-loss") {
  const marker = path.join(workspace, `${gate}.json`);
  const execution = await createProcessSupervisor().start(
    launchRequest([process.execPath, CHILD_FIXTURE, "escaped-tree", marker]),
  );
  const utility = await execution.utilityIdentity;
  const descendant = await waitForFile(marker);
  const leader = await waitForFile(`${marker}.leader`);
  const utilityLeader = leader.identity;
  const escapedDescendant = descendant.identity;
  const owned = [
    execution.supervisor,
    execution.reaper,
    utility,
    utilityLeader,
    escapedDescendant,
  ];
  if (!owned.every((item) => sameIdentity(
    item,
    readLinuxProcessIdentity(item.pid),
  ))) {
    throw new Error("supervisor-loss identity changed before readiness");
  }
  emitReady({
    type: "ready",
    gate,
    caller,
    supervisor: execution.supervisor,
    reaper: execution.reaper,
    utility,
    utilityLeader,
    escapedDescendant,
    owned,
  });
  try {
    const value = await execution.completion;
    emitReady({
      type: "completion",
      gate,
      outcome: "resolved",
      value,
    });
    process.exitCode = 71;
  } catch (error) {
    emitReady({
      type: "completion",
      gate,
      outcome: "rejected",
      code: error?.code,
    });
    if (error?.code !== "PROCESS_SUPERVISOR_LOST") {
      process.exitCode = 72;
    }
  }
} else if (gate === "before-release") {
  const supervisor = createProcessSupervisor({
    async beforeRelease(identities) {
      emitReady({
        gate,
        caller,
        supervisor: identities.supervisor,
        reaper: identities.reaper,
        owned: [
          identities.supervisor,
          identities.reaper,
        ],
      });
      await new Promise(() => {});
    },
  });
  await supervisor.start(launchRequest([
    process.execPath,
    CHILD_FIXTURE,
    "exit",
    "0",
  ]));
} else {
  const marker = path.join(workspace, `${gate}.json`);
  const mode = gate === "before-exec" ? "exit" : "escaped-tree";
  const argv = gate === "before-exec"
    ? [process.execPath, CHILD_FIXTURE, mode, "0"]
    : [process.execPath, CHILD_FIXTURE, mode, marker];
  const supervisor = createProcessSupervisor(
    gate === "before-exec"
      ? {
        async beforeUtilityRelease() {
          await new Promise(() => {});
        },
      }
      : {},
  );
  const execution = await supervisor.start(
    launchRequest(argv),
  );
  const utility = await execution.utilityIdentity;
  const owned = [
    execution.supervisor,
    execution.reaper,
    utility,
  ];
  if (gate === "after-exec") {
    const descendant = await waitForFile(marker);
    const leader = await waitForFile(`${marker}.leader`);
    owned.push(leader.identity, descendant.identity);
  }
  emitReady({
    gate,
    caller,
    supervisor: execution.supervisor,
    reaper: execution.reaper,
    utility,
    owned,
  });
  await new Promise(() => {});
}
