import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('hero loads a video still instead of enlarging the favicon', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /poster="\.\/images\/hero-video-poster\.webp"/);
  assert.match(html, /rel="preload" as="image" href="\/images\/hero-video-poster\.webp"/);
  assert.doesNotMatch(html, /poster="[^"]*mobilefav/);
  assert.ok(existsSync(new URL('../images/hero-video-poster.webp', import.meta.url)));
});
