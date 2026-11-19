import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='output/om-namah-shivaya-108-2026-10-23';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function exists(n){try{await access(`${root}/${n}`);return true;}catch{return false;}}
async function main(){
 await mkdir(root,{recursive:true});
 const positive=[
 'Original peaceful Sanskrit Shiva mantra japa, contemplative devotional chanting, soft 60 BPM four beat pulse, one mantra every eight seconds',
 'One warm resonant male singer, comfortable low middle register, gently melodic chant with small pitch movement, unhurried clear diction, close intimate vocal',
 'Sing exactly the supplied Sanskrit mantra once per chunk: Om Namah Shivaya; pronounced Om na-mah shi-VAA-ya, long aa in Shivaya, soft sh, articulate final ya completely',
 'Sustain Om naturally with a closed humming m, then connected namah shivaya; leave a gentle natural breath after the full mantra; no extra Om or other words',
 'Quiet continuous tanpura tonic and fifth drone, faint warm harmonium, sparse soft bansuri flute only in the breath spaces, subtle water ambience, no prominent percussion',
 'Same simple original melody and tonic in every section, steady peaceful dynamics, no dramatic build, no crescendo, no key change',
 'Begin each section with the chant within the first half second, finish the last ya by six seconds, reserve last two seconds for breath and stable drone',
 'Clean warm natural production, voice distinctly above accompaniment, very light room reverb, seamless sustained drone between sections, no copied melody or impersonation'
 ];
 const negative=['spoken narration','extra lyrics','extra repetitions','om shanti','shouting','rapid chanting','heavy drums','EDM','bass drops','loud bells','mumbled words','heavy reverb','melisma','wordless vocals','vocal doubling','long introduction','artist imitation'];
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:Array.from({length:4},()=>({text:'ॐ नमः शिवाय',duration_ms:8000,positive_styles:positive,negative_styles:negative,context_adherence:'high'}))}};
 await save('request',request);
 await save('production-plan',{title:'Om Namah Shivaya Chanting | Powerful Mantra for Healing, Protection & Inner Peace',repetitions:108,sourceCycles:4,cycleSeconds:8,aspect:'landscape',resolution:[1920,1080],authorization:'User explicitly approved credit usage for this chanting video in the current chat, 2026-10-23.',music:'Original generated melodic chanting and quiet accompaniment; select one complete verified cycle and repeat PCM 108 times without speed or pitch change.',visual:'Original Shiva lingam still with separately animated water and recurring flower offerings. Composite animation, not generative live-action video.',meaning:'Salutations to Shiva. Namah Shivaya is traditionally called the five-syllable Panchakshara; Om precedes it.',claims:'Healing and protection are devotional aspirations, not promises of medical treatment or guaranteed physical protection.',sources:['https://www.artofliving.org/in-en/culture/reads/om-namah-shivaya-maha-mantra','https://www.himalayanacademy.com/media/books/path-to-siva/web/ch45.html','https://elevenlabs.io/docs/api-reference/music/compose','https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans'],humanPronunciationReviewPending:true,published:false});
 let attempt;
 if(await exists('song-attempt.json')){attempt=JSON.parse(await readFile(`${root}/song-attempt.json`,'utf8'));assert.equal(attempt.state,'completed','Existing attempt must be inspected before retry');}
 else{
 const key=await credential();const headers={'xi-api-key':key};
 const c=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});assert(c.ok,'Credit check failed');const sub=await c.json();const remaining=sub.character_limit-sub.character_count;
 await save('credit-check',{remainingIncludedCredits:remaining,tier:sub.tier,plannedMusicSeconds:32,conservativeHeadroomRequired:3000,includedCreditsOnly:true});assert(sub.tier!=='free'&&remaining>=3000,'Insufficient included credits');
 attempt={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,seconds:32,authorization:'User approved credit use for Om Namah Shivaya video'};await save('song-attempt',attempt);console.log(JSON.stringify({stage:'generating',seconds:32}));
 try{const r=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(600000)});
 Object.assign(attempt,{httpStatus:r.status,contentType:r.headers.get('content-type'),songId:r.headers.get('song-id')});
 if(!r.ok){await save('provider-error',await r.json().catch(()=>({})));attempt.state='rejected';await save('song-attempt',attempt);throw Error(`Provider HTTP ${r.status}`);}
 const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/song-response.bin`,bytes);Object.assign(attempt,{state:'completed',bytes:bytes.length,completedAt:new Date().toISOString()});await save('song-attempt',attempt);
 const after=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});if(after.ok){const a=await after.json();await save('credit-after',{remainingIncludedCredits:a.character_limit-a.character_count,accountCreditDifference:a.character_count-sub.character_count,note:'May include concurrent account usage'});}
 }catch(e){if(attempt.state==='submitted'){attempt.state='unknown';await save('song-attempt',attempt);}throw e;}}
 const bytes=await readFile(`${root}/song-response.bin`);const boundary=/boundary="?([^";\s]+)/i.exec(attempt.contentType||'')?.[1];assert(boundary);const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const header=part.subarray(0,split).toString();let payload=part.subarray(split+4);if(payload.subarray(-2).toString()==='\r\n')payload=payload.subarray(0,-2);if(/application\/json/i.test(header))await save('song-metadata',JSON.parse(payload.toString()));else if(/audio\//i.test(header)){await writeFile(`${root}/original-four-cycles.mp3`,payload);found=true;}}pos=next;}
 assert(found);console.log(JSON.stringify({state:'saved',file:`${root}/original-four-cycles.mp3`}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||/^Provider HTTP/.test(e.message)?e.message:'Generation stopped; inspect saved records. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
