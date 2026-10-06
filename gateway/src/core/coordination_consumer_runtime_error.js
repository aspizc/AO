export class CoordinationConsumerRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CoordinationConsumerRuntimeError";
    this.code = code;
  }
}

export function coordinationConsumerRuntimeError(code, message) {
  return new CoordinationConsumerRuntimeError(code, message);
}
