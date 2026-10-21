import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 const dir=process.argv[2];assert(dir);const approved=process.argv.includes('--approved');
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const plan=JSON.parse(await readFile(`${dir}/narration-plan.json`,'utf8'));
 const series=JSON.parse(await readFile('data/productions/divine-wisdom/GITA-FULL-CHAPTER-SERIES.json','utf8'));
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 async function api(path:string,method='GET',body?:unknown){const r=await fetch(origin+'/api/'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});assert(r.ok,`Owner setup failed (${r.status})`);return r.json();}
 await api(`projects/${config.projectId}/series`,'POST',{seriesId:series.seriesId});
 if(approved){
  const approvedPlans:Record<number,{calls:number,characters:number}>={3:{calls:23,characters:20383},4:{calls:25,characters:22486},5:{calls:19,characters:17418},6:{calls:27,characters:23207}};const counted=approvedPlans[config.chapterNumber];assert(counted,'No counted approval plan for this chapter');assert.equal(plan.calls,counted.calls);assert.equal(plan.characters,counted.characters);
  const p=await api(`projects/${config.projectId}`);assert.equal(p.document.generationLimit,50);assert.equal(p.document.budget,10);
  if(p.document.unknownCostPolicy!=='allow')await api(`projects/${p.id}`,'PATCH',{revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}});
  config.authorizedNarrationCalls=counted.calls;await writeFile(`${dir}/episode.json`,JSON.stringify(config,null,2));
  await writeFile(`${dir}/authorization.json`,JSON.stringify({chapter:config.chapterNumber,projectId:config.projectId,calls:counted.calls,characters:counted.characters,unknownCostPolicy:'allow',voiceId:config.voiceId,authorization:`User approved counted Chapter ${config.chapterNumber} narration calls in this chat`,authorizedAt:new Date().toISOString()},null,2));
 }
 console.log(JSON.stringify({chapter:config.chapterNumber,grouped:true,narrationAuthorized:approved}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
