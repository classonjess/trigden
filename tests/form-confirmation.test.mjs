import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(new URL('../'+file, import.meta.url),'utf8');
function fixture({reduced=true, animationsFail=false, top=100}={}) {
  const animations=[], nodes=[], prompts=[{},{}];let focus=null, resets=0;
  function element(tag) {
    const node={tag,attrs:{},children:[],classList:{add(){}},setAttribute(k,v){this.attrs[k]=v;},append(...children){this.children.push(...children);},focus(){focus=this;},getBoundingClientRect(){return {top,bottom:top+240};},scrollIntoView(options){this.scrolled=options;}};
    if(animationsFail) node.animate=()=>{throw new Error('Animation unavailable');};
    else node.animate=(frames,options)=>{animations.push({tag,frames,options});return {finished:Promise.resolve(),cancel(){}};};
    nodes.push(node);return node;
  }
  const form=element('form');Object.assign(form,{id:'test-form',dataset:{},hidden:false,parentElement:{querySelectorAll:()=>prompts},before(node){this.replacement=node;},reset(){resets++;}});
  const status={textContent:'Sending…'};
  const window={innerHeight:900,matchMedia:()=>({matches:reduced})};
  const document={createElement:element,addEventListener(){}};
  vm.runInNewContext(read('form-safety.js'),{window,document,setTimeout,clearTimeout,AbortController});
  return {api:window.trigdenForms,form,status,animations,prompts,nodes,get focus(){return focus;},get resets(){return resets;}};
}
test('only a confirmed Formspree success qualifies for the thank-you state',()=>{
  const {api}=fixture();
  assert.equal(api.isSuccess({ok:true},{ok:true}),true);
  for(const result of [null,{}, {ok:false},{error:'rejected'}]) assert.equal(api.isSuccess({ok:true},result),false);
  assert.equal(api.isSuccess({ok:false},{ok:true}),false);
});
test('success replaces the complete form, clears old status and focuses the accessible exact-copy confirmation once',async()=>{
  const f=fixture();await f.api.success(f.form,f.status);
  assert.equal(f.form.hidden,true);assert.equal(f.form.inert,true);assert.equal(f.status.textContent,'');
  assert.equal(f.form.replacement.attrs.role,'status');
  assert.equal(f.form.replacement.tag,'div','avoid legacy global section background overrides');
  assert.equal(f.focus.textContent,'Thank You!');assert.equal(f.focus.tabIndex,-1);
  assert.equal(f.form.replacement.children[2].textContent,"Your inquiry has been sent successfully. I'll be in touch soon.");
  assert.equal(f.focus.attrs['aria-describedby'],'test-form-thanks-message');
  assert(f.prompts.every(x=>x.hidden));assert.equal(f.resets,1);
  await f.api.success(f.form,f.status);assert.equal(f.resets,1,'duplicate success does not insert twice');
});
test('reduced motion skips effects and scrolls an offscreen confirmation without smooth motion',async()=>{
  const f=fixture({top:-10});await f.api.success(f.form,f.status);
  assert.equal(f.animations.length,0);assert.equal(f.form.replacement.scrolled.behavior,'auto');
});
test('form fade finishes before replacement and confirmation rises gently without permanent dimensions',async()=>{
  const f=fixture({reduced:false});const pending=f.api.success(f.form,f.status);
  assert.equal(f.form.hidden,false,'keep form in place while fading');
  assert.equal(f.form.dataset.submitted,'true');
  await pending;assert.equal(f.form.hidden,true);assert.equal(f.animations.length,2);
  assert.equal(f.animations[0].options.duration,220);
  assert.equal(f.animations[1].frames[0].transform,'translateY(12px)');
  assert.equal(f.form.replacement.scrolled,undefined,'no unnecessary scrolling when visible');
});
test('an animation failure still produces a visible, focused confirmation',async()=>{
  const f=fixture({reduced:false,animationsFail:true});await f.api.success(f.form,f.status);
  assert.equal(f.form.hidden,true);assert.equal(f.focus.textContent,'Thank You!');
});
test('all six forms use the same server-confirmed success component and retain the production endpoint',()=>{
  for(const page of ['index.html','contact.html','web-design.html','website-maintenance.html','seo.html','graphic-design.html']) {
    const html=read(page);const script=page==='contact.html'?read('contact.js'):html;
    assert(html.includes('https://formspree.io/f/xreaqvyn'),page);
    assert(html.includes('form-confirmation.css'),page);
    assert(script.includes('trigdenForms.isSuccess(response, result)'),page);
    assert(script.includes('await window.trigdenForms.success('),page);
    assert(!script.includes('Your inquiry has been received.') && !script.includes('Your inquiry was sent. I’ll be in touch shortly.'),page);
    assert(script.includes("dataset.submitted !== 'true'"),page);
  }
});
