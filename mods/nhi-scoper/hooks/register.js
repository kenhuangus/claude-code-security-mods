import { TOKEN_KEY, brokerUrlFromOptions, isCredentialCommand, isTokenFresh, extractToken, replacePlaceholder } from "./policy.js";

export function register(on, options) {
  on("command.run", { command: "nhi-refresh" }, async ($, e, next) => {
    const brokerUrl = brokerUrlFromOptions(options);
    if (!brokerUrl) {
      return { text: "NHI broker not configured. Set brokerUrl in plugin userConfig, then run /nhi-refresh again. No token was created or stored." };
    }
    let response;
    try {
      response = await $.http.fetch(brokerUrl);
    } catch (error) {
      return { text: "NHI refresh failed: the broker could not be reached. No token was stored." };
    }
    const parsed = extractToken(response);
    if (!parsed) {
      return { text: "NHI refresh failed: the broker response had no usable token. No token was stored." };
    }
    const now = await $.clock.now();
    await $.store.set(TOKEN_KEY, { token: parsed.token, expiresAt: now + parsed.ttlMs });
    await $.env.set("NHI_TOKEN", parsed.token);
    return { text: "NHI token refreshed. It applies only to commands and MCP servers started afterward. This is not revocation: there is no unset method for env vars, so an issued token stays set until it expires or the session ends." };
  }).catch(async ($, e, next) => {
    return { text: "NHI refresh unavailable." };
  });

  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    if (!isCredentialCommand(e.command)) {
      return next(e);
    }
    const stored = await $.store.get(TOKEN_KEY);
    const now = await $.clock.now();
    if (!isTokenFresh(stored, now)) {
      return { deny: "No fresh NHI token. Run /nhi-refresh first. No long-lived credential will be used as a fallback." };
    }
    if (typeof e.command === "string" && e.command.includes("$NHI_TOKEN")) {
      return next({ ...e, command: replacePlaceholder(e.command, stored.token) });
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "NHI scoper unavailable: refusing this call." };
    }
    return next(e);
  });
}
