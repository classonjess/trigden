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

`_headers` restricts `X-Robots-Tag: noindex` to both project and version/branch Pages hostnames. Cloudflare Pages does **not** support hostname matching in `_redirects`, so `functions/_middleware.js` implements the 301 for `www.trigdenstudio.com`, preserving query parameters and normalizing legacy page paths in the same redirect. `_redirects` provides matching path-only fallback rules; Pages Functions take precedence. The middleware passes clean apex requests through and also sets preview noindex headers, because `_headers` does not apply to Function responses. This needs Pages Functions support when eventually deployed; Functions use no secrets and the asset packaging step below leaves their source unchanged. References: [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

CookieYes now loads through `cookie-banner.js` only on its registered production hostnames, avoiding domain mismatch errors on localhost and previews. Consent defaults remain denied and the consent-aware analytics integration is retained. Configure additional CookieYes domains explicitly before expanding the loader allowlist.

Run dependency-free checks with `node --test tests/seo-responsive.test.mjs`. Browser QA covers each HTML page and alias at 375, 414, 768, 1024, 1366, and 1920px, plus the legacy navigation fragment. Test open/close menu controls, the 44px mobile targets, content visibility, overflow and console errors. Hostname tests run locally; final Cloudflare header/redirect behavior must be verified after a separately approved deployment.


## Preferred URLs and regression checks

Cloudflare Pages serves `web-design.html` at `/web-design` and redirects the file URL to the extensionless URL. Keeping `.html` in metadata and links therefore creates redirecting canonical, sitemap and navigation references. Keep source filenames unchanged, but publish root-relative clean links (`/`, `/about`, `/services`, `/web-design`, `/website-maintenance`, `/seo`, `/graphic-design`, `/contact`, `/privacy`, `/terms`). Use the same preferred paths in canonical, Open Graph, Twitter and JSON-LD URLs. Preserve fragments and query parameters.

The Pages middleware and `_redirects` normalize known legacy `.html`, homepage and trailing-slash paths with permanent 301 redirects. Branding, brand-design and logo-design aliases go straight to `/graphic-design`. Unknown paths and assets are not rewritten. When adding a page, update both redirect inventories and run the full tests; the URL consistency suite discovers HTML pages automatically and rejects redirecting internal links or metadata.

No dependency installation or application compilation is required. A local packaging step now creates the publish directory (see below). Run all checks with:

```bash
node --test tests/*.test.mjs
```

For extensionless routing and Pages Functions preview, use a locally available Wrangler (validated with 4.151.3):

```bash
node scripts/build-site.mjs
wrangler pages dev dist --ip 127.0.0.1 --port 8741 --compatibility-date 2026-10-21
```

The simple Python file server above can preview individual HTML files but does not emulate Cloudflare's clean routing or redirects. Verify production HTTP statuses and redirects again after a separately authorized deployment; local tests do not change hosting settings or production.


## Optimized homepage hero video (local review)

The active H.264 MP4s use CRF 22, the slow preset, yuv420p and fast-start, with audio removed. The original frame rate (24000/1001), 410 frames, aspect ratio, hero crop/positioning, muted inline playback and 0.90 playback rate are preserved.

| Asset | Resolution | Bytes | Reduction from original |
|---|---|---:|---:|
| Preserved `video/website-banner-720.mp4` | 1280×720 | 15,051,042 | — |
| `video/hero-desktop-crf22.mp4` | 1280×720 | 1,498,619 | 90.04% |
| `video/hero-mobile-crf22.mp4` | 768×432 | 561,203 | 96.27% |

The original remains untouched with SHA-256 `ad7c397b287952ebd7d31b83c48cd9964e27ffd68d1c8eed7aac22924cc8f2ca`. Tests pin its checksum and both approved candidate checksums. The original is no longer referenced by the homepage. The existing 51,556-byte WebP poster and its preload are unchanged.

`hero-video.js` assigns one source when loading first becomes eligible: mobile at widths up to 480px, desktop above 480px. It never swaps sources on resize or orientation change, avoiding a second variant download. The mobile version was compared in the actual 390px and 402px hero crop; it has softer background detail but preserves composition and foreground readability. Wider screens retain 720p to limit enlargement. Mobile quality remains subject to owner review on a physical phone.

Reduced-motion visitors initially get the poster with no video request. The explicit play button can opt into playback. Enabling reduced motion during playback pauses it; changing preferences before the idle start cancels that automatic download. A failed video or rejected play request leaves the poster visible and the control labeled Play. Successful playback updates the control from actual media state; a stale promise cannot override a newer playback or pause. The first-visit intro is now three pulses on the existing navigation logo; there is no fullscreen overlay, scroll lock or hero-content gate. Intro-only overlay styles and its extra logo preload were removed.

Run all dependency-free regression tests with `node --test tests/*.test.mjs`. Optional browser checks require an existing Playwright installation and a local preview server. The tested Wrangler 4.151.3 Pages preview returns HTTP 200 without video byte-range support; the harness waits for a confirmed frame during natural playback instead of seeking. On a byte-range-capable server it can seek to the comparison frame. No portal dependency or package manifest changes are required:

```bash
TRIGDEN_PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
TRIGDEN_CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
TRIGDEN_PREVIEW_URL=http://127.0.0.1:8741 \
TRIGDEN_BROWSER_ARTIFACTS=/absolute/path/outside/this/repository \
node tests/hero-video.browser.mjs
```

The browser harness allows only localhost URLs and blocks external requests. It covers desktop, phone, tablet and source-selection boundaries; one-variant requests; resize; first-visit content/clickability; reduced motion and explicit play; unavailable video; disabled JavaScript; and slow video. Screenshots wait for a confirmed presented video frame instead of accidentally comparing the poster. External webfonts are blocked for deterministic local checks; actual production font timing is not measured.

Local checks include all SEO regressions, packaging/inventory tests and browser scenarios for rejected autoplay, synchronous play failures and explicit recovery, alongside the existing desktop/mobile, reduced-motion and resize cases. Chrome 155 is used in isolated contexts; 74 automated tests and 13 Chrome browser scenarios passed against the packaged Pages preview. Chrome mobile emulation is **not** Safari or mobile Safari: native Apple browser autoplay, Low Power Mode, physical-device quality and production CDN/cache behavior remain verification requirements before publishing. No deployment, form submission or email is part of these checks.


## Pages publish output and preserved archival video

Configuration inspection found no checked-in Wrangler config, package build script or GitHub deployment workflow. The existing static source files live at the repository root; this checkout does not establish the current hosted dashboard build settings. **No Cloudflare setting has been changed.**

Prepare the future publication locally with:

```bash
node scripts/build-site.mjs
```

This creates a fresh, ignored `dist/` directory. It uses an explicit public root-file inventory, copies all supported image assets byte-for-byte, and copies exactly `video/hero-desktop-crf22.mp4` and `video/hero-mobile-crf22.mp4`. It includes the sitemap, redirects, headers, manifest and all pages, scripts and styles. The preserved `video/website-banner-720.mp4` stays in the source checkout with its checksum unchanged and is **never copied into dist**. Tests, tooling, local configuration and source-control files are excluded. The builder rejects missing assets, symlinks, unreviewed new root pages/scripts/styles and pre-existing output directories. It stages a complete output before publishing it locally, and never deletes or overwrites source files.

For another build, preserve/remove only the previous generated output after review, or choose a fresh path with `node scripts/build-site.mjs --out-dir /absolute/path/to/new-output`. Do not publish the repository root: it still contains the original archival video. Ignoring dist in Git does not configure Cloudflare exclusions.

Pages Functions remain in the project-root `functions/` directory, outside the public output. Cloudflare must compile them from that root so the existing www and clean-URL middleware is preserved. For local validation, run `wrangler pages dev dist` **from the repository root**, as shown above. Both optimized URLs must return MP4 responses; the original URL must return 404 from the generated output.

**Separate production authorization is still required** to verify the actual Pages project/production branch/build settings, set or approve build command `node scripts/build-site.mjs` and publish output `dist`, and verify Functions compilation before any push/deployment. Do not add a guessed Wrangler project/account configuration or deploy the root directory. Local output exclusion is validated; live hosting will not adopt it automatically.

## Testimonials and LinkedIn (local review)

The homepage contains five distinct testimonials: the preserved Gary / Maverick Co. and MRA Designs client feedback, plus Mariano Gomes Alves, Kirsten van der Riet and James P's Google reviews. Google wording was read directly from the business's Google review panel on October 21, 2026. The Google display names include “Mariano rogerio Gomes Alves” and “kirsten van der riet”; cards use the names supplied by the owner. Spelling, capitalization and punctuation inside the quotations are preserved. All five full testimonials retain their original wording in the document. With JavaScript, reviews longer than five rendered lines initially use a five-line crop with a subtle text-only gradient fade and an accessible Read full review / Read less button. Reviews that fit do not receive a visible expansion control. Without JavaScript, all text is shown in full. Only Google reviews display five-star ratings; the two existing testimonials retain their text and “Client feedback” attribution without implying a verified rating or Google source.

The public [Google Maps listing](https://www.google.com/maps/place/Trigden+Studio/data=!4m2!3m1!1s0x0:0xfcb1ae0ee7b20da9) was verified against the business name, website and all three reviewers. It contains the Reviews tab and is used instead of an account-specific management URL. The Google-only rating was confirmed as 5.0 from 3 reviews; the section intentionally displays only five soft-gold stars and “5.0 on Google”, without a visible review count. This is static content, not a live Google ratings integration; update it if Google review counts change. No review or aggregate-rating JSON-LD was added.

`testimonials.css` and `testimonials.js` implement a dependency-free, manual scroll-snap carousel: two cards above 768px and one at/below 768px. Buttons, pagination, native touch scrolling, track keyboard arrows/Home/End, and reduced motion are supported. At the last desktop position the previous card overlaps so two real cards remain visible; no cloned or duplicate reviews are inserted. Without JavaScript, native horizontal scrolling and every complete review remain available. Cards stretch to equal heights, with compact five-line previews after enhancement. Expanding a review removes the crop and fade and lets the cards grow naturally so every word is readable. There are no height animations; reduced motion continues to disable smooth carousel scrolling. Width and font changes recalculate which reviews need expansion controls. The existing Inter/Montserrat font loaders retain `display=swap`.

Every existing static footer (including 404) includes the same accessible LinkedIn icon. The existing AboutPage's Person gets LinkedIn `sameAs`; the personal profile is not assigned as the identity of the business.

Run all automated checks with `node --test tests/*.test.mjs`. Run the additional local-only browser harness with the same existing Playwright and Chrome settings documented above:

```bash
TRIGDEN_PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
TRIGDEN_CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
TRIGDEN_PREVIEW_URL=http://127.0.0.1:8743 \
TRIGDEN_BROWSER_ARTIFACTS=/absolute/path/outside/this/repository \
node tests/testimonials.browser.mjs
```

The build allowlist includes both new carousel assets. No changes are required to Cloudflare settings, middleware, redirects, forms, videos, poster or intro scripts. A fresh temporary build and Wrangler Pages preview can be used for review without overwriting an existing `dist` directory or deploying anything.
