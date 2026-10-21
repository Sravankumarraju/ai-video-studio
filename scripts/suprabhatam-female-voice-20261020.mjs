import {credential,db} from './anjaneya-dandakam-audio.mjs';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='output/sri-venkateswara-female-voice-2026-10-20';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
const description='An original South Indian woman in her early forties with a warm, luminous, naturally feminine middle register and a gentle Telugu accent. Clear resonant devotional recital voice, serene and reverent, smooth connected rhythmic phrases and short natural breaths at complete line boundaries. Carefully articulate Sanskrit prayers written in Telugu script, preserving long vowels and consonant clusters. Moderate unhurried pace, expressive but restrained intonation, intimate dry studio recording, clean and intelligible.';
async function post(name,endpoint,body,key){
 assert(!await exists(`${name}-attempt.json`),'Inspect existing attempt before retry');
 const attempt={state:'submitted',maximumCalls:1,submittedAt:new Date().toISOString()};await save(`${name}-attempt`,attempt);
 try{const r=await fetch('https://api.elevenlabs.io/v1/'+endpoint,{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(240000)});
 attempt.httpStatus=r.status;const result=await r.json();
 if(!r.ok){attempt.state='rejected';await save(`${name}-error`,result);await save(`${name}-attempt`,attempt);throw Error('Provider rejected '+name);}
 await save(name,result);attempt.state='completed';await save(`${name}-attempt`,attempt);return result;
 }catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save(`${name}-attempt`,attempt);}throw e;}
}
async function main(){
 await mkdir(root,{recursive:true});
 const units=(await readFile('output/sri-venkateswara-instrumental-2026-10-20/complete-lyrics-telugu.txt','utf8')).trim().split('\n\n');
 const text=units.slice(0,2).join('\n\n');await writeFile(`${root}/sample-lyrics-telugu.txt`,text);
 const key=await credential();const headers={'xi-api-key':key};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers});assert(check.ok,'Credit check failed');const info=await check.json();
 const remaining=info.character_limit-info.character_count;
 await save('credit-check',{remainingCredits:remaining,fullPrayerCharacters:units.join('\n\n').length,fullVocalGenerationBlocked:remaining<units.join('\n\n').length});
 assert(remaining>=text.length*2+400,'Insufficient included credits for voice sample');
 const request={voice_description:description,model_id:'eleven_ttv_v3',text,auto_generate_text:false,seed:20261020,guidance_scale:5};
 await save('voice-design-request',request);
 const design=await exists('voice-design.json')?JSON.parse(await readFile(`${root}/voice-design.json`,'utf8')):await post('voice-design','text-to-voice/design?output_format=mp3_44100_128',request,key);
 assert(design.previews?.length,'No voice previews');
 for(const [i,p] of design.previews.entries())await writeFile(`${root}/female-voice-option-${i+1}.mp3`,Buffer.from(p.audio_base_64,'base64'));
 const created=await exists('channel-voice.json')?JSON.parse(await readFile(`${root}/channel-voice.json`,'utf8')):await post('channel-voice','text-to-voice',{voice_name:'Sri Venkateswara - Original Female Telugu',voice_description:description,generated_voice_id:design.previews[0].generated_voice_id},key);
 assert(created.voice_id,'Missing saved voice ID');
 await save('voice-plan',{voiceId:created.voice_id,name:created.name,originalDesignedVoice:true,referenceAudioUsed:false,provisionalPreviewChoice:1,model:'eleven_v4',language:'te',sampleVerses:[1,2],fullPrayerVerses:29,fullAudioCreated:false,pronunciationListeningReviewPending:true});
 if(!await exists('sample.mp3')){
 const input={inputs:[{voice_id:created.voice_id,text:'[reverent] [rhythmic devotional chanting]\n'+text}],model_id:'eleven_v4',language_code:'te'};
 await save('sample-request',input);
 const result=await exists('sample-response.json')?JSON.parse(await readFile(`${root}/sample-response.json`,'utf8')):await post('sample-response','text-to-dialogue/with-timestamps?output_format=mp3_44100_128',input,key);
 assert(result.audio_base64&&result.alignment,'Missing audio or timing');
 await writeFile(`${root}/sample.mp3`,Buffer.from(result.audio_base64,'base64'));await save('sample-alignment',result.alignment);
 }
 console.log(JSON.stringify({voiceId:created.voice_id,sample:`${root}/sample.mp3`,voiceOptions:design.previews.length,fullAudioCreated:false}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Voice creation stopped; inspect saved attempts. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
