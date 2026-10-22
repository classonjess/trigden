/* Restore the original welcome screen; never gate hero loading on the intro. */
(function () {
  const template = document.getElementById('entry-intro-template');
  if (!template) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (window.trigdenShouldPlayIntro !== true ||
      document.documentElement.classList.contains('skip-entry-intro') || reduced.matches) {
    template.remove();
    return;
  }

  let intro, logo, loadDeadline, pulseDeadline, removeDeadline;
  let dismissed = false;
  function remove() {
    clearTimeout(removeDeadline);
    intro?.remove();
    window.dispatchEvent(new Event('trigden:intro-done'));
  }
  function dismiss(immediate = false) {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(loadDeadline);
    clearTimeout(pulseDeadline);
    reduced.removeEventListener('change', onMotionChange);
    window.removeEventListener('trigden:intro-cancel', onCancel);
    window.removeEventListener('pagehide', onCancel);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (immediate || reduced.matches) remove();
    else {
      intro?.classList.add('is-exiting');
      removeDeadline = setTimeout(remove, 250);
    }
  }
  function onCancel() { dismiss(true); }
  function onMotionChange(event) { if (event.matches) dismiss(true); }
  function onVisibilityChange() { if (document.hidden) dismiss(true); }

  try {
    template.before(template.content.cloneNode(true));
    template.remove();
    intro = document.getElementById('entry-intro');
    logo = intro?.querySelector('.entry-intro__logo');
    if (!logo) { dismiss(true); return; }
    window.addEventListener('trigden:intro-cancel', onCancel);
    window.addEventListener('pagehide', onCancel);
    document.addEventListener('visibilitychange', onVisibilityChange);
    reduced.addEventListener('change', onMotionChange);
    // Bound the wait for a failed/stalled image. Pulses get their own full deadline.
    loadDeadline = setTimeout(() => dismiss(true), 3000);
    logo.addEventListener('error', onCancel, { once: true });
    async function ready() {
      try {
        if (typeof logo.decode === 'function') await logo.decode();
        if (dismissed) return;
        if (!logo.complete || !logo.naturalWidth) { dismiss(true); return; }
        clearTimeout(loadDeadline);
        // Allow a decoded, visible frame before starting all three cycles.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (dismissed || reduced.matches || document.hidden) { dismiss(true); return; }
          logo.addEventListener('animationend', event => {
            if (event.animationName === 'introLogoPulse') dismiss();
          }, { once: true });
          intro.classList.add('is-ready');
          // Three 650ms pulses take 1950ms; allow a bounded event fallback.
          pulseDeadline = setTimeout(() => dismiss(), 2200);
        }));
      } catch (_) { dismiss(true); }
    }
    if (logo.complete) ready();
    else logo.addEventListener('load', ready, { once: true });
  } catch (_) {
    template.remove();
    dismiss(true);
  }
})();
