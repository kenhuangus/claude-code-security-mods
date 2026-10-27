import { AUDIT_KEY, AUDIT_CAP, appendAudit, makeEntry } from "./policy.js";

export function register(on, options) {
  on("tool.call", async ($, e, next) => {
    try {
      const log = await $.store.get(AUDIT_KEY);
      const now = await $.clock.now();
      await $.store.set(AUDIT_KEY, appendAudit(log, makeEntry("tool.call", e.tool, now, "pre"), AUDIT_CAP));
    } catch (error) {
      // Audit logging must never block the tool call.
    }
    const result = await next(e);
    try {
      const log = await $.store.get(AUDIT_KEY);
      const now = await $.clock.now();
      await $.store.set(AUDIT_KEY, appendAudit(log, makeEntry("tool.call", e.tool, now, "post"), AUDIT_CAP));
    } catch (error) {
      // Audit logging must never block the tool call.
    }
    return result;
  }).catch(async ($, e, next) => {
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    try {
      const log = await $.store.get(AUDIT_KEY);
      const now = await $.clock.now();
      await $.store.set(AUDIT_KEY, appendAudit(log, makeEntry("turn.complete", null, now, "complete"), AUDIT_CAP));
    } catch (error) {
      // Audit logging must never block the turn.
    }
    return next(e);
  }).catch(async ($, e, next) => {
    return next(e);
  });
}
