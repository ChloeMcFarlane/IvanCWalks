/* ==========================================================================
   SITE NAV — hamburger toggle + Lenis-powered smooth scroll
   (same pattern as the homepage's index.js, reused here so this page can
   ship standalone without pulling in hero/preloader/gallery code that
   doesn't exist on this page)
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
      window.__projectsLenis = lenis;
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
  window.__projectsLenis = lenis;

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
   HERO REVEAL — same blur/slide-in language as the homepage's about section
   ========================================================================== */

(function () {
  const hero = document.getElementById('projectsHero');
  if (!hero) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    hero.classList.add('is-revealed');
    return;
  }

  requestAnimationFrame(() => {
    setTimeout(() => hero.classList.add('is-revealed'), 80);
  });
})();

/* ==========================================================================
   PROJECT ROWS — scroll reveal (IntersectionObserver, staggered)
   ========================================================================== */

(function () {
  const rows = Array.from(document.querySelectorAll('.project-row'));
  if (!rows.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    rows.forEach((row) => row.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
  );

  rows.forEach((row) => observer.observe(row));
})();

/* ==========================================================================
   PROJECT FILTERS — All / Choreography / Acting / Directing
   ========================================================================== */

(function () {
  const filters = Array.from(document.querySelectorAll('.projects-filter'));
  const rows = Array.from(document.querySelectorAll('.project-row'));
  const countLabel = document.getElementById('projectsCount');
  if (!filters.length || !rows.length) return;

  function applyFilter(category) {
    let visible = 0;
    rows.forEach((row) => {
      const match = category === 'all' || row.dataset.category === category;
      row.classList.toggle('is-hidden-filter', !match);
      if (match) visible += 1;
    });
    if (countLabel) {
      countLabel.textContent = String(visible).padStart(2, '0') + (visible === 1 ? ' Project' : ' Projects');
    }
  }

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
    });
  });

  applyFilter('all');
})();

/* ==========================================================================
   FLOATING THUMBNAIL — follows the cursor down the project list, swapping
   media per row. Same idea as a mouse-tracking preview thumbnail, rebuilt
   with a plain requestAnimationFrame lerp to match this site's own
   animation idiom (no external animation library required).
   ========================================================================== */

(function () {
  const list = document.getElementById('projectsList');
  const thumb = document.getElementById('projectsFloatingThumb');
  if (!list || !thumb) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (prefersReducedMotion || isCoarsePointer) return;

  const media = thumb.querySelector('img');
  const rows = Array.from(document.querySelectorAll('.project-row'));

  let targetY = 0;
  let currentY = 0;
  let active = false;
  let raf = null;

  function loop() {
    currentY += (targetY - currentY) * 0.16;
    thumb.style.transform = `translate3d(0, ${currentY}px, 0)`;
    if (Math.abs(targetY - currentY) > 0.1) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }

  function ensureLoop() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function yFor(row, clientY) {
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const half = thumb.offsetHeight / 2;
    const desired = clientY - listRect.top - half;
    const min = rowRect.top - listRect.top;
    const max = rowRect.bottom - listRect.top - thumb.offsetHeight;
    return Math.min(Math.max(desired, min), Math.max(min, max));
  }

  rows.forEach((row) => {
    const src = row.dataset.thumb;

    row.addEventListener('mouseenter', (e) => {
      if (!src) return;
      active = true;
      if (media.getAttribute('src') !== src) {
        media.setAttribute('src', src);
      }
      thumb.classList.add('is-active');
      targetY = yFor(row, e.clientY);
      currentY = targetY;
      thumb.style.transform = `translate3d(0, ${currentY}px, 0)`;
    });

    row.addEventListener('mousemove', (e) => {
      if (!active) return;
      targetY = yFor(row, e.clientY);
      ensureLoop();
    });

    row.addEventListener('mouseleave', () => {
      active = false;
      thumb.classList.remove('is-active');
    });
  });
})();

/* ==========================================================================
   MARQUEE — scroll-linked category strip (same ratio-based technique as
   the homepage merch marquee: transform tracks real scroll position, it
   doesn't run on its own timer)
   ========================================================================== */

(function () {
  const track = document.getElementById('projectsMarqueeTrack');
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
   SCROLL CUE — small ascii glyph that cycles based on scroll velocity,
   homage to a frame-cycling spinner tied to scroll speed rather than time.
   ========================================================================== */

(function () {
  const el = document.getElementById('projectsScrollGlyph');
  if (!el) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const frames = ['/', '-', '\\', '|'];
  const STEP = 32;
  let frame = 0;
  let accumulated = 0;
  let lastY = window.scrollY;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    accumulated += Math.abs(y - lastY);
    lastY = y;
    if (accumulated >= STEP) {
      accumulated %= STEP;
      frame = (frame + 1) % frames.length;
      el.textContent = frames[frame];
    }
  }, { passive: true });
})();

/* ==========================================================================
   FOOTER — pinned reveal (identical mechanism to the homepage's footer;
   see index.js for the full rationale on why this uses real scroll
   position rather than IntersectionObserver)
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
