import {readFile,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/dakshinamurthy-2026-10-23';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function main(){
 try{await access(`${root}/opening-transcription-attempt.json`);console.log('Existing targeted transcription attempt preserved');return;}catch(e){if(e.code!=='ENOENT')throw e;}
 const key=await credential(),headers={'xi-api-key':key};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers});assert(check.ok);const account=await check.json();assert(Number(account.character_limit)-Number(account.character_count)>1000);
 const form=new FormData();form.set('file',new Blob([await readFile(`${root}/opening-review.wav`)],{type:'audio/wav'}),'opening.wav');form.set('model_id','scribe_v2');form.set('tag_audio_events','false');form.set('timestamps_granularity','word');
 const attempt={state:'submitted',authorization:'User approved credits for complete stotram video and clear pronunciation; targeted 24-second opening check to resolve full-track ASR omission.',submittedAt:new Date().toISOString()};await save('opening-transcription-attempt',attempt);
 try{const r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers,body:form,signal:AbortSignal.timeout(180000)});attempt.httpStatus=r.status;if(!r.ok){attempt.state='rejected';await save('opening-transcription-attempt',attempt);throw Error(`ASR rejected ${r.status}`);}const result=await r.json();await save('opening-transcription',result);attempt.state='completed';await save('opening-transcription-attempt',attempt);console.log(JSON.stringify({text:result.text,language:result.language_code}));}catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save('opening-transcription-attempt',attempt);}throw e;}
}
main().catch(()=>{console.error('Targeted check stopped; saved state retained.');process.exitCode=1;}).finally(()=>db.$disconnect());
