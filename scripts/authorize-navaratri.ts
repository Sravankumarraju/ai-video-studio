// Run only after the owner approves this new 40-call batch; never infer approval from Gita.
import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 assert.equal(process.argv[2],'--owner-approved-40','Record the owner’s new approval first');
 const root='data/productions/divine-wisdom/devi-navaratri-2026',plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
 assert.equal(plan.videos.length,10);assert.equal(plan.videos.reduce((n:number,v:{voiceCalls:number})=>n+v.voiceCalls,0),40);assert.equal(plan.videos.reduce((n:number,v:{characters:number})=>n+v.characters,0),28818);
 const origin=process.env.APP_ORIGIN||'http://localhost:3000',headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 for(const v of plan.videos){const c=JSON.parse(await readFile(v.dir+'/episode.json','utf8')),state=JSON.parse(await readFile(v.dir+'/state.json','utf8'));assert.equal(state.batches.length,4);assert.equal(state.batches.reduce((n:number,b:{text:string})=>n+b.text.length,0),v.characters);
 const r=await fetch(`${origin}/api/projects/${c.projectId}`,{headers});assert(r.ok);const p=await r.json();
 assert(p.document.budget<=10&&p.document.generationLimit<=50);
 const changed=await fetch(`${origin}/api/projects/${p.id}`,{method:'PATCH',headers,body:JSON.stringify({revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}})});assert(changed.ok);
 c.authorizedNarrationCalls=4;await writeFile(v.dir+'/episode.json',JSON.stringify(c,null,2));
 await writeFile(v.dir+'/authorization.json',JSON.stringify({scope:'Owner explicitly approved up to 40 narration calls / 28818 characters across these ten Navaratri projects; this project has four calls. Unknown pricing accepted only for this batch.',voiceId:c.voiceId,characters:v.characters,calls:4,budget:p.document.budget,generationLimit:p.document.generationLimit,approvedAt:new Date().toISOString()},null,2));
 }
 plan.narrationApproval='Owner approved 40 calls / 28818 characters for ten projects';await writeFile(root+'/production-plan.json',JSON.stringify(plan,null,2));console.log('New Navaratri approval recorded; budgets and generation limits preserved.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
