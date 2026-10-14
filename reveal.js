// One progressive, scroll-linked reveal. No JS/support/reduced motion means visible content.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window) ||
      typeof CSS === 'undefined' || !CSS.supports('translate', '0px 1px')) return;
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
  const targets = candidates.filter(el => !candidates.some(child => child !== el && el.contains(child)));
  // Native view timelines handle the compositor work when supported. Older Safari
  // uses cached positions and one frame per scroll event, never an idle RAF loop.
  const travel = 150;
  const native = CSS.supports('animation-timeline', 'view()') &&
    CSS.supports('animation-range', 'entry 0px entry 150px');
  const finished = new WeakSet();
  const active = new Map();
  const states = new WeakMap();
  let frame = 0;
  let measure = false;
  let observer;
  let completion;
  let resizeObserver;

  function finish(el) {
    finished.add(el);
    active.delete(el);
    el.classList.remove('scroll-reveal', 'scroll-reveal--native');
    el.style.removeProperty('--scroll-reveal-progress');
    observer.unobserve(el);
    if (completion) completion.unobserve(el);
  }

  function paint() {
    frame = 0;
    const y = window.scrollY;
    const height = window.innerHeight;
    // Batch reads before writes, only after a resize/content-size change.
    if (measure) {
      active.forEach((state, el) => {
        state.top = el.getBoundingClientRect().top + y - 20 * (1 - state.progress);
      });
      measure = false;
    }
    active.forEach((state, el) => {
      const progress = Math.max(0, Math.min(1, (height + y - state.top) / travel));
      if (progress >= 1) finish(el);
      else {
        state.progress = progress;
        el.style.setProperty('--scroll-reveal-progress', progress.toFixed(4));
      }
    });
  }
  function schedule() {
    if (!frame && active.size) frame = requestAnimationFrame(paint);
  }
  function resize() {
    measure = true;
    schedule();
  }

  if (native) {
    completion = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) finish(entry.target);
      });
    }, { rootMargin: `0px 0px -${travel}px 0px`, threshold: 0 });
  } else {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(document.body);
    }
  }

  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const el = entry.target;
      if (finished.has(el)) return;
      if (!entry.isIntersecting) {
        if (entry.boundingClientRect.bottom < 0) finish(el);
        else active.delete(el);
        return;
      }
      const old = states.get(el);
      const offset = 20 * (1 - (old ? old.progress : 0));
      const top = entry.boundingClientRect.top - offset;
      const distance = window.innerHeight - top;
      // Above-the-fold/already-visible blocks never flash back to low opacity.
      if (distance >= travel) { finish(el); return; }
      if (native) {
        el.classList.add('scroll-reveal', 'scroll-reveal--native');
        completion.observe(el);
      } else {
        const state = { top: top + window.scrollY, progress: Math.max(0, distance / travel) };
        states.set(el, state);
        active.set(el, state);
        el.style.setProperty('--scroll-reveal-progress', state.progress.toFixed(4));
        el.classList.add('scroll-reveal');
        schedule();
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px 50px 0px' });
  // Read the untransformed geometry in one batch before arming any target.
  const positions = targets.map(el => [el, el.getBoundingClientRect()]);
  positions.forEach(([el, rect]) => {
    if (rect.top < window.innerHeight) { finish(el); return; }
    el.classList.add('scroll-reveal');
    if (native) {
      el.classList.add('scroll-reveal--native');
      completion.observe(el);
    } else {
      states.set(el, { top: rect.top + window.scrollY, progress: 0 });
    }
    observer.observe(el);
  });

  reduced.addEventListener?.('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    if (completion) completion.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    if (frame) cancelAnimationFrame(frame);
    active.clear();
    targets.forEach(el => {
      el.classList.remove('scroll-reveal', 'scroll-reveal--native');
      el.style.removeProperty('--scroll-reveal-progress');
    });
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', resize);
  });
  }
  if (document.getElementById('entry-intro')) {
    window.addEventListener('trigden:intro-done', start, { once: true });
  } else start();
})();
