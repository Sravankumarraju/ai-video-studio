import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 const plan=JSON.parse(await readFile('data/productions/divine-wisdom/question-shorts-week-01/NARRATION-PLAN.json','utf8'));
 assert(plan.paidNarrationAuthorized&&plan.plannedCalls===5&&plan.characters===2980);
 const origin='http://localhost:3000';
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 for(const s of plan.shorts){
  const p=await fetch(`${origin}/api/projects/${s.projectId}`,{headers}).then(r=>{assert(r.ok);return r.json();});
  assert.equal(p.document.generationLimit,1);
  if(p.document.unknownCostPolicy==='allow')continue;
  const r=await fetch(`${origin}/api/projects/${s.projectId}`,{method:'PATCH',headers,body:JSON.stringify({revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}})});assert(r.ok);
 }
 console.log('Five approved Shorts projects authorized; no paid jobs queued by this step.');
}
main().catch(()=>{console.error('Shorts authorization failed; private details suppressed.');process.exitCode=1;});
