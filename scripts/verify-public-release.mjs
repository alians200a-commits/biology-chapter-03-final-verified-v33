#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const questionsPath = resolve(root, "assets/js/questions.js");
const appPath = resolve(root, "assets/js/app.js");
const indexPath = resolve(root, "index.html");
const lockPath = resolve(root, "verification/canonical-source-lock.json");

for (const path of [questionsPath, appPath, indexPath, lockPath]) {
  check(existsSync(path), `Missing required release file: ${path}`);
}

if (failures.length === 0) {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const appSource = readFileSync(appPath, "utf8");
  const indexSource = readFileSync(indexPath, "utf8");

  globalThis.window = {};
  const moduleUrl = new URL(`../assets/js/questions.js?release=${Date.now()}`, import.meta.url);
  const { BIOLOGY_CHAPTER_03 } = await import(moduleUrl.href);

  const source = BIOLOGY_CHAPTER_03.sourceQuestions || [];
  const enrichment = BIOLOGY_CHAPTER_03.enrichmentQuestions || [];
  const all = [...source, ...enrichment];
  const byId = new Map(all.map((q) => [q.id, q]));

  check(sha256(questionsPath) === lock.verifiedReleaseData.questionsJsSha256,
    "questions.js hash does not match the canonically verified release lock.");
  check(source.length === 43, `Expected 43 original questions, found ${source.length}.`);
  check(enrichment.length === 43, `Expected 43 enrichment questions, found ${enrichment.length}.`);
  check(all.length === 86, `Expected 86 total questions, found ${all.length}.`);

  const expectedSourceIds = Array.from({ length: 43 }, (_, i) => `source-${i + 1}`);
  const expectedSourceNums = Array.from({ length: 43 }, (_, i) => i + 1);
  const expectedEnrichmentIds = Array.from({ length: 43 }, (_, i) => `ENR-${String(i + 1).padStart(3, "0")}`);
  check(JSON.stringify(source.map((q) => q.id)) === JSON.stringify(expectedSourceIds),
    "Original question IDs are missing, duplicated, or out of order.");
  check(JSON.stringify(source.map((q) => q.num)) === JSON.stringify(expectedSourceNums),
    "Original question numbers are out of order.");
  check(JSON.stringify(enrichment.map((q) => q.id)) === JSON.stringify(expectedEnrichmentIds),
    "Enrichment question IDs are missing, duplicated, or out of order.");

  check(byId.get("source-16")?.blanks?.length === 7, "source-16 must contain exactly 7 blanks.");
  check(byId.get("ENR-028")?.blanks?.length === 3, "ENR-028 must contain exactly 3 blanks.");
  check(byId.get("source-37")?.subItems?.length === 4, "source-37 must contain 4 branches.");
  check(byId.get("source-41")?.subItems?.length === 3, "source-41 must contain 3 branches.");
  check((byId.get("source-41")?.subItems || []).every((s) => s.options?.length === 4),
    "Every source-41 branch must contain exactly 4 options.");
  check(byId.get("source-42")?.subItems?.length === 2, "source-42 must contain 2 branches.");
  check(byId.get("source-43")?.subItems?.length === 2, "source-43 must contain 2 branches.");

  const drawingIds = source.filter((q) => q.questionType === "drawing").map((q) => q.id);
  check(JSON.stringify(drawingIds) === JSON.stringify(["source-11", "source-17"]),
    "Drawing questions must be source-11 and source-17 only.");
  check(byId.get("ENR-009")?.displayFixedSegments?.includes("توجد الأقراص البينية"),
    "ENR-009 must underline the complete approved phrase.");

  const prohibitedPatterns = [
    /scrollIntoView\s*\(/,
    /window\.scrollTo\s*\(/,
    /window\.scroll\s*\(/,
    /\bautofocus\b/i,
    /overflow-x-(?:auto|scroll)/,
    /q\.id\s*===\s*["'](?:source-|ENR-)/,
  ];
  for (const pattern of prohibitedPatterns) {
    check(!pattern.test(appSource), `Prohibited app.js pattern remains: ${pattern}`);
  }

  const bannedVisibleLabels = ["ممتاز", "متوسط", "ضعيف", "جيد جداً", "جيد جدًا", "متقن", "needs improvement", "mastered"];
  for (const label of bannedVisibleLabels) {
    check(!appSource.includes(label), `Student-facing qualitative label remains in app.js: ${label}`);
  }

  check(appSource.includes('accept="image/png,image/jpeg,image/webp"'),
    "Drawing input must expose only PNG, JPEG, and WebP file types.");
  check(appSource.includes("تأكد من دقة الرسم والتأشيرات في كتابك المنهجي"),
    "Exact drawing post-upload text is missing.");
  check(appSource.includes('const STORAGE_KEY = "school_biology_muscular_system_v3"'),
    "Chapter-specific localStorage key is missing.");
  check(appSource.includes('const DB_NAME = "biology_drawings_db_ch03"'),
    "Chapter-specific IndexedDB name is missing.");
  check(appSource.includes('const STORE_NAME = "student_drawings_ch03"'),
    "Chapter-specific IndexedDB store is missing.");
  check(indexSource.includes("تطبيق مدرسي - الأحياء: الجهاز العضلي"),
    "The HTML title does not identify the muscular-system chapter.");

  const privateSources = [
    resolve(root, "verification/sources/o.pdf"),
    resolve(root, "verification/sources/BIOLOGY_CH03_CONTENT_MASTER.txt"),
  ];
  check(privateSources.every((path) => !existsSync(path)),
    "Private canonical PDF/TXT files must not be committed in the public release.");
}

if (failures.length > 0) {
  console.error("FAIL — PUBLIC_RELEASE_INTEGRITY_CHECK_FAILED");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log("PASS — PUBLIC_RELEASE_INTEGRITY_AND_PRIVACY_VERIFIED");
