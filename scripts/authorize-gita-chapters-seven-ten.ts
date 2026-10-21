import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {db} from '../lib/db';
import {providerSchema} from '../lib/schema';
import {sessionToken} from '../lib/security';
async function main(){
 const root='data/productions/divine-wisdom';
 const progress=JSON.parse(await readFile(`${root}/CHAPTERS-7-10-PROGRESS.json`,'utf8'));
 assert.equal(progress.plannedCalls,72);assert.equal(progress.plannedCharacters,63881);
 const expected:Record<number,[number,number]>={7:[19,17181],8:[15,13396],9:[18,15615],10:[20,17689]};
 const prepared=[];
 for(const c of progress.chapters){const config=JSON.parse(await readFile(`${c.dir}/episode.json`,'utf8'));const state=JSON.parse(await readFile(`${c.dir}/state.json`,'utf8'));assert.deepEqual([state.batches.length,state.batches.reduce((s:number,b:any)=>s+b.text.length,0)],expected[c.chapter]);assert(state.batches.every((b:any)=>b.text.length<=1000));prepared.push({c,config,state});}
 // Dedicated price estimate: do not attach a per-call estimate to an unrelated
 // shared profile whose requests may be longer. No credential leaves the store.
 const source=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});
 const original=providerSchema.parse(source.config);assert.equal(original.model,'eleven_v4');
 const name='ElevenLabs v4 · Chapters 7–10 · max 1000 chars';
 let profile=(await db.providerProfile.findMany()).find(p=>providerSchema.parse(p.config).name===name);
 if(!profile)profile=await db.providerProfile.create({data:{config:{...original,name,pricePerCall:.08},encryptedKey:source.encryptedKey}});
 const bounded=providerSchema.parse(profile.config);assert.equal(bounded.pricePerCall,.08);assert.equal(bounded.model,original.model);
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 async function api(path:string,method='GET',body?:unknown){const r=await fetch(origin+'/api/'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});assert(r.ok,`Owner setup failed ${r.status}`);return r.json();}
 const series=JSON.parse(await readFile(`${root}/GITA-FULL-CHAPTER-SERIES.json`,'utf8'));
 for(const {c,config,state} of prepared){
  const p=await api(`projects/${config.projectId}`);assert.equal(p.document.budget,10);assert.equal(p.document.generationLimit,50);assert.equal(p.document.unknownCostPolicy,'block');
  for(const b of state.batches){const scene=p.document.scenes.find((s:any)=>s.id===b.id);assert.equal(scene.narration,b.text);scene.providers={...scene.providers,voice:profile.id};}
  await api(`projects/${p.id}`,'PATCH',{revision:p.revision,document:p.document});
  await api(`projects/${p.id}/series`,'POST',{seriesId:series.seriesId});
  config.voiceProfileId=profile.id;config.authorizedNarrationCalls=c.calls;
  const hash=createHash('sha256').update(state.batches.map((b:any)=>b.text).join('\n\n')).digest('hex');
  await writeFile(`${c.dir}/episode.json`,JSON.stringify(config,null,2));
  await writeFile(`${c.dir}/authorization.json`,JSON.stringify({authorization:'User explicitly replied Approved for 72 ElevenLabs narration requests / 63881 characters in this chat, 2026-10-08',chapter:c.chapter,calls:c.calls,characters:c.characters,sha256:hash,voiceId:config.voiceId,profileId:profile.id,maximumCharactersPerCall:1000,conservativeCostPerCall:.08,publishedRegularPricePer1000Characters:.08,publishedPromotionalPricePer1000Characters:.022,priceSource:'https://elevenlabs.io/pricing/api',unknownCostPolicy:'block',budget:10,generationLimit:50,authorizedAt:new Date().toISOString()},null,2));
  const plan=JSON.parse(await readFile(`${c.dir}/narration-plan.json`,'utf8'));plan.status='approved';await writeFile(`${c.dir}/narration-plan.json`,JSON.stringify(plan,null,2));c.status='narration approved; production pending';
 }
 progress.status='narration approved; media production in progress';progress.providerPriceKnown=true;progress.voiceProfileId=profile.id;progress.conservativeReservedCost=5.76;progress.publishedPromotionalEstimate=1.405382;progress.updatedAt=new Date().toISOString();
 await writeFile(`${root}/CHAPTERS-7-10-PROGRESS.json`,JSON.stringify(progress,null,2));
 console.log(JSON.stringify({authorized:true,calls:72,characters:63881,profileId:profile.id,unknownCostPolicy:'block',conservativeReservedCost:5.76}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
