export function extractNewContent(e) {
  if (!e || typeof e !== "object") {
    return "";
  }
  const parts = [];
  if (typeof e.new_string === "string") {
    parts.push(e.new_string);
  }
  if (typeof e.content === "string") {
    parts.push(e.content);
  }
  if (typeof e.new_source === "string") {
    parts.push(e.new_source);
  }
  if (Array.isArray(e.edits)) {
    for (const edit of e.edits) {
      if (edit && typeof edit.new_string === "string") {
        parts.push(edit.new_string);
      } else if (edit && typeof edit.content === "string") {
        parts.push(edit.content);
      }
    }
  } else if (typeof e.edits === "string") {
    parts.push(e.edits);
  }
  return parts.join("\n");
}

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key ID pattern"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/, "private key header"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}/, "GitHub token pattern"],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, "Anthropic API key pattern"],
  [/\bsk-[A-Za-z0-9_-]{32,}/, "OpenAI-style API key pattern"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key pattern"],
  [/\bxox[abprs]-[0-9A-Za-z-]{10,}/, "Slack token pattern"],
  [/\bpassword\s*=\s*["'][^"']+["']/i, "hardcoded password assignment"],
];

export function findSecret(content) {
  if (typeof content !== "string") {
    return null;
  }
  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      return label;
    }
  }
  return null;
}
