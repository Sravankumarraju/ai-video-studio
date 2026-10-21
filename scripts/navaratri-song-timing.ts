import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/navaratri-song-2026-10-15';
const mode=process.argv[2]||'transcribe';
const save=(name:string,data:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(data,null,2));
async function main(){
 assert(['transcribe','align'].includes(mode));
 try {await readFile(`${root}/${mode}-attempt.json`); throw Error('Existing attempt prevents duplicate call');}catch(e:any){if(e.code!=='ENOENT')throw e;}
 const key=process.env.ELEVENLABS_API_KEY; assert(key,'ElevenLabs is not configured');
 const headers={'xi-api-key':key};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});
 assert(check.ok,'Subscription check failed'); const info=await check.json();
 const remaining=Number(info.character_limit)-Number(info.character_count);
 assert(Number.isFinite(remaining)&&remaining>=10000,'Insufficient included credits; no overage');
 await save(`${mode}-credit-check`,{remainingCredits:remaining,checkedAt:new Date().toISOString()});
 const form=new FormData();form.set('file',new Blob([new Uint8Array(await readFile(`${root}/song-original.m4a`))],{type:'audio/mp4'}),'song.m4a');
 if(mode==='transcribe'){
  form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','false');form.set('timestamps_granularity','word');
 }else form.set('text',await readFile(`${root}/lyrics-performed.txt`,'utf8'));
 const attempt:any={state:'submitted',submittedAt:new Date().toISOString(),scope:'Caption timing for user-requested full song video; original audio preserved',maximumCalls:1,actualCharge:null};await save(`${mode}-attempt`,attempt);
 try{
  const r=await fetch(`https://api.elevenlabs.io/v1/${mode==='transcribe'?'speech-to-text':'forced-alignment'}`,{method:'POST',headers,body:form,signal:AbortSignal.timeout(300000)});
  attempt.httpStatus=r.status;assert(r.ok,`Provider HTTP ${r.status}`);const data=await r.json();await save(mode,data);
  attempt.state='completed';attempt.completedAt=new Date().toISOString();await save(`${mode}-attempt`,attempt);
  console.log(JSON.stringify({stage:mode,text:data.text,words:data.words?.length,loss:data.loss}));
 }catch(e){attempt.state='failed-or-unknown';await save(`${mode}-attempt`,attempt);throw e;}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

