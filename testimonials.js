/* Small progressive enhancement: scrolling remains native. */
(() => {
  const section = document.querySelector('#testimonials');
  if (!section) return;
  const track = section.querySelector('#testimonial-track');
  const cards = [...track.querySelectorAll('.testimonial-card')];
  const controls = section.querySelector('.testimonial-controls');
  const dots = section.querySelector('.testimonial-pagination');
  const previous = section.querySelector('[data-testimonial-prev]');
  const next = section.querySelector('[data-testimonial-next]');
  const status = section.querySelector('.testimonial-status');
  const mobile = matchMedia('(max-width: 768px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let starts = [], current = 0, frame = 0;
  const visibleCount = () => mobile.matches ? 1 : 2;
  const offset = index => cards[index].offsetLeft - cards[0].offsetLeft;
  const label = index => `Show testimonials ${index + 1}${visibleCount() > 1 ? `–${Math.min(index + visibleCount(), cards.length)}` : ''} of ${cards.length}`;
  function measureReviews() {
    cards.forEach(card => {
      const quote = card.querySelector('.testimonial-quote');
      const button = card.querySelector('.testimonial-expand');
      const limit = parseFloat(getComputedStyle(quote).lineHeight) * 5;
      const long = quote.scrollHeight > limit + 1;
      card.classList.toggle('is-collapsible', long);
      button.hidden = !long;
      if (!long) setExpanded(card, false);
    });
  }
  function setExpanded(card, expanded) {
    const button = card.querySelector('.testimonial-expand');
    const name = card.querySelector('.testimonial-name').textContent;
    card.classList.toggle('is-expanded', expanded);
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', `${expanded ? 'Read less of the review' : 'Read full review'} by ${name}`);
    if (expanded) button.textContent = 'Read less';
    else {
      button.textContent = 'Read full review ';
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
      button.append(arrow);
    }
  }
  cards.forEach(card => {
    card.querySelector('.testimonial-expand').addEventListener('click', () => {
      setExpanded(card, !card.classList.contains('is-expanded'));
    });
  });
  function update(announce = false) {
    let nearest = 0;
    starts.forEach((start, i) => {
      if (Math.abs(track.scrollLeft - offset(start)) < Math.abs(track.scrollLeft - offset(starts[nearest]))) nearest = i;
    });
    current = nearest;
    previous.setAttribute('aria-disabled', String(current === 0));
    next.setAttribute('aria-disabled', String(current === starts.length - 1));
    [...dots.children].forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
    if (announce) status.textContent = label(starts[current]).replace('Show testimonials', 'Showing testimonials');
  }
  function go(page) {
    if (page < 0 || page >= starts.length) return;
    current = page;
    track.scrollTo({left: offset(starts[page]), behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  function build() {
    const priorStart = starts[current] || 0;
    const focusedDot = dots.contains(document.activeElement);
    const count = visibleCount();
    starts = [];
    for (let i = 0; i < Math.max(1, cards.length - count + 1); i += count) starts.push(i);
    const last = Math.max(0, cards.length - count);
    if (starts.at(-1) !== last) starts.push(last);
    dots.replaceChildren();
    starts.forEach((start, page) => {
      const dot = document.createElement('button');
      dot.type = 'button'; dot.className = 'testimonial-dot';
      dot.setAttribute('aria-label', label(start)); dot.setAttribute('aria-controls', track.id);
      dot.addEventListener('click', () => go(page)); dots.append(dot);
    });
    current = Math.max(0, starts.findLastIndex(start => start <= priorStart));
    track.scrollTo({left: offset(starts[current]), behavior: 'instant'});
    controls.hidden = starts.length < 2;
    update();
    if (focusedDot) dots.children[current]?.focus({preventScroll: true});
  }
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  // Restrict shortcuts to the track itself so other controls retain their native keyboard behavior.
  track.addEventListener('keydown', event => {
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const page = {ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: starts.length - 1}[event.key];
    if (page === undefined) return;
    event.preventDefault(); go(page);
  });
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => update());
  }, {passive: true});
  track.addEventListener('scrollend', () => update(true));
  mobile.addEventListener('change', () => { measureReviews(); build(); });
  // Ignore height-only changes from opening reviews, preserving control focus.
  let measuredWidth = 0;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (Math.abs(width - measuredWidth) < .5) return;
    measuredWidth = width; measureReviews(); build();
  }).observe(track);
  if (document.fonts) document.fonts.ready.then(measureReviews);
  measureReviews(); build();
})();
