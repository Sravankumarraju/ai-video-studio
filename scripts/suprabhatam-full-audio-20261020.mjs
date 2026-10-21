import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='output/sri-venkateswara-full-approved-2026-10-20';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
const load=async n=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function submit(name,endpoint,body,key,json=true){
 if(await exists(`${name}-attempt.json`)){
  const record=await load(`${name}-attempt`);assert(record.state==='completed',`Inspect existing ${name} attempt before retrying`);
  return {bytes:await readFile(`${root}/${name}-response.bin`),record};
 }
 const record={state:'submitted',maximumCalls:1,submittedAt:new Date().toISOString(),actualCharge:null};await save(`${name}-attempt`,record);
 try{const r=await fetch('https://api.elevenlabs.io/v1/'+endpoint,{method:'POST',headers:{'xi-api-key':key,...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(body):body,signal:AbortSignal.timeout(900000)});
 record.httpStatus=r.status;record.contentType=r.headers.get('content-type');record.songId=r.headers.get('song-id');
 if(!r.ok){await save(`${name}-provider-error`,await r.json().catch(()=>({})));record.state='rejected';await save(`${name}-attempt`,record);throw Error(`Provider rejected ${name}: HTTP ${r.status}`);}
 const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/${name}-response.bin`,bytes);record.state='completed';record.bytes=bytes.length;await save(`${name}-attempt`,record);return {bytes,record};
 }catch(e){if(record.state==='submitted'){record.state='unknown';await save(`${name}-attempt`,record);}throw e;}
}
async function parse(name,{bytes,record}){
 if(/application\/json/i.test(record.contentType||'')){await save(name,JSON.parse(bytes.toString()));return;}
 const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];assert(boundary,'Missing multipart boundary');
 const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),audio=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));
 if(split>=0){const h=part.subarray(0,split).toString();let b=part.subarray(split+4);if(b.subarray(-2).toString()==='\r\n')b=b.subarray(0,-2);
 if(/application\/json/i.test(h))await save(`${name}-metadata`,JSON.parse(b.toString()));else if(/audio\//i.test(h)){await writeFile(`${root}/${name}.mp3`,b);audio=true;}}pos=next;}
 assert(audio,'Missing audio part');
}
async function main(){
 await mkdir(root,{recursive:true});const mode=process.argv[2],key=await credential();
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});assert(check.ok,'Credit check failed');const info=await check.json();
 const remaining=info.character_limit-info.character_count;await save('production-credit-check',{remainingCredits:remaining,tier:info.tier,checkedAt:new Date().toISOString()});
 assert(remaining>=15000,'Insufficient included credits for authorized full production');
 if(mode==='instrumental'){
  const request={model_id:'music_v2_5',music_length_ms:90000,force_instrumental:true,prompt:'Original quiet South Indian devotional instrumental background for Sri Venkateswara Suprabhatham female Sanskrit chanting. Reverent luminous dawn temple atmosphere. Very soft plucked veena, warm gentle sustained strings, unobtrusive tanpura, occasional delicate bamboo flute answering phrases only in open spaces. Slow unhurried 72 BPM feel, almost no percussion, restrained sparse arrangement with abundant space in the voice frequencies. Consistent soft dynamics, no dramatic swells, no strong bass or drums. Peaceful graceful texture, not a foreground instrumental solo. Start gently and resolve softly. Entirely instrumental: no singing, choir, chants, voices or spoken words.'};
  await save('light-devotional-music-request',request);
  const result=await submit('light-devotional-music','music?output_format=mp3_48000_192',request,key);
  if(/audio\//i.test(result.record.contentType||''))await writeFile(`${root}/light-devotional-music.mp3`,result.bytes);else await parse('light-devotional-music',result);
  console.log(JSON.stringify({stage:'instrumental-generated',seconds:90}));return;
 }
 if(mode==='upload'){
  const f=new FormData();f.append('file',new Blob([await readFile('data/branding/divine-wisdom/production-presets/suprabhatam-female-chant-approved-2026-10-20/voice-reference.mp3')],{type:'audio/mpeg'}),'approved-original-female-chant.mp3');f.append('with_timestamps','true');
  const result=await submit('active-key-reference','music/upload',f,key,false);await parse('active-key-reference',result);const reference=await load('active-key-reference');assert(reference.song_id);console.log(JSON.stringify({stage:'reference-uploaded',songId:reference.song_id}));return;
 }
 const reference=await load('active-key-reference');assert(reference.song_id);
 const plan=await load('full-production-plan');
 if(mode==='verse'||mode==='verse-clear'||mode==='verse-reviewed'||mode==='verse-final'){
  const number=Number(process.argv[3]);assert(number>=4&&number<=29);
  const unit=plan.batches.flatMap(b=>b.units).filter(u=>u.verse===number);assert.equal(unit.length,4);
  const template=(await load('requests/batch-1')).composition_plan.chunks[0];
  const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:unit.map((u,i)=>({
   text:mode==='verse-clear'?[...u.text].map(c=>c>='\u0c00'&&c<='\u0c7f'?String.fromCodePoint(c.codePointAt(0)-0x300):c).join(''):u.text,duration_ms:Math.max(mode==='verse-clear'?6000:5500,u.duration_ms),
   positive_styles:[...template.positive_styles.filter(s=>!/first word immediately|four chunks|four consecutive|Complete the final word|Continue the same original|This is the next consecutive|Flow into/.test(s)),
    'One uninterrupted four-line Sanskrit verse, the same female singer and compact metered chant throughout; clear complete words and short natural line-end breaths',
    'The reference supplies singer timbre and chant cadence only: sing ONLY the new supplied lyrics, no lyrics from the reference',
    i===3?'Complete this final line with a brief natural breath after the final word':'Connect directly into the next complete line of this same verse without any instrumental break'],
   negative_styles:template.negative_styles,context_adherence:'high',
   ...(i===0?{conditioning_ref:{song_id:reference.song_id,range:{start_ms:100,end_ms:21240}},condition_strength:'high'}:{})
  }))}};
  if(mode==='verse-reviewed'||mode==='verse-final'){
   const first=request.composition_plan.chunks[0];
   first.text=unit.map(u=>[...u.text].map(c=>c>='\u0c00'&&c<='\u0c7f'?String.fromCodePoint(c.codePointAt(0)-0x300):c).join('').replaceAll('ळ','ल')).join('\n');
   first.duration_ms=26000;first.condition_strength='medium';
   first.positive_styles.push('Highest priority: articulate each exact Sanskrit syllable fully, one syllable per chant note, fluent native classical Sanskrit recitation with narrow melodic cadence, brief breaths at the four supplied line boundaries. Use all four lines in order once.');
   first.negative_styles.push('garbled consonants','invented syllables','swallowed consonants','mumbling');
   request.composition_plan.chunks=[first];
   if(mode==='verse-final'){
    first.text='{brief tanpura pickup}\n'+first.text.replace('भृंगावली','भृङ्गावली');first.duration_ms=28000;
    first.positive_styles.push('Begin with a soft 0.8 second tanpura pickup before the vocal onset. Clearly articulate the opening aspirated consonant BH and vocalic R in bhṛṅgāvalī, then gā-va-lī; keep the initial consonant audible. Complete the exact Sanskrit words without any extra ending words.');
   }
  }
   const name=`verse-${String(number).padStart(2,'0')}${mode==='verse-clear'?'-clear':mode==='verse-reviewed'?'-reviewed':mode==='verse-final'?'-final':''}`;
  await save(`${name}-request`,request);await parse(name,await submit(name,'music/detailed?output_format=mp3_48000_192',request,key));
  console.log(JSON.stringify({stage:'generated',name,seconds:request.composition_plan.chunks.reduce((n,c)=>n+c.duration_ms,0)/1000}));return;
 }
 if(mode==='probe'||mode==='batch'){
  const index=mode==='probe'?0:Number(process.argv[3]);
  const source=await load('requests/batch-'+(index||1));
  const name=index?`continuation-${index}`:'verse-03-probe';
  const request=structuredClone(source);
  if(!index)request.composition_plan.chunks=request.composition_plan.chunks.slice(0,4);
  if(index===1)request.composition_plan.chunks=request.composition_plan.chunks.slice(4);
  assert(request.composition_plan.chunks.length>0);
  for(const chunk of request.composition_plan.chunks){chunk.conditioning_ref={song_id:reference.song_id,range:{start_ms:100,end_ms:21240}};chunk.condition_strength='high';
   chunk.positive_styles=chunk.positive_styles.filter(s=>!/first word immediately|four chunks|four consecutive|Complete the final word clearly and resolve briefly/.test(s));
   chunk.positive_styles.push('The conditioning reference supplies only singer timbre, chant rhythm and tanpura texture. Perform ONLY the NEW text in this chunk; do not repeat any lyrics heard in the audio reference.');}
  await save(`${name}-request`,request);await parse(name,await submit(name,'music/detailed?output_format=mp3_48000_192',request,key));
  console.log(JSON.stringify({stage:'generated',name,seconds:request.composition_plan.chunks.reduce((n,c)=>n+c.duration_ms,0)/1000}));return;
 }
 if(mode==='transcribe'||mode==='transcribe-hindi'){
  const name=process.argv[3];assert(/^(verse-03-probe|verse-(0[4-9]|[12][0-9])(-clear|-reviewed|-final|-spliced)?|continuation-[1-4]|full-approved-chant-master)$/.test(name));
  const ext=name==='full-approved-chant-master'?'wav':'mp3';
  const f=new FormData();f.append('file',new Blob([await readFile(`${root}/${name}.${ext}`)],{type:ext==='wav'?'audio/wav':'audio/mpeg'}),`${name}.${ext}`);f.append('model_id','scribe_v2');f.append('language_code',mode==='transcribe-hindi'?'hin':'tel');f.append('timestamps_granularity','word');f.append('tag_audio_events','false');
  const stem=`${name}-transcription${mode==='transcribe-hindi'?'-hindi':''}`;
  await parse(stem,await submit(stem,'speech-to-text',f,key,false));const result=await load(stem);console.log(JSON.stringify({name,text:result.text,wordCount:result.words?.filter(w=>w.type==='word').length}));return;
 }
 throw Error('Choose upload, probe, batch or transcribe');
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Audio stage stopped; inspect saved records. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
