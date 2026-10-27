import { tallyKey, turnTotal, addTurn, addTool, formatTally, formatTurnLine, emptyTally } from "./policy.js";

export function register(on, options) {
  // A slash command only reaches command.run when the module registers it on $ by a literal name.
  on("session.start", async ($, e, next) => {
    await $.command.register({ name: "token-tally", description: "Show the token and tool-call totals for this session" });
    return next(e);
  }).catch(async ($, e, next) => {
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    // Run the rest of the chain first so other plugins and the engine still see the turn.
    const result = await next(e);
    if (e.agentId !== undefined || !e.usage) {
      return result;
    }
    try {
      const key = tallyKey(await $.session.id());
      const tally = await $.store.get(key);
      const nextTally = addTurn(tally, e.usage);
      await $.store.set(key, nextTally);
      $.ui.log(formatTurnLine(turnTotal(e.usage), nextTally.total || 0));
    } catch (error) {
      // Counting must never change the turn's answer.
    }
    return result;
  }).catch(async ($, e, next) => {
    return next(e);
  });

  on("tool.call", async ($, e, next) => {
    const result = await next(e);
    try {
      const key = tallyKey(await $.session.id());
      const tally = await $.store.get(key);
      await $.store.set(key, addTool(tally));
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
    const key = tallyKey(await $.session.id());
    const tally = await $.store.get(key);
    return { text: formatTally(tally || emptyTally()) };
  }).catch(async ($, e, next) => {
    return { text: "Token tally unavailable." };
  });
}
