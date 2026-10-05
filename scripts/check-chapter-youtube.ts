import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {ownerApi} from './youtube-owner';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';

const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-2/story-v1';
async function main(){
 const manifest=JSON.parse(await readFile(`${dir}/youtube-private-batch.json`,'utf8')),entry=manifest.videos[0],localMetadata=JSON.parse(await readFile(`${dir}/youtube-metadata.json`,'utf8'));
 const status=await ownerApi('status');
 assert(status.connected&&/divine\s*wisdom/i.test(status.channelTitle||''));
 const upload=(await ownerApi('uploads')).find((item:any)=>item.renderJobId===entry.renderJobId);assert(upload);
 await writeFile(`${dir}/youtube-upload-progress.json`,JSON.stringify(upload,null,2));
 const summary={id:upload.id,state:upload.state,stage:upload.stage,videoId:upload.videoId,thumbnailApplied:upload.thumbnailApplied,bytesUploaded:upload.bytesUploaded,totalBytes:upload.totalBytes,error:upload.error};
 if(!upload.videoId){console.log(JSON.stringify(summary));return;}
 const response=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${upload.videoId}`,{},upload.channelId);assert(response.ok,`YouTube verification failed (${response.status})`);
 const video=(await response.json()).items?.[0];assert(video&&video.snippet.channelId===upload.channelId);
 assert.equal(video.status.privacyStatus,'private');assert.equal(video.snippet.title,entry.metadata.title);assert.equal(video.snippet.description,entry.metadata.description);
 assert.deepEqual([...video.snippet.tags].sort(),[...entry.metadata.tags].sort());assert.equal(localMetadata.containsSyntheticMedia,true);assert.equal(upload.thumbnailApplied,true);
 const syntheticMediaFlagRemoteFieldAvailable=Object.hasOwn(video.status,'containsSyntheticMedia'),syntheticMediaFlagVerified=video.status.containsSyntheticMedia===true;
 const report={...upload,verifiedAt:new Date().toISOString(),metadataVerified:true,syntheticMediaFlagRequested:true,syntheticMediaFlagRemoteFieldAvailable,syntheticMediaFlagVerified,aiDisclosureInDescription:video.snippet.description.includes('AI disclosure:'),processingStatus:video.processingDetails?.processingStatus,privacyStatus:video.status.privacyStatus,url:`https://www.youtube.com/watch?v=${upload.videoId}`};
 await writeFile(`${dir}/YOUTUBE_UPLOAD.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({url:report.url,processingStatus:report.processingStatus,privacyStatus:report.privacyStatus,thumbnailApplied:report.thumbnailApplied,metadataVerified:true}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>db.$disconnect());
