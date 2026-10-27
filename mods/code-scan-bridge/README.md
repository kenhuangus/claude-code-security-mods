# code-scan-bridge

A local, deterministic pattern bridge for new file content. It is NOT the
official Claude Security plugin, and it is NOT a data-flow scanner.

## Install

```
/plugin install code-scan-bridge --marketplace kenhuangus/claude-code-security-mods
```

Try it in one session without installing: `claude --plugin-dir ./mods/code-scan-bridge`.

## Use

It runs by itself once loaded. When Claude tries to write content that matches a
pattern below, the edit is refused and Claude is told which pattern matched, so
it can read the value from an environment variable instead.

## Correct events

- `tool.call` with matcher `{ tool: ["Edit", "Write", "MultiEdit", "NotebookEdit"] }`,
  checked before `next`: `{ deny }` on a match, otherwise `next(e)`.

## What it checks

Deterministic patterns in the *new* content only (never the old content). The
fields read are `new_string` (Edit), `content` (Write) and `new_source`
(NotebookEdit):

- AWS access key ID (`AKIA` followed by 16 alphanumerics)
- Private key header (`-----BEGIN ... PRIVATE KEY-----`)
- GitHub tokens (`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`)
- Anthropic (`sk-ant-`) and OpenAI-style (`sk-` plus 32 characters) API keys
- Google API keys (`AIza...`) and Slack tokens (`xox...`)
- Hardcoded password assignment (`password = "..."`)

It deliberately does not check `eval` of unsanitized input: that pattern is
too noisy to deny on text alone.

## Limits

- Text patterns only. It cannot trace data flow, follow imports, or judge
  whether a secret is a test fixture.
- Pair with permission deny rules and a real scanner in CI for anything
  beyond this narrow bridge.
- A hook error refuses the edit (fail closed).

## How to test

```
npm run check
claude plugin validate ./mods/code-scan-bridge
```
