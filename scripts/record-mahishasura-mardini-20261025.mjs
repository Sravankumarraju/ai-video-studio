import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/mahishasura-mardini-2026-10-25';
const read=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,d)=>writeFile(`${root}/${n}.json`,JSON.stringify(d,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function main(){
 const p=await read('plan');assert.equal(p.creditCap,10000);assert(p.characters*2<10000);
 assert.equal(p.generationAuthorized,true);assert(p.authorization?.includes('10000'));
 const key=await credential(),headers={'xi-api-key':key};
 async function balance(){let r;for(let attempt=0;attempt<3;attempt++){r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});if(r.ok)break;if(r.status!==429&&r.status<500)break;console.log(JSON.stringify({creditCheckHttp:r.status,readOnlyRetry:attempt+1}));await new Promise(resolve=>setTimeout(resolve,10000));}assert(r.ok,'Credit check HTTP '+r.status);const s=await r.json();assert(s.tier!=='free');return {used:Number(s.character_count),limit:Number(s.character_limit),remaining:Number(s.character_limit)-Number(s.character_count)};}
 let ledger=await exists('credit-ledger.json')?await read('credit-ledger'):null;
 if(!ledger){const b=await balance();assert(b.remaining>=10000,'Insufficient included credits; no overage');ledger={baselineUsed:b.used,baselineLimit:b.limit,cap:10000,authorization:p.authorization};await save('credit-ledger',ledger);}
 for(const b of p.batches){
  const stem=`batch-${String(b.index).padStart(2,'0')}`;
  if(await exists(`${stem}.mp3`)&&await exists(`${stem}-alignment.json`)){console.log(JSON.stringify({batch:b.index+1,status:'already_saved'}));continue;}
  assert(!await exists(`${stem}-attempt.json`),'Prior attempt must be inspected; no duplicate generation');
  const before=await balance(),spent=before.used-ledger.baselineUsed;
  assert(spent>=0&&spent+b.text.length*2<=10000&&before.remaining>=b.text.length*2,'Credit cap or included balance would be exceeded');
  const request={inputs:[{text:b.text,voice_id:p.voiceId}],model_id:p.model,language_code:p.language};await save(`${stem}-request`,request);
  const attempt={state:'submitted',submittedAt:new Date().toISOString(),characters:b.text.length,beforeUsed:before.used,authorization:p.authorization};await save(`${stem}-attempt`,attempt);
  try{
   const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});attempt.httpStatus=r.status;
   if(!r.ok){attempt.state='rejected';await save(`${stem}-attempt`,attempt);throw Error('Provider rejected recording');}
   const d=await r.json();assert(d.audio_base64&&d.alignment,'Missing recording or alignment');
   await writeFile(`${root}/${stem}.mp3`,Buffer.from(d.audio_base64,'base64'));await save(`${stem}-alignment`,d.alignment);
   const after=await balance();attempt.state='completed';attempt.afterUsed=after.used;attempt.observedCreditDelta=after.used-before.used;attempt.completedAt=new Date().toISOString();await save(`${stem}-attempt`,attempt);
   assert(after.used-ledger.baselineUsed<=10000,'Credit cap reached; stop');
   console.log(JSON.stringify({batch:b.index+1,total:p.batches.length,state:'completed',observedCreditsSinceStart:after.used-ledger.baselineUsed}));
  }catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save(`${stem}-attempt`,attempt);}throw e;}
 }
 const final=await balance();await save('recording-status',{state:'completed',batches:p.batches.length,observedAccountCreditDelta:final.used-ledger.baselineUsed,cap:10000,expertPronunciationReviewed:false});
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Recording stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
