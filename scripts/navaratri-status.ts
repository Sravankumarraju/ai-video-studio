import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
async function main(){
 const root='data/productions/divine-wisdom/devi-navaratri-2026';
 const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
 const projectIds=plan.videos.map((v:any)=>v.projectId);
 const jobs=await db.job.findMany({where:{projectId:{in:projectIds},kind:'render'},select:{id:true,state:true,stage:true,error:true}});
 const uploads=await db.youtubeUpload.findMany({where:{projectId:{in:projectIds}},select:{id:true,projectId:true,state:true,stage:true,error:true,videoId:true,thumbnailApplied:true,bytesUploaded:true,totalBytes:true}});
 const videos=[];
 for(const video of plan.videos){
  const state=JSON.parse(await readFile(video.dir+'/state.json','utf8'));
  videos.push({slug:video.slug,seconds:state.seconds,draft:jobs.find(j=>j.id===state.renderJobs.draft),full:jobs.find(j=>j.id===state.renderJobs.full),upload:uploads.find(u=>u.projectId===video.projectId)});
 }
 const result={checkedAt:new Date().toISOString(),videos};
 if(process.argv[2]==='save')await writeFile(root+'/actual-status.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
