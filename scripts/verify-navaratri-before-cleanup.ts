import 'dotenv/config';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {googleRequest,youtubeStatus} from '../lib/youtube';
async function main(){
 const root='data/productions/divine-wisdom/devi-navaratri-2026';
 const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
 const channel=await youtubeStatus();assert.equal(channel.channelId,'UCZCidygC9i89ye1PEI_nh2Q');
 const videos=[];
 for(const v of plan.videos){
  const u=await db.youtubeUpload.findFirst({where:{projectId:v.projectId,state:'completed'},orderBy:{createdAt:'desc'}});assert(u?.videoId&&u.thumbnailApplied,v.slug+' upload missing');assert.equal(u.bytesUploaded,u.totalBytes);
  const r=await googleRequest('https://www.googleapis.com/youtube/v3/videos?'+new URLSearchParams({part:'snippet,status,processingDetails',id:u.videoId}),{},channel.channelId!);assert(r.ok,'YouTube verification failed');
  const body=await r.json(),live=body.items?.find((x:any)=>x.id===u.videoId);if(!live)console.log(JSON.stringify({requested:u.videoId,returned:body.items?.map((x:any)=>x.id),keys:Object.keys(body)}));assert(live,v.slug+' not available on YouTube');assert.equal(live.snippet.channelId,channel.channelId);assert.equal(live.processingDetails?.processingStatus,'succeeded',v.slug+' not processed');
  videos.push({slug:v.slug,projectId:v.projectId,title:live.snippet.title,videoId:u.videoId,url:'https://www.youtube.com/watch?v='+u.videoId,privacyStatus:live.status.privacyStatus,publishAt:live.status.publishAt||null,processingStatus:live.processingDetails.processingStatus,thumbnailApplied:u.thumbnailApplied});
 }
 const releases=JSON.parse(await readFile(root+'/release-plan.json','utf8'));await mkdir('data/productions/divine-wisdom/retained-youtube-records',{recursive:true});
 const record={checkedAt:new Date().toISOString(),channelId:channel.channelId,videos,plannedReleases:releases.releases,localDeletionApproved:true,youtubeDeletionApproved:false};
 await writeFile('data/productions/divine-wisdom/retained-youtube-records/navaratri-2026.json',JSON.stringify(record,null,2));console.log(JSON.stringify({verified:videos.length,videos}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
