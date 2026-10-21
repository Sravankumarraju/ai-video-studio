import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='output/sri-venkateswara-female-sung-v2-2026-10-20';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function parse(record){
 const bytes=await readFile(`${root}/song-response.bin`);
 const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];
 assert(boundary,'Missing response boundary');const marker=Buffer.from('--'+boundary);
 let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;
 const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));
 if(split>=0){const h=part.subarray(0,split).toString();let b=part.subarray(split+4);if(b.subarray(-2).toString()==='\r\n')b=b.subarray(0,-2);
 if(/application\/json/i.test(h))await save('song-metadata',JSON.parse(b.toString()));else if(/audio\//i.test(h)){await writeFile(`${root}/song.mp3`,b);found=true;}}
 pos=next;}assert(found,'Missing audio');
}
async function main(){
 await mkdir(root,{recursive:true});
 if(await exists('song-attempt.json')){const rec=JSON.parse(await readFile(`${root}/song-attempt.json`,'utf8'));assert(rec.state==='completed','Existing attempt requires inspection');await parse(rec);console.log('Recovered saved song');return;}
 const text=(await readFile('output/sri-venkateswara-female-voice-2026-10-20/sample-lyrics-telugu.txt','utf8')).trim();
 await writeFile(`${root}/lyrics-telugu.txt`,text);
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:[{
 text,duration_ms:40000,context_adherence:'high',
 positive_styles:[
 'Traditional South Indian Carnatic suprabhatam morning prayer, dignified melodic female solo chanting with a steady flowing devotional cadence, original tune and original vocal identity',
 'One mature female vocalist with a clear resonant middle-to-upper register, full-bodied resonant sustained notes, gentle controlled vibrato and restrained graceful Carnatic gamakas, sweet clear unforced upper notes',
 'SING complete connected musical phrases on a graceful original raga-inspired melody; each line rises and resolves naturally over a stable tanpura drone; genuinely pitched legato singing rather than conversational reading',
 'Sanskrit prayer written in Telugu script: sing every supplied syllable clearly and completely once in exact order, precise vowel lengths and consonant clusters, natural short breaths only at full line endings',
 'Measured slow-to-moderate traditional stotra meter with an even dignified devotional flow, a brief two second tanpura and violin opening, measured connected singing through both verses, brief graceful final resolution',
 'Authentic restrained acoustic arrangement: warm tanpura drone, very soft bowed violin following the melody, sparse delicate veena responses, essentially percussion-free; lead voice clearly louder than instruments',
 'Natural warm devotional album recording, intimate intelligible centered single female lead, serene reverent morning temple mood, light natural room ambience'
 ],negative_styles:['spoken narration','text-to-speech reading','conversational delivery','rap','male lead','child voice','choir','vocal doubling','breathy whisper','pop singing','heavy percussion','EDM','extra lyrics','repeated verses','missing syllables','rushed diction','long instrumental gaps','excessive melisma','artist imitation','copied recording']
 }]}};
 await save('request',request);
 const key=await credential(),headers={'xi-api-key':key};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers});assert(check.ok);const info=await check.json();
 const remaining=info.character_limit-info.character_count;await save('credit-check',{remainingCredits:remaining,estimatedMusicCredits:600,actualCharge:null});
 assert(info.tier!=='free'&&remaining>=850,'Insufficient included credits');
 const rec={state:'submitted',maximumCalls:1,submittedAt:new Date().toISOString(),authorization:'User rejected the spoken sample and requested singing similar in broad devotional style to supplied reference.',referenceRecordingUsed:false,designedTtsVoiceUsed:false};await save('song-attempt',rec);
 try{const r=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(900000)});
 rec.httpStatus=r.status;rec.contentType=r.headers.get('content-type');rec.songId=r.headers.get('song-id');
 if(!r.ok){await save('provider-error',await r.json().catch(()=>({})));rec.state='rejected';await save('song-attempt',rec);throw Error('Provider rejected song');}
 const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/song-response.bin`,bytes);rec.state='completed';rec.bytes=bytes.length;await save('song-attempt',rec);await parse(rec);
 console.log(JSON.stringify({file:`${root}/song.mp3`,songId:rec.songId,state:rec.state}));
 }catch(e){if(rec.state==='submitted'){rec.state='unknown';await save('song-attempt',rec);}throw e;}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Song generation stopped; inspect saved records. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());

