// Keep these legacy entry points aligned with _redirects. Page files stay .html;
// Cloudflare Pages serves their extensionless URLs without a build step.
const pages = ['about', 'services', 'web-design', 'website-maintenance', 'seo', 'graphic-design', 'contact', 'privacy', 'terms'];
const legacyPaths = new Map([
  ['/index.html', '/'], ['/index', '/'], ['/index/', '/'],
  ...pages.flatMap(page => [[`/${page}.html`, `/${page}`], [`/${page}/`, `/${page}`]]),
  ...['branding', 'brand-design', 'logo-design'].flatMap(page =>
    [[`/${page}`, '/graphic-design'], [`/${page}.html`, '/graphic-design'], [`/${page}/`, '/graphic-design']]),
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const preferredPath = legacyPaths.get(url.pathname);
  const www = url.hostname === 'www.trigdenstudio.com';
  if (preferredPath || www) {
    if (preferredPath) url.pathname = preferredPath;
    if (www) {
      url.hostname = 'trigdenstudio.com';
      url.protocol = 'https:';
      url.port = '';
    }
    // Combine hostname and page normalization into one permanent redirect.
    return Response.redirect(url.toString(), 301);
  }
  const response = await context.next();
  // _headers does not apply to Function responses; preserve the same policy here.
  if (url.hostname.endsWith('.pages.dev')) {
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
}
