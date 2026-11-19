import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const parent='data/productions/divine-wisdom/mahishasura-mardini-2026-10-25';
const root=parent+'/female-full-v3';
const read=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function parse(name,record){
 const bytes=await readFile(`${root}/${name}-response.bin`);
 if(/^audio\//i.test(record.contentType||'')){await writeFile(`${root}/${name}.mp3`,bytes);return;}
 const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];assert(boundary,'Missing response boundary');
 const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;
  const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));
  if(split>=0){const h=part.subarray(0,split).toString();let b=part.subarray(split+4);if(b.subarray(-2).toString()==='\r\n')b=b.subarray(0,-2);
   if(/application\/json/i.test(h))await save(`${name}-metadata`,JSON.parse(b.toString()));
   else if(/audio\//i.test(h)){await writeFile(`${root}/${name}.mp3`,b);found=true;}}
  pos=next;
 }assert(found,'Audio missing; saved response retained');
}
async function main(){
 const mode=process.argv[2];assert(['music','bookends'].includes(mode));
 const p=await read('full-production-plan');assert(p.creditCapIncreaseApproved&&p.totalExistingCreditCap===13000);
 const auth='Owner approved female full chanting video, voice prominent and music quieter, complete-shloka highlighting, welcome and all four closing prompts; total cap raised to 13000 existing ElevenLabs credits including prior usage; no topups or overage.';
 const original=JSON.parse(await readFile(`${parent}/credit-ledger.json`,'utf8'));
 const key=await credential(),headers={'xi-api-key':key};
 async function balance(){let r;for(let n=0;n<3;n++){r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});if(r.ok||r.status!==429&&r.status<500)break;await new Promise(resolve=>setTimeout(resolve,10000));}assert(r.ok,`Credit check HTTP ${r.status}`);const s=await r.json();return {used:Number(s.character_count),remaining:Number(s.character_limit)-Number(s.character_count),tier:s.tier};}
 let ledger;
 if(await exists('generation-ledger.json'))ledger=await read('generation-ledger');
 else {const b=await balance();const reserve=9000+2*(p.welcome.length+p.closing.length);assert(b.tier!=='free'&&b.remaining>=reserve&&b.used-original.baselineUsed+reserve<=13000,'Insufficient included balance or overall cap');ledger={initialUsed:b.used,priorVideoObserved:b.used-original.baselineUsed,totalCap:13000,reservedCompleted:0,authorization:auth};await save('generation-ledger',ledger);}
 async function submit(name,endpoint,body,reserve,music){
  if(await exists(`${name}-attempt.json`)){const a=await read(`${name}-attempt`);assert(a.state==='completed','Prior attempt unresolved; no automatic regeneration');if(music)await parse(name,a);return;}
  const b=await balance();const spent=Math.max(b.used-original.baselineUsed,ledger.priorVideoObserved+ledger.reservedCompleted);
  assert(b.tier!=='free'&&b.remaining>=reserve&&spent+reserve<=13000,'Overall credit cap or included balance would be exceeded');
  const a={state:'submitted',submittedAt:new Date().toISOString(),beforeUsed:b.used,reservedCredits:reserve,authorization:auth,maximumCalls:1};await save(`${name}-request`,body);await save(`${name}-attempt`,a);
  try{
   const r=await fetch('https://api.elevenlabs.io/v1/'+endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(900000)});
   a.httpStatus=r.status;a.contentType=r.headers.get('content-type');a.songId=r.headers.get('song-id');
   if(!r.ok){await save(`${name}-provider-error`,await r.json().catch(()=>({})));a.state='rejected';await save(`${name}-attempt`,a);throw Error(`Provider HTTP ${r.status}`);}
   const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/${name}-response.bin`,bytes);
   if(music)await parse(name,a);else {const d=JSON.parse(bytes.toString());assert(d.audio_base64&&d.alignment);await writeFile(`${root}/${name}.mp3`,Buffer.from(d.audio_base64,'base64'));await save(`${name}-alignment`,d.alignment);}
   a.state='completed';a.completedAt=new Date().toISOString();a.bytes=bytes.length;await save(`${name}-attempt`,a);ledger.reservedCompleted+=reserve;await save('generation-ledger',ledger);
   console.log(JSON.stringify({section:name,state:a.state,reservedCredits:ledger.reservedCompleted}),null,0);
  }catch(e){if(a.state==='submitted'){a.state='unknown';await save(`${name}-attempt`,a);}throw e;}
 }
 if(mode==='music')for(const b of p.batches){const name=`batch-${String(b.index).padStart(2,'0')}`;await submit(name,'music/detailed?output_format=mp3_48000_192',await read(name+'-request'),b.conservativeCredits,true);}
 else for(const name of ['welcome','closing']){
  // Existing accessible Telugu female voice is used only for spoken channel bookends.
  await submit(name,'text-to-dialogue/with-timestamps',{inputs:[{text:p[name],voice_id:'9dQiWzuJKan0MNO2wA8U'}],model_id:'eleven_v4',language_code:'te'},p[name].length*2,false);
 }
 const after=await balance();await save(`status-${mode}`,{state:'completed',observedVideoCreditDelta:after.used-original.baselineUsed,creditMeterMayLag:true,totalCap:13000});
 assert(after.used-original.baselineUsed<=13000,'Video credit cap reached');
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Production stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
