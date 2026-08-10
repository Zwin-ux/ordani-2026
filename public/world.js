(() => {
  "use strict";

  /**
   * TinyMe: one world film, autoplay loop.
   * No scroll-scrub (it felt bad). Just keep the film alive.
   */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFilm =
    document.body?.dataset?.worldMode === "film" || document.body?.dataset?.page === "tinyme";
  if (!isFilm) return;

  const video = document.querySelector("[data-stage-video]");
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  video.loop = true;

  const playSafe = () => {
    if (prefersReducedMotion) {
      try {
        video.pause();
        if (video.duration && Number.isFinite(video.duration)) {
          video.currentTime = Math.min(0.1, video.duration * 0.2);
        }
      } catch {
        /* ignore */
      }
      return;
    }
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // Autoplay blocked — wait for first gesture
        const unlock = () => {
          video.play().catch(() => {});
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("touchstart", unlock);
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true, passive: true });
      });
    }
  };

  if (video.readyState >= 2) playSafe();
  else {
    video.addEventListener("loadeddata", playSafe, { once: true });
    video.addEventListener("canplay", playSafe, { once: true });
  }

  try {
    video.load();
  } catch {
    /* ignore */
  }

  // If tab becomes visible again, resume
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !prefersReducedMotion) playSafe();
  });
})();
