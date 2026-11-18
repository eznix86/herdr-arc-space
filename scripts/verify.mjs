#!/usr/bin/env node
// Repository checks, needing neither Herdr nor dependencies: JSON parses,
// referenced assets exist, and nothing that broke an install is committed.
// CI runs this; `bash scripts/check.sh` is the local companion that asks
// Herdr itself to load every mod.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const problems = [];
const fail = (msg) => problems.push(msg);
const rel = (p) => relative(ROOT, p).split("\\").join("/");
const read = (p) => readFileSync(p, "utf8");

// Docs may name these rules (this checklist does), so only code and config
// are scanned for paths that break another machine.
const SOURCE_EXT = new Set([
  ".js", ".mjs", ".cjs", ".json", ".sh", ".bash", ".yml", ".yaml", ".svg", ".swift", ".html", ".css",
]);
const ASSET_EXT = /\.(svg|png|json)$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(ROOT);

// --- JSON parses -----------------------------------------------------------

const jsonFiles = [
  ...files.filter((p) => /^layouts\/[^/]+\.json$/.test(rel(p))),
  join(ROOT, "keys.json"),
  ...files.filter((p) => /^mods\/[^/]+\/mod\.json$/.test(rel(p))),
].filter((p) => existsSync(p));

const parsed = new Map();
for (const file of jsonFiles) {
  try {
    parsed.set(file, JSON.parse(read(file)));
  } catch (err) {
    fail(`${rel(file)}: invalid JSON (${err.message})`);
  }
}

// --- asset references exist ------------------------------------------------

// Assets are written as `mods/<mod>/<file>.{svg,png,json}`, sometimes with an
// interpolated part: `mods/x/icons/${name}.svg`. Those resolve to a directory
// and a suffix, and at least one file there must match.
function checkToken(token, source) {
  if (!token.startsWith("mods/")) return;
  const hole = token.indexOf("${");
  if (hole === -1) {
    if (!ASSET_EXT.test(token)) return;
    const full = join(ROOT, token);
    if (!existsSync(full) || !statSync(full).isFile()) fail(`${source}: missing asset ${token}`);
    return;
  }
  const close = token.indexOf("}", hole);
  if (close === -1) {
    fail(`${source}: unterminated template path ${token}`);
    return;
  }
  const prefix = token.slice(0, hole);
  const suffix = token.slice(close + 1);
  if (suffix.includes("${")) return; // nested interpolation: cannot tell what it wants
  const ext = extname(suffix);
  if (!ext) return;
  const dir = prefix.endsWith("/") ? prefix.slice(0, -1) : dirname(prefix);
  const full = join(ROOT, dir);
  if (!existsSync(full) || !statSync(full).isDirectory()) {
    fail(`${source}: missing asset folder ${dir}/`);
    return;
  }
  const hit = readdirSync(full).some((name) => name.endsWith(suffix));
  if (!hit) fail(`${source}: no file in ${dir}/ ends with ${suffix}`);
}

const TOKEN_STOP = /[\s"'`)\],;+]/;

// Path tokens run from `mods/` to a delimiter, but a `${...}` hole may contain
// spaces, so it is copied whole.
function tokens(text) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf("mods/", i)) !== -1) {
    let j = i;
    let token = "";
    while (j < text.length) {
      if (text[j] === "$" && text[j + 1] === "{") {
        const close = text.indexOf("}", j + 2);
        if (close === -1) break;
        token += text.slice(j, close + 1);
        j = close + 1;
        continue;
      }
      if (TOKEN_STOP.test(text[j])) break;
      token += text[j];
      j += 1;
    }
    out.push(token);
    i = j > i ? j : i + 5;
  }
  return out;
}

const scanned = files.filter((p) => {
  const r = rel(p);
  return /^mods\/.*\.js$/.test(r) || /^layouts\/[^/]+\.json$/.test(r);
});
for (const file of scanned) {
  for (const token of tokens(read(file))) checkToken(token, rel(file));
}

// --- no paths that break other machines ------------------------------------

// Split so this file does not trip its own scan.
const HOME_PATHS = ["/" + "Users/", "/" + "home/"];
const OLD_BG_DIR = "background" + "s/";

for (const file of files) {
  const ext = extname(file);
  if (!SOURCE_EXT.has(ext)) continue;
  if (statSync(file).size > 1024 * 1024) continue;
  let text;
  try {
    text = read(file);
  } catch {
    continue;
  }
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const needle of HOME_PATHS) {
      if (line.includes(needle)) fail(`${rel(file)}:${i + 1}: absolute home path ${needle}`);
    }
    if (line.includes(OLD_BG_DIR)) fail(`${rel(file)}:${i + 1}: ${OLD_BG_DIR} path (assets live in the mod folder)`);
  });
}

// --- no committed generated files under mods/ ------------------------------

const BANNED_NAMES = new Set(["gpui-kit.d.ts", "herdr.d.ts", "jsconfig.json"]);

// Herdr writes these into a mod folder and .gitignore hides them; only a
// committed copy is a problem (it would travel to other machines).
let tracked = null;
try {
  tracked = new Set(execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0").filter(Boolean));
} catch {
  tracked = null; // no git: treat every file as committed
}

for (const file of files) {
  const r = rel(file);
  if (!r.startsWith("mods/")) continue;
  if (tracked && !tracked.has(r)) continue;
  const name = r.split("/").pop();
  if (BANNED_NAMES.has(name)) fail(`${r}: generated file committed (Herdr rewrites it)`);
  if (name.endsWith(".error")) fail(`${r}: error file committed`);
}

// --- the layout keeps what the theme code looks up -------------------------

for (const [file, data] of parsed) {
  if (!/^layouts\/[^/]+\.json$/.test(rel(file))) continue;
  if (data.id !== "root") fail(`${rel(file)}: root node must have "id": "root"`);
}

const arcLayout = join(ROOT, "layouts/arc-space.json");
if (existsSync(arcLayout)) {
  const data = parsed.get(arcLayout);
  if (data) {
    const ids = new Set();
    const walkIds = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.id) ids.add(node.id);
      for (const child of node.children ?? []) walkIds(child);
    };
    walkIds(data);
    for (const id of ["tint", "grain", "sidebar", "main"]) {
      if (!ids.has(id)) fail(`layouts/arc-space.json: missing node "${id}" (theme code finds it by id)`);
    }
  }
}

// --- report ----------------------------------------------------------------

if (problems.length) {
  for (const p of problems) console.log(p);
  console.log(`verify: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log(`verify: ok (${files.length} files, ${jsonFiles.length} JSON, ${scanned.length} sources)`);
