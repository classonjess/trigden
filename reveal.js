// One observer-triggered reveal; content stays visible without animation support.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window) ||
      typeof Element === 'undefined' || !Element.prototype.animate ||
      typeof KeyframeEffect === 'undefined' || !('composite' in KeyframeEffect.prototype)) return;

  function start() {
    if (reduced.matches) return;
    const selectors = [
      '.home-service-card', '.about-service-card', '.service-card', '.support-card',
      '.process-card', '.work-card', '.testimonial-card', '.about-highlight',
      '.about-hero__visual', '.about-founder__copy', '.about-founder__photo-wrap',
      '.about-beyond__copy', '.about-collage__cell', '.contact-details', '.contact-secondary', '.inquiry-card',
      '.seo-hero__visual', '.about-values > *', '.about-process > *', '.web-benefit', '.web-steps > *',
      '.web-included', '.web-price-panel', '.wm-cats > li', '.wm-out > li', '.wm-care-card',
      '.gd-cats > li', '.gd-shot', '.gd-offer', '.seo-package',
      '.services-overview-hero__copy', '.services-overview-hero__art',
      '.web-hero__copy', '.web-hero__art', '.wm-hero__copy', '.wm-hero__visual',
      '.seo-hero__copy', '.gd-hero__copy', '.gd-mock', '.contact-hero > .about-wrap',
      '.studio-services__intro', '.contact-copy', '.contact-card', '.about-cta', '.web-care',
      '.web-section__head', '.wm-section__head', '.seo-section__head', '.gd-section__head',
      '.wm-care-heading', '.gd-price__head', '.web-inquiry__copy', '.wm-inquiry__copy',
      '.seo-inquiry__copy', '.gd-inquiry__copy', '.web-form', '.wm-form', '.seo-form', '.gd-form',
      '.web-faq__list > details', '.wm-faq__list > details', '.seo-faq__list > details', '.gd-faq__list > details',
      '.policy-page section', '.policy-header', '.about-hero__copy', 'main > .about-hero > .about-wrap'
    ].join(',');
    // Pick up future cards too, without mistaking card headings/media for cards.
    const extraCards = Array.from(document.querySelectorAll('main [class]')).filter(el =>
      Array.from(el.classList).some(name => /(?:^|[-_])card$/.test(name))
    );
    const excluded = '[hidden], dialog, [role="dialog"], .gd-lightbox, #entry-intro, nav, .hero-video, .work-mini-preview';
    const candidates = [...new Set([...document.querySelectorAll(selectors), ...extraCards])]
      .filter(el => !el.hidden && !el.closest(excluded));
    // Animate meaningful blocks once, not both a block and its nested content.
    const blocks = candidates.filter(el => !candidates.some(child => child !== el && el.contains(child)));
    // Photos already inside an animated card/illustration move with that block.
    // Standalone photos receive the same effect; logos, video posters, thumbnail
    // controls and lightbox images retain their existing interactive behavior.
    const photos = Array.from(document.querySelectorAll('main img'))
      .filter(el => !el.closest(excluded + ', .logo, .site-footer') &&
        !blocks.some(block => block.contains(el)));
    const targets = [...blocks, ...photos];
    const siblingCounts = new Map();
    targets.forEach(el => siblingCounts.set(el.parentElement, (siblingCounts.get(el.parentElement) || 0) + 1));
    // Match the deployed site's slideLeft animation and responsive timing.
    const mobile = matchMedia('(max-width: 768px)').matches;
    const duration = mobile ? 460 : 800;
    const inset = mobile ? 32 : 100;
    const threshold = mobile ? .02 : .1;
    const waiting = new Set();
    const running = new Map();
    const seen = new WeakSet();
    let stopped = false;
    let observer;

    function finish(el) {
      seen.add(el);
      waiting.delete(el);
      observer.unobserve(el);
      el.classList.remove('scroll-reveal');
      const run = running.get(el);
      if (run) {
        running.delete(el);
        clearTimeout(run.timeout);
        run.animations.forEach(animation => animation.cancel());
      }
    }

    function reveal(el, delay) {
      seen.add(el);
      waiting.delete(el);
      observer.unobserve(el);
      const run = { animations: [], timeout: null };
      running.set(el, run);
      try {
        const timing = { duration, delay, easing: 'ease-out', fill: 'both' };
        // Separate effects let opacity replace its base value while translation
        // adds to live CSS transforms (including hover), without capturing them.
        run.animations.push(el.animate([{ opacity: 0 }, { opacity: 1 }], timing));
        run.animations.push(el.animate(
          [{ transform: 'translateX(-40px)' }, { transform: 'translateX(0)' }],
          { ...timing, composite: 'add' }
        ));
        // A background tab or interrupted animation must never strand content.
        run.timeout = setTimeout(() => finish(el), duration + delay + 150);
        Promise.all(run.animations.map(animation => animation.finished))
          .then(() => finish(el), () => finish(el));
      } catch (_) { finish(el); }
    }

    observer = new IntersectionObserver(entries => {
      if (stopped) return;
      const groups = new Map();
      entries.forEach(entry => {
        const el = entry.target;
        if (seen.has(el)) return;
        if (entry.boundingClientRect.bottom <= 0) { finish(el); return; }
        const height = Math.max(0, window.innerHeight - inset);
        // Normalize the live threshold for blocks taller than the usable viewport.
        if (!entry.isIntersecting || entry.intersectionRect.height <
            Math.min(entry.boundingClientRect.height, height) * threshold) return;
        const group = siblingCounts.get(el.parentElement) > 1 ? el.parentElement : el;
        const order = groups.get(group) || 0;
        groups.set(group, order + 1);
        // Live desktop groups use 100ms steps; mobile service/support
        // cards use 120ms steps (other mobile groups have no delay).
        const card = el.matches('.home-service-card, .about-service-card, .service-card, .support-card');
        const delay = mobile ? (card ? Math.min(order, 2) * 120 : 0) : Math.min(order, 5) * 100;
        reveal(el, delay);
      });
    }, {
      // Extend only the upper boundary through the document: a fast jump from
      // below to above the viewport still crosses into this observer's root.
      // Otherwise an element can stay non-intersecting at both sampled frames.
      rootMargin: `${Math.max(document.documentElement.scrollHeight, window.innerHeight)}px 0px -${inset}px 0px`,
      threshold: Array.from({ length: 101 }, (_, i) => i / 100)
    });

    // Batch geometry reads before writes. Already-visible blocks never dim.
    const positions = targets.map(el => [el, el.getBoundingClientRect()]);
    positions.forEach(([el, rect]) => {
      if (rect.top < window.innerHeight) { finish(el); return; }
      waiting.add(el);
      el.classList.add('scroll-reveal');
      observer.observe(el);
    });

    function release() {
      stopped = true;
      observer.disconnect();
      [...waiting, ...running.keys()].forEach(finish);
    }
    reduced.addEventListener?.('change', event => { if (event.matches) release(); });
    window.addEventListener('pageshow', event => { if (event.persisted) release(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) [...running.keys()].forEach(finish);
    });
  }

  if (document.getElementById('entry-intro')) {
    window.addEventListener('trigden:intro-done', start, { once: true });
  } else start();
})();
