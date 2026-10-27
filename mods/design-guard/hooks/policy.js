export const DESIGN_RULES_TEXT = [
  "Architecture rules for this session:",
  "- Keep orchestrator and execution boundaries separate: the planner decides, the executor runs only the approved step.",
  "- Keep secrets out of prompts and tool arguments.",
  "- Do not bypass a guard, permission prompt, or audit step to save time.",
  "- Prefer the smallest change that satisfies the request, and record what changed.",
].join("\n");

const VERB = "(?:ignore|bypass|disregard|override|skip|circumvent|disable)";
const FILLER = "(?:(?:all|any|every|the|your|these|those|my|our|this|that|of)\\s+)*";
const TARGET = "(?:security|guardrail|design)\\s+rules?";

// Only an instruction addressed to the assistant is dropped: the verb must start
// a sentence or line, or follow "please", "now", "just" or "you must/should/can/will".
// A question or an essay about how attackers bypass security rules is left alone.
const INSTRUCTION = new RegExp(
  "(?:^|[.!?;:]\\s+|\\b(?:please|now|just|you\\s+(?:must|should|can|will|may))\\s+)" + VERB + "\\s+" + FILLER + TARGET,
  "im",
);

export function shouldDropPrompt(text) {
  if (typeof text !== "string") {
    return false;
  }
  return INSTRUCTION.test(text);
}

export function appendContext(context, rulesText) {
  const base = Array.isArray(context) ? context : [];
  if (base.includes(rulesText)) {
    return base;
  }
  return [...base, rulesText];
}
