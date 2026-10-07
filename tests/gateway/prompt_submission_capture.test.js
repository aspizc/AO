import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { submitPrompt } from "../../gateway/src/adapters/base_adapter.js";
import { withOwnedTmuxServer } from "./fixtures/owned_tmux_server.js";

const tmux = process.env.A04_TEST_TMUX || "tmux";
const terminalFixture = fileURLToPath(new URL("./prompt_submission_terminal_fixture.py", import.meta.url));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("real captured drafts preserve leading/trailing spaces and blank multiline endings", async () => {
  const cases = ["white space  ", "  leading", "  both  ", "  ", "first\nsecond  ", "first\n\n", "\n  \n",
    "explain permission required", "Retry with a faster model?"].map((prompt) => ["codex", prompt]);
  cases.push(...["white space  ", "  leading", "  both  ", "  ", "Switch model?"].map((prompt) => ["claude-code", prompt]));
  for (const [provider, prompt] of cases) {
    await withOwnedTmuxServer(tmux, async ({ directory, run }) => {
      fs.writeFileSync(path.join(directory, "history"), "Permission required (historical output)");
        const create = run(["-f", "/dev/null", "new-session", "-d", "-s", "capture", "-x", "120", "-y", "40",
          "-P", "-F", "#{pane_id}", "--", "python3", terminalFixture, directory, provider]);
        assert.equal(create.status, 0, create.stderr);
        const target = create.stdout.trim();
        for (let i = 0; i < 100; i++) {
          const screen = run(["capture-pane", "-p", "-t", target]).stdout;
          if (screen.includes(provider === "codex" ? "Ask Codex" : 'Try "fixture example"')) break;
          await pause(10);
        }
        let enters = 0;
        const observed = (args, options) => {
          if (args[0] === "agents-submit-v1") enters++;
          return run(args, options);
        };
        await submitPrompt({ target, prompt, provider, run: observed,
          config: { tmuxSubmitDelayMs: 80, tmuxAskDelayMs: 80 } });
        assert.equal(enters, 1, "one final Enter after the exactly observed draft");
        assert.deepEqual(fs.readFileSync(path.join(directory, "received")),
          Buffer.from(`\x1b[200~${prompt}\x1b[201~\r`), "exact payload bytes and no intermediate submit");
    });
  }
});
