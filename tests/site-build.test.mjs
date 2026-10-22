import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,writeFile,mkdir,rm,symlink,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSite,PUBLIC_FILES,VIDEO_FILES} from '../scripts/build-site.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=data=>createHash('sha256').update(data).digest('hex');
async function files(directory,prefix=''){
 const result=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const relative=path.posix.join(prefix,entry.name);
  if(entry.isDirectory())result.push(...await files(path.join(directory,entry.name),relative));else result.push(relative);
 }
 return result.sort();
}
async function fixture(fn){
 const temp=await mkdtemp(path.join(os.tmpdir(),'trigden-site-test-'));
 try{await fn(temp);}finally{await rm(temp,{recursive:true,force:true});}
}
async function sourceFixture(temp){
 const source=path.join(temp,'source');await mkdir(source);
 for(const file of PUBLIC_FILES)await writeFile(path.join(source,file),'synthetic '+file);
 await mkdir(path.join(source,'video'));for(const file of VIDEO_FILES)await writeFile(path.join(source,file),'synthetic optimized video');
 await writeFile(path.join(source,'video/website-banner-720.mp4'),'original must remain');
 await mkdir(path.join(source,'images'));await writeFile(path.join(source,'images/test.webp'),'synthetic image');
 await mkdir(path.join(source,'functions'));await writeFile(path.join(source,'functions/_middleware.js'),'synthetic middleware');
 return source;
}
test('production output preserves every approved page, runtime asset and image byte-for-byte, and includes only optimized videos',()=>fixture(async temp=>{
 const original=await readFile(path.join(root,'video/website-banner-720.mp4'));
 const output=path.join(temp,'site');const result=await buildSite({outputDir:output});
 const sourceImages=(await files(path.join(root,'images'))).filter(file=>file!=='.DS_Store').map(file=>'images/'+file);
 const expected=[...PUBLIC_FILES,...sourceImages,...VIDEO_FILES].sort();
 assert.deepEqual(result.files,expected);assert.deepEqual(await files(output),expected);
 for(const file of expected)assert.equal(hash(await readFile(path.join(output,file))),hash(await readFile(path.join(root,file))),file);
 assert.deepEqual((await files(path.join(output,'video'))).sort(),['hero-desktop-crf22.mp4','hero-mobile-crf22.mp4']);
 for(const missing of ['video/website-banner-720.mp4','tests','scripts','functions','README.md','.git','.env'])await assert.rejects(stat(path.join(output,missing)),{code:'ENOENT'});
 assert.equal(hash(await readFile(path.join(root,'video/website-banner-720.mp4'))),hash(original));
 assert.equal(hash(original),'ad7c397b287952ebd7d31b83c48cd9964e27ffd68d1c8eed7aac22924cc8f2ca');
}));
test('existing outputs and source directories are never overwritten or deleted',()=>fixture(async temp=>{
 const output=path.join(temp,'existing');await mkdir(output);await writeFile(path.join(output,'keep'),'preserved');
 await assert.rejects(buildSite({outputDir:output}),/already exists/);assert.equal(await readFile(path.join(output,'keep'),'utf8'),'preserved');
 await assert.rejects(buildSite({outputDir:root}),/source checkout/);
 await assert.rejects(buildSite({outputDir:path.join(root,'video','dist')}),/Only dist/);
}));
test('missing optimized assets or Functions prerequisites fail before publishing a partial output',()=>fixture(async temp=>{
 const source=await sourceFixture(temp),output=path.join(temp,'site');await rm(path.join(source,VIDEO_FILES[1]));
 await assert.rejects(buildSite({sourceDir:source,outputDir:output}),{code:'ENOENT'});await assert.rejects(stat(output),{code:'ENOENT'});
 assert.equal(await readFile(path.join(source,'video/website-banner-720.mp4'),'utf8'),'original must remain');
}));
test('unexpected video backups and local secrets never enter the generated site',()=>fixture(async temp=>{
 const source=await sourceFixture(temp),output=path.join(temp,'site');
 await writeFile(path.join(source,'video/backup.mp4'),'not public');await writeFile(path.join(source,'.env'),'synthetic-only');
 await buildSite({sourceDir:source,outputDir:output});
 assert.deepEqual(await files(path.join(output,'video')),['hero-desktop-crf22.mp4','hero-mobile-crf22.mp4']);await assert.rejects(stat(path.join(output,'.env')),{code:'ENOENT'});
}));
test('unlisted new pages fail closed instead of silently disappearing from output',()=>fixture(async temp=>{
 const source=await sourceFixture(temp);await writeFile(path.join(source,'new-service.html'),'new page');
 await assert.rejects(buildSite({sourceDir:source,outputDir:path.join(temp,'site')}),/Unlisted root asset/);
}));
test('symbolic source assets are rejected without copying outside files or creating output',()=>fixture(async temp=>{
 const source=await sourceFixture(temp);await writeFile(path.join(temp,'outside'),'synthetic outside file');
 await symlink(path.join(temp,'outside'),path.join(source,'images/linked.webp'));
 await assert.rejects(buildSite({sourceDir:source,outputDir:path.join(temp,'site')}),/Symbolic/);await assert.rejects(stat(path.join(temp,'site')),{code:'ENOENT'});
}));
