import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30';
const read=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 const p=await read('full-production-plan');const key=await credential(),headers={'xi-api-key':key};
 const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(r.ok,'Included credit check failed');const b=await r.json();const reserve=2*(p.welcome.length+p.closing.length);assert(b.tier!=='free'&&b.character_limit-b.character_count>=reserve,'Insufficient included credits; no overage');
 for(const name of ['welcome','closing']){
  if(await exists(name+'-attempt.json')){assert((await read(name+'-attempt')).state==='completed','Existing attempt unresolved');continue;}
  const a={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,authorization:'User asked to add the opening channel welcome and stotra details, closing subscribe like share comment, using existing videos as reference. These are original Telugu spoken bookends for the approved new original prayer collection.'};await save(name+'-attempt',a);
  try{
   const response=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(await read(name+'-request')),signal:AbortSignal.timeout(300000)});a.httpStatus=response.status;
   if(!response.ok){await save(name+'-provider-error',await response.json().catch(()=>({})));a.state='rejected';await save(name+'-attempt',a);throw Error('Bookend rejected');}
   const d=await response.json();assert(d.audio_base64&&d.alignment,'Missing bookend audio/alignment');await save(name+'-response',d);await writeFile(`${root}/${name}.mp3`,Buffer.from(d.audio_base64,'base64'));await save(name+'-alignment',d.alignment);a.state='completed';a.completedAt=new Date().toISOString();await save(name+'-attempt',a);console.log(JSON.stringify({bookend:name,state:'completed'}));
  }catch(e){if(a.state==='submitted'){a.state='unknown';await save(name+'-attempt',a);}throw e;}
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Bookends stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
