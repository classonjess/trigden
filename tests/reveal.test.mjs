import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync(new URL('../reveal.js',import.meta.url),'utf8');
test('reveal skips unsupported browsers and reduced motion without touching content',()=>{
  for(const reduced of [false,true]) {
    runInNewContext(script,{window:{},matchMedia:()=>({matches:reduced}),document:{querySelectorAll(){throw new Error('Content must remain untouched');}}});
  }
  runInNewContext(script,{window:{IntersectionObserver:true},matchMedia:()=>({matches:true}),document:{querySelectorAll(){throw new Error('Content must remain untouched');}}});
});
test('nested blocks animate individually with capped stagger and unobserve after reveal',()=>{
  const parent={};const classes=[];const delays=[];
  const children=Array.from({length:5},()=>({parentElement:parent,contains:()=>false,classList:{add:c=>classes.push(c)},style:{setProperty:(k,v)=>delays.push(v)}}));
  const section={contains:e=>children.includes(e)};
  const observed=[],unobserved=[];let callback;
  function Observer(cb){callback=cb;this.observe=e=>observed.push(e);this.unobserve=e=>unobserved.push(e);}
  runInNewContext(script,{window:{IntersectionObserver:true},IntersectionObserver:Observer,matchMedia:()=>({matches:false}),document:{querySelectorAll:()=>[section,...children]}});
  assert.deepEqual(observed,children);
  callback(children.map(target=>({target,isIntersecting:true})));
  assert.equal(classes.length,5);assert(classes.every(c=>c==='site-reveal'));
  assert.deepEqual(unobserved,children);assert.equal(delays[0],'0s');assert.equal(delays[4],delays[3]);
});

test('mobile reveal starts before viewport entry without delayed hiding',()=>{
  let callback, options, delay, unobserved=0;
  const card={parentElement:{},contains:()=>false,classList:{add(){}},style:{setProperty:(key,value)=>delay=value}};
  function Observer(cb,opts){callback=cb;options=opts;this.observe=()=>{};this.unobserve=()=>unobserved++;}
  runInNewContext(script,{window:{IntersectionObserver:true},IntersectionObserver:Observer,matchMedia:q=>({matches:q.includes('max-width')}),document:{querySelectorAll:()=>[card]}});
  assert.equal(options.rootMargin,'0px 0px 96px 0px');
  callback([{target:card,isIntersecting:false}]);assert.equal(unobserved,0);
  callback([{target:card,isIntersecting:true}]);assert.equal(unobserved,1);assert.equal(delay,'0s');
});
