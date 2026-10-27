# design-guard

Appends architecture rules as Claude-only context on every prompt, and drops
only prompts that explicitly ask to ignore or bypass security rules.

## Correct events

- `prompt.submit`: rewrite with `next({...e, context: [...(e.context || []), rules]})`,
  or `{ drop }` before `next` for the bypass case.
- `command.run` with matcher `{ command: "design-rules" }`: returns the rules text.

## Limits

- This is a user-mod approximation. True system-prompt enforcement uses
  `prompt.compose` / `prompt.section` / `prompt.context`, which requires a
  prepend org mod and is suppressed for user mods under the guard.
- `session.start` is observe/setup only; it cannot enforce a system prompt.
- Appended context is Claude-only, not shown in the transcript.
- Like every mod here, this mod is removed by `--safe-mode`, a worker crash,
  or an untrusted directory, so it is defence in depth, not a boundary.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/design-guard
# claude plugin test ./mods/design-guard
```
