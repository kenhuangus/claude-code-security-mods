# nhi-scoper

Short-lived credential gate. It fetches a token from a configured broker
only; it never invents a token and never falls back to a long-lived
credential.

## Correct events

- `command.run` with matcher `{ command: "nhi-refresh" }`: fetches via
  `$.http.fetch` to a broker URL from plugin userConfig, stores
  token + expiry in `$.store`, and sets `$.env` for subsequently started
  commands / MCP servers only.
- `tool.call` with matcher `{ tool: "Bash" }`, before `next`: if the command
  uses `aws` / `gcloud` / `kubectl` or contains `$NHI_TOKEN` and no fresh
  token exists, `{ deny }` with "run /nhi-refresh". If a fresh token exists
  and the command contains `$NHI_TOKEN`, that one call's placeholder is
  replaced; otherwise the call passes unchanged.

## Honest limits

- There is no dedicated just-in-time API and no env unset method. Setting
  a token with `$.env.set` is NOT revocation: an issued token stays set
  until it expires or the session ends.
- If no broker is configured, the command returns setup instructions
  instead of inventing a token.
- The token is never written to a returned text, a log line, or a command
  other than the single call that contained the placeholder. Note that
  placeholder replacement does put the token into that one tool call's
  arguments, which the transcript records; prefer commands that read
  `$NHI_TOKEN` from the environment when possible.
- The broker response shape (`{ token, expiresInMs }`) and the userConfig
  field name (`brokerUrl`) are not pinned against a real manifest schema
  in this build; pin both before shipping.

## How to test

```bash
node --test tests/mods.test.mjs
node scripts/validate-mods.mjs
# Documented Claude commands, not run in the build environment (no claude CLI):
# claude plugin validate ./mods/nhi-scoper
```
