# trace-audit

Observable audit trace only. It records tool calls (before and after) and
turn completions into a capped `$.store` log, and never blocks work.

## Install

```
/plugin install trace-audit --marketplace kenhuangus/claude-code-security-mods
```

Try it in one session without installing: `claude --plugin-dir ./mods/trace-audit`.

## Use

It runs by itself once loaded and shows nothing. Each row is
`{ event, tool, at, stage, agentId?, outcome? }`, stored under `trace-audit:log`.
`outcome` on a `post` row is `ok`, `error` or `denied`, and `agentId` names the
subagent when one made the call.

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
- Calls that overlap each read and write the same list, so two near-simultaneous
  rows can overwrite each other; the log is a trace, not a ledger.
- This mod's `.catch` handlers deliberately continue with `next(e)`:
  an audit failure must not become a functional outage. That is the one
  intentional exception to the fail-closed pattern used by the gating mods.

## How to test

```
npm run check
claude plugin validate ./mods/trace-audit
```
