#!/usr/bin/env node
// Real JS syntax validator (replaces the previous fake "echo 'No lint errors'" script).
// Uses Node's built-in parser (node --check) on every project JS/MJS file.
// No external toolchain dependency required.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "assets/.aistudio"]);

function collectJsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectJsFiles(full, out);
    } else if ([".js", ".mjs"].includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const root = process.cwd();
const files = collectJsFiles(root);
let failures = 0;

for (const file of files) {
  try {
    // .mjs files are ESM by extension. .js files here use import/export too
    // (loaded via <script type="module">), so check them as ESM as well —
    // node --check auto-detects ESM syntax for .js when no CJS-only constructs are present.
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    console.log(`PASS  ${file}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${file}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
  }
}

console.log(`\n${files.length} file(s) checked, ${failures} failure(s).`);
process.exit(failures > 0 ? 1 : 0);
