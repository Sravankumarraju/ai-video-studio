import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='output/om-namah-shivaya-108-2026-10-23';
async function main(){
 try{await access(`${root}/transcription-attempt.json`);console.log('Existing transcription attempt; inspect saved record');return;}catch{}
 const key=await credential();const form=new FormData();form.set('file',new Blob([await readFile(`${root}/original-four-cycles.mp3`)],{type:'audio/mpeg'}),'chant.mp3');form.set('model_id','scribe_v2');form.set('language_code','hin');form.set('tag_audio_events','false');form.set('timestamps_granularity','word');
 const record={state:'submitted',maximumCalls:1,authorization:'User approved credits for chant video; independent pronunciation and count check',submittedAt:new Date().toISOString()};
 const save=()=>writeFile(`${root}/transcription-attempt.json`,JSON.stringify(record,null,2));await save();
 try{const r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':key},body:form,signal:AbortSignal.timeout(180000)});record.httpStatus=r.status;assert(r.ok,'Transcription rejected');const d=await r.json();await writeFile(`${root}/transcription.json`,JSON.stringify(d,null,2));record.state='completed';await save();console.log(JSON.stringify({text:d.text,words:d.words}));}catch(e){record.state='unknown';await save();throw e;}
}
main().catch(()=>{console.error('Transcription stopped; inspect saved attempt; no automatic duplicate retry.');process.exitCode=1;}).finally(()=>db.$disconnect());
