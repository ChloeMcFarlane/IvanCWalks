/* ==========================================================================
   PRELOADER + HERO SEQUENCE
   ========================================================================== */

   (function () {
    const preloader = document.getElementById('preloader');
    const barFill = document.getElementById('loadBarFill');
    const percentLabel = document.getElementById('loadPercent');
    const heroScrim = document.getElementById('heroScrim');
    const carouselTrack = document.getElementById('carouselTrack');
  
    // If the preloader element does not exist on the page, abort cleanly.
    if (!preloader) return;
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    let displayedProgress = 0;
    let targetProgress = 0;
    let imagesReady = false;
    let sequenceComplete = false;
  
    function setProgress(value) {
      const clamped = Math.max(0, Math.min(100, value));
      if (barFill) barFill.style.width = clamped + '%';
      if (percentLabel) percentLabel.textContent = Math.round(clamped) + '%';
    }
  
    function finishSequence() {
      if (sequenceComplete) return;
      sequenceComplete = true;
      setProgress(100);
  
      const reveal = () => {
        preloader.classList.add('is-hidden');
        if (heroScrim) heroScrim.classList.add('is-faded');
        if (window.heroCarousel && typeof window.heroCarousel.start === 'function') {
          window.heroCarousel.start();
        }
      };
  
      if (prefersReducedMotion) {
        reveal();
      } else {
        setTimeout(reveal, 250);
      }
    }
  
    function tick() {
      displayedProgress += (targetProgress - displayedProgress) * 0.12;
      if (targetProgress - displayedProgress < 0.3) {
        displayedProgress = targetProgress;
      }
      setProgress(displayedProgress);
  
      if (displayedProgress >= 99.5 && imagesReady) {
        finishSequence();
        return;
      }
      requestAnimationFrame(tick);
    }
  
    function simulateProgress() {
      const start = performance.now();
      const duration = 3200;
  
      function step(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
  
        if (!imagesReady) {
          targetProgress = eased * 92;
        }
  
        if (t < 1 && !imagesReady) {
          requestAnimationFrame(step);
        } else if (imagesReady) {
          targetProgress = 100;
        }
      }
      requestAnimationFrame(step);
    }
  
    function onImagesReady() {
      if (imagesReady) return;
      imagesReady = true;
      targetProgress = 100;
    }
  
    // Waits ONLY on the first hero slide (the one visible on load). Slides 2
    // and 3 are off-screen and lazy-loaded, so holding the preloader for them
    // just made everyone wait for media they can't see yet.
    // Images settle on load/error; the video settles on loadeddata/error
    // (readyState >= 2 means the first frame is decoded and can be shown —
    // it autoplays from there).
    function watchImages() {
      const firstSlide = carouselTrack ? carouselTrack.children[0] : null;
      const imgs = firstSlide ? Array.from(firstSlide.querySelectorAll('img')) : [];
      const videos = firstSlide ? Array.from(firstSlide.querySelectorAll('video')) : [];
  
      if (imgs.length === 0 && videos.length === 0) {
        onImagesReady();
        return;
      }
  
      let remaining = imgs.length + videos.length;
      function settle() {
        remaining -= 1;
        if (remaining <= 0) onImagesReady();
      }
  
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth !== 0) {
          settle();
        } else {
          img.addEventListener('load', settle, { once: true });
          img.addEventListener('error', settle, { once: true });
        }
      });
  
      videos.forEach((video) => {
        if (video.readyState >= 2) {
          settle();
        } else {
          video.addEventListener('loadeddata', settle, { once: true });
          video.addEventListener('error', settle, { once: true });
        }
      });
  
      // Fallback safety timeout so a slow/broken asset can't hang the preloader forever.
      setTimeout(onImagesReady, 3000);
    }
  
    if (prefersReducedMotion) {
      onImagesReady();
      finishSequence();
    } else {
      watchImages();
      simulateProgress();
      requestAnimationFrame(tick);
    }
  })();
  
  /* ==========================================================================
     HERO CAROUSEL — seamless image/video scroller
     ========================================================================== */
  
  (function () {
    const carousel = document.getElementById('heroCarousel');
    if (!carousel) return;
  
    const track = document.getElementById('carouselTrack');
    const slides = track ? Array.from(track.children) : [];
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const dotsContainer = document.getElementById('carouselDots');
    const dots = dotsContainer ? Array.from(dotsContainer.children) : [];
  
    if (!track || slides.length === 0) return;
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const AUTOPLAY_DELAY = 5000;
  
    let current = 0;
    let autoplayTimer = null;
    let started = false;
  
    // Hero videos start playing at page load (even the off-screen ones), so by
    // the time a later slide slides in, a short clip has already finished.
    // Restart the incoming slide's video from 0 whenever it becomes active.
    let lastShown = 0;
    function restartSlideVideo() {
      if (current === lastShown) return;
      lastShown = current;
      const v = slides[current] ? slides[current].querySelector('video') : null;
      if (!v) return;
      try { v.currentTime = 0; } catch (e) {}
      const attempt = v.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    }

    function render() {
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
      restartSlideVideo();
    }
  
    function goTo(index) {
      current = (index + slides.length) % slides.length;
      render();
    }
  
    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }
  
    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }
  
    function startAutoplay() {
      if (prefersReducedMotion) return;
      stopAutoplay();
      autoplayTimer = setInterval(next, AUTOPLAY_DELAY);
    }
  
    function restartAutoplay() {
      if (!started) return;
      startAutoplay();
    }
  
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restartAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); restartAutoplay(); });
  
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { goTo(i); restartAutoplay(); });
    });
  
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', restartAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', restartAutoplay);
  
    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { next(); restartAutoplay(); }
      if (e.key === 'ArrowLeft') { prev(); restartAutoplay(); }
    });
  
    let dragStartX = null;
    let dragging = false;
  
    track.addEventListener('pointerdown', (e) => {
      dragStartX = e.clientX;
      dragging = true;
      stopAutoplay();
    });
  
    track.addEventListener('pointerup', (e) => {
      if (!dragging || dragStartX === null) return;
      const delta = e.clientX - dragStartX;
      const threshold = 50;
      if (delta > threshold) prev();
      else if (delta < -threshold) next();
      dragging = false;
      dragStartX = null;
      restartAutoplay();
    });
  
    track.addEventListener('pointercancel', () => {
      dragging = false;
      dragStartX = null;
      restartAutoplay();
    });
  
    render();
  
    window.heroCarousel = {
      start() {
        if (started) return;
        started = true;
        startAutoplay();
      },
    };
  })();
  
  /* ==========================================================================
     HERO VIDEO — autoplay silently, and never show a play button
     ========================================================================== */
  
  (function () {
    const heroVideos = Array.from(document.querySelectorAll('#carouselTrack video'));
    if (!heroVideos.length) return;
  
    heroVideos.forEach((video) => {
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.controls = false;
      video.removeAttribute('controls');
      video.disablePictureInPicture = true;
      video.disableRemotePlayback = true;
    });
  
    const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'];
  
    function onGesture() { heroVideos.forEach(tryPlay); }
    function removeGestureListeners() {
      GESTURES.forEach((type) => document.removeEventListener(type, onGesture));
    }
  
    function reveal(video) {
      const slide = video.closest('.carousel-slide');
      if (slide) slide.classList.add('is-playing');
      removeGestureListeners();
    }
  
    function tryPlay(video) {
      if (!video.paused) return;
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch((err) => {
          if (err && err.name === 'NotSupportedError') {
            console.warn('[hero video] missing file or unsupported format:', video.currentSrc || video.src);
          }
        });
      }
    }
  
    heroVideos.forEach((video) => {
      video.addEventListener('playing', () => reveal(video));
      video.addEventListener('loadeddata', () => tryPlay(video));
      video.addEventListener('canplay', () => tryPlay(video));
      video.addEventListener('error', () => {
        const code = video.error ? video.error.code : 'unknown';
        console.warn('[hero video] failed to load (MediaError code ' + code + '). 3 = decode error, 4 = file not found / bad format.');
      });
      if (!video.paused && video.readyState >= 3) reveal(video);
    });
  
    GESTURES.forEach((type) => document.addEventListener(type, onGesture, { passive: true }));
    heroVideos.forEach(tryPlay);
  
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) heroVideos.forEach(tryPlay);
    });
    window.addEventListener('pageshow', () => heroVideos.forEach(tryPlay));
  
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) tryPlay(entry.target); });
      }, { threshold: 0.25 });
      heroVideos.forEach((video) => io.observe(video));
    }
  })();
  
  /* ==========================================================================
     SITE NAV — hamburger toggle + Lenis-powered smooth scroll
     ========================================================================== */
  
  (function () {
    const nav = document.getElementById('siteNav');
    const menuBtn = document.getElementById('menuBtn');
    const menuWrapper = document.getElementById('menuWrapper');
    const siteMenu = document.getElementById('siteMenu');
    if (!nav || !menuBtn || !menuWrapper || !siteMenu) return;
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    let lenis = null;
    if (window.Lenis && !prefersReducedMotion) {
      lenis = new window.Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1 - Math.pow(2, -10 * t)),
      });
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  
    function smoothScrollTo(target) {
      if (!target) return;
      if (lenis) {
        lenis.scrollTo(target);
      } else {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }
  
    const SCROLL_THRESHOLD = 40;
  
    function updateScrollState(scrollY) {
      nav.classList.toggle('is-scrolled', scrollY > SCROLL_THRESHOLD);
    }
  
    if (lenis) {
      lenis.on('scroll', (e) => updateScrollState(e.scroll));
    } else {
      window.addEventListener('scroll', () => updateScrollState(window.scrollY), { passive: true });
    }
    updateScrollState(window.scrollY);
  
    function openMenu() {
      menuWrapper.classList.add('is-open');
      menuBtn.classList.add('active');
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  
    function closeMenu() {
      menuWrapper.classList.remove('is-open');
      menuBtn.classList.remove('active');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  
    menuBtn.addEventListener('click', () => {
      menuWrapper.classList.contains('is-open') ? closeMenu() : openMenu();
    });
  
    document.addEventListener('click', (e) => {
      if (menuWrapper.classList.contains('is-open') && !menuWrapper.contains(e.target)) {
        closeMenu();
      }
    });
  
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  
    const navLinks = [document.getElementById('navLogo'), ...nav.querySelectorAll('a[href^="#"]')];
  
    navLinks.forEach((link) => {
      if (!link) return;
      link.addEventListener('click', (e) => {
        const hash = link.getAttribute('href');
        if (!hash || !hash.startsWith('#')) return;
        const target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        smoothScrollTo(target);
      });
    });
  })();
  
  /* ==========================================================================
     GALLERY — builds the thumbnail grid
     ========================================================================== */
  
  (function () {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
  
    const GALLERY_IMAGES = [
      'https://res.cloudinary.com/xxhi8hls/image/upload/v1786382430/ivan-gallery13.jpg',
      'https://res.cloudinary.com/xxhi8hls/image/upload/v1786382399/ivan-gallery11.jpg',
      'iproj-ASSETS/ivan-gallery12.jpeg',
      'iproj-ASSETS/ivan-gallery10.jpeg',
      'https://res.cloudinary.com/xxhi8hls/image/upload/v1786382155/ivan-gallery3.jpg',

      'https://res.cloudinary.com/xxhi8hls/image/upload/v1791317873/Aug_30_2026.png',
      'https://res.cloudinary.com/xxhi8hls/image/upload/v1791317851/Jan_Feb_2026.jpg',
      'https://res.cloudinary.com/xxhi8hls/image/upload/v1791317849/Copy_of_BLACKWIND_Ft_I.V.A.N..png',
      'https://res.cloudinary.com/xxhi8hls/image/upload/v1786381956/ivan-gallery4.png',
      'https://res.cloudinary.com/xxhi8hls/image/upload/v1786381984/ivan-gallery8.png',
    ];
    // Cloudinary URLs look like  .../<image|video>/upload/v123/file.ext
    const CLOUDINARY_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(v\d+\/.+)$/;

    // Every tile needs two versions of its asset:
    //   thumb — small, for the grid tile (tiles are only ~400px wide on screen)
    //   full  — bigger, only fetched when the lightbox opens / is pre-warmed
    // Local files (iproj-ASSETS/...) can't be resized this way, so they pass
    // through untouched for both.
    function buildSources(src) {
      const m = src.match(CLOUDINARY_RE);
      if (!m) return { thumb: src, full: src };

      const base = m[1];
      const type = m[2];
      const rest = m[3];

      if (type === 'video') {
        // A video can't go in an <img>. Cloudinary returns a still frame when
        // the extension is swapped to .jpg; so_0 = frame at 0 seconds.
        return {
          thumb: base + 'so_0,q_auto,w_800/' + rest.replace(/\.[^./]+$/, '.jpg'),
          full: src,
        };
      }

      return {
        thumb: base + 'f_auto,q_auto,w_800/' + rest,
        full: base + 'f_auto,q_auto,w_1200/' + rest,
      };
    }

    GALLERY_IMAGES.forEach((src, i) => {
      const num = i + 1;
      const { thumb, full } = buildSources(src);

      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.dataset.src = full;
      item.dataset.project = String(num).padStart(2, '0');
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Preview project ${num}`);

      const img = document.createElement('img');
      img.className = 'gallery-media';
      img.src = thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';

      item.appendChild(img);
      grid.appendChild(item);
    });
  })();
  
  /* ==========================================================================
     GALLERY LIGHTBOX
     ========================================================================== */
  
  (function () {
    const lightbox = document.getElementById('galleryLightbox');
    const backdrop = document.getElementById('galleryLightboxBackdrop');
    const flipWrap = document.getElementById('galleryLightboxFlip');
    const previewVideo = document.getElementById('galleryLightboxVideo');
    const previewImage = document.getElementById('galleryLightboxImage');
    const tag = document.getElementById('galleryLightboxTag');
    const cta = document.getElementById('galleryLightboxCta');
    const closeBtn = document.getElementById('galleryLightboxClose');
    const grid = document.getElementById('galleryGrid');
    if (!lightbox || !backdrop || !flipWrap || !previewVideo || !previewImage || !grid) return;
  
    const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];
  
    function isImageSrc(src) {
      const lower = src.toLowerCase();
      return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
    }
  
    const preloaded = new Set();
  
    function preload(src) {
      if (!src || preloaded.has(src)) return;
      preloaded.add(src);
      if (isImageSrc(src)) {
        const img = new Image();
        img.src = src;
        if (img.decode) img.decode().catch(() => {});
      } else {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.src = src;
        video.load();
      }
    }
  
    grid.addEventListener('pointerover', (e) => {
      const tile = e.target.closest('.gallery-item');
      if (tile) preload(tile.dataset.src);
    });
  
    grid.addEventListener('focusin', (e) => {
      const tile = e.target.closest('.gallery-item');
      if (tile) preload(tile.dataset.src);
    });
  
    let lastFocused = null;
  
    function openLightbox(tile) {
      const src = tile.dataset.src;
      const project = tile.dataset.project;
      if (!src) return;
  
      const thumb = tile.querySelector('.gallery-media');
      const posterSrc = thumb ? thumb.currentSrc || thumb.src : '';
  
      if (isImageSrc(src)) {
        previewVideo.pause();
        previewVideo.removeAttribute('src');
        previewVideo.removeAttribute('poster');
        previewVideo.classList.add('is-hidden');
        previewImage.src = src;
        previewImage.classList.remove('is-hidden');
      } else {
        previewImage.classList.add('is-hidden');
        previewImage.removeAttribute('src');
        previewVideo.classList.remove('is-hidden');
        if (posterSrc) previewVideo.setAttribute('poster', posterSrc);
        previewVideo.src = src;
        previewVideo.currentTime = 0;
        previewVideo.play().catch(() => {});
      }
  
      if (tag) tag.textContent = 'Project ' + project;
      if (cta) cta.setAttribute('href', `gallery.html?project=${project}`);
  
      lastFocused = document.activeElement;
  
      lightbox.classList.remove('is-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lightbox.classList.add('is-open');
        });
      });
      lightbox.setAttribute('aria-hidden', 'false');
  
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    }
  
    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      previewVideo.pause();
      previewVideo.removeAttribute('src');
      previewVideo.load();
      previewImage.removeAttribute('src');
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }
  
    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('.gallery-item');
      if (tile) openLightbox(tile);
    });
  
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tile = e.target.closest('.gallery-item');
      if (!tile) return;
      e.preventDefault();
      openLightbox(tile);
    });
  
    backdrop.addEventListener('click', closeLightbox);
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  })();
  
  /* ==========================================================================
     ABOUT — scroll reveal
     ========================================================================== */
  
  (function () {
    const about = document.getElementById('about');
    if (!about) return;

    // Split each target's text into words, each wrapped in a clipping
    // "line" mask (.word-line) around the moving word (.word), and give
    // every word its own transition-delay so they fade/rise in one after
    // another instead of all at once.
    const STAGGER_MS = 55;
    const splitTargets = Array.from(about.querySelectorAll('.about-heading, .about-statement'));

    splitTargets.forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words
        .map((word, i) => {
          const delay = i * STAGGER_MS;
          return `<span class="word-line"><span class="word" style="transition-delay:${delay}ms">${word}</span></span>`;
        })
        .join(' ');
    });
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      about.classList.add('is-revealed');
      return;
    }
  
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            about.classList.add('is-revealed');
            obs.unobserve(about);
          }
        });
      },
      { threshold: 0.55, rootMargin: '0px 0px -10% 0px' }
    );
  
    observer.observe(about);
  })();
  
  /* ==========================================================================
     MERCH — product image reveal + scroll-linked marquee
     ========================================================================== */
  
  (function () {
    const images = Array.from(document.querySelectorAll('.merch-product-image'));
    if (!images.length) return;
  
    function reveal(img) {
      img.classList.add('is-loaded');
    }
  
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        reveal(img);
        return;
      }
      if (img.decode) {
        img.decode().then(() => reveal(img)).catch(() => {
          if (img.complete) reveal(img);
        });
      }
      img.addEventListener('load', () => reveal(img), { once: true });
    });
  })();
  
  (function () {
    const track = document.getElementById('merchMarqueeTrack');
    if (!track) return;
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SCROLL_SPEED = 0.55;
  
    let itemWidth = 0;
  
    function measure() {
      const first = track.children[0];
      if (!first) return;
      itemWidth = first.getBoundingClientRect().width;
    }
  
    function update(scrollY) {
      if (!itemWidth) measure();
      if (!itemWidth) return;
      const raw = scrollY * SCROLL_SPEED;
      const offset = ((raw % itemWidth) + itemWidth) % itemWidth;
      track.style.transform = 'translateX(-' + offset + 'px)';
    }
  
    measure();
    window.addEventListener('resize', measure);
  
    if (prefersReducedMotion) {
      track.style.transform = 'translateX(0)';
      return;
    }
  
    window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
    update(window.scrollY);
  })();
  
  /* ==========================================================================
     FOOTER — pinned reveal
     ========================================================================== */
  
  (function () {
    const footer = document.getElementById('contact');
    if (!footer || !footer.classList.contains('site-footer')) return;
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      footer.classList.add('is-revealed');
      return;
    }
  
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            footer.classList.add('is-revealed');
            obs.unobserve(footer);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
  
    observer.observe(footer);
  })();

/* ==========================================================================
   EVENT BANNER — slides down above the nav; nav's own "top" offset (a CSS
   var) shifts to sit right underneath it. Dismissal is remembered for the
   browser session (not permanently) so a closed banner doesn't reappear on
   every page nav within the same visit, but does come back on a fresh one.
   ========================================================================== */

(function () {
  const STORAGE_KEY = 'eventBannerDismissed';
  const banner = document.getElementById('eventBanner');
  const closeBtn = document.getElementById('eventBannerClose');
  if (!banner || !closeBtn) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch (e) {
    // Storage can throw in some privacy modes — just fall through and
    // show the banner rather than breaking the page over it.
  }

  if (dismissed) {
    banner.remove();
    return;
  }

  function setOffset(px) {
    document.documentElement.style.setProperty('--event-banner-offset', px + 'px');
  }

  function show() {
    setOffset(banner.offsetHeight);
    requestAnimationFrame(() => banner.classList.add('is-visible'));
  }

  function dismiss() {
    banner.classList.remove('is-visible');
    setOffset(0);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // Ignore — worst case it reappears next page load, not a big deal.
    }
    setTimeout(() => banner.remove(), prefersReducedMotion ? 0 : 750);
  }

  closeBtn.addEventListener('click', dismiss);

  window.addEventListener('resize', () => {
    if (banner.classList.contains('is-visible')) setOffset(banner.offsetHeight);
  });

  if (prefersReducedMotion) {
    setOffset(banner.offsetHeight);
    banner.classList.add('is-visible');
  } else {
    setTimeout(show, 600);
  }
})();