export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'www.trigdenstudio.com') {
    url.hostname = 'trigdenstudio.com';
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === '/branding.html' || url.pathname === '/branding') {
    url.pathname = '/graphic-design.html';
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
