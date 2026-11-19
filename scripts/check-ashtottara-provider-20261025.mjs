import {credential,db} from './anjaneya-dandakam-audio.mjs';
import {writeFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/lalitha-ashtottara-2026-10-25';
try{
 const key=await credential();
 for(const [name,url] of [['shared-priest','shared-voices?search=God%20Voice%20Tone%20Male&page_size=10'],['shared-telugu','shared-voices?language=te&gender=male&page_size=5']]){
  const r=await fetch('https://api.elevenlabs.io/v1/'+url,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});const d=await r.json();
  await writeFile(`${root}/provider-${name}-check.json`,JSON.stringify({status:r.status,data:d},null,2));
  console.log(JSON.stringify({check:name,status:r.status,voices:d.voices?.map(x=>({id:x.voice_id,owner:x.public_owner_id,name:x.name,language:x.language,labels:x.labels,description:x.description,rate:x.rate})),detail:!r.ok?d.detail:undefined}));
 }
}catch{console.error('Read-only provider check stopped; credentials suppressed.');process.exitCode=1;}finally{await db.$disconnect();}
