import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/govinda-namalu-full-2026-10-20';
const load=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(p){try{await access(`${root}/${p}`);return true;}catch{return false;}}
async function main(){
 const fresh=process.argv[2]?.endsWith('-fresh');
 const mode=process.argv[2]?.replace('-fresh','');assert(['music','transcribe','bookends','repair','transcribe-repaired','align-repaired'].includes(mode));
 const song=mode==='repair'||mode==='transcribe-repaired'||mode==='align-repaired'?'song-repaired':fresh?'song-fresh':'song';
 const p=await load('plan'),key=await credential();
 const headers={'xi-api-key':key};
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});
 assert(check.ok,`Subscription check failed ${check.status}`);const account=await check.json();
 const remaining=Number(account.character_limit)-Number(account.character_count);
 await save(`credits-${mode}`,{tier:account.tier,remainingIncludedCredits:remaining,checkedAt:new Date().toISOString()});
 assert(account.tier!=='free'&&remaining>=(mode==='music'?8500:mode==='repair'?7000:1500),'Insufficient included credits; stopped before submission');
 async function submit(name,endpoint,body,isJson=true){
  if(await exists(`${name}-attempt.json`)){
   const prior=await load(`${name}-attempt`);assert.equal(prior.state,'completed',`Existing ${name} attempt unresolved; no automatic retry`);
   return readFile(`${root}/${name}-response.bin`);
  }
  if(isJson)await save(`${name}-request`,body);
  const record={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,authorization:p.userAuthorization,actualCharge:null};await save(`${name}-attempt`,record);
  try{
   const r=await fetch(`https://api.elevenlabs.io/v1/${endpoint}`,{method:'POST',headers:{...headers,...(isJson?{'Content-Type':'application/json'}:{})},body:isJson?JSON.stringify(body):body,signal:AbortSignal.timeout(900000)});
   record.httpStatus=r.status;record.contentType=r.headers.get('content-type');record.songId=r.headers.get('song-id');
   if(!r.ok){const error=await r.json().catch(()=>({}));await save(`${name}-provider-error`,error);record.state='rejected';await save(`${name}-attempt`,record);throw Error(`Provider rejected ${name}: ${r.status}`);}
   const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/${name}-response.bin`,bytes);
   record.state='completed';record.bytes=bytes.length;record.completedAt=new Date().toISOString();await save(`${name}-attempt`,record);return bytes;
  }catch(e){if(record.state==='submitted'){record.state='unknown';await save(`${name}-attempt`,record);}throw e;}
 }
 if(mode==='music'||mode==='repair'){
  if(await exists(`${song}.mp3`)){console.log('Full song already saved; no new call');return;}
  const groups=fresh?p.units.map(u=>[u]):[p.units.slice(0,8),p.units.slice(8,15),p.units.slice(15,22),p.units.slice(22)];
  const approved=JSON.parse(await readFile('data/productions/divine-wisdom/govinda-namalu-female-sample-2026-10-20/sample-attempt.json','utf8'));
  const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:groups.map((units,i)=>({
   text:units.map(u=>u.text).join('\n'),duration_ms:units.reduce((sum,u)=>sum+u.seconds,0)*1000,
   positive_styles:[...p.positiveStyles,'This section contains only the exact supplied names. Sing every syllable clearly, one line at a time, without adding or repeating any line.'],
   negative_styles:p.negativeStyles,context_adherence:'high',
   ...(!fresh&&i===0?{conditioning_ref:{song_id:approved.songId,range:{start_ms:0,end_ms:24000}},condition_strength:'medium'}:{})
  }))}};
  if(mode==='repair'){
   const prior=await load('song-fresh-attempt');assert(prior.songId&&prior.state==='completed');
   const keep=(start,end)=>({song_id:prior.songId,range:{start_ms:start*1000,end_ms:end*1000}});
   const fix=(verse)=>({text:p.units.find(u=>u.verse===verse).text,duration_ms:p.units.find(u=>u.verse===verse).seconds*1000,
    positive_styles:[...p.positiveStyles,'Regenerate this exact stanza only, preserving the same surrounding female singer and melody. Precisely articulate the supplied names rather than substituting a familiar phrase.'],
    negative_styles:p.negativeStyles,context_adherence:'high'});
   request.composition_plan.chunks=[keep(0,66),fix(6),keep(78,162),fix(14),keep(174,234),fix(20),keep(246,330),fix(28)];
  }
  console.log(JSON.stringify({stage:'generating-complete-namavali',namams:108,seconds:p.seconds,chunks:groups.length}));
  const bytes=await submit(song,'music/detailed?output_format=mp3_48000_192',request);
  const record=await load(`${song}-attempt`),boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];
  if(!boundary&&/audio\//i.test(record.contentType||'')){await writeFile(`${root}/${song}.mp3`,bytes);return;}
  assert(boundary,'Missing multipart boundary');const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
  while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next);const split=part.indexOf(Buffer.from('\r\n\r\n'));
   if(split>=0){const header=part.subarray(0,split).toString();let body=part.subarray(split+4);if(body.subarray(-2).toString()==='\r\n')body=body.subarray(0,-2);
    if(/application\/json/i.test(header))await save(`${song}-metadata`,JSON.parse(body.toString()));
    else if(/audio\//i.test(header)){await writeFile(`${root}/${song}.mp3`,body);found=true;}}
   pos=next;
  }assert(found,'Missing song audio');console.log(JSON.stringify({stage:'full-song-saved',file:`${root}/${song}.mp3`}));
 }else if(mode==='align-repaired'){
  if(await exists('song-repaired-alignment.json'))return;
  const file=await readFile(`${root}/${song}.mp3`),form=new FormData();form.set('file',new Blob([new Uint8Array(file)],{type:'audio/mpeg'}),'govinda-repaired.mp3');
  form.set('text',p.units.map(u=>u.text).join('\n'));
  const bytes=await submit('song-repaired-alignment','forced-alignment',form,false);await save('song-repaired-alignment',JSON.parse(bytes.toString()));console.log('Repaired song forced alignment saved');
 }else if(mode==='transcribe'||mode==='transcribe-repaired'){
  if(await exists(`${song}-transcription.json`))return;
  const file=await readFile(`${root}/${song}.mp3`),form=new FormData();form.set('file',new Blob([new Uint8Array(file)],{type:'audio/mpeg'}),'govinda-full.mp3');
  form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','true');form.set('timestamps_granularity','word');
  const bytes=await submit(`${song}-transcription`,'speech-to-text',form,false);const result=JSON.parse(bytes.toString());await save(`${song}-transcription`,result);
  console.log(JSON.stringify({stage:'transcribed',words:result.words?.length,text:result.text}));
 }else{
  for(const section of p.welcomeAndClosing){
   if(await exists(`${section.name}.mp3`))continue;
   const body={inputs:[{text:section.text,voice_id:p.voiceId}],model_id:'eleven_v4',language_code:'te'};
   const bytes=await submit(section.name,'text-to-dialogue/with-timestamps',body);const response=JSON.parse(bytes.toString());
   assert(response.audio_base64&&response.alignment,'Missing channel voice audio/alignment');
   await writeFile(`${root}/${section.name}.mp3`,Buffer.from(response.audio_base64,'base64'));
   await save(`${section.name}-alignment`,response.alignment);console.log(JSON.stringify({stage:'channel-voice-saved',name:section.name}));
  }
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||e.message?.startsWith('Provider rejected')?e.message:'Govinda production stopped; inspect saved attempts. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
