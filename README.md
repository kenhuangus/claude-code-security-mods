# Claude Code Security Mods

Eight small, local Claude Code mods (plugins with hooks modules) that add
deterministic guardrails inside Claude Code's process loop. Each mod is one
folder under `mods/`, with its own `plugin.json`, `hooks/hooks.json`,
`hooks/register.js`, pure `hooks/policy.js`, and `README.md`.

Public repo: https://github.com/kenhuangus/claude-code-security-mods

## The 8 mods

| Mod | Correct events | What it does |
|---|---|---|
| `design-guard` | `prompt.submit`, `command.run` (`design-rules`) | Appends architecture rules as Claude-only context; drops only prompts explicitly asking to ignore/bypass security rules |
| `code-scan-bridge` | `tool.call` (`Edit`/`Write`/`MultiEdit`) | Local pattern bridge, NOT the official Claude Security plugin and NOT a data-flow scanner |
| `secret-scrubber` | `prompt.submit`, `tool.call` (`Bash`, `Edit`/`Write`/`MultiEdit`), `prompt.mention` | Redacts secret patterns pre-`next`; post-`next` redaction is best-effort; denies secret-file mentions |
| `eval-gate` | `tool.check` (`Bash`/`Edit`/`Write`/`MultiEdit`), `command.run` (`eval-gate`) | Default-closed gate; external Promptfoo in CI is the real gate, this is defence in depth |
| `trace-audit` | `tool.call`, `turn.complete` | Observable trace only, capped at 500 store entries; never blocks work |
| `tool-call-guard` | `tool.call` (`Bash`) | Local deterministic Bash guard, NOT the Rulebricks product or API; no network calls |
| `nhi-scoper` | `command.run` (`nhi-refresh`), `tool.call` (`Bash`) | Short-lived token gate; no dedicated JIT API and no env unset exists |
| `token-tally` | `turn.complete`, `tool.call`, `command.run` (`token-tally`) | Per-turn token totals in store; NOT a token stream and NOT a server-side audit chain |

## Corrections

The original idea list contained claims that do not match the primary
Claude Code docs. This repo corrects all of them, and the per-mod READMEs
repeat the correction where it matters:

1. **There is no `session.starting` event.** The correct event is
   `session.start`, and it is observe/setup only. It cannot block a
   session or enforce a system prompt.
2. **There is no `$.tools`.** The mods API namespace is singular:
   `$.tool` (`register`, `call`, `check`, `list`).
3. **There are no `$.intercept` / `$.block` methods.** Blocking, rewriting,
   and observing are return shapes, not methods: `{ deny }`, `{ drop }`,
   `{ decision }`, `{ refuse }`, `{ value }`, and rewritten `next(e)`.
4. **There are no dedicated file-edit, Bash, thought, or token-stream
   events.** File edits and Bash are `tool.call` with a tool matcher.
   There is no event that exposes internal thoughts or reasoning, and no
   per-token stream API.
5. **There is no `redteam.*` event and no dedicated JIT API.** Eval gating
   is built from `tool.check` + `$.store` + a command that runs an external
   suite. JIT is approximated with `$.http.fetch` to a broker plus
   `$.env.set`, and there is no `$.env.delete` / unset method, so setting
   a token is NOT revocation.
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
   same condition; `tool.check` / `plugin.register` return their refusal
   without testing `next.called`. The one intentional exception is
   `trace-audit`, whose `.catch` continues with `next(e)` because an
   audit failure must not become an outage.

## Install

```bash
# One session, without installing:
claude --plugin-dir ./mods/design-guard
# From a marketplace / plugin install flow, after this repo is published:
# claude plugin install design-guard@<marketplace> --scope user
# Inside a session that was already open:
/reload-plugins
```

Each folder under `mods/` is a complete plugin. See its README for its
events, limits, and test notes.

## Test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
```

See [TESTS.md](TESTS.md) for exactly what was run in this build and what
was NOT run.

Documented Claude commands (not run here, because no `claude` CLI was
available in the build environment):

```bash
claude plugin validate ./mods/<mod>
claude plugin test ./mods/<mod>
claude --plugin-dir ./mods/<mod>
```

## Security warning

Mods are unsandboxed code that runs with your permissions. A loaded mod
can read and write files your account can reach, start programs, make
network requests, read environment variables and settings, see every
prompt and tool call, and approve tool calls before you are asked.
Install mods only from authors and marketplaces you trust, and audit the
open-source code before installing — including this repo. `claude plugin
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
- **Text matching:** the Bash and file guards match text, not intent.
  They miss `$(...)`, `eval`, wrappers, scripts, and aliases. Pair them
  with permission deny rules and a sandbox for destructive commands.
- **Payload fields:** several per-tool and per-event field names in this
  repo (for example `new_string` / `content` / `edits`, `e.usage` fields,
  broker response shape, and userConfig field names) are taken from the
  research report's examples, not from a generated types file for a
  specific installed build. Pin them against
  `.claude-plugin/types/claude-code/index.d.ts` on the target machine
  before relying on any guard in production.
