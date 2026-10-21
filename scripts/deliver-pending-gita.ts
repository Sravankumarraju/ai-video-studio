import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {ownerApi} from './youtube-owner';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
const root='data/productions/divine-wisdom';
const read=async(p:string)=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
async function main(){
 const mode=process.argv[2]||'status';assert(['queue','status'].includes(mode));
 const manifest=await read(`${root}/youtube-private-015-020-batch.json`);
 assert.equal(manifest.privacy,'private');assert.equal(manifest.videos.length,6);
 const channel=await ownerApi('status');assert(channel.connected&&channel.channelId==='UCZCidygC9i89ye1PEI_nh2Q');
 const uploads=await ownerApi('uploads'),report:any[]=[];
 // Validate the complete batch before queueing any uploads.
 for(let i=0;i<6;i++){
  const n=i+15,entry=manifest.videos[i],dir=`${root}/gita-1-${n}/devotional-v1`;
  const final=await read(`${dir}/FINAL_DELIVERY.json`),verified=await read(`${dir}/verification-full.json`),browser=await read(`${dir}/browser-full-verification.json`),metadata=await read(`${dir}/youtube-metadata.json`);
  assert.equal(entry.episode,`1.${n}`);assert.equal(entry.renderJobId,final.renderJobId);assert.equal(entry.projectId,final.projectId);
  assert(final.status==='final'&&verified.decodedEntireFile&&verified.allScenesNarrated&&verified.seconds<=300&&verified.width===1920);
  assert(browser.renderJobId===entry.renderJobId&&browser.samples.length===3&&browser.samples.every((s:any)=>!s.error&&!s.paused&&s.currentTime>s.requested));
  assert((await stat(`${dir}/${final.mp4}`)).size>1000000);assert((await stat(`${dir}/thumbnail-upload.jpg`)).size<2*1024*1024);
  for(const key of ['title','description','tags'])assert.deepEqual(entry.metadata[key],metadata[key]);
  assert(metadata.description.includes('AI disclosure:')&&Buffer.byteLength(metadata.description)<=5000&&[...metadata.title].length<=100);
 }
 for(let i=0;i<6;i++){
  const n=i+15,entry=manifest.videos[i],dir=`${root}/gita-1-${n}/devotional-v1`;
  let upload=uploads.find((u:any)=>u.renderJobId===entry.renderJobId);
  if(!upload&&mode==='queue'){
   upload=await ownerApi('uploads',{renderJobId:entry.renderJobId,thumbnailAssetId:entry.thumbnailAssetId,expectedChannelId:channel.channelId,metadata:{...entry.metadata,privacyStatus:'private',containsSyntheticMedia:true}});
   await writeFile(`${dir}/youtube-upload-authorization.json`,JSON.stringify({authorizedBy:'User: upload pending items',privacy:'private',uploadId:upload.id,renderJobId:entry.renderJobId,recordedAt:new Date().toISOString()},null,2));
  }
  if(!upload){report.push({episode:entry.episode,state:'not queued'});continue;}
  await writeFile(`${dir}/youtube-upload-progress.json`,JSON.stringify(upload,null,2));
  const summary:any={episode:entry.episode,id:upload.id,state:upload.state,stage:upload.stage,videoId:upload.videoId,error:upload.error};
  if(upload.videoId&&upload.thumbnailApplied){
   const r=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${upload.videoId}`,{},channel.channelId);assert(r.ok,`Verification HTTP ${r.status}`);
   const video=(await r.json()).items?.[0];assert(video&&video.snippet.channelId===channel.channelId);assert.equal(video.status.privacyStatus,'private');
   assert.equal(video.snippet.title,entry.metadata.title);assert.equal(video.snippet.description,entry.metadata.description);assert.deepEqual([...video.snippet.tags].sort(),[...entry.metadata.tags].sort());
   const delivery={...summary,url:`https://www.youtube.com/watch?v=${upload.videoId}`,processingStatus:video.processingDetails?.processingStatus,privacyStatus:'private',thumbnailApplied:true,metadataVerified:true,aiDisclosureInDescription:true,syntheticMediaFlagRequested:true,syntheticMediaFlagRemoteFieldAvailable:Object.hasOwn(video.status,'containsSyntheticMedia'),syntheticMediaFlagVerified:video.status.containsSyntheticMedia===true,verifiedAt:new Date().toISOString()};
   await writeFile(`${dir}/YOUTUBE_UPLOAD.json`,JSON.stringify(delivery,null,2));Object.assign(summary,{url:delivery.url,processing:delivery.processingStatus,verified:delivery.state==='completed'&&delivery.processingStatus==='succeeded'});
   if(summary.verified){const final=await read(`${dir}/FINAL_DELIVERY.json`);final.youtubeUpload=delivery;await writeFile(`${dir}/FINAL_DELIVERY.json`,JSON.stringify(final,null,2));}
  }
  report.push(summary);console.log(JSON.stringify(summary));
 }
 await writeFile(`${root}/PENDING_GITA_YOUTUBE_DELIVERY.json`,JSON.stringify({checkedAt:new Date().toISOString(),privacy:'private',allVerified:report.length===6&&report.every(r=>r.verified),videos:report},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
