import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

let errors = 0;
let warnings = 0;

const check = async (label, fn) => {
  try {
    const result = await fn();
    if (result === true) return;
    if (result === "warn") { warnings++; console.log(`  ⚠ ${label}`); return; }
    errors++;
    console.log(`  ✗ ${label}`);
  } catch (e) {
    errors++;
    console.log(`  ✗ ${label}: ${e.message}`);
  }
};

console.log("\n  Ordani 2026 — Validation\n");

// Check required files exist
const required = ["index.html", "tinyme.html", "styles.css", "app.js", "404.html"];
for (const file of required) {
  await check(`File exists: ${file}`, async () => {
    await readFile(join(PUBLIC, file));
    return true;
  });
}

// Check assets
const assets = [
  "assets/brand/ordani-full-white.webp",
  "assets/brand/tinyme-gold.webp",
  "assets/projects/datapad.webp",
  "assets/team/azara.webp",
  "assets/team/tundra.webp",
  "assets/team/abel.webp",
];
for (const asset of assets) {
  await check(`Asset: ${asset}`, async () => {
    await readFile(join(PUBLIC, asset));
    return true;
  });
}

// Check index.html content
const indexHtml = await readFile(join(PUBLIC, "index.html"), "utf-8");
await check("No fake metrics in homepage", () => {
  if (/enterprise-grade|99\.9% uptime|trusted by/i.test(indexHtml)) return "warn";
  return true;
});
await check("Sample data labeled in homepage", () => {
  const labels = (indexHtml.match(/sample data/gi) || []).length;
  if (labels < 1) return "warn";
  return true;
});
await check("Ordani Studios naming consistent", () => {
  if (/ordani studio[^s]/i.test(indexHtml)) return false;
  return true;
});

// Check tinyme.html content
const tinymeHtml = await readFile(join(PUBLIC, "tinyme.html"), "utf-8");
await check("No fake metrics in TinyMe", () => {
  if (/enterprise-grade|trusted by/i.test(tinymeHtml)) return "warn";
  return true;
});
await check("Sample data labeled in TinyMe", () => {
  const labels = (tinymeHtml.match(/sample data/gi) || []).length;
  if (labels < 2) return "warn";
  return true;
});
await check("Honest product states", () => {
  if (/90%|nearing completion/i.test(tinymeHtml)) return false;
  return true;
});

// Check CSS has design system tokens
const css = await readFile(join(PUBLIC, "styles.css"), "utf-8");
await check("CSS has font imports", () => {
  if (!css.includes("Space+Grotesk") || !css.includes("Inter") || !css.includes("JetBrains+Mono")) return false;
  return true;
});
await check("CSS has reduced-motion media query", () => {
  if (!css.includes("prefers-reduced-motion")) return false;
  return true;
});
await check("CSS has mobile breakpoints", () => {
  if (!css.includes("max-width: 900px") || !css.includes("max-width: 600px")) return false;
  return true;
});

// Check JS has accessibility features
const js = await readFile(join(PUBLIC, "app.js"), "utf-8");
await check("JS respects reduced-motion", () => {
  if (!js.includes("prefers-reduced-motion")) return false;
  return true;
});
await check("JS has skip-link or keyboard support", () => {
  if (!js.includes("focus") && !js.includes("keyboard")) return "warn";
  return true;
});

// Summary
console.log(`\n  Results: ${errors} errors, ${warnings} warnings\n`);
if (errors > 0) {
  console.log("  ✗ Validation failed\n");
  process.exit(1);
} else {
  console.log("  ✓ Validation passed\n");
}
