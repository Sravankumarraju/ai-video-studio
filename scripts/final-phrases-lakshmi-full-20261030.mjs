import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30';
const read=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function parse(name,a){
 const bytes=await readFile(`${root}/${name}-response.bin`);
 if(/^audio\//i.test(a.contentType||'')){await writeFile(`${root}/${name}.mp3`,bytes);return;}
 const boundary=/boundary="?([^";\s]+)/i.exec(a.contentType||'')?.[1];assert(boundary,'Missing multipart boundary');
 const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),audio=false,meta=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));
  if(split>=0){const h=part.subarray(0,split).toString();let body=part.subarray(split+4);if(body.subarray(-2).toString()==='\r\n')body=body.subarray(0,-2);
   if(/application\/json/i.test(h)){await save(name+'-metadata',JSON.parse(body.toString()));meta=true;}else if(/audio\//i.test(h)){await writeFile(`${root}/${name}.mp3`,body);audio=true;}}
  pos=next;
 }assert(audio&&meta,'Audio or timestamp metadata missing; saved result retained');
}
async function main(){
 const p=await read('final-phrases-plan');const key=await credential(),headers={'xi-api-key':key};
 async function balance(){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(r.ok,`Credit check HTTP ${r.status}`);const b=await r.json();return {used:Number(b.character_count),remaining:Number(b.character_limit)-Number(b.character_count),tier:b.tier};}
 let ledger;if(await exists('final-phrases-ledger.json'))ledger=await read('final-phrases-ledger');else{const b=await balance();assert(b.tier!=='free'&&b.remaining>=p.overallIncludedCreditsReserve,'Insufficient included credits; no overage');ledger={initialBalance:b,maximumGenerationCalls:p.batches.length,reservedCompleted:0,reserveCredits:p.overallIncludedCreditsReserve,authorization:p.authorization};await save('final-phrases-ledger',ledger);}
 for(const b of p.batches){
  const n=b.name;
  if(await exists(n+'-attempt.json')){const a=await read(n+'-attempt');assert(a.state==='completed','Existing unresolved attempt; no automatic regeneration');await parse(n,a);console.log(JSON.stringify({batch:n,reused:true}));continue;}
  const bal=await balance();assert(bal.tier!=='free'&&bal.remaining>=b.reserveCredits&&ledger.reservedCompleted+b.reserveCredits<=ledger.reserveCredits,'Included balance/reserve insufficient');
  const a={state:'submitted',submittedAt:new Date().toISOString(),beforeBalance:bal,reservedCredits:b.reserveCredits,maximumCalls:1,authorization:p.authorization};await save(n+'-attempt',a);
  console.log(JSON.stringify({batch:n,state:'generating',seconds:b.seconds}));
  try{
   const r=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(await read('requests/'+n)),signal:AbortSignal.timeout(900000)});
   a.httpStatus=r.status;a.contentType=r.headers.get('content-type');a.songId=r.headers.get('song-id');
   if(!r.ok){const error=await r.json().catch(()=>({}));await save(n+'-provider-error',error);a.state='rejected';await save(n+'-attempt',a);throw Error(`Provider HTTP ${r.status}; no automatic retry`);}
   const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/${n}-response.bin`,bytes);a.bytes=bytes.length;a.state='completed';a.completedAt=new Date().toISOString();await save(n+'-attempt',a);await parse(n,a);
   ledger.reservedCompleted+=b.reserveCredits;await save('final-phrases-ledger',ledger);console.log(JSON.stringify({batch:n,state:'completed'}));
  }catch(e){if(a.state==='submitted'){a.state='unknown';await save(n+'-attempt',a);}throw e;}
 }
 const after=await balance();await save('final-phrases-completed',{state:'completed',after,observedAccountCreditDelta:after.used-ledger.initialBalance.used,meterMayLag:true});
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||e.message?.startsWith('Provider HTTP')?e.message:'Generation stopped; inspect saved attempts. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
