import { redactText, redactToolResponse, isSecretPath, containsSecret, newContentOf } from "./policy.js";

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

  on("tool.call", { tool: ["Bash", "PowerShell"] }, async ($, e, next) => {
    const command = redactText(e.command);
    const event = command !== e.command ? { ...e, command: command } : e;
    const response = await next(event);
    return redactToolResponse(response);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Secret scrubber unavailable: refusing this call." };
    }
    return next(e);
  });

  on("tool.call", { tool: ["Edit", "Write", "MultiEdit", "NotebookEdit"] }, async ($, e, next) => {
    if (containsSecret(newContentOf(e))) {
      return { deny: "Secret scrubber blocked a write that contains a secret. Read it from an environment variable or a secret manager instead of writing it into the file." };
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Secret scrubber unavailable: refusing this call." };
    }
    return next(e);
  });

  on("tool.call", { tool: "Read" }, async ($, e, next) => {
    if (isSecretPath(e.file_path)) {
      return { deny: "Secret scrubber blocked reading a secret file." };
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "Secret scrubber unavailable: refusing this read." };
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
