# Trigden Studio

Static website for Trigden Studio. The homepage introduces custom websites for Denver small businesses, shows recent projects, and sends quote requests to the existing Formspree form. The About page is `about.html`. The Services page is `services.html`.

## Run locally

From this folder:

```bash
python3 -m http.server 8741
```

Open [http://127.0.0.1:8741/](http://127.0.0.1:8741/).

This copy is for local review. It does not publish the live site.

Each update is pushed to the private repo [classonjess/trigden-review](https://github.com/classonjess/trigden-review) on `main`. In GitHub Desktop, pull that repo to get the latest copy.

## Contact page

`contact.html` is the dedicated project inquiry page. Its scoped layout is in `contact.css`; validation and asynchronous submission are in `contact.js`. Shared navigation, footer, fonts, consent and analytics remain in use. Contact CTAs point to this page.

The form reuses the existing Formspree endpoint `https://formspree.io/f/xreaqvyn`; no frontend secrets or additional backend are required. Formspree handles server-side submission processing and email delivery. The client validates required fields and email format, includes a `_gotcha` honeypot, handles rate-limit responses, and only displays success after an HTTP success response with `ok: true`. Failures preserve the inquiry for retry. Native POST submission remains available without JavaScript.

Before publishing, confirm in the Formspree dashboard that this form is active, that its verified notification recipient is `hello@trigdenstudio.com`, and that the production domain and spam protections are configured. The repository cannot establish those account settings. After deployment, submit a clearly marked test inquiry and confirm it arrives in that inbox; email delivery has not been verified during local implementation. No API key or new environment variable is needed for this integration.

Local checks cover desktop (1440px), tablet (820px), and phone (390px) layout, required-field and email errors, and submission response handling. CookieYes loads only on its registered production domain; verify the banner there before publishing. The review repository does not publish the live site.

## SEO and responsive review branch

The `seo-responsive-fixes` changes are proposed through a pull request, without merging or deploying. `contact.html` is intentionally `noindex, follow` with the homepage canonical per the requested SEO policy; the logo and graphic-design aliases also use noindex with their destination canonicals. Existing sitemap entries are retained.

`_headers` restricts `X-Robots-Tag: noindex` to both project and version/branch Pages hostnames. Cloudflare Pages does **not** support hostname matching in `_redirects`, so that file documents the requested rule and `functions/_middleware.js` implements the equivalent 301 for `www.trigdenstudio.com`, preserving path and query. The middleware passes apex requests through and also sets preview noindex headers, because `_headers` does not apply to Function responses. This needs Pages Functions support when eventually deployed; it uses no secrets or build step. References: [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

CookieYes now loads through `cookie-banner.js` only on its registered production hostnames, avoiding domain mismatch errors on localhost and previews. Consent defaults remain denied and the consent-aware analytics integration is retained. Configure additional CookieYes domains explicitly before expanding the loader allowlist.

Run dependency-free checks with `node --test tests/seo-responsive.test.mjs`. Browser QA covers each HTML page and alias at 375, 414, 768, 1024, 1366, and 1920px, plus the legacy navigation fragment. Test open/close menu controls, the 44px mobile targets, content visibility, overflow and console errors. Hostname tests run locally; final Cloudflare header/redirect behavior must be verified after a separately approved deployment.
