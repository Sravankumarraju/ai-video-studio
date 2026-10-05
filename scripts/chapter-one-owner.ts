import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 const dir='data/productions/divine-wisdom/gita-chapter-1/meaning-v1';
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 const r=await fetch(`${origin}/api/projects/${config.projectId}`,{headers});assert(r.ok);const p=await r.json();
 assert.equal(p.document.budget,10);assert.equal(p.document.generationLimit,50);
 if(p.document.unknownCostPolicy!=='allow'){
  const updated=await fetch(`${origin}/api/projects/${p.id}`,{method:'PATCH',headers,body:JSON.stringify({revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}})});assert(updated.ok);const result=await updated.json();assert.deepEqual(result.document,{...p.document,unknownCostPolicy:'allow'});
 }
 const grouped=await fetch(`${origin}/api/projects/${p.id}/series`,{method:'POST',headers,body:JSON.stringify({seriesId:'60823952-1e93-462e-a6bc-ce7161e85dd1'})});assert(grouped.ok);
 await writeFile(`${dir}/authorization.json`,JSON.stringify({projectId:p.id,authorization:'Owner requested complete chapter video and selected meaning-only format; use standing authorized voice/provider and established unknown-price policy within unchanged $10 / 50 call limits.',budget:10,generationLimit:50,unknownCostPolicy:'allow',time:new Date().toISOString()},null,2));
 console.log(JSON.stringify({grouped:true,budget:10,generationLimit:50,narrationBatches:30}));
}
main().catch(()=>{console.error('Chapter owner setup failed; sensitive details suppressed');process.exitCode=1;});
