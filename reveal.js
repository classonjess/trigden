// Shared block reveals. Unenhanced content always stays visible.
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  const seen = new WeakSet();
  const observer = new IntersectionObserver(entries => {
    const entering = new Set(entries.filter(entry => entry.isIntersecting && !seen.has(entry.target)).map(entry => entry.target));
    entries.forEach(entry => {
      if (!entry.isIntersecting || seen.has(entry.target)) return;
      const el = entry.target;
      seen.add(el);
      observer.unobserve(el);
      const siblings = targets.filter(other => other.parentElement === el.parentElement && entering.has(other));
      el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 3) * 0.14}s`);
      // Preserve existing scale/rotation, including compact hero mockups and hover transforms.
      const baseTransform = getComputedStyle(el).transform;
      if (baseTransform !== 'none') el.style.setProperty('--reveal-base-transform', baseTransform);
      el.classList.add('site-reveal');
      // Return full control to the original hover styles after this one entrance.
      el.addEventListener('animationend', event => {
        if (event.target === el && event.animationName === 'cardEnter') el.classList.remove('site-reveal');
      });
    });
  }, { threshold: 0.18, rootMargin: '0px' });
  targets.forEach(el => observer.observe(el));
})();
