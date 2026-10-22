/* Keep the studio signature and copyright current, including history restoration. */
(() => {
  const refresh = () => {
    const date = new Date();
    const day = document.getElementById('current-day');
    const year = document.getElementById('year');
    if (day) day.textContent = date.toLocaleDateString('en-US', { weekday: 'long' });
    if (year) year.textContent = date.getFullYear();
  };
  refresh();
  window.addEventListener('pageshow', refresh);
  const word = document.querySelector('.footer-signature .rotating-word');
  const article = document.getElementById('rotating-article');
  const words = ['incredible', 'awesome', 'brilliant', 'fantastic', 'amazing', 'wonderful'];
  let index = 0;
  if (word && article && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.setInterval(() => {
      if (document.hidden) return;
      index = (index + 1) % words.length;
      word.textContent = words[index];
      article.textContent = /^[aeiou]/i.test(words[index]) ? 'an' : 'a';
      refresh();
    }, 3000);
  }
})();

/* Align the desktop icon to Website Maintenance & Support without shifting columns. */
(() => {
  const footer = document.querySelector('footer.site-footer');
  const grid = footer?.querySelector('.footer-studio-grid');
  const services = footer?.querySelector('[aria-label="Footer services"]');
  const bottom = footer?.querySelector('.footer-bottom');
  const social = footer?.querySelector('.footer-linkedin');
  const icon = social?.querySelector('svg path');
  if (!grid || !services || !bottom) return;
  const links = [...services.querySelectorAll('a')];
  const align = () => {
    const boundary = bottom.getBoundingClientRect();
    const desktop = matchMedia('(min-width: 769px)').matches;
    const referenceLinks = desktop
      ? links.filter(link => link.getAttribute('href') === '/website-maintenance') : links;
    const rightEdges = referenceLinks.flatMap(link => {
      const range = document.createRange();
      range.selectNodeContents(link);
      return [...range.getClientRects()].map(rect => rect.right);
    });
    if (!rightEdges.length) return;
    // The visible glyph sits inside both the SVG and the 44px link target.
    const iconInset = social && icon && desktop
      ? social.getBoundingClientRect().right - icon.getBoundingClientRect().right : 0;
    const inset = Math.max(0, boundary.right - Math.max(...rightEdges) - iconInset);
    footer.style.setProperty('--footer-services-end-space', `${inset}px`);
  };
  const observer = new ResizeObserver(align);
  observer.observe(grid);
  links.forEach(link => observer.observe(link));
  window.addEventListener('pageshow', align);
  if (document.fonts) document.fonts.ready.then(align);
  align();
})();
