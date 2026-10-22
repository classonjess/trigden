// Local-only browser regression: never submits forms or opens external links.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.TRIGDEN_PLAYWRIGHT_MODULE);
const base=process.env.TRIGDEN_PREVIEW_URL||'http://127.0.0.1:8743';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const output=process.env.TRIGDEN_BROWSER_ARTIFACTS;
if(output)await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.TRIGDEN_CHROME_EXECUTABLE});
const results=[];
async function run(width,{reduced=false,js=true,touch=false}={}){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:touch,isMobile:touch,javaScriptEnabled:js,reducedMotion:reduced?'reduce':'no-preference'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
 try{
  await page.goto(base+'/',{waitUntil:'networkidle'});
  const track=page.locator('#testimonial-track');
  await track.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100); // Existing reveal animation.
  const layout=await track.evaluate(t=>{
   const r=t.getBoundingClientRect(),cards=[...t.children].map(c=>c.getBoundingClientRect());
   return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,width:r.width,visible:cards.filter(c=>c.left>=r.left-1&&c.right<=r.right+1).length,heights:cards.map(c=>c.height),behavior:getComputedStyle(t).scrollBehavior,left:t.scrollLeft};
  });
  assert.equal(layout.documentWidth,width,'No page overflow');
  assert.equal(layout.visible,width<=768?1:2,'Responsive card count');
  assert(layout.heights.every(h=>Math.abs(h-layout.heights[0])<1),'Equal card heights');
  if(reduced)assert.equal(layout.behavior,'auto');
  const name=width+(reduced?'-reduced':'')+(!js?'-no-js':'');
  if(output){
   const section=page.locator('#testimonials'),box=await section.boundingBox();
   // Tall element captures can lose fixed page backgrounds in Chrome. Capture
   // the real viewport when a full review exceeds the viewport height.
   if(box.height>page.viewportSize().height)await page.screenshot({path:output+'/'+name+'.png'});
   else await section.screenshot({path:output+'/'+name+'.png'});
  }
  assert.equal(await page.locator('#testimonials details, #testimonials summary').count(),0);
  assert.equal(await page.locator('.testimonials-google-rating').innerText(),'★★★★★ 5.0 on Google');
  assert.equal(await page.locator('.testimonials-google-rating span').evaluate(el=>getComputedStyle(el).color),'rgb(230, 182, 92)');
  for(const card of await page.locator('.testimonial-card').all()) {
   const quote=card.locator('.testimonial-quote'),button=card.locator('.testimonial-expand');
   const original=await quote.textContent();
   const metric=await quote.evaluate(q=>({height:q.clientHeight,full:q.scrollHeight,limit:parseFloat(getComputedStyle(q).lineHeight)*5}));
   if(js && metric.full>metric.limit+1){
    assert(await button.isVisible(),'Long reviews have an expansion button');
    assert(metric.height<=metric.limit+1,'Initially limited to five lines');
    assert(await quote.evaluate(q=>getComputedStyle(q).maskImage.includes('linear-gradient')),'Only collapsed long reviews fade');
    assert.equal(await quote.evaluate(q=>getComputedStyle(q).webkitLineClamp),'none','No truncation ellipsis');
    await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');
    assert.equal(await button.textContent(),'Read less');
    assert(await quote.evaluate(q=>q.scrollHeight<=q.clientHeight+1),'Expanded text is not clipped');
    assert.equal(await quote.evaluate(q=>getComputedStyle(q).maskImage),'none','Expanded text has no fade');
    assert.equal(await quote.textContent(),original,'Expansion never rewrites the review');
    // Space on the button keeps native activation and does not move the carousel.
    await button.focus();await page.keyboard.press('Space');
    assert.equal(await button.getAttribute('aria-expanded'),'false');
    assert((await button.textContent()).includes('Read full review'));
    assert.equal(await quote.textContent(),original,'Collapsing preserves complete text');
   }else{
    assert(!(await button.isVisible()),'Fitting reviews and no-JS fallback have no control');
    assert(metric.full<=metric.height+1,'Short and no-JS reviews remain fully readable');
    assert.equal(await quote.evaluate(q=>getComputedStyle(q).maskImage),'none','Short and no-JS reviews have no fade');
   }
  }
  await track.evaluate(t=>t.scrollTo({left:0,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('#testimonial-track').scrollLeft<2);
  await page.waitForTimeout(150);
  if(js){
   const next=page.getByRole('button',{name:'Next testimonials',exact:true}),previous=page.getByRole('button',{name:'Previous testimonials',exact:true});
   assert.equal(await previous.getAttribute('aria-disabled'),'true');
   // Test both controls, including the disabled previous button, with native
   // keyboard focus and pointer states. Geometry and spacing must not change.
   for(const arrow of [previous,next]) {
    const before=await arrow.boundingBox();
    const circle=()=>arrow.evaluate(e=>{
     const s=getComputedStyle(e),r=e.getBoundingClientRect();
     return Math.abs(r.width-r.height)<.1 && r.width===44 && s.borderRadius==='50%' && s.outlineStyle==='none';
    });
    assert(await circle(),'Default arrow remains circular');
    await arrow.hover();assert(await circle(),'Hover remains circular');
    await page.mouse.down();assert(await circle(),'Active remains circular');
    await page.mouse.move(0,0);await page.mouse.up();
    await arrow.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert(await arrow.evaluate(e=>e.matches(':focus-visible')),'Keyboard focus is visible');
    assert(await circle(),'Focused arrow remains circular');
    assert(await arrow.evaluate(e=>{const s=getComputedStyle(e,'::after');return s.borderRadius==='50%'&&s.borderTopWidth==='2px'&&s.pointerEvents==='none';}),'Focus ring is circular');
    const after=await arrow.boundingBox();
    assert.equal(after.width,before.width);assert.equal(after.height,before.height);assert.equal(after.x,before.x);
   }
   if(output && width===1440)await page.locator('#testimonials').screenshot({path:output+'/circular-focus.png'});
   await next.click();await page.waitForTimeout(1000);assert(await track.evaluate(t=>t.scrollLeft>20));
   assert.equal(await track.evaluate(t=>Math.round(t.getBoundingClientRect().height)),Math.round(await track.evaluate(t=>t.scrollHeight)),'Long reviews do not create hidden vertical content');
   await previous.click();await page.waitForFunction(()=>document.querySelector('#testimonial-track').scrollLeft<2);
   await track.focus();await page.keyboard.press('End');await page.waitForFunction(()=>{const t=document.querySelector('#testimonial-track');return Math.abs(t.scrollLeft-(t.scrollWidth-t.clientWidth))<2;});await page.waitForFunction(()=>document.querySelector('[data-testimonial-next]').getAttribute('aria-disabled')==='true');
   await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('#testimonial-track').scrollLeft<2);
   await page.keyboard.press('ArrowRight');await page.waitForTimeout(1000);assert(await track.evaluate(t=>t.scrollLeft>20));
   await page.locator('.testimonial-dot').first().click();await page.waitForFunction(()=>document.querySelector('#testimonial-track').scrollLeft<2);
   assert.equal(await page.locator('.testimonial-dot[aria-current="true"]').count(),1);
   await track.focus();await page.keyboard.press('ArrowLeft');assert(await track.evaluate(t=>t.matches(':focus-visible')));
   if(touch){
    const cdp=await context.newCDPSession(page),box=await track.boundingBox();
    await cdp.send('Input.synthesizeScrollGesture',{x:Math.round(box.x+box.width*.8),y:Math.round(box.y+100),xDistance:-Math.round(box.width*.8),yDistance:0,gestureSourceType:'touch',speed:600});
    await page.waitForTimeout(800);assert(await track.evaluate(t=>t.scrollLeft>20),'Native touch swipe');
   }
   if(width===1440){
    await page.setViewportSize({width:402,height:900});await page.waitForTimeout(400);
    assert.equal(await page.locator('.testimonial-dot').count(),5);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),402);
   }
  }else assert(!(await page.locator('.testimonial-controls').isVisible()));
  assert.deepEqual(errors,[]);results.push({name,...layout,passed:true});console.log('PASS carousel '+name);
 }finally{await context.close();}
}
try{
 for(const width of [1440,1024,769,768,402,390,320])await run(width,{touch:width===402});
 await run(402,{reduced:true});await run(402,{js:false});
 const context=await browser.newContext(),page=await context.newPage();
 await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
 for(const path of ['/','/about','/services','/web-design','/website-maintenance','/seo','/graphic-design','/contact','/privacy','/terms','/404.html']){
  const response=await page.goto(base+path,{waitUntil:'load'});assert.equal(response.status(),200,path);
  const linkedin=page.getByRole('link',{name:'Jessica Classon on LinkedIn',exact:true});assert.equal(await linkedin.count(),1,path);assert.equal(await linkedin.getAttribute('href'),'https://www.linkedin.com/in/jessicaclasson');
  const schemas=await page.locator('script[type="application/ld+json"]').allTextContents();schemas.forEach(s=>JSON.parse(s));
 }
 await context.close();
 if(output)await writeFile(output+'/carousel-results.json',JSON.stringify({results,footerPages:11,limitations:['Chrome emulation; physical iOS Safari not tested.','External assets blocked; no form delivery tests or production changes.']},null,2));
 console.log('PASS: '+results.length+' carousel scenarios and 11 footer/schema pages.');
}finally{await browser.close();}
