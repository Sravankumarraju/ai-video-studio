import assert from 'node:assert/strict';
import {readFile,writeFile,access,rename} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/dakshinamurthy-2026-10-23';
const load=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function main(){
 const mode=process.argv[2];assert(['check','music','bookends','transcribe','align'].includes(mode));
 const p=await load('plan'),key=await credential(),headers={'xi-api-key':key};
 async function credits(required){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(r.ok,`Credit check ${r.status}`);const a=await r.json();const remaining=Number(a.character_limit)-Number(a.character_count);await save('credit-check',{tier:a.tier,remaining,required,checkedAt:new Date().toISOString()});assert(a.tier!=='free'&&remaining>=required,'Insufficient included credits; no overage');return remaining;}
 if(mode==='check'){console.log(JSON.stringify({remaining:await credits(p.seconds*15+10000),seconds:p.seconds,batches:p.batches.length}));return;}
 async function submit(name,endpoint,body,isJson=true){
  if(await exists(`${name}-attempt.json`)){const a=await load(`${name}-attempt`);if(a.state==='rejected'&&a.httpStatus===422&&!await exists(`${name}-validation-rejection.json`)){await rename(`${root}/${name}-attempt.json`,`${root}/${name}-validation-rejection.json`);}else{assert.equal(a.state,'completed',`Unresolved ${name} attempt; inspect before retry`);return readFile(`${root}/${name}-response.bin`);}}
  if(isJson)await save(`${name}-request`,body);
  const a={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,authorization:p.userAuthorization,actualCharge:null};await save(`${name}-attempt`,a);
  try{const r=await fetch(`https://api.elevenlabs.io/v1/${endpoint}`,{method:'POST',headers:{...headers,...(isJson?{'Content-Type':'application/json'}:{})},body:isJson?JSON.stringify(body):body,signal:AbortSignal.timeout(900000)});a.httpStatus=r.status;a.contentType=r.headers.get('content-type');a.songId=r.headers.get('song-id');if(!r.ok){const err=await r.json().catch(()=>({}));await save(`${name}-provider-error`,err);a.state='rejected';await save(`${name}-attempt`,a);throw Error(`Provider rejected ${name}: ${r.status}`);}const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/${name}-response.bin`,bytes);a.state='completed';a.bytes=bytes.length;a.completedAt=new Date().toISOString();await save(`${name}-attempt`,a);return bytes;}catch(e){if(a.state==='submitted'){a.state='unknown';await save(`${name}-attempt`,a);}throw e;}
 }
 if(mode==='bookends'){
  await credits(3000);
  for(const u of p.welcomeAndClosing){if(await exists(`${u.name}.mp3`))continue;const bytes=await submit(u.name,'text-to-dialogue/with-timestamps',{inputs:[{text:u.text,voice_id:p.voiceId}],model_id:'eleven_v4',language_code:'te'});const r=JSON.parse(bytes.toString());assert(r.audio_base64&&r.alignment);await writeFile(`${root}/${u.name}.mp3`,Buffer.from(r.audio_base64,'base64'));await save(`${u.name}-alignment`,r.alignment);console.log(JSON.stringify({stage:'bookend-saved',name:u.name}));}return;
 }
 const index=Number(process.argv[3]);assert(Number.isInteger(index)&&p.batches[index]);const b=p.batches[index],stem=`batch-${String(index).padStart(2,'0')}`;
 if(mode==='music'){
  if(await exists(`${stem}.mp3`)){console.log(`${stem} already saved`);return;}
  await credits(b.seconds*15+8000);
  const chunks=[];
  const wrapped=text=>{const lines=[];let line='';for(const word of text.split(/\s+/)){if(line.length+word.length+1>160){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);return lines.join('\n');};
  for(let i=0;i<b.units.length;i+=1){const units=b.units.slice(i,i+1);const ref=index>0?await load('batch-00-attempt'):null;chunks.push({text:units.map(u=>wrapped(u.text)).join('\n'),duration_ms:units.reduce((sum,u)=>sum+u.seconds,0)*1000,positive_styles:p.positiveStyles,negative_styles:p.negativeStyles,context_adherence:'high',...(ref?.songId?{conditioning_ref:{song_id:ref.songId,range:{start_ms:5000,end_ms:30000}},condition_strength:'high'}:{})});}
  console.log(JSON.stringify({stage:'generating',batch:index,seconds:b.seconds,units:b.units.length}));
  const bytes=await submit(stem,'music/detailed?output_format=mp3_48000_192',{model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks}});
  const a=await load(`${stem}-attempt`),boundary=/boundary="?([^";\s]+)/i.exec(a.contentType||'')?.[1];assert(boundary,'Missing multipart boundary');
  const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
  while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const h=part.subarray(0,split).toString();let data=part.subarray(split+4);if(data.subarray(-2).toString()==='\r\n')data=data.subarray(0,-2);if(/application\/json/i.test(h))await save(`${stem}-metadata`,JSON.parse(data.toString()));else if(/audio\//i.test(h)){await writeFile(`${root}/${stem}.mp3`,data);found=true;}}pos=next;}assert(found,'Missing audio part');console.log(JSON.stringify({stage:'music-saved',batch:index}));
 }else if(mode==='transcribe'){
  if(await exists(`${stem}-transcription.json`))return;await credits(1000);
  const form=new FormData();form.set('file',new Blob([new Uint8Array(await readFile(`${root}/${stem}.mp3`))],{type:'audio/mpeg'}),`${stem}.mp3`);form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','false');form.set('timestamps_granularity','word');const data=await submit(`${stem}-transcription`,'speech-to-text',form,false);await save(`${stem}-transcription`,JSON.parse(data.toString()));console.log(JSON.stringify({stage:'transcribed',batch:index}));
 }else{
  if(await exists(`${stem}-alignment.json`))return;await credits(1000);
  const form=new FormData();form.set('file',new Blob([new Uint8Array(await readFile(`${root}/${stem}.mp3`))],{type:'audio/mpeg'}),`${stem}.mp3`);form.set('text',b.units.map(u=>u.text).join('\n'));const data=await submit(`${stem}-alignment`,'forced-alignment',form,false);await save(`${stem}-alignment`,JSON.parse(data.toString()));console.log(JSON.stringify({stage:'aligned',batch:index}));
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||e.message?.startsWith('Provider rejected')?e.message:'Vishnu production stopped; inspect saved attempts. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());


