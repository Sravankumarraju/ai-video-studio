import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {credential,submit,save,read,exists,db,root} from './anjaneya-dandakam-audio.mjs';

async function main(){
  const source=(await readFile(`${root}/lyrics-supplied.txt`,'utf8')).trim();
  const original=await read('plan');
  const blocks=source.split(/\r?\n\s*\r?\n/);
  const batches=[];
  let current=[];
  for(const text of blocks){
    if(current.length&&[...current,text].join('\n\n').length>900){batches.push(current.join('\n\n'));current=[];}
    current.push(text);
  }
  if(current.length)batches.push(current.join('\n\n'));
  assert.equal(batches.join('\n\n'),source);
  const plan={title:'శ్రీ ఆంజనేయ దండకం',kind:'Spoken devotional recitation, not a sung composition',
    authorization:'User clarified: not a complete song, speak like the earlier Hanuman Chalisa; create images and readable highlighted Telugu captions.',
    voiceId:original.narrationVoiceId,model:original.narrationModel,language:'te',
    batches:batches.map((text,index)=>({index,text,stem:`recitation-${String(index).padStart(2,'0')}`})),
    textPreservedExactly:true,words:source.split(/\s+/).length,playbackTempo:.90,captionFontSize:96,
    backingMusic:false,existingBookendsReused:true,published:false};
  await save('recitation-plan',plan);
  if(process.argv[2]==='prepare'){console.log(JSON.stringify({batches:batches.length,words:plan.words}));return;}
  assert(process.argv[2]==='generate','Choose prepare or generate');
  const key=await credential();
  const headers={'xi-api-key':key};
  const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(30000)});
  assert(response.ok,'Credit check failed');
  const info=await response.json();
  const remaining=Number(info.character_limit)-Number(info.character_count);
  assert(info.tier!=='free'&&remaining>=source.length*2+2000,'Insufficient included credits; no overage');
  await save('recitation-credit-check',{remainingCredits:remaining,tier:info.tier});
  console.log(JSON.stringify({batches:batches.length,words:plan.words,remainingCredits:remaining}));
  for(const batch of plan.batches){
    if(await exists(`${batch.stem}.mp3`)&&await exists(`${batch.stem}-alignment.json`))continue;
    const request={inputs:[{text:batch.text,voice_id:plan.voiceId}],model_id:plan.model,language_code:plan.language,
      ...(batch.index?{previous_text:batches[batch.index-1].slice(-100)}:{}),
      ...(batch.index+1<batches.length?{next_text:batches[batch.index+1].slice(0,100)}:{})};
    await save(`${batch.stem}-request`,request);
    let attemptStem=batch.stem;
    if(await exists(`${batch.stem}-attempt.json`)){
      const previous=await read(`${batch.stem}-attempt`);
      assert(previous.state==='rejected'&&previous.httpStatus===422,'Inspect existing attempt before retrying');
      attemptStem+='-corrected';
    }
    const bytes=await submit(attemptStem,'text-to-dialogue/with-timestamps',request,key,true,plan.authorization);
    const result=JSON.parse(bytes.toString());
    assert(result.audio_base64&&result.alignment,'Missing recitation audio/timestamps');
    await writeFile(`${root}/${batch.stem}.mp3`,Buffer.from(result.audio_base64,'base64'));
    await save(`${batch.stem}-alignment`,result.alignment);
    assert.equal(result.alignment.characters.join(''),batch.text,'Unexpected recitation text alignment');
    const a=result.alignment;
    const flagged=[];
    for(const match of batch.text.matchAll(/\S+/g)){
      const start=Math.min(...a.character_start_times_seconds.slice(match.index,match.index+match[0].length));
      const end=Math.max(...a.character_end_times_seconds.slice(match.index,match.index+match[0].length));
      if(end-start<.02)flagged.push(match[0]);
    }
    await save(`${batch.stem}-checks`,{exactAlignmentText:true,words:batch.text.split(/\s+/).length,collapsedWords:flagged,pronunciationListeningReviewPending:true});
    assert(!flagged.length,'Recitation contains collapsed words; inspect before rendering');
  }
}
main().catch(error=>{console.error(error instanceof assert.AssertionError||String(error.message).startsWith('Provider rejected')?error.message:'Recitation stage failed; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
