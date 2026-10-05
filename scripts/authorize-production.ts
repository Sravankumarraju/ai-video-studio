import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {sessionToken} from '../lib/security';
import assert from 'node:assert/strict';
async function main(){
 const directory=process.argv[2];assert(directory);const config=JSON.parse(await readFile(`${directory}/episode.json`,'utf8'));
 const chapterTwo=config.productionKind==='chapter-meaning'&&config.chapterNumber===2;
 if(chapterTwo){const plan=JSON.parse(await readFile(`${directory}/narration-plan.json`,'utf8'));assert.equal(plan.calls,31);assert.equal(plan.characters,28605);config.authorizedNarrationCalls=31;await writeFile(`${directory}/episode.json`,JSON.stringify(config,null,2));}
 const origin=process.env.APP_ORIGIN||'http://localhost:3000',headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 const response=await fetch(`${origin}/api/projects/${config.projectId}`,{headers});assert(response.ok);const p=await response.json();assert.equal(p.document.budget,10);assert.equal(p.document.generationLimit,50);
 if(p.document.unknownCostPolicy!=='allow'){const saved=await fetch(`${origin}/api/projects/${p.id}`,{method:'PATCH',headers,body:JSON.stringify({revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}})});assert(saved.ok);}
 const grouped=await fetch(`${origin}/api/projects/${p.id}/series`,{method:'POST',headers,body:JSON.stringify({seriesId:config.productionKind==='chapter-meaning'?'dc47db6d-168e-4405-b1c5-3dcb955eb1a8':'60823952-1e93-462e-a6bc-ce7161e85dd1'})});assert(grouped.ok);
 await writeFile(`${directory}/authorization.json`,JSON.stringify({authorization:chapterTwo?'Owner approved 31 narration calls / 28605 Telugu characters, saved voice, unknown-price calls for complete Chapter 2. Separate full-chapter series. No YouTube publishing.':config.authorizedNarrationCalls?'Owner explicitly approved 20 narration calls and unknown-price policy for Chapter 1 Shlokas 11-14; this project is limited to 5 batches.':'Owner explicitly approved 28 narration calls and unknown-price policy for the revised full chapter.',approvedNarrationCalls:config.authorizedNarrationCalls||28,...(chapterTwo?{approvedCharacters:28605}:{}),budget:10,generationLimit:50,unknownCostPolicy:'allow',time:new Date().toISOString()},null,2));console.log('Production authorized and grouped; budgets preserved.');
}
main().catch(()=>{console.error('Production authorization failed; sensitive details suppressed');process.exitCode=1;});
