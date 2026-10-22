/* First-visit pulses decorate the existing logo without delaying or hiding content. */
(function () {
  const logo = document.querySelector('#nav .logo img');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!logo || window.trigdenShouldPlayIntro !== true ||
      document.documentElement.classList.contains('skip-entry-intro') || reduced.matches) return;

  logo.classList.add('entry-logo-pulse');
  let dismissed = false;
  let fallback;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(fallback);
    logo.classList.remove('entry-logo-pulse');
    logo.removeEventListener('animationend', dismiss);
    reduced.removeEventListener('change', onMotionChange);
    window.removeEventListener('trigden:intro-cancel', dismiss);
    window.removeEventListener('pagehide', dismiss);
    window.dispatchEvent(new Event('trigden:intro-done'));
  }
  function onMotionChange(event) { if (event.matches) dismiss(); }
  logo.addEventListener('animationend', dismiss);
  // Three 650ms pulses take 1950ms; a fallback cleans up if animation events fail.
  fallback = setTimeout(dismiss, 2200);
  window.addEventListener('trigden:intro-cancel', dismiss);
  window.addEventListener('pagehide', dismiss);
  reduced.addEventListener('change', onMotionChange);
})();
