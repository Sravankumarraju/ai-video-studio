import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {sessionToken} from '../lib/security';
import assert from 'node:assert/strict';
async function main(){
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 const records=[];
 for(const n of [7,8,9,10]){
  const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`;
  const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
  const r=await fetch(`${origin}/api/projects/${config.projectId}`,{headers});assert(r.ok);const p=await r.json();
  assert.equal(p.document.budget,10);assert.equal(p.document.generationLimit,50);
  if(p.document.unknownCostPolicy!=='allow'){
   const original=JSON.stringify({...p.document,unknownCostPolicy:'allow'});
   const updated=await fetch(`${origin}/api/projects/${p.id}`,{method:'PATCH',headers,body:JSON.stringify({revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}})});assert(updated.ok,await updated.clone().text());
   const result=await updated.json();assert.equal(JSON.stringify(result.document),original);
  }
  records.push({episode:config.verseRef,projectId:p.id,budget:10,generationLimit:50,unknownCostPolicy:'allow',authorization:'Owner approved in chat; private upload requested',time:new Date().toISOString()});
 }
 await writeFile('data/productions/divine-wisdom/episodes-007-010-authorization.json',JSON.stringify(records,null,2));console.log(JSON.stringify({approvedProjects:records.length,budgetsAndCallLimitsPreserved:true}));
}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
