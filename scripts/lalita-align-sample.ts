import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';
const save=(name:string,value:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
async function main(){
 const captions=JSON.parse(await readFile(`${root}/SAMPLE-CAPTIONS.json`,'utf8'));
 const bytes=await readFile(`${root}/lalita-chant-sample-unreviewed.mp3`);
 try{await readFile(`${root}/sample-alignment-attempt.json`);throw Error('Existing alignment attempt; no duplicate call.');}catch(e:any){if(e.code!=='ENOENT')throw e;}
 let key=process.env.ELEVENLABS_API_KEY;
 if(!key||/^(<|PASTE|your)/i.test(key)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});key=decrypt(p.encryptedKey);}
 const headers={'xi-api-key':key!};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(check.ok,'Credit check failed');
 const info=await check.json();const remaining=Number(info.character_limit)-Number(info.character_count);
 assert(info.tier!=='free'&&Number.isFinite(remaining)&&remaining>=12500,'Insufficient included credit headroom; no overage');
 const form=new FormData();form.append('file',new Blob([new Uint8Array(bytes)],{type:'audio/mpeg'}),'lalita-sample.mp3');form.append('text',captions.phrases.map((p:any)=>p.sanskrit).join('\n'));
 const record:any={state:'submitted',submittedAt:new Date().toISOString(),scope:'one acoustic alignment call for the requested caption sample',maximumCalls:1,actualCharge:null};await save('sample-alignment-attempt',record);
 try{
  const r=await fetch('https://api.elevenlabs.io/v1/forced-alignment',{method:'POST',headers,body:form,signal:AbortSignal.timeout(180000)});record.httpStatus=r.status;
  if(!r.ok){record.state='rejected';await save('sample-alignment-attempt',record);throw Error('Alignment rejected');}
  const result=await r.json();await save('sample-alignment',result);
  record.state='completed';record.completedAt=new Date().toISOString();await save('sample-alignment-attempt',record);
  console.log(JSON.stringify({state:record.state,words:result.words?.length,loss:result.loss,note:'Acoustic alignment does not approve Sanskrit pronunciation.'}));
 }catch{
  if(record.state==='submitted'){record.state='unknown';await save('sample-alignment-attempt',record);}
  throw Error('Inspect alignment attempt; do not retry automatically.');
 }
}
main().catch(()=>{console.error('Sample alignment failed; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
