import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");

/** --root dist  → preview GitHub Pages build */
const rootFlag = process.argv.indexOf("--root");
const rootArg = rootFlag >= 0 ? process.argv[rootFlag + 1] : "";
const PUBLIC = rootArg
  ? join(ROOT, rootArg)
  : join(ROOT, process.env.SITE_ROOT || "public");

const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

/** Clean routes without .html (dev public/ layout) */
const ROUTES = {
  "/": "/index.html",
  "/index": "/index.html",
  "/tinyme": "/tinyme.html",
  "/world": "/world.html",
  "/experience": "/tinyme.html",
  "/console": "/console.html",
  "/onboarding": "/onboarding.html",
  "/setup": "/onboarding.html",
  "/showcase": "/showcase.html",
};

const send = (res, status, data, type, cache = "no-cache") => {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": cache,
  });
  res.end(data);
};

const server = createServer(async (req, res) => {
  try {
    let url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (url.length > 1 && url.endsWith("/")) url = url.slice(0, -1);

    // Pages-style folder indexes first (dist/tinyme/index.html)
    if (!extname(url) && url !== "/") {
      try {
        const asIndex = join(PUBLIC, normalize(url).replace(/^(\.\.[/\\])+/, ""), "index.html");
        const data = await readFile(asIndex);
        return send(res, 200, data, "text/html; charset=utf-8");
      } catch {
        /* fall through */
      }
    }

    if (ROUTES[url]) url = ROUTES[url];

    const safe = normalize(url).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(PUBLIC, safe);

    if (!extname(filePath)) {
      try {
        await stat(filePath + ".html");
        filePath += ".html";
      } catch {
        /* fall through */
      }
    }

    const data = await readFile(filePath);
    const ext = extname(filePath);
    const isAsset = ext !== ".html" && ext !== ".js" && ext !== ".css";
    send(res, 200, data, MIME[ext] || "application/octet-stream", isAsset ? "public, max-age=3600" : "no-cache");
  } catch {
    try {
      const data = await readFile(join(PUBLIC, "404.html"));
      send(res, 404, data, "text/html; charset=utf-8");
    } catch {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Ordani Studios 2026\n`);
  console.log(`  root: ${PUBLIC}`);
  console.log(`  http://localhost:${PORT}/`);
  console.log(`  http://localhost:${PORT}/tinyme`);
  console.log(`  http://localhost:${PORT}/world`);
  console.log(`  http://localhost:${PORT}/console`);
  console.log(`  http://localhost:${PORT}/onboarding`);
  console.log(`  http://localhost:${PORT}/showcase\n`);
});
