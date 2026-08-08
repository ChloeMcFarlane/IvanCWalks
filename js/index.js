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
     GALLERY — builds the 5x2 project thumbnail grid from the real imported
     images, shuffled to a random order on each load.

     NOTE: this list assumes 10 files (enough to fill the 5x2 grid exactly).
     If the real count of imported "ivan-galleryN.png" files is different,
     just edit GALLERY_IMAGES below to match — everything else (shuffle,
     tile creation, lightbox wiring) adapts automatically.
     ========================================================================== */

  (function () {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const GALLERY_IMAGES = [
      'iproj-ASSETS/ivan-gallery1.png',
      'iproj-ASSETS/ivan-gallery2.png',
      'iproj-ASSETS/ivan-gallery3.png',
      'iproj-ASSETS/ivan-gallery4.png',
      'iproj-ASSETS/ivan-gallery5.png',
      'iproj-ASSETS/ivan-gallery6.png',
      'iproj-ASSETS/ivan-gallery7.png',
      'iproj-ASSETS/ivan-gallery8.png',
      'iproj-ASSETS/ivan-gallery9.png',
      'iproj-ASSETS/ivan-gallery10.png',
    ];

    // Fisher–Yates shuffle
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const shuffled = shuffle(GALLERY_IMAGES);

    shuffled.forEach((src, i) => {
      const num = i + 1;

      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.dataset.src = src;
      item.dataset.project = String(num).padStart(2, '0');
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Preview project ${num}`);

      const img = document.createElement('img');
      img.className = 'gallery-media';
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';

      item.appendChild(img);
      grid.appendChild(item);
    });
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
    const previewImage      = document.getElementById('galleryLightboxImage');
    const tag                 = document.getElementById('galleryLightboxTag');
    const cta                   = document.getElementById('galleryLightboxCta');
    const closeBtn                = document.getElementById('galleryLightboxClose');
    const grid                      = document.getElementById('galleryGrid');
    if (!lightbox || !backdrop || !flipWrap || !previewVideo || !previewImage || !grid) return;

    const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];

    function isImageSrc(src) {
      const lower = src.toLowerCase();
      return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
    }

    let lastFocused = null;

    function openLightbox(tile) {
      const src     = tile.dataset.src;
      const project = tile.dataset.project;
      if (!src) return;

      if (isImageSrc(src)) {
        previewVideo.pause();
        previewVideo.removeAttribute('src');
        previewVideo.classList.add('is-hidden');
        previewImage.src = src;
        previewImage.classList.remove('is-hidden');
      } else {
        previewImage.classList.add('is-hidden');
        previewImage.removeAttribute('src');
        previewVideo.classList.remove('is-hidden');
        previewVideo.src = src;
        previewVideo.currentTime = 0;
        previewVideo.play().catch(() => {});
      }

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
    closeBtn.addEventListener('click', closeLightbox);
  
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  })();

/* ==========================================================================
   ABOUT — triggers the zoom/blur/slide-in reveal once, the first time the
   section scrolls into view. CSS handles all the actual animation; this
   just flips the class.
   ========================================================================== */

(function () {
  const about = document.getElementById('about');
  if (!about) return;

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
    // Was threshold: 0.3 (fired as soon as 30% of the section was in
    // view — too early). Bumped up + a negative bottom rootMargin so the
    // section has to scroll noticeably further up before it reveals.
    { threshold: 0.55, rootMargin: '0px 0px -10% 0px' }
  );

  observer.observe(about);
})();

/* ==========================================================================
   MERCH MARQUEE — the "MERCH" title's horizontal position is a direct
   function of scroll position, not time. There is no CSS animation and
   no independent rAF loop driving it: every scroll event just writes a
   translateX derived from window.scrollY. Several "Merch" labels are
   repeated back to back in the track, and the offset is wrapped with a
   modulo, so as one label scrolls out of view on one side, the next one
   is always already in place to take over on the other — an infinite
   loop that only advances when the page itself moves.
   ========================================================================== */

(function () {
  const track = document.getElementById('merchMarqueeTrack');
  if (!track) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // How far the marquee shifts per pixel of page scroll.
  const SCROLL_SPEED = 0.55;

  // The width of a single "Merch" label, including its trailing gap —
  // this is the loop length: once the track has shifted this far, it's
  // visually identical to shifting 0, so wrapping here is seamless.
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
    // Double modulo keeps the offset positive even if scrollY is ever
    // negative (elastic overscroll on some browsers/trackpads).
    const offset = ((raw % itemWidth) + itemWidth) % itemWidth;
    track.style.transform = 'translateX(-' + offset + 'px)';
  }

  measure();
  window.addEventListener('resize', measure);

  if (prefersReducedMotion) {
    track.style.transform = 'translateX(0)';
    return;
  }

  // Lenis (wired up in the nav module above) smooths native scrolling
  // itself, so window.scrollY already reflects the eased position — a
  // plain scroll listener is enough to stay in sync with it either way.
  window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
  update(window.scrollY);
})();