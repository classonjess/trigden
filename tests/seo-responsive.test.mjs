import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { onRequest } from '../functions/_middleware.js';
const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');

test('www redirects preserve path and query; apex and preview hosts never redirect', async () => {
  const redirect = await onRequest({ request: new Request('https://www.trigdenstudio.com/work/project?ref=test'), next() { throw new Error('Must redirect first'); } });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), 'https://trigdenstudio.com/work/project?ref=test');
  for (const host of ['trigdenstudio.com', 'trigden-review.pages.dev', 'seo-responsive-fixes.trigden-review.pages.dev']) {
    const response = await onRequest({ request: new Request(`https://${host}/about.html`), next: async () => new Response('content', { headers: { 'Content-Type': 'text/html' } }) });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'content');
    assert.equal(response.headers.get('x-robots-tag'), host.endsWith('.pages.dev') ? 'noindex' : null);
  }
});

test('sitemap retains entries and includes the four requested absolute URLs', () => {
  const sitemap = read('sitemap.xml');
  for (const file of ['', 'web-design.html', 'seo.html', 'about.html', 'services.html', 'graphic-design.html', 'website-maintenance.html']) assert(sitemap.includes(`https://trigdenstudio.com/${file}`));
});

test('canonical and noindex policy matches each page destination', () => {
  for (const [file, url] of [['logo-design.html', 'https://trigdenstudio.com/graphic-design.html'], ['brand-design.html', 'https://trigdenstudio.com/graphic-design.html']]) {
    const html = read(file);
    assert(html.includes(`rel="canonical" href="${url}"`));
    assert(html.includes('name="robots" content="noindex, follow"'));
  }
});

test('meta descriptions are distinct and fit the requested lengths', () => {
  const descriptions = ['index.html', 'seo.html', 'web-design.html', 'website-maintenance.html', 'graphic-design.html', 'services.html'].map(file => {
    const text = read(file).match(/name="description" content="([^"]+)"/)[1];
    assert(text.length <= 155, file);
    if (file === 'services.html') assert(text.length >= 140);
    return text;
  });
  assert.equal(new Set(descriptions).size, descriptions.length);
});

test('structured data parses and Services describes the organization and four services', () => {
  for (const file of readdirSync(root).filter(name => name.endsWith('.html'))) {
    for (const match of read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  }
  const graph = JSON.parse(read('services.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert(graph.some(node => node['@type'] === 'Organization'));
  assert.equal(graph.filter(node => node['@type'] === 'Service').length, 4);
});

test('font sizes, local media and progressive enhancement safeguards', () => {
  // Informational pills intentionally use the approved 11px design; other text stays >=12px.
  for (const file of readdirSync(root).filter(name => name.endsWith('.css'))) {
    for (const match of read(file).matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert(+match[1] >= 12 || (['pill-sizing.css', 'eyebrow-type.css'].includes(file) && +match[1] === 11), `${file}: ${match[0]}`);
  }
  const home = read('index.html');
  assert(!/images\/(?:mralandingpage|integritylandingpage)\.png/.test(home));
  assert(home.includes('preload="none"') && home.includes('playsinline') && home.includes('poster='));
  for (const file of ['index.html', 'about.html', 'services.html']) assert.equal((read(file).match(/src="analytics\.js"/g) || []).length, 1);
  assert(!read('style.css').includes('images/background.png'));
  assert(read('sitemap.xml').includes('<loc>https://trigdenstudio.com/contact</loc>'));
  assert(read('contact.html').includes('rel="canonical" href="https://trigdenstudio.com/contact"'));
  assert(read('contact.html').includes('name="robots" content="index, follow"'));
  assert(!read('sitemap.xml').includes('/branding.html'));
  assert(read('_headers').includes('https://:version.:project.pages.dev/*'));
});

test('sitemap lists indexable pages only and aliases target Graphic Design', () => {
  for (const match of read('sitemap.xml').matchAll(/<loc>https:\/\/trigdenstudio.com\/([^<]*)<\/loc>/g)) {
    assert(!/name="robots" content="noindex/.test(read(!match[1] ? 'index.html' : match[1].includes('.') ? match[1] : match[1]+'.html')));
  }
  for (const file of ['logo-design.html', 'brand-design.html']) {
    assert(read(file).includes('content="0; url=graphic-design.html"'));
    assert(read(file).includes('location.replace("graphic-design.html")'));
  }
});
test('launch descriptions and Contact schema match site identity', () => {
  const descriptions = readdirSync(root).filter(n => n.endsWith('.html')).map(n => read(n).match(/name="description" content="([^"]+)"/)?.[1]).filter(Boolean);
  assert.equal(new Set(descriptions).size, descriptions.length);
  for (const file of ['privacy.html','terms.html']) {
    const d = read(file).match(/name="description" content="([^"]+)"/)[1];
    assert(d.length >= 130 && d.length <= 155, `${file}: ${d.length}`);
  }
  const graph = JSON.parse(read('contact.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert(graph.some(n=>n['@type']==='ContactPage'));
  assert(graph.some(n=>n['@type']==='Organization' && n.email==='hello@trigdenstudio.com' && n['@id']==='https://trigdenstudio.com/#business'));
});

test('retired Branding URLs redirect to Graphic Design without losing query parameters', async () => {
  for (const path of ['branding.html','branding']) {
    const response=await onRequest({request:new Request(`https://trigdenstudio.com/${path}?ref=old`),next(){throw new Error('Must redirect');}});
    assert.equal(response.status,301);
    assert.equal(response.headers.get('location'),'https://trigdenstudio.com/graphic-design.html?ref=old');
  }
});
