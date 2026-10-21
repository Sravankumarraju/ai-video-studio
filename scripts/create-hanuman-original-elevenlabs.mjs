import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {credential,submit,save,exists,db,root} from './anjaneya-dandakam-audio.mjs';

const dir='elevenlabs-original-song';
const verses=[
`తొలివెలుగులో నిన్ను తలచాను
మనసు గుడిలో దీపం వెలిగించాను
నిశ్శబ్దంలో నీ దయను విన్నాను
నమ్మకంతో నా అడుగు వేశాను`,
`ఆంజనేయా నా తోడుగా నిలవా
ఆశల దారిలో వెలుగులు నింపవా
సేవను నేర్పే నీ చూపు చాలవా
చిన్న హృదయంలో శాంతిని పంచవా`,
`అలసిన వేళలో ఊపిరి నీవే
తడబడే అడుగుకు ధైర్యము నీవే
పలకరించే ప్రతి మనిషిలో నీవే
పంచిన ప్రేమలో చిరునవ్వు నీవే`,
`ఆంజనేయా నా తోడుగా నిలవా
ఆశల దారిలో వెలుగులు నింపవా
సేవను నేర్పే నీ చూపు చాలవా
చిన్న హృదయంలో శాంతిని పంచవా`,
`మాటలో మాధుర్యం చేతిలో సేవ
మనసులో నిలిచే మంచితనమే పూజ
ఎదుటివారి బాధను పంచే వేళ
నీ సన్నిధిగా మారే ఈ నేల`,
`పొద్దు పొడిచినా చీకటి కమ్మినా
నీ దయ జ్ఞాపకమే నాలో వెలుగవ్వనా
రాముని సేవను బాటగా ఎంచుకుని
ప్రేమను పంచుతూ ముందుకు సాగనా`
];
async function parse(){
  const record=JSON.parse(await readFile(`${root}/${dir}/song-attempt.json`,'utf8'));
  assert(record.state==='completed');
  const bytes=await readFile(`${root}/${dir}/song-response.bin`);
  const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];
  if(!boundary&&/audio\//i.test(record.contentType||'')){
    await writeFile(`${root}/${dir}/song.mp3`,bytes);return;
  }
  assert(boundary,'Missing multipart boundary');
  const marker=Buffer.from('--'+boundary);let position=bytes.indexOf(marker),found=false;
  while(position>=0){
    const next=bytes.indexOf(marker,position+marker.length);if(next<0)break;
    const part=bytes.subarray(position+marker.length,next),split=part.indexOf(Buffer.from('\r\n\r\n'));
    if(split>=0){
      const header=part.subarray(0,split).toString();let body=part.subarray(split+4);
      if(body.subarray(-2).toString()==='\r\n')body=body.subarray(0,-2);
      if(/application\/json/i.test(header))await save(`${dir}/song-metadata`,JSON.parse(body.toString()));
      else if(/audio\//i.test(header)){await writeFile(`${root}/${dir}/song.mp3`,body);found=true;}
    }
    position=next;
  }
  assert(found,'Missing song audio');
}
async function main(){
  await mkdir(`${root}/${dir}`,{recursive:true});
  const text=verses.join('\n\n');
  const style=['Original Telugu devotional melodic song, South Indian acoustic bhajan, steady 92 BPM',
    'One natural warm adult male solo singer, resonant middle register, expressive musical singing, same vocal identity and connected melody throughout',
    'Precise native Telugu diction, complete supplied syllables, clear word boundaries, restrained ornamentation, natural breaths',
    'Close centered foreground lead vocal much louder than gentle mridangam, tanpura, soft harmonium and warm strings',
    'Intimate dry studio sound, gentle devotional energy, graceful melodic resolution at the end'];
  const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,
    composition_plan:{chunks:verses.map((text,i)=>({text,duration_ms:30000,positive_styles:style,
      negative_styles:['spoken narration','choir','vocal doubling','audible echo','heavy reverb','rushed diction','loud percussion','artist imitation'],context_adherence:'high'}))}};
  await writeFile(`${root}/${dir}/lyrics-original-te.txt`,text+'\n');
  await save(`${dir}/plan`,{title:'నీ తోడులో వెలుగు',channelName:'Divine Wisdom Telugu',provider:'ElevenLabs only',
    text,verses,requestedSeconds:180,words:text.split(/\s+/).length,originalLyricsWrittenForThisProduction:true,
    traditionalDandakamReplaced:true,externalAudioReferencesUsed:false,existingMelodyCopied:false,
    licenseNote:'Creator account; commercial use subject to ElevenLabs music terms and output review. Copyright registration or zero claims not guaranteed.',published:false});
  await save(`${dir}/request`,request);
  if(await exists(`${dir}/song.mp3`)){console.log('Original song already saved');return;}
  if(await exists(`${dir}/song-attempt.json`)){
    const old=JSON.parse(await readFile(`${root}/${dir}/song-attempt.json`,'utf8'));
    assert(old.state==='completed','Existing generation attempt: inspect state; no automatic retry');await parse();return;
  }
  const key=await credential();
  const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(r.ok,'Subscription check failed');const account=await r.json();
  const remaining=Number(account.character_limit)-Number(account.character_count);
  assert(account.tier==='creator'&&remaining>=20000,'Creator account with sufficient included credits required; no overage');
  await save(`${dir}/credit-check`,{tier:account.tier,remainingCredits:remaining});
  await submit(`${dir}/song`,'music/detailed?output_format=mp3_48000_192',request,key,true,
    'User requested ElevenLabs only and then asked to do without copyright; create genuinely new Telugu devotional lyrics and original music, without submitting the previously blocked Dandakam or any external recording.');
  await parse();console.log(JSON.stringify({song:`${root}/${dir}/song.mp3`,originalWords:text.split(/\s+/).length,requestedSeconds:180}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Original song generation stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
