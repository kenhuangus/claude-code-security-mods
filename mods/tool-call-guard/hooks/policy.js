function stripQuotes(token) {
  return token.replace(/^["']+|["']+$/g, "");
}

function isPosixRootTarget(token) {
  const target = stripQuotes(token);
  return target === "/" || target === "/*" || target === "~" || target === "~/" || target === "~/*" || /^\$\{?HOME\}?\/?\*?$/.test(target);
}

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
  let hasR = false;
  let hasF = false;
  const targets = [];
  for (const token of tokens.slice(start + 1)) {
    if (token === "--recursive") {
      hasR = true;
    } else if (token === "--force") {
      hasF = true;
    } else if (token.startsWith("--")) {
      continue;
    } else if (token.startsWith("-") && token !== "-") {
      if (/[rR]/.test(token)) {
        hasR = true;
      }
      if (token.includes("f")) {
        hasF = true;
      }
    } else {
      targets.push(token);
    }
  }
  return hasR && hasF && targets.some(isPosixRootTarget);
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
  if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(sh|bash|zsh)\b/.test(command)) {
    return "Dangerous command: download piped to a shell.";
  }
  if (/:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/.test(command)) {
    return "Dangerous command: fork bomb.";
  }
  if (/\bchmod\s+(-[a-zA-Z]*R[a-zA-Z]*|--recursive)\s+0?777\s+\/(\s|$)/.test(command)) {
    return "Dangerous command: recursive chmod 777 on /.";
  }
  return null;
}

const REMOVE_COMMANDS = new Set(["remove-item", "ri", "rm", "del", "erase", "rd", "rmdir"]);

// A drive root, the Windows or Users folders, a profile folder, or a variable that expands to one.
function isWindowsRootTarget(token) {
  const target = stripQuotes(token).replace(/\//g, "\\").toLowerCase();
  if (target === "\\" || /^[a-z]:\\?\*?$/.test(target)) {
    return true;
  }
  if (/^[a-z]:\\(windows|users|programdata)\\?\*?$/.test(target) || /^[a-z]:\\users\\[^\\]+\\?\*?$/.test(target)) {
    return true;
  }
  return /^(\$env:(userprofile|systemdrive|windir|systemroot|homedrive|homepath|programdata)|\$home|~|%userprofile%|%systemdrive%|%windir%)\\?\*?$/.test(target);
}

function isDangerousWindowsRemove(segment) {
  const tokens = segment.trim().split(/\s+/);
  if (tokens.length < 2 || !REMOVE_COMMANDS.has(tokens[0].toLowerCase())) {
    return false;
  }
  let isRecursive = false;
  const targets = [];
  for (const token of tokens.slice(1)) {
    const lower = token.toLowerCase();
    if (/^\/[a-z]$/.test(lower)) {
      if (lower === "/s") {
        isRecursive = true;
      }
    } else if (lower.startsWith("-")) {
      if (lower.length >= 2 && "-recurse".startsWith(lower)) {
        isRecursive = true;
      }
    } else {
      targets.push(token);
    }
  }
  return isRecursive && targets.some(isWindowsRootTarget);
}

export function dangerousPowerShellReason(command) {
  if (typeof command !== "string") {
    return null;
  }
  for (const segment of command.split(/[;|&\r\n]+/)) {
    if (isDangerousWindowsRemove(segment)) {
      return "Dangerous removal: recursive delete of a drive root, Windows, Users or a profile folder.";
    }
    const tokens = segment.trim().split(/\s+/);
    if (tokens[0] && tokens[0].toLowerCase() === "format" && /^[a-z]:/i.test(tokens[1] || "")) {
      return "Dangerous command: format on a drive.";
    }
  }
  if (/\b(format-volume|clear-disk|initialize-disk|remove-partition)\b/i.test(command)) {
    return "Dangerous command: disk or partition wipe.";
  }
  if (/\b(iwr|irm|invoke-webrequest|invoke-restmethod|curl|wget)\b[^|]*\|\s*(iex|invoke-expression)\b/i.test(command)) {
    return "Dangerous command: download piped to Invoke-Expression.";
  }
  if (/\b(iex|invoke-expression)\b[\s(]*[^;|]{0,60}\b(iwr|irm|invoke-webrequest|invoke-restmethod|downloadstring)\b/i.test(command)) {
    return "Dangerous command: Invoke-Expression on downloaded content.";
  }
  if (/\bset-mppreference\b[^;|]*-disable(realtimemonitoring|ioavprotection|behaviormonitoring|scriptscanning)\s+(\$true|1)/i.test(command)) {
    return "Dangerous command: turning off Windows Defender protection.";
  }
  return null;
}

export function dangerousCommandReason(tool, command) {
  if (tool === "PowerShell") {
    return dangerousPowerShellReason(command);
  }
  return dangerousBashReason(command);
}
