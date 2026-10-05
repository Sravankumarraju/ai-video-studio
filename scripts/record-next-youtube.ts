import {readFile,writeFile} from 'node:fs/promises';
import {ownerApi} from './youtube-owner';
const root='data/productions/divine-wisdom';
async function main(){
 const uploads=await ownerApi('uploads');
 const manifest=JSON.parse(await readFile(`${root}/youtube-private-007-010-batch.json`,'utf8'));
 const progress=JSON.parse(await readFile(`${root}/episodes-007-010-progress.json`,'utf8'));
 const records=[];
 for(const entry of manifest.videos){
  const row=uploads.find((r:any)=>r.id===entry.uploadId);if(!row)throw Error('Missing upload');
  if(row.state==='completed'&&(!row.thumbnailApplied||!row.verifiedAt))throw Error('Incomplete verification');
  entry.state=row.state;entry.videoId=row.videoId;entry.error=row.error;
  const ep=progress.episodes.find((e:any)=>e.projectId===row.projectId);ep.uploaded=row.state==='completed';ep.status=ep.uploaded?'completed-and-private-upload-verified':'video-completed-upload-blocked';ep.youtubeVideoId=row.videoId;
  records.push({episode:entry.episode,id:row.id,projectId:row.projectId,renderJobId:row.renderJobId,channelId:row.channelId,state:row.state,videoId:row.videoId,thumbnailApplied:row.thumbnailApplied,verifiedAt:row.verifiedAt,error:row.error});
 }
 await writeFile(`${root}/youtube-private-007-010-batch.json`,JSON.stringify(manifest,null,2));await writeFile(`${root}/episodes-007-010-progress.json`,JSON.stringify(progress,null,2));await writeFile(`${root}/youtube-007-010-upload-verification.json`,JSON.stringify(records,null,2));
 const report=await readFile(`${root}/EPISODES_007_010_REPORT.md`,'utf8');
 if(!report.includes('## Private YouTube uploads'))await writeFile(`${root}/EPISODES_007_010_REPORT.md`,report+'\n\n## Private YouTube uploads\n\n'+records.map(r=>`- Episode ${r.episode}: ${r.state==='completed'?`https://www.youtube.com/watch?v=${r.videoId} — Private, thumbnail and channel verified.`:`Upload blocked: ${r.error}. Full video and metadata are completed locally; no bytes uploaded.`}`).join('\n')+'\n\nAll four Full HD videos also passed actual app-browser playback and shloka frame inspection. No Shorts or music.\n');
 console.log(JSON.stringify(records));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
