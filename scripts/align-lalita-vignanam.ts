import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation/vignanam-v3';
const save=(name:string,d:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(d,null,2));
async function exists(n:string){try{await stat(`${root}/${n}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 const plan=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key))key=decrypt((await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);
 const headers={'xi-api-key':key!};const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(check.ok);const credits=await check.json();assert(credits.character_limit-credits.character_count>=12500,'Insufficient included credits; no overage');
 for(const index of (process.argv.includes('verse-163')?[163]:[5,7,9,15])){
  const audioStem=index===163?'verse-163-repair':`batch-${String(index).padStart(2,'0')}`;
  const stem=audioStem+'-acoustic';if(await exists(stem+'.json'))continue;assert(!await exists(stem+'-attempt.json'),'Prior attempt retained; no duplicate alignment');
  const b=index===163?JSON.parse(await readFile(`${root}/verse-163-repair-plan.json`,'utf8')):plan.batches[index];const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/${audioStem}.mp3`))],{type:'audio/mpeg'}),'recitation.mp3');form.append('text',b.text);
  const attempt:any={state:'submitted',characters:b.text.length,scope:'Word-highlight synchronization for user-approved Vignanam recitation',includedCreditsOnly:true,submittedAt:new Date().toISOString()};await save(stem+'-attempt',attempt);
  try{const r=await fetch('https://api.elevenlabs.io/v1/forced-alignment',{method:'POST',headers,body:form,signal:AbortSignal.timeout(300000)});attempt.httpStatus=r.status;if(!r.ok){attempt.state='rejected';await save(stem+'-attempt',attempt);throw Error('Alignment rejected');}await save(stem,await r.json());attempt.state='completed';await save(stem+'-attempt',attempt);console.log(JSON.stringify({batch:index,acousticTiming:'completed'}));}catch{if(attempt.state==='submitted'){attempt.state='unknown';await save(stem+'-attempt',attempt);}throw Error('Alignment stopped; no duplicate retry');}
 }
}
main().catch(()=>{console.error('Acoustic timing stopped; inspect saved attempts.');process.exitCode=1;}).finally(()=>db.$disconnect());
