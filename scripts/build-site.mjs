// Dependency-free Pages asset packaging. Never mutates or deletes source assets.
import {constants} from 'node:fs';
import {lstat,readdir,mkdir,mkdtemp,copyFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PUBLIC_FILES = [
  "404.html",
  "_headers",
  "_redirects",
  "about.css",
  "about.html",
  "analytics.js",
  "brand-design.html",
  "card-spacing.css",
  "consent-defaults.js",
  "contact.css",
  "contact.html",
  "contact.js",
  "cookie-banner.js",
  "entry-intro.js",
  "entry-session.js",
  "eyebrow-type.css",
  "footer-center.css",
  "footer-message.js",
  "form-confirmation.css",
  "form-safety.js",
  "graphic-design.css",
  "graphic-design.html",
  "hero-video.js",
  "home-flow.css",
  "index.html",
  "logo-design.html",
  "mobile-hero-buttons.css",
  "nav.js",
  "pill-sizing.css",
  "privacy.html",
  "reveal.js",
  "robots.txt",
  "seo.css",
  "seo.html",
  "services.html",
  "site.webmanifest",
  "sitemap.xml",
  "style.css",
  "terms.html",
  "web-design.css",
  "web-design.html",
  "website-maintenance.css",
  "website-maintenance.html"
];
export const VIDEO_FILES = ['video/hero-desktop-crf22.mp4','video/hero-mobile-crf22.mp4'];
const projectRoot=fileURLToPath(new URL('../',import.meta.url));

async function regularFile(file){
 const info=await lstat(file);
 if(!info.isFile()||info.isSymbolicLink())throw Error('Expected regular source file: '+file);
}
async function imageFiles(root,relative='images'){
 const directory=await lstat(path.join(root,relative));
 if(!directory.isDirectory()||directory.isSymbolicLink())throw Error('Expected regular image directory');
 const files=[];
 for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})){
  if(entry.name==='.DS_Store')continue;
  const name=path.posix.join(relative,entry.name);
  if(entry.isSymbolicLink())throw Error('Symbolic image paths are not permitted');
  if(entry.isDirectory())files.push(...await imageFiles(root,name));
  else if(entry.isFile()&&/\.(png|jpe?g|webp|avif|gif|svg|ico)$/i.test(entry.name))files.push(name);
  else throw Error('Unexpected image asset: '+name);
 }
 return files.sort();
}

export async function buildSite({sourceDir=projectRoot,outputDir=path.join(sourceDir,'dist')}={}){
 const root=path.resolve(sourceDir),output=path.resolve(outputDir);
 if(root===output||root.startsWith(output+path.sep))throw Error('Output cannot replace the source checkout');
 if(output.startsWith(root+path.sep)&&output!==path.join(root,'dist'))throw Error('Only dist may be generated inside the source checkout');
 try{await lstat(output);throw Error('Output already exists; choose a fresh directory. Nothing overwritten.');}
 catch(error){if(error.code!=='ENOENT')throw error;}
 for(const entry of await readdir(root,{withFileTypes:true})){
  if(/\.(html|css|js)$/.test(entry.name)&&!PUBLIC_FILES.includes(entry.name))throw Error('Unlisted root asset; review the publish inventory: '+entry.name);
 }
 // Pages compiles Functions from the project root separately, never as public assets.
 for(const name of ['video','functions']){
  const directory=await lstat(path.join(root,name));
  if(!directory.isDirectory()||directory.isSymbolicLink())throw Error('Expected regular source directory: '+name);
 }
 await regularFile(path.join(root,'functions/_middleware.js'));
 const files=[...PUBLIC_FILES,...await imageFiles(root),...VIDEO_FILES];
 for(const file of files)await regularFile(path.join(root,file));
 await mkdir(path.dirname(output),{recursive:true});
 const staging=await mkdtemp(path.join(path.dirname(output),'.trigden-site-build-'));
 try{
  for(const file of files){
   const destination=path.join(staging,file);
   await mkdir(path.dirname(destination),{recursive:true});
   await copyFile(path.join(root,file),destination,constants.COPYFILE_EXCL);
  }
  // No recursive video copy: the archival original never enters the output.
  const video=await readdir(path.join(staging,'video'));
  if(video.sort().join('|')!==VIDEO_FILES.map(file=>path.basename(file)).sort().join('|'))throw Error('Unexpected output video inventory');
  await rename(staging,output);
 }catch(error){await rm(staging,{recursive:true,force:true});throw error;}
 return {output,files:files.sort(),originalExcluded:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length&&!(args.length===2&&args[0]==='--out-dir'))throw Error('Usage: node scripts/build-site.mjs [--out-dir NEW_DIRECTORY]');
  const result=await buildSite(args.length?{outputDir:args[1]}:{});
  console.log('PASS: packaged '+result.files.length+' public files into '+result.output+'; original video excluded; source files unchanged.');
 }catch(error){console.error('BLOCKED: '+error.message);process.exitCode=1;}
}
