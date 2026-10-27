// Static checker for the mods in this repo. No claude CLI required.
// It checks structure, not runtime behaviour. Runtime behaviour is in tests/.
// Note on the Node-global checks below: $.process, $.fs and $.store are
// mods-API namespaces, not Node globals, so the patterns below only flag a
// bare process./fs. (a dot or $ immediately before the name exempts it).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modsDir = join(root, "mods");
const failures = [];
const passes = [];

function fail(mod, message) {
  failures.push(mod + ": " + message);
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function commentsOf(text) {
  const out = [];
  const block = text.match(/\/\*[\s\S]*?\*\//g);
  if (block) out.push(...block);
  const line = text.match(/\/\/[^\n]*/g);
  if (line) out.push(...line);
  return out.join("\n");
}

const mods = readdirSync(modsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
const marketplace = existsSync(marketplacePath) ? JSON.parse(readFileSync(marketplacePath, "utf8")) : null;
if (!marketplace) {
  fail("marketplace", "missing .claude-plugin/marketplace.json");
}
const listed = new Map((marketplace ? marketplace.plugins : []).map((p) => [p.name, p]));

for (const mod of mods) {
  const dir = join(modsDir, mod);
  const pluginPath = join(dir, ".claude-plugin", "plugin.json");
  const hooksPath = join(dir, "hooks", "hooks.json");
  const registerPath = join(dir, "hooks", "register.js");
  const policyPath = join(dir, "hooks", "policy.js");
  const readmePath = join(dir, "README.md");
  let ok = true;
  const check = (cond, message) => {
    if (!cond) {
      fail(mod, message);
      ok = false;
    }
  };

  if (!existsSync(pluginPath)) {
    check(false, "missing .claude-plugin/plugin.json");
    continue;
  }
  const plugin = JSON.parse(readFileSync(pluginPath, "utf8"));
  check(plugin.name === mod, "plugin.json name must equal folder name");
  check(typeof plugin.description === "string" && plugin.description !== "", "plugin.json description missing");
  check(/^\d+\.\d+\.\d+$/.test(plugin.version || ""), "plugin.json version must be x.y.z");
  check(plugin.version === rootPackage.version, "plugin.json version must equal package.json version " + rootPackage.version);
  check(plugin.author && typeof plugin.author.name === "string", "plugin.json author.name missing");
  check(plugin.license === "MIT", "plugin.json license must be MIT");
  check(typeof plugin.repository === "string" && plugin.repository !== "", "plugin.json repository missing");

  // The marketplace entry must agree with the manifest, or an install shows stale text.
  const entry = listed.get(mod);
  check(Boolean(entry), "not listed in .claude-plugin/marketplace.json");
  if (entry) {
    check(entry.source === "./mods/" + mod, "marketplace source must be ./mods/" + mod);
    check(entry.version === plugin.version, "marketplace version must equal plugin.json version");
    check(entry.description === plugin.description, "marketplace description must equal plugin.json description");
  }

  check(existsSync(hooksPath), "missing hooks/hooks.json");
  if (existsSync(hooksPath)) {
    const hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
    check(JSON.stringify(hooks.modules) === JSON.stringify(["./register.js"]), "hooks.json modules must be ['./register.js']");
  }

  check(existsSync(registerPath), "missing hooks/register.js");
  check(existsSync(policyPath), "missing hooks/policy.js");
  check(existsSync(readmePath), "missing README.md");
  if (!existsSync(registerPath)) continue;

  const registerText = readFileSync(registerPath, "utf8");
  const policyText = existsSync(policyPath) ? readFileSync(policyPath, "utf8") : "";
  const hookTexts = [registerText, policyText];

  check(/export\s+function\s+register\s*\(/.test(registerText), "register.js must export register()");
  check(!/import\s*\(/.test(registerText), "register.js must not use dynamic import()");
  check(!/\brequire\s*\(/.test(registerText), "register.js must not use require()");

  // Event names must be string literals, and every on() must have .catch.
  const onIndices = [];
  const onPattern = /(?<![\w.])on\(/g;
  let match;
  while ((match = onPattern.exec(registerText)) !== null) {
    onIndices.push(match.index);
  }
  check(onIndices.length > 0, "register.js has no on() registrations");
  for (const index of onIndices) {
    const rest = registerText.slice(index);
    const quoted = /^on\(\s*(['"])[A-Za-z0-9_.*-]+['"]/.test(rest);
    check(quoted, "on() event name must be a string literal at offset " + index);
  }
  for (let i = 0; i < onIndices.length; i++) {
    const start = onIndices[i];
    const end = i + 1 < onIndices.length ? onIndices[i + 1] : registerText.length;
    const slice = registerText.slice(start, end);
    check(slice.includes(".catch("), "on() registration at offset " + start + " has no .catch");
  }

  // A command.run hook only fires for a command the module registers on $ by a literal name.
  // A commands/<name>.md file is a different thing (a namespaced prompt skill that the model runs,
  // never the hook), so it must not exist for a command the module answers itself.
  const commandNames = [...registerText.matchAll(/command:\s*"([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
  for (const name of new Set(commandNames)) {
    const registered = new RegExp("\\$\\.command\\.register\\(\\{\\s*name:\\s*\"" + name + "\"\\s*,\\s*description:\\s*\"[^\"]+\"").test(registerText);
    check(registered, "command " + name + " is answered in command.run but never registered with $.command.register");
    check(!existsSync(join(dir, "commands", name + ".md")), "commands/" + name + ".md would shadow the registered command");
  }
  check(!existsSync(join(dir, "commands")), "commands/ folder found; use $.command.register instead");

  for (const [label, text] of [["register.js", registerText], ["policy.js", policyText]]) {
    const code = stripComments(text);
    check(!/(?<![\w$.])process\./.test(code), label + ": bare process. (Node global) found");
    check(!/(?<![\w$.])fs\./.test(code), label + ": bare fs. (Node global) found");
    check(!/\bsetTimeout\b/.test(code), label + ": setTimeout found");
    check(!/\brequire\s*\(/.test(code), label + ": require() found");
    check(!/\$\s*\[/.test(code), label + ": computed $. indexing found");
    check(!/const\s*\{[^}]*\}\s*=\s*\$/.test(code), label + ": destructured $ found");
    check(!/let\s*\{[^}]*\}\s*=\s*\$/.test(code), label + ": destructured $ found");
    check(!/=\s*\$\.[a-zA-Z]+\s*[,;]/.test(code), label + ": $ namespace assigned to a variable found");
    const comments = commentsOf(text);
    for (const banned of ["session.starting", "$.tools", "internal thoughts", "tamper-proof", "$.intercept", "$.block"]) {
      check(!comments.includes(banned), label + ": banned claim in comment: " + banned);
    }
  }
  if (ok) passes.push(mod);
}

if (marketplace) {
  if (marketplace.plugins.length !== mods.length) {
    fail("marketplace", "lists " + marketplace.plugins.length + " plugins but mods/ has " + mods.length);
  }
  for (const name of listed.keys()) {
    if (!mods.includes(name)) {
      fail("marketplace", "lists " + name + " but mods/" + name + " does not exist");
    }
  }
  if (marketplace.metadata && marketplace.metadata.version !== rootPackage.version) {
    fail("marketplace", "metadata.version must equal package.json version " + rootPackage.version);
  }
}

for (const mod of passes) {
  console.log("PASS " + mod);
}
for (const message of failures) {
  console.log("FAIL " + message);
}
console.log("mods: " + mods.length + ", passed: " + passes.length + ", failures: " + failures.length);
if (failures.length > 0) {
  process.exit(1);
}
