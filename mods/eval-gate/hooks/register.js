import { gateKey, sessionIdFromEvent, isGateFresh, evalArgvFromOptions } from "./policy.js";

export function register(on, options) {
  on("tool.check", { tool: ["Bash", "Edit", "Write", "MultiEdit"] }, async ($, e, next) => {
    const key = gateKey(sessionIdFromEvent(e));
    const stored = await $.store.get(key);
    const now = await $.clock.now();
    if (isGateFresh(stored, now)) {
      return next(e);
    }
    return { decision: "deny", reason: "Eval gate: no fresh passing eval. Run /eval-gate first." };
  }).catch(async ($, e, next) => {
    return { decision: "deny", reason: "Eval gate unavailable." };
  });

  on("command.run", { command: "eval-gate" }, async ($, e, next) => {
    const sessionId = sessionIdFromEvent(e);
    const key = gateKey(sessionId);
    const argv = evalArgvFromOptions(options);
    let result;
    try {
      result = await $.process.run(argv);
    } catch (error) {
      return { text: "Eval gate failed: the eval command could not run. The gate flag was left unset." };
    }
    if (result && result.exitCode === 0) {
      const now = await $.clock.now();
      await $.store.set(key, { passedAt: now });
      if (sessionId) {
        return { text: "Eval gate passed. Bash and file edits are allowed for 24 hours in this session." };
      }
      return { text: "Eval gate passed, but stored as a global gate because no session id was available. Warning: a global gate is shared across sessions on this machine." };
    }
    return { text: "Eval gate failed: the eval command did not exit 0. The gate flag was left unset." };
  }).catch(async ($, e, next) => {
    return { text: "Eval gate unavailable." };
  });
}
