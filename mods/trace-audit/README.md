# trace-audit

Observable audit trace only. It records tool calls (before and after) and
turn completions into a capped `$.store` log, and never blocks work.

## Correct events

- `tool.call` (no matcher): log before `next`, run `next`, log after, return
  the result. Logging errors are caught and ignored.
- `turn.complete`: log, then `next(e)`.

## What it is NOT

- It does NOT audit internal thoughts or reasoning. No such event exists.
  It records only observable tool calls and turn completions.
- It is NOT a server-side or tamper-evident chain. The log lives in
  `$.store` (4 MiB total, shared across sessions on the machine) and is
  capped at 500 entries, oldest dropped first.

## Gaps

- `--safe-mode`, a worker crash unload, or a run without this mod produces
  no rows. Treat absence of a row as unverified, never as proof that
  nothing happened.
- This mod's `.catch` handlers deliberately continue with `next(e)`:
  an audit failure must not become a functional outage. That is the one
  intentional exception to the fail-closed pattern used by the gating mods.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/trace-audit
```
