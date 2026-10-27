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
  check(plugin.version === "0.1.0", "plugin.json version must be 0.1.0");

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
