const TOKEN_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{22,}/g,
  /\bsk-ant-[A-Za-z0-9_-]{20,}/g,
  /\bsk-[A-Za-z0-9_-]{32,}/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bxox[abprs]-[0-9A-Za-z-]{10,}/g,
];

export function redactText(text) {
  if (typeof text !== "string") {
    return text;
  }
  let out = text;
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  out = out.replace(/Bearer [A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
  out = out.replace(
    /\b(api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']+["']/gi,
    "$1=[REDACTED]",
  );
  return out;
}

export function containsSecret(text) {
  return typeof text === "string" && redactText(text) !== text;
}

// Handles both separators, so a Windows path such as C:\Users\me\.ssh\id_rsa matches too.
export function isSecretPath(path) {
  if (typeof path !== "string" || path === "") {
    return false;
  }
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  const name = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (/^\.env(\..+)?$/.test(name) && !/\.(example|sample|template|dist)$/.test(name)) {
    return true;
  }
  if (/\.(pem|pfx|p12)$/.test(name)) {
    return true;
  }
  if ([".netrc", ".git-credentials", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"].includes(name)) {
    return true;
  }
  if (normalized.includes("/.ssh/") || normalized.includes("/.aws/credentials")) {
    return true;
  }
  return false;
}

// Bash and PowerShell results are { stdout, stderr, ... } under `result`; the older
// string and { content | output | text | result } shapes are kept for other tools.
export function redactResult(result) {
  if (typeof result === "string") {
    return redactText(result);
  }
  if (!result || typeof result !== "object") {
    return result;
  }
  const out = { ...result };
  for (const field of ["stdout", "stderr", "content", "output", "text", "result"]) {
    if (typeof out[field] === "string") {
      out[field] = redactText(out[field]);
    }
  }
  return out;
}

// What `next(e)` resolves to for a tool call is { ref, result, text }. Returning that same
// object makes the engine reuse the original rows verbatim, so a redaction has to be
// returned as a new { result } (plus any context) with no ref and no text.
export function redactToolResponse(response) {
  if (!response || typeof response !== "object" || !response.result || typeof response.result !== "object") {
    return response;
  }
  const redacted = redactResult(response.result);
  const changed = Object.keys(redacted).some((key) => redacted[key] !== response.result[key]);
  if (!changed) {
    return response;
  }
  const out = { result: redacted };
  if (response.context !== undefined) {
    out.context = response.context;
  }
  return out;
}

export function newContentOf(e) {
  const parts = [];
  for (const field of ["new_string", "content", "new_source"]) {
    if (e && typeof e[field] === "string") {
      parts.push(e[field]);
    }
  }
  return parts.join("\n");
}
