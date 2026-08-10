/**
 * TinyMe onboarding — production path
 * Welcome → Create → Live address (auto-copy)
 */
(() => {
  "use strict";

  const STORAGE_BASE = "tinyme.console.apiBase";
  const STORAGE_KEY = "tinyme.console.apiKey";
  const STORAGE_SESSION = "tinyme.console.session";
  const STORAGE_DONE = "tinyme.onboarding.done";
  const STORAGE_FIRST = "tinyme.onboarding.firstLink";
  const STORAGE_INTENT = "tinyme.onboarding.intent";
  const DEFAULT_BASE = "http://localhost:8080";
  const DEFAULT_DEV_KEY = "dev-local-key";

  const WORLD = {
    void: {
      plate: "/assets/onboarding/world/ob-void.webp",
      label: "",
      headline: "",
      sub: "",
    },
    print: {
      plate: "/assets/onboarding/world/ob-print.webp",
      slugHint: "print",
      done: "Share it on print. Change the destination anytime in the console.",
    },
    qr: {
      plate: "/assets/onboarding/world/ob-qr.webp",
      slugHint: "scan",
      done: "Encode this in your QR. Change the destination anytime in the console.",
    },
    social: {
      plate: "/assets/onboarding/world/ob-social.webp",
      slugHint: "go",
      done: "Drop this in bio and posts. Change the destination anytime in the console.",
    },
    swap: {
      plate: "/assets/onboarding/world/ob-swap.webp",
      slugHint: "live",
      done: "Share once. Swap the destination anytime in the console.",
    },
  };

  const CHAPTER_VIDEO = {
    print: "/assets/onboarding/world/ob-print-soft.mp4",
    qr: "/assets/onboarding/world/ob-qr-soft.mp4",
    social: "/assets/onboarding/world/ob-social-soft.mp4",
    swap: "/assets/onboarding/world/ob-swap-soft.mp4",
  };

  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);

  // 0 welcome · 1 create · 2 done
  const steps = [$("step-welcome"), $("step-link"), $("step-done")];

  const els = {
    back: $("ob-back"),
    progress: $("ob-progress"),
    dots: Array.from(document.querySelectorAll(".ob-dot")),
    btnStart: $("btn-start"),
    intentChips: $("intent-chips"),
    formLink: $("form-link"),
    dest: $("ob-dest"),
    slug: $("ob-slug"),
    domain: $("ob-domain"),
    btnAdvanced: $("btn-advanced"),
    advanced: $("ob-advanced"),
    preview: $("ob-preview"),
    previewTo: $("ob-preview-to"),
    previewCard: $("ob-preview-card"),
    linkHint: $("link-hint"),
    btnCreate: $("btn-create"),
    short: $("ob-short"),
    successMeta: $("ob-success-meta"),
    successTo: $("ob-success-to"),
    localResolve: $("ob-local-resolve"),
    success: $("ob-success"),
    doneBody: $("done-body"),
    doneHint: $("done-hint"),
    btnCopy: $("btn-copy"),
    btnConsole: $("btn-console"),
    btnAnother: $("btn-another"),
    footStatus: $("ob-foot-status"),
    worldVideo: document.querySelector("[data-ob-world-video]"),
    worldVideoSource: document.querySelector("[data-ob-world-source]"),
  };

  let step = 0;
  let intent = "print";
  let transitioning = false;

  /* ---------- Config ---------- */

  function stripTrailingSlash(s) {
    return String(s || "").replace(/\/+$/, "");
  }

  function getSessionToken() {
    return (sessionStorage.getItem(STORAGE_SESSION) || "").trim();
  }

  function getBearer() {
    const key = (sessionStorage.getItem(STORAGE_KEY) || "").trim();
    if (key) return key;
    return getSessionToken();
  }

  function getConfig() {
    return {
      base: stripTrailingSlash((sessionStorage.getItem(STORAGE_BASE) || DEFAULT_BASE).trim()),
      key: getBearer(),
    };
  }

  function isLocalBase(base) {
    try {
      const u = new URL(base.includes("://") ? base : `http://${base}`);
      return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname);
    } catch {
      return false;
    }
  }

  function isLocalLinkDomain(domain) {
    const raw = String(domain || "").toLowerCase();
    const host = raw.startsWith("[") ? raw.slice(0, raw.indexOf("]") + 1) : raw.split(":")[0];
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
  }

  function loadConfig() {
    const base = stripTrailingSlash(sessionStorage.getItem(STORAGE_BASE) || DEFAULT_BASE);
    let key = sessionStorage.getItem(STORAGE_KEY) || "";
    if (!isLocalBase(base) && key === DEFAULT_DEV_KEY) {
      key = "";
      sessionStorage.removeItem(STORAGE_KEY);
    }
    if (!key && !getSessionToken() && isLocalBase(base)) {
      key = DEFAULT_DEV_KEY;
      sessionStorage.setItem(STORAGE_KEY, key);
    }
    sessionStorage.setItem(STORAGE_BASE, base);
    return { base, key };
  }

  function markDone() {
    try {
      localStorage.setItem(STORAGE_DONE, "1");
    } catch {
      /* private mode */
    }
  }

  /* ---------- API ---------- */

  class ApiError extends Error {
    constructor(status, message, body) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  }

  async function api(method, path, body) {
    const { base, key } = getConfig();
    if (!base) throw new ApiError(0, "offline");

    const headers = { Accept: "application/json" };
    if (key) headers.Authorization = `Bearer ${key}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers,
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, "offline");
    }

    if (res.status === 204) return null;
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (!res.ok) throw new ApiError(res.status, friendlyError(res.status, data), data);
    return data;
  }

  function friendlyError(status, data) {
    const serverMsg =
      (data && (data.error || data.message)) ||
      (typeof data === "string" ? data : null);
    if (status === 401 || status === 403) {
      return "API key rejected. Check the key and try again.";
    }
    if (status === 409) return serverMsg || "That short path is taken. Try another slug.";
    if (status >= 500) return serverMsg || "Server error. Try again in a moment.";
    return serverMsg || `Request failed (${status}).`;
  }

  async function checkHealth() {
    const { base } = getConfig();
    let res;
    try {
      res = await fetch(`${base}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new ApiError(0, "offline");
    }
    if (!res.ok) throw new ApiError(res.status, "offline");
    return "ok";
  }

  async function ensureReady() {
    loadConfig();
    await checkHealth();
    try {
      await api("GET", "/api/links?limit=1&offset=0");
    } catch (err) {
      if (err.status === 401 || err.status === 403) throw err;
    }
    return true;
  }

  /* ---------- UI ---------- */

  function setHint(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("is-ok", "is-err");
    if (text && kind === "ok") el.classList.add("is-ok");
    if (text && kind === "err") el.classList.add("is-err");
  }

  function setBusy(btn, busy, idleLabel) {
    if (!btn) return;
    btn.disabled = busy;
    if (busy) {
      btn.dataset.prev = btn.textContent;
      btn.textContent = btn.dataset.busyLabel || "Working…";
    } else if (idleLabel) {
      btn.textContent = idleLabel;
    } else if (btn.dataset.prev) {
      btn.textContent = btn.dataset.prev;
    }
  }

  function hostFromUrl(url) {
    try {
      const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      return new URL(candidate).host.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function shortAddress(domain, slug) {
    return `${domain}/${slug}`;
  }

  function rememberedDomain() {
    try {
      const first = JSON.parse(sessionStorage.getItem(STORAGE_FIRST) || "null");
      if (first?.domain) return first.domain;
      return String(first?.short || "").split("/")[0] || "";
    } catch {
      return "";
    }
  }

  function updatePreview() {
    if (!els.preview) return;
    const domain = (els.domain?.value.trim() || rememberedDomain() || "tinyme.cc").toLowerCase();
    const slug = els.slug?.value.trim() || "auto";
    els.preview.textContent = `${domain}/${slug}`;
    const dest = els.dest?.value.trim() || "";
    const host = hostFromUrl(dest);
    if (els.previewTo) els.previewTo.textContent = host ? `→ ${host}` : "→ paste a destination";
    els.previewCard?.classList.toggle("has-dest", !!host);
  }

  function syncWorldVideo(id, chapter) {
    const video = els.worldVideo;
    if (!video) return;

    const source = CHAPTER_VIDEO[id];
    // Play soft loop on create step (1) and done (2) for presence — not on welcome
    const allowed = Boolean(source) && !reduceMotion() && (step === 1 || step === 2);

    try {
      video.pause();
      video.currentTime = 0;
    } catch {
      /* ignore */
    }

    video.classList.remove("is-active");
    if (!allowed) {
      video.hidden = true;
      return;
    }

    if (video.dataset.source !== source) {
      video.dataset.source = source;
      video.poster = chapter.plate;
      if (els.worldVideoSource) {
        els.worldVideoSource.src = source;
        video.load();
      } else {
        video.src = source;
      }
    }

    video.hidden = false;
    video.classList.add("is-active");
    const play = video.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
  }

  function setWorldChapter(chapterId) {
    const id = WORLD[chapterId] ? chapterId : "void";
    const chapter = WORLD[id];
    document.body.dataset.obChapter = id;
    document.querySelectorAll(".ob-world-plate").forEach((plate) => {
      plate.classList.toggle("is-active", plate.dataset.plate === id);
    });
    syncWorldVideo(id, chapter);
  }

  function applyIntent(next) {
    intent = next in WORLD && next !== "void" ? next : "print";
    try {
      sessionStorage.setItem(STORAGE_INTENT, intent);
    } catch {
      /* ignore */
    }
    const cfg = WORLD[intent] || WORLD.print;
    if (els.slug && !els.slug.value.trim()) {
      els.slug.placeholder = cfg.slugHint || "auto";
    }
    if (els.doneBody) {
      els.doneBody.textContent =
        cfg.done || "Share it now. Change the destination anytime in the console.";
    }
    if (els.intentChips) {
      els.intentChips.querySelectorAll(".ob-chip").forEach((chip) => {
        const on = chip.dataset.intent === intent;
        chip.classList.toggle("is-selected", on);
        chip.setAttribute("aria-checked", on ? "true" : "false");
        chip.tabIndex = on ? 0 : -1;
      });
    }
    if (step >= 1) setWorldChapter(intent);
    updatePreview();
  }

  /** Red game-style interrupt — never an API console. */
  function showNotLive() {
    if (window.TinyMeDemoError?.show) {
      window.TinyMeDemoError.show();
      return;
    }
    setHint(
      els.linkHint,
      "THIS WAS A DEMO TO SHOW AURA AND I DONT WANT TO WASTE MY RAILWAY BACKEND SPACE",
      "err"
    );
  }

  function closeSheet() {
    if (window.TinyMeDemoError?.close) window.TinyMeDemoError.close();
  }

  function goTo(next, { push = true } = {}) {
    if (transitioning || next === step) return;
    if (next < 0 || next >= steps.length) return;

    const prevEl = steps[step];
    const nextEl = steps[next];
    if (!nextEl) return;
    transitioning = true;

    if (prevEl) {
      prevEl.classList.remove("is-active");
      prevEl.classList.add("is-exit");
      window.setTimeout(() => {
        prevEl.hidden = true;
        prevEl.classList.remove("is-exit");
      }, 220);
    }

    nextEl.hidden = false;
    void nextEl.offsetWidth;
    nextEl.classList.add("is-active");

    step = next;
    document.body.dataset.obStep = String(step);
    syncChrome();

    if (step === 0) setWorldChapter("void");
    else setWorldChapter(intent);

    window.setTimeout(() => {
      let focusable = null;
      if (step === 1) focusable = els.dest;
      else if (step === 2) focusable = els.btnCopy;
      else focusable = nextEl.querySelector("h1, button");
      if (focusable?.focus) {
        try {
          focusable.focus({ preventScroll: true });
        } catch {
          focusable.focus();
        }
      }
      transitioning = false;
    }, 240);

    if (push) {
      try {
        // A Pages build injects a <base> tag. A bare hash would resolve against
        // that base and rewrite /onboarding/ to the site root on project Pages.
        history.replaceState({ obStep: step }, "", `${location.pathname}#${step}`);
      } catch {
        /* ignore */
      }
    }
  }

  function syncChrome() {
    if (els.back) els.back.hidden = step === 0;
    if (els.progress) {
      els.progress.hidden = step === 0;
      els.progress.setAttribute("aria-valuenow", String(Math.max(1, step)));
      els.progress.setAttribute("aria-valuemax", "2");
    }
    els.dots.forEach((dot, i) => {
      // 3 dots for welcome/create/done but welcome hides bar
      dot.classList.toggle("is-current", i === step);
      dot.classList.toggle("is-done", i < step);
    });
  }

  function playSuccessReveal() {
    if (!els.success) return;
    els.success.classList.remove("is-pop", "is-live");
    void els.success.offsetWidth;
    els.success.classList.add("is-pop");
    window.setTimeout(() => {
      els.success.classList.add("is-live");
    }, reduceMotion() ? 0 : 380);
  }

  function normalizeDestination(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(candidate);
      return /^https?:$/.test(parsed.protocol) ? parsed.toString() : "";
    } catch {
      return "";
    }
  }

  async function createLink() {
    setHint(els.linkHint, "");
    const destination = normalizeDestination(els.dest.value);
    if (!destination) {
      setHint(els.linkHint, "Paste a valid web address.", "err");
      els.dest.setAttribute("aria-invalid", "true");
      els.dest.focus();
      return;
    }
    els.dest.value = destination;
    els.dest.removeAttribute("aria-invalid");

    // GitHub Pages is intentionally presentation-only. Avoid even attempting
    // the local API there so the demo interrupt is immediate and console-clean.
    if (window.__STATIC_DEMO__) {
      showNotLive();
      return;
    }

    setBusy(els.btnCreate, true);
    els.btnCreate.dataset.busyLabel = "Creating…";
    els.btnCreate.textContent = "Creating…";

    try {
      await ensureReady();
    } catch {
      setBusy(els.btnCreate, false, "Create link");
      showNotLive();
      return;
    }

    const body = { destination };
    const slug = els.slug?.value.trim();
    const domain = els.domain?.value.trim();
    if (slug) body.slug = slug;
    if (domain) body.domain = domain;

    try {
      const data = await api("POST", "/api/links", body);
      const link = data.link || data;
      const short =
        link.domain && link.slug ? shortAddress(link.domain, link.slug) : "created";
      const host = hostFromUrl(destination);

      try {
        sessionStorage.setItem(
          STORAGE_FIRST,
          JSON.stringify({
            short,
            id: link.id,
            dest: destination,
            domain: link.domain,
            intent,
            at: Date.now(),
          })
        );
      } catch {
        /* ignore */
      }

      els.short.textContent = short;
      if (els.successMeta) els.successMeta.textContent = "Tap the address to copy again";
      els.successTo.textContent = host ? `Opens ${host}` : destination;
      if (els.localResolve) {
        const localLink = isLocalLinkDomain(link.domain);
        els.localResolve.hidden = !localLink;
        els.localResolve.textContent = localLink
          ? `Local test: ${getConfig().base}/${link.slug}`
          : "";
      }

      markDone();
      goTo(2);
      playSuccessReveal();
      window.setTimeout(() => onCopy({ silent: true }), reduceMotion() ? 80 : 480);

      // Demo / unlocked domain → red game error (aura), not API console
      try {
        const lock = window.TinyMeDomainLock;
        if (lock?.isStaticDemoHost?.() || lock?.needsHalt?.(link.domain)) {
          showNotLive();
        }
      } catch {
        /* ignore */
      }
    } catch (err) {
      // Never surface API base / key / "cannot reach" console chrome
      if (err.status === 401 || err.status === 403 || err.status === 0 || err.message === "offline") {
        showNotLive();
      } else {
        const msg = err.message || "";
        if (/unreachable|API|authorization|localhost|Bearer/i.test(msg)) {
          showNotLive();
        } else {
          setHint(els.linkHint, msg || "Could not create that link.", "err");
        }
      }
    } finally {
      setBusy(els.btnCreate, false, "Create link");
    }
  }

  function onCreate(ev) {
    ev.preventDefault();
    void createLink();
  }

  async function onCopy(opts = {}) {
    const text = (els.short?.textContent || "").trim();
    if (!text) return;
    if (!opts.silent) setHint(els.doneHint, "");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setHint(els.doneHint, opts.silent ? "Copied — ready to paste." : "Copied.", "ok");
      els.btnCopy?.classList.add("is-done");
      window.setTimeout(() => els.btnCopy?.classList.remove("is-done"), 1200);
    } catch {
      if (!opts.silent) {
        setHint(els.doneHint, "Select the address and copy manually.", "err");
      }
    }
  }

  function onAnother() {
    setHint(els.linkHint, "");
    setHint(els.doneHint, "");
    if (els.dest) els.dest.value = "";
    if (els.slug) els.slug.value = "";
    updatePreview();
    goTo(1);
  }

  function bind() {
    els.btnStart.addEventListener("click", () => {
      applyIntent(intent);
      goTo(1);
    });

    if (els.intentChips) {
      els.intentChips.addEventListener("click", (ev) => {
        const chip = ev.target.closest(".ob-chip");
        if (!chip) return;
        applyIntent(chip.dataset.intent || "print");
      });

      els.intentChips.addEventListener("keydown", (ev) => {
        const chips = Array.from(els.intentChips.querySelectorAll(".ob-chip"));
        const current = chips.findIndex((c) => c.classList.contains("is-selected"));
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
          ev.preventDefault();
          const next = chips[(current + 1) % chips.length];
          applyIntent(next.dataset.intent || "print");
          next.focus();
        } else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
          ev.preventDefault();
          const next = chips[(current - 1 + chips.length) % chips.length];
          applyIntent(next.dataset.intent || "print");
          next.focus();
        }
      });
    }

    els.btnAdvanced?.addEventListener("click", () => {
      const open = els.advanced.hidden;
      els.advanced.hidden = !open;
      els.btnAdvanced.setAttribute("aria-expanded", open ? "true" : "false");
      els.btnAdvanced.classList.toggle("is-open", open);
      if (open) window.setTimeout(() => els.slug?.focus(), 0);
    });

    els.back.addEventListener("click", () => {
      if (step <= 0) return;
      if (step === 2) {
        goTo(1);
        return;
      }
      goTo(0);
    });

    els.formLink.addEventListener("submit", onCreate);
    els.btnCopy.addEventListener("click", () => onCopy());
    els.btnAnother.addEventListener("click", onAnother);
    els.btnConsole?.addEventListener("click", () => markDone());

    ["input", "change"].forEach((evt) => {
      els.dest?.addEventListener(evt, updatePreview);
      els.slug?.addEventListener(evt, updatePreview);
      els.domain?.addEventListener(evt, updatePreview);
    });

    els.short?.addEventListener("click", () => onCopy());
  }

  function init() {
    loadConfig();
    document.body.dataset.obStep = "0";
    Object.values(WORLD).forEach((chapter) => {
      const image = new Image();
      image.src = chapter.plate;
    });
    setWorldChapter("void");
    const savedIntent = sessionStorage.getItem(STORAGE_INTENT) || "print";
    applyIntent(WORLD[savedIntent] && savedIntent !== "void" ? savedIntent : "print");
    setWorldChapter("void");
    updatePreview();
    bind();
    syncChrome();

    const stage = document.querySelector("[data-ob-stage]");
    if (stage && !reduceMotion()) {
      document.addEventListener("pointermove", (ev) => {
        const x = (ev.clientX / window.innerWidth - 0.5) * 8;
        const y = (ev.clientY / window.innerHeight - 0.5) * 6;
        stage.style.setProperty("--ob-parx", `${x.toFixed(2)}px`);
        stage.style.setProperty("--ob-pary", `${y.toFixed(2)}px`);
      });
    }

    // Quiet background check only — never open API console UI
    ensureReady().catch(() => {});

    try {
      const raw = sessionStorage.getItem(STORAGE_FIRST);
      if (raw && (location.hash === "#2" || location.hash === "#step-2" || location.hash === "#3")) {
        const parsed = JSON.parse(raw);
        if (parsed?.short) {
          if (parsed.intent) applyIntent(parsed.intent);
          els.short.textContent = parsed.short;
          els.successTo.textContent = parsed.dest
            ? `Opens ${hostFromUrl(parsed.dest) || parsed.dest}`
            : "";
          goTo(2, { push: false });
          playSuccessReveal();
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
