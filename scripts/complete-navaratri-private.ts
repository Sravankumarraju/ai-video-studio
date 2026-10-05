import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {db} from '../lib/db';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const pause=()=>new Promise(r=>setTimeout(r,15000));
async function main(){
 const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
 let previous=-1;
 for(;;){
  let verified=0;
  for(const video of plan.videos){
   const state=JSON.parse(await readFile(video.dir+'/state.json','utf8'));
   const job=state.renderJobs.full?await db.job.findUnique({where:{id:state.renderJobs.full},select:{state:true,error:true}}):null;
   if(job&&['failed','cancelled','stale'].includes(job.state))throw Error(video.slug+': '+(job.error||job.state));
   try{const check=JSON.parse(await readFile(video.dir+'/verification-full.json','utf8'));if(check.decodedEntireFile&&check.visualEdition===state.graceEdition)verified++;}catch(error:any){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  }
  if(verified!==previous){console.log(JSON.stringify({verified1080p:verified,total:10}));previous=verified;}
  if(verified===10)break;await pause();
 }
 execFileSync(process.execPath,['scripts/prepare-navaratri-uploads.mjs'],{stdio:'inherit',env:process.env});
 execFileSync(process.execPath,['--import','tsx','scripts/youtube-owner.ts','upload-manifest',root+'/youtube-private-batch.json'],{stdio:'inherit',env:process.env});
 const manifest=JSON.parse(await readFile(root+'/youtube-private-batch.json','utf8'));
 let last='';
 for(;;){
  const rows=await db.youtubeUpload.findMany({where:{id:{in:manifest.videos.map((v:any)=>v.uploadId)}},select:{id:true,state:true,stage:true,error:true,videoId:true,thumbnailApplied:true}});
  const summary=JSON.stringify(rows.map(r=>({id:r.id,state:r.state,stage:r.stage})));if(summary!==last){console.log(summary);last=summary;}
  const failed=rows.find(r=>['failed','cancelled'].includes(r.state));if(failed)throw Error(failed.error||failed.state);
  if(rows.length===10&&rows.every(r=>r.state==='completed'&&r.thumbnailApplied)){
   for(const video of manifest.videos){const row=rows.find(r=>r.id===video.uploadId)!;video.state=row.state;video.videoId=row.videoId;video.url='https://www.youtube.com/watch?v='+row.videoId;video.thumbnailApplied=true;}
   await writeFile(root+'/youtube-private-batch.json',JSON.stringify(manifest,null,2));
   execFileSync(process.execPath,['scripts/navaratri-delivery-report.mjs'],{stdio:'inherit',env:process.env});
   console.log('All ten private uploads and thumbnails verified; playlist membership still requires the signed-in Studio UI.');break;
  }
  await pause();
 }
}
main().catch(async e=>{await writeFile(root+'/delivery-error.txt',new Date().toISOString()+'\n'+e.message);console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
