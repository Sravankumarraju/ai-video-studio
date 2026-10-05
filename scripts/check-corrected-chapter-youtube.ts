import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {ownerApi} from './youtube-owner';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
const root='data/productions/divine-wisdom/gita-chapter-1/audio-corrected-v5';
async function main(){
 const uploads=await ownerApi('uploads');const u=uploads.find((x:any)=>x.renderJobId==='383c72a6-2227-4897-aa51-0243aa029ec1');assert(u);
 await writeFile(`${root}/youtube-upload-progress.json`,JSON.stringify(u,null,2));
 console.log(JSON.stringify({id:u.id,state:u.state,stage:u.stage,videoId:u.videoId,thumbnailApplied:u.thumbnailApplied,bytesUploaded:u.bytesUploaded,totalBytes:u.totalBytes,error:u.error}));
 if(process.argv[2]==='playlists'){
  const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&mine=true&maxResults=50',{},u.channelId);assert(r.ok,`Playlist read failed ${r.status}`);
  const data=await r.json();console.log(JSON.stringify(data.items.map((p:any)=>({id:p.id,title:p.snippet.title,privacyStatus:p.status.privacyStatus}))));
 }
 if(u.videoId){
  const r=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${u.videoId}`,{},u.channelId);assert(r.ok,`Video verification failed ${r.status}`);
  const v=(await r.json()).items?.[0];assert(v&&v.snippet.channelId===u.channelId&&v.status.privacyStatus==='private');
  const manifest=JSON.parse(await readFile(`${root}/youtube-private-batch.json`,'utf8'));
  assert.equal(v.snippet.title,manifest.videos[0].metadata.title);
  assert.equal(v.snippet.description,manifest.videos[0].metadata.description);
  assert.deepEqual([...v.snippet.tags].sort(),[...manifest.videos[0].metadata.tags].sort());
  const report={...u,verifiedAt:new Date().toISOString(),metadataVerified:true,syntheticMediaFlagVerified:v.status.containsSyntheticMedia===true,aiDisclosureInDescription:v.snippet.description.includes('AI disclosure:'),processingStatus:v.processingDetails?.processingStatus,privacyStatus:v.status.privacyStatus,url:`https://www.youtube.com/watch?v=${u.videoId}`};
  await writeFile(`${root}/YOUTUBE_UPLOAD.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({url:report.url,processingStatus:report.processingStatus,privacyStatus:report.privacyStatus}));
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
