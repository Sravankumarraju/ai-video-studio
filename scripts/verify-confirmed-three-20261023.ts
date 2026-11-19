import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {googleRequest} from '../lib/youtube';
const roots=['output/nee-sannidhe-shanthi-full/youtube-package','data/productions/divine-wisdom/ayyappa-deeksha-2026-10-22','data/productions/divine-wisdom/karthika-deepam-2026-10-22'];
async function main(){
 const reports=[];
 for(const root of roots){
  const state=JSON.parse(await readFile(root+'/youtube-local-upload.json','utf8'));
  assert(state.videoId&&state.thumbnailApplied);
  const r=await googleRequest('https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id='+state.videoId,{},state.channelId);
  assert(r.ok,'YouTube verification failed');const video=(await r.json()).items?.[0];
  assert(video&&video.snippet.channelId==='UCZCidygC9i89ye1PEI_nh2Q');
  assert.equal(video.status.privacyStatus,'private');assert.equal(video.snippet.title,state.metadata.title);assert.equal(video.snippet.description,state.metadata.description);
  assert.deepEqual([...video.snippet.tags].sort(),[...state.metadata.tags].sort());
  const report={title:video.snippet.title,videoId:video.id,url:'https://www.youtube.com/watch?v='+video.id,privacyStatus:video.status.privacyStatus,uploadStatus:video.status.uploadStatus,processingStatus:video.processingDetails?.processingStatus,thumbnailApplied:state.thumbnailApplied,metadataVerified:true,syntheticMediaFlagRequested:true,syntheticMediaFieldReturned:video.status.containsSyntheticMedia!==undefined,syntheticMediaFlagVerified:video.status.containsSyntheticMedia===true,verifiedAt:new Date().toISOString()};
  await writeFile(root+'/YOUTUBE_UPLOAD.json',JSON.stringify(report,null,2));reports.push(report);
 }
 await writeFile('.tmp/confirmed-three-youtube-20261023.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
