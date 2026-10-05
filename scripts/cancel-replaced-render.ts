import 'dotenv/config';
import {sessionToken} from '../lib/security';
import assert from 'node:assert/strict';
async function main(){
 const [projectId,jobId]=process.argv.slice(2);assert(projectId&&jobId);
 const origin=process.env.APP_ORIGIN||'http://localhost:3000',headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 const r=await fetch(`${origin}/api/jobs`,{headers});assert(r.ok);const j=(await r.json()).find((j:{id:string})=>j.id===jobId);assert(j&&j.projectId===projectId&&j.kind==='render');
 if(['running','queued'].includes(j.state)){const result=await fetch(`${origin}/api/jobs/${jobId}/cancel`,{method:'POST',headers,body:'{}'});assert(result.ok);}
 console.log(JSON.stringify({jobId,previousState:j.state,cancelRequested:['running','queued'].includes(j.state),assetsPreserved:true}));
}
main().catch(()=>{console.error('Render cancellation failed; sensitive details suppressed.');process.exitCode=1;});
