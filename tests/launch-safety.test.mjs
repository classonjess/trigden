import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(new URL('../'+file, import.meta.url),'utf8');
function analytics(cookie='') {
  const calls=[], scripts=[], listeners={};
  const context={window:{gtag:(...args)=>calls.push(args)},location:{hostname:'trigdenstudio.com'},document:{cookie,addEventListener:(name,cb)=>listeners[name]=cb,createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}}};
  vm.runInNewContext(read('analytics.js'),context);
  return {calls,scripts,choice:allowed=>listeners.cookieyes_consent_update({detail:{categories:{analytics:allowed}}})};
}
test('analytics waits for consent, re-enables after withdrawal, and loads the ID only once',()=>{
  const a=analytics(); assert.equal(a.scripts.length,0);
  a.choice(true);a.choice(false);a.choice(true);
  assert.deepEqual(a.calls.filter(x=>x[0]==='consent').map(x=>x[2].analytics_storage),['granted','denied','granted']);
  assert.equal(a.scripts.length,1);assert.match(a.scripts[0].src,/G-FRXRX62VDX$/);
  assert.equal(analytics('cookieyes-consent=consent:no,analytics:no').scripts.length,0);
  assert.equal(analytics('cookieyes-consent=%broken').scripts.length,0);
});
function safety(fetcher=async()=>({json:async()=>({ok:true}),ok:true})) {
  let timer,cleared=0; const window={};
  vm.runInNewContext(read('form-safety.js'),{window,document:{addEventListener(){}},AbortController,fetch:fetcher,setTimeout:cb=>{timer=cb;return 1;},clearTimeout:()=>cleared++});
  return {api:window.trigdenForms,timeout:()=>timer(),cleared:()=>cleared};
}
function field(value, required=true) {return {value,required,type:'text',name:'name',dataset:{},error:'',attrs:{},setCustomValidity(s){this.error=s;},checkValidity(){return !this.error;},setAttribute(n,v){this.attrs[n]=v;}};}
test('whitespace fields are rejected and can recover without clearing unrelated URL errors',()=>{
  const f=field('   '),url=field('not-a-url');url.error='Invalid URL';
  const form={querySelectorAll:()=>[f,url],checkValidity:()=>[f,url].every(x=>x.checkValidity())};
  const {api}=safety();assert.equal(api.validate(form),false);assert.equal(f.attrs['aria-invalid'],'true');
  f.value='Jess';assert.equal(api.validate(form),false);assert.equal(f.error,'');assert.equal(url.error,'Invalid URL');
});
test('request returns success, HTTP failure, and network failure without leaking timers',async()=>{
  const ok=safety();assert.equal((await ok.api.request('/test',{})).result.ok,true);assert.equal(ok.cleared(),1);
  const bad=safety(async()=>({ok:false,status:429,json:async()=>({error:'rate limit'})}));assert.equal((await bad.api.request('/test',{})).response.status,429);
  const network=safety(async()=>{throw new TypeError('offline');});await assert.rejects(network.api.request('/test',{}),/offline/);assert.equal(network.cleared(),1);
});
test('timeout aborts a stalled request and releases the timer for retry',async()=>{
  let aborted=false;
  const s=safety((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Timed out','AbortError'));})));
  const pending=s.api.request('/test',{});s.timeout();await assert.rejects(pending,{name:'AbortError'});assert.equal(aborted,true);assert.equal(s.cleared(),1);
});
test('blocked honeypot shows an error and focuses status without resetting fields',()=>{
  const status={classList:{remove(){},add(){}},setAttribute(){},focus(){this.focused=true;}};
  safety().api.blocked(status);assert.match(status.textContent,/Unable to submit/);assert.equal(status.focused,true);
});
test('active navigation matches HTML and extensionless paths, including home aliases',()=>{
  for(const path of ['/seo','/seo.html','/seo/','/','/index.html','/index']){
    const href=path.startsWith('/seo')?'https://trigdenstudio.com/seo.html':'https://trigdenstudio.com/index.html';
    const attrs={};const link={href,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],classList:{remove(){}}};
    const header={querySelectorAll:()=>[link],querySelector:()=>null};
    const doc={querySelector:()=>null,getElementById:id=>id==='nav'?header:null};
    vm.runInNewContext(read('nav.js'),{document:doc,location:{pathname:path},URL});assert.equal(attrs['aria-current'],'page',path);
  }
});
test('form endpoints, package scope, and approved pill styling stay intact',()=>{
  for(const page of ['index.html','contact.html','web-design.html','seo.html','graphic-design.html','website-maintenance.html']) {
    const s=read(page);assert.match(s,/action="https:\/\/formspree.io\/f\/xreaqvyn"/);assert.match(s,/form-safety.js/);
  }
  assert.match(read('pill-sizing.css'),/font-size: 11px !important/);
  assert.match(read('graphic-design.html'),/<option value="Email Signature Design">/);
  assert.match(read('website-maintenance.html'),/<option value="WordPress">/);
});
