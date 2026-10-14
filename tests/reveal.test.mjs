import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync(new URL('../reveal.js',import.meta.url),'utf8');

function setup({native=false,reduced=false,unsupported=false}={}) {
  const observers=[],listeners=new Map(),frames=new Map();let next=0,onMotion;
  const cards=Array.from({length:2},()=>({hidden:false,contains:()=>false,parentElement:{},classes:new Set(),properties:new Map(),getBoundingClientRect:()=>({top:900,bottom:1100})}));
  cards.forEach(card=>{card.classList={add:(...names)=>names.forEach(n=>card.classes.add(n)),remove:(...names)=>names.forEach(n=>card.classes.delete(n))};card.style={setProperty:(k,v)=>card.properties.set(k,v),removeProperty:k=>card.properties.delete(k)};});
  function Observer(callback,options){this.callback=callback;this.options=options;this.observed=[];this.unobserved=[];this.observe=el=>this.observed.push(el);this.unobserve=el=>this.unobserved.push(el);this.disconnect=()=>this.disconnected=true;observers.push(this);}
  const win={innerHeight:900,scrollY:0,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  if(!unsupported)win.IntersectionObserver=Observer;
  const context={window:win,IntersectionObserver:Observer,CSS:{supports:prop=>prop==='translate'||native},matchMedia:()=>({matches:reduced,addEventListener:(name,fn)=>onMotion=fn}),document:{querySelectorAll:()=>cards},requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id)};
  runInNewContext(script,context);
  const entry=(card,top=900,isIntersecting=true)=>({target:card,isIntersecting,boundingClientRect:{top,bottom:top+200}});
  const entrance=()=>observers.find(o=>o.options.rootMargin==='0px 0px 50px 0px');
  const flush=()=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn());};
  return {cards,win,observers,listeners,frames,entry,entrance,flush,motion:()=>onMotion({matches:true})};
}

test('unsupported/reduced-motion browsers leave all content visible and untouched',()=>{
  for(const options of [{reduced:true},{unsupported:true}]){const h=setup(options);assert.equal(h.observers.length,0);assert(h.cards.every(c=>c.classes.size===0));assert.equal(h.frames.size,0);}
});

test('fallback progress tracks 150px of scroll, latches visibility and never replays',()=>{
  const h=setup(),card=h.cards[0],observer=h.entrance();
  observer.callback([h.entry(card)]);h.flush();assert.equal(card.properties.get('--scroll-reveal-progress'),'0.0000');
  h.win.scrollY=75;h.listeners.get('scroll')();h.flush();assert.equal(card.properties.get('--scroll-reveal-progress'),'0.5000');
  h.win.scrollY=150;h.listeners.get('scroll')();h.flush();assert.equal(card.classes.size,0);assert(observer.unobserved.includes(card));
  h.win.scrollY=0;observer.callback([h.entry(card)]);assert.equal(card.classes.size,0);assert.equal(h.frames.size,0);
});

test('fallback schedules at most one frame per event batch and no idle loop',()=>{
  const h=setup();h.entrance().callback([h.entry(h.cards[0])]);
  for(let i=0;i<10;i++)h.listeners.get('scroll')();assert.equal(h.frames.size,1);
  h.flush();assert.equal(h.frames.size,0);
});

test('native support selects a view timeline without scroll handlers or RAF loops',()=>{
  const h=setup({native:true}),card=h.cards[0];h.entrance().callback([h.entry(card)]);
  assert(card.classes.has('scroll-reveal--native'));assert.equal(h.listeners.has('scroll'),false);assert.equal(h.frames.size,0);
  const completion=h.observers.find(o=>o.options.rootMargin==='0px 0px -150px 0px');
  completion.callback([h.entry(card,750)]);assert.equal(card.classes.size,0);
  h.entrance().callback([h.entry(card)]);assert.equal(card.classes.size,0);
});

test('already visible and fast-skipped blocks never reset to low opacity',()=>{
  const h=setup(),observer=h.entrance();
  observer.callback([h.entry(h.cards[0],500),h.entry(h.cards[1],-300,false)]);
  assert(h.cards.every(c=>c.classes.size===0&&c.properties.size===0));assert.equal(observer.unobserved.length,2);
});

test('motion preference changes clear effects and stop pending work',()=>{
  const h=setup();h.entrance().callback([h.entry(h.cards[0])]);h.motion();
  assert(h.cards.every(c=>c.classes.size===0&&c.properties.size===0));assert.equal(h.frames.size,0);assert.equal(h.listeners.size,0);assert(h.observers.every(o=>o.disconnected));
});

test('cards sharing a row use their position directly, with no time stagger',()=>{
  const h=setup();h.cards[1].parentElement=h.cards[0].parentElement;
  h.entrance().callback(h.cards.map(card=>h.entry(card,825)));h.flush();
  assert(h.cards.every(c=>c.properties.get('--scroll-reveal-progress')==='0.5000'));
  assert(h.cards.every(c=>!c.properties.has('--reveal-delay')));
});

test('individual translate preserves existing transform and hover styling',()=>{
  const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
  const reveal=css.slice(css.indexOf('.scroll-reveal {'),css.indexOf('@media (prefers-reduced-motion: reduce)',css.indexOf('.scroll-reveal {')));
  assert.match(reveal,/translate:/);assert.doesNotMatch(reveal,/\btransform:/);assert.doesNotMatch(css,/cardEnter|\.site-reveal/);
});
