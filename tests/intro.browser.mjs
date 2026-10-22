// Local-only welcome-screen regression: no external requests or form submissions.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const runtime=require(process.env.TRIGDEN_PLAYWRIGHT_MODULE);
const engine=process.env.TRIGDEN_BROWSER_ENGINE||'chromium';
const base=process.env.TRIGDEN_PREVIEW_URL||'http://127.0.0.1:8743';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const out=process.env.TRIGDEN_BROWSER_ARTIFACTS;
if(out)await mkdir(out,{recursive:true});
const browser=await runtime[engine].launch({headless:true,...(engine==='chromium'&&process.env.TRIGDEN_CHROME_EXECUTABLE?{executablePath:process.env.TRIGDEN_CHROME_EXECUTABLE}:{})});
const script=await readFile(new URL('../entry-intro.js',import.meta.url),'utf8');
const videos=Object.fromEntries(await Promise.all(['hero-desktop-crf22.mp4','hero-mobile-crf22.mp4'].map(async name=>[name,await readFile(new URL('../video/'+name,import.meta.url))])));
const results=[];
async function run(name,{width=1440,reduced=false,delay=0,fail=false,missingScript=false,crash=false,js=true,hash='',record=false}={}){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<=480,hasTouch:width<=480,javaScriptEnabled:js,reducedMotion:reduced?'reduce':'no-preference',...(out&&record?{recordVideo:{dir:out,size:{width,height:900}}}:{})});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{
  window.__welcome={events:[]};
  for(const type of ['animationstart','animationiteration','animationend'])document.addEventListener(type,e=>{
   if(e.animationName==='introLogoPulse')window.__welcome.events.push({type,elapsed:e.elapsedTime,time:performance.now(),decoded:e.target.complete&&e.target.naturalWidth>0});
  },true);
  window.addEventListener('trigden:intro-done',()=>window.__welcome.done=performance.now());
 });
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==new URL(base).origin)return route.abort();
  if(url.pathname.endsWith('/entry-intro.js')){
   if(missingScript)return route.abort();
   if(crash)return route.fulfill({status:200,contentType:'application/javascript',body:script.replace("intro.classList.add('is-ready');","throw Error('Injected intro controller failure');")});
  }
  if(url.pathname.includes('/images/trigdenlogo')){
   if(fail)return route.abort();
   if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  }
  // Wrangler's local preview ignores byte ranges; WebKit needs CDN-like 206 responses.
  const video=videos[url.pathname.split('/').at(-1)];
  if(engine==='webkit'&&video){
   const range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
   if(range){
    const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):video.length-1,video.length-1);
    return route.fulfill({status:206,contentType:'video/mp4',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${video.length}`},body:video.subarray(start,end+1)});
   }
   return route.fulfill({status:200,contentType:'video/mp4',headers:{'Accept-Ranges':'bytes'},body:video});
  }
  return route.continue();
 });
 try{
  await page.goto(base+'/'+hash,{waitUntil:'domcontentloaded'});
  const plays=js&&!reduced&&!fail&&!missingScript&&!crash&&!hash&&delay<3000;
  if(plays){
   await page.locator('#entry-intro.is-ready').waitFor();
   assert.equal(await page.locator('.entry-intro__caption').innerText(),'ENTERING THE STUDIO');
   assert.equal(await page.locator('#nav .entry-logo-pulse').count(),0);
   const m=await page.locator('#entry-intro').evaluate(e=>{const r=e.getBoundingClientRect(),c=e.querySelector('.entry-intro__content').getBoundingClientRect();return {width:r.width,height:r.height,cx:(c.left+c.right)/2,cy:(c.top+c.bottom)/2,overflow:document.documentElement.scrollWidth>innerWidth}});
   assert.equal(m.width,width);assert.equal(m.height,900);assert(Math.abs(m.cx-width/2)<1&&Math.abs(m.cy-450)<1);assert(!m.overflow);
   if(out)await page.screenshot({path:out+'/'+name+'-welcome.png',animations:'allow'});
  }
  if(crash){
   await page.waitForFunction(()=>{const e=document.getElementById('entry-intro');return e&&getComputedStyle(e).opacity==='0'&&getComputedStyle(e).pointerEvents==='none'},{},{timeout:8000});
   assert(errors.some(e=>e.includes('Injected intro controller failure')));
  }else await page.waitForFunction(()=>!document.getElementById('entry-intro'),{},{timeout:8000});
  if(plays){
   const evidence=await page.evaluate(()=>window.__welcome);
   const events=evidence.events;
   assert.deepEqual(events.map(e=>e.type),['animationstart','animationiteration','animationiteration','animationend']);
   assert(events.every(e=>e.decoded),'Every cycle uses a decoded logo');
   assert(Math.abs(events.at(-1).elapsed-1.95)<.01,'Three complete 650ms pulses');
   assert(evidence.done-events.at(-1).time>=200,'Fade completes before removal');
   results.push({name,events,fadeMs:evidence.done-events.at(-1).time});
   // Revisit cases share browser-session state and must not replay the welcome.
   await page.reload({waitUntil:'load'});assert.equal(await page.locator('#entry-intro').count(),0);
   const tab=await context.newPage();await tab.goto(base+'/',{waitUntil:'load'});assert.equal(await tab.locator('#entry-intro').count(),0);await tab.close();
   await page.goto(base+'/about',{waitUntil:'load'});await page.goto(base+'/',{waitUntil:'load'});assert.equal(await page.locator('#entry-intro').count(),0);
  }else{
   if(js&&!crash)assert.equal(await page.evaluate(()=>window.__welcome.events.length),0,'Skipped or failed loads never pulse');
   results.push({name,skipped:true});
  }
  const accessible=await page.locator('.hero .cta-button').first().evaluate(a=>{const r=a.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===a||a.contains(hit)});
  assert(accessible,'Homepage interaction works after intro/fallback');
  assert(!['hidden','clip'].includes(await page.evaluate(()=>getComputedStyle(document.body).overflowY)));
  if(out&&[1440,402,320].includes(width)&&plays)await page.screenshot({path:out+'/'+name+'-homepage.png'});
  if(js&&!reduced&&!hash){
   await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>0&&v.readyState>=2},{},{timeout:15000});
   assert.equal(await page.locator('video source').count(),1);
   assert((await page.locator('video source').getAttribute('src')).includes(width<=480?'hero-mobile-crf22':'hero-desktop-crf22'));
  }
  if(!crash)assert.deepEqual(errors,[]);
  console.log('PASS '+engine+' welcome '+name);
 }finally{await context.close()}
}
try{
 await run('desktop',{record:true});await run('phone',{width:402,record:true});await run('narrow-phone',{width:320});
 await run('slow-logo',{width:402,delay:1200});await run('stalled-logo',{width:402,delay:3500});
 await run('failed-logo',{width:402,fail:true});await run('missing-controller',{missingScript:true});
 await run('controller-error',{crash:true});await run('reduced-motion',{width:402,reduced:true});
 await run('no-javascript',{width:402,js:false});await run('fragment-landing',{width:402,hash:'#top'});
 if(out)await writeFile(out+'/welcome-results.json',JSON.stringify({engine,results,limitations:['WebKit emulation is not a physical iPhone.','External integrations blocked; no form submissions.']},null,2));
 console.log('PASS '+results.length+' welcome scenarios, including session-return checks');
}finally{await browser.close()}
