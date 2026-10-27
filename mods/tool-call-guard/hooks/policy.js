function isDangerousRm(segment) {
  const tokens = segment.trim().split(/\s+/);
  if (tokens.length === 0) {
    return false;
  }
  let start = 0;
  if (tokens[0] === "sudo") {
    start = 1;
  }
  if (tokens[start] !== "rm") {
    return false;
  }
  const rest = tokens.slice(start + 1);
  let hasR = false;
  let hasF = false;
  const targets = [];
  for (const token of rest) {
    if (token.startsWith("-") && token !== "-") {
      if (token.includes("r")) {
        hasR = true;
      }
      if (token.includes("f")) {
        hasF = true;
      }
    } else {
      targets.push(token);
    }
  }
  if (!hasR || !hasF) {
    return false;
  }
  return targets.includes("/") || targets.includes("~") || targets.includes("/*");
}

export function dangerousBashReason(command) {
  if (typeof command !== "string") {
    return null;
  }
  const segments = command.split(/[;|&]+/);
  for (const segment of segments) {
    if (isDangerousRm(segment)) {
      return "Dangerous rm: recursive force removal of / or ~ or /*.";
    }
  }
  if (/\bmkfs\b/.test(command)) {
    return "Dangerous command: mkfs.";
  }
  if (/\bdd\b/.test(command) && /of=\/dev\//.test(command)) {
    return "Dangerous command: dd writing to /dev/.";
  }
  if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(sh|bash)\b/.test(command)) {
    return "Dangerous command: download piped to a shell.";
  }
  return null;
}
