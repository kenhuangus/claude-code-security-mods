export function redactText(text) {
  if (typeof text !== "string") {
    return text;
  }
  let out = text;
  out = out.replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED]");
  out = out.replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "[REDACTED]");
  out = out.replace(/Bearer [A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
  out = out.replace(
    /\b(api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']+["']/gi,
    "$1=[REDACTED]",
  );
  return out;
}

export function isSecretPath(path) {
  if (typeof path !== "string") {
    return false;
  }
  if (path.endsWith(".env") || path.endsWith(".pem")) {
    return true;
  }
  if (path.includes("/.ssh/") || path.includes("/.aws/credentials")) {
    return true;
  }
  return false;
}

export function redactResult(result) {
  if (typeof result === "string") {
    return redactText(result);
  }
  if (!result || typeof result !== "object") {
    return result;
  }
  const out = { ...result };
  if (typeof out.content === "string") {
    out.content = redactText(out.content);
  }
  if (typeof out.output === "string") {
    out.output = redactText(out.output);
  }
  if (typeof out.text === "string") {
    out.text = redactText(out.text);
  }
  if (typeof out.result === "string") {
    out.result = redactText(out.result);
  }
  return out;
}
