// Deterministic model of the pinned buffer-consuming grid/PID/geometry guard.
export function promptTransportFixture({ current, onInput = () => {}, guardResult = null, version = "3.6a-agents.4" }) {
  const buffers = new Map();
  const calls = [];
  const run = (args, options = {}) => {
    calls.push(args);
    const pane = current();
    const output = (stdout) => ({ status: 0, stdout: options.encoding === null ? Buffer.from(stdout) : stdout, stderr: "" });
    if (args[0] === "display-message" && args.at(-1) === "#{version}") return output(version + "\n");
    if (args[0] === "list-commands") return output("agents-submit-v1 -b buffer -t target\n");
    if (args[0] === "display-message" && args.at(-1).includes("#{pane_width}")) return output(`${pane.serverPid}|${pane.target}|${pane.panePid}|${pane.width ?? "120"}|${pane.height ?? "40"}|${pane.cursorX ?? "0"}|${pane.cursorY ?? "10"}\n`);
    if (args[0] === "display-message") return output(`${pane.serverPid}|${pane.target}|${pane.panePid}|0|0|0\n`);
    if (args[0] === "capture-pane") {
      if (args.includes("-b")) { buffers.set(args[args.indexOf("-b") + 1], Buffer.from(pane.snapshot)); return output(""); }
      return output(pane.snapshot);
    }
    if (args[0] === "save-buffer") return { status: 0, stdout: buffers.get(args[2]), stderr: "" };
    if (args[0] === "delete-buffer") return buffers.delete(args[2]) ? output("") : { status: 1, stderr: `unknown buffer: ${args[2]}\n` };
    if (args[0] === "agents-submit-v1") {
      const evidence = buffers.get(args[2]);
      buffers.delete(args[2]);
      if (guardResult) return guardResult();
      const value = (flag) => args[args.indexOf(flag) + 1];
      const width = String(pane.width ?? "120"), height = String(pane.height ?? "40");
      const x = String(pane.cursorX ?? "0"), y = String(pane.cursorY ?? "10");
      if (value("-r") !== pane.serverPid || value("-p") !== pane.panePid || value("-t") !== pane.target
        || value("-x") !== width || value("-y") !== height || value("-c") !== x || value("-l") !== y
        || Number(x) > Number(width) || Number(y) >= Number(height)
        || !evidence?.equals(Buffer.from(pane.snapshot))) return { status: 1, stderr: "agents: guarded submit refused\n" };
      onInput("\r", args); return output("");
    }
    if (args[0] === "send-keys") { onInput(args.at(-1), args); return output(""); }
    throw new Error(`unexpected prompt transport operation ${args[0]}`);
  };
  return { run, buffers, calls };
}
