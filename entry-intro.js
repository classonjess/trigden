/* Inert markup cannot flash on internal navigation or when scripts fail. */
(function () {
  const template = document.getElementById('entry-intro-template');
  if (!template) return;
  if (window.trigdenShouldPlayIntro === true &&
      !document.documentElement.classList.contains('skip-entry-intro') &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    template.before(template.content.cloneNode(true));
  }
  if (!window.trigdenShouldPlayIntro) document.body.classList.remove('intro-active');
  template.remove();
  const intro = document.getElementById('entry-intro');
  if (!intro) { document.body.classList.remove('intro-active'); return; }
  document.body.classList.add('intro-active');
  let dismissed = false;
  let fallback;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(fallback);
    intro.classList.add('is-exiting');
    document.body.classList.remove('intro-active');
    setTimeout(() => {
      intro.remove();
      window.dispatchEvent(new Event('trigden:intro-done'));
    }, 250);
  }
  intro.querySelector('.entry-intro__logo')?.addEventListener('animationend', dismiss, { once: true });
  // Three 650ms pulses take 1950ms; fallback must allow all three to finish.
  fallback = setTimeout(dismiss, 2200);
  window.addEventListener('pagehide', dismiss, { once: true });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (event.matches) dismiss();
  });
})();
