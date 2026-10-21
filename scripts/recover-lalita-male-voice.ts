import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation/'+(process.argv.includes('priest-chant-full-v4')?'priest-chant-full-v4':process.argv.includes('vignanam-v3')?'vignanam-v3':'male-voice-v2');
async function main(){
 const plan=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));
 let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});key=decrypt(p.encryptedKey);}
 async function get(path:string){const r=await fetch('https://api.elevenlabs.io/v1/'+path,{headers:{'xi-api-key':key!},signal:AbortSignal.timeout(60000)});assert(r.ok,`History read HTTP ${r.status}`);return r;}
 for(const b of plan.batches){
  const stem=`batch-${String(b.index).padStart(2,'0')}`;let attempt:any;
  try{attempt=JSON.parse(await readFile(`${root}/${stem}-attempt.json`,'utf8'));}catch(e:any){if(e.code==='ENOENT')continue;throw e;}
  if(attempt.state!=='unknown')continue;
  const history=await (await get('history?page_size=100')).json();
  // Dialogue history may omit the top-level voice ID; verify it in detail.
  const candidates=history.history.filter((h:any)=>h.date_unix>=Date.parse(attempt.submittedAt)/1000-120);
  console.log(JSON.stringify({batch:b.index,candidates:candidates.length}));
  let detail:any;
  for(const h of candidates){const d=await (await get(`history/${h.history_item_id}`)).json();const input=d.dialogue?.[0];console.log(JSON.stringify({historyKeys:Object.keys(d),model:d.model_id,dialogueCount:d.dialogue?.length,characters:(input?.text||d.text||'').length,exactText:input?.text===b.text||d.text===b.text}));if(d.model_id===plan.model&&((input?.text===b.text&&input.voice_id===plan.voiceId)||(d.text===b.text&&d.voice_id===plan.voiceId))){assert(!detail,'Multiple matching recordings; inspect before choosing');detail=d;}}
  assert(detail,'No matching saved recording found; unknown attempt retained');
  const alignment=detail.alignments?.alignment||detail.alignment;assert(alignment?.characters?.join('')===b.text,'Saved recording alignment differs');
  const audio=await get(`history/${detail.history_item_id}/audio`);
  await writeFile(`${root}/${stem}.mp3`,Buffer.from(await audio.arrayBuffer()));
  await writeFile(`${root}/${stem}-alignment.json`,JSON.stringify(alignment,null,2));
  attempt.state='completed';attempt.recoveredFromHistory=true;attempt.historyItemId=detail.history_item_id;attempt.newPaidCallMade=false;
  await writeFile(`${root}/${stem}-attempt.json`,JSON.stringify(attempt,null,2));
  console.log(JSON.stringify({batch:b.index,recovered:true,newPaidCallMade:false}));
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Recovery stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
