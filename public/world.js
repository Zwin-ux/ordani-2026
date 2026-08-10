(() => {
  "use strict";

  /**
   * TinyMe film mode: one Higgsfield world video.
   * Scroll scrubs the film. Fixed ad copy. One CTA.
   * No multi-chapter plates. No SIGNAL copy.
   */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFilm =
    document.body?.dataset?.worldMode === "film" || document.body?.dataset?.page === "tinyme";

  if (!isFilm) {
    // Legacy multi-plate path removed from product surface.
    return;
  }

  const stage = document.querySelector("[data-world-stage]");
  const track = document.querySelector("[data-world-track]");
  const video = document.querySelector("[data-stage-video]");
  if (!stage || !track || !video) return;

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  let ready = false;
  let ticking = false;

  const onReady = () => {
    ready = true;
    if (!prefersReducedMotion) {
      // Keep paused; scroll owns time
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
  };

  video.muted = true;
  video.playsInline = true;
  video.loop = false;

  if (video.readyState >= 2) onReady();
  else video.addEventListener("loadeddata", onReady, { once: true });

  video.addEventListener(
    "error",
    () => {
      ready = false;
    },
    { once: true }
  );

  try {
    video.load();
  } catch {
    /* ignore */
  }

  const globalProgress = () => {
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // Track starts after sticky stage; progress 0→1 while track scrolls through
    const start = -rect.top + vh * 0.15;
    const range = Math.max(rect.height - vh * 0.35, 1);
    return clamp(start / range, 0, 1);
  };

  const apply = () => {
    const p = globalProgress();
    const exit = document.getElementById("exit");

    if (ready && video.duration && Number.isFinite(video.duration) && !prefersReducedMotion) {
      try {
        video.currentTime = p * Math.max(video.duration - 0.05, 0);
      } catch {
        /* seek race */
      }
    }

    // Soft fade film when exit is in view
    if (exit) {
      const er = exit.getBoundingClientRect();
      const fade = clamp(1 - er.top / (vhSafe() * 0.9), 0, 1);
      stage.style.opacity = String(1 - fade * 0.85);
    }

    ticking = false;
  };

  const vhSafe = () => window.innerHeight || 1;

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(apply);
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  apply();
})();
