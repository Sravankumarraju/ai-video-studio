import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {createDecipheriv} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = 'data/productions/divine-wisdom/anjaneya-dandakam-2026-10-16';
const sourceRoot = 'data/productions/divine-wisdom/hanuman-chalisa/full-original-2026-10-06';
const db = new PrismaClient();
const mode = process.argv[2];
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
async function exists(name) { try {await access(`${root}/${name}`); return true;} catch {return false;} }
const read = async (name) => JSON.parse(await readFile(`${root}/${name}.json`, 'utf8'));

async function credential() {
  let key = process.env.ELEVENLABS_API_KEY;
  if (!key || /^(<|PASTE|your)/i.test(key)) {
    const profile = await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});
    const bytes = Buffer.from(profile.encryptedKey, 'base64');
    const cipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex'), bytes.subarray(0,12));
    cipher.setAuthTag(bytes.subarray(-16));
    key = Buffer.concat([cipher.update(bytes.subarray(12,-16)),cipher.final()]).toString('utf8');
  }
  return key;
}

async function submit(name, url, body, key, json = true, authorization) {
  assert(!await exists(`${name}-attempt.json`), 'Existing attempt: inspect saved result before retrying');
  const record = {state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,
    authorization:authorization || 'User requested full supplied Anjaneya Dandakam song, same previous Hanuman Chalisa voice, channel welcome and closing, logo and highlighted captions.',actualCharge:null};
  await save(`${name}-attempt`,record);
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/${url}`, {
      method:'POST',headers:{'xi-api-key':key,...(json?{'Content-Type':'application/json'}:{})},
      body:json?JSON.stringify(body):body,signal:AbortSignal.timeout(900000)});
    record.httpStatus=response.status; record.contentType=response.headers.get('content-type');
    record.songId=response.headers.get('song-id');
    if (!response.ok) {
      const problem=await response.json().catch(()=>({}));
      await save(`${name}-provider-error`,problem);
      record.state='rejected';
      record.reason=typeof problem.detail?.status==='string'?problem.detail.status:'provider_rejected';
      await save(`${name}-attempt`,record);
      throw Error(`Provider rejected ${name}: ${response.status} (${record.reason})`);
    }
    const bytes=Buffer.from(await response.arrayBuffer());
    await writeFile(`${root}/${name}-response.bin`,bytes);
    record.state='completed';record.bytes=bytes.length;record.completedAt=new Date().toISOString();
    await save(`${name}-attempt`,record);
    console.log(JSON.stringify({operation:name,...record}));
    return bytes;
  } catch(error) {
    if(record.state==='submitted'){record.state='unknown';await save(`${name}-attempt`,record);}
    throw error;
  }
}

async function prepare(){
  await mkdir(root,{recursive:true});
  const lyrics=(await readFile(`${root}/lyrics-supplied.txt`,'utf8')).trim();
  const blocks=lyrics.split(/\r?\n\s*\r?\n/);
  assert.equal(blocks.length,17);
  const reference=await exists('reference.json')?await read('reference'):JSON.parse(await readFile(`${sourceRoot}/reference-upload.json`,'utf8'));
  const narration=JSON.parse(await readFile('data/productions/divine-wisdom/hanuman-chalisa/explanation-te-2026-10-06/episode.json','utf8'));
  const segmenter=new Intl.Segmenter('te',{granularity:'grapheme'});
  let start=0;
  const sections=blocks.map((text,index)=>{
    const syllables=[...segmenter.segment(text)].filter(s=>/[\u0c00-\u0c7f]/.test(s.segment)).length;
    const seconds=Math.max(16,Math.ceil((syllables/3.1+3)/2)*2);
    const item={index,text,seconds,start,end:start+seconds,syllables};start+=seconds;return item;
  });
  assert(start<=600,'Song exceeds single composition limit; adjust section grouping');
  const positive=[
    'Telugu Anjaneya Dandakam, flowing powerful reverent South Indian devotional melody at 92 BPM',
    'same warm adult male lead singer, vocal identity and natural mid-range timbre as supplied Hanuman Chalisa audio reference; one solo lead throughout',
    'HIGHEST PRIORITY precise native Telugu diction, every supplied syllable sung distinctly and completely in its exact order',
    'preserve short and long vowels, consonant combinations and natural word boundaries; no omitted, repeated, translated or added lyrics',
    'minimal ornamentation, natural brief breaths at meaningful phrase endings; allow extra time for dense passages',
    'lead voice centered, close and clearly louder than accompaniment, intelligible even on mobile phone speaker',
    'very light room reverb, dry clear vocal, soft tanpura harmonium veena flute and gentle mridangam',
    'drums bass bells and strings quiet during singing; musical energy only between complete vocal phrases',
    'same singer and coherent melody throughout all sections; gentle resolution after final supplied syllable'
  ];
  const negative=['choir','overlapping vocals','vocal doubling','audible echo','heavy reverb','mumbling','swallowed syllables','rushed words','skipped lyrics','extra lyrics','repeated lyrics','unnatural word stretching','long melisma','loud drums','shouting','female lead','rap','EDM','spoken commentary'];
  const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,
    composition_plan:{chunks:sections.map(s=>({text:s.text,duration_ms:s.seconds*1000,positive_styles:positive,negative_styles:negative,context_adherence:'high',conditioning_ref:{song_id:reference.song_id,range:{start_ms:30000,end_ms:60000}},condition_strength:'high'}))}};
  const bookends=[
    {name:'welcome',text:'జై శ్రీరామ్! జై హనుమాన్! డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. ఇప్పుడు శ్రీ ఆంజనేయ దండకాన్ని భక్తితో ఆలకిద్దాం.'},
    {name:'closing',text:'జై ఆంజనేయా! ఈ దండకం మీకు నచ్చితే మన డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. వీడియోను లైక్ చేయండి, మీ కుటుంబ సభ్యులతో, స్నేహితులతో షేర్ చేయండి. కామెంట్‌లో జై హనుమాన్ అని రాయండి. జై శ్రీరామ్!'}
  ];
  await save('request',request);
  await save('plan',{channelName:'Divine Wisdom Telugu',title:'శ్రీ ఆంజనేయ దండకం',seconds:start,sections,bookends,
    narrationVoiceId:narration.voiceId,narrationModel:narration.model,singingReference:{songId:reference.song_id,file:`${sourceRoot}/full-song-raw.mp3`,range:[30,60],identityMatchGuaranteed:false},
    logo:'data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',captionStyle:'Large shaped Telugu, white text, gold active word, maximum two lines',published:false});
  console.log(JSON.stringify({prepared:true,seconds:start,sections:sections.length,words:lyrics.split(/\s+/).length}));
}

async function parseSong(){
  const name=await exists('song-revised-attempt.json')?'song-revised':'song';
  const record=await read(`${name}-attempt`);
  const bytes=await readFile(`${root}/${name}-response.bin`);
  const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];
  if(!boundary&&/audio\//i.test(record.contentType||'')){await writeFile(`${root}/song.mp3`,bytes);return;}
  assert(boundary,'Missing multipart boundary');
  const marker=Buffer.from('--'+boundary);let position=bytes.indexOf(marker),found=false;
  while(position>=0){
    const next=bytes.indexOf(marker,position+marker.length);if(next<0)break;
    const part=bytes.subarray(position+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));
    if(split>=0){const header=part.subarray(0,split).toString();let body=part.subarray(split+4);
      if(body.subarray(-2).toString()==='\r\n')body=body.subarray(0,-2);
      if(/application\/json/i.test(header))await save('song-metadata',JSON.parse(body.toString()));
      else if(/audio\//i.test(header)){await writeFile(`${root}/song.mp3`,body);found=true;}}
    position=next;
  }
  assert(found,'Missing audio');console.log('Song audio and metadata saved');
}

async function main(){
  await prepare();if(mode==='prepare')return;
  if(mode==='parse'){await parseSong();return;}
  const key=await credential();
  const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(response.ok,'Subscription check failed');
  const info=await response.json(),remaining=Number(info.character_limit)-Number(info.character_count);
  await save('credit-check',{remainingCredits:remaining,tier:info.tier,checkedAt:new Date().toISOString()});
  console.log(JSON.stringify({tier:info.tier,remainingCredits:remaining}));
  if(mode==='check')return;
  assert(info.tier!=='free'&&remaining>=20000,'Insufficient included credits; no overage');
  const plan=await read('plan');
  if(mode==='upload'){
    assert(!await exists('reference.json'),'Reference already uploaded');
    const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile('data/productions/divine-wisdom/hanuman-chalisa/sung-preview-2026-10-06/hanuman-chalisa-powerful-preview.mp3'))],{type:'audio/mpeg'}),'previous-hanuman-chalisa.mp3');
    form.append('with_timestamps','true');
    const bytes=await submit('reference-upload','music/upload',form,key,false);
    const result=JSON.parse(bytes.toString());assert(result.song_id);await save('reference',result);
  }else if(mode==='generate'||mode==='generate-revised'){
    for(const name of ['song','song-revised']){
      if(await exists(`${name}-provider-error.json`)){
        const problem=await read(`${name}-provider-error`);
        assert(problem.detail?.data?.reason!=='copyrighted_material_detected','Provider copyright block: do not resubmit this song request');
      }
    }
    if(mode==='generate-revised'){
      const rejected=await read('song-attempt');
      assert(rejected.state==='rejected'&&rejected.httpStatus===400&&await exists('reference.json'),'Only repair rejected request with fresh reference');
    }
    await submit(mode==='generate'?'song':'song-revised','music/detailed?output_format=mp3_48000_192',await read('request'),key);
    await parseSong();
  }else if(mode==='bookends'){
    for(const section of plan.bookends){
      if(await exists(`${section.name}.mp3`))continue;
      const body={inputs:[{text:section.text,voice_id:plan.narrationVoiceId}],model_id:plan.narrationModel,language_code:'te'};
      await save(`${section.name}-request`,body);
      const bytes=await submit(section.name,'text-to-dialogue/with-timestamps',body,key);
      const result=JSON.parse(bytes.toString());assert(result.audio_base64&&result.alignment,'Missing narration audio/alignment');
      await writeFile(`${root}/${section.name}.mp3`,Buffer.from(result.audio_base64,'base64'));
      await save(`${section.name}-alignment`,result.alignment);
    }
  }else if(mode==='align'){
    const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/song.mp3`))],{type:'audio/mpeg'}),'dandakam.mp3');
    form.append('text',(await readFile(`${root}/lyrics-supplied.txt`,'utf8')).trim());
    const bytes=await submit('alignment','forced-alignment',form,key,false);await save('alignment',JSON.parse(bytes.toString()));
  }else throw Error('Invalid stage');
}
export {credential,submit,save,read,exists,db,root};
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error(error instanceof assert.AssertionError||String(error.message).startsWith('Provider rejected')?error.message:'Audio stage failed; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
}
