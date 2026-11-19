import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30';
const read=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 const p=await read('repair-plan');const key=await credential();
 for(const b of p.batches){
  const n=b.name;let tries=0;
  while(!await exists(n+'.mp3')){if(await exists(n+'-attempt.json')){const a=await read(n+'-attempt');assert(a.state!=='rejected'&&a.state!=='unknown','Music generation unresolved; transcription paused');}assert(++tries<450,'Waiting for music timed out');await new Promise(r=>setTimeout(r,2000));}
  if(await exists(n+'-transcription-attempt.json')){assert((await read(n+'-transcription-attempt')).state==='completed','Prior transcription unresolved');continue;}
  const a={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,purpose:'Independent check of actual sung words and timing for the authorized full original prayer collection'};await save(n+'-transcription-attempt',a);
  try{
   const form=new FormData();form.set('file',new File([new Uint8Array(await readFile(`${root}/${n}.mp3`))],n+'.mp3',{type:'audio/mpeg'}));form.set('model_id','scribe_v2');form.set('timestamps_granularity','word');form.set('tag_audio_events','false');
   const r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':key},body:form,signal:AbortSignal.timeout(300000)});a.httpStatus=r.status;const d=await r.json();await save(n+'-transcription',d);a.state=r.ok?'completed':'rejected';await save(n+'-transcription-attempt',a);assert(r.ok,'Transcription rejected');console.log(JSON.stringify({batch:n,transcription:'completed',language:d.language_code,characters:d.text?.length||0}));
  }catch(e){if(a.state==='submitted'){a.state='unknown';await save(n+'-transcription-attempt',a);}throw e;}
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Transcription stopped; inspect saved result. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
