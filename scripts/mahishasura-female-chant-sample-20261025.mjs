import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const parent='data/productions/divine-wisdom/mahishasura-mardini-2026-10-25';
const root=parent+'/chant-female-sample-v1';
const read=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function parse(record){
 const bytes=await readFile(`${root}/song-response.bin`);
 if(/^audio\//i.test(record.contentType||'')){await writeFile(`${root}/chant-sample.mp3`,bytes);return;}
 const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];
 assert(boundary,'Missing response boundary; saved response retained');
 const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;
  const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));
  if(split>=0){const h=part.subarray(0,split).toString();let b=part.subarray(split+4);
   if(b.subarray(-2).toString()==='\r\n')b=b.subarray(0,-2);
   if(/application\/json/i.test(h))await save('song-metadata',JSON.parse(b.toString()));
   else if(/audio\//i.test(h)){await writeFile(`${root}/chant-sample.mp3`,b);found=true;}}
  pos=next;
 }assert(found,'Missing audio; saved response retained');
}
async function main(){
 if(await exists('song-attempt.json')){const a=await read('song-attempt');assert(a.state==='completed','Prior attempt requires inspection; no automatic regeneration');await parse(a);console.log(JSON.stringify({recovered:true,file:`${root}/chant-sample.mp3`}));return;}
 const request=await read('sample-request'),brief=await read('revision-brief');
 const seconds=request.composition_plan.chunks.reduce((n,c)=>n+c.duration_ms,0)/1000;
 assert.equal(seconds,30);assert.equal(request.model_id,'music_v2_5');
 const authorization='Owner requested the female voice sample after the approved male sample. One 30-second female chant; keep male and female samples within 1000 existing credits combined and the video within 10000. No topups or overage. Full replacement awaits listening approval.';
 brief.sampleAuthorized=true;brief.authorization=authorization;await save('revision-brief',brief);
 const ledger=JSON.parse(await readFile(`${parent}/credit-ledger.json`,'utf8'));
 const key=await credential(),headers={'xi-api-key':key};
 async function balance(){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(r.ok,`Credit check HTTP ${r.status}`);const s=await r.json();return {used:Number(s.character_count),limit:Number(s.character_limit),remaining:Number(s.character_limit)-Number(s.character_count),tier:s.tier};}
 const before=await balance();
 const prior=JSON.parse(await readFile(`${parent}/chant-revision-v2/song-attempt.json`,'utf8'));
 const priorObserved=Math.max(0,before.used-prior.beforeUsed);assert(priorObserved+500<=1000,'Combined sample budget requires inspection');assert(before.tier!=='free'&&before.remaining>=500,'Insufficient included credits; no overage');
 const spent=before.used-ledger.baselineUsed;assert(spent>=0&&spent+500<=10000,'Overall video cap would be exceeded');
 await save('credit-check',{includedRemaining:before.remaining,videoCreditsObservedBefore:spent,sampleCap:500,combinedSampleCap:1000,priorObserved,videoCap:10000,estimatedSampleCredits:450,estimateBasis:'Official creative pricing: approximately 900 credits/minute; 30 seconds, one call only.',actualCharge:null});
 const record={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,authorization,contentType:null,beforeUsed:before.used,referenceAudioCopied:false};
 await save('song-attempt',record);brief.generationStarted=true;await save('revision-brief',brief);
 try{
  const r=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(900000)});
  record.httpStatus=r.status;record.contentType=r.headers.get('content-type');record.songId=r.headers.get('song-id');
  if(!r.ok){await save('provider-error',await r.json().catch(()=>({})));record.state='rejected';await save('song-attempt',record);throw Error('Provider rejected sample');}
  const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/song-response.bin`,bytes);record.bytes=bytes.length;record.state='completed';record.completedAt=new Date().toISOString();await save('song-attempt',record);await parse(record);
  try{const after=await balance();record.observedCreditDelta=after.used-before.used;record.videoObservedTotal=after.used-ledger.baselineUsed;record.chargeMayBeDelayed=true;await save('song-attempt',record);assert(record.observedCreditDelta<=500&&record.videoObservedTotal<=10000&&priorObserved+record.observedCreditDelta<=1000,'Observed credit cap reached');}catch(e){if(e instanceof assert.AssertionError)throw e;}
  console.log(JSON.stringify({state:'completed',secondsRequested:seconds,file:`${root}/chant-sample.mp3`,fullReplacementStarted:false}));
 }catch(e){if(record.state==='submitted'){record.state='unknown';await save('song-attempt',record);}throw e;}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Chant sample stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
