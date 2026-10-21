import 'dotenv/config';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const base='data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19';
const patterned=process.argv.includes('--reference-pattern');
const root=`${base}/${patterned?'measured-chant-reference-pattern-v1':'normal-spoken-sample-v1'}`;
const save=(n:string,v:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n:string){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function main(){
 await mkdir(root,{recursive:true});
 const source=JSON.parse(await readFile(`${base}/full-approved-natural-v3/plan.json`,'utf8'));
 const units=source.units.slice(0,2);assert.deepEqual(units.map((u:any)=>u.verse),[1,2]);
 const text=units.map((u:any)=>u.text).join('\n\n');const voiceId='sJrRcQEpUbZehhGBdEbD';
 await writeFile(`${root}/lyrics.txt`,text+'\n');
 const direction=patterned?'[rhythmic devotional chanting] [reverent] [steady pace]':'';
 await save('plan',{kind:patterned?'Measured devotional recitation, original voice, broad reference cadence only':'Plain spoken Sanskrit recitation in Telugu script',units,voiceId,model:'eleven_v4',singing:false,music:false,playbackTempo:1,
  reference:patterned?'https://www.youtube.com/watch?v=l0Yy-qOU5xY':undefined,
  deliveryTags:direction,referenceAudioDownloadedOrUploaded:false,voiceCloning:false,verseRepeats:false,
  fixedDuration:false,scope:'Opening two verses sample first for the newly requested normal reading direction',
  userDirection:'There is a silent gap in between; try normal reading instead of a song. Preserve original wording.',
  previousGapDetected:{startSeconds:36.587354,endSeconds:42.327667,durationSeconds:5.740312},
  fullNormalVersionStarted:false,pronunciationListeningReviewPending:true,publishApproved:false});
 if(await exists('sample.mp3')){console.log('Reusing saved normal reading sample');return;}
 assert(!await exists('generation.json'),'Existing generation attempt; inspect before retry');
 let key=process.env.ELEVENLABS_API_KEY;
 if(!key||/^(<|PASTE|your)/i.test(key))key=decrypt((await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);
 const headers={'xi-api-key':key!,Connection:'close'};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(check.ok,'Credit check failed');
 const a=await check.json();const remaining=Number(a.character_limit)-Number(a.character_count);
 assert(a.tier!=='free'&&remaining>=text.length*2+1000,'Insufficient included credits; no overage');
 await save('credits',{tier:a.tier,remainingIncludedCredits:remaining,checkedAt:new Date().toISOString()});
 const inputText=direction?direction+'\n'+text:text;
 const request={inputs:[{text:inputText,voice_id:voiceId}],model_id:'eleven_v4',language_code:'te'};
 await save('request',request);
 const record:any={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1};await save('generation',record);
 try{
  const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(180000)});
  record.httpStatus=r.status;
  if(!r.ok){await save('provider-error',await r.json().catch(()=>({})));record.state='rejected';await save('generation',record);throw Error('Narration rejected');}
  const result=await r.json();assert(result.audio_base64&&result.alignment);
  const bytes=Buffer.from(result.audio_base64,'base64');await writeFile(`${root}/sample.mp3`,bytes);await save('alignment',result.alignment);
  record.state='completed';record.completedAt=new Date().toISOString();record.bytes=bytes.length;await save('generation',record);
  const alignment=result.alignment;const offset=alignment.characters.join('').indexOf(text);assert(offset>=0,'Source lyrics missing from alignment');
  const words=[...text.matchAll(/\S+/g)].filter(m=>/[అ-౿]/.test(m[0])).map(m=>({text:m[0],start:Math.min(...alignment.character_start_times_seconds.slice(offset+m.index!,offset+m.index!+m[0].length)),end:Math.max(...alignment.character_end_times_seconds.slice(offset+m.index!,offset+m.index!+m[0].length))}));
  await save('timing-check',{words,collapsedWords:words.filter(w=>w.end-w.start<.04),pronunciationListeningReviewPending:true});
  console.log(JSON.stringify({state:'completed',words:words.length,collapsedWords:words.filter(w=>w.end-w.start<.04).length}));
 }catch(e){if(record.state==='submitted'){record.state='unknown';await save('generation',record);}throw e;}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Normal reading sample stopped; inspect saved records. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
