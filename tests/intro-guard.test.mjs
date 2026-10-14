import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script id="entry-intro-guard">([\s\S]*?)<\/script>/)[1];
function landing({hash='',referrer='',type='navigate',seen=false,cookie='',reduced=false,blocked=false}={}){
 const events={};const classes=new Set();let removed=false;let locked=true;
 const document={referrer,cookie,documentElement:{classList:{add:c=>classes.add(c)}},body:{classList:{remove:()=>locked=false}},getElementById:()=>({remove:()=>removed=true})};
 const window={dispatchEvent(){},addEventListener:(name,fn)=>events[name]=fn};
 runInNewContext(script,{window,document,location:{hash,origin:'https://trigdenstudio.com'},matchMedia:()=>({matches:reduced}),performance:{getEntriesByType:()=>[{type}]},Event:class {constructor(type){this.type=type}},sessionStorage:{getItem(){if(blocked)throw Error('blocked');return seen?'1':null;},setItem(){}},URL});
 return {window,events,classes,state:()=>({removed,locked})};
}
test('only fresh unfragmented landing plays; all skipped paths unlock before paint',()=>{
 assert.equal(landing().window.trigdenShouldPlayIntro,true);
 for(const options of [{hash:'#work'},{referrer:'https://trigdenstudio.com/about.html'},{seen:true},{cookie:'trigden-entry-seen=1'},{reduced:true},{type:'back_forward'},{type:'reload'},{blocked:true}]){
  const visit=landing(options);assert.equal(visit.window.trigdenShouldPlayIntro,false);assert(visit.classes.has('skip-entry-intro'));assert.equal(visit.state().locked,false);
 }
});
test('pagehide, bfcache restore and hash navigation remove overlay and unlock',()=>{
 for(const [event,args] of [['pagehide',{}],['pageshow',{persisted:true}],['hashchange',{}]]){
  const visit=landing();visit.events[event](args);assert.deepEqual(visit.state(),{removed:true,locked:false});assert.equal(visit.window.trigdenShouldPlayIntro,false);
 }
});
