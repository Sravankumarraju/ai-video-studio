import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/garuda-gamana-tava-audio-v3-2026-10-28';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function main(){
 await mkdir(root,{recursive:true});
 const old=await readFile(`${root}/own-reference-upload-attempt.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e});
 if(old){assert.equal(old.state,'completed','Prior upload unresolved; inspect before any retry');return;}
 const key=await credential();const form=new FormData();
 form.append('file',new Blob([new Uint8Array(await readFile('data/productions/divine-wisdom/govinda-namalu-female-sample-2026-10-20/govinda-female-sample.mp3'))],{type:'audio/mpeg'}),'own-approved-govinda-female.mp3');
 form.append('with_timestamps','false');
 const record={state:'submitted',maximumCalls:1,source:'Own original approved Govinda female sample; source song ID unavailable under active provider key',submittedAt:new Date().toISOString()};await save('own-reference-upload-attempt',record);
 try{
 const r=await fetch('https://api.elevenlabs.io/v1/music/upload',{method:'POST',headers:{'xi-api-key':key},body:form,signal:AbortSignal.timeout(300000)});
 record.httpStatus=r.status;
 if(!r.ok){record.state='rejected';await save('own-reference-upload-attempt',record);throw Error('Reference upload rejected: '+r.status);}
 const result=await r.json();assert(result.song_id);await save('own-reference',{state:'completed',songId:result.song_id});record.state='completed';await save('own-reference-upload-attempt',record);console.log('Own original vocal reference restored');
 }catch(e){if(record.state==='submitted'){record.state='unknown';await save('own-reference-upload-attempt',record)}throw e;}
}
main().catch(e=>{console.error(e.message?.startsWith('Reference upload')?e.message:'Reference stage stopped; inspect saved state; no retry');process.exitCode=1}).finally(()=>db.$disconnect());
