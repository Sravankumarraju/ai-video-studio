import assert from 'node:assert/strict';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='output/sri-venkateswara-instrumental-2026-10-20';
const save=(name,value)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
async function exists(p){try{await access(p);return true;}catch{return false;}}
async function main(){
 await mkdir(root,{recursive:true});
 if(await exists(`${root}/instrumental.mp3`)){console.log('Saved instrumental available');return;}
 assert(!await exists(`${root}/elevenlabs-attempt.json`),'Inspect previous attempt before retrying');
 const key=await credential();
 const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
 assert(r.ok,'Subscription check failed');const sub=await r.json();
 const remaining=Number(sub.character_limit)-Number(sub.character_count);
 await save('credit-check',{tier:sub.tier,remainingCredits:remaining,estimatedGenerationCredits:2700,actualCharge:null});
 assert(sub.tier!=='free'&&remaining>=3200,'Insufficient included credits');
 const request={model_id:'music_v2_5',music_length_ms:180000,force_instrumental:true,prompt:'Compose an original three minute Carnatic devotional instrumental for morning worship of Lord Sri Venkateswara. Sacred peaceful Tirumala temple dawn atmosphere. Expressive acoustic veena and bamboo venu flute share a fresh flowing melody inspired by the gentle morning raga Bowli, warm continuous tanpura drone, delicate restrained mridangam, occasional soft temple bells. Slow meditative 64 BPM, patient melodic development, graceful variations across the full three minutes, spacious natural acoustic recording, reverent serene mood. Begin softly with tanpura and veena; flute enters gradually; a gently luminous middle; resolve the final twenty seconds peacefully. Entirely instrumental, clean warm master. Original melody and arrangement.'};
 await save('elevenlabs-request',request);
 const attempt={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,actualCharge:null,authorization:'User requested an instrumental devotional video with Telugu verses and explicitly specified ElevenLabs.'};
 await save('elevenlabs-attempt',attempt);
 try{
 const response=await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(900000)});
 attempt.httpStatus=response.status;attempt.songId=response.headers.get('song-id');
 if(!response.ok){await save('provider-error',await response.json().catch(()=>({})));attempt.state='rejected';await save('elevenlabs-attempt',attempt);throw Error('ElevenLabs rejected generation');}
 const audio=Buffer.from(await response.arrayBuffer());assert(audio.length>10000,'Empty audio');
 await writeFile(`${root}/instrumental.mp3`,audio);attempt.state='completed';attempt.bytes=audio.length;await save('elevenlabs-attempt',attempt);
 console.log(JSON.stringify({state:attempt.state,bytes:audio.length,file:`${root}/instrumental.mp3`}));
 }catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save('elevenlabs-attempt',attempt);}throw e;}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Audio generation stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());

