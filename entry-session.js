/* Show the homepage entry animation once per tab session, never on internal returns. */
(function () {
  var returning = false;
  try {
    returning = sessionStorage.getItem('trigden-entry-seen') === '1';
    sessionStorage.setItem('trigden-entry-seen', '1');
  } catch (_) { /* Referrer remains a fallback when storage is unavailable. */ }
  try {
    returning = returning || (document.referrer && new URL(document.referrer).origin === location.origin);
  } catch (_) { /* Ignore malformed referrers. */ }
  if (returning) document.documentElement.classList.add('skip-entry-intro');
})();
