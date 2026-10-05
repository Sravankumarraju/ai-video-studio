import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 const plan=JSON.parse(await readFile('data/productions/divine-wisdom/NARRATION-015-020-PLAN.json','utf8'));assert.equal(plan.calls,30);assert.equal(plan.characters,18049);
 const origin=process.env.APP_ORIGIN||'http://localhost:3000',headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 for(const e of plan.episodes){
  assert.equal(e.calls,5);const r=await fetch(`${origin}/api/projects/${e.projectId}`,{headers});assert(r.ok);const p=await r.json();assert.equal(p.document.budget,10);assert.equal(p.document.generationLimit,50);
  if(p.document.unknownCostPolicy!=='allow'){const u=await fetch(`${origin}/api/projects/${p.id}`,{method:'PATCH',headers,body:JSON.stringify({revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}})});assert(u.ok);}
  const grouped=await fetch(`${origin}/api/projects/${p.id}/series`,{method:'POST',headers,body:JSON.stringify({seriesId:'60823952-1e93-462e-a6bc-ce7161e85dd1'})});assert(grouped.ok);
  const config=JSON.parse(await readFile(`${e.dir}/episode.json`,'utf8'));config.authorizedNarrationCalls=5;await writeFile(`${e.dir}/episode.json`,JSON.stringify(config,null,2));
  await writeFile(`${e.dir}/authorization.json`,JSON.stringify({authorization:'Owner approved 30 calls / 18049 characters for Chapter 1 Shlokas 15–20; five calls per project, saved voice, unknown prices allowed. No YouTube publishing.',approvedNarrationCalls:5,approvedCharacters:e.characters,budget:10,generationLimit:50,unknownCostPolicy:'allow',time:new Date().toISOString()},null,2));
 }plan.status='owner approved 30 narration calls; not yet generated';await writeFile('data/productions/divine-wisdom/NARRATION-015-020-PLAN.json',JSON.stringify(plan,null,2));console.log('Six Gita projects authorized and grouped; no paid calls executed.');
}
main().catch(()=>{console.error('Authorization failed; sensitive details suppressed.');process.exitCode=1;});
