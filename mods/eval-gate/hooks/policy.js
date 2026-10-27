export const GATE_TTL_MS = 24 * 60 * 60 * 1000;

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
  if (typeof e.id === "string" && e.id !== "") {
    return e.id;
  }
  return null;
}

export function gateKey(sessionId) {
  if (sessionId) {
    return "eval-gate:" + sessionId;
  }
  return "eval-gate:global";
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

export function evalArgvFromOptions(options) {
  if (options && Array.isArray(options.evalCommand) && options.evalCommand.length > 0) {
    return options.evalCommand;
  }
  if (options && Array.isArray(options.argv) && options.argv.length > 0) {
    return options.argv;
  }
  return ["promptfoo", "eval"];
}
