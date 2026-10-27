# Claude Code Security Mods

Eight small, local Claude Code mods (plugins with hooks modules) that add
deterministic guardrails inside Claude Code's process loop. Each mod is one
folder under `mods/`, with its own `plugin.json`, `hooks/hooks.json`,
`hooks/register.js`, pure `hooks/policy.js`, and `README.md`. The repository is
also a plugin marketplace, so any mod installs with one line.

Public repo: https://github.com/kenhuangus/claude-code-security-mods

## Install

At the prompt of a terminal session (Claude Code 2.1.275 or later):

```
/plugin install design-guard --marketplace kenhuangus/claude-code-security-mods
```

Answer `y` to add the marketplace, then pick a scope. Replace `design-guard` with any
mod below. From a shell:

```
claude plugin marketplace add kenhuangus/claude-code-security-mods
claude plugin install secret-scrubber@claude-code-security-mods
```

Without installing, for one session, from a clone of this repository:

```
claude --plugin-dir ./mods/design-guard
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then
Plugins, Add marketplace with `kenhuangus/claude-code-security-mods`, then Add plugin.
Read a mod's README before installing it: see the security warning below.

## The 8 mods

| Mod | Correct events | What it does |
|---|---|---|
| `design-guard` | `prompt.submit`, `command.run` (`design-rules`) | Appends architecture rules as Claude-only context; drops only prompts that tell Claude to ignore/bypass security rules, not questions about attacks |
| `code-scan-bridge` | `tool.call` (`Edit`/`Write`/`MultiEdit`/`NotebookEdit`) | Local pattern bridge for new content (cloud keys, GitHub/Anthropic/OpenAI/Google/Slack tokens, private keys, passwords), NOT the official Claude Security plugin and NOT a data-flow scanner |
| `secret-scrubber` | `prompt.submit`, `tool.call` (`Bash`/`PowerShell`, file writes, `Read`), `prompt.mention` | Redacts secrets in prompts, shell commands and shell output; refuses writes that contain a secret; denies reads and mentions of secret files |
| `eval-gate` | `tool.check` (shell and file tools), `command.run` (`eval-gate`) | Default-closed, per-session gate; external Promptfoo in CI is the real gate, this is defence in depth |
| `trace-audit` | `tool.call`, `turn.complete` | Observable trace only, capped at 500 store entries; never blocks work |
| `tool-call-guard` | `tool.call` (`Bash`, `PowerShell`) | Local deterministic guard for dangerous Bash, PowerShell and cmd commands, NOT the Rulebricks product; no network calls |
| `nhi-scoper` | `command.run` (`nhi-refresh`, `nhi-revoke`), `tool.call` (`Bash`, `PowerShell`) | Short-lived token gate fed by your broker; the token lives in the environment, not the store |
| `token-tally` | `turn.complete`, `tool.call`, `command.run` (`token-tally`) | Per-session token totals; NOT a token stream and NOT a server-side audit chain |

## What 0.2.0 fixed

0.1.0 passed its own tests, but those tests used a hand-made stand-in for the engine, so
they could not notice where the mods disagreed with the real API. Checking the code
against the type definitions that ship with Claude Code, and then running each mod in
real `claude -p` sessions, found these defects:

- **Slash commands never ran.** `commands/*.md` files register a namespaced prompt skill
  that the model runs; the `command.run` hooks only fire for commands registered on `$`
  with `$.command.register`. `/design-rules`, `/eval-gate`, `/nhi-refresh` and
  `/token-tally` did nothing useful. They are registered properly now.
- **`nhi-scoper` could not work against a real broker.** `$.http.fetch` resolves
  `{ status, ok, headers, text }`, and the mod read `response.token` from it.
- **`eval-gate` was machine-wide.** `tool.check` and `command.run` carry no session id,
  so every pass was stored under one global key shared by all sessions for 24 hours.
- **`secret-scrubber` redacted nothing from shell output** (the result is
  `{ result: { stdout, stderr } }`) and rewrote source files silently, turning
  `token = "abc"` into the invalid `token=[REDACTED]`.
- **Every guard ignored the `PowerShell` tool**, so on Windows each could be sidestepped.
- **`token-tally` cut the `turn.complete` chain** and labelled a machine-wide count a
  session total.
- **`design-guard` dropped security questions** such as "how do attackers bypass
  security rules?".
- **Windows paths** (`C:\Users\me\.ssh\id_rsa`) were not recognised as secret paths.
- **`brokerUrl` and `evalCommand` could not be set**: no manifest declared `userConfig`.

Each mod's README has its own "What changed from 0.1.0" section.

## Corrections

The original idea list contained claims that do not match the primary
Claude Code docs. This repo corrects all of them, and the per-mod READMEs
repeat the correction where it matters:

1. **There is no `session.starting` event.** The correct event is
   `session.start`, and it is observe/setup only. It cannot block a
   session or enforce a system prompt. (It is where a mod registers its commands.)
2. **There is no `$.tools`.** The mods API namespace is singular:
   `$.tool` (`register`, `call`, `check`, `list`).
3. **There are no `$.intercept` / `$.block` methods.** Blocking, rewriting,
   and observing are return shapes, not methods: `{ deny }`, `{ drop }`,
   `{ decision }`, `{ refuse }`, `{ value }`, and rewritten `next(e)`.
4. **There are no dedicated file-edit, Bash, thought, or token-stream
   events.** File edits and shell commands are `tool.call` with a tool matcher.
   There is no event that exposes internal thoughts or reasoning, and no
   per-token stream API.
5. **There is no `redteam.*` event and no dedicated JIT API.** Eval gating
   is built from `tool.check` + `$.store` + a command that runs an external
   suite. JIT is approximated with `$.http.fetch` to a broker plus
   `$.env.set`. **Correction to 0.1.0:** `$.env.set(name, undefined)` unsets a
   variable, so a token can be cleared from the session. That is still not
   revocation at the broker.
6. **Claude Security, LlamaFirewall, Rulebricks, and Promptfoo are NOT
   mods.** Claude Security is an official plugin/product, LlamaFirewall is
   an external Meta framework, Rulebricks guardrails is a classic
   PreToolUse hook script, and Promptfoo is an external eval harness / MCP
   server. This repo ships local bridges and gates inspired by them, and
   says so in each README. It never claims any of them is a mod.
7. **A mod without a `.catch` handler is fail-open.** A hook that throws,
   times out, or returns the wrong shape is skipped and the underlying
   action proceeds. Every gating hook in this repo therefore has a trivial
   `.catch` handler: `tool.call` returns `{ deny }` if `next` was not
   called, otherwise `next(e)`; `prompt.submit` returns `{ drop }` on the
   same condition; `tool.check` returns its refusal without testing
   `next.called`. The intentional exceptions answer or continue instead:
   `trace-audit` and `token-tally`'s `turn.complete` continue with `next(e)`
   because an audit or a counter failing must not become an outage, and the
   `session.start` hooks that register commands do the same.

## Test

```
npm run check          # unit tests, then the static validator
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
claude plugin validate .                 # the marketplace
claude plugin validate ./mods/<mod>      # one mod
```

CI runs `npm run check` on Ubuntu and Windows. See [TESTS.md](TESTS.md) for exactly
what was run, including the live-session checks, and what was NOT run.

In a headless run, pass a slash command as the prompt argument:
`claude -p "/token-tally" --plugin-dir ./mods/token-tally`. The same command piped on
stdin goes to the model as plain text.

## Security warning

Mods are unsandboxed code that runs with your permissions. A loaded mod
can read and write files your account can reach, start programs, make
network requests, read environment variables and settings, see every
prompt and tool call, and approve tool calls before you are asked.
Install mods only from authors and marketplaces you trust, and audit the
open-source code before installing, including this repo. `claude plugin
validate` lists a mod's events and `$` calls without running it; it is
static analysis, not a safety proof.

## Limits

- **Guard suppression:** under the org guard, a user mod's hooks on
  `prompt.compose` / `prompt.section` / `prompt.context`, `skill.prompt`,
  `settings.read`, `session.compact`, `classic.*`, and guarded
  `session.append` doors never run. True system-prompt enforcement needs
  a prepend org mod.
- **`--safe-mode` / `--bare` / `disableAllHooks`:** all remove user mods
  for a session. A worker crash (3 untraceable crashes) unloads all
  non-built-in mods until `/reload-plugins` or a new session.
- **Budgets:** a hook's own execution is 10 s per event (50 ms for
  `prompt.edit`); a `.catch` handler is 1 s. Time inside a `$` call does
  not count, except `$.clock.sleep`.
- **Store / file limits:** `$.store` is 4 MiB of JSON total, shared across
  sessions on the machine; `$.fs` reads/writes are 4 MiB per file;
  `$.http.fetch` is 4 MiB in/out, 30 s, 5 redirects; `$.process.run`
  defaults to 30 s (max 10 min).
- **Text matching:** the shell and file guards match text, not intent.
  They miss `$(...)`, `eval`, wrappers, scripts, and aliases. Pair them
  with permission deny rules and a sandbox for destructive commands.
- **Payload fields:** the per-tool and per-event field names used here
  (`command`, `file_path`, `new_string`, `content`, `new_source`, `e.usage`,
  `e.path`, `{ result: { stdout, stderr } }`, the `$.http.fetch` response) were checked
  against the type definitions generated by Claude Code 2.1.311. Re-check them
  against `.claude-plugin/types/claude-code/index.d.ts` after a major upgrade.
