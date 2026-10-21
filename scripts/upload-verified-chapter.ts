import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ownerApi} from './youtube-owner';

async function main(){
  const dir=process.argv[2];assert(dir,'Provide the verified production directory');
  const read=async(name:string)=>JSON.parse(await readFile(`${dir}/${name}`,'utf8'));
  const final=await read('FINAL_DELIVERY.json'),verified=await read('verification-full.json'),browser=await read('browser-full-verification.json');
  assert(final.status==='final'&&verified.decodedEntireFile&&verified.allVerseMeaningsCovered);
  assert(browser.samples.length===3&&browser.samples.every((s:any)=>!s.error&&!s.paused));
  const manifest=await read('youtube-private-batch.json'),entry=manifest.videos[0];
  assert(manifest.videos.length===1&&entry.renderJobId===final.renderJobId);
  assert.equal(manifest.privacy,'private');assert(!entry.metadata.publishAt);entry.metadata={...entry.metadata,privacyStatus:'private',containsSyntheticMedia:true};
  const status=await ownerApi('status');
  assert(status.connected&&status.channelId==='UCZCidygC9i89ye1PEI_nh2Q','Expected Divine Wisdom Telugu channel');
  const existing=(await ownerApi('uploads')).find((u:any)=>u.renderJobId===entry.renderJobId);
  const upload=existing||await ownerApi('uploads',{renderJobId:entry.renderJobId,thumbnailAssetId:entry.thumbnailAssetId,expectedChannelId:status.channelId,metadata:entry.metadata});
  await writeFile(`${dir}/youtube-upload-progress.json`,JSON.stringify(upload,null,2));
  await writeFile(`${dir}/youtube-upload-authorization.json`,JSON.stringify({privacy:'private',authorizedBy:'User: upload to youtube',renderJobId:entry.renderJobId,recordedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({id:upload.id,state:upload.state,stage:upload.stage,videoId:upload.videoId,error:upload.error}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
