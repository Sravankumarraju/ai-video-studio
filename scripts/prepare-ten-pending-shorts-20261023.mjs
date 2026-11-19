import {readFile,writeFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const live=JSON.parse(await readFile('.tmp/ten-shorts-live-preflight-20261023.json','utf8'));
const videos=live.pending.slice(0,10);assert.equal(videos.length,10);
for(const v of videos){
 const root=v.file.replace(/[\\/][^\\/]+$/,'');
 v.thumbnail=root+'/thumbnail-upload-20261023.jpg';
 execFileSync('ffmpeg',['-y','-v','error','-i',root+'/thumbnail.png','-frames:v','1','-q:v','3',v.thumbnail],{windowsHide:true});
 assert((await stat(v.thumbnail)).size<2*1024*1024);
 const check=JSON.parse(await readFile(root+'/verification-full.json','utf8'));
 assert(check.decodedEntireFile&&check.width===1080&&check.height===1920);
 assert.equal((await stat(v.file)).size,v.bytes);
 assert(Date.parse(v.publishAt)>Date.now());
 assert(!live.live.some(l=>l.title===v.title));
}
await writeFile('.tmp/ten-pending-shorts-plan-20261023.json',JSON.stringify({authorization:'User requested upload of ten pending created Shorts and scheduling based on the existing pattern on October 23, 2026',cadence:live.cadence,videos},null,2));
let source=await readFile('scripts/upload-pending-gita-batch.ts','utf8');
source=source.replace('PENDING_GITA_UPLOAD_PROGRESS_2026-10-21','TEN_SHORTS_UPLOAD_PROGRESS_2026-10-23');
source=source.replace(" const chapterPlan=await json(`${root}/CHAPTERS_7_10_PENDING_UPLOAD_2026-10-21.json`);",'');
source=source.replace("const shortPlan=await json(`${root}/motivation-shorts-40/PENDING_UPLOAD_SCHEDULE_2026-10-21.json`);","const shortPlan=await json('.tmp/ten-pending-shorts-plan-20261023.json');assert.equal(shortPlan.videos.length,10);");
source=source.replace("let entries=[...chapterPlan.videos.map((v:any)=>({...v,id:`chapter-${v.chapter}`,kind:'chapter'})),...shortPlan.videos.map((v:any)=>({...v,kind:'short',metadata:{title:v.title,description:v.description,tags:v.tags}}))];","let entries=shortPlan.videos.map((v:any)=>({...v,kind:'short',metadata:{title:v.title,description:v.description,tags:v.tags}}));");
source=source.replace('User requested uploading and scheduling Chapters 7–10 and the 36 pending motivation Shorts','User requested uploading ten pending Shorts and scheduling them using the existing Tuesday, Thursday, Sunday 19:00 IST pattern');
source=source.replaceAll('PENDING_GITA_LIVE_PREFLIGHT_2026-10-21','TEN_SHORTS_LIVE_PREFLIGHT_2026-10-23').replaceAll('PENDING_GITA_UPLOAD_RESULTS_2026-10-21','TEN_SHORTS_UPLOAD_RESULTS_2026-10-23');
source=source.replace('  const matches=live.filter',"  row.thumbnail=e.thumbnail;\n  const matches=live.filter");
source=source.replace("headers:{'Content-Type':'image/jpeg'},body:bytes","headers:{'Content-Type':row.thumbnail.endsWith('.png')?'image/png':'image/jpeg'},body:bytes");
assert(!source.includes('chapterPlan'));
await writeFile('scripts/upload-ten-pending-shorts-20261023.ts',source);
console.log(JSON.stringify(videos.map(v=>({id:v.id,publishAt:v.publishAt}))));
