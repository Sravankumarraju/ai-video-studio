import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
const root='data/productions/divine-wisdom';
const handoff=JSON.parse(await readFile(`${root}/gita-021-030-handoff.json`,'utf8'));
const plan=JSON.parse(await readFile(`${root}/NARRATION-021-030-PLAN.json`,'utf8'));
assert(handoff.productionPreapproved&&handoff.youtubePrivacy==='private');
assert.deepEqual(plan.episodes.map((e:any)=>e.shloka),[21,22,23,24,25,26,27,28,29,30]);
assert.equal(plan.calls,48);assert.equal(plan.characters,26793);
const origin=process.env.APP_ORIGIN||'http://localhost:3000';
const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
async function api(route:string,method='GET',body?:unknown){const r=await fetch(`${origin}/api/${route}`,{method,headers,...(body?{body:JSON.stringify(body)}:{})});assert(r.ok,`Owner setup failed (${r.status})`);return r.json();}
for(const e of plan.episodes){
 const config=JSON.parse(await readFile(`${e.dir}/episode.json`,'utf8'));
 assert.equal(config.projectId,e.projectId);assert.equal(config.authorizedNarrationCalls,e.calls);
 const p=await api(`projects/${e.projectId}`);assert.equal(p.document.budget,10);assert.equal(p.document.generationLimit,50);
 if(p.document.unknownCostPolicy!=='allow')await api(`projects/${e.projectId}`,'PATCH',{revision:p.revision,document:{...p.document,unknownCostPolicy:'allow'}});
 await api(`projects/${e.projectId}/series`,'POST',{seriesId:'60823952-1e93-462e-a6bc-ce7161e85dd1'});
 await writeFile(`${e.dir}/authorization.json`,JSON.stringify({authorization:handoff.userAuthorization,calls:e.calls,characters:e.characters,voiceId:config.voiceId,unknownCostPolicy:'allow',youtubePrivacy:'private',manualPublicRelease:true,authorizedAt:new Date().toISOString()},null,2));
}
console.log(JSON.stringify({episodes:10,calls:plan.calls,characters:plan.characters,authorized:true,uploadsQueued:0}));
}
main().catch(()=>{console.error('Episode authorization failed; private details suppressed.');process.exitCode=1;});
