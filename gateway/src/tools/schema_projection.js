export class UnsupportedZodSchemaError extends TypeError {
  constructor(path, reason) {
    super(`unsupported Zod schema at ${path}: ${reason}`);
    this.name = "UnsupportedZodSchemaError";
    this.path = path;
  }
}

const LEGACY_STRIP_OBJECTS = new WeakSet();
const PROJECTABLE_REFINEMENTS = new WeakMap();

function unsupported(path, reason) {
  throw new UnsupportedZodSchemaError(path, reason);
}

function typeName(schema, path) {
  const value = schema?._def?.typeName;
  if (typeof value !== "string" || value.length === 0) {
    unsupported(path, "missing typeName");
  }
  return value;
}

function projectString(schema, path) {
  if (schema._def.coerce) unsupported(path, "coercing strings are not representable");
  const output = { type: "string" };
  const patterns = [];
  for (const check of schema._def.checks || []) {
    if (check.kind === "min") {
      output.minLength = Math.max(output.minLength ?? 0, check.value);
    } else if (check.kind === "max") {
      output.maxLength = Math.min(output.maxLength ?? Infinity, check.value);
    } else if (check.kind === "length") {
      output.minLength = Math.max(output.minLength ?? 0, check.value);
      output.maxLength = Math.min(output.maxLength ?? Infinity, check.value);
    } else if (check.kind === "regex") {
      if (!(check.regex instanceof RegExp) || check.regex.flags !== "") {
        unsupported(path, "regular expressions with flags are not representable");
      }
      patterns.push(check.regex.source);
    } else {
      unsupported(path, `unsupported string check ${String(check.kind)}`);
    }
  }
  if (patterns.length === 1) {
    [output.pattern] = patterns;
  } else if (patterns.length > 1) {
    output.allOf = patterns.map((pattern) => ({ pattern }));
  }
  return output;
}

function strongerLowerBound(current, check) {
  const candidate = {
    value: check.value,
    exclusive: check.inclusive === false,
  };
  if (!current || candidate.value > current.value) return candidate;
  if (candidate.value < current.value) return current;
  return {
    value: current.value,
    exclusive: current.exclusive || candidate.exclusive,
  };
}

function strongerUpperBound(current, check) {
  const candidate = {
    value: check.value,
    exclusive: check.inclusive === false,
  };
  if (!current || candidate.value < current.value) return candidate;
  if (candidate.value > current.value) return current;
  return {
    value: current.value,
    exclusive: current.exclusive || candidate.exclusive,
  };
}

function projectNumber(schema, path) {
  if (schema._def.coerce) unsupported(path, "coercing numbers are not representable");
  const checks = schema._def.checks || [];
  if (!checks.some(({ kind }) => kind === "finite")) {
    unsupported(path, "numbers require an explicit finite check");
  }
  const output = {
    type: checks.some(({ kind }) => kind === "int") ? "integer" : "number",
  };
  let lowerBound;
  let upperBound;
  const multiples = [];

  for (const check of checks) {
    if (check.kind === "int" || check.kind === "finite") continue;
    if (check.kind === "min") {
      lowerBound = strongerLowerBound(lowerBound, check);
    } else if (check.kind === "max") {
      upperBound = strongerUpperBound(upperBound, check);
    } else if (check.kind === "multipleOf") {
      if (!multiples.includes(check.value)) multiples.push(check.value);
    } else {
      unsupported(path, `unsupported number check ${String(check.kind)}`);
    }
  }
  if (lowerBound) {
    output[lowerBound.exclusive ? "exclusiveMinimum" : "minimum"] =
      lowerBound.value;
  }
  if (upperBound) {
    output[upperBound.exclusive ? "exclusiveMaximum" : "maximum"] =
      upperBound.value;
  }
  if (multiples.length === 1) {
    [output.multipleOf] = multiples;
  } else if (multiples.length > 1) {
    output.allOf = multiples.map((multipleOf) => ({ multipleOf }));
  }
  return output;
}

function projectArray(schema, path) {
  const output = {
    type: "array",
    items: project(schema._def.type, `${path}[]`),
  };
  if (schema._def.minLength) output.minItems = schema._def.minLength.value;
  if (schema._def.maxLength) output.maxItems = schema._def.maxLength.value;
  if (schema._def.exactLength) {
    output.minItems = schema._def.exactLength.value;
    output.maxItems = schema._def.exactLength.value;
  }
  return output;
}

function objectShape(schema, path) {
  const shape = schema._def.shape;
  const value = typeof shape === "function" ? shape() : shape;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    unsupported(path, "object shape is invalid");
  }
  return value;
}

function isOptional(schema) {
  return typeof schema?.isOptional === "function" && schema.isOptional();
}

function projectObject(schema, path) {
  const neverCatchall = schema._def.catchall?._def?.typeName === "ZodNever";
  const strict = schema._def.unknownKeys === "strict" && neverCatchall;
  const legacyStrip =
    schema._def.unknownKeys === "strip"
    && neverCatchall
    && LEGACY_STRIP_OBJECTS.has(schema);
  if (!strict && !legacyStrip) {
    unsupported(path, "object must use .strict(); use z.record() for maps");
  }

  const properties = {};
  const required = [];
  for (const [key, value] of Object.entries(objectShape(schema, path))) {
    properties[key] = project(value, `${path}.${key}`);
    if (!isOptional(value)) required.push(key);
  }
  return {
    type: "object",
    properties,
    required,
    additionalProperties: legacyStrip,
  };
}

function projectRecord(schema, path) {
  const keySchema = schema._def.keyType;
  const propertyNames = project(keySchema, `${path}{key}`);
  if (propertyNames.type !== "string") {
    unsupported(`${path}{key}`, "record keys must be strings");
  }
  delete propertyNames.type;
  const output = {
    type: "object",
    additionalProperties: project(schema._def.valueType, `${path}{value}`),
  };
  if (Object.keys(propertyNames).length > 0) {
    output.propertyNames = propertyNames;
  }
  return output;
}

function projectRefinement(schema, path) {
  const refinement = PROJECTABLE_REFINEMENTS.get(schema);
  if (!refinement) return undefined;
  const output = project(refinement.inner, path);
  if (refinement.kind === "unique-string-array") {
    if (output.type !== "array") {
      unsupported(path, "unique array refinement requires an array");
    }
    output.uniqueItems = true;
    return output;
  }
  if (refinement.kind === "bounded-record") {
    if (output.type !== "object" || Array.isArray(output)) {
      unsupported(path, "bounded record refinement requires an object");
    }
    output.maxProperties = refinement.maxProperties;
    return output;
  }
  if (refinement.kind === "unicode-string-length") {
    if (output.type !== "string") {
      unsupported(path, "Unicode length refinement requires a string");
    }
    const bounded = { type: "string" };
    if (refinement.minLength !== undefined) {
      bounded.minLength = refinement.minLength;
    }
    if (refinement.maxLength !== undefined) {
      bounded.maxLength = refinement.maxLength;
    }
    for (const [key, value] of Object.entries(output)) {
      if (key !== "type") bounded[key] = value;
    }
    return bounded;
  }
  return unsupported(path, `unknown projectable refinement ${refinement.kind}`);
}

function project(schema, path) {
  const refined = projectRefinement(schema, path);
  if (refined) return refined;
  const kind = typeName(schema, path);
  if (kind === "ZodOptional") return project(schema._def.innerType, path);
  if (kind === "ZodNullable") {
    return {
      anyOf: [project(schema._def.innerType, path), { type: "null" }],
    };
  }
  if (kind === "ZodString") return projectString(schema, path);
  if (kind === "ZodNumber") return projectNumber(schema, path);
  if (kind === "ZodBoolean") {
    if (schema._def.coerce) unsupported(path, "coercing booleans are not representable");
    return { type: "boolean" };
  }
  if (kind === "ZodEnum") {
    return { type: "string", enum: [...schema._def.values] };
  }
  if (kind === "ZodArray") return projectArray(schema, path);
  if (kind === "ZodObject") return projectObject(schema, path);
  if (kind === "ZodRecord") return projectRecord(schema, path);
  if (kind === "ZodUnion") {
    return {
      anyOf: schema._def.options.map((option, index) =>
        project(option, `${path}.anyOf[${index}]`)),
    };
  }
  if (kind === "ZodNull") return { type: "null" };
  if (kind === "ZodAny") return {};

  return unsupported(path, kind);
}

export function zodToJsonSchema(schema) {
  return project(schema, "$");
}

export function markLegacyStripObject(schema) {
  if (
    typeName(schema, "$legacyStrip") !== "ZodObject"
    || schema._def.unknownKeys !== "strip"
    || schema._def.catchall?._def?.typeName !== "ZodNever"
  ) {
    throw new TypeError("legacy strip projection requires a default Zod object");
  }
  LEGACY_STRIP_OBJECTS.add(schema);
  return schema;
}

export function uniqueStringArray(schema) {
  const itemProjection =
    typeName(schema, "$uniqueArray") === "ZodArray"
      ? project(schema._def.type, "$uniqueArray[]")
      : undefined;
  if (
    typeName(schema, "$uniqueArray") !== "ZodArray"
    || itemProjection?.type !== "string"
  ) {
    throw new TypeError("unique array projection requires a Zod string array");
  }
  const refined = schema.superRefine((value, context) => {
    if (new Set(value).size !== value.length) {
      context.addIssue({
        code: "custom",
        message: "array items must be unique",
      });
    }
  });
  PROJECTABLE_REFINEMENTS.set(refined, {
    kind: "unique-string-array",
    inner: schema,
  });
  return refined;
}

export function unicodeStringLength(
  schema,
  { minLength, maxLength } = {},
) {
  if (typeName(schema, "$unicodeString") !== "ZodString") {
    throw new TypeError("Unicode length projection requires a Zod string");
  }
  if (
    (schema._def.checks || [])
      .some(({ kind }) => ["min", "max", "length"].includes(kind))
  ) {
    throw new TypeError(
      "Unicode length projection cannot wrap native Zod length checks",
    );
  }
  for (const [name, value] of Object.entries({ minLength, maxLength })) {
    if (
      value !== undefined
      && (!Number.isSafeInteger(value) || value < 0)
    ) {
      throw new TypeError(`${name} must be a non-negative safe integer`);
    }
  }
  if (minLength === undefined && maxLength === undefined) {
    throw new TypeError("Unicode length projection requires at least one bound");
  }
  if (
    minLength !== undefined
    && maxLength !== undefined
    && minLength > maxLength
  ) {
    throw new TypeError("Unicode minimum cannot exceed maximum");
  }

  const refined = schema.superRefine((value, context) => {
    const length = Array.from(value).length;
    if (minLength !== undefined && length < minLength) {
      context.addIssue({
        code: "too_small",
        minimum: minLength,
        type: "string",
        inclusive: true,
        exact: false,
        message: `String must contain at least ${minLength} character(s)`,
      });
    }
    if (maxLength !== undefined && length > maxLength) {
      context.addIssue({
        code: "too_big",
        maximum: maxLength,
        type: "string",
        inclusive: true,
        exact: false,
        message: `String must contain at most ${maxLength} character(s)`,
      });
    }
  });
  PROJECTABLE_REFINEMENTS.set(refined, {
    kind: "unicode-string-length",
    inner: schema,
    minLength,
    maxLength,
  });
  return refined;
}

export function boundedRecord(schema, { maxProperties }) {
  if (
    typeName(schema, "$boundedRecord") !== "ZodRecord"
    || !Number.isSafeInteger(maxProperties)
    || maxProperties < 0
  ) {
    throw new TypeError(
      "bounded record projection requires a Zod record and non-negative safe maximum",
    );
  }
  const refined = schema.superRefine((value, context) => {
    if (Object.keys(value).length > maxProperties) {
      context.addIssue({
        code: "custom",
        message: "record has too many properties",
      });
    }
  });
  PROJECTABLE_REFINEMENTS.set(refined, {
    kind: "bounded-record",
    inner: schema,
    maxProperties,
  });
  return refined;
}
