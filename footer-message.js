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
