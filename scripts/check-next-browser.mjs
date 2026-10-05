import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const [kind='full',...args]=process.argv.slice(2);
assert(['draft','full'].includes(kind));
const episodes=args.length?args.map(Number):[7,8,9,10];
const browser='C:/Users/sravankumar.raju/.agents/skills/gstack/browse/dist/browse.exe';
for(const n of episodes){
 assert([7,8,9,10].includes(n));
 const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`;
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
 assert(state.renderJobs[kind]);
 const target={title:config.title,episode:config.verseRef,number:config.episodeNumber,jobId:state.renderJobs[kind],width:kind==='full'?1920:640,height:kind==='full'?1080:360};
 const body=`(async()=>{
 const target=${JSON.stringify(target)};
 const wait=async f=>{for(let i=0;i<200;i++){const x=f();if(x)return x;await new Promise(r=>setTimeout(r,100));}throw Error('Expected project or export did not load');};
 const button=await wait(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===target.title));button.click();
 await wait(()=>document.querySelector('h1')?.textContent.includes('Episode '+target.number));
 const preview=await wait(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().endsWith('Preview & exports')));preview.click();
 const video=await wait(()=>[...document.querySelectorAll('video')].find(v=>v.src.includes(target.jobId)));
 video.muted=true;await video.play();await new Promise(r=>setTimeout(r,1200));
 const result={episode:target.episode,renderJobId:target.jobId,seconds:video.duration,width:video.videoWidth,height:video.videoHeight,readyState:video.readyState,currentTime:video.currentTime,paused:video.paused,error:video.error?.message||null};video.pause();
 if(result.width!==target.width||result.height!==target.height||result.error||result.paused||!result.currentTime)throw Error('Browser playback failed');return result;
})()`;
 const file=`${dir}/browser-check-${kind}.js`,output=`${dir}/browser-${kind}-verification.json`;
 await writeFile(file,body);
 console.log(execFileSync(browser,['eval',file,'--out',output,'--raw'],{encoding:'utf8',maxBuffer:1024*1024}).trim());
 const verified=JSON.parse(await readFile(output,'utf8'));assert.equal(verified.renderJobId,target.jobId);
 console.log(JSON.stringify(verified));
}
