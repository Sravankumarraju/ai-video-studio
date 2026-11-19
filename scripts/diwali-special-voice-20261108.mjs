import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root=process.env.DIWALI_PRODUCTION_ROOT||'data/productions/divine-wisdom/diwali-special-2026-11-08';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
const exists=async n=>{try{await access(`${root}/${n}`);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
async function main(){
 const p=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));const key=await credential();
 const headers={'xi-api-key':key};
 const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(r.ok,`Subscription HTTP ${r.status}`);
 const q=await r.json();const remaining=q.character_limit-q.character_count;
 let required=0;for(const variant of ['short','long'])for(const s of p[variant])if(!await exists(`${variant}-voice-${s.index.toString().padStart(2,'0')}-sindhuja.mp3`))required+=s.text.length;
 await save('credit-check',{checkedAt:new Date().toISOString(),tier:q.tier,remainingIncluded:remaining,maximumCharacters:required,maximumCalls:13,overageAllowed:false});
 console.log(JSON.stringify({stage:'preflight',remainingIncluded:remaining,maximumCharacters:required,tier:q.tier}));
 assert(q.tier!=='free'&&remaining>=required*2,'Insufficient included credit headroom; stop before generation');
 if(process.argv[2]==='check')return;
 for(const variant of ['short','long'])for(const s of p[variant]){
  const stem=`${variant}-voice-${s.index.toString().padStart(2,'0')}-sindhuja`;
  if(await exists(`${stem}.mp3`)&&await exists(`${stem}-alignment.json`)){console.log(JSON.stringify({stem,status:'saved'}));continue;}
  assert(!await exists(`${stem}-attempt.json`),'Prior attempt exists; inspect rather than duplicate');
  const record={state:'submitted',at:new Date().toISOString(),characters:s.text.length,model:p.model,voiceId:p.voiceId,authorization:'User explicitly requested Telugu scripts and finished short and long Diwali videos. Existing studio voice; included quota only, no overage.',actualCharge:null};await save(`${stem}-attempt`,record);
  try{
   const response=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({inputs:[{text:s.text,voice_id:p.voiceId}],model_id:p.model,language_code:'te'}),signal:AbortSignal.timeout(300000)});
   record.httpStatus=response.status;
   if(!response.ok){record.state='rejected';await save(`${stem}-attempt`,record);throw Error(`Narration HTTP ${response.status}`);}
   const body=await response.json();assert(body.audio_base64&&body.alignment,'Missing speech or timestamps');
   await writeFile(`${root}/${stem}.mp3`,Buffer.from(body.audio_base64,'base64'));await save(`${stem}-alignment`,body.alignment);
   record.state='completed';record.requestId=response.headers.get('request-id');await save(`${stem}-attempt`,record);
   console.log(JSON.stringify({stem,status:'completed'}));
  }catch(e){if(record.state==='submitted'){record.state='unknown';await save(`${stem}-attempt`,record);}throw e;}
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Narration stopped; inspect local attempt records. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
