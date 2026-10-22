// Optional real-browser regression harness. No external requests or submissions.
// Run against a local preview. Without byte ranges, wait for natural playback.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
if(!process.env.TRIGDEN_PLAYWRIGHT_MODULE)throw Error('Set TRIGDEN_PLAYWRIGHT_MODULE to an existing Playwright package.');
const {chromium}=require(process.env.TRIGDEN_PLAYWRIGHT_MODULE);
const base=process.env.TRIGDEN_PREVIEW_URL||'http://127.0.0.1:8743';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local preview only');
const out=process.env.TRIGDEN_BROWSER_ARTIFACTS;
if(out)await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.TRIGDEN_CHROME_EXECUTABLE?{executablePath:process.env.TRIGDEN_CHROME_EXECUTABLE}:{})});
const results=[];
const desktop='/video/hero-desktop-crf22.mp4',mobile='/video/hero-mobile-crf22.mp4';
async function caseFor(name,{width=1440,height=900,reduced=false,js=true,fail=false,hold=false,manual=false,deny=false,syncThrow=false}={}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width<=480?3:1,isMobile:width<=480,hasTouch:width<=480,reducedMotion:reduced?'reduce':'no-preference',javaScriptEnabled:js});
 const page=await context.newPage(),requests=[],errors=[],responses=[];
 if(deny||syncThrow)await page.addInitScript(({syncThrow})=>{
  window.__denyHeroPlay=true;window.__heroPlayAttempts=0;
  const nativePlay=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   if(this.id==='hero-vid'&&window.__denyHeroPlay){
    window.__heroPlayAttempts++;
    const error=new DOMException('Synthetic autoplay denial','NotAllowedError');
    if(syncThrow)throw error;
    return Promise.reject(error);
   }
   return nativePlay.call(this);
  };
 },{syncThrow});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{const url=new URL(request.url());if(url.pathname.endsWith('.mp4'))requests.push(url.pathname);});
 page.on('response',response=>{const url=new URL(response.url());if(url.pathname.endsWith('.mp4'))responses.push({path:url.pathname,status:response.status(),length:response.headers()['content-length']});});
 let frameEvidence=null;
 let release;const held=new Promise(resolve=>release=resolve);
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(base).origin)return route.abort();
  if(url.pathname.endsWith('.mp4')){
   if(fail)return route.abort();
   if(hold)await held;
  }
  return route.continue();
 });
 try{
  await page.goto(base+'/',{waitUntil:'load'});
  const initial=await page.evaluate(()=>{
   const h=document.querySelector('.hero h1'),cta=document.querySelector('.hero .cta-button'),r=cta.getBoundingClientRect();
   const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {heroVisible:getComputedStyle(h).visibility==='visible'&&getComputedStyle(h).opacity==='1',ctaClickable:hit===cta||cta.contains(hit),overflowY:getComputedStyle(document.body).overflowY,overlay:!!document.querySelector('#entry-intro'),scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,introAnimating:!!document.querySelector('.entry-logo-pulse')};
  });
  assert(initial.heroVisible&&initial.ctaClickable&&!initial.overlay&&!['hidden','clip'].includes(initial.overflowY),name+': first-visit content blocked');
  assert.equal(initial.scrollWidth,initial.viewport,name+': horizontal overflow');
  if(js&&!reduced)assert(initial.introAnimating,name+': fresh visit should pulse existing nav logo');
  if(hold){await page.waitForTimeout(300);assert(initial.ctaClickable);release();}
  if(reduced||!js){
   await page.waitForTimeout(3000);assert.equal(requests.length,0,name+': unwanted video download');
   if(manual){await page.locator('#hero-motion-toggle').click();await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.readyState>=2&&v.currentTime>0&&v.classList.contains('is-ready');});}
  }else if(deny||syncThrow){
   await page.waitForFunction(()=>window.__heroPlayAttempts>0);
   await page.waitForTimeout(150);
   assert(await page.locator('video').evaluate(v=>v.paused));
   assert.equal(await page.locator('video').evaluate(v=>getComputedStyle(v).opacity),'0');
   assert.equal(await page.locator('.hero-poster').evaluate(v=>getComputedStyle(v).opacity),'0.98');
   assert.equal(await page.locator('#hero-motion-toggle').getAttribute('aria-label'),'Play background video');
   assert.equal(await page.locator('#hero-motion-toggle').getAttribute('aria-pressed'),'true');
   assert(await page.locator('#hero-motion-toggle').evaluate(b=>b.classList.contains('is-paused')));
   assert.equal(await page.locator('#hero-motion-toggle .sr-only').textContent(),'Play background video');
   await page.evaluate(()=>window.__denyHeroPlay=false);
   await page.locator('#hero-motion-toggle').click();
   await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.readyState>=2&&v.currentTime>0&&v.classList.contains('is-ready');});
   assert.equal(await page.locator('#hero-motion-toggle').getAttribute('aria-label'),'Pause background video');
   assert.equal(await page.locator('#hero-motion-toggle').getAttribute('aria-pressed'),'false');
   assert(!(await page.locator('#hero-motion-toggle').evaluate(b=>b.classList.contains('is-paused'))));
   assert.equal(await page.locator('#hero-motion-toggle .sr-only').textContent(),'Pause background video');
  }else if(fail){
   await page.waitForTimeout(3000);
   assert.equal(await page.locator('video').evaluate(v=>getComputedStyle(v).opacity),'0');
   assert.equal(await page.locator('.hero-poster').evaluate(v=>getComputedStyle(v).opacity),'0.98');
  }else{
   await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2&&!v.paused&&v.currentTime>0&&v.classList.contains('is-ready');},{timeout:15000});
  }
  const initialCrop=await page.evaluate(()=>{const v=document.querySelector('video'),s=getComputedStyle(v);return {objectFit:s.objectFit,objectPosition:s.objectPosition,videoRect:v.getBoundingClientRect().toJSON(),heroRect:document.querySelector('.hero').getBoundingClientRect().toJSON()};});
  assert.equal(initialCrop.objectFit,'cover');assert.equal(initialCrop.objectPosition,width<=768?'68% 50%':'50% 50%');
  const expected=width<=480?mobile:desktop;
  if((!reduced&&js)||manual){assert.deepEqual([...new Set(requests)],[expected],name+': more than one variant');}
  if(js&&!reduced&&!fail){
   // Hold on a confirmed presented frame, rather than accidentally capturing the poster.
   frameEvidence=await page.evaluate(()=>new Promise((resolve,reject)=>{
    const v=document.querySelector('video');
    const canSeek=v.seekable.length>0&&v.seekable.end(v.seekable.length-1)>=8;
    const deadline=setTimeout(()=>reject(Error('No video frame presented')),20000);
    function frame(now,metadata){
      if((canSeek&&Math.abs(metadata.mediaTime-8)<.1)||(!canSeek&&metadata.mediaTime>=8)){
        clearTimeout(deadline);v.pause();resolve({method:canSeek?'seek':'natural playback',mediaTime:metadata.mediaTime});
      }else v.requestVideoFrameCallback(frame);
    }
    v.requestVideoFrameCallback(frame);
    if(canSeek){v.pause();v.currentTime=8;}
    else v.play().catch(reject);
   }));
   if(frameEvidence.mediaTime<7.9)throw Error('Poster captured instead of matching video frame');
   if(out){
    // Clip to the visible viewport: the existing desktop hero starts above y=0.
    const box=await page.locator('.hero').boundingBox(),viewport=page.viewportSize();
    const x=Math.max(0,box.x),y=Math.max(0,box.y);
    await page.screenshot({path:path.join(out,name+'-hero.png'),scale:'css',clip:{x,y,width:Math.min(viewport.width,box.x+box.width)-x,height:Math.min(viewport.height,box.y+box.height)-y}});
   }
   // Pausing/resuming, resize/orientation and preference changes must never swap sources.
   await page.locator('#hero-motion-toggle').click();
   await page.setViewportSize({width:width<=480?1000:402,height});
   await page.waitForTimeout(300);
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>document.querySelector('video').paused);
   await page.waitForTimeout(200);
   assert.deepEqual([...new Set(requests)],[expected],name+': resize downloaded another variant');
   assert.equal(await page.locator('video source').count(),1);
  }
  assert.deepEqual(errors,[],name+': uncaught errors');
  const state=await page.evaluate(()=>{const v=document.querySelector('video'),s=getComputedStyle(v);return {source:v.querySelector('source')?.getAttribute('src')||null,videoWidth:v.videoWidth,videoHeight:v.videoHeight,objectFit:s.objectFit,objectPosition:s.objectPosition,muted:v.muted,playsInline:v.playsInline,preload:v.preload};});
  assert(state.muted&&state.playsInline&&state.preload==='none');
  if(js&&!reduced&&!fail){assert.equal(state.videoWidth,width<=480?768:1280);assert.equal(state.videoHeight,width<=480?432:720);}
  results.push({name,initial,initialCrop,frameEvidence,...state,variantURLs:[...new Set(requests)],requests:requests.length,responses});
  console.log('PASS '+name+' '+JSON.stringify(results.at(-1)));
 }finally{release();await context.close();}
}
try{
 await caseFor('desktop1440');
 await caseFor('mobile402',{width:402,height:874});
 await caseFor('mobile390',{width:390,height:844});
 await caseFor('mobile480',{width:480,height:900});
 await caseFor('boundary481',{width:481,height:900});
 await caseFor('tablet768',{width:768,height:1024});
 await caseFor('reduced-motion',{width:402,height:874,reduced:true});
 await caseFor('explicit-play-reduced-motion',{width:402,height:874,reduced:true,manual:true});
 await caseFor('javascript-disabled',{width:402,height:874,js:false});
 await caseFor('rejected-autoplay-recovery',{width:402,height:874,deny:true});
 await caseFor('synchronous-play-failure-recovery',{width:402,height:874,syncThrow:true});
 await caseFor('video-error',{width:402,height:874,fail:true});
 await caseFor('delayed-video',{hold:true});
 if(out)await writeFile(path.join(out,'browser-results.json'),JSON.stringify({browser:browser.version(),limitations:['Chromium mobile emulation is not mobile Safari.','External resources blocked for deterministic, local-only tests.'],results},null,2));
 console.log('PASS: '+results.length+' real Chrome browser scenarios; no production requests or form submissions.');
}finally{await browser.close();}
