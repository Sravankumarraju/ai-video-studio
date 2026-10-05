import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {sessionToken} from '../lib/security';
import assert from 'node:assert/strict';
async function main(){
 const state=JSON.parse(await readFile('data/productions/divine-wisdom/gita-1-16/devotional-v1/state.json','utf8'));
 const id=Object.values(state.jobs)[0] as string;assert(id);
 const j=await db.job.findUniqueOrThrow({where:{id},select:{state:true,submittedAt:true,providerJobId:true,result:true,error:true}});
 if(j.state==='completed'){console.log(JSON.stringify({id,alreadyCompleted:true}));return;}
 if(j.state==='running'||j.state==='queued'){console.log(JSON.stringify({id,state:j.state,alreadyResuming:true}));return;}
 assert(j.state==='failed'&&!j.submittedAt&&!j.providerJobId&&!j.result&&j.error?.includes('429'),'Only definitively rejected, uncharged voice jobs can resume');
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const r=await fetch(`${origin}/api/jobs/${id}/retry`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:`studio_session=${sessionToken()}`},body:'{}'});assert(r.ok);console.log(JSON.stringify({id,resumed:true,newJobCreated:false}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
