export const TOKEN_KEY = "nhi-scoper:token";
export const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function brokerUrlFromOptions(options) {
  if (!options || typeof options !== "object") {
    return null;
  }
  if (typeof options.brokerUrl === "string" && options.brokerUrl !== "") {
    return options.brokerUrl;
  }
  if (typeof options.tokenBrokerUrl === "string" && options.tokenBrokerUrl !== "") {
    return options.tokenBrokerUrl;
  }
  return null;
}

export function isCredentialCommand(command) {
  if (typeof command !== "string") {
    return false;
  }
  if (/\b(aws|gcloud|kubectl)\b/.test(command)) {
    return true;
  }
  if (command.includes("$NHI_TOKEN")) {
    return true;
  }
  return false;
}

export function isTokenFresh(stored, now) {
  if (!stored || typeof stored !== "object") {
    return false;
  }
  if (typeof stored.token !== "string" || stored.token === "") {
    return false;
  }
  if (typeof stored.expiresAt !== "number") {
    return false;
  }
  return stored.expiresAt > now;
}

export function extractToken(response) {
  if (!response || typeof response !== "object") {
    return null;
  }
  if (typeof response.token !== "string" || response.token === "") {
    return null;
  }
  let ttl = DEFAULT_TTL_MS;
  if (typeof response.expiresInMs === "number") {
    ttl = response.expiresInMs;
  }
  if (typeof response.ttlMs === "number") {
    ttl = response.ttlMs;
  }
  return { token: response.token, ttlMs: ttl };
}

export function replacePlaceholder(command, token) {
  if (typeof command !== "string") {
    return command;
  }
  return command.split("$NHI_TOKEN").join(token);
}
