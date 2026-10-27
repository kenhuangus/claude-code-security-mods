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

export function makeEntry(event, tool, now, stage) {
  return { event: event, tool: tool || null, at: now, stage: stage };
}
