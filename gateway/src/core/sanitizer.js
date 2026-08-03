import fs from "node:fs";

let rules = null;

export function configureSanitizer({ rulesPath }) {
  if (!rulesPath) throw new TypeError("rulesPath required");
  const parsed = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
  rules = parsed.rules;
}

function assertConfigured() {
  if (!rules) throw new Error("sanitizer not configured");
}

export function sanitize(content, { kind }) {
  assertConfigured();
  let sanitized = String(content);
  const appliedRuleIds = [];

  for (const rule of rules) {
    if (!Array.isArray(rule.appliesTo) || !rule.appliesTo.includes(kind)) continue;

    const re = new RegExp(rule.pattern, "g");
    const next = sanitized.replace(re, rule.replacement);
    if (next !== sanitized) {
      sanitized = next;
      appliedRuleIds.push(rule.id);
    }
  }

  return { sanitized, appliedRuleIds };
}
