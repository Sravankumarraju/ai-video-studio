import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation';
const save=(n:string,v:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n:string){try{await readFile(`${root}/${n}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 const plan=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});key=decrypt(p.encryptedKey);}const headers={'xi-api-key':key!};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(check.ok);const info=await check.json();assert(info.character_limit-info.character_count>=12500,'Insufficient included-credit headroom; no overage');await save('alignment-credit-check',{remainingCredits:info.character_limit-info.character_count});
 for(const b of plan.batches){const stem=`batch-${String(b.index).padStart(2,'0')}-alignment`;if(await exists(stem+'.json'))continue;assert(!await exists(stem+'-attempt.json'),'Existing alignment attempt prevents duplicate call');
  const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/batch-${String(b.index).padStart(2,'0')}.mp3`))],{type:'audio/mpeg'}),'chant.mp3');form.append('text',b.chunks.map((c:any)=>c.text).join('\n'));
  const record:any={state:'submitted',submittedAt:new Date().toISOString(),scope:'Acoustic verification and captions for full recitation',actualCharge:null};await save(stem+'-attempt',record);
  try{const r=await fetch('https://api.elevenlabs.io/v1/forced-alignment',{method:'POST',headers,body:form,signal:AbortSignal.timeout(300000)});record.httpStatus=r.status;if(!r.ok){record.state='rejected';await save(stem+'-attempt',record);throw Error('Alignment rejected');}await save(stem,await r.json());record.state='completed';await save(stem+'-attempt',record);console.log(JSON.stringify({batch:b.index+1,alignment:'completed'}));}catch{if(record.state==='submitted'){record.state='unknown';await save(stem+'-attempt',record);}throw Error('Inspect saved attempt; no automatic duplicate call');}
 }
}
main().catch(()=>{console.error('Alignment stopped; saved attempts retained, credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
