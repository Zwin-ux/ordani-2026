(() => {
  "use strict";

  /**
   * Scroll world engine
   * TinyMe film mode: one video, three beats, simple ad copy only.
   */

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFilm = document.body?.dataset?.worldMode === "film" || document.body?.dataset?.page === "tinyme";

  // --- Ad copy only. Short. STE. No signal language. ---
  const FILM_BEATS = [
    {
      label: "TINYME",
      kicker: "TINYME",
      headline: "Little link.",
      sub: "Big features.",
    },
    {
      label: "TINYME",
      kicker: "ONE ADDRESS",
      headline: "Print it once.",
      sub: "Keep the short URL.",
    },
    {
      label: "TINYME",
      kicker: "STILL YOURS",
      headline: "Swap the destination.",
      sub: "Same link.",
    },
  ];

  // Legacy multi-plate (only if page still has plates + no film mode)
  const PLATE_CHAPTERS = [
    {
      label: "WORLD / 00",
      kicker: "TINYME",
      headline: "Little link.",
      sub: "Big features.",
      video: null,
    },
    {
      label: "WORLD / 01",
      kicker: "PUBLISH",
      headline: "Print one address.",
      sub: "Use it everywhere.",
      video: null,
    },
    {
      label: "WORLD / 02",
      kicker: "SWAP",
      headline: "Change the exit.",
      sub: "Keep the public address.",
      video: null,
    },
  ];

  const CHAPTERS = isFilm ? FILM_BEATS : PLATE_CHAPTERS;

  const track = document.querySelector("[data-world-track]");
  const stage = document.querySelector("[data-world-stage]");
  if (!track || !stage) return;

  const plates = [...document.querySelectorAll("[data-plate]")];
  const videoEl = document.querySelector("[data-stage-video]");
  const posterEl = document.querySelector("[data-film-poster]");
  const labelEl = document.querySelector("[data-chapter-label]");
  const indexEl = document.querySelector("[data-chapter-index]");
  const kickerEl = document.querySelector("[data-copy-kicker]");
  const headlineEl = document.querySelector("[data-copy-headline]");
  const subEl = document.querySelector("[data-copy-sub]");
  const ticks = [...document.querySelectorAll("[data-tick]")];
  const copyEl = document.querySelector("[data-stage-copy]");

  let active = 0;
  let ticking = false;
  let filmReady = false;

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const setCopy = (i) => {
    const ch = CHAPTERS[i];
    if (!ch) return;
    if (labelEl) labelEl.textContent = ch.label;
    if (indexEl) {
      indexEl.textContent = `${i + 1} / ${CHAPTERS.length}`;
    }
    if (kickerEl) kickerEl.textContent = ch.kicker;
    if (headlineEl) headlineEl.textContent = ch.headline;
    if (subEl) subEl.textContent = ch.sub;
    ticks.forEach((t, idx) => t.classList.toggle("is-active", idx === i));
  };

  const hidePoster = () => {
    if (posterEl) posterEl.classList.remove("is-active");
  };

  const showPoster = () => {
    if (posterEl) posterEl.classList.add("is-active");
  };

  const initFilm = () => {
    if (!videoEl || !isFilm) return;
    videoEl.hidden = false;
    videoEl.classList.add("is-active");
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.loop = true;

    const tryPlay = () => {
      filmReady = true;
      hidePoster();
      if (!prefersReducedMotion) {
        const p = videoEl.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };

    if (videoEl.readyState >= 2) tryPlay();
    else {
      videoEl.addEventListener("loadeddata", tryPlay, { once: true });
      videoEl.addEventListener(
        "error",
        () => {
          // Fall back: keep poster
          showPoster();
          videoEl.hidden = true;
        },
        { once: true }
      );
      // Ensure sources load
      try {
        videoEl.load();
      } catch {
        /* ignore */
      }
    }
  };

  const setPlate = (i) => {
    if (isFilm) return; // single film only
    plates.forEach((img) => {
      const id = Number(img.getAttribute("data-plate"));
      img.classList.toggle("is-active", id === i);
    });
  };

  const totalScrollProgress = () => {
    const chapters = [...document.querySelectorAll("[data-chapter]")];
    if (!chapters.length) return { index: 0, progress: 0, global: 0 };
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

    // Global 0→1 across full track (for film scrub)
    const first = chapters[0].getBoundingClientRect();
    const last = chapters[chapters.length - 1].getBoundingClientRect();
    const totalH = Math.max(last.bottom - first.top - vh, 1);
    const scrolled = clamp(-first.top, 0, totalH);
    const global = clamp(scrolled / totalH, 0, 1);

    return { index: best, progress: localP, global };
  };

  const scrubFilm = (global) => {
    if (!isFilm || !videoEl || !filmReady || prefersReducedMotion) return;
    const d = videoEl.duration;
    if (!d || !Number.isFinite(d)) return;
    try {
      // Scrub through the one film as user scrolls the world
      videoEl.currentTime = clamp(global, 0, 0.995) * d;
      if (!videoEl.paused) videoEl.pause();
    } catch {
      /* seek race */
    }
  };

  const apply = () => {
    const { index, progress, global } = totalScrollProgress();

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

    if (isFilm) {
      scrubFilm(global);
    } else {
      const plate = plates.find((p) => Number(p.getAttribute("data-plate")) === active);
      if (plate && !prefersReducedMotion) {
        const scale = 1 + progress * 0.04;
        const y = (progress - 0.5) * 12;
        plate.style.transform = `scale(${scale}) translate3d(0, ${y}px, 0)`;
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

  if (isFilm) initFilm();
  setPlate(0);
  setCopy(0);
  apply();
})();
