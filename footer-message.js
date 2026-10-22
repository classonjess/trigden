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
    const rightEdges = links.flatMap(link => {
      const range = document.createRange();
      range.selectNodeContents(link);
      return [...range.getClientRects()].map(rect => rect.right);
    });
    if (!rightEdges.length) return;
    if (!desktop) {
      footer.style.setProperty('--footer-services-end-space', `${Math.max(0, boundary.right - Math.max(...rightEdges))}px`);
      footer.style.removeProperty('--footer-icon-end-padding');
      footer.style.removeProperty('--footer-icon-justify');
      return;
    }
    const reference = services.querySelector('a[href="/website-maintenance"]');
    const svg = social?.querySelector('svg');
    if (!reference || !social || !icon || !svg) return;
    // Use the last non-whitespace character, including when the link wraps.
    const walker = document.createTreeWalker(reference, NodeFilter.SHOW_TEXT);
    let text, last;
    while ((text = walker.nextNode())) if (text.textContent.trimEnd()) last = text;
    if (!last) return;
    const end = last.textContent.trimEnd().length;
    const range = document.createRange();
    range.setStart(last, end - 1);
    range.setEnd(last, end);
    const available = Math.max(0, boundary.right - range.getBoundingClientRect().right);
    const svgBounds = svg.getBoundingClientRect();
    const glyphEndSpace = svgBounds.right - icon.getBoundingClientRect().right;
    const centeredInset = (social.getBoundingClientRect().width - svgBounds.width) / 2 + glyphEndSpace;
    // Keep the accessible target fixed; use its internal space before moving the group.
    const iconInset = Math.min(centeredInset, Math.max(glyphEndSpace, available));
    footer.style.setProperty('--footer-icon-justify', 'flex-end');
    footer.style.setProperty('--footer-icon-end-padding', `${Math.max(0, iconInset - glyphEndSpace)}px`);
    footer.style.setProperty('--footer-services-end-space', `${Math.max(0, available - iconInset)}px`);
  };
  const observer = new ResizeObserver(align);
  observer.observe(grid);
  links.forEach(link => observer.observe(link));
  window.addEventListener('pageshow', align);
  if (document.fonts) document.fonts.ready.then(align);
  align();
})();
