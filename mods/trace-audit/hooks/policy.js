export const AUDIT_KEY = "trace-audit:log";
export const AUDIT_CAP = 500;

export function appendAudit(log, entry, cap) {
  const base = Array.isArray(log) ? log : [];
  const limit = typeof cap === "number" ? cap : AUDIT_CAP;
  const nextLog = [...base, entry];
  if (nextLog.length > limit) {
    return nextLog.slice(nextLog.length - limit);
  }
  return nextLog;
}

export function makeEntry(event, tool, now, stage, extra) {
  const entry = { event: event, tool: tool || null, at: now, stage: stage };
  if (extra && typeof extra === "object") {
    if (typeof extra.agentId === "string") {
      entry.agentId = extra.agentId;
    }
    if (typeof extra.outcome === "string") {
      entry.outcome = extra.outcome;
    }
  }
  return entry;
}

// How a tool call ended, from the response next(e) resolved to.
export function outcomeOf(response) {
  if (!response || typeof response !== "object") {
    return "unknown";
  }
  if (typeof response.deny === "string") {
    return "denied";
  }
  if (response.isError) {
    return "error";
  }
  return "ok";
}
