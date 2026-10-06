import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  createHash,
  createHmac,
} from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { promisify } from "node:util";

import * as processSupervisorModule from
  "../../gateway/src/adapters/process_supervisor.js";

const {
  PROCESS_SUPERVISOR_PROTOCOL,
  createProcessSupervisorSessionPortFactory,
} = processSupervisorModule;

const execFileAsync = promisify(execFile);
const HELPER = new URL(
  "../../gateway/src/adapters/process_supervisor_helper.py",
  import.meta.url,
).pathname;
const ASP1_MAGIC = Buffer.from("ASP1", "ascii");
const ASP1_HEADER_BYTES = 48;
const BINDING_DOMAIN = Buffer.from(
  "agents.process-supervisor.session-port.binding-tag.v1\0",
  "ascii",
);
const LEASE_KEY = Buffer.alloc(32, 0x31);
const TERMINAL_NONCE = Buffer.alloc(32, 0x52);
const TERMINAL_NONCE_DIGEST = createHash("sha256")
  .update(TERMINAL_NONCE)
  .digest("hex");
const ERROR_CONTRACT = new Map([
  [0x0001, {
    code: "SESSION_PORT_INVALID_ARGUMENT",
    message: "session port request is invalid",
    phase: "validation",
    phaseId: 0x02,
  }],
  [0x0002, {
    code: "SESSION_PORT_NOT_PERSISTENT",
    message: "session port requires persistent execution",
    phase: "claim",
    phaseId: 0x01,
  }],
  [0x0003, {
    code: "SESSION_PORT_UNAUTHORIZED",
    message: "session port authority is invalid",
    phase: "identity",
    phaseId: 0x03,
  }],
  [0x0004, {
    code: "SESSION_PORT_REVOKED",
    message: "session port is no longer available",
    phase: "lifecycle",
    phaseId: 0x06,
  }],
  [0x0005, {
    code: "SESSION_PORT_CANCELLED",
    message: "session port operation was cancelled",
    phase: "lifecycle",
    phaseId: 0x06,
  }],
  [0x0006, {
    code: "SESSION_PORT_PROMPT_TOO_LARGE",
    message: "session prompt exceeds the byte limit",
    phase: "validation",
    phaseId: 0x02,
  }],
  [0x0007, {
    code: "SESSION_PORT_IDENTITY_CHANGED",
    message: "supervised process identity changed",
    phase: "identity",
    phaseId: 0x03,
  }],
  [0x0008, {
    code: "SESSION_PORT_NOT_FOREGROUND",
    message: "supervised process is not the terminal foreground group",
    phase: "identity",
    phaseId: 0x03,
  }],
  [0x0009, {
    code: "SESSION_PORT_TERMINAL_CHANGED",
    message: "supervised terminal binding changed",
    phase: "identity",
    phaseId: 0x03,
  }],
  [0x000a, {
    code: "SESSION_PORT_TERMINAL_CLOSED",
    message: "supervised terminal is closed",
    phase: "lifecycle",
    phaseId: 0x06,
  }],
  [0x000b, {
    code: "SESSION_PORT_WRITE_ABORTED",
    message: "session prompt write did not complete",
    phase: "write",
    phaseId: 0x04,
  }],
  [0x000c, {
    code: "SESSION_PORT_SNAPSHOT_FAILED",
    message: "terminal snapshot failed",
    phase: "snapshot",
    phaseId: 0x05,
  }],
]);

const SUPERVISOR = Object.freeze({
  pid: 5100,
  startToken: "supervisor-codec-start",
  pgid: 5100,
  sid: 5100,
});
const REAPER = Object.freeze({
  pid: 5101,
  startToken: "reaper-codec-start",
  pgid: 5100,
  sid: 5100,
});
const UTILITY = Object.freeze({
  pid: 5102,
  startToken: "utility-codec-start",
  pgid: 5102,
  sid: 5102,
});

function sha256(value) {
  return createHash("sha256").update(value).digest();
}

function deriveBindingTag({
  leaseNonce = LEASE_KEY.toString("hex"),
  bindingDigest,
  terminalNonceDigest = TERMINAL_NONCE_DIGEST,
}) {
  const key = Buffer.from(leaseNonce, "hex");
  const launch = Buffer.from(bindingDigest, "hex");
  const leaseDigest = sha256(key);
  const terminalDigest = Buffer.from(terminalNonceDigest, "hex");
  return createHmac("sha256", key)
    .update(BINDING_DOMAIN)
    .update(launch)
    .update(leaseDigest)
    .update(terminalDigest)
    .digest();
}

function encodeFrame({
  opcode,
  sequence,
  payload = Buffer.alloc(0),
  bindingTag,
}) {
  const frame = Buffer.alloc(ASP1_HEADER_BYTES + payload.length);
  ASP1_MAGIC.copy(frame, 0);
  frame[4] = 0x01;
  frame[5] = opcode;
  frame.writeUInt16BE(0, 6);
  frame.writeUInt32BE(sequence, 8);
  frame.writeUInt32BE(payload.length, 12);
  bindingTag.copy(frame, 16);
  payload.copy(frame, ASP1_HEADER_BYTES);
  return frame;
}

function inspectFrame(frame) {
  assert.equal(Buffer.isBuffer(frame), true);
  assert.ok(frame.length >= ASP1_HEADER_BYTES);
  const payloadLength = frame.readUInt32BE(12);
  assert.equal(frame.length, ASP1_HEADER_BYTES + payloadLength);
  return {
    magic: frame.subarray(0, 4),
    version: frame[4],
    opcode: frame[5],
    reserved: frame.readUInt16BE(6),
    sequence: frame.readUInt32BE(8),
    payloadLength,
    bindingTag: frame.subarray(16, 48),
    payload: frame.subarray(ASP1_HEADER_BYTES),
  };
}

function errorFrame(sequence, errorId, phaseId, bindingTag) {
  const payload = Buffer.alloc(4);
  payload.writeUInt16BE(errorId, 0);
  payload[2] = phaseId;
  payload[3] = 0;
  return encodeFrame({
    opcode: 0xff,
    sequence,
    payload,
    bindingTag,
  });
}

function validWritePayload(payload) {
  if (
    payload.length < 2
    || payload.length > 65_537
    || payload.at(-1) !== 0x0d
    || payload.subarray(0, -1).includes(0x0d)
  ) {
    return false;
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true })
      .decode(payload.subarray(0, -1));
    return decoded.length > 0 && !decoded.includes("\0");
  } catch {
    return false;
  }
}

function createFakeSideband({
  snapshot = "",
  advertisedTerminalNonceDigest = TERMINAL_NONCE_DIGEST,
  helperTerminalNonceDigest = TERMINAL_NONCE_DIGEST,
  outputBindingDigest,
  outputLeaseDigest,
  mutateRequest,
  responseFactory,
} = {}) {
  const opens = [];
  const transportCalls = [];
  const requests = [];
  const retireCalls = [];
  const logs = [];
  const audit = [];
  let expectedSequence = 1;

  return {
    opens,
    transportCalls,
    requests,
    retireCalls,
    logs,
    audit,
    ops: Object.freeze({
      async open(binding) {
        opens.push(binding);
        const expectedTag = deriveBindingTag({
          leaseNonce: binding.leaseNonce,
          bindingDigest: binding.bindingDigest,
          terminalNonceDigest: helperTerminalNonceDigest,
        });
        return {
          bindingDigest: outputBindingDigest ?? binding.bindingDigest,
          leaseDigest: outputLeaseDigest ?? binding.leaseDigest,
          terminalNonceDigest: advertisedTerminalNonceDigest,
          async exchange(frame, control) {
            control?.onDispatchStart();
            transportCalls.push(Buffer.from(frame));
            control?.onDispatched();
            const candidate = mutateRequest
              ? mutateRequest(Buffer.from(frame))
              : Buffer.from(frame);
            let parsed;
            try {
              parsed = inspectFrame(candidate);
            } catch {
              const sequence = candidate.length >= 12
                ? candidate.readUInt32BE(8)
                : 0;
              return errorFrame(
                sequence,
                0x0001,
                0x02,
                expectedTag,
              );
            }
            const malformedHeader = (
              !parsed.magic.equals(ASP1_MAGIC)
              || parsed.version !== 0x01
              || parsed.reserved !== 0
              || candidate.length > 65_585
            );
            if (malformedHeader) {
              return errorFrame(
                parsed.sequence,
                0x0001,
                0x02,
                expectedTag,
              );
            }
            if (!parsed.bindingTag.equals(expectedTag)) {
              return errorFrame(
                parsed.sequence,
                0x0003,
                0x03,
                expectedTag,
              );
            }
            if (
              parsed.sequence === 0
              || parsed.sequence !== expectedSequence
            ) {
              return errorFrame(
                parsed.sequence,
                0x0003,
                0x03,
                expectedTag,
              );
            }
            if (
              (parsed.opcode === 0x01 && !validWritePayload(parsed.payload))
              || (parsed.opcode === 0x02 && parsed.payload.length !== 0)
              || ![0x01, 0x02].includes(parsed.opcode)
            ) {
              return errorFrame(
                parsed.sequence,
                0x0001,
                0x02,
                expectedTag,
              );
            }

            expectedSequence += 1;
            const request = Object.freeze({
              opcode: parsed.opcode,
              sequence: parsed.sequence,
              payload: Buffer.from(parsed.payload),
              bindingTag: Buffer.from(parsed.bindingTag),
            });
            requests.push(request);
            let response;
            if (parsed.opcode === 0x01) {
              const payload = Buffer.alloc(4);
              payload.writeUInt32BE(parsed.payload.length - 1);
              response = encodeFrame({
                opcode: 0x81,
                sequence: parsed.sequence,
                payload,
                bindingTag: expectedTag,
              });
            } else {
              response = encodeFrame({
                opcode: 0x82,
                sequence: parsed.sequence,
                payload: Buffer.from(snapshot, "utf8"),
                bindingTag: expectedTag,
              });
            }
            return responseFactory
              ? responseFactory({
                request,
                response,
                bindingTag: expectedTag,
              })
              : response;
          },
          retire() {
            retireCalls.push(true);
          },
        };
      },
    }),
  };
}

class FakeChild extends EventEmitter {
  constructor() {
    super();
    this.pid = SUPERVISOR.pid;
    this.stdin = new PassThrough();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.transcript = new PassThrough();
    this.stdio = [
      this.stdin,
      this.stdout,
      this.stderr,
      this.transcript,
    ];
  }
}

function transcript(child, event) {
  child.transcript.write(`${JSON.stringify(event)}\n`);
}

function createFakeProcessOps({ autoUtilityReady = true } = {}) {
  const child = new FakeChild();
  const commands = [];
  const lifecycleFrames = [];
  const spawnCalls = [];
  let buffered = "";
  let utilityReadySent = false;
  let settled = false;

  const emitUtilityReady = (bindingDigest) => {
    if (utilityReadySent) return;
    utilityReadySent = true;
    transcript(child, {
      type: "utility_ready",
      protocol: PROCESS_SUPERVISOR_PROTOCOL,
      bindingDigest,
      utility: UTILITY,
    });
  };
  const settle = (reason = "cancelled") => {
    if (settled) return;
    settled = true;
    queueMicrotask(() => {
      transcript(child, {
        type: "terminal",
        protocol: PROCESS_SUPERVISOR_PROTOCOL,
        reason,
      });
      child.stdout.end();
      child.stderr.end();
      child.transcript.end();
      child.emit("exit", 0, null);
    });
  };

  child.stdin.setEncoding("utf8");
  child.stdin.on("data", (chunk) => {
    buffered += chunk;
    while (buffered.includes("\n")) {
      const newline = buffered.indexOf("\n");
      const line = buffered.slice(0, newline);
      buffered = buffered.slice(newline + 1);
      lifecycleFrames.push(line);
      const command = JSON.parse(line);
      commands.push(command);
      if (command.type === "launch") {
        queueMicrotask(() => {
          transcript(child, {
            type: "reaper_ready",
            protocol: PROCESS_SUPERVISOR_PROTOCOL,
            leaseDigest: createHash("sha256")
              .update(command.leaseNonce)
              .digest("hex"),
            bindingDigest: command.bindingDigest,
            platform: "linux",
            subreaper: true,
            supervisor: SUPERVISOR,
            reaper: REAPER,
          });
        });
      } else if (command.type === "release" && autoUtilityReady) {
        queueMicrotask(() => emitUtilityReady(
          commands.find((entry) => entry.type === "launch").bindingDigest,
        ));
      } else if (command.type === "continue") {
        queueMicrotask(() => transcript(child, {
          type: "utility_exec",
          protocol: PROCESS_SUPERVISOR_PROTOCOL,
        }));
      } else if (command.type === "terminate") {
        settle(command.reason);
      }
    }
  });

  const identities = new Map([
    [SUPERVISOR.pid, SUPERVISOR],
    [REAPER.pid, REAPER],
    [UTILITY.pid, UTILITY],
  ]);
  return {
    child,
    commands,
    lifecycleFrames,
    spawnCalls,
    emitUtilityReady,
    settle,
    get settled() {
      return settled;
    },
    ops: Object.freeze({
      spawn(...arguments_) {
        spawnCalls.push(arguments_);
        return child;
      },
      readIdentity(pid) {
        return identities.get(pid) ?? null;
      },
      signalGroup() {},
    }),
  };
}

function baseLaunch(overrides = {}) {
  return {
    runtimePlan: {
      executable: "/configured/python-wrapper",
      args: ["--isolated"],
      env: {
        LANG: "C",
        PATH: "/no/ambient/python",
      },
    },
    argv: [
      "/fixture/session-port-agent",
      "--literal",
      "$(touch /tmp/never)",
    ],
    env: {
      AGENT_MODE: "test",
      PATH: "/provider/bin",
    },
    cwd: "/safe/repository",
    sessionId: "ag-codec-session",
    mode: "persistent",
    ...overrides,
  };
}

function createHarness({
  sideband = createFakeSideband(),
  autoUtilityReady = true,
} = {}) {
  const processFake = createFakeProcessOps({ autoUtilityReady });
  const scheduler = {
    setTimeout(callback, delay) {
      return { callback, delay };
    },
    clearTimeout() {},
  };
  const factory = createProcessSupervisorSessionPortFactory({
    processOps: processFake.ops,
    clock: { now: () => 1_000 },
    scheduler,
    randomBytes(size) {
      assert.equal(size, 32);
      return Buffer.from(LEASE_KEY);
    },
    platform: "linux",
    sessionPortOps: sideband.ops,
  });
  return {
    ...factory,
    factory,
    processFake,
    sideband,
  };
}

async function startExecution(t, harness, overrides = {}) {
  const execution = await harness.supervisor.start(baseLaunch(overrides));
  t.after(async () => {
    if (!harness.processFake.settled) {
      void execution.cancel();
    }
    await Promise.allSettled([execution.completion]);
  });
  return execution;
}

function assertPortError(error, {
  code,
  message,
  phase,
}) {
  assert.equal(error?.constructor?.name, "ProcessSupervisorSessionPortError");
  assert.deepEqual(Object.keys(error), [
    "name",
    "code",
    "message",
    "phase",
  ]);
  assert.equal(error.name, "ProcessSupervisorSessionPortError");
  assert.equal(error.code, code);
  assert.equal(error.message, message);
  assert.equal(error.phase, phase);
  assert.equal("cause" in error, false);
  return true;
}

function assertCode(error, code, phase) {
  const contract = [...ERROR_CONTRACT.values()]
    .find((entry) => entry.code === code);
  return assertPortError(error, {
    ...contract,
    phase,
  });
}

function greenTest(name, callback) {
  test(name, {
    skip: typeof createProcessSupervisorSessionPortFactory !== "function",
  }, callback);
}

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
    (candidate) => candidate
      && path.isAbsolute(candidate)
      && fs.existsSync(candidate),
  );
  if (!configured) {
    throw new Error("absolute configured test Python unavailable");
  }
  return fs.realpathSync(configured);
}

async function probeHelper(frame, bindingTag, expectedSequence) {
  const source = [
    "import importlib.util",
    "import json",
    "import sys",
    "spec = importlib.util.spec_from_file_location('process_supervisor_helper', sys.argv[1])",
    "module = importlib.util.module_from_spec(spec)",
    "sys.modules[spec.name] = module",
    "spec.loader.exec_module(module)",
    "result = module.decode_asp1_request(bytes.fromhex(sys.argv[2]), bytes.fromhex(sys.argv[3]), int(sys.argv[4]))",
    "output = {}",
    "for key, value in result.items():",
    "    output[key] = value.hex() if isinstance(value, (bytes, bytearray)) else value",
    "print(json.dumps(output, sort_keys=True))",
  ].join("\n");
  const { stdout, stderr } = await execFileAsync(
    configuredPython(),
    [
      "-c",
      source,
      HELPER,
      frame.toString("hex"),
      bindingTag.toString("hex"),
      String(expectedSequence),
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
  return JSON.parse(stdout);
}

async function probeHelperWriteOkEncoder({
  acceptedBytes,
  requestPromptBytes,
}) {
  const source = [
    "import importlib.util",
    "import inspect",
    "import json",
    "import sys",
    "spec = importlib.util.spec_from_file_location('process_supervisor_helper', sys.argv[1])",
    "module = importlib.util.module_from_spec(spec)",
    "sys.modules[spec.name] = module",
    "spec.loader.exec_module(module)",
    "accepted = int(sys.argv[2])",
    "expected = None if sys.argv[3] == 'none' else int(sys.argv[3])",
    "payload = accepted.to_bytes(4, 'big')",
    "parameters = inspect.signature(module.encode_asp1_response).parameters",
    "try:",
    "    if expected is not None and 'request_prompt_bytes' in parameters:",
    "        frame = module.encode_asp1_response(0x81, 1, payload, bytes([0x73]) * 32, request_prompt_bytes=expected)",
    "    else:",
    "        frame = module.encode_asp1_response(0x81, 1, payload, bytes([0x73]) * 32)",
    "except (TypeError, ValueError):",
    "    print(json.dumps({'status': 'rejected'}, sort_keys=True))",
    "else:",
    "    print(json.dumps({'frame': frame.hex(), 'status': 'encoded'}, sort_keys=True))",
  ].join("\n");
  const { stdout, stderr } = await execFileAsync(
    configuredPython(),
    [
      "-c",
      source,
      HELPER,
      String(acceptedBytes),
      requestPromptBytes === undefined
        ? "none"
        : String(requestPromptBytes),
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
  return JSON.parse(stdout);
}

test(
  "separately issues a persistent session port and round-trips one authenticated ASP1 request",
  async (t) => {
    assert.equal(
      typeof createProcessSupervisorSessionPortFactory,
      "function",
    );
    const harness = createHarness();
    assert.deepEqual(Reflect.ownKeys(harness.factory), [
      "supervisor",
      "sessionPortIssuer",
    ]);
    assert.equal(Object.isFrozen(harness.factory), true);

    const execution = await startExecution(t, harness);
    assert.deepEqual(Reflect.ownKeys(execution), [
      "mode",
      "bindingDigest",
      "supervisor",
      "reaper",
      "utilityIdentity",
      "completion",
      "cancel",
    ]);
    const issued = await harness.sessionPortIssuer.claim({ execution });

    assert.deepEqual(
      await issued.port.writePrompt({ prompt: "status" }),
      {
        sequence: 1,
        acceptedBytes: 6,
      },
    );
    assert.equal(harness.sideband.requests[0].opcode, 0x01);
    assert.equal(harness.sideband.requests[0].sequence, 1);
    assert.deepEqual(
      harness.sideband.requests[0].payload,
      Buffer.from("status\r", "utf8"),
    );
    assert.equal(harness.sideband.requests[0].bindingTag.length, 32);
  },
);

greenTest(
  "round-trips an empty snapshot with exact ASP1 opcodes and immutable capability shapes",
  async (t) => {
    const harness = createHarness();
    const execution = await startExecution(t, harness);
    const issued = await harness.sessionPortIssuer.claim({ execution });

    assert.equal(Object.getPrototypeOf(issued), Object.prototype);
    assert.equal(Object.isFrozen(issued), true);
    assert.deepEqual(Reflect.ownKeys(issued), ["port", "observation"]);
    assert.equal(Object.getPrototypeOf(issued.port), null);
    assert.equal(Object.isFrozen(issued.port), true);
    assert.deepEqual(Reflect.ownKeys(issued.port), [
      "writePrompt",
      "snapshot",
    ]);
    assert.deepEqual(issued.observation, {
      sessionId: "ag-codec-session",
      tmuxTarget: "ag-codec-session",
      attachCommand: "tmux attach -t ag-codec-session",
    });
    assert.equal(Object.isFrozen(issued.observation), true);
    assert.equal("sessionPortIssuer" in execution, false);
    assert.equal("sessionPortOps" in execution, false);
    assert.equal("sessionPortIssuer" in harness.supervisor, false);

    const result = await issued.port.snapshot({});
    assert.deepEqual(result, {
      sequence: 1,
      snapshot: "",
      snapshotBytes: 0,
      truncated: false,
    });
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(harness.sideband.requests[0].opcode, 0x02);
    assert.equal(harness.sideband.requests[0].sequence, 1);
    assert.equal(harness.sideband.requests[0].payload.length, 0);
  },
);

greenTest(
  "derives the byte-exact HMAC binding tag from launch lease and terminal nonce values",
  async (t) => {
    const harness = createHarness();
    const execution = await startExecution(t, harness);
    const issued = await harness.sessionPortIssuer.claim({ execution });
    await issued.port.writePrompt({ prompt: "status" });

    assert.equal(harness.sideband.opens.length, 1);
    const [binding] = harness.sideband.opens;
    assert.deepEqual(Reflect.ownKeys(binding), [
      "bindingDigest",
      "leaseDigest",
      "leaseNonce",
      "sessionId",
    ]);
    assert.equal(Object.isFrozen(binding), true);
    assert.equal(binding.bindingDigest, execution.bindingDigest);
    assert.equal(binding.leaseNonce, LEASE_KEY.toString("hex"));
    assert.equal(
      binding.leaseDigest,
      sha256(LEASE_KEY).toString("hex"),
    );
    const expected = deriveBindingTag({
      bindingDigest: execution.bindingDigest,
    });
    assert.deepEqual(
      harness.sideband.requests[0].bindingTag,
      expected,
    );
    assert.equal(
      expected.equals(deriveBindingTag({
        leaseNonce: Buffer.alloc(32, 0x32).toString("hex"),
        bindingDigest: execution.bindingDigest,
      })),
      false,
    );
    assert.equal(
      expected.equals(deriveBindingTag({
        bindingDigest: "a".repeat(64),
      })),
      false,
    );
    assert.equal(
      expected.equals(deriveBindingTag({
        bindingDigest: execution.bindingDigest,
        terminalNonceDigest: "b".repeat(64),
      })),
      false,
    );
  },
);

greenTest(
  "waits through bootstrap and returns one idempotent capability per execution",
  async (t) => {
    const harness = createHarness({ autoUtilityReady: false });
    const execution = await startExecution(t, harness);
    const firstClaim = harness.sessionPortIssuer.claim({ execution });
    const observed = await Promise.race([
      firstClaim.then(() => "resolved"),
      new Promise((resolve) => setImmediate(() => resolve("pending"))),
    ]);
    assert.equal(observed, "pending");
    assert.equal(harness.sideband.opens.length, 0);

    harness.processFake.emitUtilityReady(execution.bindingDigest);
    const first = await firstClaim;
    const second = await harness.sessionPortIssuer.claim({ execution });
    assert.equal(first, second);
    assert.equal(harness.sideband.opens.length, 1);
  },
);

greenTest(
  "rejects a pending bootstrap claim when cancellation wins an unresolved channel open",
  async (t) => {
    const opens = [];
    const sideband = {
      opens,
      ops: Object.freeze({
        open(binding) {
          opens.push(binding);
          return new Promise(() => {});
        },
      }),
    };
    const harness = createHarness({ sideband });
    const execution = await startExecution(t, harness);
    const claim = harness.sessionPortIssuer.claim({ execution });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(opens.length, 1);

    const completion = execution.cancel();
    const outcome = await Promise.race([
      claim.then(
        () => ({ status: "resolved" }),
        (error) => ({ status: "rejected", error }),
      ),
      new Promise((resolve) => {
        setTimeout(() => resolve({ status: "timeout" }), 100);
      }),
    ]);
    assert.equal(outcome.status, "rejected");
    assertCode(
      outcome.error,
      "SESSION_PORT_REVOKED",
      "lifecycle",
    );
    await completion;
  },
);

greenTest(
  "rejects port-enabled persistent output destinations before runtime creation",
  async () => {
    for (const field of ["stdout", "stderr"]) {
      const harness = createHarness();
      await assert.rejects(
        harness.supervisor.start(baseLaunch({
          [field]: new PassThrough(),
        })),
        (error) => {
          assert.equal(error?.constructor?.name, "ProcessSupervisorError");
          assert.equal(error.code, "PROCESS_INVALID_REQUEST");
          assert.equal(error.phase, "validation");
          return true;
        },
      );
      assert.equal(harness.processFake.spawnCalls.length, 0);
      assert.equal(harness.sideband.opens.length, 0);
      assert.equal(harness.sideband.transportCalls.length, 0);
    }
  },
);

greenTest(
  "rejects forged copied proxy-wrapped cross-factory and one-shot claims without transport",
  async (t) => {
    const harness = createHarness();
    const execution = await startExecution(t, harness);
    const forgedExecution = Object.freeze({ ...execution });
    const proxyExecution = new Proxy(execution, {});
    const proxyRequest = new Proxy({ execution }, {});
    const copiedClaim = harness.sessionPortIssuer.claim;

    for (const attempt of [
      () => harness.sessionPortIssuer.claim({
        execution: forgedExecution,
      }),
      () => harness.sessionPortIssuer.claim({
        execution: proxyExecution,
      }),
      () => copiedClaim({ execution }),
      () => copiedClaim.call(Object.create(null), { execution }),
    ]) {
      await assert.rejects(
        attempt,
        (error) => assertCode(
          error,
          "SESSION_PORT_UNAUTHORIZED",
          "claim",
        ),
      );
    }
    await assert.rejects(
      harness.sessionPortIssuer.claim(proxyRequest),
      (error) => assertCode(
        error,
        "SESSION_PORT_INVALID_ARGUMENT",
        "validation",
      ),
    );
    assert.equal(harness.sideband.opens.length, 0);
    assert.equal(harness.sideband.transportCalls.length, 0);

    const foreign = createHarness();
    const foreignExecution = await startExecution(t, foreign);
    await assert.rejects(
      harness.sessionPortIssuer.claim({
        execution: foreignExecution,
      }),
      (error) => assertCode(
        error,
        "SESSION_PORT_UNAUTHORIZED",
        "claim",
      ),
    );
    assert.equal(harness.sideband.opens.length, 0);

    const oneShot = createHarness();
    const oneShotExecution = await startExecution(t, oneShot, {
      mode: "one-shot",
      deadlineAt: 10_000,
    });
    await assert.rejects(
      oneShot.sessionPortIssuer.claim({
        execution: oneShotExecution,
      }),
      (error) => assertCode(
        error,
        "SESSION_PORT_NOT_PERSISTENT",
        "claim",
      ),
    );
    assert.equal(oneShot.sideband.opens.length, 0);
    assert.equal(oneShot.sideband.transportCalls.length, 0);
  },
);

greenTest(
  "rejects copied forged proxy-wrapped and stale port receivers without transport",
  async (t) => {
    const harness = createHarness();
    const execution = await startExecution(t, harness);
    const { port } = await harness.sessionPortIssuer.claim({ execution });
    const detachedWrite = port.writePrompt;
    const copiedPort = Object.freeze(Object.assign(Object.create(null), {
      writePrompt: port.writePrompt,
      snapshot: port.snapshot,
    }));
    const proxyPort = new Proxy(port, {});

    for (const attempt of [
      () => detachedWrite({ prompt: "never" }),
      () => copiedPort.writePrompt({ prompt: "never" }),
      () => proxyPort.writePrompt({ prompt: "never" }),
      () => port.snapshot.call(Object.create(null), {}),
    ]) {
      await assert.rejects(
        attempt,
        (error) => assertCode(
          error,
          "SESSION_PORT_UNAUTHORIZED",
          "claim",
        ),
      );
    }
    assert.equal(harness.sideband.transportCalls.length, 0);

    await execution.cancel();
    await assert.rejects(
      port.writePrompt({ prompt: "stale" }),
      (error) => assertCode(
        error,
        "SESSION_PORT_REVOKED",
        "lifecycle",
      ),
    );
    assert.equal(harness.sideband.transportCalls.length, 0);
    assert.equal(harness.sideband.retireCalls.length, 1);
  },
);

greenTest(
  "validates exact plain claim write and snapshot arguments before transport",
  async (t) => {
    const harness = createHarness();
    const execution = await startExecution(t, harness);
    const issued = await harness.sessionPortIssuer.claim({ execution });
    let accessorRead = false;
    const accessor = {};
    Object.defineProperty(accessor, "prompt", {
      enumerable: true,
      get() {
        accessorRead = true;
        return "never";
      },
    });
    const symbolWrite = { prompt: "never" };
    symbolWrite[Symbol("extra")] = true;

    for (const argument of [
      null,
      {},
      { prompt: "never", extra: true },
      Object.assign(Object.create(null), { prompt: "never" }),
      new Proxy({ prompt: "never" }, {}),
      accessor,
      symbolWrite,
    ]) {
      await assert.rejects(
        issued.port.writePrompt(argument),
        (error) => assertCode(
          error,
          "SESSION_PORT_INVALID_ARGUMENT",
          "validation",
        ),
      );
    }
    for (const argument of [
      null,
      { extra: true },
      Object.create(null),
      new Proxy({}, {}),
      { [Symbol("extra")]: true },
    ]) {
      await assert.rejects(
        issued.port.snapshot(argument),
        (error) => assertCode(
          error,
          "SESSION_PORT_INVALID_ARGUMENT",
          "validation",
        ),
      );
    }
    await assert.rejects(
      harness.sessionPortIssuer.claim({ execution, extra: true }),
      (error) => assertCode(
        error,
        "SESSION_PORT_INVALID_ARGUMENT",
        "validation",
      ),
    );
    assert.equal(accessorRead, false);
    assert.equal(harness.sideband.transportCalls.length, 0);
  },
);

greenTest(
  "enforces strict prompt Unicode CR and byte limits without consuming a sequence",
  async (t) => {
    const harness = createHarness();
    const execution = await startExecution(t, harness);
    const { port } = await harness.sessionPortIssuer.claim({ execution });

    for (const prompt of [
      "",
      "\0",
      "before\rafter",
      "\ud800",
      "\udc00",
    ]) {
      await assert.rejects(
        port.writePrompt({ prompt }),
        (error) => assertCode(
          error,
          "SESSION_PORT_INVALID_ARGUMENT",
          "validation",
        ),
      );
    }
    await assert.rejects(
      port.writePrompt({ prompt: "a".repeat(65_537) }),
      (error) => assertCode(
        error,
        "SESSION_PORT_PROMPT_TOO_LARGE",
        "validation",
      ),
    );
    assert.equal(harness.sideband.transportCalls.length, 0);

    assert.deepEqual(
      await port.writePrompt({ prompt: "a".repeat(65_536) }),
      {
        sequence: 1,
        acceptedBytes: 65_536,
      },
    );
    assert.equal(harness.sideband.requests[0].payload.length, 65_537);
    assert.equal(harness.sideband.requests[0].payload.at(-1), 0x0d);
  },
);

greenTest(
  "admits concurrent operations in FIFO order with one monotonic sequence",
  async (t) => {
    const releases = [];
    const sideband = createFakeSideband({
      responseFactory({ response }) {
        return new Promise((resolve) => {
          releases.push(() => resolve(response));
        });
      },
    });
    const harness = createHarness({ sideband });
    const execution = await startExecution(t, harness);
    const { port } = await harness.sessionPortIssuer.claim({ execution });

    const write = port.writePrompt({ prompt: "first" });
    const snapshot = port.snapshot({});
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sideband.transportCalls.length, 1);
    releases.shift()();
    assert.deepEqual(await write, {
      sequence: 1,
      acceptedBytes: 5,
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sideband.transportCalls.length, 2);
    releases.shift()();
    assert.deepEqual(await snapshot, {
      sequence: 2,
      snapshot: "",
      snapshotBytes: 0,
      truncated: false,
    });
    assert.deepEqual(
      sideband.requests.map(({ opcode, sequence }) => ({
        opcode,
        sequence,
      })),
      [
        { opcode: 0x01, sequence: 1 },
        { opcode: 0x02, sequence: 2 },
      ],
    );
  },
);

greenTest(
  "maps sideband-applicable ASP1 error ids to exact provider-free public errors",
  async (t) => {
    for (const [errorId, operationType] of [
      [0x0001, "write"],
      [0x0003, "write"],
      [0x0004, "write"],
      [0x0005, "write"],
      [0x0007, "write"],
      [0x0008, "write"],
      [0x0009, "write"],
      [0x000a, "write"],
      [0x000b, "write"],
      [0x000c, "snapshot"],
    ]) {
      const contract = ERROR_CONTRACT.get(errorId);
      const sideband = createFakeSideband({
        responseFactory({ request, bindingTag }) {
          assert.deepEqual(request.bindingTag, bindingTag);
          return errorFrame(
            request.sequence,
            errorId,
            contract.phaseId,
            bindingTag,
          );
        },
      });
      const harness = createHarness({ sideband });
      const execution = await startExecution(t, harness);
      const { port } = await harness.sessionPortIssuer.claim({ execution });
      await assert.rejects(
        operationType === "write"
          ? port.writePrompt({
            prompt: "provider-secret-never-in-error",
          })
          : port.snapshot({}),
        (error) => {
          assertPortError(error, contract);
          assert.doesNotMatch(
            JSON.stringify(error),
            /provider-secret-never-in-error/,
          );
          return true;
        },
      );
      assert.equal(sideband.retireCalls.length, 1);
    }
  },
);

greenTest(
  "binds authenticated ASP1 errors to write snapshot and sideband-permitted sources",
  async (t) => {
    for (const {
      operationType,
      errorId,
      phaseId,
      expectedCode,
      expectedPhase,
    } of [
      {
        operationType: "write",
        errorId: 0x000c,
        phaseId: 0x05,
        expectedCode: "SESSION_PORT_WRITE_ABORTED",
        expectedPhase: "write",
      },
      {
        operationType: "snapshot",
        errorId: 0x000b,
        phaseId: 0x04,
        expectedCode: "SESSION_PORT_SNAPSHOT_FAILED",
        expectedPhase: "snapshot",
      },
      {
        operationType: "snapshot",
        errorId: 0x0005,
        phaseId: 0x06,
        expectedCode: "SESSION_PORT_SNAPSHOT_FAILED",
        expectedPhase: "snapshot",
      },
      {
        operationType: "snapshot",
        errorId: 0x0008,
        phaseId: 0x03,
        expectedCode: "SESSION_PORT_SNAPSHOT_FAILED",
        expectedPhase: "snapshot",
      },
      {
        operationType: "write",
        errorId: 0x0002,
        phaseId: 0x01,
        expectedCode: "SESSION_PORT_WRITE_ABORTED",
        expectedPhase: "write",
      },
      {
        operationType: "snapshot",
        errorId: 0x0006,
        phaseId: 0x02,
        expectedCode: "SESSION_PORT_SNAPSHOT_FAILED",
        expectedPhase: "snapshot",
      },
      {
        operationType: "write",
        errorId: 0x0003,
        phaseId: 0x01,
        expectedCode: "SESSION_PORT_WRITE_ABORTED",
        expectedPhase: "write",
      },
    ]) {
      const sideband = createFakeSideband({
        responseFactory({ request, bindingTag }) {
          assert.deepEqual(request.bindingTag, bindingTag);
          return errorFrame(
            request.sequence,
            errorId,
            phaseId,
            bindingTag,
          );
        },
      });
      const harness = createHarness({ sideband });
      const execution = await startExecution(t, harness);
      const { port } = await harness.sessionPortIssuer.claim({ execution });
      await assert.rejects(
        operationType === "write"
          ? port.writePrompt({ prompt: "status" })
          : port.snapshot({}),
        (error) => assertCode(
          error,
          expectedCode,
          expectedPhase,
        ),
      );
      assert.equal(sideband.transportCalls.length, 1);
      assert.equal(sideband.requests.length, 1);
      assert.equal(sideband.retireCalls.length, 1);
    }
  },
);

greenTest(
  "maps malformed or unknown write response to WRITE_ABORTED",
  async (t) => {
    const mutations = [
      (response) => {
        response[0] ^= 0xff;
        return response;
      },
      (response) => {
        response[16] ^= 0xff;
        return response;
      },
      (response) => {
        response[5] = 0x90;
        return response;
      },
      (response) => {
        response.writeUInt32BE(3, 12);
        return response.subarray(0, response.length - 1);
      },
      (response) => {
        response.writeUInt32BE(1, 48);
        return response;
      },
    ];
    for (const mutate of mutations) {
      const sideband = createFakeSideband({
        responseFactory({ response }) {
          return mutate(Buffer.from(response));
        },
      });
      const harness = createHarness({ sideband });
      const execution = await startExecution(t, harness);
      const { port } = await harness.sessionPortIssuer.claim({ execution });
      await assert.rejects(
        port.writePrompt({ prompt: "status" }),
        (error) => assertCode(
          error,
          "SESSION_PORT_WRITE_ABORTED",
          "write",
        ),
      );
      assert.equal(sideband.retireCalls.length, 1);
    }
  },
);

greenTest(
  "maps malformed or unknown snapshot response to SNAPSHOT_FAILED",
  async (t) => {
    const sideband = createFakeSideband({
      responseFactory({ response }) {
        const malformed = Buffer.from(response);
        malformed[5] = 0x90;
        return malformed;
      },
    });
    const harness = createHarness({ sideband });
    const execution = await startExecution(t, harness);
    const { port } = await harness.sessionPortIssuer.claim({ execution });
    await assert.rejects(
      port.snapshot({}),
      (error) => assertCode(
        error,
        "SESSION_PORT_SNAPSHOT_FAILED",
        "snapshot",
      ),
    );
    assert.equal(sideband.retireCalls.length, 1);
  },
);

greenTest(
  "rejects duplicate or out-of-order ASP1 response and revokes",
  async (t) => {
    for (const responseSequence of [0, 2]) {
      const sideband = createFakeSideband({
        responseFactory({ response }) {
          const changed = Buffer.from(response);
          changed.writeUInt32BE(responseSequence, 8);
          return changed;
        },
      });
      const harness = createHarness({ sideband });
      const execution = await startExecution(t, harness);
      const { port } = await harness.sessionPortIssuer.claim({ execution });
      await assert.rejects(
        port.writePrompt({ prompt: "status" }),
        (error) => assertCode(
          error,
          "SESSION_PORT_WRITE_ABORTED",
          "write",
        ),
      );
      await assert.rejects(
        port.snapshot({}),
        (error) => assertCode(
          error,
          "SESSION_PORT_REVOKED",
          "lifecycle",
        ),
      );
      assert.equal(sideband.transportCalls.length, 1);
    }
  },
);

greenTest(
  "rejects changed launch lease terminal nonce and tag bytes before operation dispatch",
  async (t) => {
    for (const sideband of [
      createFakeSideband({ outputBindingDigest: "a".repeat(64) }),
      createFakeSideband({ outputLeaseDigest: "b".repeat(64) }),
    ]) {
      const harness = createHarness({ sideband });
      const execution = await startExecution(t, harness);
      await assert.rejects(
        harness.sessionPortIssuer.claim({ execution }),
        (error) => assertCode(
          error,
          "SESSION_PORT_UNAUTHORIZED",
          "identity",
        ),
      );
      assert.equal(sideband.transportCalls.length, 0);
      assert.equal(sideband.requests.length, 0);
    }

    const changedTerminal = createFakeSideband({
      advertisedTerminalNonceDigest: "c".repeat(64),
    });
    const terminalHarness = createHarness({ sideband: changedTerminal });
    const terminalExecution = await startExecution(t, terminalHarness);
    const terminalIssued = await terminalHarness.sessionPortIssuer.claim({
      execution: terminalExecution,
    });
    await assert.rejects(
      terminalIssued.port.writePrompt({ prompt: "status" }),
      (error) => assertCode(
        error,
        "SESSION_PORT_WRITE_ABORTED",
        "write",
      ),
    );
    assert.equal(changedTerminal.requests.length, 0);

    const changedTag = createFakeSideband({
      mutateRequest(frame) {
        frame[16] ^= 0xff;
        return frame;
      },
    });
    const tagHarness = createHarness({ sideband: changedTag });
    const tagExecution = await startExecution(t, tagHarness);
    const tagIssued = await tagHarness.sessionPortIssuer.claim({
      execution: tagExecution,
    });
    await assert.rejects(
      tagIssued.port.writePrompt({ prompt: "status" }),
      (error) => assertCode(
        error,
        "SESSION_PORT_UNAUTHORIZED",
        "identity",
      ),
    );
    assert.equal(changedTag.requests.length, 0);
  },
);

greenTest(
  "keeps raw prompt and snapshot bytes off lifecycle JSON logs audit errors observation and execution state",
  async (t) => {
    const prompt = "raw-provider-prompt-secret";
    const snapshot = "raw-provider-snapshot-secret\n";
    const sideband = createFakeSideband({ snapshot });
    const harness = createHarness({ sideband });
    const execution = await startExecution(t, harness);
    const issued = await harness.sessionPortIssuer.claim({ execution });

    await issued.port.writePrompt({ prompt });
    const snapshotResult = await issued.port.snapshot({});
    assert.equal(snapshotResult.snapshot, snapshot);
    await assert.rejects(
      issued.port.writePrompt({ prompt: `${prompt}\r` }),
      (error) => {
        assertCode(
          error,
          "SESSION_PORT_INVALID_ARGUMENT",
          "validation",
        );
        assert.doesNotMatch(JSON.stringify(error), /raw-provider/);
        return true;
      },
    );

    const providerFreeSurfaces = JSON.stringify({
      lifecycleFrames: harness.processFake.lifecycleFrames,
      commands: harness.processFake.commands,
      logs: sideband.logs,
      audit: sideband.audit,
      observation: issued.observation,
      execution,
    });
    assert.doesNotMatch(providerFreeSurfaces, /raw-provider-prompt-secret/);
    assert.doesNotMatch(providerFreeSurfaces, /raw-provider-snapshot-secret/);
    assert.equal(
      sideband.requests[0].payload.equals(
        Buffer.from(`${prompt}\r`, "utf8"),
      ),
      true,
    );
  },
);

greenTest(
  "helper codec decodes exact WRITE_PROMPT and SNAPSHOT request frames",
  async () => {
    const bindingTag = Buffer.alloc(32, 0x73);
    const write = encodeFrame({
      opcode: 0x01,
      sequence: 1,
      payload: Buffer.from("status\r", "utf8"),
      bindingTag,
    });
    const decodedWrite = await probeHelper(write, bindingTag, 1);
    assert.deepEqual(decodedWrite, {
      opcode: 0x01,
      payload: Buffer.from("status\r").toString("hex"),
      response: null,
      revoke: false,
      sequence: 1,
      status: "dispatch",
    });

    const snapshot = encodeFrame({
      opcode: 0x02,
      sequence: 2,
      bindingTag,
    });
    const decodedSnapshot = await probeHelper(snapshot, bindingTag, 2);
    assert.deepEqual(decodedSnapshot, {
      opcode: 0x02,
      payload: "",
      response: null,
      revoke: false,
      sequence: 2,
      status: "dispatch",
    });
  },
);

greenTest(
  "helper WRITE_OK encoder binds one bounded accepted count to its request",
  async () => {
    for (const acceptedBytes of [6, 65_536]) {
      const encoded = await probeHelperWriteOkEncoder({
        acceptedBytes,
        requestPromptBytes: acceptedBytes,
      });
      assert.equal(encoded.status, "encoded");
      const frame = inspectFrame(Buffer.from(encoded.frame, "hex"));
      assert.equal(frame.opcode, 0x81);
      assert.equal(frame.sequence, 1);
      assert.equal(frame.payload.readUInt32BE(0), acceptedBytes);
    }

    for (const testCase of [
      { acceptedBytes: 6 },
      { acceptedBytes: 0, requestPromptBytes: 0 },
      { acceptedBytes: 65_537, requestPromptBytes: 65_537 },
      {
        acceptedBytes: 0xffffffff,
        requestPromptBytes: 0xffffffff,
      },
      { acceptedBytes: 6, requestPromptBytes: 5 },
    ]) {
      assert.deepEqual(
        await probeHelperWriteOkEncoder(testCase),
        { status: "rejected" },
      );
    }
  },
);

greenTest(
  "rejects malformed ASP1 header and payload before terminal access",
  async () => {
    const bindingTag = Buffer.alloc(32, 0x73);
    const cases = [];
    const badMagic = encodeFrame({
      opcode: 0x01,
      sequence: 7,
      payload: Buffer.from("status\r"),
      bindingTag,
    });
    badMagic[0] ^= 0xff;
    cases.push(badMagic);
    const badReserved = encodeFrame({
      opcode: 0x01,
      sequence: 7,
      payload: Buffer.from("status\r"),
      bindingTag,
    });
    badReserved[7] = 1;
    cases.push(badReserved);
    cases.push(encodeFrame({
      opcode: 0x01,
      sequence: 7,
      payload: Buffer.from("status"),
      bindingTag,
    }));
    cases.push(encodeFrame({
      opcode: 0x01,
      sequence: 7,
      payload: Buffer.from([0xff, 0x0d]),
      bindingTag,
    }));

    for (const frame of cases) {
      const disposition = await probeHelper(frame, bindingTag, 7);
      assert.equal(disposition.status, "error");
      assert.equal(disposition.sequence, 7);
      assert.equal(disposition.revoke, true);
      assert.equal(disposition.opcode, null);
      assert.equal(disposition.payload, null);
      const response = inspectFrame(
        Buffer.from(disposition.response, "hex"),
      );
      assert.equal(response.opcode, 0xff);
      assert.deepEqual(
        response.payload,
        Buffer.from([0x00, 0x01, 0x02, 0x00]),
      );
    }
  },
);

greenTest(
  "rejects unknown ASP1 request opcode before terminal access",
  async () => {
    const bindingTag = Buffer.alloc(32, 0x73);
    const frame = encodeFrame({
      opcode: 0x03,
      sequence: 1,
      bindingTag,
    });
    const disposition = await probeHelper(frame, bindingTag, 1);
    assert.equal(disposition.status, "error");
    assert.equal(disposition.revoke, true);
    assert.equal(disposition.opcode, null);
    assert.deepEqual(
      inspectFrame(Buffer.from(disposition.response, "hex")).payload,
      Buffer.from([0x00, 0x01, 0x02, 0x00]),
    );
  },
);

greenTest(
  "rejects an ASP1 binding-tag mismatch in constant time",
  async () => {
    const bindingTag = Buffer.alloc(32, 0x73);
    const changedTag = Buffer.from(bindingTag);
    changedTag[31] ^= 0xff;
    const frame = encodeFrame({
      opcode: 0x01,
      sequence: 1,
      payload: Buffer.from("status\r"),
      bindingTag: changedTag,
    });
    const disposition = await probeHelper(frame, bindingTag, 1);
    assert.equal(disposition.status, "error");
    assert.equal(disposition.revoke, true);
    assert.equal(disposition.opcode, null);
    assert.deepEqual(
      inspectFrame(Buffer.from(disposition.response, "hex")).payload,
      Buffer.from([0x00, 0x03, 0x03, 0x00]),
    );

    const invalidExpectedTag = await probeHelper(
      frame,
      bindingTag.subarray(0, 31),
      1,
    );
    assert.equal(invalidExpectedTag.status, "close");
    assert.equal(invalidExpectedTag.response, null);
    assert.equal(invalidExpectedTag.revoke, true);
  },
);

greenTest(
  "rejects duplicate ASP1 request sequence and revokes",
  async () => {
    const bindingTag = Buffer.alloc(32, 0x73);
    const frame = encodeFrame({
      opcode: 0x02,
      sequence: 1,
      bindingTag,
    });
    const disposition = await probeHelper(frame, bindingTag, 2);
    assert.equal(disposition.status, "error");
    assert.equal(disposition.revoke, true);
    assert.equal(disposition.opcode, null);
    assert.deepEqual(
      inspectFrame(Buffer.from(disposition.response, "hex")).payload,
      Buffer.from([0x00, 0x03, 0x03, 0x00]),
    );
  },
);

greenTest(
  "rejects out-of-order ASP1 request sequence and revokes",
  async () => {
    const bindingTag = Buffer.alloc(32, 0x73);
    const frame = encodeFrame({
      opcode: 0x02,
      sequence: 3,
      bindingTag,
    });
    const disposition = await probeHelper(frame, bindingTag, 2);
    assert.equal(disposition.status, "error");
    assert.equal(disposition.revoke, true);
    assert.equal(disposition.opcode, null);
    assert.deepEqual(
      inspectFrame(Buffer.from(disposition.response, "hex")).payload,
      Buffer.from([0x00, 0x03, 0x03, 0x00]),
    );
  },
);

greenTest(
  "maps an incomplete ASP1 request by closing without a guessed response",
  async () => {
    const bindingTag = Buffer.alloc(32, 0x73);
    for (const frame of [
      Buffer.from("ASP1"),
      encodeFrame({
        opcode: 0x01,
        sequence: 1,
        payload: Buffer.from("status\r"),
        bindingTag,
      }).subarray(0, -1),
    ]) {
      const disposition = await probeHelper(frame, bindingTag, 1);
      assert.equal(disposition.status, "close");
      assert.equal(disposition.response, null);
      assert.equal(disposition.revoke, true);
      assert.equal(disposition.opcode, null);
    }
  },
);
