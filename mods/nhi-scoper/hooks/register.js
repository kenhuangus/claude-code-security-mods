import { TOKEN_KEY, brokerUrlFromOptions, isAllowedBrokerUrl, isCredentialCommand, hasPlaceholder, isTokenFresh, parseBrokerResponse, replacePlaceholder } from "./policy.js";

export function register(on, options) {
  // A slash command only reaches command.run when the module registers it on $ by a literal name.
  on("session.start", async ($, e, next) => {
    await $.command.register({ name: "nhi-refresh", description: "Fetch a short-lived token from the configured broker" });
    await $.command.register({ name: "nhi-revoke", description: "Clear the short-lived token from this session and close the gate" });
    return next(e);
  }).catch(async ($, e, next) => {
    return next(e);
  });

  on("command.run", { command: "nhi-refresh" }, async ($, e, next) => {
    const brokerUrl = brokerUrlFromOptions(options);
    if (!brokerUrl) {
      return { text: "NHI broker not configured. Set brokerUrl in the plugin settings, then run /nhi-refresh again. No token was created or stored." };
    }
    if (!isAllowedBrokerUrl(brokerUrl)) {
      return { text: "NHI refresh refused: the broker URL must use https (or point at localhost). No token was requested or stored." };
    }
    let response;
    try {
      response = await $.http.fetch(brokerUrl);
    } catch (error) {
      return { text: "NHI refresh failed: the broker could not be reached. No token was stored." };
    }
    const parsed = parseBrokerResponse(response);
    if (!parsed) {
      return { text: "NHI refresh failed: the broker response had no usable token. No token was stored." };
    }
    const now = await $.clock.now();
    const set = await $.env.set("NHI_TOKEN", parsed.token);
    if (set && set.deny) {
      return { text: "NHI refresh failed: the token could not be set in the environment. No token was stored." };
    }
    await $.store.set(TOKEN_KEY, { expiresAt: now + parsed.ttlMs });
    return { text: "NHI token refreshed. It applies only to commands and MCP servers started afterward, and the gate lets it through until it expires. /nhi-revoke clears it from this session early; that does not revoke it at the broker." };
  }).catch(async ($, e, next) => {
    return { text: "NHI refresh unavailable." };
  });

  on("command.run", { command: "nhi-revoke" }, async ($, e, next) => {
    await $.env.set("NHI_TOKEN", undefined);
    await $.store.delete(TOKEN_KEY);
    return { text: "NHI token cleared from this session's environment and the gate is closed. The broker was not contacted, so the token itself stays valid there until it expires." };
  }).catch(async ($, e, next) => {
    return { text: "NHI revoke unavailable." };
  });

  on("tool.call", { tool: ["Bash", "PowerShell"] }, async ($, e, next) => {
    if (!isCredentialCommand(e.command)) {
      return next(e);
    }
    const stored = await $.store.get(TOKEN_KEY);
    const token = await $.env.get("NHI_TOKEN");
    const now = await $.clock.now();
    if (!isTokenFresh(stored, now) || typeof token !== "string" || token === "") {
      if (stored) {
        await $.env.set("NHI_TOKEN", undefined);
        await $.store.delete(TOKEN_KEY);
      }
      return { deny: "No fresh NHI token. Run /nhi-refresh first. No long-lived credential will be used as a fallback." };
    }
    if (hasPlaceholder(e.command)) {
      return next({ ...e, command: replacePlaceholder(e.command, token) });
    }
    return next(e);
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { deny: "NHI scoper unavailable: refusing this call." };
    }
    return next(e);
  });
}
