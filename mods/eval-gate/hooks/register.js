import { EVAL_TIMEOUT_MS, gateKey, sessionIdFromEvent, isGateFresh, evalArgvFromOptions, wrapForWindows } from "./policy.js";

export function register(on, options) {
  // A slash command only reaches command.run when the module registers it on $ by a literal name.
  on("session.start", async ($, e, next) => {
    await $.command.register({ name: "eval-gate", description: "Run the eval command and open the gate for this session if it passes" });
    return next(e);
  }).catch(async ($, e, next) => {
    return next(e);
  });

  on("tool.check", { tool: ["Bash", "PowerShell", "Edit", "Write", "MultiEdit", "NotebookEdit"] }, async ($, e, next) => {
    let sessionId = null;
    try {
      sessionId = await $.session.id();
    } catch (error) {
      sessionId = sessionIdFromEvent(e);
    }
    const key = gateKey(sessionId);
    if (!key) {
      return { decision: "deny", reason: "Eval gate: the session id could not be read, so the gate stays closed." };
    }
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
    let sessionId = null;
    try {
      sessionId = await $.session.id();
    } catch (error) {
      sessionId = sessionIdFromEvent(e);
    }
    const key = gateKey(sessionId);
    if (!key) {
      return { text: "Eval gate failed: the session id could not be read. The gate flag was left unset." };
    }
    const osName = await $.env.get("OS");
    const argv = wrapForWindows(evalArgvFromOptions(options), osName);
    let result;
    try {
      result = await $.process.run(argv, { timeoutMs: EVAL_TIMEOUT_MS });
    } catch (error) {
      return { text: "Eval gate failed: the eval command could not run. The gate flag was left unset." };
    }
    if (result && result.exitCode === 0) {
      const now = await $.clock.now();
      await $.store.set(key, { passedAt: now });
      return { text: "Eval gate passed. Bash, PowerShell and file edits are allowed for 24 hours in this session." };
    }
    return { text: "Eval gate failed: the eval command did not exit 0. The gate flag was left unset." };
  }).catch(async ($, e, next) => {
    return { text: "Eval gate unavailable." };
  });
}
