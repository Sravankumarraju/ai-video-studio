import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {credential,submit,save,read,exists,db,root} from './anjaneya-dandakam-audio.mjs';

const prefix='reference-v4';
const direction='[sings] [rhythmic devotional chanting] [reverent, projected clear voice]';
async function main(){
  assert(['sample','full'].includes(process.argv[2]),'Choose sample or full');
  await mkdir(`${root}/${prefix}`,{recursive:true});
  const text=(await readFile(`${root}/lyrics-supplied.txt`,'utf8')).trim();
  const blocks=text.split(/\r?\n\s*\r?\n/);
  const original=await read('plan');
  const batches=[blocks[0]];
  let group=[];
  for(const block of blocks.slice(1)){
    if(group.length&&[...group,block].join('\n\n').length>800){batches.push(group.join('\n\n'));group=[];}
    group.push(block);
  }
  if(group.length)batches.push(group.join('\n\n'));
  assert.equal(batches.join('\n\n'),text);
  const plan={referenceUrl:'https://www.youtube.com/watch?v=oNb8mqluP44',
    target:'Energetic male melodic devotional chanting with crisp Telugu, flowing dandakam rhythm, prominent lead over Indian percussion',
    sourceObservation:'Reference analysis identifies melodic chanting from 0:06 to 3:29, not ordinary narration. Deity image changes, slow zooms and cross-dissolves, white Telugu lyrics over a dark gradient.',
    vocalDirection:direction,voiceId:original.narrationVoiceId,model:'eleven_v4',
    originalPerformance:true,referenceAudioCopied:false,singerIdentityImitated:false,
    authorization:'User supplied the YouTube reference and requested a matching general musical and visual style; regenerate vocal delivery as melodic chanting rather than reusing plain narration.',
    batches:batches.map((text,index)=>({index,stem:`chant-${String(index).padStart(2,'0')}`,text})),
    exactPrayerWords:text.split(/\s+/).length,playbackTempo:1.0,deliveryListeningReviewPending:true,published:false};
  await save(`${prefix}/plan`,plan);
  const key=await credential();
  const subResponse=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(subResponse.ok,'Credit check failed');
  const info=await subResponse.json();const remaining=Number(info.character_limit)-Number(info.character_count);
  assert(info.tier!=='free'&&remaining>=text.length*2+2000,'Insufficient included credits; no overage');
  await save(`${prefix}/credit-check`,{remainingCredits:remaining,tier:info.tier});
  const work=process.argv[2]==='sample'?plan.batches.slice(0,1):plan.batches;
  console.log(JSON.stringify({mode:process.argv[2],batches:work.length,remainingCredits:remaining}));
  for(const batch of work){
    const stem=`${prefix}/${batch.stem}`;
    if(await exists(`${stem}.mp3`)&&await exists(`${stem}-alignment.json`))continue;
    const tagged=direction+'\n'+batch.text.split('\n\n').join('\n\n'+direction+'\n');
    const request={inputs:[{text:tagged,voice_id:plan.voiceId}],model_id:plan.model,language_code:'te'};
    await save(`${stem}-request`,request);
    const bytes=await submit(stem,'text-to-dialogue/with-timestamps',request,key,true,plan.authorization);
    const result=JSON.parse(bytes.toString());assert(result.audio_base64&&result.alignment,'Missing audio/timestamps');
    await writeFile(`${root}/${stem}.mp3`,Buffer.from(result.audio_base64,'base64'));
    await save(`${stem}-raw-alignment`,result.alignment);
    // Remove only delivery tags from the timestamp map; never prayer text.
    const raw=result.alignment;const full=raw.characters.join('');
    const mask=new Set();for(const match of full.matchAll(/\[[^\]]*\]/g))for(let j=match.index;j<match.index+match[0].length;j++)mask.add(j);
    let indexes=[];for(let j=0;j<full.length;j++)if(!mask.has(j))indexes.push(j);
    while(indexes.length&&/\s/.test(full[indexes[0]]))indexes.shift();
    while(indexes.length&&/\s/.test(full[indexes.at(-1)]))indexes.pop();
    const retained=indexes.map(j=>full[j]).join('');
    assert.equal(retained.replace(/\s+/g,' '),batch.text.replace(/\s+/g,' '),'Prayer word sequence changed');
    const alignment={characters:indexes.map(j=>raw.characters[j]),
      character_start_times_seconds:indexes.map(j=>raw.character_start_times_seconds[j]),
      character_end_times_seconds:indexes.map(j=>raw.character_end_times_seconds[j])};
    await save(`${stem}-alignment`,alignment);
    const flags=[];
    for(const word of retained.matchAll(/\S+/g)){
      const a=Math.min(...alignment.character_start_times_seconds.slice(word.index,word.index+word[0].length));
      const b=Math.max(...alignment.character_end_times_seconds.slice(word.index,word.index+word[0].length));
      if(b-a<.02)flags.push(word[0]);
    }
    const spans=[...full.matchAll(/\[[^\]]*\]/g)].map(m=>({tag:m[0],seconds:Math.max(...raw.character_end_times_seconds.slice(m.index,m.index+m[0].length))-Math.min(...raw.character_start_times_seconds.slice(m.index,m.index+m[0].length))}));
    await save(`${stem}-checks`,{words:batch.text.split(/\s+/).length,collapsedWords:flags,tagTiming:spans,
      deliveryListeningReviewPending:true,melodicChantingNotAutomaticallyVerified:true});
    assert(!flags.length,'Collapsed prayer words require review');
    console.log(JSON.stringify({batch:batch.index,words:batch.text.split(/\s+/).length,saved:true,tagSpans:spans}));
  }
}
main().catch(error=>{console.error(error instanceof assert.AssertionError||String(error.message).startsWith('Provider rejected')?error.message:'Chant generation stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
