import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
import {specs as threePartSpecs} from './ayyappa-three-part-content-20261022.mjs';
const threePart=process.argv.includes('--three-part');
const root='data/productions/divine-wisdom/'+(threePart?'ayyappa-birth-story-three-part-2026-10-22':'ayyappa-birth-story-2026-10-22');
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
const exists=async n=>{try{await access(`${root}/${n}`);return true;}catch{return false;}};
const chorus='హరిహర సుతుడా శరణం అయ్యప్పా\nమణికంఠ స్వామీ శరణం అయ్యప్పా\nధర్మము నిలిపే దయగల దైవమా\nమా హృదయ మందిరం నీదే అయ్యప్పా';
const specs=[
 ['invocation',12,'ఆరంభ ప్రార్థన','పంబా తరంగమా కథను వినిపించవా\nహరిహర సుతుని మహిమను పాడవా','01-pamba-infant.png'],
 ['chorus-1',24,'పల్లవి',chorus,'02-divine-birth.png'],
 ['birth',42,'హరిహరసుతుని అవతారం','మహిషి బాధతో లోకాలు తల్లడిల్లె\nదేవతల ప్రార్థన దిక్కులను తాకె\nధర్మ రక్షణకు దివ్య సంకల్పం\nహరిహరుల కరుణే జగతికి అభయం\nశ్రీహరి మోహిని రూపము దాల్చె\nశివుని తేజము శుభమును పంచె\nహరిహర సుతుడై వెలసిన స్వామి\nలోకము కాచే దైవం అయ్యప్ప','02-divine-birth.png'],
 ['chorus-2',24,'పల్లవి',chorus,'01-pamba-infant.png'],
 ['manikanta',42,'పంబా తీరాన మణికంఠుడు','పంబా తీరపు పచ్చని వనమందు\nపసిబాలుని రూపం వెలుగులు చిందె\nవేటకు వచ్చిన రాజశేఖరుడు\nబాలుని చూచి మురిసిన వేళ\nకంఠమున మెరిసే మణిని గాంచె\nమణికంఠుడని ప్రేమగ పిలిచె\nపందళ రాజ్యపు ఒడిలో చేర్చె\nకన్నబిడ్డగా కౌగిట పెంచె','03-pandalam-king.png'],
 ['childhood',36,'పందళంలో బాల్యం','గురుకులమందు విద్యలు నేర్చె\nవినయము తోడై బాలుడు పెరిగె\nచిరునవ్వులోన కరుణను చూపె\nచిన్నని చేతుల సేవను పంచె\nరాజ్యపు వైభవం కన్నా మిన్నగా\nప్రజల క్షేమమే కోరిన స్వామి\nరాజుకు తనయుడు జగతికి రక్షకుడు\nమణికంఠునిలో దివ్యము దాగె','04-palace-blessing.png'],
 ['chorus-3',24,'పల్లవి',chorus,'hero-sabarimala.png'],
 ['mission',42,'మహిషి సంహారం — దివ్య కార్యం','పులిపాల కోసము అడవికి కదిలె\nలోక రక్షణకు సమయము వచ్చె\nమహిషి ఎదుట నిలిచిన స్వామి\nధర్మపు శక్తిని జగతికి చూపె\nమహిషిని జయించి భయమును తొలగించె\nదేవతలందరు దీవెనలిచ్చె\nపులుల తోడుగా పందళం చేరె\nదివ్య స్వరూపం రాజుకు తెలిపె','hero-sabarimala.png'],
 ['purpose',42,'శబరిమల దివ్య సంకల్పం','రాజ్యము కన్నా ధర్మమే మిన్నని\nభక్తుల మేలే తన పని అన్నాడు\nశబరిగిరిపై ఆలయం కోరె\nశరణు కోరిన వారికి అభయము ఇచ్చె\nపంబా జలముల పవిత్ర భావం\nకొండల దారిలో శరణ ఘోష\nమనసున దయతో నడిచే భక్తికి\nధర్మశాస్తయే వెలుగై నిలిచె','hero-sabarimala.png'],
 ['chorus-4',30,'ముగింపు పల్లవి',chorus,'hero-sabarimala.png'],
 ['prayer',12,'శరణం అయ్యప్పా','స్వామియే శరణం అయ్యప్పా\nధర్మశాస్తా శరణం అయ్యప్పా','hero-sabarimala.png']
];
async function main(){
 await mkdir(root,{recursive:true});let t=0;
 const sections=(threePart?threePartSpecs:specs).map(([id,seconds,title,text,image])=>{const s={id,seconds,title,text,image,start:t,end:t+seconds};t+=seconds;return s;});assert.equal(t,threePart?246:330);
 const plan={title:'అయ్యప్ప స్వామి జన్మకథ — హరిహరసుతుని అవతారం',language:'te',seconds:t,sections,originalLyrics:true,originalMusic:true,published:false,accountCreditsOnly:true,estimatedMusicCredits:4950,estimatedChargeBasis:'Existing studio estimate: 900 credits/minute. Actual charge unknown until provider reports.',authorization:'User asked to create a 5–6 minute Ayyappa birth story-song video with recurring chorus.',sources:['https://www.keralatourism.org/sabarimala/mythology','https://www.keralatourism.org/sabarimala/history'],classification:'Devotional tradition; artistic retelling, not a historical claim',manualListeningVerified:false};
 if(process.argv[2]!=='transcribe'){await save('plan',plan);await writeFile(`${root}/lyrics-telugu.txt`,sections.map(s=>s.title+'\n'+s.text).join('\n\n')+'\n');}
 if(process.argv[2]==='prepare')return;
 const key=await credential();
 const sub=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});assert(sub.ok,'Account check failed');const a=await sub.json();const remaining=a.character_limit-a.character_count;await save('credit-check',{tier:a.tier,remaining,estimatedMusicCredits:4950});assert(a.tier!=='free'&&remaining>7000,'Insufficient included credits');
 if(process.argv[2]==='transcribe'){
  assert(!await exists('transcribe-attempt.json'),'Transcription attempt exists; inspect before retry');
  await save('transcribe-attempt',{state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1});
  const form=new FormData();form.set('file',new Blob([new Uint8Array(await readFile(`${root}/song.mp3`))],{type:'audio/mpeg'}),'ayyappa.mp3');form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','true');form.set('timestamps_granularity','word');
  const r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':key},body:form,signal:AbortSignal.timeout(600000)});assert(r.ok,`Transcription HTTP ${r.status}`);const result=await r.json();await save('transcribe',result);await save('transcribe-attempt',{state:'completed'});console.log(JSON.stringify({stage:'transcribed',words:result.words?.length}));return;
 }
 const positive=['Original Telugu narrative devotional song about Lord Ayyappa, reverent uplifting South Indian bhajan, 88 BPM, lilting steady rhythm','One warm expressive adult male lead singer with clear native Telugu pronunciation, same voice throughout','New memorable melodic four-line chorus, simple strong melodic hook in a comfortable middle register','Veena, bamboo flute, tanpura, gentle mridangam and restrained temple bell accents, rich soft strings','HIGHEST PRIORITY native Telugu diction, preserve vowel length and every consonant, natural word boundaries; especially Shiva Mohinula, Harihara sutuda, Manikantha, Mahishi, Shabarigiri, Dharmashasta','Vocal is centered and clearly louder than instruments, dry clear voice, restrained melodic ornament, complete every supplied word','Sing every supplied line exactly once in order within each section, take gentle breaths at line endings, short melodic responses after complete lines','Continuous coherent song with smooth section joins and a memorable refrain, steady tempo and consistent melodic identity','Start singing the FIRST supplied Telugu line on the first beat at time zero, immediate story opening, complete the first two lines within twelve seconds','Keep the same music bed through section boundaries and finish all supplied lines before the final two seconds, short graceful resolution'];
 const negative=['spoken narration','artist imitation','mumbled words','missing lyrics','extra lyrics','long instrumental intro','extended instrumental solos','shouting','heavy reverb','rushed syllables','rap','EDM'];
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:sections.map(s=>({text:s.text,duration_ms:s.seconds*1000,positive_styles:[...positive,...(s.id.startsWith('chorus')?['Return to the identical memorable chorus melody established in first chorus']:[])],negative_styles:negative,context_adherence:'high'}))}};
 await save('song-request',request);
 let record;
 if(await exists('song-attempt.json')){record=JSON.parse(await readFile(`${root}/song-attempt.json`,'utf8'));assert.equal(record.state,'completed','Existing unresolved generation; do not submit again');}
 else{
  record={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,seconds:t,actualCharge:null,authorization:plan.authorization};await save('song-attempt',record);
  console.log(JSON.stringify({stage:'generating-original-story-song',seconds:t,sections:sections.length,threePart}));
  const r=await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(900000)});
  record.httpStatus=r.status;record.contentType=r.headers.get('content-type');record.songId=r.headers.get('song-id');
  if(!r.ok){record.state='rejected';await save('song-provider-error',await r.json().catch(()=>({})));await save('song-attempt',record);throw Error(`Music HTTP ${r.status}`);}
  const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/song-response.bin`,bytes);record.state='completed';record.bytes=bytes.length;await save('song-attempt',record);
 }
 const bytes=await readFile(`${root}/song-response.bin`);const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];
 if(!boundary&&/audio\//i.test(record.contentType)){await writeFile(`${root}/song.mp3`,bytes);return;}assert(boundary,'Missing response boundary');const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next);const split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const head=part.subarray(0,split).toString();let body=part.subarray(split+4);if(body.subarray(-2).toString()==='\r\n')body=body.subarray(0,-2);if(/application\/json/i.test(head))await save('song-metadata',JSON.parse(body.toString()));else if(/audio\//i.test(head)){await writeFile(`${root}/song.mp3`,body);found=true;}}pos=next;}assert(found,'Missing song audio');console.log('Original 5:30 song saved');
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||e.message?.startsWith('Music HTTP')?e.message:'Production stopped; inspect saved attempts. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
