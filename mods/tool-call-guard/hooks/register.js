import { dangerousBashReason } from "./policy.js";

export function register(on, options) {
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const reason = dangerousBashReason(e.command);
    if (reason) {
      return { deny: reason };
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Tool call guard unavailable: refusing this call." };
    }
    return next(e);
  });
}
