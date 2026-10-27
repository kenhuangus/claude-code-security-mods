# code-scan-bridge

A local, deterministic pattern bridge for new file content. It is NOT the
official Claude Security plugin, and it is NOT a data-flow scanner.

## Correct events

- `tool.call` with matcher `{ tool: ["Edit", "Write", "MultiEdit"] }`, checked
  before `next`: `{ deny }` on a match, otherwise `next(e)`.

## What it checks

Only three deterministic patterns in the *new* content (never the old content):

- AWS access key ID pattern (`AKIA` followed by 16 alphanumerics)
- Private key header (`-----BEGIN ... PRIVATE KEY-----`)
- Hardcoded password assignment (`password = "..."`)

It deliberately does not check `eval` of unsanitized input: that pattern is
too noisy to deny on text alone.

## Limits

- Text patterns only. It cannot trace data flow, follow imports, or judge
  whether a secret is a test fixture.
- Per-tool payload field names (for example `new_string`, `content`, and the
  shape of `edits`) are taken from the research report's examples and must be
  pinned against the generated types for the Claude Code build actually
  installed before relying on this mod.
- Pair with permission deny rules and a real scanner in CI for anything
  beyond this narrow bridge.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/code-scan-bridge
```
