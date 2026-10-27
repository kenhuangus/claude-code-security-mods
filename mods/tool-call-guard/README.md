# tool-call-guard

Local, deterministic guard for dangerous Bash and PowerShell commands. It is a
Rulebricks-style pattern implemented locally; it is NOT the Rulebricks
product and it makes no network calls and uses no Rulebricks API.

## Install

```
/plugin install tool-call-guard --marketplace kenhuangus/claude-code-security-mods
```

Try it in one session without installing: `claude --plugin-dir ./mods/tool-call-guard`.

## Use

It runs by itself once loaded. A matching command is refused and Claude is told why.

## Correct events

- `tool.call` with matcher `{ tool: ["Bash", "PowerShell"] }`, checked before `next`:
  `{ deny }` on a match, otherwise `next(e)`. The `Bash` rules apply to Bash and the
  PowerShell rules to PowerShell.

## What it denies

Bash:

- `rm -rf` (also `-fR`, `--recursive --force`, quoted targets) on `/`, `/*`, `~`, `~/`, `$HOME`
- `mkfs`, `dd` writing to `/dev/`, a fork bomb, `chmod -R 777 /`
- `curl` / `wget` piped to `sh` / `bash` / `zsh`

PowerShell and cmd:

- `Remove-Item` (and `ri`, `rm`, `del`, `rd`, `rmdir`, `rd /s`, `del /s`) with
  `-Recurse` on a drive root, `C:\Windows`, `C:\Users`, a profile folder, or
  `$env:USERPROFILE` / `$HOME` / `~` / `%USERPROFILE%`
- `Format-Volume`, `Clear-Disk`, `Initialize-Disk`, `Remove-Partition`, `format C:`
- a download piped to `Invoke-Expression` (`irm ... | iex`) or `iex` on downloaded content
- `Set-MpPreference -DisableRealtimeMonitoring $true` and similar Defender switches

## What changed from 0.1.0

0.1.0 only inspected the `Bash` tool. On Windows Claude runs commands through the
`PowerShell` tool, which none of the rules covered, so every rule could be sidestepped
by switching shells. 0.2.0 adds the PowerShell rules above and a few Bash ones.

## Limits

- Text matching only. It misses `$(...)`, `eval`, wrappers, scripts, and
  aliases, so pair it with permission deny rules and a sandbox for
  destructive commands.
- A quoted path that contains spaces is split on the space, so
  `C:\Program Files` is not recognised as a root target.
- It is a safety net, not a permission system.
- A hook error denies the call (fail closed).

## How to test

```
npm run check
claude plugin validate ./mods/tool-call-guard
```
