import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {googleRequest} from '../lib/youtube';
async function main(){
 const p=JSON.parse(await readFile('data/productions/divine-wisdom/TEN_SHORTS_UPLOAD_PROGRESS_2026-10-23.json','utf8'));
 const partitions=await Promise.all([0,1,2,3].map(i=>readFile('data/productions/divine-wisdom/TEN_SHORTS_UPLOAD_PROGRESS_2026-10-23_shorts-'+i+'.json','utf8').then(JSON.parse)));
 partitions.unshift(JSON.parse(await readFile('data/productions/divine-wisdom/TEN_SHORTS_UPLOAD_PROGRESS_2026-10-23_shorts-1_final.json','utf8')));
 p.videos=p.videos.map((row:any)=>partitions.flatMap(x=>x.videos).find((v:any)=>v.id===row.id)||row);
 assert.equal(p.videos.length,10);assert(p.videos.every((v:any)=>v.videoId&&v.state==='scheduled'&&v.thumbnailApplied),'Not all ten uploads, thumbnails and schedules are complete');
 const r=await googleRequest('https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id='+p.videos.map((v:any)=>v.videoId).join(','),{},p.channelId);assert(r.ok,'Remote verification failed');const live=(await r.json()).items;
 const videos=p.videos.map((row:any)=>{const v=live.find((l:any)=>l.id===row.videoId);assert(v&&v.snippet.channelId===p.channelId);assert.equal(v.status.privacyStatus,'private');assert.equal(Date.parse(v.status.publishAt),Date.parse(row.publishAt));assert.equal(v.snippet.title,row.metadata.title);assert.equal(v.snippet.description,row.metadata.description);assert.deepEqual([...v.snippet.tags].sort(),[...row.metadata.tags].sort());assert(!['failed','terminated'].includes(v.processingDetails?.processingStatus));return {id:row.id,title:v.snippet.title,url:row.url,thumbnailApplied:row.thumbnailApplied,publishAt:v.status.publishAt,publishIST:new Date(v.status.publishAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),processing:v.processingDetails?.processingStatus};});
 const report={checkedAt:new Date().toISOString(),cadence:'Tuesday, Thursday, Sunday at 19:00 IST',videos};await writeFile('.tmp/ten-shorts-verified-20261023.json',JSON.stringify(report,null,2));await writeFile('data/productions/divine-wisdom/TEN_SHORTS_UPLOAD_PROGRESS_2026-10-23.json',JSON.stringify(p,null,2));console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
