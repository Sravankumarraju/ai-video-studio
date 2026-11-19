import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/mahishasura-mardini-2026-10-25/female-full-v3';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function main(){
 const key=await credential(),headers={'xi-api-key':key};
 const baseline=JSON.parse(await readFile(`${root}/../credit-ledger.json`,'utf8')).baselineUsed;
 for(const verse of [11,16]){
  const stem=`verse-${verse}-acoustic-check`;
  if(await exists(`${stem}.json`)){console.log(JSON.stringify({verse,reused:true}));continue;}
  assert(!await exists(`${stem}-attempt.json`),'Prior check unresolved; no duplicate paid call');
  const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers});assert(r.ok,'Credit check failed');const b=await r.json();
  assert(b.tier!=='free'&&b.character_limit-b.character_count>=200&&b.character_count-baseline+200<=13000,'Credit cap or included balance would be exceeded');
  const attempt={state:'submitted',beforeUsed:b.character_count,reserveCredits:200,authorization:'Full-production verification within owner-approved total 13000 existing credits; two short passages only, no overage.'};await save(`${stem}-attempt`,attempt);
  try{
   const form=new FormData();form.set('file',new File([new Uint8Array(await readFile(`${root}/verse-${verse}-timing-review.mp3`))],`verse-${verse}.mp3`,{type:'audio/mpeg'}));form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('timestamps_granularity','word');form.set('tag_audio_events','false');
   const q=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers,body:form,signal:AbortSignal.timeout(300000)});attempt.httpStatus=q.status;
   if(!q.ok){attempt.state='rejected';await save(`${stem}-attempt`,attempt);throw Error('Acoustic check rejected');}
   const data=await q.json();await save(stem,data);attempt.state='completed';await save(`${stem}-attempt`,attempt);console.log(JSON.stringify({verse,text:data.text}));
  }catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save(`${stem}-attempt`,attempt);}throw e;}
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Acoustic check stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
