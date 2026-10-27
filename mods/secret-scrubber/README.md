# secret-scrubber

Redacts secret patterns from prompts and shell commands and output, blocks
writes that contain secrets, and denies reads and @-mentions of secret files.

## Install

```
/plugin install secret-scrubber --marketplace kenhuangus/claude-code-security-mods
```

Try it in one session without installing: `claude --plugin-dir ./mods/secret-scrubber`.

## Use

It runs by itself once loaded. Secrets you type or that a command prints are
replaced with `[REDACTED]` before Claude reads them. A write that would put a
secret into a file is refused with a reason, and `.env`, `.pem`, SSH keys and
`.aws/credentials` cannot be read or @-mentioned.

## Correct events

- `prompt.submit`: rewrite `text` with `next({...e, text})` before the turn.
- `tool.call` for `Bash` and `PowerShell`: rewrite `command` before `next`, then
  redact `result.stdout` and `result.stderr` after `next`.
- `tool.call` for `Edit` / `Write` / `MultiEdit` / `NotebookEdit`: `{ deny }` when
  `new_string`, `content` or `new_source` holds a secret.
- `tool.call` for `Read`: `{ deny }` when `file_path` is a secret file.
- `prompt.mention`: `{ deny }` for secret-file paths.

## What changed from 0.1.0

- **Shell output is redacted for real.** A tool call resolves
  `{ ref, result: { stdout, stderr, ... }, text }`. 0.1.0 looked for
  `content`/`output`/`text` on `result`, which Bash does not have, and returned
  the original `ref`, which the engine reuses verbatim. 0.2.0 redacts
  `stdout`/`stderr` and returns a new `{ result }` without `ref` or `text`.
- **Writes are refused, not rewritten.** 0.1.0 silently replaced secrets inside
  the file being written, so `token = "abc"` became the invalid `token=[REDACTED]`
  in your source. 0.2.0 refuses the write and tells Claude to use an environment
  variable.
- **PowerShell is covered**, so the Windows shell is no longer a bypass.
- **Windows paths work** (`C:\Users\me\.ssh\id_rsa`, `.env.local`), and
  `.env.example` / `.env.sample` stay readable.
- **More token formats:** GitHub, Anthropic, OpenAI-style, Google and Slack.

## Limits

- Pre-`next` redaction is the real protection. Post-`next` redaction is
  best-effort only: the tool already ran, and the raw result may already be
  in logs or in the tool's own side effects.
- Pattern redaction only. It cannot detect every secret format, and it
  cannot redact a secret already stored in a transcript row unless an org
  mod also covers `session.append`.
- Only the `Read` tool, @-mentions, shell commands and file writes are covered.
  `Grep`, `Glob` and shell commands that print a secret file (`cat .env`) are
  caught by output redaction, not by path.
- A hook error refuses the call (fail closed).

## How to test

```
npm run check
claude plugin validate ./mods/secret-scrubber
```
