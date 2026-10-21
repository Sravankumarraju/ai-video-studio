import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, access, copyFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const exec = promisify(execFile);
const base = 'data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19';
const maleFull=process.argv.includes('--male-full');
const root = `${base}/${maleFull?'full-male-shloka-2026-10-19':'full-approved-natural-v3'}`;
const sample = `${base}/${maleFull?'opening-two-verses-original-male-v2':'opening-two-verses-natural-v3'}`;
const save = (name: string, data: unknown) => writeFile(`${root}/${name}.json`, JSON.stringify(data, null, 2));
const load = async (name: string) => JSON.parse(await readFile(`${root}/${name}.json`, 'utf8'));
async function exists(path: string) {try {await access(path); return true;} catch {return false;}}
const sections = [
 {name: 'welcome', text: 'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. ఇప్పుడు శ్రీ వేంకటేశ్వర సుప్రభాతాన్ని మధురమైన భక్తి సంగీతంతో ఆలకిద్దాం.'},
 {name: 'closing', text: 'ఈ శ్రీ వేంకటేశ్వర సుప్రభాతం మీకు నచ్చితే, మా డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. ఈ వీడియోను లైక్ చేయండి, షేర్ చేయండి. మీ అభిప్రాయాన్ని కామెంట్‌లో తెలియజేయండి. శ్రీ వేంకటేశ్వర స్వామి అనుగ్రహం మీ అందరికీ కలగాలి.'}
];
async function main() {
 const mode = process.argv[2];
 assert(['prepare','check','music','bookends','align','align-fresh','repair','transcribe','music-fresh','audit-fresh'].includes(mode!), 'Select production stage');
 await mkdir(root, {recursive:true}); await mkdir(`${root}/art`, {recursive:true});
 if(maleFull){
   const prior=`${base}/full-approved-natural-v3`;
   for(const name of ['welcome.mp3','closing.mp3','welcome-alignment.json','closing-alignment.json','welcome-request.json','closing-request.json','bookends-plan.json','channel-voice-check.json','art-prompts.json','channel-logo.png']){
     if(!await exists(`${root}/${name}`))await copyFile(`${prior}/${name}`,`${root}/${name}`);
   }
   for(const name of ['01-tirumala-sunrise','02-venkateswara-portrait','03-crown-garlands','04-lamps-temple','05-lakshmi','06-serene-closing','07-traditional-mural','08-bronze-shrine','09-watercolor-dawn']){
     if(!await exists(`${root}/art/${name}.png`))await copyFile(`${prior}/art/${name}.png`,`${root}/art/${name}.png`);
   }
 }
 const source = await readFile(`${base}/source-browser.txt`, 'utf8');
 const prayer = source.slice(source.indexOf('కౌసల్యా'), source.indexOf('Browse Related Categories:'));
 const units = [...prayer.matchAll(/([\s\S]*?)॥\s*(\d+)\s*॥/g)].map(m => ({verse:Number(m[2]),text:m[1].replace(/\[[^\]]*\]/g,'').trim().replace(/\r/g,'')+' ॥'}));
 assert.deepEqual(units.map(u=>u.verse), Array.from({length:29},(_,i)=>i+1));
 const request = JSON.parse(await readFile(`${sample}/request.json`,'utf8'));
 const generated = JSON.parse(await readFile(`${sample}/generation.json`,'utf8'));
 assert(generated.state==='completed' && generated.songId, 'Approved sample required');
 const items = units.slice(2).map(u => {
   const syllables=[...u.text].filter(c=>/[అ-ఔా-ౌౄౢౣ]/u.test(c)).length + [...u.text.matchAll(/[క-హఱ]((?![్ా-ౌౄౢౣ])[\s\S]|$)/gu)].length;
   return {...u,seconds:Math.max(26,Math.min(34,Math.ceil(syllables/2.2)))};
 });
 const batches=[{index:1,units:items.slice(0,14)},{index:2,units:items.slice(14)}].map(b=>({...b,seconds:b.units.reduce((s,u)=>s+u.seconds,0)}));
 const plan={units,batches,approvedSample:sample,referenceSongId:generated.songId,model:'music_v2_5',
   positiveStyles:request.composition_plan.chunks[0].positive_styles,negativeStyles:request.composition_plan.chunks[0].negative_styles,
   welcomeAndClosing:sections,voiceId:'sJrRcQEpUbZehhGBdEbD',userAuthorization:maleFull?'User approved male Hanuman-style direction, requested improved voice pitch and full video showing each complete shlokam with verse number and active word highlighting.':'User approved the recreated natural V3 sample with go ahead; explicitly requested images, logo, welcome and closing subscribe like share comment.',
   originalSamplePreserved:true,publishApproved:false,pronunciationListeningReviewPending:true,captionFontSize:104,studioFontSize:100,
   source:'https://vignanam.org/telugu/sri-venkateswara-suprabhatam.html',sourceSequenceVerified:true,
   editorialNotesExcluded:true,verseNumbersExcluded:true,verseNumbersDisplayed:maleFull,fullShlokaHeldOnScreen:maleFull,pitchLiftSemitones:maleFull?.5:0,allocationNote:maleFull?'Original male 84 BPM musical setting; trim non-vocal tails using actual performance timings; modest formant-preserving half-semitone whole-mix pitch refinement, no tempo change.':'Per-verse syllable-based allocation matching the approved natural sample; no tempo or pitch processing.'};
 await save('plan',plan); await writeFile(`${root}/complete-lyrics-telugu.txt`,units.map(u=>u.text).join('\n\n')+'\n');
 await copyFile(`${sample}/sample.mp3`,`${root}/approved-opening.mp3`);
 if(mode==='prepare') {console.log(JSON.stringify({verses:29,batches:batches.map(b=>({index:b.index,seconds:b.seconds,verses:b.units.map(u=>u.verse)}))}));return;}
 let key=process.env.ELEVENLABS_API_KEY;
 if(!key||/^(<|PASTE|your)/i.test(key))key=decrypt((await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);
 const headers={'xi-api-key':key!,Connection:'close'};
 async function credits(required:number,name:string) {
   const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});
   assert(response.ok,`Credit HTTP ${response.status}`);const a=await response.json();const remaining=Number(a.character_limit)-Number(a.character_count);
   await save(`credits-${name}`,{tier:a.tier,remainingIncludedCredits:remaining,required,checkedAt:new Date().toISOString()});
   assert(a.tier!=='free'&&Number.isFinite(remaining)&&remaining>=required,'Insufficient included credits; no overage');
   console.log(JSON.stringify({stage:'credits',remainingIncludedCredits:remaining,required}));
 }
 async function submit(name:string,endpoint:string,body:object|FormData,output:string,json=true) {
   assert(!await exists(`${root}/${name}-attempt.json`),`Existing ${name} attempt: inspect before retry`);
   const record:any={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1};await save(`${name}-attempt`,record);
   try {
     const response=await fetch(`https://api.elevenlabs.io/v1/${endpoint}`,{method:'POST',headers:json?{...headers,'Content-Type':'application/json'}:headers,
       body:json?JSON.stringify(body):body as FormData,signal:AbortSignal.timeout(900000)});
     record.httpStatus=response.status;record.contentType=response.headers.get('content-type');record.songId=response.headers.get('song-id');
     if(!response.ok){await save(`${name}-provider-error`,await response.json().catch(()=>({})));record.state='rejected';await save(`${name}-attempt`,record);throw Error(`Provider HTTP ${response.status}`);}
     const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length>10);await writeFile(`${root}/${output}`,bytes);
     record.state='completed';record.bytes=bytes.length;record.completedAt=new Date().toISOString();await save(`${name}-attempt`,record);return bytes;
   }catch(e){if(record.state==='submitted'){record.state='unknown';await save(`${name}-attempt`,record);}throw e;}
 }
 await credits(mode==='music'?batches.reduce((s,b)=>s+b.seconds*15,0)+5000:3000,mode!);
 if(mode==='music-fresh'){
   await credits(batches.reduce((s,b)=>s+b.seconds*15,0)+3000,'fresh-music');
   for(const b of batches){const stem=`fresh-batch-${b.index}`;if(await exists(`${root}/${stem}.mp3`))continue;
     const body={model_id:'music_v2_5',seed:20261019,store_for_inpainting:true,composition_plan:{chunks:b.units.map((u,i)=>({text:u.text,duration_ms:u.seconds*1000,
       positive_styles:[...plan.positiveStyles.filter((s:string)=>!/first second|both supplied|two verses|ending|Resolve briefly/.test(s)),
         'These are the exact traditional prayer lyrics for this section; sing the supplied text only, one time in order, each word completely',
         maleFull?'Maintain one consistent rich resonant male baritone singer with a warm clear upper-middle presence, steady original 84 BPM devotional pulse and connected musical phrasing throughout all chunks':'Maintain one consistent warm clear female singer and a flowing original 76 BPM 6/8 devotional melody throughout all chunks',
         'Each chunk is the next consecutive verse of one continuous prayer, natural connected musical phrasing, no new introduction between verses',
         b.index===2&&i===b.units.length-1?'Complete all final words and resolve gently':'Flow directly into the following verse after a short natural breath'],
       negative_styles:plan.negativeStyles,context_adherence:'high'}))}};
     await save(`${stem}-request`,body);console.log(JSON.stringify({stage:'fresh-original-generation',batch:b.index}));
     await submit(stem,'music?output_format=mp3_48000_192',body,`${stem}.mp3`);console.log(JSON.stringify({stage:'fresh-batch-saved',batch:b.index}));
   }return;
 }
 if(mode==='audit-fresh'){
   for(const b of batches){const name=`fresh-batch-${b.index}`;
     if(await exists(`${root}/${name}-transcription.json`))continue;
     const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/${name}.mp3`))],{type:'audio/mpeg'}),`${name}.mp3`);
     form.append('model_id','scribe_v2');form.append('language_code','tel');form.append('tag_audio_events','false');form.append('timestamps_granularity','word');
     await submit(`${name}-transcription`,'speech-to-text',form,`${name}-transcription.json`,false);console.log(JSON.stringify({stage:'fresh-batch-transcribed',batch:b.index}));
   }return;
 }
 if(mode==='transcribe'){
   for(const name of ['verse-03','repair-verse-03']){
     if(await exists(`${root}/${name}-transcription.json`))continue;
     const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/${name}.mp3`))],{type:'audio/mpeg'}),`${name}.mp3`);
     form.append('model_id','scribe_v2');form.append('language_code','tel');form.append('tag_audio_events','false');form.append('timestamps_granularity','word');
     await submit(`${name}-transcription`,'speech-to-text',form,`${name}-transcription.json`,false);
     console.log(JSON.stringify({stage:'independent-transcription',name}));
   }return;
 }
 if(mode==='repair'){
   const u=units[2];const name='repair-verse-03';const seconds=32;
   if(!await exists(`${root}/${name}.mp3`)){
     const body={model_id:'music_v2_5',store_for_inpainting:true,composition_plan:{chunks:[{text:u.text,duration_ms:seconds*1000,
       positive_styles:[...plan.positiveStyles.filter((s:string)=>!/two verses|both supplied|ending/.test(s)),
         'One complete middle verse with the same reference singer key melody and accompaniment, flowing connected musical phrasing with complete words',
         'Clearly sing the entire final line Sri Venkatesha dayite tava suprabhatam; articulate DAYITE completely with its full syllables; no missing words',
         'Enter promptly after a brief breath and finish every supplied word; no long instrumental introduction or extra lyrics'],
       negative_styles:plan.negativeStyles,context_adherence:'high',conditioning_ref:{song_id:generated.songId,range:{start_ms:0,end_ms:30000}},condition_strength:'high'}]}};
     await save(`${name}-request`,body);await submit(name,'music?output_format=mp3_48000_192',body,`${name}.mp3`);
   }
   if(!await exists(`${root}/${name}-alignment.json`)){
     const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/${name}.mp3`))],{type:'audio/mpeg'}),`${name}.mp3`);form.append('text',u.text);
     await submit(`${name}-alignment`,'forced-alignment',form,`${name}-alignment.json`,false);
   }
   await save('repairs',{units:[{verse:3,seconds,source:`${name}.mp3`,alignment:`${name}-alignment`,reason:'Original alignment collapsed dayite to 1 ms; regenerate only the affected verse with more articulation room'}]});
   console.log(JSON.stringify({stage:'verse-repaired',verse:3,seconds}));return;
 }
 if(mode==='check'||mode==='bookends'){
   const response=await fetch('https://api.elevenlabs.io/v1/models',{headers,signal:AbortSignal.timeout(30000)});assert(response.ok,'Model list unavailable');
   const models=await response.json();await save('available-models',models.map((m:any)=>({id:m.model_id,name:m.name,languages:m.languages,canDoTextToSpeech:m.can_do_text_to_speech})));
   const selected=models.find((m:any)=>m.model_id==='eleven_v4');
   const voice=await fetch(`https://api.elevenlabs.io/v1/voices/${plan.voiceId}`,{headers,signal:AbortSignal.timeout(30000)});assert(voice.ok,'Channel voice unavailable');
   const v=await voice.json();await save('channel-voice-check',{voiceId:v.voice_id,name:v.name,available:true,checkedAt:new Date().toISOString()});
   assert(selected,'Previously used eleven_v4 is absent; inspect compatibility before selecting fallback');
   await save('bookends-plan',{voiceId:plan.voiceId,model:'eleven_v4',sections});
   console.log(JSON.stringify({stage:'voice-model-verified',model:'eleven_v4',voiceId:plan.voiceId}));
   if(mode==='check')return;
   for(const s of sections){if(await exists(`${root}/${s.name}.mp3`))continue;
     const body={inputs:[{text:s.text,voice_id:plan.voiceId}],model_id:'eleven_v4',language_code:'te'};await save(`${s.name}-request`,body);
     const bytes=await submit(s.name,'text-to-dialogue/with-timestamps',body,`${s.name}-response.json`);const result=JSON.parse(bytes.toString());
     assert(result.audio_base64&&result.alignment);await writeFile(`${root}/${s.name}.mp3`,Buffer.from(result.audio_base64,'base64'));await save(`${s.name}-alignment`,result.alignment);
     console.log(JSON.stringify({stage:'bookend-saved',name:s.name}));
   }return;
 }
 if(mode==='music'){
   for(const b of batches){const stem=`batch-${b.index}`;if(await exists(`${root}/${stem}.mp3`))continue;
     const body={model_id:'music_v2_5',store_for_inpainting:true,composition_plan:{chunks:b.units.map((u,i)=>({text:u.text,duration_ms:u.seconds*1000,
       positive_styles:[...plan.positiveStyles.filter((s:string)=>!/first second|both supplied|two verses|ending/.test(s)),
         'Continue the approved reference female singer, key, flowing 76 BPM 6/8 melodic character and quiet acoustic arrangement with warm bass',
         'This is a continuous middle prayer verse; enter after a brief natural breath and connect phrases smoothly without extended introduction or interlude',
         'Complete every supplied Sanskrit syllable exactly once in order, natural articulation, same normal pace as reference, no elongated pauses',
         b.index===2&&i===b.units.length-1?'Complete the final word fully and finish with a brief graceful musical resolution':'Continue smoothly toward the following verse'],
       negative_styles:plan.negativeStyles,context_adherence:'high',conditioning_ref:{song_id:generated.songId,range:{start_ms:0,end_ms:30000}},condition_strength:'high'}))}};
     await save(`${stem}-request`,body);console.log(JSON.stringify({stage:'generating-batch',index:b.index,seconds:b.seconds,verses:b.units.map(u=>u.verse)}));
     await submit(stem,'music?output_format=mp3_48000_192',body,`${stem}.mp3`);console.log(JSON.stringify({stage:'batch-saved',index:b.index}));
   }return;
 }
 if(mode==='align'||mode==='align-fresh'){
   const fresh=mode==='align-fresh';
   const groups=[{stem:'approved-opening',text:units.slice(0,2).map(u=>u.text).join('\n\n'),source:'approved-opening.mp3',start:0,seconds:maleFull?30:32},
     ...batches.flatMap(b=>{let offset=0;return b.units.map(u=>{const g={stem:`${fresh?'fresh-':''}verse-${String(u.verse).padStart(2,'0')}`,text:u.text,source:`${fresh?'fresh-':''}batch-${b.index}.mp3`,start:offset,seconds:u.seconds};offset+=u.seconds;return g;});})];
   for(const g of groups){
     if(g.stem!=='approved-opening'&&!await exists(`${root}/${g.stem}.mp3`))await exec('ffmpeg',['-v','error','-nostdin','-n','-ss',String(g.start),'-i',`${root}/${g.source}`,'-t',String(g.seconds),'-c:a','libmp3lame','-b:a','192k',`${root}/${g.stem}.mp3`]);
     if(await exists(`${root}/${g.stem}-alignment.json`))continue;
     const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/${g.stem}.mp3`))],{type:'audio/mpeg'}),`${g.stem}.mp3`);form.append('text',g.text);
     await submit(`${g.stem}-alignment`,'forced-alignment',form,`${g.stem}-alignment.json`,false);
     console.log(JSON.stringify({stage:'aligned',name:g.stem}));
   }
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Production stage stopped; inspect saved attempt/error. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
