import { isCanonicalPolicyRuleId } from "../core/policy_rules.js";
import { safeSelectionRejection } from "../core/orchestrator_profile.js";

const SAFE_DECISIONS = new Set([
  "allow",
  "deny",
  "require_approval",
  "allow_with_sanitization",
]);
const SAFE_RULE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{0,199}$/;
const LEASE_MAX_MESSAGE = /^leaseTtlMs exceeds maximum ([1-9][0-9]{0,15})$/;
const LEASE_INTEGER_MESSAGE = "leaseTtlMs must be a positive safe integer";

function safeNumber(value) {
  return Number.isFinite(value) ? value : undefined;
}

function descendJsonSchema(schema, part) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { path: "*", schema: undefined };
  }
  if (Array.isArray(schema.anyOf)) {
    for (const option of schema.anyOf) {
      const descended = descendJsonSchema(option, part);
      if (descended.path !== "*") return descended;
    }
    return { path: "*", schema: undefined };
  }
  if (Number.isSafeInteger(part)) {
    return schema.type === "array"
      ? { path: part, schema: schema.items }
      : { path: "*", schema: undefined };
  }
  if (
    typeof part === "string"
    && schema.type === "object"
    && Object.hasOwn(schema.properties || {}, part)
  ) {
    return { path: part, schema: schema.properties[part] };
  }
  if (
    typeof part === "string"
    && schema.type === "object"
    && schema.additionalProperties
    && typeof schema.additionalProperties === "object"
  ) {
    return { path: "*", schema: schema.additionalProperties };
  }
  return { path: "*", schema: undefined };
}

function safeIssuePath(path, inputSchema) {
  if (!Array.isArray(path)) return "";
  let schema = inputSchema;
  const output = [];
  for (const part of path) {
    const descended = descendJsonSchema(schema, part);
    output.push(descended.path);
    schema = descended.schema;
  }
  return output.join(".");
}

export function safeValidationIssues(issues, inputSchema) {
  return (Array.isArray(issues) ? issues : []).map((issue) => {
    const safe = {
      path: safeIssuePath(issue?.path, inputSchema),
      code:
        typeof issue?.code === "string" && SAFE_RULE_ID.test(issue.code)
          ? issue.code
          : "invalid",
    };
    for (const field of ["minimum", "maximum"]) {
      const value = safeNumber(issue?.[field]);
      if (value !== undefined) safe[field] = value;
    }
    for (const field of ["inclusive", "exact"]) {
      if (typeof issue?.[field] === "boolean") safe[field] = issue[field];
    }
    return safe;
  });
}

export function validationErrorBody(issues, inputSchema) {
  return {
    error: "INVALID_INPUT",
    code: "INVALID_INPUT",
    message: "invalid input",
    issues: safeValidationIssues(issues, inputSchema),
  };
}

export function legacyValidationErrorBody(issues) {
  return {
    error: "INVALID_INPUT",
    issues: issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    })),
  };
}

function safePolicyDecision(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const output = {};
  if (SAFE_DECISIONS.has(value.decision)) output.decision = value.decision;
  if (isCanonicalPolicyRuleId(value.ruleId)) {
    output.ruleId = value.ruleId;
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

function dynamicCoordinationMessage(code, value) {
  if (code !== "COORDINATION_INVALID_INPUT" || typeof value !== "string") {
    return undefined;
  }
  if (value === LEASE_INTEGER_MESSAGE) return value;
  const leaseMaximum = LEASE_MAX_MESSAGE.exec(value);
  if (!leaseMaximum) return undefined;
  const maximum = Number(leaseMaximum[1]);
  if (!Number.isSafeInteger(maximum)) return undefined;
  return `leaseTtlMs exceeds maximum ${maximum}`;
}

export function safeToolErrorBody(error, contract = {}) {
  const allowed = new Set(contract.publicErrorCodes || ["INVALID_INPUT", "TOOL_ERROR"]);
  const candidate =
    typeof error?.code === "string" && SAFE_ERROR_CODE.test(error.code)
      ? error.code
      : "TOOL_ERROR";
  const code = allowed.has(candidate) ? candidate : "TOOL_ERROR";
  const configuredMessage = contract.errorMessages?.[code];
  const message =
    dynamicCoordinationMessage(code, error?.message)
    || (typeof configuredMessage === "string" ? configuredMessage : undefined)
    || (code === "INVALID_INPUT" ? "invalid input" : "tool operation failed");
  const body = { error: code, code, message };
  if (code === "POLICY_DENIED") {
    const decision = safePolicyDecision(error?.decision);
    if (decision) body.decision = decision;
    const selectionRejection = safeSelectionRejection(
      error?.decision?.selectionRejection,
    );
    if (selectionRejection) body.selectionRejection = selectionRejection;
  }
  return body;
}

export function safeMappedValidationError(mapped, contract = {}) {
  const candidate =
    mapped && typeof mapped === "object"
      ? { code: mapped.code || mapped.error, message: mapped.message }
      : {};
  return safeToolErrorBody(candidate, contract);
}

export function textToolResult(body, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
    ...(isError ? { isError: true } : {}),
  };
}
