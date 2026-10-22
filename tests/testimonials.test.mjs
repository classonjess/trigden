import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {PUBLIC_FILES} from '../scripts/build-site.mjs';
const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const home=read('index.html'), section=home.split('<section class="testimonials-section"')[1].split('</section>')[0];
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
const originalFullReviewHashes=["c9d9ba78c96164f93247f622f2a64eeeaea31cdff2ce62ee1730b6b74e58353f", "0aa6c9f69fe8166ddedf611606b38bc09574b09af42c48800367e48b1f6eb361", "d85494f3a0b53faea34a8e05391b229a386276e3c0b708528e8dfc207a5d29d1", "d6225b1e6d808f021d400c7b3e30672221e1b2c24f81be8701e38e9465fc240e", "7a39f59e94ece4b95e990bfaea03ea910fa51009ba0216023854a08caff18373"];
test('five distinct testimonials keep existing client wording and Google attribution separate',()=>{
 const cards=[...section.matchAll(/<article class="testimonial-card"[^>]*data-source="([^"]+)"[\s\S]*?<\/article>/g)];
 assert.equal(cards.length,5);assert.equal(cards.filter(c=>c[1]==='google').length,3);
 const names=cards.map(c=>c[0].match(/id="testimonial-name-\d+">([^<]+)</)[1]);assert.equal(new Set(names).size,5);
 assert.deepEqual(names,['Mariano Gomes Alves','Kirsten van der Riet','James P','Gary, Maverick Co.','MRA Designs']);
 for(const [index,card] of cards.entries()){
  const text=decode(card[0].match(/<blockquote class="testimonial-quote"[^>]*>([\s\S]*?)<\/blockquote>/)[1].replace(/<\/p>\s*<p>/g,'\n\n').replace(/<\/?p>/g,''));
  assert.equal(createHash('sha256').update(text).digest('hex'),originalFullReviewHashes[index],'Complete review wording must remain unchanged');
  assert.equal((card[0].match(/<blockquote/g)||[]).length,1,'Only the complete quote is rendered');
  assert.equal(card[0].includes('5 out of 5 stars'),card[1]==='google');
  assert.equal(card[0].includes('Google Review'),card[1]==='google');
 }
 assert(section.includes('They helped me create a logo so I could put it on some hoodies and gave me a lot of different ideas to choose from.'));
 assert(section.includes('She is on speed dial on my phone!!!'));
 assert(section.includes('5.0 on Google</strong>'));
 assert(!/Based on|3 reviews|review count/i.test(section));
 assert(read('testimonials.css').includes('#E6B65C'));
 assert(section.includes('https://www.google.com/maps/place/Trigden+Studio/data=!4m2!3m1!1s0x0:0xfcb1ae0ee7b20da9'));
});
test('shared footer LinkedIn is accessible on every page that has a footer',()=>{
 let count=0;
 for(const file of readdirSync(new URL('../',import.meta.url)).filter(f=>f.endsWith('.html'))){
  const html=read(file);if(!html.includes('<footer'))continue;count++;
  assert.equal((html.match(/class="footer-linkedin"/g)||[]).length,1,file);
  assert.match(html,/<a class="footer-linkedin" href="https:\/\/www.linkedin.com\/in\/jessicaclasson" target="_blank" rel="noopener noreferrer" aria-label="Jessica Classon on LinkedIn">/);
 }assert.equal(count,11);
});
test('LinkedIn identifies the Person without adding review-star schema',()=>{
 const about=JSON.parse(read('about.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(about.mainEntity['@type'],'Person');
 assert.deepEqual(about.mainEntity.sameAs,['https://www.linkedin.com/in/jessicaclasson']);
 for(const file of readdirSync(new URL('../',import.meta.url)).filter(f=>f.endsWith('.html'))){
  for(const match of read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
   const schema=JSON.parse(match[1]);assert(!/"(?:aggregateRating|reviewRating|Review)"/.test(JSON.stringify(schema)),file);
  }
 }
});
test('carousel assets enter the production inventory with manual, progressively enhanced controls',()=>{
 for(const file of ['testimonials.css','testimonials.js']){assert(PUBLIC_FILES.includes(file));assert(home.includes('/'+file+'?v='+(file.endsWith('.css')?'4':'3')));}
 assert(section.includes('tabindex="0"'));assert(section.includes('aria-live="polite"'));
 assert(section.includes('testimonial-controls" hidden'));assert(!/<details|<summary|excerpt|Read more/.test(section));
 assert.equal((section.match(/class="testimonial-expand"/g)||[]).length,5);
 assert(section.includes('aria-expanded="false"'));
 assert(section.includes('Read full review'));
 assert(section.includes('What Clients Say'));
 assert(!/setInterval|setTimeout/.test(read('testimonials.js')),'No automatic rotation');
});
