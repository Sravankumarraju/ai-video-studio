import 'dotenv/config';
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';

const root='data/productions/divine-wisdom/hanuman-chalisa/sung-preview-2026-10-06';
const lyrics=[
`శ్రీ గురు చరణ సరోజ రజ నిజమన ముకుర సుధారి ।
వరణౌ రఘువర విమలయశ జో దాయక ఫలచారి ॥
బుద్ధిహీన తనుజానికై సుమిరౌ పవన కుమార ।
బల బుద్ధి విద్యా దేహు మోహి హరహు కలేశ వికార ॥`,
`జయ హనుమాన జ్ఞాన గుణ సాగర ।
జయ కపీశ తిహు లోక ఉజాగర ॥
రామదూత అతులిత బలధామా ।
అంజని పుత్ర పవనసుత నామా ॥`
];
const styles=[
 'original Indian devotional melody, powerful and uplifting',
 'rich resonant male baritone lead, expressive fully sung vocals',
 'traditional Awadhi words transliterated in Telugu script, pronounce the supplied words faithfully without translation',
 'clear consonants, sustained vowels, intelligible lyrics',
 'pakhawaj and dhol with tabla, harmonium and tanpura',
 'cinematic strings and restrained temple bells',
 'steady devotional pulse at 84 BPM',
 'lead vocals prominent above accompaniment, controlled bass, clean studio mix',
 'new melody and musical arrangement, no imitation of an existing recording'
];
const negative=['spoken narration','whispering','mumbled words','rushed syllables','extra lyrics','omitted lyrics','rap','EDM','distortion','heavy reverb','screaming'];
const request={model_id:'music_v2_5',composition_plan:{chunks:lyrics.map((text,i)=>({text:`[${i===0?'Opening':'Verse'}]\n${text}`,duration_ms:30000,positive_styles:i===0?styles:[...styles,'fuller percussion and a supporting male chorus on the supplied words'],negative_styles:negative,context_adherence:'high'}))}};

async function main(){
 const mode=process.argv[2]; assert(['prepare','check','generate'].includes(mode),'Choose prepare, check or generate');
 await mkdir(root,{recursive:true});
 await writeFile(`${root}/request.json`,JSON.stringify(request,null,2));
 await writeFile(`${root}/sample-lyrics.txt`,lyrics.join('\n\n')+'\n');
 await writeFile(`${root}/BRIEF.md`,'# Revised sung Chalisa preview\n\nUser rejected the previous original bhajan and supplied traditional Chalisa words in Telugu script. This preview uses the opening doha and first two chaupais exactly as supplied, removing only verse numbers. It is not a full performance. The eventual full version includes the supplied dhyanam before all forty chaupais, then the closing doha and invocations. Bracketed alternate readings will need one consistent selection before full production.\n\nOne 60-second music_v2_5 call, using the existing account. No copied audio, singer reference or reference melody. No automatic retries, no full-song call and no publishing. Review actual sung words and musical quality before expanding. Commercial use and copyright claims are not guaranteed by generation success.\n');
 if(mode==='prepare'){console.log(JSON.stringify({prepared:true,seconds:60,paidCalls:0,root}));return;}
 let key=process.env.ELEVENLABS_API_KEY;
 if(!key || /^(<|PASTE|your)/i.test(key)){
  const profile=await db.providerProfile.findUnique({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});
  assert(profile,'Saved ElevenLabs profile unavailable');key=decrypt(profile.encryptedKey);
 }
 const headers={'xi-api-key':key};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});
 assert(check.ok,`Subscription check rejected (${check.status})`);
 const info=await check.json();
 const remaining=Number(info.character_limit)-Number(info.character_count);
 const access={checkedAt:new Date().toISOString(),tier:info.tier,remainingCredits:remaining,httpStatus:check.status};
 await writeFile(`${root}/access.json`,JSON.stringify(access,null,2));
 if(mode==='check'){console.log(JSON.stringify(access));return;}
 assert(info.tier!=='free','Paid Music API access required');
 assert(Number.isFinite(remaining)&&remaining>=10000,'Insufficient included credits for bounded sample; no overage');
 const ledgerFile=`${root}/generation.json`;
 let exists=false;try{await readFile(ledgerFile);exists=true;}catch(e:any){if(e.code!=='ENOENT')throw e;}
 assert(!exists,'A generation attempt already exists. Inspect it before any further call.');
 const record:any={state:'submitted',submittedAt:new Date().toISOString(),seconds:60,maxCalls:1,authorization:'User requested a new version using the existing plan and supplied the exact prayer text',model:request.model_id,actualCharge:null};
 await writeFile(ledgerFile,JSON.stringify(record,null,2));
 try{
  const response=await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});
  record.httpStatus=response.status;record.songId=response.headers.get('song-id');record.requestId=response.headers.get('request-id');
  if(!response.ok){
   const error=await response.json().catch(()=>({}));
   record.state='rejected';
   const status=error.detail?.status;record.reason=typeof status==='string'&&/^[a-z_]{1,100}$/.test(status)?status:'provider_rejected';
   await writeFile(ledgerFile,JSON.stringify(record,null,2));
   console.log(JSON.stringify(record));return;
  }
  const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length>10000,'Audio response too small');
  record.file=`${root}/hanuman-chalisa-powerful-preview.mp3`;
  await writeFile(record.file,bytes);record.bytes=bytes.length;record.state='completed';record.completedAt=new Date().toISOString();
  await writeFile(ledgerFile,JSON.stringify(record,null,2));console.log(JSON.stringify(record));
 }catch{
  record.state='unknown';record.reason='transport_or_save_failed_no_retry';await writeFile(ledgerFile,JSON.stringify(record,null,2));throw Error('Generation outcome uncertain. Saved attempt prevents duplicate billing.');
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Operation failed; credentials were not logged');process.exitCode=1;}).finally(()=>db.$disconnect());
