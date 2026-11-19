import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/lakshmi-new-prayer-first-style-2026-10-30';
const save=(name,v)=>writeFile(`${root}/${name}.json`,JSON.stringify(v,null,2));
async function main(){
 try{await access(`${root}/pronunciation-autodetect-attempt.json`);console.log('Existing transcription attempt retained; no new call');return;}catch(e){if(e.code!=='ENOENT')throw e;}
 const key=await credential();const a={state:'submitted',submittedAt:new Date().toISOString(),purpose:'Independent transcription of revised sung sample to check audible Telugu wording; not proof of perfect pronunciation',maximumCalls:1};await save('pronunciation-autodetect-attempt',a);
 try{
 const form=new FormData();form.set('file',new File([new Uint8Array(await readFile(`${root}/lakshmi-new-prayer-first-style.mp3`))],'original-sample-v2.mp3',{type:'audio/mpeg'}));form.set('model_id','scribe_v2');form.set('timestamps_granularity','word');form.set('tag_audio_events','false');
 const r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':key},body:form,signal:AbortSignal.timeout(300000)});a.httpStatus=r.status;const d=await r.json();await save('pronunciation-autodetect',d);a.state=r.ok?'completed':'rejected';await save('pronunciation-autodetect-attempt',a);assert(r.ok,'Transcription rejected');console.log(JSON.stringify({state:'completed',recognizedText:d.text}));
 }catch(e){if(a.state==='submitted'){a.state='unknown';await save('pronunciation-autodetect-attempt',a);}throw e;}
}
main().catch(()=>{console.error('Transcription check stopped; inspect saved response. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
