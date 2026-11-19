import {credential,db} from './anjaneya-dandakam-audio.mjs';
import {readFile,writeFile,rename} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom/lalitha-ashtottara-2026-10-25';
try{
 const data=JSON.parse(await readFile(`${root}/provider-shared-telugu-check.json`,'utf8'));
 const voice=data.data.voices.find(x=>x.voice_id==='EohubqvAiTiSkWCp1vu7');assert(voice&&voice.rate===1);
 const key=await credential();const r=await fetch(`https://api.elevenlabs.io/v1/voices/add/${voice.public_owner_id}/${voice.voice_id}`,{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({new_name:'Srirama V - Lalitha review draft'}),signal:AbortSignal.timeout(30000)});
 const result=await r.json();await writeFile(`${root}/voice-selection.json`,JSON.stringify({status:r.status,result,voiceName:voice.name,oldVoiceUnavailable:true,expertReviewPending:true},null,2));assert(r.ok,'Could not add selected public library voice');
 const p=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));p.voiceId=result.voice_id||voice.voice_id;await writeFile(`${root}/plan.json`,JSON.stringify(p,null,2));
 const a=JSON.parse(await readFile(`${root}/batch-00-attempt.json`,'utf8'));assert(a.state==='rejected'&&a.httpStatus===404);await rename(`${root}/batch-00-attempt.json`,`${root}/batch-00-legacy-voice-rejected.json`);
 console.log(JSON.stringify({selected:voice.name,voiceId:p.voiceId,status:r.status,priorRequest:'explicitly_rejected_404'}));
}catch(e){console.error(e instanceof assert.AssertionError?e.message:'Voice selection stopped; inspect saved result. Credentials suppressed.');process.exitCode=1;}finally{await db.$disconnect();}
