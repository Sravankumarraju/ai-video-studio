import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {credential, db} from './anjaneya-dandakam-audio.mjs';

const root = 'output/venkateswara-vishnu-style-voice-v2-2026-10-22';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const load = async name => JSON.parse(await readFile(`${root}/${name}.json`, 'utf8'));
async function exists(name) {try {await access(`${root}/${name}`); return true;} catch {return false;}}
const verses = [
  {verse:1, seconds:16, text:'कौसल्या सुप्रजा राम पूर्वा सन्ध्या प्रवर्तते ।\nउत्तिष्ठ नरशार्दूल कर्तव्यं दैवमाह्निकम् ॥'},
  {verse:2, seconds:16, text:'उत्तिष्ठोत्तिष्ठ गोविन्द उत्तिष्ठ गरुडध्वज ।\nउत्तिष्ठ कमलाकान्त त्रैलोक्यं मङ्गलं कुरु ॥'},
  {verse:3, seconds:24, text:'मातस्समस्त जगतां मधुकैटभारेः\nवक्षोविहारिणि मनोहर दिव्यमूर्ते ।\nश्रीस्वामिनि श्रितजनप्रिय दानशीले\nश्री वेङ्कटेश दयिते तव सुप्रभातम् ॥'},
  {verse:4, seconds:24, text:'तव सुप्रभातमरविन्द लोचने\nभवतु प्रसन्नमुख चन्द्रमण्डले ।\nविधि शङ्करेन्द्र वनिताभिरर्चिते\nवृष शैलनाथ दयिते दयानिधे ॥'},
];
const positive = [
  'Original traditional Sanskrit Suprabhatam devotional recitation by one mature female South Indian Sanskrit chanter, warm clear middle register, a restrained narrow melodic contour',
  'Pronunciation is the highest priority: deliberate precise Sanskrit syllables, fully articulate every consonant and preserve short and long vowels, aspirates, retroflexes, anusvara and visarga',
  'Read the supplied Devanagari as Sanskrit, NOT conversational Hindi: retain final short a sounds where written, no Hindi schwa deletion, clear complete word endings',
  'Specific diction: utti-sh-tha with the full sh-th cluster; nara-shaar-doola; garu-da-dhvaja; madhukai-ta-bhaa-reh; vak-sho-vi-haa-ri-ni; vri-sha shaila-naa-tha',
  'Perform only the exact written Sanskrit words once in order; compact naturally connected syllables, no melisma, no swallowed or invented syllables, complete each line before a short breath',
  'Voice forward and close, almost dry, no audible echo; very quiet continuous tanpura only, accompaniment far below the chant, no instrumental introduction or interlude',
  'One consistent female singer and steady prayer cadence across all four verses; use the allotted time for clean articulation and brief natural breaths, not long sustained notes',
];
const negative = ['rushed syllables','mumbling','incorrect pronunciation','Hindi schwa deletion','slurred consonants','missing syllables','extra words','repeated lyrics','long sustained vowels','melisma','wide vibrato','choir','duet','vocal doubling','male voice','pop singing','loud music','percussion','heavy reverb','instrumental interludes','spoken explanation'];

async function submit(name, endpoint, body, key, json=true) {
  if (await exists(`${name}-attempt.json`)) {
    const attempt=await load(`${name}-attempt`);
    assert.equal(attempt.state,'completed',`Inspect existing ${name} attempt before retrying`);
    return readFile(`${root}/${name}-response.bin`);
  }
  if(json)await save(`${name}-request`,body);
  const attempt={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,authorization:'User asked to recreate the voice because pronunciation in the Suprabhatam sample is poor. Generate only a new first-four-verse sample voice and its independent transcription.',actualCharge:null};
  await save(`${name}-attempt`,attempt);
  try {
    const response=await fetch(`https://api.elevenlabs.io/v1/${endpoint}`,{method:'POST',headers:{'xi-api-key':key,...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(body):body,signal:AbortSignal.timeout(900000)});
    Object.assign(attempt,{httpStatus:response.status,contentType:response.headers.get('content-type'),songId:response.headers.get('song-id')});
    if(!response.ok){await save(`${name}-provider-error`,await response.json().catch(()=>({})));attempt.state='rejected';await save(`${name}-attempt`,attempt);throw Error(`Provider rejected ${name}: ${response.status}`);}
    const bytes=Buffer.from(await response.arrayBuffer());await writeFile(`${root}/${name}-response.bin`,bytes);
    Object.assign(attempt,{state:'completed',completedAt:new Date().toISOString(),bytes:bytes.length});await save(`${name}-attempt`,attempt);return bytes;
  }catch(error){if(attempt.state==='submitted'){attempt.state='unknown';await save(`${name}-attempt`,attempt);}throw error;}
}

async function main(){
  await mkdir(root,{recursive:true});
  await save('voice-plan',{verses,source:'https://svtemplealipurduar.org/sacred-texts/venkateswara-suprabhatam',change:'Fresh female chant from Sanskrit Devanagari input; clearer syllabic delivery, quieter tanpura, no old chant conditioning.',seconds:80,scriptInVideo:'Telugu',sampleOnly:true,published:false,pronunciationListeningReviewPending:true});
  const key=await credential();
  const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(response.ok,'Credit check unavailable');const credit=await response.json();const remaining=Number(credit.character_limit)-Number(credit.character_count);
  await save('credit-check',{remaining,tier:credit.tier,estimatedMusicCredits:1200,includedCreditsOnly:true,checkedAt:new Date().toISOString()});
  assert(credit.tier!=='free'&&remaining>=4000,'Insufficient included credits; no overage');
  if(!await exists('song.mp3')){
    const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:verses.map(v=>({text:v.text,duration_ms:v.seconds*1000,positive_styles:positive,negative_styles:negative,context_adherence:'high'}))}};
    console.log(JSON.stringify({stage:'generating-new-sample-voice',seconds:80}),true);
    const bytes=await submit('song','music/detailed?output_format=mp3_48000_192',request,key);const attempt=await load('song-attempt');
    const boundary=/boundary="?([^";\s]+)/i.exec(attempt.contentType||'')?.[1];assert(boundary,'Missing multipart boundary');
    const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
    while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const header=part.subarray(0,split).toString();let payload=part.subarray(split+4);if(payload.subarray(-2).toString()==='\r\n')payload=payload.subarray(0,-2);if(/application\/json/i.test(header))await save('song-metadata',JSON.parse(payload.toString()));else if(/audio\//i.test(header)){await writeFile(`${root}/song.mp3`,payload);found=true;}}pos=next;}
    assert(found,'Missing generated audio');
  }
  console.log(JSON.stringify({stage:'new-voice-saved'}));
  if(!await exists('independent-transcription.json')){
    const form=new FormData();form.set('file',new Blob([new Uint8Array(await readFile(`${root}/song.mp3`))],{type:'audio/mpeg'}),'suprabhatam-fresh-chant.mp3');form.set('model_id','scribe_v2');form.set('tag_audio_events','false');form.set('timestamps_granularity','word');
    const bytes=await submit('independent-transcription','speech-to-text',form,key,false);await save('independent-transcription',JSON.parse(bytes.toString()));
  }
  console.log(JSON.stringify({stage:'independent-transcription-saved',audio:`${root}/song.mp3`}));
}
main().catch(error=>{console.error(error instanceof assert.AssertionError||error.message?.startsWith('Provider rejected')?error.message:'Voice recreation stopped; inspect saved attempt records. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
