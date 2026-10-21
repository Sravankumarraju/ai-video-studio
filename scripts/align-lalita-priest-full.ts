import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation/priest-chant-full-v4';
const save=(n:string,d:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(d,null,2));
async function exists(n:string){try{await stat(`${root}/${n}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 const p=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));const audit=JSON.parse(await readFile(`${root}/TIMING-AUDIT.json`,'utf8'));let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key))key=decrypt((await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);
 const headers={'xi-api-key':key!};const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(check.ok);const c=await check.json();assert(c.character_limit-c.character_count>=12500,'Insufficient included credits; no overage');
 for(const index of audit.affectedBatches){
  const stem=`batch-${String(index).padStart(2,'0')}`;if(await exists(stem+'-acoustic.json'))continue;assert(!await exists(stem+'-acoustic-attempt.json'),'Existing alignment attempt; no duplicate call');
  const b=p.batches[index];const text=b.text.slice(b.units[0].startCharacter);const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/${stem}.mp3`))],{type:'audio/mpeg'}),'chant.mp3');form.append('text',text);
  const attempt:any={state:'submitted',characters:text.length,includedCreditsOnly:true,scope:'Speaking-word timing for approved priest chanting and complete shloka captions',submittedAt:new Date().toISOString()};await save(stem+'-acoustic-attempt',attempt);
  try{const r=await fetch('https://api.elevenlabs.io/v1/forced-alignment',{method:'POST',headers,body:form,signal:AbortSignal.timeout(300000)});attempt.httpStatus=r.status;if(!r.ok){attempt.state='rejected';await save(stem+'-acoustic-attempt',attempt);throw Error('Alignment rejected');}await save(stem+'-acoustic',await r.json());attempt.state='completed';await save(stem+'-acoustic-attempt',attempt);console.log(JSON.stringify({batch:index,state:'timing_completed'}));}catch{if(attempt.state==='submitted'){attempt.state='unknown';await save(stem+'-acoustic-attempt',attempt);}throw Error('Timing interrupted; no automatic duplicate retry');}
 }
}
main().catch(()=>{console.error('Timing stage stopped; inspect saved attempt.');process.exitCode=1;}).finally(()=>db.$disconnect());
