# token-tally

Turn token tally. It records usage totals in `$.store` and shows the turn
total under the answer.

## Correct events

- `turn.complete`: read `e.usage` if present, add it to the `$.store`
  tally, return `{ text }` with the turn total.
- `tool.call` (no matcher): run `next`, then increment the tool count in
  `$.store`, then return the result.
- `command.run` with matcher `{ command: "token-tally" }`: return the
  totals as text.

## Limits

- No per-token stream API exists, so this is per-turn totals only, not a
  live token stream or sidebar meter.
- This is NOT a server-side or tamper-evident audit chain. The tally lives
  in `$.store` (4 MiB total, shared across sessions on the machine) and
  can be reset by clearing the store.
- `turn.complete` usage field names are taken from the research report
  (`input_tokens`, `output_tokens`, cache fields) and must be pinned
  against the generated types for the Claude Code build actually installed.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/token-tally
```
