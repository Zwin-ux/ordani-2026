(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // --- HEADER SCROLL BEHAVIOR ---
  const header = document.querySelector("[data-header]");
  // Spin mark only (gear/hex), not full wordmarks
  const brandLogo = document.querySelector(".site-header .brand .brand-mark, .site-header .tinyme-brand img");
  const progressBar = document.createElement("div");
  progressBar.className = "scroll-progress";
  progressBar.setAttribute("aria-hidden", "true");
  progressBar.innerHTML = "<span></span>";
  document.body.prepend(progressBar);
  const progressFill = progressBar.querySelector("span");

  let ticking = false;

  const updateScrollUI = () => {
    const current = window.scrollY;
    const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = clamp(current / total, 0, 1);

    if (progressFill) {
      progressFill.style.width = `${progress * 100}%`;
    }

    // Keep header + logo visible so the mark can keep spinning
    if (header) {
      header.classList.toggle("is-scrolled", current > 20);
      header.classList.remove("is-hidden");
    }

    // Scroll-driven brand mark rotation: full page ≈ one turn
    if (brandLogo && !prefersReducedMotion) {
      brandLogo.style.transform = `rotate(${progress * 360}deg)`;
    }

    ticking = false;
  };

  // Run once so logo state is correct on load / refresh mid-page
  updateScrollUI();

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }, { passive: true });

  // Soft-loop videos (hero + team): fade in when ready; pause/hide for reduced motion
  const softVideos = document.querySelectorAll("[data-hero-video], [data-team-video]");
  softVideos.forEach((video) => {
    if (prefersReducedMotion) {
      video.removeAttribute("autoplay");
      video.pause();
      video.hidden = true;
      video.removeAttribute("src");
      video.querySelectorAll("source").forEach((source) => source.remove());
      video.load();
      return;
    }

    const markReady = () => video.classList.add("is-ready");
    video.addEventListener("loadeddata", markReady, { once: true });
    video.addEventListener("canplay", markReady, { once: true });
    if (video.readyState >= 2) markReady();

    const play = video.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        /* autoplay blocked — poster remains */
      });
    }
  });

  // Hero world parallax — subtle "pinch/depth" on mouse move
  const hero = document.querySelector("[data-hero]");
  if (hero && !prefersReducedMotion) {
    const layers = [...hero.querySelectorAll("[data-parallax]")];
    let targetX = 0;
    let targetY = 0;
    let currX = 0;
    let currY = 0;
    let parallaxRaf = 0;

    const applyParallax = () => {
      currX += (targetX - currX) * 0.06;
      currY += (targetY - currY) * 0.06;

      layers.forEach((el) => {
        const depth = Number(el.getAttribute("data-parallax")) || 0.3;
        // Depth feel: far moves less, near moves more (pinch / tilt)
        const x = currX * depth * 28;
        const y = currY * depth * 20;
        const scale = 1 + Math.abs(currX * depth) * 0.018 + Math.abs(currY * depth) * 0.012;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      });

      if (Math.abs(targetX - currX) > 0.001 || Math.abs(targetY - currY) > 0.001) {
        parallaxRaf = window.requestAnimationFrame(applyParallax);
      } else {
        parallaxRaf = 0;
      }
    };

    const onMove = (clientX, clientY) => {
      const rect = hero.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      // -1 … 1 from center
      targetX = ((clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((clientY - rect.top) / rect.height - 0.5) * 2;
      targetX = clamp(targetX, -1, 1);
      targetY = clamp(targetY, -1, 1);
      if (!parallaxRaf) parallaxRaf = window.requestAnimationFrame(applyParallax);
    };

    hero.addEventListener("pointermove", (e) => {
      onMove(e.clientX, e.clientY);
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      if (!parallaxRaf) parallaxRaf = window.requestAnimationFrame(applyParallax);
    }, { passive: true });
  }

  // --- MOBILE MENU ---
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileNav = document.querySelector("[data-mobile-nav]");

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      mobileNav.hidden = isOpen;
      document.body.style.overflow = isOpen ? "" : "hidden";
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  // --- SCROLL REVEAL ---
  const revealTargets = document.querySelectorAll(".reveal, [data-split]");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.06 });

    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  // --- ANIMATED COUNTERS ---
  const counters = document.querySelectorAll("[data-counter]");

  const animateCounter = (el) => {
    const target = Number(el.dataset.counter || 0);
    const duration = prefersReducedMotion ? 1 : 1000;
    const start = performance.now();

    const frame = (time) => {
      const progress = clamp((time - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  };

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    counters.forEach((c) => counterObserver.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  // --- LINK ROW HOVER ---
  document.querySelectorAll("[data-link-row]").forEach((row) => {
    row.addEventListener("mouseenter", () => {
      document.querySelectorAll("[data-link-row]").forEach((r) => r.classList.remove("active"));
      row.classList.add("active");
    });
  });

  // --- DESTINATION SWAP ---
  const destinations = [
    "store.example.com/summer-2026",
    "app.example.com/deep-link/summer",
    "archive.example.com/campaign/summer"
  ];
  let destIndex = 0;

  const swapDestination = (target) => {
    destIndex = (destIndex + 1) % destinations.length;
    target.textContent = destinations[destIndex];
  };

  document.querySelectorAll("[data-swap-destination]").forEach((btn) => {
    const target = btn.closest(".how-visual")?.querySelector("[data-destination]");
    if (target) btn.addEventListener("click", () => swapDestination(target));
  });

  // --- CONSOLE TABS ---
  const consoleTabs = document.querySelectorAll("[data-console-tab]");
  const consolePanels = document.querySelectorAll("[data-console-panel]");

  consoleTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const panelName = tab.dataset.consoleTab;
      consoleTabs.forEach((t) => t.classList.toggle("active", t === tab));
      consolePanels.forEach((panel) => {
        const active = panel.dataset.consolePanel === panelName;
        panel.hidden = !active;
      });
    });
  });

  // --- CONSOLE DESTINATION SWAP ---
  const consoleDest = document.querySelector("[data-console-destination]");
  const consoleSwap = document.querySelector("[data-console-swap]");
  if (consoleDest && consoleSwap) {
    let idx = 0;
    consoleSwap.addEventListener("click", () => {
      idx = (idx + 1) % destinations.length;
      consoleDest.textContent = destinations[idx];
    });
  }

  // --- TILT EFFECT (desktop only) ---
  const tiltCard = document.querySelector("[data-tilt]");
  if (tiltCard && !prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
    tiltCard.addEventListener("pointermove", (e) => {
      const rect = tiltCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      tiltCard.style.transform = `perspective(1400px) rotateX(${y * -1.2}deg) rotateY(${x * 1.2}deg)`;
    });
    tiltCard.addEventListener("pointerleave", () => {
      tiltCard.style.transform = "";
    });
  }

  // --- SMOOTH SCROLL FOR ANCHOR LINKS ---
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const offset = header ? header.offsetHeight + 16 : 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });

  // --- INTERACTIVE DEMO (TinyMe) ---
  const shortenForm = document.querySelector("[data-shorten-form]");
  const shortenInput = document.querySelector("[data-shorten-input]");
  const shortenResult = document.querySelector("[data-shorten-result]");
  const resultUrl = document.querySelector("[data-result-url]");
  const copyBtn = document.querySelector("[data-copy-btn]");
  const previewDest = document.querySelector("[data-preview-dest]");
  const previewSlug = document.querySelector("[data-preview-slug]");
  const previewCreated = document.querySelector("[data-preview-created]");
  const previewExpiry = document.querySelector("[data-preview-expiry]");
  const qrPlaceholder = document.querySelector("[data-qr-placeholder]");

  const sampleSlugs = ["summer-sale", "launch-26", "promo-link", "event-rsvp", "blog-post"];
  let demoSlugIndex = 0;

  if (shortenForm) {
    shortenForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = shortenInput.value.trim();
      if (!url) return;

      const slug = sampleSlugs[demoSlugIndex % sampleSlugs.length];
      demoSlugIndex++;

      const shortUrl = `tinyme.cc/${slug}`;
      if (resultUrl) resultUrl.textContent = shortUrl;
      if (shortenResult) shortenResult.classList.add("visible");
      if (previewDest) previewDest.textContent = url;
      if (previewSlug) previewSlug.textContent = slug;
      if (previewCreated) previewCreated.textContent = "Just now";
      if (previewExpiry) previewExpiry.textContent = "Never";

      if (qrPlaceholder) {
        qrPlaceholder.classList.add("generated");
      }

      shortenInput.value = "";
    });
  }

  if (copyBtn && resultUrl) {
    copyBtn.addEventListener("click", () => {
      const text = resultUrl.textContent;
      navigator.clipboard.writeText(`https://${text}`).then(() => {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 2000);
      }).catch(() => {
        copyBtn.textContent = "Copy";
      });
    });
  }

  // --- ANALYTICS BAR ANIMATION ---
  const analyticsBars = document.querySelector("[data-analytics-bars]");
  if (analyticsBars && "IntersectionObserver" in window && !prefersReducedMotion) {
    const barObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const bars = analyticsBars.querySelectorAll("span");
        bars.forEach((bar, i) => {
          const height = 20 + Math.random() * 80;
          setTimeout(() => {
            bar.style.height = `${height}%`;
          }, i * 30);
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    barObserver.observe(analyticsBars);
  }

  // --- INIT ---
  updateScrollUI();
})();
