// Enhance cards only. Content is visible before this script and without motion support.
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const selectors = [
    '.home-service-card', '.about-service-card', '.service-card', '.support-card',
    '.process-card', '.work-card', '.testimonial-card', '.about-highlight',
    '.about-values > *', '.about-process > *', '.web-benefit', '.web-steps > *',
    '.web-included', '.web-price-panel', '.wm-cats > li', '.wm-out > li', '.wm-care-card',
    '.gd-cats > li', '.gd-shot', '.gd-offer', '.seo-package'
  ].join(',');
  const candidates = Array.from(document.querySelectorAll(selectors));
  const targets = candidates.filter(el => !candidates.some(child => child !== el && el.contains(child)));
  const seen = new WeakSet();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || seen.has(entry.target)) return;
      const el = entry.target;
      seen.add(el);
      observer.unobserve(el);
      const siblings = targets.filter(other => other.parentElement === el.parentElement);
      el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 3) * 0.1}s`);
      el.classList.add('site-reveal');
      // Return full control to the original hover styles after this one entrance.
      el.addEventListener('animationend', event => {
        if (event.target === el && event.animationName === 'cardEnter') el.classList.remove('site-reveal');
      });
    });
  }, { threshold: 0.08, rootMargin: '0px' });
  targets.forEach(el => observer.observe(el));
})();
