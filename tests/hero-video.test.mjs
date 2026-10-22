import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const script=read('hero-video.js');
function setup({mobile=false,reduced=false,blocked=false,hidden=false,idle=true,controls=true,synchronousFailure=false,pending=false}={}){
 const docEvents=new Map(),winEvents=new Map(),videoEvents=new Map(),controlEvents=new Map(),sources=[],timers=[],classes=new Set(),attributes=new Map();let preferenceChange,playCalls=0,loadCalls=0,pauses=0;
 const attempts=[];
 const media={matches:reduced,addEventListener:(n,f)=>preferenceChange=f};
 const video={paused:true,addEventListener:(n,f)=>videoEvents.set(n,f),removeEventListener:n=>videoEvents.delete(n),classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},setAttribute(){},querySelector:()=>sources[0],appendChild:s=>sources.push(s),load:()=>loadCalls++,pause(){this.paused=true;pauses++;videoEvents.get('pause')?.();},play(){playCalls++;if(synchronousFailure)throw Error('Synchronous play denial');if(pending){this.paused=false;return new Promise((resolve,reject)=>attempts.push({resolve:()=>{videoEvents.get('playing')?.();resolve();},reject}));}if(blocked)return Promise.reject(Error('Autoplay denied'));this.paused=false;videoEvents.get('playing')?.();return Promise.resolve();}};
 const toggle={classList:{toggle(){}},setAttribute:(n,v)=>attributes.set(n,v),querySelector:()=>({textContent:''}),addEventListener:(n,f)=>controlEvents.set(n,f)};
 const document={hidden,readyState:'loading',getElementById:id=>id==='hero-vid'?video:controls?toggle:null,createElement:()=>({}),addEventListener:(n,f)=>docEvents.set(n,f),removeEventListener:n=>docEvents.delete(n)};
 const window={matchMedia:q=>q.includes('reduced-motion')?media:{matches:mobile},addEventListener:(n,f)=>winEvents.set(n,f),removeEventListener:n=>winEvents.delete(n)};
 if(idle)window.requestIdleCallback=()=>{};
 const defer=(fn,ms)=>{timers.push({fn,ms});return timers.length;};
 runInNewContext(script,{document,window,setTimeout:defer,requestIdleCallback:defer});
 docEvents.get('DOMContentLoaded')();
 return {document,video,videoEvents,sources,attempts,classes,attributes,docEvents,winEvents,controlEvents,timers,reduce:()=>preferenceChange({matches:true}),resize:()=>mobile=!mobile,scheduled(){winEvents.get('load')?.();timers.shift()?.fn();},counts:()=>({playCalls,loadCalls,pauses}),flush:async()=>{await Promise.resolve();await Promise.resolve();}};
}
test('autoplay selects exactly one optimized source for each initial viewport and never swaps on resize',async()=>{
 for(const mobile of [false,true]){
  const h=setup({mobile});assert.equal(h.sources.length,0);h.scheduled();await h.flush();
  assert.equal(h.sources.length,1);assert.equal(h.sources[0].src,mobile?'./video/hero-mobile-crf22.mp4':'./video/hero-desktop-crf22.mp4');
  assert.equal(h.video.playbackRate,.9);assert(h.video.muted&&h.video.defaultMuted&&h.video.playsInline);
  h.resize();h.controlEvents.get('click')();await h.flush();h.controlEvents.get('click')();await h.flush();
  assert.equal(h.sources.length,1);assert.equal(h.counts().loadCalls,1);
  assert(h.classes.has('is-ready'));h.videoEvents.get('error')();assert(!h.classes.has('is-ready'));
 }
});
test('initial reduced motion loads no video until explicitly requested',async()=>{
 const h=setup({reduced:true});assert.equal(h.sources.length,0);assert.equal(h.counts().playCalls,0);assert(h.video.paused);assert.equal(h.attributes.get('aria-pressed'),'true');
 h.controlEvents.get('click')();await h.flush();assert.equal(h.sources.length,1);assert.equal(h.counts().playCalls,1);
});
test('enabling reduced motion during playback pauses and disables automatic kickstarts',async()=>{
 const h=setup();h.scheduled();await h.flush();h.reduce();assert(h.video.paused);
 const calls=h.counts().playCalls;h.winEvents.get('pageshow')?.();h.docEvents.get('click')?.();h.docEvents.get('visibilitychange')?.();
 assert.equal(h.counts().playCalls,calls);assert.equal(h.attributes.get('aria-pressed'),'true');
});
test('Rejected autoplay can recover through interaction without another source',async()=>{
 const h=setup({blocked:true});h.scheduled();await h.flush();const count=h.counts().playCalls;
 h.docEvents.get('touchstart')();await h.flush();assert.equal(h.counts().playCalls,count+1);assert.equal(h.sources.length,1);assert.equal(h.counts().loadCalls,1);
});
test('timeout fallback works without requestIdleCallback, hidden documents do not autoplay, controls are optional',async()=>{
 const h=setup({idle:false,controls:false});h.scheduled();await h.flush();assert.equal(h.counts().playCalls,1);
 const hidden=setup({hidden:true});hidden.scheduled();assert.equal(hidden.counts().playCalls,0);
});
test('original and approved encodings are pinned; poster remains unchanged and parser cannot fetch both variants',()=>{
 const hashes={
  'video/website-banner-720.mp4':'ad7c397b287952ebd7d31b83c48cd9964e27ffd68d1c8eed7aac22924cc8f2ca',
  'video/hero-desktop-crf22.mp4':'1a7fd3efbb6888a0d323ed9eb1f1472ffdef9d9693b9d69c60a520383bf2e61b',
  'video/hero-mobile-crf22.mp4':'89b5fcfbbe72469a2cb29bfcd6d733eaa84394f1e0cd0f020c0196ac5b3c3ed3'};
 for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex'),hash);
 assert(statSync(new URL('video/hero-desktop-crf22.mp4',root)).size<1_500_000);
 const html=read('index.html');const videoTag=html.match(/<video\b[^>]*>[\s\S]*?<\/video>/)[0];
 assert(!videoTag.includes('<source'));assert(!videoTag.includes('src='));assert(videoTag.includes('preload="none"'));
 assert(html.includes('src="hero-video.js?v=crf22-1" defer'));assert(!html.includes('website-banner-720.mp4'));
 assert(html.includes('poster="./images/hero-video-poster.webp"'));assert(!script.includes('trigden:intro-done'));
});

test('reduced motion enabled before the idle callback prevents even the initial download',()=>{
 const h=setup();h.reduce();h.scheduled();assert.equal(h.sources.length,0);assert.equal(h.counts().playCalls,0);
});

function assertControl(h,paused){
 assert.equal(h.attributes.get('aria-label'),paused?'Play background video':'Pause background video');
 assert.equal(h.attributes.get('aria-pressed'),String(paused));
}
test('rejected autoplay leaves poster visible and control in the actual paused state',async()=>{
 const h=setup({blocked:true});assertControl(h,true);h.scheduled();await h.flush();
 assert(h.video.paused);assert(!h.classes.has('is-ready'));assertControl(h,true);
 h.docEvents.get('touchstart')();await h.flush();assertControl(h,true);assert.equal(h.sources.length,1);
});
test('successful playback and explicit pause synchronize the control',async()=>{
 const h=setup();assertControl(h,true);h.scheduled();await h.flush();assertControl(h,false);
 h.video.pause();assertControl(h,true);h.controlEvents.get('click')();await h.flush();assertControl(h,false);
});
test('a denied autoplay can recover manually without changing or reloading its source',async()=>{
 const h=setup({pending:true});h.scheduled();assertControl(h,true);
 h.video.paused=true;h.attempts[0].reject(Error('Autoplay denied'));await h.flush();assertControl(h,true);assert(!h.classes.has('is-ready'));
 h.controlEvents.get('click')();assertControl(h,true);h.attempts[1].resolve();await h.flush();assertControl(h,false);
 assert.equal(h.sources.length,1);assert.equal(h.counts().loadCalls,1);
});
test('stale play rejections and resolutions cannot overwrite the actual playback state',async()=>{
 const h=setup({pending:true});h.scheduled();h.video.pause();h.controlEvents.get('click')();
 h.attempts[1].resolve();await h.flush();assertControl(h,false);
 h.attempts[0].reject(Error('Older attempt aborted'));await h.flush();assertControl(h,false);assert(h.classes.has('is-ready'));
 const paused=setup({pending:true});paused.scheduled();paused.video.pause();paused.attempts[0].resolve();await paused.flush();assertControl(paused,true);
});
test('synchronous play failures are contained and leave the same poster and paused control',async()=>{
 const h=setup({synchronousFailure:true});assert.doesNotThrow(()=>h.scheduled());await h.flush();assertControl(h,true);assert(!h.classes.has('is-ready'));
 assert.doesNotThrow(()=>h.controlEvents.get('click')());await h.flush();assertControl(h,true);assert.equal(h.sources.length,1);
});

test('manual play while autoplay is pending retries playback instead of cancelling it',async()=>{
 const h=setup({pending:true});h.scheduled();assertControl(h,true);assert.equal(h.counts().playCalls,1);
 h.controlEvents.get('click')();assert.equal(h.counts().playCalls,2);assert.equal(h.counts().pauses,0);
 h.attempts[1].resolve();h.attempts[0].resolve();await h.flush();assertControl(h,false);
 assert.equal(h.sources.length,1);assert.equal(h.counts().loadCalls,1);
});
