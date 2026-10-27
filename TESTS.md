# Tests — what was run, and what was not

## Run in this build

- `node --test tests/mods.test.mjs` — Node's built-in test runner over
  `tests/mods.test.mjs`, which imports every `hooks/policy.js` and every
  `hooks/register.js` with a fake `on()` (recording registrations and
  `.catch` handlers), a fake `$` (store, clock, process, http, env, ui),
  and a fake `next()`. It covers, per mod: each deny / drop / allow
  decision, each redaction, each TTL expiry case, each `.catch`
  fail-closed path (called with `next.called=false` and with `true`),
  and that `register()` registers exactly the intended events with no
  duplicate event+matcher pair.
- `node scripts/validate-mods.mjs` — the static checker in this repo. It
  walks `mods/`, verifies `plugin.json` + `hooks.json` + `register.js` +
  `policy.js` + `README.md` exist, that `plugin.json` has the folder name
  / description / version `0.1.0`, that `hooks.json` modules are
  `["./register.js"]`, that `register.js` exports `register`, that event
  names are string literals, that every `on()` registration has a
  `.catch`, and that `hooks/` contains no bare Node globals (`process.`,
  `fs.`, `setTimeout`, `require(`), no destructured `$`, no computed
  `$.` indexing, and no banned claims in code comments (`session.starting`,
  `$.tools`, internal thoughts, tamper-proof, `$.intercept`, `$.block`).

Results are printed by the commands themselves; see the build report for
the counts from the run that shipped this tree.

## NOT run in this build

- No `claude` CLI was available in the build environment (`which claude`
  returned nothing), so the following were NOT run and are NOT claimed:
  - `claude plugin validate ./mods/<mod>`
  - `claude plugin test ./mods/<mod>`
  - Any live Claude session load test (`claude --plugin-dir ...`,
    `/plugin`, `/reload-plugins`)
- No live broker, Promptfoo suite, or Claude Code session was exercised.
  The eval-gate, nhi-scoper, and token-tally handlers were tested only
  against the fake `$` described above.

Run the documented Claude commands on a machine with Claude Code
installed (2.1.287+ for mods; reference coverage in the research report
is CLI/Desktop v2.1.290) before publishing or relying on these mods.
