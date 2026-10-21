import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {credential,submit,save,exists,db,root} from './anjaneya-dandakam-audio.mjs';

async function main(){
  if(await exists('instrumental-v2.mp3')){console.log('Saved instrumental already available');return;}
  const request={model_id:'music_v2_5',music_length_ms:245000,force_instrumental:true,
    prompt:'Compose a completely original instrumental South Indian devotional accompaniment, powerful uplifting reverent mood, steady 92 BPM. Warm harmonium and tanpura, gentle pakhawaj with soft tabla and dhol, tasteful cinematic strings, sparse temple bells and occasional bamboo flute responses. Clear restrained midrange, warm controlled bass. This is a quiet backing bed for a clearly spoken male Telugu devotional recitation. Leave ample space for speech, no busy lead melody and no overpowering drums. Brief four second musical introduction, then consistent soft pulse with gentle swells between sections, graceful peaceful ending. Original melody and arrangement, clean warm studio sound and very light room ambience. Entirely instrumental: absolutely no singing, no spoken words, no chants, no choir and no vocal samples.'};
  await save('instrumental-v2-request',request);
  const key=await credential();
  const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(response.ok,'Subscription check failed');
  const info=await response.json(),remaining=Number(info.character_limit)-Number(info.character_count);
  assert(info.tier!=='free'&&remaining>=10000,'Insufficient included credits; no overage');
  await save('instrumental-v2-credit-check',{remainingCredits:remaining,tier:info.tier});
  const bytes=await submit('instrumental-v2','music?output_format=mp3_48000_192',request,key,true,
    'User requested a musical style similar to the earlier Hanuman Chalisa and more powerful illustrations. Generate one original instrumental accompaniment for the already-created spoken recitation; no new sung lyrics.');
  assert(bytes.length>10000,'Invalid instrumental response');
  await writeFile(`${root}/instrumental-v2.mp3`,bytes);
  console.log(JSON.stringify({file:`${root}/instrumental-v2.mp3`,seconds:245,scope:'Original instrumental only'}));
}
main().catch(error=>{console.error(error instanceof assert.AssertionError||String(error.message).startsWith('Provider rejected')?error.message:'Instrumental generation failed; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
