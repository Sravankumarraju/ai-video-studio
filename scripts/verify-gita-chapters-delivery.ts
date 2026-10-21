import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
const root='data/productions/divine-wisdom';
const channelId='UCZCidygC9i89ye1PEI_nh2Q', playlistId='PLf479MIAg730';
const json=async(p:string)=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
async function get(resource:string,params:Record<string,string>){
 const response=await googleRequest(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`,{},channelId);
 assert(response.ok,`Live verification failed: HTTP ${response.status}`);
 return response.json();
}
function seconds(duration:string){const m=/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(duration);assert(m,'Invalid duration');return Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0);}
async function main(){
 const rows:any[]=[];
 for(const chapter of [7,8,9,10]){
  const progress=await json(`${root}/PENDING_GITA_UPLOAD_PROGRESS_2026-10-21${chapter===7?'':`_chapter-${chapter}`}.json`);
  const row=progress.videos.find((v:any)=>v.id===`chapter-${chapter}`);
  assert(row?.videoId&&row.state==='scheduled'&&row.bytesUploaded===row.totalBytes,'Upload incomplete');
  const local=await json(`${root}/gita-chapter-${chapter}/story-v1/FINAL_DELIVERY.json`);
  const video=(await get('videos',{part:'snippet,status,processingDetails,contentDetails',id:row.videoId})).items?.[0];
  assert(video,'Video missing');assert.equal(video.snippet.channelId,channelId);
  assert.equal(video.status.uploadStatus,'processed');assert.equal(video.processingDetails.processingStatus,'succeeded');
  assert.equal(video.status.privacyStatus,'private');assert.equal(Date.parse(video.status.publishAt),Date.parse(row.publishAt));
  const durationSeconds=seconds(video.contentDetails.duration);assert(Math.abs(durationSeconds-local.seconds)<=2,'Full duration mismatch');
  const membership=(await get('playlistItems',{part:'snippet,contentDetails',playlistId,videoId:row.videoId,maxResults:'50'})).items||[];
  assert(membership.some((item:any)=>item.contentDetails.videoId===row.videoId),'Playlist membership missing');
  assert(row.thumbnailApplied&&video.snippet.thumbnails?.high,'Thumbnail missing');
  rows.push({chapter,videoId:row.videoId,url:`https://www.youtube.com/watch?v=${row.videoId}`,title:video.snippet.title,uploadStatus:video.status.uploadStatus,processing:video.processingDetails.processingStatus,duration:video.contentDetails.duration,durationSeconds,expectedSeconds:local.seconds,publishAt:video.status.publishAt,releaseTimeZone:'Asia/Kolkata',releaseLocal:new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'long',timeStyle:'short'}).format(new Date(video.status.publishAt)),playlistId,playlistMembershipVerified:true,thumbnailApplied:true,thumbnailUrl:video.snippet.thumbnails.high.url});
 }
 const checkedAt=new Date().toISOString();
 await writeFile(`${root}/CHAPTERS_7_10_YOUTUBE_DELIVERY_2026-10-21.json`,JSON.stringify({checkedAt,status:'verified_complete',channelId,playlistId,chapters:rows},null,2));
 const wait=await json(`${root}/CHAPTERS_7_10_UPLOAD_WAIT_STATUS_2026-10-21.json`);
 Object.assign(wait,{checkedAt,state:'verified_complete',activeUploadClients:0,lastHeartbeatResult:'All four chapters live-verified: processed, full durations, scheduled, thumbnails applied and full-chapter playlist membership confirmed.'});
 for(const chapter of wait.chapters){const row=rows.find(v=>v.chapter===chapter.chapter);Object.assign(chapter,{state:'scheduled',percent:100,bytesAcknowledged:chapter.totalBytes,videoId:row.videoId,processing:row.processing,duration:row.duration});}
 await writeFile(`${root}/CHAPTERS_7_10_UPLOAD_WAIT_STATUS_2026-10-21.json`,JSON.stringify(wait,null,2));
 console.log(JSON.stringify({status:'verified_complete',chapters:rows},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.$disconnect());
