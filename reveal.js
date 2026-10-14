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
    const candidates = Array.from(document.querySelectorAll(selectors)).filter(el => !el.hidden);
    // Animate meaningful blocks once, not both a block and its nested content.
    const targets = candidates.filter(el => !candidates.some(child => child !== el && el.contains(child)));
    const siblingCounts = new Map();
    targets.forEach(el => siblingCounts.set(el.parentElement, (siblingCounts.get(el.parentElement) || 0) + 1));
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
        const timing = { duration: 850, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' };
        // Separate effects let opacity replace its base value while translation
        // adds to live CSS transforms (including hover), without capturing them.
        run.animations.push(el.animate([{ opacity: 0 }, { opacity: 1 }], timing));
        run.animations.push(el.animate(
          [{ transform: 'translateY(18px)' }, { transform: 'translateY(0)' }],
          { ...timing, composite: 'add' }
        ));
        // A background tab or interrupted animation must never strand content.
        run.timeout = setTimeout(() => finish(el), 850 + delay + 150);
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
        const height = window.innerHeight;
        // Tall sections need only 12% of a viewport, not 12% of their full height.
        if (!entry.isIntersecting || entry.intersectionRect.height <
            Math.min(entry.boundingClientRect.height, height) * .12) return;
        const group = siblingCounts.get(el.parentElement) > 1 ? el.parentElement : el;
        const order = groups.get(group) || 0;
        groups.set(group, order + 1);
        // At most 140ms, even for long grids; never accumulate delays offscreen.
        reveal(el, Math.min(order, 2) * 70);
      });
    }, {
      // Extend only the upper boundary through the document: a fast jump from
      // below to above the viewport still crosses into this observer's root.
      // Otherwise an element can stay non-intersecting at both sampled frames.
      rootMargin: `${Math.max(document.documentElement.scrollHeight, window.innerHeight)}px 0px 0px 0px`,
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
