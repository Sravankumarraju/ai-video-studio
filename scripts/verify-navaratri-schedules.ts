import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {googleRequest,youtubeStatus} from '../lib/youtube';
import {db} from '../lib/db';
async function main(){
 const root='data/productions/divine-wisdom/devi-navaratri-2026';
 const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
 const releases=JSON.parse(await readFile(root+'/release-plan.json','utf8'));
 const channel=await youtubeStatus();assert.equal(channel.channelId,'UCZCidygC9i89ye1PEI_nh2Q');
 const uploads=await db.youtubeUpload.findMany({where:{projectId:{in:plan.videos.map((v:any)=>v.projectId)},state:'completed'},select:{projectId:true,videoId:true}});
 const ids=uploads.map(u=>u.videoId).filter(Boolean);
 const res=await googleRequest('https://www.googleapis.com/youtube/v3/videos?'+new URLSearchParams({part:'snippet,status,processingDetails',id:ids.join(',')}),{},channel.channelId!);assert(res.ok,`Read verification failed ${res.status}`);
 const body=await res.json();
 for(const release of releases.releases){
  const project=plan.videos.find((v:any)=>v.slug===release.slug);
  const upload=uploads.find(u=>u.projectId===project.projectId);
  const video=body.items?.find((v:any)=>v.id===upload?.videoId);
  if(!video)continue;
  assert.equal(video.snippet.channelId,channel.channelId);
  release.videoId=video.id;release.youtubeUrl=`https://www.youtube.com/watch?v=${video.id}`;
  release.actual={privacyStatus:video.status.privacyStatus,publishAt:video.status.publishAt||null,title:video.snippet.title,processingStatus:video.processingDetails?.processingStatus};
  release.status=video.status.privacyStatus==='private'&&Date.parse(video.status.publishAt)===Date.parse(release.publishAt)?'scheduled-and-verified':'uploaded-schedule-not-confirmed';
 }
 releases.verifiedAt=new Date().toISOString();await writeFile(root+'/release-plan.json',JSON.stringify(releases,null,2));
 console.log(JSON.stringify(releases.releases.map((r:any)=>({slug:r.slug,videoId:r.videoId,status:r.status,actual:r.actual})),null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
