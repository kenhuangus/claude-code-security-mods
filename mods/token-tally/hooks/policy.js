export const TALLY_KEY = "token-tally:tally";

export function emptyTally() {
  return { turns: 0, tools: 0, input: 0, output: 0, cache: 0, total: 0 };
}

export function turnTotal(usage) {
  if (!usage || typeof usage !== "object") {
    return 0;
  }
  const input = typeof usage.input_tokens === "number" ? usage.input_tokens : typeof usage.input === "number" ? usage.input : 0;
  const output = typeof usage.output_tokens === "number" ? usage.output_tokens : typeof usage.output === "number" ? usage.output : 0;
  const cacheRead = typeof usage.cache_read_input_tokens === "number" ? usage.cache_read_input_tokens : 0;
  const cacheCreate = typeof usage.cache_creation_input_tokens === "number" ? usage.cache_creation_input_tokens : 0;
  const cache = typeof usage.cache === "number" ? usage.cache : cacheRead + cacheCreate;
  return input + output + cache;
}

export function addTurn(tally, usage) {
  const base = tally && typeof tally === "object" ? tally : emptyTally();
  const input = typeof usage.input_tokens === "number" ? usage.input_tokens : typeof usage.input === "number" ? usage.input : 0;
  const output = typeof usage.output_tokens === "number" ? usage.output_tokens : typeof usage.output === "number" ? usage.output : 0;
  const cacheRead = typeof usage.cache_read_input_tokens === "number" ? usage.cache_read_input_tokens : 0;
  const cacheCreate = typeof usage.cache_creation_input_tokens === "number" ? usage.cache_creation_input_tokens : 0;
  const cache = typeof usage.cache === "number" ? usage.cache : cacheRead + cacheCreate;
  const total = turnTotal(usage);
  return {
    turns: (base.turns || 0) + 1,
    tools: base.tools || 0,
    input: (base.input || 0) + input,
    output: (base.output || 0) + output,
    cache: (base.cache || 0) + cache,
    total: (base.total || 0) + total,
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
