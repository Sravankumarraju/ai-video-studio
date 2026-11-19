import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access,copyFile} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
import {root,specs,sources} from './ayyappa-deeksha-content-20261022.mjs';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
const exists=async n=>{try{await access(`${root}/${n}`);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
async function main(){
 await mkdir(`${root}/art`,{recursive:true});
 const voice=JSON.parse(await readFile('data/productions/divine-wisdom/hanuman-chalisa/explanation-te-2026-10-06/episode.json','utf8'));
 const sections=specs.map(([id,title,classification,image,text],index)=>({index,id,title,classification,image,text}));
 assert(sections.every(s=>s.text.length<=1800),'Keep narration calls short to avoid truncated performance');
 const characters=sections.reduce((n,s)=>n+s.text.length,0),words=sections.reduce((n,s)=>n+s.text.split(/\s+/u).length,0);
 const plan={title:'అయ్యప్ప దీక్ష ఎందుకు? — 41 రోజుల ఆచారం, అర్థం',channelName:'Divine Wisdom Telugu',language:'te',targetSeconds:[420,540],format:'16:9 1920x1080',sections,sources,voiceId:voice.voiceId,model:voice.model,characters,words,maximumNarrationCalls:sections.length,maximumCreditEstimate:characters*2,accountCreditsOnly:true,noOverage:true,published:false,authorization:'User asked start creating video, add channel logo and welcome, closing subscribe/like/share/comment, 4–5 images, thumbnail and all YouTube details. Included account credits only; no paid subscription changes or overage.',manualListeningVerified:false};
 await save('plan',plan);
 await writeFile(`${root}/script-telugu.txt`,sections.map(s=>`${s.title}\n${s.text}`).join('\n\n')+'\n');
 await copyFile('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',`${root}/channel-logo.png`);
 if(process.argv[2]==='prepare'){console.log(JSON.stringify({sections:sections.length,characters,words,voiceId:voice.voiceId}));return;}
 const pending=[];
 for(const s of sections){const stem=`voice-${String(s.index).padStart(2,'0')}`;if(await exists(`${stem}.mp3`)&&await exists(`${stem}-alignment.json`))continue;assert(!await exists(`${stem}-attempt.json`),'Existing unresolved attempt; inspect before retrying');pending.push(s);}
 if(!pending.length){console.log('All narration saved.');return;}
 const key=await credential();const headers={'xi-api-key':key};
 const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(response.ok,'Account credit check unavailable');
 const info=await response.json(),remaining=Number(info.character_limit)-Number(info.character_count),required=pending.reduce((n,s)=>n+s.text.length,0)*2;
 await save('credit-check',{checkedAt:new Date().toISOString(),tier:info.tier,remainingCredits:remaining,maximumEstimatedCredits:required,overageAllowed:false});
 assert(info.tier!=='free'&&Number.isFinite(remaining)&&remaining>=required,'Insufficient included credits; no overage allowed');
 const voiceCheck=await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voiceId}`,{headers,signal:AbortSignal.timeout(30000)});
 if(!voiceCheck.ok){
  const latest=JSON.parse(await readFile('data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22/plan.json','utf8'));
  assert(latest.voiceId,'Saved Telugu replacement voice missing');
  const alternate=await fetch(`https://api.elevenlabs.io/v1/voices/${latest.voiceId}`,{headers,signal:AbortSignal.timeout(30000)});assert(alternate.ok,'Saved Telugu voices unavailable');
  voice.voiceId=latest.voiceId;plan.voiceId=voice.voiceId;plan.voiceFallbackReason='Previous saved channel voice unavailable; using the current production Telugu bookend voice';await save('plan',plan);
 }
 console.log(JSON.stringify({stage:'narration-started',pending:pending.length,characters,maximumEstimatedCredits:required}));
 for(const s of pending){
  const stem=`voice-${String(s.index).padStart(2,'0')}`,attempt={state:'submitted',submittedAt:new Date().toISOString(),section:s.id,characters:s.text.length,model:voice.model,voiceId:voice.voiceId,actualCharge:null,authorization:plan.authorization};
  await save(`${stem}-attempt`,attempt);
  try{
   const r=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({inputs:[{text:s.text,voice_id:voice.voiceId}],model_id:voice.model,language_code:'te'}),signal:AbortSignal.timeout(300000)});
   attempt.httpStatus=r.status;
   if(!r.ok){attempt.state='rejected';await save(`${stem}-attempt`,attempt);throw Error(`Narration rejected HTTP ${r.status}`);}
   const raw=await r.text();await writeFile(`${root}/${stem}-response.json`,raw);const result=JSON.parse(raw);assert(result.audio_base64&&result.alignment,'Missing audio or timestamps');
   await writeFile(`${root}/${stem}.mp3`,Buffer.from(result.audio_base64,'base64'));await save(`${stem}-alignment`,result.alignment);
   attempt.state='completed';attempt.completedAt=new Date().toISOString();await save(`${stem}-attempt`,attempt);console.log(JSON.stringify({section:s.index+1,total:sections.length,status:'narration-saved'}));
  }catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save(`${stem}-attempt`,attempt);}throw e;}
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||e.message?.startsWith('Narration rejected')?e.message:'Production stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
