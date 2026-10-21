import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';

const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';
const mode=process.argv[2];
const save=(name:string,value:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
async function exists(name:string){try{await readFile(`${root}/${name}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 assert(['prepare','check','generate'].includes(mode),'Choose prepare, check or generate');
 const captions=JSON.parse(await readFile(`${root}/SAMPLE-CAPTIONS.json`,'utf8'));
 assert.equal(captions.phrases.length,12);
 const lyrics=captions.phrases.map((p:any)=>p.sanskrit).join('\n');
 const request={model_id:'music_v2_5',composition_plan:{chunks:[{text:lyrics,duration_ms:75000,positive_styles:[
 'clear measured Sanskrit devotional chanting of the exact supplied text in order, each phrase once',
 'steady traditional stotra cadence, natural short pauses between clauses, clear vowel lengths and consonants',
 'warm resonant devotional lead, voice prominently above very quiet tanpura, sparse instrumental support',
 'no melodic stretching of syllables, minimal reverb, no imitation of a named performer',
 'brief quiet resolution after the final supplied phrase, no extra words'
 ],negative_styles:['extra lyrics','omitted words','repeated phrases','spoken verse numbers','refrains','pop melody','rushed consonants','long melisma','heavy percussion','loud bells','heavy reverb'],context_adherence:'high'}]}};
 await save('sample-request',request);
 if(mode==='prepare'){console.log(JSON.stringify({prepared:true,seconds:75,phrases:12,paidCalls:0}));return;}
 let key=process.env.ELEVENLABS_API_KEY;
 if(!key||/^(<|PASTE|your)/i.test(key)){const profile=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});key=decrypt(profile.encryptedKey);}
 const headers={'xi-api-key':key!};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});
 assert(check.ok,`Subscription check HTTP ${check.status}`);
 const info=await check.json();const remaining=Number(info.character_limit)-Number(info.character_count);
 const access={checkedAt:new Date().toISOString(),tier:info.tier,remainingCredits:remaining,httpStatus:check.status,scope:'one 75-second sample; no full recitation',maximumNewCalls:1};
 await save('sample-access',access);
 if(mode==='check'){console.log(JSON.stringify(access));return;}
 assert(info.tier!=='free'&&Number.isFinite(remaining)&&remaining>=12500,'Insufficient included credit headroom; no overage or policy changes permitted');
 assert(!await exists('sample-attempt.json'),'An attempt already exists. Inspect it; no automatic duplicate generation.');
 const record:any={state:'submitted',submittedAt:new Date().toISOString(),seconds:75,maximumCalls:1,authorization:'User explicitly requested a 60–90-second chant pronunciation sample before full recording in the pasted rewrite instructions.',model:request.model_id,actualCharge:null,reviewStatus:'unreviewed AI chant sample; competent Sanskrit reciter review required'};
 await save('sample-attempt',record);
 try{
  const response=await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});
  record.httpStatus=response.status;
  if(!response.ok){const error=await response.json().catch(()=>({}));const status=error.detail?.status;record.state='rejected';record.reason=typeof status==='string'&&/^[a-z_]{1,100}$/.test(status)?status:'provider_rejected';await save('sample-attempt',record);console.log(JSON.stringify(record));return;}
  const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length>10000,'Audio response too small');
  await writeFile(`${root}/lalita-chant-sample-unreviewed.mp3`,bytes);
  record.state='completed';record.bytes=bytes.length;record.completedAt=new Date().toISOString();record.file='lalita-chant-sample-unreviewed.mp3';await save('sample-attempt',record);
  console.log(JSON.stringify(record));
 }catch{
  if(record.state==='submitted'){record.state='unknown';record.reason='transport_or_save_failed_no_retry';await save('sample-attempt',record);}
  throw Error('Sample generation outcome uncertain. Inspect saved attempt; no automatic retry.');
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Sample operation failed; credentials were not logged.');process.exitCode=1;}).finally(()=>db.$disconnect());
