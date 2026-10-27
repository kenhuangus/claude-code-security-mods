# token-tally

Per-session token tally. It records usage totals in `$.store` and prints the
turn total after the answer.

## Install

```
/plugin install token-tally --marketplace kenhuangus/claude-code-security-mods
```

Try it in one session without installing: `claude --plugin-dir ./mods/token-tally`.

## Use

After each answer a line such as `Token tally: this turn=15, session total=15.`
appears in the transcript. It is not sent to the model. Type `/token-tally` for the
full counts (turns, tools, input, output, cache, total).

## Correct events

- `turn.complete`: run `next(e)` first, then read `e.usage`, add it to this
  session's tally in `$.store`, and print the line with `$.ui.log`. The answer
  is returned unchanged.
- `tool.call` (no matcher): run `next`, then increment the tool count in
  `$.store`, then return the result.
- `command.run` with matcher `{ command: "token-tally" }`: return the totals as text.

## What changed from 0.1.0

- **`/token-tally` works.** It is registered on `$` at `session.start`
  (`$.command.register`). 0.1.0 shipped a markdown command file, which only creates a
  prompt skill; the `command.run` hook never fired.
- **It no longer cuts the chain.** 0.1.0 answered `turn.complete` itself without
  calling `next`, so every other plugin's `turn.complete` hook (and the engine's
  own) never ran for the turn. It now calls `next(e)` and leaves the answer alone.
- **The total really is per session.** `$.store` is shared across sessions on the
  machine, so one key added every session together and called it the session total.
  The tally is now keyed on `$.session.id()`.
- Subagent turns (`e.agentId` set) are not added to the session's total.

## Limits

- No per-token stream API exists, so this is per-turn totals only, not a
  live token stream or sidebar meter.
- This is NOT a server-side or tamper-evident audit chain. The tally lives
  in `$.store` (4 MiB total, shared across sessions on the machine) and
  can be reset by clearing the store. One small entry stays behind per session.
- Usage fields are `input_tokens`, `output_tokens`, `cache_read_input_tokens` and
  `cache_creation_input_tokens`, as `TurnUsage` declares them.

## How to test

```
npm run check
claude plugin validate ./mods/token-tally
```
