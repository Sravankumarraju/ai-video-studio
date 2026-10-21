import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const base='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation';
const root=base+'/priest-chant-sample-2026-10-14';
const save=(n:string,d:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(d,null,2));
async function exists(n:string){try{await stat(`${root}/${n}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 await mkdir(root,{recursive:true});
 const plan=JSON.parse(await readFile(`${base}/vignanam-v3/plan.json`,'utf8'));
 const units=plan.batches.flatMap((b:any)=>b.units).filter((u:any)=>u.verse>=1&&u.verse<=4);
 const direction='[rhythmic devotional chanting] [reverent]';
 let text=direction+'\n';const entries=[];
 for(const u of units){if(entries.length)text+='\n\n';const body=u.text.replace(/ , /g,',\n').replace(/ \.$/,'.');const start=text.length;text+=body;entries.push({verse:u.verse,displayText:u.displayText,text:body,startCharacter:start,endCharacter:text.length});}
 const request={inputs:[{text,voice_id:plan.voiceId}],model_id:'eleven_v4',language_code:'te'};
 await save('request',request);await save('plan',{voiceId:plan.voiceId,voiceName:'God Voice Tone Male',model:'eleven_v4',units:entries,characters:text.length,maximumNewCalls:1,fullVideoGenerationApproved:false,desiredDelivery:'Temple-style priest recitation: steady rhythmic rise and fall, clear Sanskrit, natural pace, no pop tune or added lyrics',captionStyle:'Complete shloka held on screen, speaking word gold, other words white',userAuthorization:'User requests priest-style chanting instead of reading; existing sample-first approval gate retained; user requests full shloka display.'});
 if(process.argv[2]==='prepare'){console.log(JSON.stringify({prepared:true,characters:text.length,verses:4,maximumNewCalls:1}));return;}
 if(await exists('sample.mp3')){console.log('Existing sample retained.');return;}assert(!await exists('attempt.json'),'Uncertain prior attempt; no automatic retry');
 let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key))key=decrypt((await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);
 const headers={'xi-api-key':key!};const c=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(c.ok);const credits=await c.json();assert(credits.character_limit-credits.character_count>=text.length*2&&credits.tier!=='free','Insufficient included credits; no overage');
 const attempt:any={state:'submitted',characters:text.length,maximumCalls:1,voiceId:plan.voiceId,submittedAt:new Date().toISOString(),authorization:'One priest-style sample requested by user; no full replacement yet'};await save('attempt',attempt);
 try{const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});attempt.httpStatus=r.status;if(!r.ok){attempt.state='rejected';await save('attempt',attempt);throw Error('Sample rejected');}const d=await r.json();assert(d.audio_base64&&d.alignment);await writeFile(`${root}/sample.mp3`,Buffer.from(d.audio_base64,'base64'));await save('alignment',d.alignment);attempt.state='completed';await save('attempt',attempt);console.log(JSON.stringify({sample:'completed',file:root+'/sample.mp3',fullReplacementStarted:false}));}catch{if(attempt.state==='submitted'){attempt.state='unknown';await save('attempt',attempt);}throw Error('Sample stopped; inspect attempt before retry');}
}
main().catch(()=>{console.error('Sample stopped; inspect saved attempt; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
