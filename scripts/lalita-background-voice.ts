import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-01-background';
const save=(name:string,v:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(v,null,2));
async function exists(name:string){try{await readFile(`${root}/${name}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 const config=JSON.parse(await readFile(`${root}/episode.json`,'utf8'));
 assert.equal(config.sections.length,11);assert.equal(config.maximumNarrationCalls,11);
 const pending=[];for(const s of config.sections){const stem=`voice-${String(s.index).padStart(2,'0')}`;if(await exists(`${stem}.mp3`)&&await exists(`${stem}-alignment.json`))continue;assert(!await exists(`${stem}-attempt.json`),'Unfinished existing attempt prevents automatic duplicate charge');pending.push(s);}
 if(!pending.length){console.log('All eleven narration sections already saved.');return;}
 let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});key=decrypt(p.encryptedKey);}
 const headers={'xi-api-key':key!};const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(r.ok,'Credit check rejected');const info=await r.json();const remaining=Number(info.character_limit)-Number(info.character_count);const characters=pending.reduce((n,s)=>n+s.text.length,0);
 assert(info.tier!=='free'&&Number.isFinite(remaining)&&remaining>=characters*2,'Insufficient included credit headroom; no overage or budget changes');
 await save('subscription-check',{checkedAt:new Date().toISOString(),tier:info.tier,remainingCredits:remaining,characters,maximumNewCalls:pending.length});
 for(const s of pending){
  const stem=`voice-${String(s.index).padStart(2,'0')}`;assert(s.text.length<=2000);const record:any={state:'submitted',submittedAt:new Date().toISOString(),characters:s.text.length,section:s.index,model:config.model,voiceId:config.voiceId,authorization:'User requested start video1 and approved audio.',actualCharge:null};await save(`${stem}-attempt`,record);
  try{
   const response=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({inputs:[{text:s.text,voice_id:config.voiceId}],model_id:config.model,language_code:'te',...(s.index?{previous_text:config.sections[s.index-1].text.slice(-100)}:{}),...(s.index+1<config.sections.length?{next_text:config.sections[s.index+1].text.slice(0,100)}:{})}),signal:AbortSignal.timeout(300000)});
   record.httpStatus=response.status;if(!response.ok){record.state='rejected';await save(`${stem}-attempt`,record);throw Error('Narration rejected');}
   const result=await response.json();assert(result.audio_base64&&result.alignment,'Missing narration or alignment');
   await writeFile(`${root}/${stem}.mp3`,Buffer.from(result.audio_base64,'base64'));await save(`${stem}-alignment`,result.alignment);
   record.state='completed';record.completedAt=new Date().toISOString();await save(`${stem}-attempt`,record);console.log(JSON.stringify({section:s.index+1,total:11,status:'completed'}));
  }catch{if(record.state==='submitted'){record.state='unknown';await save(`${stem}-attempt`,record);}throw Error('Inspect saved attempt; no automatic duplicate generation.');}
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Narration stage failed; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
