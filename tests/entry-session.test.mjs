import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../entry-session.js', import.meta.url), 'utf8');
function visit(storage, referrer = '') {
  const classes = [];
  runInNewContext(script, { sessionStorage: storage, document: { referrer, documentElement: { classList: { add: c => classes.push(c) } } }, location: { origin: 'https://trigdenstudio.com' }, URL });
  return classes.includes('skip-entry-intro');
}
test('first entry plays once; subsequent navigation suppresses intro', () => {
  const values = new Map();
  const storage = { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v) };
  assert.equal(visit(storage), false);
  assert.equal(visit(storage), true);
});
test('internal return suppresses intro even when storage is blocked', () => {
  const storage = { getItem() { throw new Error('blocked'); } };
  assert.equal(visit(storage, 'https://trigdenstudio.com/about.html'), true);
  assert.equal(visit(storage, 'https://example.com'), false);
});

const introScript = readFileSync(new URL('../entry-intro.js', import.meta.url), 'utf8');
test('entry overlay is created only on initial visits, never on returns or reduced motion', () => {
  for (const [returning,reduced,expected] of [[false,false,1],[true,false,0],[false,true,0],[true,true,0]]) {
    let inserted=0, removed=0;
    const template={ content:{cloneNode:()=>({})},before:()=>inserted++,remove:()=>removed++ };
    runInNewContext(introScript,{document:{body:{classList:{remove(){}}},getElementById:()=>template,documentElement:{classList:{contains:()=>returning}}},window:{trigdenShouldPlayIntro:!returning,matchMedia:()=>({matches:reduced})}});
    assert.equal(inserted,expected);
    assert.equal(removed,1);
  }
});
