import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const base='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';
const root=base+'/video-02-recitation/male-voice-sample-2026-10-14';
const voiceId='sJrRcQEpUbZehhGBdEbD';
const save=(name:string,data:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(data,null,2));
async function exists(name:string){try{await stat(`${root}/${name}`);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 await mkdir(root,{recursive:true});
 const source=JSON.parse(await readFile(`${base}/SAMPLE-CAPTIONS.json`,'utf8'));
 assert.equal(source.phrases.length,12);
 const text=source.phrases.map((p:any)=>p.teluguScript.replace(/-/g,' ').replace(/॥/g,'.').replace(/।/g,',')).join('\n');
 const request={inputs:[{text,voice_id:voiceId}],model_id:'eleven_v4',language_code:'te'};
 await save('request',request);await writeFile(`${root}/sample-text.txt`,text,'utf8');
 await save('plan',{scope:'Only verses 1–6 sample; no full-video regeneration',voiceId,voiceSource:'Existing Divine Wisdom Gita male narration voice',characters:text.length,maximumNewCalls:1,billing:'Included credits only; no overage',delivery:'Natural spoken recitation, no singing model, no music or pitch processing',userApprovalForFullReplacement:false,authorization:'User requested same existing male voice, smoother faster pronunciation, sample first, full replacement only after approval.'});
 if(process.argv[2]==='prepare'){console.log(JSON.stringify({prepared:true,characters:text.length,maximumNewCalls:1}));return;}
 if(await exists('sample.mp3')){console.log('Existing sample retained; no duplicate paid call.');return;}
 assert(!await exists('attempt.json'),'Prior attempt exists; inspect outcome before retrying.');
 let key=process.env.ELEVENLABS_API_KEY;
 if(!key||/^(<|PASTE|your)/i.test(key)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});key=decrypt(p.encryptedKey);}
 const headers={'xi-api-key':key!};
 const vr=await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`,{headers,signal:AbortSignal.timeout(30000)});assert(vr.ok,'Existing voice inaccessible');const voice=await vr.json();
 await save('voice-check',{voiceId:voice.voice_id,name:voice.name,labels:voice.labels});
 console.log(JSON.stringify({voiceId:voice.voice_id,name:voice.name,gender:voice.labels?.gender}));
 const cr=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(cr.ok,'Credit check rejected');const info=await cr.json();const remaining=Number(info.character_limit)-Number(info.character_count);assert(Number.isFinite(remaining)&&remaining>=text.length*2&&info.tier!=='free','Insufficient included credits; no overage');
 await save('credit-check',{remainingCredits:remaining,characters:text.length,maximumCalls:1});
 const attempt:any={state:'submitted',submittedAt:new Date().toISOString(),voiceId,characters:text.length,model:'eleven_v4',scope:'one sample only; user explicitly requested this sample'};await save('attempt',attempt);
 try{
  const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});
  attempt.httpStatus=r.status;
  if(!r.ok){attempt.state='rejected';await save('attempt',attempt);throw Error('Provider rejected sample');}
  const result=await r.json();assert(result.audio_base64&&result.alignment,'Missing sample audio or timestamps');
  await writeFile(`${root}/sample.mp3`,Buffer.from(result.audio_base64,'base64'));await save('alignment',result.alignment);
  attempt.state='completed';attempt.completedAt=new Date().toISOString();await save('attempt',attempt);console.log(JSON.stringify({state:'completed',file:`${root}/sample.mp3`,fullRegenerationStarted:false}));
 }catch{if(attempt.state==='submitted'){attempt.state='unknown';await save('attempt',attempt);}throw Error('Sample operation stopped; inspect attempt; no automatic retry.');}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Sample operation stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
