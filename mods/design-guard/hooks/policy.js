export const DESIGN_RULES_TEXT = [
  "Architecture rules for this session:",
  "- Keep orchestrator and execution boundaries separate: the planner decides, the executor runs only the approved step.",
  "- Keep secrets out of prompts and tool arguments.",
  "- Do not bypass a guard, permission prompt, or audit step to save time.",
  "- Prefer the smallest change that satisfies the request, and record what changed.",
].join("\n");

export function shouldDropPrompt(text) {
  if (typeof text !== "string") {
    return false;
  }
  const forward = /\b(ignore|bypass|disregard|override|skip)\b[^.]{0,100}\b(security|guardrail|design)\s+rules?\b/i;
  const reverse = /\b(security|guardrail|design)\s+rules?\b[^.]{0,100}\b(ignore|bypass|disregard|override|skip)\b/i;
  return forward.test(text) || reverse.test(text);
}

export function appendContext(context, rulesText) {
  const base = Array.isArray(context) ? context : [];
  return [...base, rulesText];
}
