document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("mainNav");
  const backToTop = document.getElementById("backToTop");
  const trialTabs = document.querySelectorAll(".trial-tab");
  const trialPanels = document.querySelectorAll(".trial-panel");
  const progressBars = document.querySelectorAll(".sci-progress-bar[data-width]");
  const inlineVideo = document.getElementById("mainVideoInline");
  const galleryEmptyNotice = document.getElementById("galleryEmptyNotice");
  const heroParticles = document.getElementById("particles");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");
  // Carousel elements
  const pcarTrack   = document.getElementById("pcarTrack");
  const pcarPrev    = document.getElementById("pcarPrev");
  const pcarNext    = document.getElementById("pcarNext");
  const pcarDots    = document.getElementById("pcarDots");
  const pcarCounter = document.getElementById("pcarCounter");
  // Keep masonryGrid ref for empty notice compat
  const masonryGrid = pcarTrack;

  // Lightbox state
  let lightboxImages = [];
  let lightboxIndex = 0;

  // ─── Candidate builders ───────────────────────────────
  const testImageCandidate = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });

  const testVideoCandidate = (src) =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      const cleanup = () => { video.removeAttribute("src"); video.load(); };
      const ok   = () => { cleanup(); resolve(true); };
      const fail = () => { cleanup(); resolve(false); };
      video.preload = "metadata";
      video.onloadedmetadata = ok;
      video.onerror = fail;
      video.src = src;
    });

  const buildMediaCandidates = (rawSrc) => {
    const extMatch = rawSrc.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1] : "";
    const base = ext ? rawSrc.slice(0, -(ext.length + 1)) : rawSrc;
    const fileName = base.split("/").pop() || base;
    const lowerFile = fileName.toLowerCase();
    const extCandidates = ext ? [ext, ext.toLowerCase(), ext.toUpperCase()] : ["jpg", "jpeg", "png", "webp"];
    const baseCandidates = [fileName, lowerFile];
    const dirCandidates = ["img", "Img", "IMG"];
    const unique = new Set();
    dirCandidates.forEach(d => baseCandidates.forEach(b => extCandidates.forEach(e => unique.add(`${d}/${b}.${e}`))));
    if (!ext) unique.add(rawSrc);
    return [...unique];
  };

  // ─── Photo Carousel (responsive: 4 desktop / 2 mobile) ──
  const IMGS_PER_SLIDE = window.innerWidth <= 767 ? 2 : 4;
  let carSlideIndex = 0;
  let carSlides = [];   // each slide = array of {src,label}

  const buildMasonry = async () => {
    if (!pcarTrack) return;

    // Skip images already used in other sections
    const usedNumbers = new Set([1,2,3,4,5,6,7,8,9,10,31,32,33,34,35,36]);
    const imageNumbers = Array.from({ length: 36 }, (_, i) => i + 1)
      .filter(n => !usedNumbers.has(n));

    const resolvedImages = [];
    for (const num of imageNumbers) {
      const candidates = [
        `img/Image${num}.jpg`, `img/image${num}.jpg`,
        `img/Image${num}.JPG`, `img/Image${num}.jpeg`,
        `img/Image${num}.png`, `img/Image${num}.webp`,
      ];
      for (const c of candidates) {
        const exists = await testImageCandidate(c);
        if (exists) { resolvedImages.push({ src: c, label: `Photo ${num}` }); break; }
      }
    }

    if (resolvedImages.length === 0) {
      const wrap = document.getElementById("photoCarouselWrap");
      if (wrap) wrap.classList.add("d-none");
      if (pcarDots) pcarDots.classList.add("d-none");
      if (galleryEmptyNotice) galleryEmptyNotice.classList.remove("d-none");
      return;
    }

    lightboxImages = resolvedImages;

    // Chunk into groups of 4
    for (let i = 0; i < resolvedImages.length; i += IMGS_PER_SLIDE) {
      carSlides.push(resolvedImages.slice(i, i + IMGS_PER_SLIDE));
    }

    // Build track slides
    carSlides.forEach((group, sIdx) => {
      const slide = document.createElement("div");
      slide.className = "pcar-slide-group";
      slide.style.cssText = `
        display: flex; gap: 12px; flex: 0 0 100%; min-width: 100%;
      `;
      group.forEach(({ src, label }, gIdx) => {
        const globalIdx = sIdx * IMGS_PER_SLIDE + gIdx;
        const cell = document.createElement("div");
        cell.className = "pcar-slide";

        const img = document.createElement("img");
        img.src = src; img.alt = label; img.loading = "lazy";
        img.onload = () => cell.classList.add("img-loaded");

        const overlay = document.createElement("div");
        overlay.className = "pcar-slide-overlay";
        overlay.innerHTML = `
          <i class="fa-solid fa-magnifying-glass-plus"></i>
          <span class="pcar-slide-num">${String(globalIdx + 1).padStart(2,"0")} / ${String(resolvedImages.length).padStart(2,"0")}</span>
        `;
        cell.appendChild(img);
        cell.appendChild(overlay);
        cell.addEventListener("click", () => openLightbox(globalIdx));
        slide.appendChild(cell);
      });
      pcarTrack.appendChild(slide);
    });

    // Build dots
    carSlides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "pcar-dot" + (i === 0 ? " active" : "");
      dot.addEventListener("click", () => goToSlide(i));
      pcarDots.appendChild(dot);
    });

    updateCarousel();

    if (pcarPrev) pcarPrev.addEventListener("click", () => goToSlide(carSlideIndex - 1));
    if (pcarNext) pcarNext.addEventListener("click", () => goToSlide(carSlideIndex + 1));
  };

  const goToSlide = (idx) => {
    carSlideIndex = Math.max(0, Math.min(idx, carSlides.length - 1));
    updateCarousel();
  };

  const updateCarousel = () => {
    if (!pcarTrack) return;
    pcarTrack.style.transform = `translateX(calc(-${carSlideIndex * 100}% - ${carSlideIndex * 12}px))`;
    // dots
    document.querySelectorAll(".pcar-dot").forEach((d, i) =>
      d.classList.toggle("active", i === carSlideIndex));
    // buttons
    if (pcarPrev) pcarPrev.disabled = carSlideIndex === 0;
    if (pcarNext) pcarNext.disabled = carSlideIndex === carSlides.length - 1;
    // counter
    if (pcarCounter) {
      const from = carSlideIndex * IMGS_PER_SLIDE + 1;
      const to   = Math.min((carSlideIndex + 1) * IMGS_PER_SLIDE, lightboxImages.length);
      pcarCounter.textContent = `${from}–${to} of ${lightboxImages.length} photos`;
    }
  };

  // ─── Lightbox ─────────────────────────────────────────
  const openLightbox = (idx) => {
    lightboxIndex = idx;
    showLightboxImage();
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
  };

  const showLightboxImage = () => {
    const { src, label } = lightboxImages[lightboxIndex];
    lightboxImg.src = src;
    lightboxImg.alt = label;
    lightboxCaption.textContent = `${label} — ${lightboxIndex + 1} / ${lightboxImages.length}`;
  };

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox)      lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

  if (lightboxPrev) lightboxPrev.addEventListener("click", () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    showLightboxImage();
  });
  if (lightboxNext) lightboxNext.addEventListener("click", () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    showLightboxImage();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("active")) return;
    if (e.key === "Escape")      closeLightbox();
    if (e.key === "ArrowLeft")  { lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length; showLightboxImage(); }
    if (e.key === "ArrowRight") { lightboxIndex = (lightboxIndex + 1) % lightboxImages.length; showLightboxImage(); }
  });

  // ─── Resolve regular img tags ─────────────────────────
  const resolveImageSources = async () => {
    const images = Array.from(document.querySelectorAll('img[src^="img/"]'));
    for (const img of images) {
      const originalSrc = img.getAttribute("src");
      if (!originalSrc) continue;
      const candidates = buildMediaCandidates(originalSrc);
      let found = false;
      for (const candidate of candidates) {
        const exists = await testImageCandidate(candidate);
        if (exists) { img.src = candidate; found = true; break; }
      }
      if (!found) img.style.display = "none";
    }
  };

  const resolveVideoSources = async () => {
    const defaultCandidates = [
      "img/Video.mp4","img/video.mp4","img/VIDEO.mp4",
      "img/Video.MP4","img/video.MP4","Img/Video.mp4",
      "Img/video.mp4","IMG/Video.mp4","IMG/video.mp4",
      "img/demo.mp4","img/Demo.mp4"
    ];
    let resolved = null;
    for (const candidate of defaultCandidates) {
      const exists = await testVideoCandidate(candidate);
      if (exists) { resolved = candidate; break; }
    }
    if (!resolved) return;
    if (inlineVideo) { inlineVideo.src = resolved; inlineVideo.load(); }
  };

  // ─── Scroll behaviour ─────────────────────────────────
  const onScroll = () => {
    const scrolled = window.scrollY > 30;
    if (nav) nav.classList.toggle("scrolled", scrolled);
    if (backToTop) {
      backToTop.style.opacity = window.scrollY > 420 ? "1" : "0";
      backToTop.style.pointerEvents = window.scrollY > 420 ? "auto" : "none";
    }
  };

  // ─── Reveal on scroll ─────────────────────────────────
  const setupRevealOnScroll = () => {
    const revealTargets = document.querySelectorAll(
      ".product-card, .sci-card, .ba-card, .testi-card, .log-card, .team-card, .video-showcase, .school-banner, .cta-box"
    );
    revealTargets.forEach(el => el.classList.add("reveal-up"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealTargets.forEach(el => observer.observe(el));
  };

  // ─── Hero particles ───────────────────────────────────
  const setupHeroParticles = () => {
    if (!heroParticles) return;
    for (let i = 0; i < 22; i++) {
      const dot = document.createElement("span");
      dot.className = "particle";
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.bottom = `${-20 - Math.random() * 60}px`;
      dot.style.animationDuration = `${9 + Math.random() * 12}s`;
      dot.style.animationDelay = `${Math.random() * 7}s`;
      dot.style.opacity = `${0.25 + Math.random() * 0.55}`;
      dot.style.width = dot.style.height = `${3 + Math.random() * 4}px`;
      heroParticles.appendChild(dot);
    }
  };

  // ─── Hero parallax ────────────────────────────────────
  const setupHeroParallax = () => {
    const frame = document.querySelector(".hero-img-frame");
    if (!frame) return;
    frame.addEventListener("mousemove", (e) => {
      const rect = frame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      frame.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${y * -5}deg)`;
    });
    frame.addEventListener("mouseleave", () => {
      frame.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
    });
  };

  // ─── Trial tabs ───────────────────────────────────────
  trialTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const day = tab.getAttribute("data-day");
      trialTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      trialPanels.forEach(panel => panel.classList.toggle("active", panel.id === `day-${day}`));
    });
  });

  // ─── Progress bars ────────────────────────────────────
  const animateProgressBars = () => {
    progressBars.forEach(bar => {
      const width = bar.getAttribute("data-width");
      if (width) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              bar.style.width = `${width}%`;
              observer.unobserve(bar);
            }
          });
        }, { threshold: 0.5 });
        observer.observe(bar);
      }
    });
  };

  // ─── Back to top ─────────────────────────────────────
  if (backToTop) backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // ─── Init ─────────────────────────────────────────────
  onScroll();
  window.addEventListener("scroll", onScroll);

  resolveImageSources();
  resolveVideoSources();
  buildMasonry();
  setupRevealOnScroll();
  setupHeroParticles();
  setupHeroParallax();
  animateProgressBars();
});