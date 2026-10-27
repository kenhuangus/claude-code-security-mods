# secret-scrubber

Redacts secret patterns from prompts, tool arguments, and tool results, and
denies @-mentions of secret files.

## Correct events

- `prompt.submit`: rewrite `text` with `next({...e, text})` before the turn.
- `tool.call` for `Bash`: rewrite `command` before `next`, then redact the
  result after `next`.
- `tool.call` for `Edit` / `Write` / `MultiEdit`: rewrite `new_string` /
  `content` before `next`, then redact the result after `next`.
- `prompt.mention`: `{ deny }` for paths ending `.env` / `.pem` or containing
  `/.ssh/` or `/.aws/credentials`.

## Limits

- Pre-`next` redaction is the real protection. Post-`next` redaction is
  best-effort only: the tool already ran, and the raw result may already be
  in logs or in the tool's own side effects.
- Pattern redaction only. It cannot detect every secret format, and it
  cannot redact a secret already stored in a transcript row unless an org
  mod also covers `session.append`.
- Per-tool payload field names must be pinned against the generated types
  for the Claude Code build actually installed.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/secret-scrubber
```
