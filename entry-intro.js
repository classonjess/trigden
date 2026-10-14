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
})();
