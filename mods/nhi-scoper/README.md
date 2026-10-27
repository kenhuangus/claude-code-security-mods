# nhi-scoper

Short-lived credential gate. It fetches a token from a configured broker
only; it never invents a token and never falls back to a long-lived
credential.

## Install

```
/plugin install nhi-scoper --marketplace kenhuangus/claude-code-security-mods
```

The install asks for **Token broker URL**. Leave it empty until you have a broker;
`/nhi-refresh` then explains what to set. Try it in one session without installing:
`claude --plugin-dir ./mods/nhi-scoper`.

## Use

1. `/nhi-refresh` asks your broker for a token and sets `NHI_TOKEN` in this session.
2. Commands that use `aws`, `gcloud`, `gsutil`, `bq`, `az`, `kubectl`, `helm`,
   `terraform`, or `$NHI_TOKEN` / `$env:NHI_TOKEN` are refused until a fresh token exists.
3. `/nhi-revoke` clears the token from this session early.

The broker must answer `200` with JSON: `{ "token": "...", "expiresInMs": 900000 }`
(`ttlMs` also works). The default lifetime is 15 minutes and is capped at 60.

## Correct events

- `command.run` with matcher `{ command: "nhi-refresh" }`: fetches with
  `$.http.fetch` from the broker URL, sets the token with `$.env.set`, and stores
  only its expiry in `$.store`.
- `command.run` with matcher `{ command: "nhi-revoke" }`: unsets `NHI_TOKEN` with
  `$.env.set("NHI_TOKEN", undefined)` and clears the expiry.
- `tool.call` with matcher `{ tool: ["Bash", "PowerShell"] }`, before `next`: a
  credential command with no fresh token gets `{ deny }` ("run /nhi-refresh"); an
  expired token is removed from the environment. A `$NHI_TOKEN`, `${NHI_TOKEN}` or
  `$env:NHI_TOKEN` placeholder is replaced for that one call.

## What changed from 0.1.0

- **The broker response is parsed.** `$.http.fetch` resolves
  `{ status, ok, headers, text }`; 0.1.0 read `response.token` from it directly, so
  against a real broker every refresh failed with "no usable token". 0.2.0 checks
  `ok` and parses the JSON in `text`.
- **`/nhi-refresh` and `/nhi-revoke` work.** They are registered on `$` at
  `session.start` (`$.command.register`). 0.1.0 shipped markdown command files, which only
  create prompt skills; the `command.run` hooks never fired.
- **Expiry now unsets the variable.** `$.env.set(name, undefined)` unsets a
  variable. 0.1.0 documented that no unset existed, so an expired token stayed in the
  environment. Expired tokens are now removed, and `/nhi-revoke` clears one on demand.
- **The token is not written to the shared store.** `$.store` is shared by every
  session on the machine; only the expiry is stored, and the token lives in the
  process environment.
- **The broker URL must be https** (or localhost), and a broker cannot return a
  token longer than 60 minutes.
- **PowerShell is covered**, and `az`, `terraform`, `helm`, `gsutil` and `bq` are gated too.
- **`brokerUrl` is declared in the manifest's `userConfig`**, so it can be set.

## Honest limits

- Clearing the variable is not revocation at the broker: the token stays valid
  there until it expires. The mod never contacts the broker to revoke.
- Unsetting only affects commands and MCP servers started afterward.
- Placeholder replacement puts the token into that one tool call's arguments,
  which the transcript records. Prefer commands that read the environment variable.
- The mod matches command text, so a wrapper such as `bash -c "..."` is only caught
  when the tool name appears in it.
- A hook error denies the call (fail closed).

## How to test

```
npm run check
claude plugin validate ./mods/nhi-scoper
```
