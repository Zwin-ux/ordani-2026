/**
 * Build static dist/ for GitHub Pages.
 *
 * Usage:
 *   node scripts/build-pages.mjs
 *   PAGES_BASE=/ordani-2026 node scripts/build-pages.mjs
 *   PAGES_BASE= node scripts/build-pages.mjs   # custom domain at site root
 *
 * Project pages need a base path (repo name). User/org pages or custom domains use "".
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");

/** Default = this repo's project Pages path. Override with PAGES_BASE. */
const RAW_BASE = process.env.PAGES_BASE !== undefined ? process.env.PAGES_BASE : "/ordani-2026";
const BASE = String(RAW_BASE || "")
  .replace(/\/+$/, "")
  .replace(/^(?!\/|$)/, (s) => (s ? `/${s}` : s)); // ensure leading / if non-empty

/** Clean routes → source HTML (served as folders/index.html on Pages). */
const CLEAN_ROUTES = {
  tinyme: "tinyme.html",
  world: "world.html",
  experience: "world.html",
  console: "console.html",
  onboarding: "onboarding.html",
  setup: "onboarding.html",
};

const TEXT_EXTS = new Set([".html", ".css", ".js", ".json", ".svg", ".xml", ".txt", ".md", ".webmanifest"]);

function rewriteText(content, filePath) {
  let out = content;
  const ext = extname(filePath).toLowerCase();

  if (BASE) {
    // href="/…", src="/…", poster="/…", action="/…"
    out = out.replace(
      /\b(href|src|poster|action|data-src|data-plate-src)=(["'])\/(?!\/)/g,
      `$1=$2${BASE}/`
    );
    // CSS url(/…)
    out = out.replace(/url\(\s*(['"]?)\/(?!\/)/g, `url($1${BASE}/`);
    // JS / CSS string literals for site roots
    out = out.replace(
      /(["'`])\/(assets|styles\.css|domain-lock\.js|console\.js|onboarding\.js|app\.js|world\.js|data\/)/g,
      `$1${BASE}/$2`
    );
    // Clean route strings in JS/HTML (navigation targets)
    out = out.replace(
      /(["'`])\/(tinyme|world|experience|console|onboarding|setup)(\/|\?|#|["'`])/g,
      `$1${BASE}/$2$3`
    );
    // window.location / replace paths used by console gate
    out = out.replace(
      /(location\.(?:href|replace)\(\s*["'`])\/(onboarding|console)/g,
      `$1${BASE}/$2`
    );
    out = out.replace(
      /(replaceState\(\s*\{\s*\}\s*,\s*["'`][^"'`]*["'`]\s*,\s*["'`])\/(console|onboarding)/g,
      `$1${BASE}/$2`
    );
  }

  if (ext === ".html") {
    // Inject base + static demo meta for tooling
    const inject = [
      BASE ? `<base href="${BASE}/" />` : "",
      `<meta name="tinyme-pages-base" content="${BASE || "/"}" />`,
      `<meta name="tinyme-static-demo" content="1" />`,
      BASE
        ? `<script>window.__PAGES_BASE__=${JSON.stringify(BASE)};window.__STATIC_DEMO__=true;</script>`
        : `<script>window.__PAGES_BASE__="";window.__STATIC_DEMO__=true;</script>`,
    ]
      .filter(Boolean)
      .join("\n  ");

    if (out.includes("</head>")) {
      out = out.replace("</head>", `  ${inject}\n</head>`);
    } else if (out.includes("<head>")) {
      out = out.replace("<head>", `<head>\n  ${inject}`);
    }
  }

  return out;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      files.push(...(await walk(p)));
    } else {
      files.push(p);
    }
  }
  return files;
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // Copy tree first (binary-safe)
  await cp(PUBLIC, DIST, { recursive: true });

  const files = await walk(DIST);
  let rewritten = 0;
  for (const abs of files) {
    const ext = extname(abs).toLowerCase();
    if (!TEXT_EXTS.has(ext)) continue;
    const raw = await readFile(abs, "utf8");
    const next = rewriteText(raw, abs);
    if (next !== raw) {
      await writeFile(abs, next, "utf8");
      rewritten++;
    }
  }

  // Clean URL folders: /tinyme → tinyme/index.html
  for (const [route, srcName] of Object.entries(CLEAN_ROUTES)) {
    const src = join(DIST, srcName);
    try {
      await stat(src);
    } catch {
      console.warn(`skip route /${route}: missing ${srcName}`);
      continue;
    }
    let html = await readFile(src, "utf8");
    // File already rewritten once; folder index is the same content
    const destDir = join(DIST, route);
    await mkdir(destDir, { recursive: true });
    await writeFile(join(destDir, "index.html"), html, "utf8");
  }

  // Root index already present. Write a nojekyll so asset paths aren't mangled.
  await writeFile(join(DIST, ".nojekyll"), "", "utf8");

  // Showcase landing pointer for demo uploads
  const showcaseDir = join(DIST, "showcase");
  await mkdir(showcaseDir, { recursive: true });
  const showcaseHtml = rewriteText(
    await readFile(join(PUBLIC, "showcase.html"), "utf8").catch(() => null) ||
      `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Showcase</title><link rel="stylesheet" href="/styles.css"/></head><body data-page="showcase"><main class="section-shell" style="padding:48px 20px"><h1>Showcase</h1><p class="mono">Drop screenshots &amp; gifs in public/assets/showcase/</p><p><a href="/">Studio</a> · <a href="/tinyme">TinyMe</a> · <a href="/onboarding">Onboarding</a></p></main></body></html>`,
    "showcase.html"
  );
  await writeFile(join(showcaseDir, "index.html"), showcaseHtml, "utf8");

  // Manifest for operators
  await writeFile(
    join(DIST, "pages-build.json"),
    JSON.stringify(
      {
        base: BASE || "/",
        builtAt: new Date().toISOString(),
        routes: ["/", ...Object.keys(CLEAN_ROUTES).map((r) => `/${r}`), "/showcase"],
        note: "Static demo only. Short-link API is not on GitHub Pages.",
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Pages build → dist/`);
  console.log(`  base: ${BASE || "(root)"}`);
  console.log(`  text files rewritten: ${rewritten}`);
  console.log(`  clean routes: ${Object.keys(CLEAN_ROUTES).join(", ")}`);
  console.log(`  open: https://zwin-ux.github.io${BASE || ""}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
