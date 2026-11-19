import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
export const root='data/productions/divine-wisdom/karthika-deepam-2026-10-22';
const save=(n,v)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
const exists=async n=>{try{await access(`${root}/${n}`);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const chorus=`దీపం దీపం కార్తీక దీపం
ఇంటింట వెలిగే భక్తికి రూపం
శివ శివ శంభో కేశవ మాధవ
మా మది గుడిలో కొలువై నిలవ
బిల్వపు దళమైనా తులసీ దళమైనా
ప్రేమతో అర్పిస్తే పూజే కాదా
శివ శివ శంభో కేశవ మాధవ
మా ప్రతి శ్వాసలో నీ స్మరణే కదా`;
const specs=[
 ['opening',24,'ఆరంభ పిలుపు',`వెలిగించు వెలిగించు మనసున దీపం
పలికించు పలికించు హరిహర నామం
తెల్లవారే వేళలో శివుని తలచుకో
సంధ్యదీప కాంతిలో హరిని కొలుచుకో`,'01-harihara-deepam.png'],
 ['chorus-1',36,'కార్తీక దీపం — పల్లవి',chorus,'01-harihara-deepam.png'],
 ['verse-1a',24,'వేకువ పూజ',`వేకువ చల్లని నదినీటి తాకిడిలో
మేలుకొలుపు వినిపించే గుడిగంటలో
తడిసిన మెట్లపై అడుగులు వేస్తుంటే
నీ పేరు పలికితే అలసట తీరే`,'02-shiva-bilva.png'],
 ['verse-1b',24,'భక్తి కానుక',`చెంతన తెచ్చిన చిన్న పూలమాల
చేతులలో ఒదిగిన ఒక్క ప్రమిద
పెద్దవి కానక్కరలేని కానుకలు
నిండిన మనసే నీకిచ్చే సంపద`,'02-shiva-bilva.png'],
 ['verse-1c',20,'శివకేశవుల కరుణ',`జటలో గంగమ్మ జాలువారగా
మురళిలో స్వరమే తేనెలూరగా
శివుని కరుణ హరిని చేరగా
శాంతి కురిసెను మనసంతా`,'03-vishnu-tulasi.png'],
 ['chorus-2',36,'పల్లవి',chorus,'01-harihara-deepam.png'],
 ['verse-2a',24,'ఇంటింటా సంధ్యదీపం',`తులసి కోట చెంత సంధ్య వేళలో
వరుస దీపాల పసిడి వెలుగులో
అమ్మ పలికే నామం వింటుంటే
బాల్యపు జ్ఞాపకం మళ్లీ నవ్వే`,'04-karthika-deepalu.png'],
 ['verse-2b',24,'ప్రేమనే పూజ',`ఆవరణంలో ఉసిరి చెట్టు నీడ
అందరూ చేరిన ఆప్యాయ వేళ
పంచిన అన్నంలో ప్రేమను చూడనీ
పక్కవారి ఆకలి మనకూ తెలియనీ
దీపం వెలిగించి చేయి అందిద్దాం
దీనుల కన్నీటిని తుడిచేద్దాం
శివకేశవులను స్మరిస్తూ సాగుదాం
దయనే మన పూజగా సమర్పిద్దాం`,'04-karthika-deepalu.png'],
 ['bridge',24,'వెలుగును పంచుదాం',`ఒక దీపం మరో దీపం
వెలిగిస్తే తగ్గదు తన వెలుగే
ఒక మంచి మరో మంచి
పంచితే పెరుగును మన ప్రేమే
శివుని నామం మనసుకు శాంతి
హరినామం బ్రతుకుకు కాంతి
రెండు పేర్లు పలికే పెదవులపై
ఒకటే భక్తి ఒకటే ప్రీతి`,'05-river-temple-deepotsavam.png'],
 ['chorus-final',30,'చివరి పల్లవి',chorus,'01-harihara-deepam.png'],
 ['prayer',14,'శివకేశవుల స్మరణ',`వెలిగే దీపం మా మదిలో నిలవనీ
కార్తీక భక్తి ప్రతి రోజూ సాగనీ
ఓం నమః శివాయ నమో నారాయణాయ
శివకేశవుల స్మరణే మా జీవన గానం`,'05-river-temple-deepotsavam.png']
];
async function submit(name,endpoint,body,key,json=true){
 assert(!await exists(`${name}-attempt.json`),'Existing attempt; inspect it before another submission');
 const ledger={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,actualCharge:null,authorization:'User said start creating video, then requested channel logo, welcome, closing CTA, 4–5 images, thumbnail and all YouTube details for the original Karthika song.'};
 await save(`${name}-attempt`,ledger);
 try{
  const r=await fetch(`https://api.elevenlabs.io/v1/${endpoint}`,{method:'POST',headers:{'xi-api-key':key,...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(body):body,signal:AbortSignal.timeout(900000)});
  Object.assign(ledger,{httpStatus:r.status,contentType:r.headers.get('content-type'),songId:r.headers.get('song-id')});
  if(!r.ok){const e=await r.json().catch(()=>({}));ledger.state='rejected';ledger.reason=e.detail?.status||'provider_rejected';await save(`${name}-provider-error`,e);await save(`${name}-attempt`,ledger);throw Error(`Provider rejected ${name}: HTTP ${r.status}`);}
  const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/${name}-response.bin`,bytes);Object.assign(ledger,{state:'completed',bytes:bytes.length,completedAt:new Date().toISOString()});await save(`${name}-attempt`,ledger);return {bytes,ledger};
 }catch(e){if(ledger.state==='submitted'){ledger.state='unknown';await save(`${name}-attempt`,ledger);}throw e;}
}
async function main(){
 await mkdir(root,{recursive:true});let t=0;
 const sections=specs.map(([id,seconds,title,text,image])=>{const s={id,seconds,title,text,image,start:t,end:t+seconds};t+=seconds;return s;});assert.equal(t,280);
 const plan={title:'దీపం దీపం కార్తీక దీపం',subtitle:'కార్తీక మాసం ప్రత్యేక గీతం — శివకేశవుల స్మరణ',channel:'Divine Wisdom Telugu',language:'te',seconds:t,sections,originalLyrics:true,originalMusic:true,externalAudioReference:false,artworkCount:5,welcomeOverlay:true,logoThroughout:true,closingCTA:['subscribe','like','share','comment'],published:false,manualListeningVerified:false};
 await save('plan',plan);await writeFile(`${root}/lyrics-telugu.txt`,sections.map(s=>s.title+'\n'+s.text).join('\n\n')+'\n');
 const mode=process.argv[2];if(mode==='prepare'){console.log(JSON.stringify({stage:'prepared',seconds:t,sections:sections.length}));return;}
 const key=await credential();const sub=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});assert(sub.ok,'Subscription check failed');const a=await sub.json();const remaining=a.character_limit-a.character_count;await save('credit-check',{checkedAt:new Date().toISOString(),tier:a.tier,remainingCredits:remaining,estimatedMusicCredits:4200,estimateBasis:'Existing studio estimate of 900 credits per minute; actual charge not yet reported.'});assert(a.tier!=='free'&&remaining>=6500,'Insufficient included credit headroom');
 if(mode==='check'){console.log(JSON.stringify({tier:a.tier,remainingCredits:remaining}));return;}
 if(mode==='transcribe'||mode==='align'){
  const file=await readFile(`${root}/song.mp3`);const form=new FormData();form.set('file',new Blob([new Uint8Array(file)],{type:'audio/mpeg'}),'karthika-deepam.mp3');
  if(mode==='align')form.set('text',sections.map(s=>s.text).join('\n'));else{form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','false');form.set('timestamps_granularity','word');}
  const {bytes}=await submit(mode,mode==='align'?'forced-alignment':'speech-to-text',form,key,false);await save(mode,JSON.parse(bytes.toString()));console.log(JSON.stringify({stage:mode+'-saved'}));return;
 }
 assert.equal(mode,'generate');
 const positive=['Original Telugu Karthika Masam devotional song celebrating Shiva and Keshava, memorable lyrical South Indian bhajan, lilting 6/8 rhythm at 84 BPM','One warm expressive adult male singer, precise native Telugu diction, intelligible complete consonants and long vowels, natural breaths at complete line boundaries','Comfortable middle register, heartfelt melodic singing and restrained ornamentation, prominent centered lead vocal clearly louder than accompaniment','Bamboo flute, veena, tanpura, soft strings, gentle mridangam and restrained temple bell accents','Start the first sung Telugu line on the first beat at time zero with compelling melodic invocation; maintain continuous coherent music through all sections','Sing every supplied line in order, finish complete words, brief flute responses between complete lines; original melody and original vocal identity','Recurring eight-line refrain always returns to the identical recognizable melodic hook, gentle dynamic lift at final refrain, graceful resolution'];
 const negative=['spoken narration','artist imitation','mumbled words','extra lyrics','omitted lyrics','long instrumental intro','shouting','heavy reverb','rushed syllables','EDM','rap'];
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:sections.map(s=>({text:s.text,duration_ms:s.seconds*1000,positive_styles:[...positive,...(s.id.startsWith('chorus')?['Sing the refrain with the same melody every time; soft ensemble responses behind clear lead']:[])],negative_styles:negative,context_adherence:'high'}))}};
 await save('song-request',request);
 let bytes,ledger;if(await exists('song-attempt.json')){ledger=JSON.parse(await readFile(`${root}/song-attempt.json`,'utf8'));assert.equal(ledger.state,'completed','Existing unresolved song attempt; no automatic retry');bytes=await readFile(`${root}/song-response.bin`);}else{console.log(JSON.stringify({stage:'generating-original-song',seconds:t,estimatedIncludedCredits:4200}));({bytes,ledger}=await submit('song','music/detailed?output_format=mp3_48000_192',request,key));}
 const boundary=/boundary="?([^";\s]+)/i.exec(ledger.contentType||'')?.[1];
 if(!boundary&&/audio\//i.test(ledger.contentType)){await writeFile(`${root}/song.mp3`,bytes);}else{
 assert(boundary,'Missing response boundary');const marker=Buffer.from('--'+boundary);let pos=bytes.indexOf(marker),found=false;
 while(pos>=0){const next=bytes.indexOf(marker,pos+marker.length);if(next<0)break;const part=bytes.subarray(pos+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const head=part.subarray(0,split).toString();let b=part.subarray(split+4);if(b.subarray(-2).toString()==='\r\n')b=b.subarray(0,-2);if(/application\/json/i.test(head))await save('song-metadata',JSON.parse(b.toString()));else if(/audio\//i.test(head)){await writeFile(`${root}/song.mp3`,b);found=true;}}pos=next;}assert(found,'Missing song audio');
 }console.log(JSON.stringify({stage:'song-saved',file:`${root}/song.mp3`}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||e.message?.startsWith('Provider rejected')?e.message:'Karthika production stopped; inspect saved attempts. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
