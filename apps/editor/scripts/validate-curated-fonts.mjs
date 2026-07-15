import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const editorRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fontsRoot = join(editorRoot, "public", "fonts", "google");
const manifest = JSON.parse(await readFile(join(fontsRoot, "manifest.json"), "utf8"));
const css = await readFile(join(fontsRoot, "curated.css"), "utf8");
const failures = [];
const seenFamilies = new Set();
const seenFiles = new Set();
let woff2Count = 0;
let variableCount = 0;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function validateRecordedFile(record, expectedHeader) {
  const relativePath = record.path.replace(/^\/fonts\/google\//, "");
  const path = join(fontsRoot, ...relativePath.split("/"));
  const bytes = await readFile(path).catch(() => null);
  if (!bytes) {
    failures.push(`Missing ${record.path}.`);
    return;
  }
  if (record.bytes !== bytes.byteLength) failures.push(`Size mismatch for ${record.path}.`);
  if (record.sha256 !== sha256(bytes)) failures.push(`SHA-256 mismatch for ${record.path}.`);
  if (expectedHeader && bytes.subarray(0, expectedHeader.length).toString("ascii") !== expectedHeader) {
    failures.push(`Invalid ${expectedHeader} signature for ${record.path}.`);
  }
}

if (manifest.schemaVersion !== 1) failures.push("Unsupported manifest schema version.");
if (manifest.policy?.format !== "WOFF2 only") failures.push("The cache must remain WOFF2-only.");
if (manifest.policy?.variableFontsPreferred !== true) failures.push("Variable-font preference is missing.");
if (manifest.families?.length !== 15) failures.push("The curated cache must contain exactly 15 families.");

for (const family of manifest.families ?? []) {
  if (seenFamilies.has(family.family)) failures.push(`Duplicate family ${family.family}.`);
  seenFamilies.add(family.family);
  if (family.variable) variableCount += 1;
  if (family.license?.type !== "SIL Open Font License 1.1") {
    failures.push(`${family.family} does not record OFL-1.1.`);
  }
  await validateRecordedFile(family.license);
  await validateRecordedFile(family.metadata);

  for (const file of family.files ?? []) {
    const identity = `${family.family}:${file.variant}`;
    if (seenFiles.has(identity)) failures.push(`Duplicate variant ${identity}.`);
    seenFiles.add(identity);
    if (file.format !== "woff2" || !file.path.endsWith(".woff2")) {
      failures.push(`${identity} is not WOFF2.`);
    }
    if (!css.includes(`url(${JSON.stringify(file.path)})`)) failures.push(`${identity} is absent from curated.css.`);
    await validateRecordedFile(file, "wOF2");
    woff2Count += 1;
  }
}

if (variableCount !== 14) failures.push(`Expected 14 variable families, found ${variableCount}.`);
if (woff2Count !== 29) failures.push(`Expected 29 WOFF2 files, found ${woff2Count}.`);
if (!seenFamilies.has("Space Mono")) failures.push("The documented static exception is missing.");

if (failures.length) throw new Error(`Curated font validation failed:\n- ${failures.join("\n- ")}`);
console.log(
  `Validated ${seenFamilies.size} families, ${variableCount} variable families and ${woff2Count} WOFF2 files.`
);
