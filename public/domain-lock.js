/**
 * TinyMe domain lock — print-safe short domains only after DNS is locked.
 * Until then: arcade SYSTEM HALT after create (or on GH Pages create).
 */
(() => {
  "use strict";

  const STORAGE_LOCK = "tinyme.domain.locked";
  /** Domains that are live short-link hosts for Ordani (fill after purchase + DNS). */
  const LOCKED_DOMAINS = [
    // "tinyme.cc",
    // "tiny.me",
  ];

  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

  function normalizeDomain(domain) {
    return String(domain || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");
  }

  function isLocalDomain(domain) {
    return LOCAL_HOSTS.has(normalizeDomain(domain));
  }

  function isStaticDemoHost() {
    try {
      const h = location.hostname.toLowerCase();
      return (
        h.endsWith("github.io") ||
        h.endsWith("pages.dev") ||
        h === "ordani.github.io"
      );
    } catch {
      return false;
    }
  }

  /** Placeholder product domains — never treat as print-safe until bought + DNS + LOCKED_DOMAINS. */
  const PLACEHOLDER_DOMAINS = new Set([
    "tinyme.cc",
    "tiny.me",
    "www.tinyme.cc",
    "example.com",
  ]);

  function isDomainLocked(domain) {
    const d = normalizeDomain(domain);
    if (!d) return false;
    if (PLACEHOLDER_DOMAINS.has(d)) return false;
    if (isLocalDomain(d)) return true; // local lab allowed without halt
    if (LOCKED_DOMAINS.includes(d)) return true;
    try {
      const stored = (localStorage.getItem(STORAGE_LOCK) || "").toLowerCase();
      if (stored && stored === d) return true;
    } catch {
      /* ignore */
    }
    return false;
  }

  function needsHalt(domain) {
    const d = normalizeDomain(domain);
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("halt") === "1") return true;
    } catch {
      /* ignore */
    }
    if (isStaticDemoHost()) return true;
    if (PLACEHOLDER_DOMAINS.has(d)) return true;
    return !isDomainLocked(domain);
  }

  function assetUrl(path) {
    const base = String(window.__PAGES_BASE__ || "").replace(/\/+$/, "");
    let p = String(path || "");
    if (!p) return base || "/";
    if (/^https?:\/\//i.test(p)) return p;
    if (!p.startsWith("/")) p = `/${p}`;
    // Build step may already prefix /ordani-2026 — don't double it
    if (base && (p === base || p.startsWith(`${base}/`))) return p;
    return `${base}${p}`;
  }

  function ensureHaltDom() {
    let root = document.getElementById("tm-halt");
    if (root) return root;

    root = document.createElement("div");
    root.id = "tm-halt";
    root.className = "tm-halt";
    root.hidden = true;
    root.setAttribute("role", "alertdialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "tm-halt-title");
    const poster = assetUrl("/assets/onboarding/halt/stop-poster.jpg");
    const video = assetUrl("/assets/onboarding/halt/stop-soft.mp4");
    root.innerHTML = `
      <div class="tm-halt-panel">
        <div class="tm-halt-media" aria-hidden="true">
          <video
            class="tm-halt-video"
            id="tm-halt-video"
            muted
            playsinline
            loop
            autoplay
            poster="${poster}"
          >
            <source src="${video}" type="video/mp4" />
          </video>
          <img
            class="tm-halt-poster"
            id="tm-halt-poster"
            src="${poster}"
            alt=""
            width="540"
            height="960"
            decoding="async"
          />
          <div class="tm-halt-scan"></div>
        </div>
        <div class="tm-halt-copy">
          <p class="tm-halt-kicker mono">SYSTEM HALT // TINYME</p>
          <h2 id="tm-halt-title" class="tm-halt-title">STOP</h2>
          <p class="tm-halt-lead mono" id="tm-halt-lead">
            THIS DOMAIN ISN&rsquo;T CONFIGURED
          </p>
          <p class="tm-halt-body" id="tm-halt-body">
            Actually buy it and lock in TinyMe for Ordani. Until DNS points at the API,
            this is lab data — not a print-safe public address.
          </p>
          <ul class="tm-halt-list mono" id="tm-halt-list">
            <li>1. Buy the short domain</li>
            <li>2. Point DNS at TinyMe API</li>
            <li>3. Set REDIRECT_BASE + lock list</li>
            <li>4. Then mint links that survive print</li>
          </ul>
          <div class="tm-halt-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="tm-halt-ack">OK</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.addEventListener("click", (ev) => {
      if (ev.target === root) closeHalt();
    });
    root.querySelector("#tm-halt-ack")?.addEventListener("click", () => closeHalt());

    return root;
  }

  function showHalt(opts = {}) {
    // Prefer the red demo interrupt — no goat media / halt reel
    if (window.TinyMeDemoError?.show) {
      window.TinyMeDemoError.show();
      return;
    }
    const root = ensureHaltDom();
    const domain = normalizeDomain(opts.domain || "");
    const lead = root.querySelector("#tm-halt-lead");
    const body = root.querySelector("#tm-halt-body");
    if (lead) {
      lead.textContent = "THIS WAS A DEMO TO SHOW AURA";
    }
    if (body) {
      body.textContent =
        opts.message ||
        "AND I DONT WANT TO WASTE MY RAILWAY BACKEND SPACE";
    }
    const list = root.querySelector("#tm-halt-list");
    if (list) list.hidden = true;
    const media = root.querySelector(".tm-halt-media");
    if (media) media.hidden = true;
    root.hidden = false;
    document.body.classList.add("tm-halt-open");
    root.querySelector("#tm-halt-ack")?.focus();
  }

  function closeHalt() {
    const root = document.getElementById("tm-halt");
    if (!root) return;
    root.hidden = true;
    document.body.classList.remove("tm-halt-open");
    const video = document.getElementById("tm-halt-video");
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
  }

  function maybeHaltAfterCreate(link) {
    const domain = link?.domain || "";
    if (isLocalDomain(domain)) return false;
    try {
      if (sessionStorage.getItem("tinyme.halt.lab") === "1" && isLocalDomain(domain)) {
        return false;
      }
    } catch {
      /* ignore */
    }
    if (!needsHalt(domain)) return false;
    showHalt({
      domain,
      message:
        "Actually buy it and lock in TinyMe for Ordani. Until DNS points at the API, this short address is not print-safe infrastructure.",
    });
    return true;
  }

  window.TinyMeDomainLock = {
    isDomainLocked,
    isLocalDomain,
    isStaticDemoHost,
    needsHalt,
    showHalt,
    closeHalt,
    maybeHaltAfterCreate,
    ensureHaltDom,
  };
})();
