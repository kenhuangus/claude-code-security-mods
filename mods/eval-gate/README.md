# eval-gate

Default-closed eval gate. It denies Bash, PowerShell and file edits until a fresh
passing eval is recorded for this session.

## Install

```
/plugin install eval-gate --marketplace kenhuangus/claude-code-security-mods
```

The install asks for **Eval command** (default `promptfoo eval`). You can change
it later in the plugin's config menu.

Try it in one session without installing: `claude --plugin-dir ./mods/eval-gate`.

## Use

1. Work as usual. Until the gate opens, Bash, PowerShell and edits are refused with
   "Run /eval-gate first".
2. Type `/eval-gate`. It runs your eval command; on exit code 0 the gate opens for
   24 hours in this session only.

## Correct events

- `tool.check` with matcher `{ tool: ["Bash", "PowerShell", "Edit", "Write", "MultiEdit", "NotebookEdit"] }`:
  `{ decision: "deny" }` unless this session's gate flag is fresh, otherwise
  `next(e)` so the normal decision rules run.
- `command.run` with matcher `{ command: "eval-gate" }`: runs the eval command
  with `$.process.run` (10 minute limit). On exit code 0 it sets the flag with a
  timestamp; on any other outcome it leaves the flag unset.

## What changed from 0.1.0

- **The gate is per session.** `tool.check` and `command.run` carry no session
  id, so 0.1.0 always fell back to one global key, shared through `$.store` by
  every session on the machine: one pass unlocked everything for 24 hours.
  0.2.0 keys the flag on `$.session.id()`. If the id cannot be read the gate
  stays closed; there is no global fallback.
- **`/eval-gate` works.** The command is registered on `$` at `session.start`
  (`$.command.register`). 0.1.0 shipped a markdown command file instead, which only
  creates a prompt skill; the `command.run` hook never fired, so the gate could not be opened.
- **PowerShell and notebooks are gated**, so the Windows shell is no longer a bypass.
- **The eval command is configurable** through the manifest's `userConfig`
  (`evalCommand`), as a command line or an argv list. On Windows it runs through
  `cmd /c` so npm `.cmd` shims such as `promptfoo` start.

## Limits

- Promptfoo is an external tool, not a mod. The real gate is an external
  Promptfoo run, or `claude plugin eval` in CI. This mod is defence in
  depth only.
- A user can disable this mod with `--safe-mode`, so never use it as the
  sole release gate.
- A hook error denies the call (fail closed).

## How to test

```
npm run check
claude plugin validate ./mods/eval-gate
```
