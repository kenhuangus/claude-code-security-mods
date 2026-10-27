import { TALLY_KEY, turnTotal, addTurn, addTool, formatTally, emptyTally } from "./policy.js";

export function register(on, options) {
  on("turn.complete", async ($, e, next) => {
    const total = turnTotal(e.usage);
    try {
      const tally = await $.store.get(TALLY_KEY);
      const nextTally = e.usage ? addTurn(tally, e.usage) : tally || emptyTally();
      await $.store.set(TALLY_KEY, nextTally);
      return { text: "Token tally: this turn=" + total + ", session total=" + (nextTally.total || 0) + "." };
    } catch (error) {
      return { text: "Token tally: this turn=" + total + ". (Store update failed.)" };
    }
  }).catch(async ($, e, next) => {
    return { text: "Token tally unavailable." };
  });

  on("tool.call", async ($, e, next) => {
    const result = await next(e);
    try {
      const tally = await $.store.get(TALLY_KEY);
      await $.store.set(TALLY_KEY, addTool(tally));
    } catch (error) {
      // Tool counting must never change the tool result.
    }
    return result;
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Token tally unavailable: refusing this call." };
    }
    return next(e);
  });

  on("command.run", { command: "token-tally" }, async ($, e, next) => {
    const tally = await $.store.get(TALLY_KEY);
    return { text: formatTally(tally) };
  }).catch(async ($, e, next) => {
    return { text: "Token tally unavailable." };
  });
}
