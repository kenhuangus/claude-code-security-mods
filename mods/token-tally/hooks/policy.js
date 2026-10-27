export const TALLY_KEY = "token-tally:tally";

export function emptyTally() {
  return { turns: 0, tools: 0, input: 0, output: 0, cache: 0, total: 0 };
}

// One tally per session. $.store is shared by every session on the machine, so a single
// key would add all sessions together and call the sum a session total.
export function tallyKey(sessionId) {
  if (typeof sessionId === "string" && sessionId !== "") {
    return TALLY_KEY + ":" + sessionId;
  }
  return TALLY_KEY;
}

function numberOr(value, fallback) {
  return typeof value === "number" ? value : fallback;
}

function partsOf(usage) {
  if (!usage || typeof usage !== "object") {
    return { input: 0, output: 0, cache: 0 };
  }
  const input = numberOr(usage.input_tokens, numberOr(usage.input, 0));
  const output = numberOr(usage.output_tokens, numberOr(usage.output, 0));
  const cacheRead = numberOr(usage.cache_read_input_tokens, 0);
  const cacheCreate = numberOr(usage.cache_creation_input_tokens, 0);
  const cache = numberOr(usage.cache, cacheRead + cacheCreate);
  return { input: input, output: output, cache: cache };
}

export function turnTotal(usage) {
  const parts = partsOf(usage);
  return parts.input + parts.output + parts.cache;
}

export function addTurn(tally, usage) {
  const base = tally && typeof tally === "object" ? tally : emptyTally();
  const parts = partsOf(usage);
  return {
    turns: (base.turns || 0) + 1,
    tools: base.tools || 0,
    input: (base.input || 0) + parts.input,
    output: (base.output || 0) + parts.output,
    cache: (base.cache || 0) + parts.cache,
    total: (base.total || 0) + parts.input + parts.output + parts.cache,
  };
}

export function addTool(tally) {
  const base = tally && typeof tally === "object" ? tally : emptyTally();
  return {
    turns: base.turns || 0,
    tools: (base.tools || 0) + 1,
    input: base.input || 0,
    output: base.output || 0,
    cache: base.cache || 0,
    total: base.total || 0,
  };
}

export function formatTally(tally) {
  const base = tally && typeof tally === "object" ? tally : emptyTally();
  return "Token tally: turns=" + (base.turns || 0) + ", tools=" + (base.tools || 0) + ", input=" + (base.input || 0) + ", output=" + (base.output || 0) + ", cache=" + (base.cache || 0) + ", total=" + (base.total || 0) + ".";
}

export function formatTurnLine(total, sessionTotal) {
  return "Token tally: this turn=" + total + ", session total=" + sessionTotal + ".";
}
