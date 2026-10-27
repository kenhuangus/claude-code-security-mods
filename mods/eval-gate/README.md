# eval-gate

Default-closed eval gate. It denies Bash and file edits until a fresh
passing eval is recorded.

## Correct events

- `tool.check` with matcher `{ tool: ["Bash", "Edit", "Write", "MultiEdit"] }`:
  `{ decision: "deny" }` unless a `$.store` gate flag is fresh, otherwise
  `next(e)` so the normal decision rules run.
- `command.run` with matcher `{ command: "eval-gate" }`: runs the eval
  command with `$.process.run` (argv from plugin userConfig, default
  `["promptfoo", "eval"]`). On exit code 0 it sets the store flag with a
  timestamp; on any other outcome it leaves the flag unset.

## Gate rules

- TTL is 24 hours. The flag is keyed per session when a session id is
  available in the event, otherwise it falls back to a global key, with a
  clear warning in the command output. A global key is shared across
  sessions on the machine, so prefer the per-session path.
- The userConfig field name for the argv (`evalCommand`) is not pinned
  against a real manifest schema in this build; pin it before shipping.

## Limits

- Promptfoo is an external tool, not a mod. The real gate is an external
  Promptfoo run, or `claude plugin eval` in CI. This mod is defence in
  depth only.
- A user can disable this mod with `--safe-mode`, so never use it as the
  sole release gate.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/eval-gate
```
