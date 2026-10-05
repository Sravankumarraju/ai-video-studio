import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 const folder='data/productions/divine-wisdom/gita-chapter-1/meaning-v1';
 const state=JSON.parse(await readFile(`${folder}/state.json`,'utf8'));
 const id=state.renderJobs.full;assert.equal(id,'847aa172-a4ba-4d83-b6fe-d2d0cc93a136');
 const origin=process.env.APP_ORIGIN||'http://localhost:3000',headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 const r=await fetch(`${origin}/api/jobs`,{headers});assert(r.ok);const jobs=await r.json(),job=jobs.find((j:{id:string})=>j.id===id);assert(job);assert.equal(job.kind,'render');assert.equal(job.projectId,state.projectId);
 if(['running','queued'].includes(job.state)){const cancelled=await fetch(`${origin}/api/jobs/${id}/cancel`,{method:'POST',headers,body:'{}'});assert(cancelled.ok);}
 state.supersededBy='gita-chapter-1-te-visual-v2';state.supersededRenderReason='User requested reusing more generated illustrations; retain old timeline and completed draft, render preferred Visual V2.';
 await writeFile(`${folder}/state.json`,JSON.stringify(state,null,2));console.log(JSON.stringify({jobId:id,cancelRequested:['running','queued'].includes(job.state),earlierDraftAndAssetsPreserved:true}));
}
main().catch(()=>{console.error('Superseded render cancellation failed; credentials suppressed');process.exitCode=1;});
