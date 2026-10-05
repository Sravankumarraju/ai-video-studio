import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const kind=process.argv[2]||'full';assert(['draft','full'].includes(kind));
const dir=process.argv[3]||'data/productions/divine-wisdom/gita-chapter-1/meaning-v1';
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
const target={title:config.title,variantId:config.variantId,jobId:state.renderJobs[kind],width:kind==='full'?1920:640,height:kind==='full'?1080:360};assert(target.jobId);
const browser='C:/Users/sravankumar.raju/.agents/skills/gstack/browse/dist/browse.exe';
let step=0;
async function evaluate(body){const file=`${dir}/browser-${kind}-step-${step}.js`,output=`${dir}/browser-${kind}-step-${step++}.json`;await writeFile(file,`(()=>{const target=${JSON.stringify(target)};${body}})()`);execFileSync(browser,['eval',file,'--out',output,'--raw'],{encoding:'utf8',maxBuffer:1024*1024});return JSON.parse(await readFile(output,'utf8'));}
async function until(body,label,tries=20){for(let i=0;i<tries;i++){const result=await evaluate(body);if(result)return result;await new Promise(r=>setTimeout(r,1500));}throw Error(`${label} did not load`);}
// Wait outside browser evaluation requests while large exports load or seek.
const inProject=await evaluate('return !!document.querySelector("h1")?.textContent.includes(target.title);');
if(!inProject){await until('return [...document.querySelectorAll("button")].some(b=>b.textContent.trim()===target.title);','Project button');await evaluate('const b=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===target.title);b.click();return true;');}
await until('return !!document.querySelector("h1")?.textContent.includes(target.title);','Project heading');
await evaluate('const b=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().endsWith("Preview & exports"));if(!b)throw Error("Preview button absent");b.click();return true;');
await until('return [...document.querySelectorAll("select")].some(s=>[...s.options].some(o=>o.value===target.variantId));','Edition selector');
await evaluate('const s=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>o.value===target.variantId));if(s.value!==target.variantId){Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(s,target.variantId);s.dispatchEvent(new Event("change",{bubbles:true}));}return true;');
const selectVideo='const v=[...document.querySelectorAll("video")].find(v=>v.src.includes(target.jobId));';
const info=await until(selectVideo+'return v&&Number.isFinite(v.duration)&&v.videoWidth?{seconds:v.duration,width:v.videoWidth,height:v.videoHeight}:null;','Export metadata',60);
assert.equal(info.width,target.width);assert.equal(info.height,target.height);if(config.productionKind==='chapter-meaning')assert(info.seconds>1800);else assert(info.seconds>=60&&info.seconds<=300);
const samples=[];
for(const point of [0,info.seconds/2,info.seconds-15]){
 await evaluate(selectVideo+`if(!v)throw Error('Expected export absent');v.pause();v.muted=true;delete v.dataset.playbackCheckError;v.currentTime=${point};v.play().catch(e=>{v.dataset.playbackCheckError=e.message;});return true;`);
 await new Promise(r=>setTimeout(r,1600));
 const sample=await until(selectVideo+`if(!v)throw Error('Export disappeared');const error=v.error?.message||v.dataset.playbackCheckError||null;if(error)throw Error(error);return !v.seeking&&!v.paused&&v.currentTime>${point}+.1?{requested:${point},currentTime:v.currentTime,paused:v.paused,error}:null;`,'Playback at '+point);
 samples.push(sample);await evaluate(selectVideo+'v.pause();return true;');
}
const result={renderJobId:target.jobId,...info,samples,error:null};
await writeFile(`${dir}/browser-${kind}-verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
