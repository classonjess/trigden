# Trigden Studio

Static website for Trigden Studio. The homepage introduces custom websites for Denver small businesses, shows recent projects, and sends quote requests to the existing Formspree form. The About page is `about.html`. The Services page is `services.html`.

## Run locally

From this folder:

```bash
python3 -m http.server 8741
```

Open [http://127.0.0.1:8741/](http://127.0.0.1:8741/).

This copy is for local review. It does not publish the live site.

The public website source is [classonjess/trigden](https://github.com/classonjess/trigden) on `master`. The separate `trigden-review` repository is not this checkout.

## Contact page

`contact.html` is the dedicated project inquiry page. Its scoped layout is in `contact.css`; validation and asynchronous submission are in `contact.js`. Shared navigation, footer, fonts, consent and analytics remain in use. Contact CTAs point to this page.

The form reuses the existing Formspree endpoint `https://formspree.io/f/xreaqvyn`; no frontend secrets or additional backend are required. Formspree handles server-side submission processing and email delivery. The client validates required fields and email format, includes a `_gotcha` honeypot, handles rate-limit responses, and only displays success after an HTTP success response with `ok: true`. Failures preserve the inquiry for retry. Native POST submission remains available without JavaScript.

Before publishing, confirm in the Formspree dashboard that this form is active, that its verified notification recipient is `hello@trigdenstudio.com`, and that the production domain and spam protections are configured. The repository cannot establish those account settings. After deployment, submit a clearly marked test inquiry and confirm it arrives in that inbox; email delivery has not been verified during local implementation. No API key or new environment variable is needed for this integration.

Local checks cover desktop (1440px), tablet (820px), and phone (390px) layout, required-field and email errors, and submission response handling. CookieYes loads only on its registered production domain; verify the banner there before publishing. The review repository does not publish the live site.

## SEO and responsive review branch

`/contact` remains indexable with its own canonical. The retired logo and brand-design aliases remain noindex and point directly to `/graphic-design`. Sitemap entries use only preferred, extensionless URLs.

`_headers` restricts `X-Robots-Tag: noindex` to both project and version/branch Pages hostnames. Cloudflare Pages does **not** support hostname matching in `_redirects`, so `functions/_middleware.js` implements the 301 for `www.trigdenstudio.com`, preserving query parameters and normalizing legacy page paths in the same redirect. `_redirects` provides matching path-only fallback rules; Pages Functions take precedence. The middleware passes clean apex requests through and also sets preview noindex headers, because `_headers` does not apply to Function responses. This needs Pages Functions support when eventually deployed; it uses no secrets or build step. References: [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

CookieYes now loads through `cookie-banner.js` only on its registered production hostnames, avoiding domain mismatch errors on localhost and previews. Consent defaults remain denied and the consent-aware analytics integration is retained. Configure additional CookieYes domains explicitly before expanding the loader allowlist.

Run dependency-free checks with `node --test tests/seo-responsive.test.mjs`. Browser QA covers each HTML page and alias at 375, 414, 768, 1024, 1366, and 1920px, plus the legacy navigation fragment. Test open/close menu controls, the 44px mobile targets, content visibility, overflow and console errors. Hostname tests run locally; final Cloudflare header/redirect behavior must be verified after a separately approved deployment.


## Preferred URLs and regression checks

Cloudflare Pages serves `web-design.html` at `/web-design` and redirects the file URL to the extensionless URL. Keeping `.html` in metadata and links therefore creates redirecting canonical, sitemap and navigation references. Keep source filenames unchanged, but publish root-relative clean links (`/`, `/about`, `/services`, `/web-design`, `/website-maintenance`, `/seo`, `/graphic-design`, `/contact`, `/privacy`, `/terms`). Use the same preferred paths in canonical, Open Graph, Twitter and JSON-LD URLs. Preserve fragments and query parameters.

The Pages middleware and `_redirects` normalize known legacy `.html`, homepage and trailing-slash paths with permanent 301 redirects. Branding, brand-design and logo-design aliases go straight to `/graphic-design`. Unknown paths and assets are not rewritten. When adding a page, update both redirect inventories and run the full tests; the URL consistency suite discovers HTML pages automatically and rejects redirecting internal links or metadata.

There is no dependency installation or static-site build step. Run all checks with:

```bash
node --test tests/*.test.mjs
```

For extensionless routing and Pages Functions preview, use a locally available Wrangler (validated with 4.151.3):

```bash
wrangler pages dev . --ip 127.0.0.1 --port 8741 --compatibility-date 2026-10-21
```

The simple Python file server above can preview individual HTML files but does not emulate Cloudflare's clean routing or redirects. Verify production HTTP statuses and redirects again after a separately authorized deployment; local tests do not change hosting settings or production.
