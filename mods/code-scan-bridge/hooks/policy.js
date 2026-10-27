export function extractNewContent(e) {
  if (!e || typeof e !== "object") {
    return "";
  }
  if (typeof e.new_string === "string") {
    return e.new_string;
  }
  if (typeof e.content === "string") {
    return e.content;
  }
  if (Array.isArray(e.edits)) {
    return e.edits
      .map((edit) => {
        if (edit && typeof edit.new_string === "string") {
          return edit.new_string;
        }
        if (edit && typeof edit.content === "string") {
          return edit.content;
        }
        return "";
      })
      .join("\n");
  }
  if (typeof e.edits === "string") {
    return e.edits;
  }
  return "";
}

export function findSecret(content) {
  if (typeof content !== "string") {
    return null;
  }
  if (/AKIA[0-9A-Z]{16}/.test(content)) {
    return "AWS access key ID pattern";
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) {
    return "private key header";
  }
  if (/\bpassword\s*=\s*["'][^"']+["']/i.test(content)) {
    return "hardcoded password assignment";
  }
  return null;
}
