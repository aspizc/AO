import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as policy from "../../gateway/src/core/policy_engine.js";
import { loadRegistries } from "../../gateway/src/core/registry.js";
import { resolveEffectiveAgentSelection } from "../../gateway/src/core/orchestrator_profile.js";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import { CodexAdapter } from "../../gateway/src/adapters/codex_adapter.js";
import { ClaudeAdapter } from "../../gateway/src/adapters/claude_adapter.js";
import { PiAdapter } from "../../gateway/src/adapters/pi_adapter.js";
import { OpencodeAdapter } from "../../gateway/src/adapters/opencode_adapter.js";
import { AntigravityAdapter } from "../../gateway/src/adapters/antigravity_adapter.js";

export const base = loadRegistries({ policiesDir: path.resolve("policies") });
export const providers = { codex: CodexAdapter, "claude-code": ClaudeAdapter, pi: PiAdapter, opencode: OpencodeAdapter, antigravity: AntigravityAdapter };

// Synthetic profiles distinguish policy grants from role-name conventions.
export function registry({ writable = false, approval = false } = {}) {
  return {
    ...base,
    getAgent: (id) => ({ ...base.getAgent(id), allowedRoles: ["coder", "reviewer", "planner", "editor", "orchestrator"], requiresApprovalFor: approval ? ["code.write"] : [] }),
    getRole: () => ({ allowActions: ["code.write"], denyActions: writable ? [] : ["code.write"] }),
  };
}

export function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ao-cli-access-")));
  resetAudit();
  configureAudit({ auditLog: path.join(root, "audit.jsonl") });
  t.after(() => { resetAudit(); fs.rmSync(root, { recursive: true, force: true }); });
  return root;
}

test("base reviewer/planner/editor cannot write: independent seats must be confined", () => {
  for (const role of ["reviewer", "planner", "editor"]) {
    assert.equal(policy.resolveCliWriteAccess({ agent: "claude-code", role, repo: "agents-orchestrator" }, base), false);
  }
});

test("derivation ignores role names: synthetic reviewer can write and coder can be denied", () => {
  assert.equal(policy.resolveCliWriteAccess({ agent: "codex", role: "reviewer" }, registry({ writable: true })), true);
  assert.equal(policy.resolveCliWriteAccess({ agent: "codex", role: "coder" }, registry()), false);
});

test("require_approval and unknown repository do not grant unattended write access", () => {
  assert.equal(policy.resolveCliWriteAccess({ agent: "codex", role: "coder" }, registry({ writable: true, approval: true })), false);
  assert.equal(policy.resolveCliWriteAccess({ agent: "codex", role: "coder", repo: "unknown" }, registry({ writable: true })), false);
});

for (const [agent, Adapter] of Object.entries(providers)) {
  for (const writable of [false, true]) {
    test(`${agent} delegate and spawn follow policy, preserving writable reviewer semantics (${writable})`, async (t) => {
      const root = fixture(t);
      const argvFile = path.join(root, "argv.json");
      const bin = path.join(root, "fake-cli");
      fs.writeFileSync(bin, `#!/usr/bin/env node\nrequire("fs").writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));\n`, { mode: 0o755 });
      const key = { codex: "codexBin", "claude-code": "claudeBin", pi: "piBin", opencode: "opencodeBin", antigravity: "antigravityBin" }[agent];
      const config = { dryRun: false, repoRoots: [root], codexEnabled: true, codexSandbox: "workspace-write", [key]: bin, antigravityAuto: true, opencodeAuto: true };
      const subject = new Adapter({ config, registries: registry({ writable }) });
      const args = { cwd: root, prompt: "inspect", role: "reviewer", traceId: `tr-access-${agent}-${writable}` };
      if (agent === "antigravity" && !writable) {
        for (const operation of ["delegate", "spawn"]) await assert.rejects(() => subject[operation](args), (err) => err.code === "POLICY_DENIED");
        assert.equal(fs.existsSync(argvFile), false, "unverified plan mode must never launch a child");
        assert.equal((await query({ traceId: args.traceId, type: "SESSION_STARTED" })).length, 0);
        return;
      }
      const result = await subject.delegate(args);
      assert.equal(result.writeAccess, writable);
      const argv = JSON.parse(fs.readFileSync(argvFile, "utf8"));
      config.dryRun = true;
      const spawned = await subject.spawn(args);
      assert.equal(spawned.writeAccess, writable);
      const launch = spawned.launchCommand.split(" ");
      for (const flags of [argv, launch]) {
        if (agent === "codex") assert.equal(flags[flags.indexOf("-s") + 1], writable ? "workspace-write" : "read-only");
        if (agent === "claude-code") {
          assert.equal(flags.includes("--disallowedTools"), !writable);
          if (!writable) assert.deepEqual(flags.slice(flags.indexOf("--disallowedTools") + 1, flags.indexOf("--disallowedTools") + 4), ["Edit", "Write", "NotebookEdit"]);
          assert.equal(flags.includes("plan"), false, "Claude task semantics must stay unchanged");
        }
        if (agent === "pi") assert.equal(flags.includes("read,grep,find,ls"), !writable);
        if (agent === "opencode") {
          assert.equal(flags.includes("--auto"), writable);
          assert.equal(flags.includes("plan"), !writable);
        }
        if (agent === "antigravity") assert.equal(flags.includes("--dangerously-skip-permissions"), true);
      }
      if (agent === "claude-code") assert.equal(argv[argv.indexOf("--permission-mode") + 1], "dontAsk");
      if (agent === "codex") assert.equal(result.sandbox, writable ? "workspace-write" : "read-only");
      const events = await query({ traceId: args.traceId, type: "SESSION_STARTED" });
      assert.equal(events.length, 2);
      assert.ok(events.every((event) => event.writeAccess === writable));
    });
  }
}

test("Codex read-only ceiling holds even when policy allows writing", async (t) => {
  const root = fixture(t);
  const subject = new CodexAdapter({ config: { dryRun: true, codexEnabled: true, codexSandbox: "read-only", repoRoots: [root] }, registries: registry({ writable: true }) });
  const args = { cwd: root, role: "coder", traceId: "tr-ceiling", prompt: "inspect" };
  assert.equal((await subject.delegate(args)).sandbox, "read-only");
  assert.match((await subject.spawn(args)).launchCommand, /-s read-only/);
});

const kya = loadRegistries({ policiesDir: path.resolve("policies/profiles/kya") });

function expectedProfileCommands(agent, selection, { bin, root, writable }) {
  const { model, reasoningEffort, serviceTier } = selection;
  switch (agent) {
    case "codex": {
      const common = ["-m", model, "-c", `model_reasoning_effort="${reasoningEffort}"`, "-c", `service_tier="${serviceTier}"`, "-s", writable ? "workspace-write" : "read-only", "-C", root];
      return { argv: ["exec", ...common, "inspect"], launch: [bin, ...common].join(" ") };
    }
    case "claude-code": {
      const common = ["--model", model, "--effort", reasoningEffort, ...(!writable ? ["--disallowedTools", "Edit", "Write", "NotebookEdit"] : [])];
      return { argv: ["--print", "--output-format", "json", "--permission-mode", "dontAsk", "--no-session-persistence", ...common, "inspect"], launch: [bin, ...common].join(" ") };
    }
    case "pi": {
      const common = ["--model", model, "--thinking", reasoningEffort];
      const restrictions = writable ? [] : ["--tools", "read,grep,find,ls"];
      return { argv: [...common, "--print", "--mode", "json", ...restrictions, "inspect"], launch: [bin, ...common, ...restrictions].join(" ") };
    }
    case "opencode": {
      const permissions = writable ? ["--auto"] : ["--agent", "plan"];
      return { argv: ["run", "-m", model, "--format", "json", ...permissions, "inspect"], launch: [bin, "-m", model, ...permissions].join(" ") };
    }
    case "antigravity":
      return { argv: ["--print", "--output-format", "json", "--dangerously-skip-permissions", "--model", model, "--effort", reasoningEffort, "inspect"], launch: [bin, "--dangerously-skip-permissions", "--model", model, "--effort", reasoningEffort].join(" ") };
    default:
      throw new Error(`unexpected provider ${agent}`);
  }
}

for (const [profileName, registries, roles] of [["base", base, ["reviewer", "editor", "planner", "coder"]], ["kya", kya, ["reviewer"]]]) {
  for (const [agent, Adapter] of Object.entries(providers)) {
    for (const role of roles) {
      // The real Kya reviewer is writable: the grant follows policy, not the role string.
      test(`profile policy ${profileName} ${agent} ${role} confines independent seats and preserves writers`, async (t) => {
        const root = fixture(t);
        const argvFile = path.join(root, "profile-argv.json");
        const bin = path.join(root, "fake-profile-cli");
        fs.writeFileSync(bin, `#!/usr/bin/env node\nrequire("fs").writeFileSync(${JSON.stringify(argvFile)}, JSON.stringify(process.argv.slice(2)));\n`, { mode: 0o755 });
        const key = { codex: "codexBin", "claude-code": "claudeBin", pi: "piBin", opencode: "opencodeBin", antigravity: "antigravityBin" }[agent];
        const config = { dryRun: false, repoRoots: [root], codexSandbox: "workspace-write", [key]: bin, antigravityAuto: true, opencodeAuto: true };
        const subject = new Adapter({ config, registries });
        // No registry overrides and no repo: the temp cwd cannot expose policies/.
        const args = { cwd: root, prompt: "inspect", role, traceId: `tr-profile-${profileName}-${agent}-${role}` };
        const writable = profileName === "kya" || role === "coder";
        assert.equal(policy.resolveCliWriteAccess({ agent, role }, registries), writable);
        if (agent === "antigravity" && !writable) {
          await assert.rejects(() => subject.delegate(args), (err) => err.code === "POLICY_DENIED" && err.decision.ruleId === "role.deny_action");
        } else {
          const expected = expectedProfileCommands(agent, resolveEffectiveAgentSelection({ agent }), { bin, root, writable });
          const delegated = await subject.delegate(args);
          assert.equal(delegated.writeAccess, writable);
          assert.deepEqual(JSON.parse(fs.readFileSync(argvFile, "utf8")), expected.argv, "policy must restrict the actual child argv, not only report a boolean");
          config.dryRun = true;
          if (role !== "planner") {
            const spawned = await subject.spawn(args);
            assert.equal(spawned.writeAccess, writable);
            assert.equal(spawned.launchCommand, expected.launch, "writer commands must remain unchanged and non-writers must carry restrictions");
          }
        }
        if (role === "planner" || (agent === "antigravity" && !writable)) {
          await assert.rejects(() => subject.spawn(args), (err) => err.code === "POLICY_DENIED" && err.decision.ruleId === "role.deny_action");
        }
        if (agent === "antigravity" && !writable) {
          assert.equal(fs.existsSync(argvFile), false, "a refused seat must never launch a child");
          assert.equal((await query({ traceId: args.traceId, type: "SESSION_STARTED" })).length, 0);
        } else {
          const events = await query({ traceId: args.traceId, type: "SESSION_STARTED" });
          assert.equal(events.length, role === "planner" ? 1 : 2);
          assert.ok(events.every((event) => event.writeAccess === writable));
        }
      });
    }
  }
}
