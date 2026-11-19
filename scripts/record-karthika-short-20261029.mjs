import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/karthika-short-2026-10-29';
const attemptName='narration-current-voice-attempt';
const save=(n,d)=>writeFile(`${root}/${n}.json`,JSON.stringify(d,null,2));
const exists=async n=>access(`${root}/${n}`).then(()=>true,()=>false);
async function main(){
 if(await exists('narration.mp3')&&await exists('narration-alignment.json')){console.log('Saved narration reused; no new paid call.');return;}
 assert(!await exists(`${attemptName}.json`),'Prior current-voice attempt exists; inspect before retrying.');
 const prior=JSON.parse(await readFile(`${root}/narration-attempt.json`,'utf8'));
 assert(prior.state==='rejected'&&prior.httpStatus===404,'Original attempt must be explicitly rejected.');
 const script=(await readFile(`${root}/narration-te.txt`,'utf8')).trim();
 assert(script.length<1000);
 const key=await credential();
 assert(key,'Saved ElevenLabs credential unavailable.');
 const headers={'xi-api-key':key};
 async function balance(){
  const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});
  assert(r.ok,'Credit check rejected; generation not started.');
  const s=await r.json();return {used:Number(s.character_count),remaining:Number(s.character_limit)-Number(s.character_count)};
 }
 const before=await balance();
 assert(before.remaining>=script.length*2,'Insufficient included credits; generation not started.');
 const request={inputs:[{text:script,voice_id:'9dQiWzuJKan0MNO2wA8U'}],model_id:'eleven_v4',language_code:'te'};
 await save('narration-request',request);
 const attempt={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,characters:script.length,beforeUsed:before.used,authorization:'User approved one paid Telugu narration using the saved ElevenLabs Telugu voice despite unknown pricing, then add audio to the existing 30–45 second Short.',actualCurrencyCost:null};
 await save(attemptName,attempt);
 try{
  const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});
  attempt.httpStatus=r.status;
  if(!r.ok){attempt.state='rejected';const err=await r.json().catch(()=>({}));attempt.reason=err.detail?.status||err.detail?.code||null;await save(attemptName,attempt);throw Error('Provider rejected recording; no automatic retry.');}
  const d=await r.json();
  await save('narration-response',d);
  assert(d.audio_base64&&d.alignment,'Missing recording or alignment; response retained.');
  await writeFile(`${root}/narration.mp3`,Buffer.from(d.audio_base64,'base64'));
  await save('narration-alignment',d.alignment);
  attempt.state='completed';attempt.completedAt=new Date().toISOString();
  await save(attemptName,attempt);
  const after=await balance().catch(()=>null);
  if(after){attempt.observedAccountCreditDelta=after.used-before.used;await save(attemptName,attempt);}
  console.log(JSON.stringify({state:attempt.state,characters:script.length,observedAccountCreditDelta:attempt.observedAccountCreditDelta,voice:request.inputs[0].voice_id}));
 }catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save(attemptName,attempt);}throw e;}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Narration stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
