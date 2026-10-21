import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
import {providerSchema} from '../lib/schema';
async function main(){
 const dir='data/productions/divine-wisdom/gita-chapter-9/story-v1';
 const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const profile=await db.providerProfile.findUniqueOrThrow({where:{id:config.voiceProfileId}});
 const pc=providerSchema.parse(profile.config);
 const job=await db.job.findUniqueOrThrow({where:{id:state.jobs[state.batches[14].id]}});
 const after=Math.floor(new Date(job.submittedAt||job.createdAt).getTime()/1000)-120;
 const url=new URL('/v1/history',pc.baseUrl);url.searchParams.set('date_after_unix',String(after));url.searchParams.set('page_size','100');
 const response=await fetch(url,{headers:{'xi-api-key':decrypt(profile.encryptedKey)},signal:AbortSignal.timeout(30000)});
 const result=await response.json();
 const latest=(result.history||[]).find((h:any)=>h.history_item_id==='SblSGfeRzbu5656mdI6Y');
 if(latest){
  const detail=await fetch(new URL(`/v1/history/${latest.history_item_id}`,pc.baseUrl),{headers:{'xi-api-key':decrypt(profile.encryptedKey)},signal:AbortSignal.timeout(30000)}).then(r=>r.json());
  await writeFile(`${dir}/interrupted-narration-history.json`,JSON.stringify(detail,null,2));
  console.log(JSON.stringify({historyItemId:detail.history_item_id,historyDetailKeys:Object.keys(detail),dialogueTextMatches:detail.dialogue?.[0]?.text===state.batches[14].text,recordingSaved:true}));
 }
 const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
 const matches=(result.history||[]).filter((h:any)=>normalize(h.text||'')===normalize(state.batches[14].text));
 const report={jobId:job.id,state:job.state,httpStatus:response.status,historyItems:(result.history||[]).length,hasMore:result.has_more,items:(result.history||[]).map((h:any)=>({id:h.history_item_id,date:h.date_unix,model:h.model_id,textLength:(h.text||'').length,textPrefix:(h.text||'').slice(0,100),containsExpected:(h.text||'').includes(state.batches[14].text.slice(0,60))})),matches:matches.map((h:any)=>({id:h.history_item_id,requestId:h.request_id,model:h.model_id,voice:h.voice_id,date:h.date_unix,characterCountChangeFrom:h.character_count_change_from,characterCountChangeTo:h.character_count_change_to})),newPaidCallMade:false};
 await writeFile(`${dir}/narration-reconciliation.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
