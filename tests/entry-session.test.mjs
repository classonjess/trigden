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
function intro({returning=false,reduced=false,logoPresent=true}={}) {
 const classes=new Set(),events=new Map(),windowEvents=new Map(),timers=new Map(),dispatched=[];let motion,sequence=0;
 const logo={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const document={querySelector:()=>logoPresent?logo:null,documentElement:{classList:{contains:()=>returning}}};
 const media={matches:reduced,addEventListener:(n,f)=>motion=f,removeEventListener:()=>motion=null};
 const window={trigdenShouldPlayIntro:!returning,matchMedia:()=>media,addEventListener:(n,f)=>windowEvents.set(n,f),removeEventListener:n=>windowEvents.delete(n),dispatchEvent:e=>dispatched.push(e.type)};
 runInNewContext(introScript,{document,window,Event:class{constructor(type){this.type=type;}},setTimeout:(fn,ms)=>{timers.set(++sequence,{fn,ms});return sequence;},clearTimeout:id=>timers.delete(id)});
 return {classes,events,windowEvents,timers,dispatched,reduce:()=>motion?.({matches:true})};
}
test('first-visit pulses decorate only the existing logo, without an overlay or scroll lock',()=>{
 const fresh=intro();assert(fresh.classes.has('entry-logo-pulse'));
 for(const options of [{returning:true},{reduced:true},{logoPresent:false}])assert.equal(intro(options).classes.size,0);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert(!html.includes('entry-intro-template'));assert(!html.includes('id="entry-intro"'));
 assert(!introScript.includes('document.body'));assert(!css.includes('body.intro-active'));
});
test('animation end, fallback, motion changes and navigation clean up nonblocking pulses',()=>{
 for(const reason of ['animation','fallback','motion','cancel','pagehide']){
  const h=intro();assert.equal([...h.timers.values()][0].ms,2200);
  if(reason==='animation')h.events.get('animationend')();
  if(reason==='fallback')[...h.timers.values()][0].fn();
  if(reason==='motion')h.reduce();
  if(reason==='cancel')h.windowEvents.get('trigden:intro-cancel')();
  if(reason==='pagehide')h.windowEvents.get('pagehide')();
  assert.equal(h.classes.size,0);assert.equal(h.timers.size,0);assert.equal(h.events.size,0);assert.equal(h.windowEvents.size,0);
  assert.deepEqual(h.dispatched,['trigden:intro-done']);
 }
});
test('intro keeps three pulses with a bounded cleanup fallback',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/animation: introLogoPulse \.65s ease-in-out 3;/);
 assert.match(introScript,/setTimeout\(dismiss, 2200\)/);assert(2200>650*3);
});

test('persistent site background retains all shared intro-named animation keyframes',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 for(const match of css.matchAll(/animation:\s*(intro\w+)/g))assert(css.includes(`@keyframes ${match[1]} {`),match[1]);
});
