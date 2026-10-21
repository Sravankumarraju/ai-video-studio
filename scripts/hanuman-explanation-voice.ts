import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/hanuman-chalisa/explanation-te-2026-10-06';
const save=(name:string,data:any)=>writeFile(`${root}/${name}.json`,JSON.stringify(data,null,2));
async function exists(name:string){try{await access(`${root}/${name}`);return true;}catch{return false;}}
async function main(){
 const config=JSON.parse(await readFile(`${root}/episode.json`,'utf8'));
 let work=config.batches;
 if(process.argv[2]==='repair'){
  work=[];
  for(const b of config.batches){
   const stem=`voice-${String(b.index).padStart(2,'0')}`;
   if(!await exists(`${stem}-alignment.json`))continue;
   const a=JSON.parse(await readFile(`${root}/${stem}-alignment.json`,'utf8'));
   for(const index of b.sections){const s=config.sections[index];let compressed=0;
    for(const m of s.text.matchAll(/\S+/g)){const first=s.charStart+m.index;const last=first+m[0].length;
     if(Math.max(...a.character_end_times_seconds.slice(first,last))-Math.min(...a.character_start_times_seconds.slice(first,last))<.01)compressed++;
    }
    if(compressed){assert(s.text.length<=1000,'Repair must be a short section');work.push({index:s.index,text:s.text,stem:`repair-${String(s.index).padStart(2,'0')}`,compressedWords:compressed});}
   }
  }
  await save('repair-plan',{sections:work.map((b:any)=>({index:b.index,characters:b.text.length,compressedWords:b.compressedWords})),maximumCalls:work.length,scope:'Regenerate timestamp-flagged incomplete sections, preserving previous recordings'});
 }
 let apiKey=process.env.ELEVENLABS_API_KEY;
 if(!apiKey||/^(<|PASTE|your)/i.test(apiKey)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});apiKey=decrypt(p.encryptedKey);}
 const headers={'xi-api-key':apiKey!};
 const subscription=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(subscription.ok,`Subscription HTTP ${subscription.status}`);
 const sub=await subscription.json();const remaining=sub.character_limit-sub.character_count;
 const pending=work.filter((b:any)=>!b.completed);
 const required=pending.filter((b:any)=>b).reduce((n:number,b:any)=>n+b.text.length,0);
 assert(sub.tier!=='free'&&remaining>=required,'Insufficient included credits; no overage permitted');
 await save('subscription-check',{checkedAt:new Date().toISOString(),tier:sub.tier,remainingCredits:remaining,maximumNewCalls:config.batches.length,scriptCharacters:required});
 for(const b of work){
  const stem=b.stem||`voice-${String(b.index).padStart(2,'0')}`;
  if(await exists(`${stem}-alignment.json`)&&await exists(`${stem}.mp3`)){console.log(JSON.stringify({batch:b.index+1,status:'saved'}));continue;}
  assert(!await exists(`${stem}-attempt.json`),'Previous attempt exists; inspect outcome before retrying');
  const record:any={state:'submitted',submittedAt:new Date().toISOString(),characters:b.text.length,authorization:'Owner requested complete Telugu explanation video, previously authorized existing ElevenLabs plan, and instructed continue',model:config.model,voiceId:config.voiceId,actualCharge:null};await save(`${stem}-attempt`,record);
  try{
   const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({inputs:[{text:b.text,voice_id:config.voiceId}],model_id:config.model,language_code:'te',...(!b.stem&&b.index?{previous_text:config.batches[b.index-1].text.slice(-100)}:{}),...(!b.stem&&b.index+1<config.batches.length?{next_text:config.batches[b.index+1].text.slice(0,100)}:{})}),signal:AbortSignal.timeout(300000)});
   record.httpStatus=r.status;
   if(!r.ok){record.state='rejected';await save(`${stem}-attempt`,record);throw Error(`Voice rejected HTTP ${r.status}`);}
   const raw=await r.text();await writeFile(`${root}/${stem}-response.json`,raw);
   const result=JSON.parse(raw);assert(result.audio_base64&&result.alignment,'Missing audio or character alignment');
   await writeFile(`${root}/${stem}.mp3`,Buffer.from(result.audio_base64,'base64'));await save(`${stem}-alignment`,result.alignment);
   record.state='completed';record.completedAt=new Date().toISOString();await save(`${stem}-attempt`,record);
   console.log(JSON.stringify({batch:b.index+1,total:config.batches.length,characters:b.text.length,status:'completed'}));
  }catch(e){if(record.state==='submitted'){record.state='unknown';await save(`${stem}-attempt`,record);}throw e;}
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
