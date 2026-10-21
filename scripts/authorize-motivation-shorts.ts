import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 const plan=JSON.parse(await readFile('data/productions/divine-wisdom/motivation-shorts-40/NARRATION-PLAN.json','utf8'));
 assert(plan.paidNarrationAuthorized&&plan.plannedCalls===40&&plan.characters===17313&&plan.uploadHold);
 const origin='http://localhost:3000',headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 for(const s of plan.shorts){const p=await fetch(`${origin}/api/projects/${s.projectId}`,{headers}).then(r=>{assert(r.ok);return r.json();});assert.equal(p.document.generationLimit,1);if(p.document.unknownCostPolicy==='allow')continue;
 const r=await fetch(`${origin}/api/projects/${s.projectId}`,{method:'PATCH',headers,body:JSON.stringify({revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}})});assert(r.ok);}
 console.log('Forty preapproved projects authorized; no jobs queued by this helper.');
}main().catch(()=>{console.error('Authorization failed; private details suppressed.');process.exitCode=1;});
