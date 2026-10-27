import { extractNewContent, findSecret } from "./policy.js";

export function register(on, options) {
  on("tool.call", { tool: ["Edit", "Write", "MultiEdit"] }, async ($, e, next) => {
    const reason = findSecret(extractNewContent(e));
    if (reason) {
      return { deny: "Code scan bridge blocked new content: " + reason + "." };
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Code scan bridge unavailable: refusing this edit." };
    }
    return next(e);
  });
}
