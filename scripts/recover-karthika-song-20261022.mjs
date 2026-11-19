import {credential,db} from './anjaneya-dandakam-audio.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/karthika-deepam-2026-10-22';
try{
 const key=await credential();const ledger=JSON.parse(await readFile(`${root}/song-attempt.json`,'utf8'));
 const paths=process.argv.slice(2).length?process.argv.slice(2):['history?page_size=100',`music/${ledger.songId}/audio`,`music/${ledger.songId}`];
 for(const path of paths){
  try{const r=await fetch('https://api.elevenlabs.io/v1/'+path,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(60000)});const type=r.headers.get('content-type')||'';
   if(r.ok&&/audio\//.test(type)){const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/song-recovered.mp3`,bytes);console.log(JSON.stringify({path,status:r.status,audioBytes:bytes.length}));}
   else{const body=await r.json().catch(()=>({}));await writeFile(`${root}/recovery-${path.startsWith('history')?'history':path.endsWith('audio')?'audio':'song'}.json`,JSON.stringify(body,null,2));console.log(JSON.stringify({path,status:r.status,keys:Object.keys(body),history:body.history?.slice(0,8).map(x=>({id:x.history_item_id,date:x.date_unix,model:x.model_id,source:x.source,text:x.text?.slice(0,70)})),detail:typeof body.detail==='string'?body.detail:body.detail?.status}));}
  }catch(e){console.log(JSON.stringify({path,error:e.name,code:e.cause?.code}));}
 }
}catch(e){console.log(JSON.stringify({error:e.name,code:e.cause?.code}));process.exitCode=1;}finally{await db.$disconnect();}
