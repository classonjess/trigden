// CookieYes is registered for the production domain. Consent stays denied on
// localhost and Pages previews, where loading its domain-bound script errors.
(() => {
  if (!['trigdenstudio.com', 'www.trigdenstudio.com'].includes(location.hostname)) return;
  const script = document.createElement('script');
  script.id = 'cookieyes';
  script.src = 'https://cdn-cookieyes.com/client_data/7bdd59f8a27359a8f937a8ff3725c9c2/script.js';
  script.async = true;
  document.head.appendChild(script);
})();
