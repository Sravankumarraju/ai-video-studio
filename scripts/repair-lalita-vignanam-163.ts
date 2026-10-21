import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation/vignanam-v3';
async function main(){
 const p=JSON.parse(await readFile(`${root}/verse-163-repair-plan.json`,'utf8'));
 try{await stat(`${root}/verse-163-repair-attempt.json`);throw Error('Existing attempt; no duplicate repair');}catch(e:any){if(e.code!=='ENOENT')throw e;}
 let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key)){key=decrypt((await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);}
 const h={'xi-api-key':key!};const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:h,signal:AbortSignal.timeout(30000)});assert(r.ok);const c=await r.json();assert(c.character_limit-c.character_count>=p.characters*2,'No included credit headroom');
 const save=(d:any)=>writeFile(`${root}/verse-163-repair-attempt.json`,JSON.stringify(d,null,2));const attempt:any={state:'submitted',characters:p.characters,maximumCalls:1,userApproval:'User approved same male voice and full recitation with highlighted speaking words'};await save(attempt);
 try{const response=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({inputs:[{text:p.text,voice_id:p.voiceId}],model_id:p.model,language_code:'te'}),signal:AbortSignal.timeout(300000)});attempt.httpStatus=response.status;if(!response.ok){attempt.state='rejected';await save(attempt);throw Error('Repair rejected');}const d=await response.json();assert(d.audio_base64&&d.alignment);assert(d.alignment.characters.join('')===p.text);await writeFile(`${root}/verse-163-repair.mp3`,Buffer.from(d.audio_base64,'base64'));await writeFile(`${root}/verse-163-repair-alignment.json`,JSON.stringify(d.alignment,null,2));attempt.state='completed';await save(attempt);console.log(JSON.stringify({verse:163,state:'completed'}));}catch{if(attempt.state==='submitted'){attempt.state='unknown';await save(attempt);}throw Error('Repair stopped; no automatic retry');}
}
main().catch(()=>{console.error('Repair stopped; inspect local attempt.');process.exitCode=1;}).finally(()=>db.$disconnect());
