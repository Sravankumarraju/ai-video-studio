import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {credential,submit,save,exists,db,root} from './anjaneya-dandakam-audio.mjs';

const name='song-style-v6';
const url='https://ai-music-tracks.s3.us-east-1.amazonaws.com/9d4f7012-6ffa-405f-bf3c-9ea14646373d/d1d7bb9b-ef82-4f3d-80b5-bf095851a29e.wav';
async function main(){
  // Save the generated production asset for analysis and future assembly.
  if(!await exists(`${name}/sung-sample.wav`)){
    const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
    assert(response.ok,'Could not save generated music asset');
    const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length>10000);
    await writeFile(`${root}/${name}/sung-sample.wav`,bytes);
  }
  const generation=JSON.parse(await readFile(`${root}/${name}/generation.json`,'utf8'));
  generation.status='completed';generation.audioUrl=url;generation.durationSeconds=35.94441666666667;
  await save(`${name}/generation`,generation);
  if(await exists(`${name}/transcript.json`)){console.log(await readFile(`${root}/${name}/transcript.json`,'utf8'));return;}
  const key=await credential();
  const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(r.ok,'Credit check failed');const info=await r.json();
  const remaining=Number(info.character_limit)-Number(info.character_count);
  assert(info.tier!=='free'&&remaining>=10000,'Insufficient included credits; no overage');
  await save(`${name}/transcription-credit-check`,{remainingCredits:remaining,tier:info.tier});
  const form=new FormData();form.set('file',new Blob([new Uint8Array(await readFile(`${root}/${name}/sung-sample.wav`))],{type:'audio/wav'}),'sung-sample.wav');
  form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','true');form.set('timestamps_granularity','word');
  const bytes=await submit(`${name}/transcription`,'speech-to-text',form,key,false,'Check whether the newly generated sung sample actually contains the requested Telugu words before presenting it as a successful performance.');
  const transcript=JSON.parse(bytes.toString());await save(`${name}/transcript`,transcript);
  console.log(JSON.stringify({text:transcript.text,words:transcript.words?.length,language:transcript.language_code}));
}
main().catch(error=>{console.error(error instanceof assert.AssertionError||String(error.message).startsWith('Provider rejected')?error.message:'Sung-sample check stopped; inspect saved state. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
