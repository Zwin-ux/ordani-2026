(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isProduct = document.body?.dataset?.page === "tinyme";

  // Product scroll world (TinyMe) — STE, no SaaS filler.
  const PRODUCT_CHAPTERS = [
    {
      label: "TINYME / 00 — VOID",
      kicker: "LITTLE LINK · BIG FEATURES",
      headline: "Little link.",
      sub: "Big features.",
      video: null,
    },
    {
      label: "TINYME / 01 — PUBLISH",
      kicker: "01 · PUBLISH",
      headline: "Print one address.",
      sub: "Use it on print, QR, social.",
      video: null,
    },
    {
      label: "TINYME / 02 — ROUTE",
      kicker: "02 · ROUTE",
      headline: "Route each click.",
      sub: "Device, country, schedule.",
      video: null,
    },
    {
      label: "TINYME / 03 — SWAP",
      kicker: "03 · SWAP",
      headline: "Change the exit.",
      sub: "Same public address. New destination.",
      video: null,
    },
    {
      label: "TINYME / 04 — SIGNAL",
      kicker: "04 · SIGNAL",
      headline: "Know what clicked.",
      sub: "People separate from bots.",
      video: null,
    },
    {
      label: "TINYME / 05 — CONTROL",
      kicker: "05 · READY",
      headline: "Keep control.",
      sub: "History. Rollback. Soft-delete.",
      video: null,
    },
  ];

  const WORLD_CHAPTERS = [
    {
      label: "WORLD / 00 — VOID",
      kicker: "TINYME / by ORDANI STUDIOS",
      headline: "A link can change.",
      sub: "Control starts behind the address.",
      video: null,
    },
    {
      label: "WORLD / 01 — LINK",
      kicker: "01 · PUBLISH",
      headline: "Print one address.",
      sub: "Use it everywhere.",
      video: null,
    },
    {
      label: "WORLD / 02 — RULE",
      kicker: "02 · ROUTE",
      headline: "Route each click.",
      sub: "A rule selects the destination.",
      video: null,
    },
    {
      label: "WORLD / 03 — DESTINATION",
      kicker: "03 · SWAP",
      headline: "Change the exit.",
      sub: "Keep the public address.",
      video: null,
    },
    {
      label: "WORLD / 04 — EVENT",
      kicker: "04 · SIGNAL",
      headline: "Know what clicked.",
      sub: "Separate people from bots.",
      video: null,
    },
    {
      label: "WORLD / 05 — CONTROL",
      kicker: "05 · EXIT",
      headline: "Keep control.",
      sub: "Little link. Big features.",
      video: null,
    },
  ];

  const CHAPTERS = isProduct ? PRODUCT_CHAPTERS : WORLD_CHAPTERS;

  const track = document.querySelector("[data-world-track]");
  const stage = document.querySelector("[data-world-stage]");
  if (!track || !stage) return;

  const plates = [...document.querySelectorAll("[data-plate]")];
  const videoEl = document.querySelector("[data-stage-video]");
  const labelEl = document.querySelector("[data-chapter-label]");
  const indexEl = document.querySelector("[data-chapter-index]");
  const kickerEl = document.querySelector("[data-copy-kicker]");
  const headlineEl = document.querySelector("[data-copy-headline]");
  const subEl = document.querySelector("[data-copy-sub]");
  const ticks = [...document.querySelectorAll("[data-tick]")];
  const copyEl = document.querySelector("[data-stage-copy]");

  let active = 0;
  let ticking = false;

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const setCopy = (i) => {
    const ch = CHAPTERS[i];
    if (!ch) return;
    if (labelEl) labelEl.textContent = ch.label;
    if (indexEl) {
      indexEl.textContent = `${String(i + 1).padStart(2, "0")} / ${String(CHAPTERS.length).padStart(2, "0")}`;
    }
    if (kickerEl) kickerEl.textContent = ch.kicker;
    if (headlineEl) headlineEl.textContent = ch.headline;
    if (subEl) subEl.textContent = ch.sub;
    ticks.forEach((t, idx) => t.classList.toggle("is-active", idx === i));
  };

  const setPlate = (i) => {
    plates.forEach((img) => {
      const id = Number(img.getAttribute("data-plate"));
      img.classList.toggle("is-active", id === i);
    });

    if (videoEl && CHAPTERS[i]?.video && !prefersReducedMotion) {
      const src = CHAPTERS[i].video;
      if (videoEl.dataset.src !== src) {
        videoEl.dataset.src = src;
        videoEl.src = src;
        videoEl.hidden = false;
        videoEl.load();
      }
    } else if (videoEl) {
      videoEl.hidden = true;
      videoEl.removeAttribute("src");
      videoEl.load();
    }
  };

  const chapterProgress = () => {
    const chapters = [...document.querySelectorAll("[data-chapter]")];
    const vh = window.innerHeight || 1;
    let best = 0;
    let bestScore = -Infinity;
    let localP = 0;

    chapters.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const start = -rect.top;
      const height = Math.max(rect.height - vh, 1);
      const p = clamp(start / height, 0, 1);
      const mid = rect.top + rect.height / 2;
      const score = -Math.abs(mid - vh * 0.45);
      if (score > bestScore && rect.bottom > 0 && rect.top < vh) {
        bestScore = score;
        best = i;
        localP = p;
      }
    });

    const trackRect = track.getBoundingClientRect();
    if (trackRect.bottom < vh * 0.3) {
      best = CHAPTERS.length - 1;
      localP = 1;
    }

    return { index: best, progress: localP };
  };

  const apply = () => {
    const { index, progress } = chapterProgress();
    if (index !== active) {
      active = index;
      setPlate(active);
      setCopy(active);
      if (copyEl) {
        copyEl.classList.remove("is-pulse");
        void copyEl.offsetWidth;
        copyEl.classList.add("is-pulse");
      }
    }

    const plate = plates.find((p) => Number(p.getAttribute("data-plate")) === active);
    if (plate && !prefersReducedMotion) {
      const scale = 1 + progress * 0.04;
      const y = (progress - 0.5) * 12;
      plate.style.transform = `scale(${scale}) translate3d(0, ${y}px, 0)`;
    }

    if (videoEl && !videoEl.hidden && videoEl.duration && !prefersReducedMotion) {
      try {
        videoEl.currentTime = clamp(progress, 0, 0.999) * videoEl.duration;
      } catch {
        /* ignore */
      }
    }

    const exit = document.getElementById("exit");
    if (exit && stage) {
      const er = exit.getBoundingClientRect();
      const fade = clamp(1 - er.top / (window.innerHeight * 0.85), 0, 1);
      stage.style.opacity = String(1 - fade * 0.92);
      stage.style.pointerEvents = fade > 0.85 ? "none" : "";
    }

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(apply);
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  ticks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-tick"));
      const el = document.querySelector(`[data-chapter="${i}"]`);
      if (el) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== " ") return;
    const target = e.key === "ArrowUp" ? active - 1 : active + 1;
    if (target < 0 || target >= CHAPTERS.length) return;
    e.preventDefault();
    const el = document.querySelector(`[data-chapter="${target}"]`);
    if (el) {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  });

  setPlate(0);
  setCopy(0);
  apply();

  plates.forEach((img, i) => {
    if (i === 0) return;
    const warm = new Image();
    warm.src = img.currentSrc || img.src;
  });
})();
