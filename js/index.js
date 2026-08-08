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
        if (img.complete && img.naturalWidth !== 0) {
          settle();
        } else {
          img.addEventListener('load', settle, { once: true });
          img.addEventListener('error', settle, { once: true });
        }
      });
  
      // Fallback safety timeout (reduced from 6s to 3s for better user experience)
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
     HERO CAROUSEL — seamless image scroller
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
      if (e.key === 'ArrowLeft')  { prev(); restartAutoplay(); }
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
      'iproj-ASSETS/ivan-gallery15.JPG',
      'iproj-ASSETS/ivan-gallery1.mp4',
      'iproj-ASSETS/ivan-gallery3.JPG',
      'iproj-ASSETS/ivan-gallery4.PNG',
      'iproj-ASSETS/ivan-gallery6.JPG',
      'iproj-ASSETS/ivan-gallery8.PNG',
      'iproj-ASSETS/ivan-gallery12.jpeg',
      'iproj-ASSETS/ivan-gallery10.jpeg',
      'iproj-ASSETS/ivan-gallery11.jpeg',
      'iproj-ASSETS/ivan-gallery13.jpeg',
    ];
  
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
     ABOUT
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
      { threshold: 0.55, rootMargin: '0px 0px -10% 0px' }
    );
  
    observer.observe(about);
  })();
  
  /* ==========================================================================
     MERCH MARQUEE
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
     FOOTER
     ========================================================================== */
  
  (function () {
    const footer = document.getElementById('contact');
    const pageWrap = document.getElementById('pageWrap');
    if (!footer || !footer.classList.contains('site-footer') || !pageWrap) return;
  
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    function sizeSpacer() {
      pageWrap.style.paddingBottom = '0px';
      const h = footer.offsetHeight;
      pageWrap.style.paddingBottom = h + 'px';
      return h;
    }
  
    let footerHeight = sizeSpacer();
  
    function updateReveal() {
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const revealAt = docHeight - footerHeight * 0.65;
      footer.classList.toggle('is-revealed', scrollBottom >= revealAt);
    }
  
    window.addEventListener('scroll', updateReveal, { passive: true });
  
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        footerHeight = sizeSpacer();
        updateReveal();
      }, 150);
    });
  
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        footerHeight = sizeSpacer();
        updateReveal();
      });
    }
  
    if (prefersReducedMotion) {
      footer.classList.add('is-revealed');
    }
  
    updateReveal();
  })();