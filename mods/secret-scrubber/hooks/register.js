import { redactText, redactResult, isSecretPath } from "./policy.js";

export function register(on, options) {
  on("prompt.submit", async ($, e, next) => {
    const text = redactText(e.text);
    if (text !== e.text) {
      return next({ ...e, text: text });
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { drop: "Secret scrubber unavailable: refusing this prompt." };
    }
    return next(e);
  });

  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const command = redactText(e.command);
    const event = command !== e.command ? { ...e, command: command } : e;
    const result = await next(event);
    return redactResult(result);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Secret scrubber unavailable: refusing this call." };
    }
    return next(e);
  });

  on("tool.call", { tool: ["Edit", "Write", "MultiEdit"] }, async ($, e, next) => {
    let event = e;
    if (typeof e.new_string === "string" && redactText(e.new_string) !== e.new_string) {
      event = { ...event, new_string: redactText(e.new_string) };
    }
    if (typeof e.content === "string" && redactText(e.content) !== e.content) {
      event = { ...event, content: redactText(e.content) };
    }
    const result = await next(event);
    return redactResult(result);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Secret scrubber unavailable: refusing this call." };
    }
    return next(e);
  });

  on("prompt.mention", async ($, e, next) => {
    const path = typeof e.path === "string" ? e.path : e.file_path;
    if (isSecretPath(path)) {
      return { deny: "Secret scrubber blocked a secret file mention." };
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Secret scrubber unavailable: refusing this mention." };
    }
    return next(e);
  });
}
