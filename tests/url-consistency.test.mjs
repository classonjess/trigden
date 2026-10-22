import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { onRequest } from '../functions/_middleware.js';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const origin = 'https://trigdenstudio.com';
const pages = readdirSync(root).filter(file => file.endsWith('.html'));
const aliases = ['branding', 'brand-design', 'logo-design'];
const pathFor = file => file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`;
const sourceFor = path => path === '/' ? 'index.html' : `${path.slice(1)}.html`;
const request = (url, next = async () => new Response('content')) => onRequest({ request: new Request(url), next });

function preferred(url, context) {
  assert.equal(url.origin, origin, context);
  assert(!url.pathname.endsWith('.html'), context);
  assert(url.pathname === '/' || !url.pathname.endsWith('/'), context);
  assert(!aliases.some(alias => url.pathname === `/${alias}`), context);
  assert(!['/index', '/404'].includes(url.pathname), context);
  assert(existsSync(new URL(sourceFor(url.pathname), root)), context);
}

test('every indexable page has one self-referencing canonical and matching social URLs', () => {
  for (const file of pages) {
    const html = read(file);
    if (/name="robots" content="noindex/.test(html)) continue;
    const canonicals = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)];
    assert.equal(canonicals.length, 1, file);
    const expected = origin + pathFor(file);
    assert.equal(canonicals[0][1], expected, file);
    for (const match of html.matchAll(/<meta\b[^>]*(?:property="og:url"|name="twitter:url")[^>]*content="([^"]+)"/g)) {
      assert.equal(match[1], expected, file);
    }
  }
});

test('every internal page link, social URL and structured-data reference uses a preferred URL', () => {
  function inspect(value, file) {
    if (typeof value === 'string' && value.startsWith(origin + '/')) {
      const url = new URL(value);
      // Structured data may also reference image assets.
      if (!/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.endsWith('.html')) preferred(url, `${file}: structured URL`);
    } else if (Array.isArray(value)) value.forEach(child => inspect(child, file));
    else if (value && typeof value === 'object') Object.values(value).forEach(child => inspect(child, file));
  }
  for (const file of pages) {
    const html = read(file);
    for (const match of html.matchAll(/\bhref=["']([^"']+)["']/g)) {
      const url = new URL(match[1].replaceAll('&amp;', '&'), origin + pathFor(file));
      if (url.origin !== origin || match[1].startsWith('#')) continue;
      if (!/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.endsWith('.html')) preferred(url, `${file}: internal link`);
    }
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) inspect(JSON.parse(match[1]), file);
    assert(!html.includes('.html'), `${file}: legacy HTML URL reintroduced`);
  }
});

test('sitemap contains unique indexable preferred URLs which pass through without redirects', async () => {
  const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert(urls.length >= 8);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    const parsed = new URL(url);
    preferred(parsed, 'sitemap');
    const html = read(sourceFor(parsed.pathname));
    assert(!/name="robots" content="noindex/.test(html));
    assert(html.includes(`rel="canonical" href="${url}"`));
    const response = await request(url, async () => new Response(html));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
  }
});

test('all legacy pages and aliases redirect once with queries preserved on apex and www', async () => {
  const targets = new Map(pages.filter(file => file !== '404.html').map(file => [pathFor(file), pathFor(file)]));
  targets.set('/index', '/');
  for (const alias of aliases) targets.set(`/${alias}`, '/graphic-design');
  for (const [path, target] of targets) {
    const legacy = path === '/' ? '/index.html' : `${path}.html`;
    for (const host of ['trigdenstudio.com', 'www.trigdenstudio.com']) {
      for (const oldPath of [legacy, ...(path === '/' ? [] : [`${path}/`])]) {
        const response = await request(`https://${host}${oldPath}?ref=old%20link&x=1`, () => { throw new Error('Expected redirect'); });
        assert.equal(response.status, 301, oldPath);
        assert.equal(response.headers.get('location'), `${origin}${target}?ref=old%20link&x=1`);
        assert.equal((await request(response.headers.get('location'))).status, 200, 'No second redirect');
      }
    }
  }
});

test('static fallback rules match the Pages Function and end at clean destinations', async () => {
  for (const line of read('_redirects').split('\n').filter(line => line && !line.startsWith('#'))) {
    const [source, destination, status] = line.split(/\s+/);
    assert.equal(status, '301');
    preferred(new URL(destination, origin), source);
    const response = await request(origin + source, () => { throw new Error('Expected redirect'); });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), origin + destination);
  }
});

test('contact stays indexable; unknown paths, assets and form requests are not rewritten', async () => {
  assert(read('contact.html').includes('rel="canonical" href="https://trigdenstudio.com/contact"'));
  assert(read('contact.html').includes('name="robots" content="index, follow"'));
  for (const path of ['/contact', '/unknown.html', '/images/mobilefav.png', '/style.css', '/sitemap.xml']) {
    assert.equal((await request(origin + path)).status, 200, path);
  }
  const response = await onRequest({ request: new Request(origin + '/contact', { method: 'POST', body: 'synthetic' }), next: async () => new Response('unchanged', { status: 201 }) });
  assert.equal(response.status, 201);
});
