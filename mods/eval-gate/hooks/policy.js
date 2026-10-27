export const GATE_TTL_MS = 24 * 60 * 60 * 1000;
export const EVAL_TIMEOUT_MS = 10 * 60 * 1000;

// Kept for hosts that put a session id on the event. The gate itself reads
// $.session.id(), because tool.check and command.run carry no session id.
export function sessionIdFromEvent(e) {
  if (!e || typeof e !== "object") {
    return null;
  }
  if (typeof e.sessionId === "string" && e.sessionId !== "") {
    return e.sessionId;
  }
  if (typeof e.session === "string" && e.session !== "") {
    return e.session;
  }
  if (e.session && typeof e.session.id === "string" && e.session.id !== "") {
    return e.session.id;
  }
  return null;
}

// No session id means no key: the gate stays closed rather than falling back to a
// key that every session on the machine would share.
export function gateKey(sessionId) {
  if (typeof sessionId === "string" && sessionId !== "") {
    return "eval-gate:" + sessionId;
  }
  return null;
}

export function isGateFresh(stored, now) {
  if (!stored || typeof stored !== "object") {
    return false;
  }
  if (typeof stored.passedAt !== "number") {
    return false;
  }
  if (stored.passedAt > now) {
    return false;
  }
  return now - stored.passedAt < GATE_TTL_MS;
}

export function splitCommandLine(line) {
  const out = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    out.push(match[1] !== undefined ? match[1] : match[2] !== undefined ? match[2] : match[3]);
  }
  return out;
}

// userConfig `evalCommand` is a command line; an argv array is accepted too.
export function evalArgvFromOptions(options) {
  if (options && Array.isArray(options.evalCommand) && options.evalCommand.length > 0) {
    return options.evalCommand;
  }
  if (options && typeof options.evalCommand === "string" && options.evalCommand.trim() !== "") {
    return splitCommandLine(options.evalCommand.trim());
  }
  if (options && Array.isArray(options.argv) && options.argv.length > 0) {
    return options.argv;
  }
  return ["promptfoo", "eval"];
}

// npm installs tools like promptfoo as .cmd shims on Windows, which a plain spawn of
// ["promptfoo", "eval"] cannot start. cmd /c resolves them the way a terminal does.
export function wrapForWindows(argv, osName) {
  if (osName !== "Windows_NT" || argv.length === 0) {
    return argv;
  }
  if (/\.exe$/i.test(argv[0])) {
    return argv;
  }
  return ["cmd", "/c", ...argv];
}
