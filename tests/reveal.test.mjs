import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync(new URL('../reveal.js',import.meta.url),'utf8');
function setup({reduced=false,unsupported=false,intro=false,top=1000,fail=false,photos=false}={}) {
 const observers=[],listeners=new Map(),documentListeners=new Map(),timers=new Map();let motion,next=0;
 const parent={},cards=Array.from({length:4},()=>({hidden:false,parentElement:parent,contains:()=>false,closest:()=>null,classes:new Set(),animations:[],getBoundingClientRect:()=>({top,bottom:top+200,height:200})}));
 cards.forEach(card=>{
  card.classList={add:n=>card.classes.add(n),remove:n=>card.classes.delete(n),[Symbol.iterator]:()=>card.classes.values()};
  card.animate=(frames,options)=>{
   if(fail)throw Error('Animation unavailable');
   let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b});
   const animation={frames,options,finished,resolve,reject,cancel(){this.cancelled=true;reject(Error('cancelled'));}};
   card.animations.push(animation);return animation;
  };
 });
 if(photos)cards[0].contains=el=>el===cards[2];
 function Observer(callback,options){Object.assign(this,{callback,options,observed:[],unobserved:[],observe:el=>this.observed.push(el),unobserve:el=>this.unobserved.push(el),disconnect:()=>this.disconnected=true});observers.push(this);}
 const win={innerHeight:900,addEventListener:(n,f)=>listeners.set(n,f)};
 if(!unsupported)win.IntersectionObserver=Observer;
 function Element(){};Element.prototype.animate=()=>{};
 function KeyframeEffect(){};KeyframeEffect.prototype.composite='replace';
 runInNewContext(script,{window:win,Element,KeyframeEffect,IntersectionObserver:Observer,matchMedia:()=>({matches:reduced,addEventListener:(n,f)=>motion=f}),document:{documentElement:{scrollHeight:10000},getElementById:()=>intro?{}:null,querySelectorAll:selector=>selector==='main [class]'?[]:selector==='main img'?(photos?cards.slice(2):[]):(photos?cards.slice(0,2):cards),addEventListener:(n,f)=>documentListeners.set(n,f)},setTimeout:(f,ms)=>{timers.set(++next,{f,ms});return next},clearTimeout:id=>timers.delete(id)});
 const entry=(card,{top=876,height=200,visible=24,intersects=true}={})=>({target:card,isIntersecting:intersects,rootBounds:{height:900},boundingClientRect:{top,bottom:top+height,height},intersectionRect:{height:visible}});
 return {cards,observers,listeners,timers,entry,motion:()=>motion({matches:true}),flush:async()=>{for(let i=0;i<8;i++)await Promise.resolve();}};
}
test('unsupported or reduced motion leaves content untouched',()=>{
 for(const options of [{unsupported:true},{reduced:true}]){const h=setup(options);assert.equal(h.observers.length,0);assert(h.cards.every(c=>!c.classes.size));}
});
test('init arms below-fold content immediately; even partially visible content never dims',()=>{
 const h=setup();assert(h.cards.every(c=>c.classes.has('scroll-reveal')));
 const visible=setup({top:899});assert(visible.cards.every(c=>!c.classes.size));assert.equal(visible.observers[0].unobserved.length,4);
});
test('intro defers measurements and reveal setup until completion',()=>{
 const h=setup({intro:true});assert.equal(h.observers.length,0);h.listeners.get('trigden:intro-done')();assert.equal(h.observers.length,1);
});
test('12 percent entry starts an 850ms opacity and additive transform reveal',()=>{
 const h=setup(),card=h.cards[0],o=h.observers[0];o.callback([h.entry(card,{visible:23})]);assert.equal(card.animations.length,0);
 o.callback([h.entry(card)]);assert.equal(card.animations.length,2);assert(o.unobserved.includes(card));
 assert.equal(card.animations[0].options.duration,850);assert.equal(card.animations[0].options.easing,'cubic-bezier(0.22, 1, 0.36, 1)');
 assert.equal(card.animations[1].options.composite,'add');assert.equal(card.animations[1].frames[0].transform,'translateY(18px)');
 assert.equal(h.listeners.has('scroll'),false);assert.equal(h.listeners.has('resize'),false);
});
test('tall elements trigger relative to viewport height',()=>{
 const h=setup(),c=h.cards[0],o=h.observers[0];o.callback([h.entry(c,{height:3000,visible:108})]);assert.equal(c.animations.length,2);
});
test('grid stagger is 70ms and capped at 140ms',()=>{
 const h=setup();h.observers[0].callback(h.cards.map(c=>h.entry(c)));assert.deepEqual(h.cards.map(c=>c.animations[0].options.delay),[0,70,140,140]);
});
test('completed reveals clear effects and never replay when scrolling back',async()=>{
 const h=setup(),c=h.cards[0],o=h.observers[0];o.callback([h.entry(c)]);c.animations.forEach(a=>a.resolve());await h.flush();
 assert.equal(c.classes.size,0);assert(c.animations.every(a=>a.cancelled));assert.equal(h.timers.size,0);
 o.callback([h.entry(c)]);assert.equal(c.animations.length,2);
});
test('fast skipped blocks finish, animation errors and watchdog recover',()=>{
 const h=setup(),c=h.cards[0];h.observers[0].callback([h.entry(c,{top:-300,intersects:false})]);assert.equal(c.classes.size,0);assert.equal(c.animations.length,0);
 const broken=setup({fail:true});broken.observers[0].callback([broken.entry(broken.cards[0])]);assert.equal(broken.cards[0].classes.size,0);
 const stalled=setup();stalled.observers[0].callback([stalled.entry(stalled.cards[0])]);[...stalled.timers.values()][0].f();assert.equal(stalled.cards[0].classes.size,0);
});
test('motion changes and bfcache restore release waiting and running content',()=>{
 for(const action of ['motion','pageshow']){const h=setup();h.observers[0].callback([h.entry(h.cards[0])]);if(action==='motion')h.motion();else h.listeners.get('pageshow')({persisted:true});assert(h.cards.every(c=>!c.classes.size));assert(h.observers[0].disconnected);assert.equal(h.timers.size,0);}
});
test('CSS contains no scroll timelines or independent translation animation',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');assert.doesNotMatch(css,/animation-timeline:|scroll-reveal--native|--scroll-reveal-progress/);assert.match(css,/\.scroll-reveal \{ opacity: 0; \}/);assert.doesNotMatch(script,/will-change|requestAnimationFrame|scrollY/);
});

test('observer upper root spans the page so fast jumps cannot skip entry entirely',()=>{
 const h=setup();assert.equal(h.observers[0].options.rootMargin,'10000px 0px 0px 0px');
});

test('standalone photos reveal individually while photos inside cards share their card reveal',()=>{
 const h=setup({photos:true});
 assert(h.cards[0].classes.has('scroll-reveal'));
 assert.equal(h.cards[2].classes.size,0);
 assert(h.cards[3].classes.has('scroll-reveal'));
 h.observers[0].callback([h.entry(h.cards[3])]);
 assert.equal(h.cards[3].animations.length,2);
});
