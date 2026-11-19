import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';

const root='output/gayatri-mantra-108-original-2026-10-22';
const save=(name,value)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
const lyrics='ॐ भूर्भुवः स्वः\nतत्सवितुर्वरेण्यं\nभर्गो देवस्य धीमहि\nधियो यो नः प्रचोदयात्';
async function exists(name){try{await access(`${root}/${name}`);return true;}catch{return false;}}
async function main(){
 await mkdir(root,{recursive:true});
 const positive=[
  'Original melodic Sanskrit Gayatri Mantra devotional chant, uplifting peaceful morning bhajan, steady 86 BPM in 4/4',
  'Clear warm female lead singer in a comfortable middle to high register, softly blended female unison backing supporting the same words',
  'Fresh original simple memorable repeating melody, natural connected syllables and restrained melodic rise and fall',
  'Clear native Sanskrit pronunciation, preserve every syllable, vowel length and aspirate, especially bhur bhuvah svah, savitur varenyam, bhargo devasya dhimahi, dhiyo yo nah prachodayat',
  'Sing each full supplied mantra exactly once in each section, one complete mantra per fourteen second musical cycle',
  'Quiet continuous tanpura, warm harmonium and soft pad, gentle tabla dholak pulse and delicate manjira accents, vocal clearly above instruments',
  'Immediate vocal entry in the first beat of each section; complete prachodayat before the next section, coherent identical melody and percussion across all four cycles',
  'Clean warm studio sound, light natural reverb, calm steady devotional energy, short natural final decay'
 ];
 const negative=['spoken narration','extra lyrics','om shanti outro','missing words','repeated words within section','long instrumental intro','instrumental interlude','melisma','mumbled consonants','heavy echo','loud drums','shouting','rap','EDM','artist imitation'];
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:Array.from({length:4},()=>({text:lyrics,duration_ms:14000,positive_styles:positive,negative_styles:negative,context_adherence:'high'}))}};
 await save('request',request);
 await writeFile(`${root}/lyrics-sanskrit.txt`,lyrics+'\n');
 await writeFile(`${root}/lyrics-telugu.txt`,'ఓం భూర్భువః స్వః\nతత్సవితుర్వరేణ్యం\nభర్గో దేవస్య ధీమహి\nధియో యో నః ప్రచోదయాత్\n');
 await save('production-plan',{channel:'Divine Wisdom Telugu',reference:'https://www.youtube.com/watch?v=nwRoHC83wx0',authorization:'User requested Gayatri Mantra 108 times for their channel and explicitly chose a new original chant.',repetitions:108,sourceCycles:4,plannedCycleSeconds:14,method:'Select a complete middle cycle using returned word timestamps, then repeat exact PCM audio 108 times with cycle counter and Telugu-script lyrics.',originalAudio:true,thirdPartyAudioReused:false,voiceClone:false,published:false,humanPronunciationReviewPending:true,textReference:'https://stotranidhi.com/gayatri-mantra-in-telugu',referenceAnalysis:{method:'vidIQ video watch, observations are automated estimates',femaleMelodicChant:true,tempoEstimateBpm:[85,90],cycleEstimateSeconds:14,creditsUsed:25}});
 let attempt;
 if(await exists('song-attempt.json')){attempt=JSON.parse(await readFile(`${root}/song-attempt.json`,'utf8'));assert.equal(attempt.state,'completed','An attempt exists; inspect it before any additional generation.');}
 else{
  const key=await credential();
  const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(check.ok,'Subscription check failed');const sub=await check.json();const remaining=sub.character_limit-sub.character_count;
  await save('credit-check',{tier:sub.tier,remaining,estimatedMusicCredits:840,pricingBasis:'Existing studio estimate of 900 credits/minute; actual charge may differ',includedCreditsOnly:true});
  assert(sub.tier!=='free'&&remaining>=2000,'Insufficient included music credits');
  attempt={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,durationSeconds:56,authorization:'User explicitly requested a new original Gayatri chant for a 108-repeat video.',actualCharge:null};await save('song-attempt',attempt);
  try{
   console.log(JSON.stringify({stage:'generating-original-chant',seconds:56,cycles:4}));
   const response=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(600000)});
   Object.assign(attempt,{httpStatus:response.status,contentType:response.headers.get('content-type'),songId:response.headers.get('song-id')});
   if(!response.ok){await save('provider-error',await response.json().catch(()=>({})));attempt.state='rejected';await save('song-attempt',attempt);throw Error(`Provider rejected chant: ${response.status}`);}
   const bytes=Buffer.from(await response.arrayBuffer());await writeFile(`${root}/song-response.bin`,bytes);Object.assign(attempt,{state:'completed',completedAt:new Date().toISOString(),bytes:bytes.length});await save('song-attempt',attempt);
  }catch(error){if(attempt.state==='submitted'){attempt.state='unknown';await save('song-attempt',attempt);}throw error;}
 }
 const bytes=await readFile(`${root}/song-response.bin`);const boundary=/boundary="?([^";\s]+)/i.exec(attempt.contentType||'')?.[1];assert(boundary,'Missing multipart boundary');
 const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const header=part.subarray(0,split).toString();let payload=part.subarray(split+4);if(payload.subarray(-2).toString()==='\r\n')payload=payload.subarray(0,-2);if(/application\/json/i.test(header))await save('song-metadata',JSON.parse(payload.toString()));else if(/audio\//i.test(header)){await writeFile(`${root}/original-four-cycles.mp3`,payload);found=true;}}pos=next;}
 assert(found,'Audio not found');console.log(JSON.stringify({stage:'chant-saved',file:`${root}/original-four-cycles.mp3`}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Chant generation stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
