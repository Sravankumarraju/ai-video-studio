import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='output/sri-venkateswara-female-chant-v3-2026-10-20';
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
 const lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
 assert(lines.length===4,'Expected four opening lyric lines');
 const positive=[
 'Original female solo traditional Sanskrit stotra cantillation, brisk measured syllabic devotional chant, compact narrow melodic range of a fourth in a comfortable middle register',
 'Connected continuous articulation inside each complete line, one fluent breath group per line, approximately four and a half to five seconds per complete line, steady forward momentum',
 'Clear adult feminine tone, round centered natural resonance, crisp clean consonants, accurate short and long vowels, unforced clear chest and middle resonance, calm focused devotion',
 'Preserve every supplied Sanskrit syllable in Telugu script exactly once in order, clear aspirates and conjunct consonants, minimal tasteful pitch inflections, all words equally intelligible',
 'Begin the first word immediately; each line flows directly into the next after only one brief natural breath of about 0.25 seconds; one uninterrupted prayer across all four consecutive lines',
 'Only a very quiet continuous tanpura drone under the prominent dry centered female chant, light natural room ambience, traditional temple prayer intimacy',
 'One consistent original female singer and the same compact chant contour throughout all four chunks, coherent recording and uninterrupted drone, fresh original vocal identity and melodic contour'
 ];
 const negative=['slow lyrical song','drawn-out syllables','word-by-word pauses','melisma','wide vibrato','elongated intermediate vowels','instrumental interludes','long introduction','verse repeats','extra words','missing syllables','conversational narration','flat robotic reading','choir','vocal doubling','male voice','child voice','drums','flute solo','violin solo','artist imitation','copied recording'];
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:lines.map((line,i)=>({text:line,duration_ms:5500,positive_styles:[...positive,i===3?'Complete the final word clearly and resolve briefly':'Continue immediately into the following lyric line, only a short breath at the line ending'],negative_styles:negative,context_adherence:'high'}))}};
 await save('request',request);
 const key=await credential(),headers={'xi-api-key':key};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers});assert(check.ok);const info=await check.json();
 const remaining=info.character_limit-info.character_count;await save('credit-check',{remainingCredits:remaining,estimatedMusicCredits:330,actualCharge:null});
 assert(info.tier!=='free'&&remaining>=450,'Insufficient included credits');
 const rec={state:'submitted',maximumCalls:1,submittedAt:new Date().toISOString(),authorization:'User rejected slow lagging singing and requested research into the reference lyrics and vocal delivery. Produce one compact 22-second metered female chant sample.',referenceRecordingUsed:false,designedTtsVoiceUsed:false};await save('song-attempt',rec);
 try{const r=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(900000)});
 rec.httpStatus=r.status;rec.contentType=r.headers.get('content-type');rec.songId=r.headers.get('song-id');
 if(!r.ok){await save('provider-error',await r.json().catch(()=>({})));rec.state='rejected';await save('song-attempt',rec);throw Error('Provider rejected song');}
 const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/song-response.bin`,bytes);rec.state='completed';rec.bytes=bytes.length;await save('song-attempt',rec);await parse(rec);
 console.log(JSON.stringify({file:`${root}/song.mp3`,songId:rec.songId,state:rec.state}));
 }catch(e){if(rec.state==='submitted'){rec.state='unknown';await save('song-attempt',rec);}throw e;}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Song generation stopped; inspect saved records. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());

