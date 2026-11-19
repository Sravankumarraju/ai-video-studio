import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {googleRequest} from '../lib/youtube';
const root='output/om-namah-shivaya-1008-2026-10-23/branded-v2';
async function main(){
 const previous=JSON.parse(await readFile(`${root}/YOUTUBE_UPLOAD.json`,'utf8'));
 assert(previous.videoId==='k230i85I3xo');
 const r=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails,contentDetails&id=${previous.videoId}`,{},previous.channelId);
 assert(r.ok,`YouTube status HTTP ${r.status}`);
 const v=(await r.json()).items?.[0];assert(v&&v.snippet.channelId===previous.channelId);
 const report={...previous,privacyStatus:v.status.privacyStatus,uploadStatus:v.status.uploadStatus,processingStatus:v.processingDetails?.processingStatus,duration:v.contentDetails?.duration,failureReason:v.processingDetails?.processingFailureReason||v.status.failureReason,rejectionReason:v.status.rejectionReason,checkedAt:new Date().toISOString()};
 await writeFile(`${root}/YOUTUBE_UPLOAD.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(()=>{console.error('Live YouTube status check unavailable; saved upload receipt remains valid.');process.exitCode=1;}).finally(()=>db.$disconnect());
