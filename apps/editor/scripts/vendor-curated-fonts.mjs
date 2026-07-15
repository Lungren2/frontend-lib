import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const curatedFonts = [
  {
    family: "Inter",
    slug: "inter",
    role: "neutral UI sans",
    rationale: "Default-grade legibility with optical sizing.",
  },
  {
    family: "DM Sans",
    slug: "dmsans",
    role: "humanist UI sans",
    rationale: "Warmer interface voice with optical sizing.",
  },
  {
    family: "Plus Jakarta Sans",
    slug: "plusjakartasans",
    role: "geometric UI sans",
    rationale: "Friendly geometric alternative used by multiple presets.",
  },
  { family: "Geist", slug: "geist", role: "modern UI sans", rationale: "Compact contemporary product typography." },
  { family: "Outfit", slug: "outfit", role: "display sans", rationale: "Single-style geometric display range." },
  {
    family: "Oxanium",
    slug: "oxanium",
    role: "technical display",
    rationale: "Distinct technical voice not covered by neutral sans faces.",
  },
  {
    family: "Source Serif 4",
    slug: "sourceserif4",
    role: "text serif",
    rationale: "Broad weight and optical-size range for editorial text.",
  },
  {
    family: "Lora",
    slug: "lora",
    role: "warm text serif",
    rationale: "Readable contemporary serif used throughout the presets.",
  },
  {
    family: "Playfair Display",
    slug: "playfairdisplay",
    role: "display serif",
    rationale: "High-contrast editorial display option.",
  },
  {
    family: "Merriweather",
    slug: "merriweather",
    role: "screen serif",
    rationale: "Screen-oriented serif with optical size and width axes.",
  },
  {
    family: "JetBrains Mono",
    slug: "jetbrainsmono",
    role: "coding mono",
    rationale: "Primary coding face with a broad variable weight range.",
  },
  {
    family: "Fira Code",
    slug: "firacode",
    role: "ligature coding mono",
    rationale: "Programming ligatures in one variable roman file.",
  },
  {
    family: "Geist Mono",
    slug: "geistmono",
    role: "modern mono",
    rationale: "Neutral companion to Geist for product interfaces.",
  },
  {
    family: "Source Code Pro",
    slug: "sourcecodepro",
    role: "humanist mono",
    rationale: "Readable humanist alternative for dense code and data.",
  },
  {
    family: "Space Mono",
    slug: "spacemono",
    role: "geometric display mono",
    rationale: "Deliberate static exception for its distinctive voice and frequent preset use.",
    variants: ["regular", "italic", "700", "700italic"],
  },
];

const editorRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputRoot = join(editorRoot, "public", "fonts", "google");
const catalogueEndpoint = "https://www.googleapis.com/webfonts/v1/webfonts?capability=VF&capability=WOFF2";
const apiKey = process.env.GOOGLE_FONTS_API_KEY;

if (!apiKey)
  throw new Error("GOOGLE_FONTS_API_KEY is required. Load apps/editor/.env.local before running this script.");

async function fetchOk(url, options) {
  const response = await fetch(url, options);
  if (!response.ok)
    throw new Error(`Request failed (${response.status}) for ${new URL(url).origin}${new URL(url).pathname}`);
  return response;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function download(url, destination) {
  const bytes = Buffer.from(await (await fetchOk(url)).arrayBuffer());
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return { bytes: bytes.byteLength, sha256: sha256(bytes) };
}

function selectedVariants(config, font) {
  if (config.variants) return config.variants;
  return ["regular", "italic"].filter((variant) => font.files[variant]);
}

function cssWeight(variant, axes) {
  const weight = axes.find((axis) => axis.tag === "wght");
  if (weight) return `${weight.start} ${weight.end}`;
  const numeric = Number.parseInt(variant, 10);
  return Number.isFinite(numeric) ? String(numeric) : "400";
}

function cssStretch(axes) {
  const width = axes.find((axis) => axis.tag === "wdth");
  return width ? `  font-stretch: ${width.start}% ${width.end}%;\n` : "";
}

const catalogueResponse = await fetchOk(`${catalogueEndpoint}&key=${encodeURIComponent(apiKey)}`);
const catalogue = await catalogueResponse.json();
const fontsByFamily = new Map(catalogue.items.map((font) => [font.family, font]));
const commitResponse = await fetchOk("https://api.github.com/repos/google/fonts/commits/main", {
  headers: { "user-agent": "frontend-lib-font-vendor" },
});
const googleFontsCommit = (await commitResponse.json()).sha;
const manifestFamilies = [];
const cssBlocks = [];

for (const config of curatedFonts) {
  const font = fontsByFamily.get(config.family);
  if (!font) throw new Error(`Google Fonts catalogue is missing ${config.family}.`);
  const axes = (font.axes ?? []).filter(
    (axis) => typeof axis.tag === "string" && Number.isFinite(axis.start) && Number.isFinite(axis.end)
  );
  const variants = selectedVariants(config, font);
  if (!variants.length) throw new Error(`${config.family} has no selected variants.`);

  const familyDirectory = join(outputRoot, config.slug);
  const licenseUrl = `https://raw.githubusercontent.com/google/fonts/${googleFontsCommit}/ofl/${config.slug}/OFL.txt`;
  const metadataUrl = `https://raw.githubusercontent.com/google/fonts/${googleFontsCommit}/ofl/${config.slug}/METADATA.pb`;
  const license = await download(licenseUrl, join(familyDirectory, "OFL.txt"));
  const metadata = await download(metadataUrl, join(familyDirectory, "METADATA.pb"));
  const files = [];

  for (const variant of variants) {
    const sourceUrl = font.files[variant];
    if (!sourceUrl) throw new Error(`${config.family} is missing the ${variant} variant.`);
    if (new URL(sourceUrl).pathname.split(".").pop() !== "woff2") {
      throw new Error(`${config.family} ${variant} is not WOFF2.`);
    }
    const filename = `${variant}.woff2`;
    const destination = join(familyDirectory, filename);
    const downloaded = await download(sourceUrl.replace(/^http:/, "https:"), destination);
    const publicPath = `/fonts/google/${config.slug}/${filename}`;
    const style = variant.includes("italic") ? "italic" : "normal";
    const weight = cssWeight(variant, axes);

    files.push({ variant, path: publicPath, sourceUrl, format: "woff2", ...downloaded });
    cssBlocks.push(
      [
        `/* ${config.role}; ${font.version}, ${variant}. */`,
        "@font-face {",
        `  font-family: ${JSON.stringify(config.family)};`,
        `  src: url(${JSON.stringify(publicPath)}) format("woff2");`,
        `  font-style: ${style};`,
        `  font-weight: ${weight};`,
        `${cssStretch(axes)}  font-display: swap;`,
        "}",
      ].join("\n")
    );
  }

  manifestFamilies.push({
    family: config.family,
    slug: config.slug,
    category: font.category,
    role: config.role,
    rationale: config.rationale,
    version: font.version,
    lastModified: font.lastModified,
    variable: axes.length > 0,
    axes,
    variants,
    files,
    license: {
      type: "SIL Open Font License 1.1",
      path: `/fonts/google/${config.slug}/OFL.txt`,
      sourceUrl: licenseUrl,
      ...license,
    },
    metadata: {
      path: `/fonts/google/${config.slug}/METADATA.pb`,
      sourceUrl: metadataUrl,
      ...metadata,
    },
  });
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    catalogueEndpoint,
    catalogueCapabilities: ["VF", "WOFF2"],
    googleFontsRepository: "https://github.com/google/fonts",
    googleFontsCommit,
  },
  policy: {
    format: "WOFF2 only",
    glyphCoverage: "Complete supported-script coverage returned by the Web Fonts Developer API",
    variableFontsPreferred: true,
    runtimeStatus: "vendored but not imported by the editor",
    staticException: "Space Mono regular/italic at weights 400 and 700",
  },
  families: manifestFamilies,
};

await mkdir(outputRoot, { recursive: true });
await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(
  join(outputRoot, "curated.css"),
  `/* Generated by apps/editor/scripts/vendor-curated-fonts.mjs. Not imported yet. */\n\n${cssBlocks.join("\n\n")}\n`,
  "utf8"
);

const assetCount = manifestFamilies.reduce((total, family) => total + family.files.length, 0);
const assetBytes = manifestFamilies.flatMap((family) => family.files).reduce((total, file) => total + file.bytes, 0);
console.log(
  `Vendored ${manifestFamilies.length} curated Google Font families (${assetCount} WOFF2 files, ${assetBytes} bytes) at ${relative(editorRoot, outputRoot)}.`
);
