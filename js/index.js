/* ==========================================================================
   PRELOADER + HERO SEQUENCE
   - Animates the load bar 0 → 100%
   - Waits for the hero carousel's images to actually be ready
   - Fades the preloader out and the hero scrim back, revealing the carousel
   ========================================================================== */

   (function () {
    const preloader     = document.getElementById('preloader');
    const barFill        = document.getElementById('loadBarFill');
    const percentLabel    = document.getElementById('loadPercent');
    const heroScrim        = document.getElementById('heroScrim');
    const carouselTrack      = document.getElementById('carouselTrack');
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    let displayedProgress = 0;
    let targetProgress = 0;
    let imagesReady = false;
    let sequenceComplete = false;
  
    function setProgress(value) {
      const clamped = Math.max(0, Math.min(100, value));
      barFill.style.width = clamped + '%';
      percentLabel.textContent = Math.round(clamped) + '%';
    }
  
    function finishSequence() {
      if (sequenceComplete) return;
      sequenceComplete = true;
      setProgress(100);
  
      const reveal = () => {
        preloader.classList.add('is-hidden');
        heroScrim.classList.add('is-faded');
        if (window.heroCarousel) {
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
  
    // Simulated progress: eases up to 92% on its own, then holds until the
    // carousel images signal ready. Ramp is 3200ms — slowed down for feel.
    function simulateProgress() {
      const start = performance.now();
      const duration = 3200;
  
      function step(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        targetProgress = eased * 92;
  
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
  
    function watchImages() {
      const imgs = carouselTrack ? Array.from(carouselTrack.querySelectorAll('img')) : [];
      if (imgs.length === 0) {
        onImagesReady();
        return;
      }
  
      let remaining = imgs.length;
      function settle() {
        remaining -= 1;
        if (remaining <= 0) onImagesReady();
      }
  
      imgs.forEach((img) => {
        if (img.complete) {
          settle();
        } else {
          img.addEventListener('load', settle, { once: true });
          img.addEventListener('error', settle, { once: true });
        }
      });
  
      // Don't trap the user on the loading screen indefinitely.
      setTimeout(onImagesReady, 6000);
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
     HERO CAROUSEL — seamless image scroller
     ========================================================================== */
  
  (function () {
    const carousel = document.getElementById('heroCarousel');
    if (!carousel) return;
  
    const track    = document.getElementById('carouselTrack');
    const slides   = Array.from(track.children);
    const prevBtn  = document.getElementById('carouselPrev');
    const nextBtn  = document.getElementById('carouselNext');
    const dots     = Array.from(document.getElementById('carouselDots').children);
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const AUTOPLAY_DELAY = 5000;
  
    let current = 0;
    let autoplayTimer = null;
    let started = false;
  
    function render() {
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
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
  
    prevBtn.addEventListener('click', () => { prev(); restartAutoplay(); });
    nextBtn.addEventListener('click', () => { next(); restartAutoplay(); });
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { goTo(i); restartAutoplay(); });
    });
  
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', restartAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', restartAutoplay);
  
    // Keyboard support
    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { next(); restartAutoplay(); }
      if (e.key === 'ArrowLeft')  { prev(); restartAutoplay(); }
    });
  
    // Touch / pointer swipe
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
  
    // Exposed so the preloader can kick off autoplay once the hero is revealed.
    window.heroCarousel = {
      start() {
        if (started) return;
        started = true;
        startAutoplay();
      },
    };
  })();
  
  /* ==========================================================================
     SITE NAV — hamburger toggle + Lenis-powered smooth scroll
     ========================================================================== */
  
  (function () {
    const nav        = document.getElementById('siteNav');
    const menuBtn     = document.getElementById('menuBtn');
    const menuWrapper  = document.getElementById('menuWrapper');
    const siteMenu      = document.getElementById('siteMenu');
    if (!nav || !menuBtn || !menuWrapper || !siteMenu) return;
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    // --- Lenis smooth scroll (falls back to native smooth scroll if the
    //     CDN script didn't load, e.g. offline) ---
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
  
    // --- Shrink logo + reveal glass blur once the page has scrolled ---
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
  
    // --- Menu open/close ---
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
  
    // --- Anchor links (logo, nav menu, CTA) scroll smoothly + close menu ---
    const navLinks = [document.getElementById('navLogo'), ...nav.querySelectorAll('a[href^="#"]')];
  
    navLinks.forEach((link) => {
      if (!link) return;
      link.addEventListener('click', (e) => {
        const hash = link.getAttribute('href');
        if (!hash || !hash.startsWith('#')) return;
        const target = document.querySelector(hash);
        if (!target) return; // section not built yet — let it no-op quietly
        e.preventDefault();
        closeMenu();
        smoothScrollTo(target);
      });
    });
  })();
  
  /* ==========================================================================
     GALLERY — builds the 5x5 vertical video grid and autoplays each tile
     ========================================================================== */
  
  (function () {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
  
    const TOTAL_TILES = 25; // 5 x 5
    const videos = [];
  
    for (let i = 1; i <= TOTAL_TILES; i++) {
      const num = String(i).padStart(2, '0');
  
      const item = document.createElement('div');
      item.className = 'gallery-item';
      // Replace with the real vertical video files/paths
      item.dataset.src = `iproj-ASSETS/iproj-gallery-${num}.mp4`;
      item.dataset.project = num;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Preview project ${num}`);
  
      const video = document.createElement('video');
      video.className = 'gallery-video';
      video.src = item.dataset.src;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('aria-hidden', 'true');
  
      item.appendChild(video);
      grid.appendChild(item);
      videos.push(video);
    }
  
    // All 25 are meant to autoplay, but only while their tile is actually
    // on screen — this keeps 25 simultaneous decodes from hammering battery
    // and CPU (especially on mobile) once the grid scrolls out of view.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) {
              video.play().catch(() => {
                /* Autoplay can be blocked until user interaction on some
                   browsers; it will start on first tap/scroll interaction. */
              });
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.2 }
      );
  
      videos.forEach((video) => observer.observe(video));
    } else {
      // No IntersectionObserver support — just autoplay everything.
      videos.forEach((video) => {
        video.autoplay = true;
        video.play().catch(() => {});
      });
    }
  })();
  
  /* ==========================================================================
     GALLERY LIGHTBOX — click (or Enter/Space) a tile: it flips 360° and
     grows to ~60% of the viewport over a dimmed backdrop, with a button
     below linking to that project's full gallery page.
     ========================================================================== */
  
  (function () {
    const lightbox   = document.getElementById('galleryLightbox');
    const backdrop    = document.getElementById('galleryLightboxBackdrop');
    const flipWrap      = document.getElementById('galleryLightboxFlip');
    const previewVideo    = document.getElementById('galleryLightboxVideo');
    const tag               = document.getElementById('galleryLightboxTag');
    const cta                 = document.getElementById('galleryLightboxCta');
    const closeBtn              = document.getElementById('galleryLightboxClose');
    const grid                    = document.getElementById('galleryGrid');
    if (!lightbox || !backdrop || !flipWrap || !previewVideo || !grid) return;
  
    let lastFocused = null;
  
    function openLightbox(tile) {
      const src     = tile.dataset.src;
      const project = tile.dataset.project;
      if (!src) return;
  
      previewVideo.src = src;
      previewVideo.currentTime = 0;
      previewVideo.play().catch(() => {});
      tag.textContent = 'Project ' + project;
      // Replace with the real per-project route once the full gallery page exists.
      cta.setAttribute('href', `gallery.html?project=${project}`);
  
      lastFocused = document.activeElement;
  
      // Force a reflow so the flip/grow animation restarts even if a
      // different tile was just open (class was already present).
      lightbox.classList.remove('is-open');
      void lightbox.offsetWidth;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
  
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
  
    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      previewVideo.pause();
      previewVideo.removeAttribute('src');
      previewVideo.load();
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
    closeBtn.addEventListener('click', closeLightbox);
  
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  })();