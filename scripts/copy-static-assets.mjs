#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "assets");
const destination = resolve(root, "dist", "assets");

if (!existsSync(source)) {
  console.error(`Missing static assets directory: ${source}`);
  process.exit(1);
}

mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true, force: true });
console.log(`Copied static assets to ${destination}`);
