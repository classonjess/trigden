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
function intro({returning=false,reduced=false,loaded=true,decodeReject=false}={}) {
 const classes=new Set(),events=new Map(),windowEvents=new Map(),docEvents=new Map(),timers=new Map(),frames=[],dispatched=[];
 let sequence=0,installed=false,removed=false,motion;
 const logo={complete:loaded,naturalWidth:loaded?1040:0,decode:()=>decodeReject?Promise.reject(Error('decode failed')):Promise.resolve(),addEventListener:(n,f)=>events.set(n,f)};
 const overlay={classList:{add:c=>classes.add(c)},querySelector:()=>logo,remove:()=>{removed=true;installed=false;}};
 const template={content:{cloneNode:()=>overlay},before:()=>{installed=true;},remove:()=>{}};
 const media={matches:reduced,addEventListener:(n,f)=>motion=f,removeEventListener:()=>motion=null};
 const document={hidden:false,getElementById:id=>id==='entry-intro-template'?template:installed?overlay:null,documentElement:{classList:{contains:()=>returning}},addEventListener:(n,f)=>docEvents.set(n,f),removeEventListener:n=>docEvents.delete(n)};
 const window={trigdenShouldPlayIntro:!returning,addEventListener:(n,f)=>windowEvents.set(n,f),removeEventListener:n=>windowEvents.delete(n),dispatchEvent:e=>dispatched.push(e.type)};
 runInNewContext(introScript,{document,window,matchMedia:()=>media,Event:class{constructor(type){this.type=type}},setTimeout:(fn,ms)=>{timers.set(++sequence,{fn,ms});return sequence;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>frames.push(fn)});
 return {classes,events,timers,windowEvents,docEvents,logo,dispatched,get installed(){return installed},get removed(){return removed},settle:async()=>{await new Promise(resolve=>setImmediate(resolve));while(frames.length)frames.shift()();await Promise.resolve()},reduce:()=>motion?.({matches:true}),timeout:ms=>[...timers.values()].find(t=>t.ms===ms)?.fn()};
}
test('welcome waits for the decoded image before starting and then fades after all pulses',async()=>{
 const h=intro({loaded:false});assert(h.installed);assert(!h.classes.has('is-ready'));
 h.logo.complete=true;h.logo.naturalWidth=1040;h.events.get('load')();await h.settle();
 assert(h.classes.has('is-ready'));assert(!h.removed);
 h.events.get('animationend')({animationName:'introLogoPulse'});
 assert(h.classes.has('is-exiting'));assert(!h.removed);h.timeout(250);
 assert(h.removed);assert.deepEqual(h.dispatched,['trigden:intro-done']);
});
test('returning and reduced-motion visitors get no overlay',()=>{
 for(const options of [{returning:true},{reduced:true}])assert(!intro(options).installed);
});
test('failed images, stalled loads and decode failures release the page',async()=>{
 const failed=intro({loaded:false});failed.events.get('error')();assert(failed.removed);
 const stalled=intro({loaded:false});stalled.timeout(3000);assert(stalled.removed);
 const decode=intro({decodeReject:true});await decode.settle();assert(decode.removed);
});
test('navigation, reduced motion and fallback cannot trap visitors',async()=>{
 for(const reason of ['cancel','pagehide','motion','fallback']){
  const h=intro();await h.settle();
  if(reason==='cancel')h.windowEvents.get('trigden:intro-cancel')();
  if(reason==='pagehide')h.windowEvents.get('pagehide')();
  if(reason==='motion')h.reduce();
  if(reason==='fallback'){h.timeout(2200);h.timeout(250)}
  assert(h.removed);assert.deepEqual(h.dispatched,['trigden:intro-done']);
 }
});
test('restored welcome keeps historical branding, exactly three pulses and an independent escape hatch',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert(html.includes('entry-intro-template'));assert(html.includes('Entering the studio'));
 assert(html.includes('width="1040" height="167"'));
 assert(!css.includes('entry-logo-pulse'));assert(!introScript.includes('#nav'));
 assert.match(css,/animation: introLogoPulse \.65s ease-in-out 3;/);
 assert.match(css,/animation: introSafetyExit 0s linear 6s forwards;/);
 assert(!introScript.includes('document.body'));
});
test('persistent site background retains all shared intro-named animation keyframes',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 for(const match of css.matchAll(/animation:\s*(intro\w+)/g))assert(css.includes(`@keyframes ${match[1]} {`),match[1]);
});
