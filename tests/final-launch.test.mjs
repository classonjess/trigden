import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(new URL('../'+file, import.meta.url), 'utf8');
const pages = ['index.html','about.html','services.html','web-design.html','website-maintenance.html','seo.html','graphic-design.html','contact.html'];

test('skip links target focusable content after the primary navigation', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /class="skip-link" href="#main-content"/);
    assert.match(html, /<(header|section) id="main-content" tabindex="-1"/);
    assert(html.indexOf('id="main-content"') > html.indexOf('</nav>'), page);
    assert.equal((html.match(/id="main-content"/g)||[]).length, 1);
  }
});

test('mobile Escape restores hamburger focus only when the menu was open', () => {
  for (const open of [true,false]) {
    const listeners = {}; let focused = false;
    const button = {addEventListener(){},setAttribute(){},focus(){focused=true;}};
    const checkbox = {checked:open,addEventListener(){}};
    const toggle = {addEventListener(){},setAttribute(){}};
    const dropdown = {querySelector:()=>toggle,classList:{add(){},toggle(){}},addEventListener(){},contains(){return false;}};
    const rootClasses=new Set(), bodyClasses=new Set();
    const classList = classes => ({toggle(name,on){if(on)classes.add(name);else classes.delete(name);}});
    const document = {documentElement:{classList:classList(rootClasses)},body:{classList:classList(bodyClasses)},querySelector:s=>s==='.nav-dropdown'?dropdown:s==='.hamburger'?button:null,getElementById:id=>id==='menu-toggle'?checkbox:null,querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn};
    const window = {innerWidth:390,addEventListener:(name,fn)=>listeners[name]=fn};
    vm.runInNewContext(read('nav.js'), {document,window});
    assert.equal(rootClasses.has('mobile-menu-open'),open);
    assert.equal(bodyClasses.has('mobile-menu-open'),open);
    listeners.keydown({key:'Escape'});
    assert.equal(checkbox.checked,false);
    assert.equal(focused,open);
    assert.equal(rootClasses.has('mobile-menu-open'),false);
    assert.equal(bodyClasses.has('mobile-menu-open'),false);
    checkbox.checked=true;
    listeners.pageshow();
    assert.equal(bodyClasses.has('mobile-menu-open'),true);
    window.innerWidth=1024;
    listeners.resize();
    assert.equal(checkbox.checked,false);
    assert.equal(rootClasses.has('mobile-menu-open'),false);
    assert.equal(bodyClasses.has('mobile-menu-open'),false);
  }
});

test('native validation remains the fallback until enhanced submit handlers are attached', () => {
  for (const page of ['index.html','web-design.html','website-maintenance.html','seo.html','graphic-design.html']) {
    const html=read(page);
    assert(!/<form\b[^>]*\bnovalidate/i.test(html),page);
    const attach=html.indexOf("addEventListener('submit'");
    assert(attach>=0 && html.indexOf('.noValidate = true;',attach)>attach,page);
    assert(html.includes('&& window.trigdenForms) {'),page);
  }
  const form={noValidate:false};
  vm.runInNewContext(read('contact.js'),{document:{getElementById:()=>form},window:{}});
  assert.equal(form.noValidate,false,'missing custom helpers must preserve native validation');
});

function luminance(rgb) {
  const c=rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function rgb(hex) {return [0,2,4].map(i=>Number.parseInt(hex.slice(i,i+2),16));}
test('filled CTA gradients retain AA white-text contrast at every interpolated stop', () => {
  for (const page of ['style.css','web-design.css','seo.css','graphic-design.css','website-maintenance.css']) {
    const css=read(page);
    assert(css.includes('#28758b 0%') && css.includes('#2b768c 0%'),page);
    for (const [a,b] of [['28758b','1e5e7a'],['2b768c','246b83']]) {
      const start=rgb(a),end=rgb(b);
      for(let i=0;i<=100;i++) {
        const color=start.map((x,j)=>x+(end[j]-x)*i/100);
        assert(1.05/(luminance(color)+.05)>=4.5,`${page}: ${a} to ${b} at ${i}%`);
      }
    }
  }
});

test('shared reduced motion disables native smooth anchor scrolling', () => {
  assert.match(read('style.css'), /@media \(prefers-reduced-motion: reduce\)\s*\{\s*html\s*\{\s*scroll-behavior: auto !important;/);
});
