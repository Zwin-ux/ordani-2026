/**
 * Showcase gallery — lists files from /assets/showcase/manifest.json
 * Edit manifest when you drop screenshots / gifs / mp4s.
 */
(() => {
  "use strict";

  const grid = document.getElementById("sc-grid");
  if (!grid) return;

  const base = (window.__PAGES_BASE__ || "").replace(/\/+$/, "");
  const withBase = (p) => {
    if (!p) return p;
    if (/^https?:\/\//i.test(p)) return p;
    let path = p.startsWith("/") ? p : `/${p}`;
    if (base && (path === base || path.startsWith(`${base}/`))) return path;
    return `${base}${path}`;
  };

  function card(item) {
    const name = item.title || item.file || "frame";
    const src = withBase(item.src || `/assets/showcase/${item.file}`);
    const isVideo = /\.(mp4|webm)$/i.test(src) || item.type === "video";
    const isGif = /\.gif$/i.test(src);
    const fig = document.createElement("figure");
    fig.className = "sc-card";
    if (isVideo) {
      fig.innerHTML = `<video src="${src}" muted loop playsinline autoplay></video><figcaption></figcaption>`;
    } else {
      fig.innerHTML = `<img src="${src}" alt="" loading="lazy" /><figcaption></figcaption>`;
    }
    fig.querySelector("figcaption").textContent = name + (isGif ? " · gif" : isVideo ? " · motion" : "");
    return fig;
  }

  async function load() {
    try {
      const res = await fetch(withBase("/assets/showcase/manifest.json"), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || [];
      if (!items.length) {
        grid.innerHTML =
          '<div class="sc-empty">No shots yet.<br/>Add files under public/assets/showcase/ and list them in manifest.json.</div>';
        return;
      }
      grid.replaceChildren(...items.map(card));
    } catch {
      // Built-in fallbacks so the page never feels empty on first deploy
      const fallbacks = [
        { title: "World · threshold", file: "fallback-world.webp", src: "/assets/world/ch-00/plate.webp" },
        { title: "Onboarding · print plate", file: "fallback-print.webp", src: "/assets/onboarding/world/ob-print.webp" },
        { title: "Domain STOP poster", file: "fallback-stop.jpg", src: "/assets/onboarding/halt/stop-poster.jpg" },
        { title: "Domain STOP motion", file: "fallback-stop.mp4", src: "/assets/onboarding/halt/stop-soft.mp4", type: "video" },
        { title: "Hero space", file: "fallback-hero.webp", src: "/assets/hero/space-poster.webp" },
      ];
      grid.replaceChildren(...fallbacks.map(card));
    }
  }

  load();
})();
