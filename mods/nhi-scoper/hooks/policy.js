export const TOKEN_KEY = "nhi-scoper:token";
export const DEFAULT_TTL_MS = 15 * 60 * 1000;
export const MAX_TTL_MS = 60 * 60 * 1000;

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

// A token must not travel in the clear: https, or a broker on this machine.
export function isAllowedBrokerUrl(url) {
  if (typeof url !== "string") {
    return false;
  }
  return /^https:\/\//i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(url);
}

export function isCredentialCommand(command) {
  if (typeof command !== "string") {
    return false;
  }
  if (/\b(aws|gcloud|gsutil|bq|az|kubectl|helm|terraform)(\.exe|\.cmd)?\b/i.test(command)) {
    return true;
  }
  return hasPlaceholder(command);
}

export function hasPlaceholder(command) {
  return typeof command === "string" && /\$\{?NHI_TOKEN\}?|\$env:NHI_TOKEN/i.test(command);
}

// The token itself lives only in the process environment; the store keeps the expiry,
// so no credential is written to the shared plugin store.
export function isTokenFresh(stored, now) {
  if (!stored || typeof stored !== "object") {
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
  if (!(ttl > 0)) {
    ttl = DEFAULT_TTL_MS;
  }
  return { token: response.token, ttlMs: Math.min(ttl, MAX_TTL_MS) };
}

// $.http.fetch resolves { status, ok, headers, text }; the broker's JSON is in `text`.
export function parseBrokerResponse(response) {
  if (!response || typeof response !== "object") {
    return null;
  }
  if (typeof response.text === "string") {
    if (response.ok === false) {
      return null;
    }
    try {
      return extractToken(JSON.parse(response.text));
    } catch (error) {
      return null;
    }
  }
  return extractToken(response);
}

export function replacePlaceholder(command, token) {
  if (typeof command !== "string") {
    return command;
  }
  return command.replace(/\$\{NHI_TOKEN\}|\$env:NHI_TOKEN|\$NHI_TOKEN/gi, () => token);
}
