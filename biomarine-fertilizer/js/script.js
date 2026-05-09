document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("mainNav");
  const backToTop = document.getElementById("backToTop");
  const trialTabs = document.querySelectorAll(".trial-tab");
  const trialPanels = document.querySelectorAll(".trial-panel");
  const progressBars = document.querySelectorAll(".sci-progress-bar[data-width]");
  const inlineVideo = document.getElementById("mainVideoInline");
  const galleryEmptyNotice = document.getElementById("galleryEmptyNotice");
  const heroParticles = document.getElementById("particles");
  const masonryGrid = document.getElementById("masonryGrid");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

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

  // ─── Build masonry gallery ────────────────────────────
  const buildMasonry = async () => {
    if (!masonryGrid) return;
    const imageNumbers = Array.from({ length: 36 }, (_, i) => i + 1);
    const resolvedImages = [];

    for (const num of imageNumbers) {
      const rawSrc = `img/Image${num}.jpg`;
      const candidates = buildMediaCandidates(rawSrc);
      for (const c of candidates) {
        const exists = await testImageCandidate(c);
        if (exists) {
          resolvedImages.push({ src: c, label: `Image ${num}` });
          break;
        }
      }
    }

    if (resolvedImages.length === 0) {
      masonryGrid.classList.add("d-none");
      if (galleryEmptyNotice) galleryEmptyNotice.classList.remove("d-none");
      return;
    }

    lightboxImages = resolvedImages;

    resolvedImages.forEach(({ src, label }, idx) => {
      const item = document.createElement("div");
      item.className = "masonry-item";
      item.innerHTML = `
        <img src="${src}" alt="${label}" loading="lazy" />
        <div class="masonry-overlay">
          <i class="fa-solid fa-magnifying-glass-plus masonry-overlay-icon"></i>
        </div>
      `;
      item.addEventListener("click", () => openLightbox(idx));
      masonryGrid.appendChild(item);
    });
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