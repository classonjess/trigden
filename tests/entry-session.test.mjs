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
    runInNewContext(introScript,{document:{body:{classList:{remove(){}}},getElementById:id=>id==='entry-intro-template'?template:null,documentElement:{classList:{contains:()=>returning}}},window:{trigdenShouldPlayIntro:!returning,matchMedia:()=>({matches:reduced})}});
    assert.equal(inserted,expected);
    assert.equal(removed,1);
  }
});

test('intro pulse fallback outlasts pulse and completion follows the exit fade',()=>{
 const timers=[],events=[];let removed=false,locked=false;
 const intro={classList:{add(){}},querySelector:()=>({addEventListener(){}}),remove:()=>removed=true};
 const template={content:{cloneNode:()=>({})},before(){},remove(){}};
 runInNewContext(introScript,{document:{getElementById:id=>id==='entry-intro-template'?template:intro,documentElement:{classList:{contains:()=>false}},body:{classList:{add:()=>locked=true,remove:()=>locked=false}}},window:{trigdenShouldPlayIntro:true,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},dispatchEvent:e=>events.push(e.type)},Event:class {constructor(type){this.type=type}},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){}});
 assert(locked);assert.equal(timers[0].ms,1100);timers[0].fn();assert.equal(locked,false);assert.equal(removed,false);assert.equal(timers[1].ms,250);timers[1].fn();assert(removed);assert.deepEqual(events,['trigden:intro-done']);
});
