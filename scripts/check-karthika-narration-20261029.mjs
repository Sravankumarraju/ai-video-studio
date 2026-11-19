import {credential,db} from './anjaneya-dandakam-audio.mjs';
import {writeFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/karthika-short-2026-10-29';
try{
 const key=await credential();
 for(const [name,path] of [['replacement-voice','voices/9dQiWzuJKan0MNO2wA8U'],['history','history?page_size=5']]){
  const r=await fetch('https://api.elevenlabs.io/v1/'+path,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  const d=await r.json();
  await writeFile(`${root}/check-${name}.json`,JSON.stringify({httpStatus:r.status,data:d},null,2));
  console.log(JSON.stringify({check:name,httpStatus:r.status,voice:d.voice_id?{id:d.voice_id,name:d.name}:undefined,history:d.history?.map(h=>({id:h.history_item_id,voice:h.voice_id,date:h.date_unix})),error:!r.ok?d.detail:undefined}));
 }
}catch{console.error('Read-only check failed; credentials suppressed.');process.exitCode=1;}finally{await db.$disconnect();}
