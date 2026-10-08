import { z } from "zod";
import { settleRequestLaunch } from "../adapters/request_launch_cleanup.js";
import { appendLocalOnly } from "../core/audit.js";

import {
  ACTION_CATALOG_VERSION,
} from "../core/policy_types.js";
import {
  applyEffectiveRequestContext,
  bindRequestContext,
  isRequestContextProtectedAction,
  recordRequestContextResult,
  requestContextDenialMetadata,
} from "../core/request_context.js";
import {
  getCatalogPayloadErrorMode,
  getCatalogValidationErrorMode,
  getToolContract,
  mapCatalogValidationError,
  validateCatalogInput,
} from "./catalog.js";
import { zodToJsonSchema } from "./schema_projection.js";
import {
  legacyValidationErrorBody,
  safeMappedValidationError,
  safeToolErrorBody,
  safeValidationIssues,
  textToolResult,
  validationErrorBody,
} from "./tool_errors.js";

export class ToolValidationError extends Error {
  constructor(issues) {
    super("invalid input");
    this.name = "ToolValidationError";
    this.issues = issues;
  }
}

function syntheticContract({
  name,
  description,
  schema,
  allowedErrorCodes = [],
  errorMessages = {},
  validationError,
}) {
  if (!name || !description || !schema) {
    throw new TypeError("synthetic tools require name, description, and schema");
  }
  return {
    publicEntry: {
      name,
      description,
      inputSchema: zodToJsonSchema(schema),
      publicErrorCodes: [
        ...new Set([
          "INVALID_INPUT",
          "TOOL_ERROR",
          ...(isRequestContextProtectedAction(name)
            ? ["REQUEST_CONTEXT_DENIED"]
            : []),
          ...allowedErrorCodes,
        ]),
      ],
      errorMessages: { ...errorMessages },
    },
    schema,
    validationError,
    payloadErrorsAreMcpErrors: true,
  };
}

function resultIsDomainError(value) {
  return (
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof value.error === "string"
    && value.error.length > 0
  );
}

export function defineTool({
  name,
  description,
  schema,
  handler,
  validationError,
  validationContext,
  allowedErrorCodes,
  errorMessages,
}) {
  const catalogContract = getToolContract(name);
  const runtime =
    catalogContract
      ? null
      : syntheticContract({
        name,
        description,
        schema,
        allowedErrorCodes,
        errorMessages,
        validationError,
      });
  const contract = catalogContract || runtime.publicEntry;
  const payloadErrorMode = catalogContract
    ? getCatalogPayloadErrorMode(name)
    : "mcp-error";
  const validationErrorMode = catalogContract
    ? getCatalogValidationErrorMode(name)
    : "safe-envelope";
  const requestContextBoundary = isRequestContextProtectedAction(name);

  return {
    name: contract.name,
    description: contract.description,
    inputSchema: contract.inputSchema,
    contract,
    actionCatalogVersion: ACTION_CATALOG_VERSION,
    requestContextBoundary,
    async handler(args, invocation) {
      const parsed = catalogContract
        ? validateCatalogInput(name, args)
        : runtime.schema.safeParse(args);
      if (!parsed.success) {
        if (validationErrorMode === "legacy-envelope") {
          return textToolResult(
            legacyValidationErrorBody(parsed.error.issues),
            true,
          );
        }
        const issues = safeValidationIssues(
          parsed.error.issues,
          contract.inputSchema,
        );
        const mapped = catalogContract
          ? mapCatalogValidationError(
              name,
              issues,
              validationContext,
              validationError,
            )
          : (
              typeof runtime.validationError === "function"
                ? runtime.validationError(issues, validationContext)
                : undefined
            );
        return textToolResult(
          mapped
            ? safeMappedValidationError(mapped, contract)
            : validationErrorBody(parsed.error.issues, contract.inputSchema),
          true,
        );
      }

      let value;
      try {
        let effectiveContext = null;
        let effectiveArgs = parsed.data;
        if (requestContextBoundary && invocation !== undefined) {
          effectiveContext = bindRequestContext(invocation?.requestContext, {
            action: name,
            actionCatalogVersion: invocation?.actionCatalogVersion,
            audience: invocation?.audience,
            connectionId: invocation?.connectionId,
            assertedCapabilities: invocation?.assertedCapabilities,
            args: parsed.data,
            now: invocation?.now,
          });
          effectiveArgs = applyEffectiveRequestContext(
            parsed.data,
            effectiveContext,
          );
        }
        value = await handler(effectiveArgs, effectiveContext);
        if (resultIsDomainError(value)) {
          await settleRequestLaunch(value, false);
          const safeBody = safeToolErrorBody(
            {
              code: value.error,
              message: value.message,
              decision: value.decision,
            },
            contract,
          );
          if (payloadErrorMode === "legacy-envelope") {
            return textToolResult({ error: safeBody.error });
          }
          return textToolResult(safeBody, true);
        }
        if (effectiveContext) {
          recordRequestContextResult(
            invocation.requestContext,
            effectiveContext,
            value,
          );
        }
        await settleRequestLaunch(value, true);
        return textToolResult(value);
      } catch (error) {
        try { await settleRequestLaunch(value, false); }
        catch (cleanupError) {
          try { appendLocalOnly({ type: "ERROR", where: "tool.launch.cleanup", tool: name,
            error: cleanupError?.code === "ADAPTER_CLEANUP_FAILED" ? "ADAPTER_CLEANUP_FAILED" : "CLEANUP_FAILED" }); }
          catch { /* Private audit failure cannot replace the original denial. */ }
        }
        if (error?.code === "REQUEST_CONTEXT_DENIED" && typeof invocation?.denialObserver === "function") {
          try {
            invocation.denialObserver(requestContextDenialMetadata(invocation.requestContext, {
              tool: name, reasonCode: error.reasonCode, args: parsed.data, now: invocation.now,
            }));
          } catch { /* A private observer cannot affect the fixed public denial. */ }
        }
        return textToolResult(safeToolErrorBody(error, contract), true);
      }
    },
  };
}

export function bindCatalogTool(name, handler, { validationContext } = {}) {
  if (!getToolContract(name)) {
    throw new TypeError(`cannot bind unknown catalog tool: ${String(name)}`);
  }
  return defineTool({ name, handler, validationContext });
}

export { z };
