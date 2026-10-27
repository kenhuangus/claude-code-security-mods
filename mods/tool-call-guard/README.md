# tool-call-guard

Local, deterministic guard for dangerous Bash commands. It is a
Rulebricks-style pattern implemented locally; it is NOT the Rulebricks
product and it makes no network calls and uses no Rulebricks API.

## Correct events

- `tool.call` with matcher `{ tool: "Bash" }`, checked before `next`:
  `{ deny }` on a match, otherwise `next(e)`.

## What it denies

- `rm -rf` (or separate `-r` / `-f` flags) on `/`, `~`, or `/*`
- `mkfs`
- `dd` writing to `/dev/`
- `curl` / `wget` piped to `sh` / `bash`

## Limits

- Text matching only. It misses `$(...)`, `eval`, wrappers, scripts, and
  aliases, so pair it with permission deny rules and a sandbox for
  destructive commands.
- It is a safety net, not a permission system.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/tool-call-guard
```
