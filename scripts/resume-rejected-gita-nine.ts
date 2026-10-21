import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {sessionToken} from '../lib/security';
async function main(){
 const state=JSON.parse(await readFile('data/productions/divine-wisdom/gita-chapter-9/story-v1/state.json','utf8'));
 const id=state.jobs[state.batches[16].id],job=await db.job.findUniqueOrThrow({where:{id}});
 if(['queued','running','completed'].includes(job.state)){console.log(JSON.stringify({id,state:job.state,newJobCreated:false}));return;}
 assert(job.state==='failed'&&!job.submittedAt&&!job.providerJobId&&!job.result&&job.error?.includes('HTTP 429'),'Only definitely rejected, uncharged requests may resume');
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const response=await fetch(`${origin}/api/jobs/${id}/retry`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`studio_session=${sessionToken()}`},body:JSON.stringify({acknowledgeNewCharge:false})});assert(response.ok,`Resume HTTP ${response.status}`);
 console.log(JSON.stringify({id,resumed:true,newJobCreated:false,extraPaidCallAuthorized:false}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
