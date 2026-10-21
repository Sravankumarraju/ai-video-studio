import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ownerApi} from './youtube-owner';
const dir='data/productions/divine-wisdom/gita-1-1/chapter-name-v5';
async function main(){
 const state=JSON.parse(await readFile(`${dir}/production-state.json`,'utf8'));
 const verified=JSON.parse(await readFile(`${dir}/verification-full.json`,'utf8'));assert(verified.decodedEntireFile&&verified.onlyOpeningTitleChanged);
 const old=JSON.parse(await readFile('data/productions/divine-wisdom/youtube-private-batch.json','utf8')).videos.find((v:any)=>v.episode==='1.1');assert(old&&old.projectId===state.projectId&&old.thumbnailAssetId);
 const publishing=JSON.parse(await readFile(`${dir}/publishing-package.json`,'utf8'));
 const before=JSON.parse(await readFile('data/productions/divine-wisdom/gita-1-1/refined-v4/publishing-package.json','utf8'));
 const description=old.metadata.description.replace(before.chapters,publishing.chapters).replace('భగవద్గీత 1.1 · Episode 001','భగవద్గీత అధ్యాయం 1 · శ్లోకం 1 · Episode 001\nఅర్జున విషాద యోగం');
 const metadata={...old.metadata,title:'భగవద్గీత అధ్యాయం 1 శ్లోకం 1 | అర్జున విషాద యోగం | Divine Wisdom Telugu',description,privacyStatus:'private',containsSyntheticMedia:true};assert(Buffer.byteLength(description)<=5000);assert([...metadata.title].length<=100);
 const status=await ownerApi('status');assert(status.connected&&status.channelId==='UCZCidygC9i89ye1PEI_nh2Q');
 const entry={episode:'1.1 corrected chapter name',projectId:state.projectId,renderJobId:state.renderJobs.full,thumbnailAssetId:old.thumbnailAssetId,metadata};
 await writeFile(`${dir}/youtube-metadata.json`,JSON.stringify(metadata,null,2));
 await writeFile(`${dir}/youtube-private-batch.json`,JSON.stringify({privacy:'private',selection:'Corrected individual Episode001 only; keep earlier upload',videos:[entry]},null,2));
 const existing=(await ownerApi('uploads')).find((u:any)=>u.renderJobId===entry.renderJobId);
 const u=existing||await ownerApi('uploads',{renderJobId:entry.renderJobId,thumbnailAssetId:entry.thumbnailAssetId,expectedChannelId:status.channelId,metadata});
 await writeFile(`${dir}/youtube-upload-progress.json`,JSON.stringify(u,null,2));console.log(JSON.stringify({id:u.id,state:u.state,stage:u.stage,videoId:u.videoId,error:u.error}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
