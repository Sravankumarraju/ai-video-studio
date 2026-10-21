import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const old='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation';
const root=old+(process.argv.includes('priest-chant-full-v4')?'/priest-chant-full-v4':process.argv.includes('vignanam-v3')?'/vignanam-v3':'/male-voice-v2');
const save=(name:string,data:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(data,null,2));
async function exists(name:string){try{await stat(`${root}/${name}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 const plan=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));assert(plan.sampleApproved&&plan.maximumNewCalls<=30&&plan.newCharacters<=25000&&plan.voiceId==='sJrRcQEpUbZehhGBdEbD');
 const pending=[];
 for(const b of plan.batches){
  if(process.argv.includes('--replace-missing-07')&&b.index!==7)continue;
  const stem=`batch-${String(b.index).padStart(2,'0')}`;
  if(b.reuseAudio){await copyFile(b.reuseAudio,`${root}/${stem}.mp3`);await copyFile(b.reuseAlignment,`${root}/${stem}-alignment.json`);continue;}
  if(b.reuseApprovedSample){await copyFile(`${old}/male-voice-sample-2026-10-14/sample.mp3`,`${root}/${stem}.mp3`);await copyFile(`${old}/male-voice-sample-2026-10-14/alignment.json`,`${root}/${stem}-alignment.json`);continue;}
  if(await exists(`${stem}.mp3`)&&await exists(`${stem}-alignment.json`))continue;
  if(await exists(`${stem}-attempt.json`)){
   const oldAttempt=JSON.parse(await readFile(`${root}/${stem}-attempt.json`,'utf8'));
   if(process.argv.includes('--replace-missing-07')&&b.index===7&&oldAttempt.state==='unknown'){
    const audit=JSON.parse(await readFile(`${root}/missing-07-history-check.json`,'utf8'));
    assert(audit.exactMatchingRecordingFound===false&&audit.batch===7,'Missing recording must have a history audit');
    assert(!await exists(`${stem}-original-unresolved-attempt.json`),'Only one replacement permitted');
    await save(`${stem}-original-unresolved-attempt`,oldAttempt);pending.push(b);continue;
   }
   if(process.argv.includes('--skip-unresolved')&&oldAttempt.state==='unknown'){console.log(JSON.stringify({batch:b.index+1,state:'unresolved_skipped_no_duplicate_call'}));continue;}
   assert(false,'Unfinished existing attempt; no automatic duplicate generation');
  }
  pending.push(b);
 }
 if(!pending.length){console.log('All approved male narration batches saved.');return;}
 let key=process.env.ELEVENLABS_API_KEY;
 if(!key||/^(<|PASTE|your)/i.test(key)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});key=decrypt(p.encryptedKey);}
 const headers={'xi-api-key':key!};const cr=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(cr.ok,'Credit check rejected');const info=await cr.json();const remaining=Number(info.character_limit)-Number(info.character_count);const count=pending.reduce((n,b)=>n+b.text.length,0);
 assert(info.tier!=='free'&&Number.isFinite(remaining)&&remaining>=count*2,'Insufficient included credits; no overage');await save('credit-check',{remainingCredits:remaining,characters:count,calls:pending.length});
 for(const b of pending){
  assert(b.text.length<=1000);const stem=`batch-${String(b.index).padStart(2,'0')}`;
  const request={inputs:[{text:b.text,voice_id:plan.voiceId}],model_id:plan.model,language_code:plan.language};await save(`${stem}-request`,request);
  const attempt:any={state:'submitted',characters:b.text.length,voiceId:plan.voiceId,model:plan.model,userApproval:plan.userApproval,submittedAt:new Date().toISOString()};await save(`${stem}-attempt`,attempt);
  try{
   const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});attempt.httpStatus=r.status;
   if(!r.ok){attempt.state='rejected';await save(`${stem}-attempt`,attempt);throw Error('Narration rejected');}
   const d=await r.json();assert(d.audio_base64&&d.alignment,'Missing audio or timing');
   await writeFile(`${root}/${stem}.mp3`,Buffer.from(d.audio_base64,'base64'));await save(`${stem}-alignment`,d.alignment);
   attempt.state='completed';attempt.completedAt=new Date().toISOString();await save(`${stem}-attempt`,attempt);console.log(JSON.stringify({batch:b.index+1,total:plan.batches.length,state:'completed'}));
  }catch{if(attempt.state==='submitted'){attempt.state='unknown';await save(`${stem}-attempt`,attempt);}throw Error('Narration stopped; inspect saved attempt; no automatic retry.');}
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Narration stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
