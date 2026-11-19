import assert from 'node:assert/strict';
import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {credential, db} from './anjaneya-dandakam-audio.mjs';

const root='output/venkateswara-reference-style-v3-2026-10-22';
const save=(name,data)=>writeFile(`${root}/${name}.json`,JSON.stringify(data,null,2));
const load=async name=>JSON.parse(await readFile(`${root}/${name}.json`,'utf8'));
async function exists(name){try{await access(`${root}/${name}`);return true;}catch{return false;}}

async function main(){
 await mkdir(root,{recursive:true});
 const oldRoot='output/sri-venkateswara-full-approved-2026-10-20';
 const timeline=JSON.parse(await readFile(`${oldRoot}/full-timeline.json`,'utf8'));
 const units=timeline.verses.slice(0,2);
 const lines=units.flatMap(v=>{const l=v.text.split('\n');assert.equal(l.length,4);return [l.slice(0,2).join(' '),l.slice(2).join(' ')];});
 const original=JSON.parse(await readFile(`${oldRoot}/active-key-reference.json`,'utf8'));
 assert(original.song_id,'Saved original-voice reference missing');
 const positive=[
  'Traditional South Indian female Suprabhatam: a flowing melodic morning prayer, connected Carnatic cantillation in a gentle Bowli-like morning mode, calm devotional warmth',
  'One clear mature female solo voice in a natural middle register, smooth legato syllables inside each full Sanskrit half-verse, small graceful pitch rises and falls; first line lifts gently and second resolves downward',
  'A complete half-verse is one continuous musical phrase, about six seconds, only one small breath at its end; articulate Sanskrit naturally rather than slowly naming individual words',
  'Native Sanskrit pronunciation of the exact supplied Telugu-script prayer: accurate short and long vowels, uttishtha conjunct and aspirate, narashardula, garudadhvaja, kamalakanta; every syllable fully audible',
  'Keep familiar traditional prayer cadence and musical movement, restrained expressive turns with natural line-end resolution, no theatrical runs or stretched intermediate syllables',
  'Only a quiet continuous acoustic tanpura below a prominent unmasked voice, a little natural room resonance; no percussion or melodic instrument competing with the singer',
  'Use the supplied ORIGINAL GENERATED audio only as a reference for the earlier female vocal color and connected prayer delivery; create a fresh performance of only the four supplied consecutive lyric lines',
  'Begin the first supplied word immediately, sing each lyric exactly once in order, no additional invocation and no verse repeats, keep the same singer and continuous drone through all four lines'
 ];
 const negative=['slow spoken narration','flat monotone','word-by-word pauses','staccato syllables','Hindi pronunciation','consonant smearing','missing syllables','long melisma','wide vibrato','pop ballad','dramatic singing','choir','duet','male voice','vocal doubling','loud bells','drums','instrumental interlude','introductory music','extra words','repeated lyrics','real artist impersonation'];
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:lines.map(text=>({text,duration_ms:6000,positive_styles:positive,negative_styles:negative,context_adherence:'high',conditioning_ref:{song_id:original.song_id,range:{start_ms:100,end_ms:21240}},condition_strength:'high'}))}};
 await save('request',request);
 await save('direction',{referenceUrl:'https://www.youtube.com/watch?v=s3hMKyYunJY',analysisTool:'vidIQ video watch',analysisCreditsUsed:25,analysisScope:'Third-party audio analysis; performer identity, exact timings and raga labels are unverified inferences and are not treated as established facts.',observedDirectionFromAnalysis:'Female melodic devotional chanting, continuous quiet drone, connected half-verse phrasing and gentle rise-and-fall contours',userFeedback:'The slow new version is off; the existing earlier version is somewhat better.',voiceConditioning:'Only the previously generated original chant; no YouTube recording downloaded, reused or cloned.',script:'Telugu',verses:[1,2],seconds:24,sampleOnly:true,humanPronunciationAndStyleApproval:false});
 const key=await credential(),headers={'xi-api-key':key};
 const creditResponse=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(creditResponse.ok,'Credit check failed');const credits=await creditResponse.json();const remaining=credits.character_limit-credits.character_count;
 await save('credit-check',{remaining,tier:credits.tier,estimatedMusicCredits:360,includedCreditsOnly:true});assert(credits.tier!=='free'&&remaining>=1500,'Insufficient included credits');
 let attempt;
 if(await exists('song-attempt.json')){attempt=await load('song-attempt');assert.equal(attempt.state,'completed','Inspect saved generation before retrying');}
 else{
  attempt={state:'submitted',submittedAt:new Date().toISOString(),authorization:'User requested a short replacement Suprabhatam voice sample like their supplied YouTube reference; earlier original generated voice was better than the rejected slow version.',maximumCalls:1,actualCharge:null};await save('song-attempt',attempt);
  try{
   console.log(JSON.stringify({stage:'generating-reference-guided-sample',seconds:24}));
   const response=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(300000)});
   Object.assign(attempt,{httpStatus:response.status,contentType:response.headers.get('content-type'),songId:response.headers.get('song-id')});
   if(!response.ok){await save('provider-error',await response.json().catch(()=>({})));attempt.state='rejected';await save('song-attempt',attempt);throw Error(`Provider rejected sample: ${response.status}`);}
   const bytes=Buffer.from(await response.arrayBuffer());await writeFile(`${root}/song-response.bin`,bytes);Object.assign(attempt,{state:'completed',completedAt:new Date().toISOString(),bytes:bytes.length});await save('song-attempt',attempt);
  }catch(error){if(attempt.state==='submitted'){attempt.state='unknown';await save('song-attempt',attempt);}throw error;}
 }
 const bytes=await readFile(`${root}/song-response.bin`);const boundary=/boundary="?([^";\s]+)/i.exec(attempt.contentType||'')?.[1];assert(boundary,'Missing audio response boundary');const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const header=part.subarray(0,split).toString();let payload=part.subarray(split+4);if(payload.subarray(-2).toString()==='\r\n')payload=payload.subarray(0,-2);if(/application\/json/i.test(header))await save('song-metadata',JSON.parse(payload.toString()));else if(/audio\//i.test(header)){await writeFile(`${root}/Suprabhatam-Reference-Style-Voice-Sample.mp3`,payload);found=true;}}pos=next;}
 assert(found,'Missing audio');console.log(JSON.stringify({stage:'sample-saved',file:`${root}/Suprabhatam-Reference-Style-Voice-Sample.mp3`}));
}
main().catch(error=>{console.error(error instanceof assert.AssertionError||error.message?.startsWith('Provider rejected')?error.message:'Reference sample stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
