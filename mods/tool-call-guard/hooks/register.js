import { dangerousCommandReason } from "./policy.js";

export function register(on, options) {
  on("tool.call", { tool: ["Bash", "PowerShell"] }, async ($, e, next) => {
    const reason = dangerousCommandReason(e.tool, e.command);
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
