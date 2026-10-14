// Shared homepage-style block reveal. Content remains visible without JavaScript.
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const selectors = [
    'main section', '.policy-page section',
    '.home-service-card', '.about-service-card', '.service-card', '.support-card', '.process-card', '.work-card',
    'main article', '.about-values > *', '.about-process > *',
    '.wm-cats > li', '.wm-why__list > li', '.wm-out > li',
    '.gd-why__list > li', '.web-steps > *', '.inquiry-card'
  ].join(',');
  const candidates = Array.from(document.querySelectorAll(selectors));
  // Animate the individual blocks when present, rather than animating their parent too.
  const targets = candidates.filter(el => !candidates.some(child => child !== el && el.contains(child)));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const siblings = targets.filter(other => other.parentElement === el.parentElement);
      el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 3) * 0.1}s`);
      el.classList.add('site-reveal');
      observer.unobserve(el);
    });
  }, { threshold: 0.02, rootMargin: '0px 0px -32px 0px' });
  targets.forEach(el => observer.observe(el));
})();
