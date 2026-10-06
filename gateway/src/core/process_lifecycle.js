function assertEmitter(value, label) {
  if (
    !value
    || typeof value.once !== "function"
    || typeof value.off !== "function"
  ) {
    throw new TypeError(`${label} must support once and off`);
  }
  return value;
}

export function createProcessTermination({
  input,
  signals,
} = {}) {
  const inputEmitter = assertEmitter(input, "input");
  const signalEmitter = assertEmitter(signals, "signals");
  let settled = false;
  let resolveWait;
  const wait = new Promise((resolve) => {
    resolveWait = resolve;
  });

  const onEnd = () => settle({ reason: "stdin-end" });
  const onInterrupt = () => settle({
    reason: "signal",
    signal: "SIGINT",
  });
  const onTerminate = () => settle({
    reason: "signal",
    signal: "SIGTERM",
  });

  function dispose() {
    inputEmitter.off("end", onEnd);
    signalEmitter.off("SIGINT", onInterrupt);
    signalEmitter.off("SIGTERM", onTerminate);
  }

  function settle(result) {
    if (settled) return;
    settled = true;
    dispose();
    resolveWait(Object.freeze(result));
  }

  inputEmitter.once("end", onEnd);
  signalEmitter.once("SIGINT", onInterrupt);
  signalEmitter.once("SIGTERM", onTerminate);

  return Object.freeze({ wait, dispose });
}
