import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {credential,submit,save,exists,db,root} from './anjaneya-dandakam-audio.mjs';
const dir='vignanam-normal-reading';
async function main(){
  await mkdir(`${root}/${dir}`,{recursive:true});
  const reference=await readFile(`${root}/elevenlabs-only/vignanam-reference-te.txt`,'utf8');
  // Read the site's main text; preserve bracket alternatives separately in the reference.
  const text=reference.replace(/\[[^\]]*\]/g,'').replace(/\(([^)]*)\)/g,'$1').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
  const lines=text.split('\n'),batches=[];let group=[];
  for(const line of lines){
    if(group.length&&[...group,line].join('\n').length>750){batches.push(group.join('\n'));group=[];}
    group.push(line);
  }
  if(group.length)batches.push(group.join('\n'));
  assert(batches.join('\n')===text);
  const original=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));
  const plan={title:'శ్రీ ఆంజనేయ దండకం',provider:'ElevenLabs only',kind:'Normal spoken Telugu reading',
    source:'https://vignanam.org/telugu/anjaneya-dandakam.html',text:batches.join('\n\n'),verses:batches,
    voiceId:original.narrationVoiceId,model:original.narrationModel,words:text.split(/\s+/).length,
    bracketedAlternativeReadingsOmitted:true,mainTextWordOrderPreserved:true,music:false,singing:false,
    playbackTempo:1,published:false,
    batches:batches.map((text,index)=>({index,stem:`reading-${String(index).padStart(2,'0')}`,text}))};
  await save(`${dir}/plan`,plan);await writeFile(`${root}/${dir}/reading-text-te.txt`,plan.text+'\n');
  const key=await credential();const credits=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(credits.ok,'Credit check failed');const account=await credits.json();
  const remaining=Number(account.character_limit)-Number(account.character_count);
  assert(account.tier!=='free'&&remaining>=text.length*2+2000,'Insufficient included credits; no overage');
  await save(`${dir}/credit-check`,{tier:account.tier,remainingCredits:remaining});
  console.log(JSON.stringify({batches:batches.length,words:plan.words,remainingCredits:remaining}));
  for(const batch of plan.batches){
    const stem=`${dir}/${batch.stem}`;
    if(await exists(`${stem}.mp3`)&&await exists(`${stem}-alignment.json`))continue;
    const request={inputs:[{text:batch.text,voice_id:plan.voiceId}],model_id:plan.model,language_code:'te',
      ...(batch.index?{previous_text:batches[batch.index-1].slice(-100)}:{}),
      ...(batch.index+1<batches.length?{next_text:batches[batch.index+1].slice(0,100)}:{})};
    await save(`${stem}-request`,request);
    const bytes=await submit(stem,'text-to-dialogue/with-timestamps',request,key,true,
      'User explicitly changed the task to normal reading, not a song. Read Vignanam main-text Dandakam using plain Telugu speech, without music or singing.');
    const result=JSON.parse(bytes.toString());assert(result.audio_base64&&result.alignment);
    const a=result.alignment;assert(a.characters.join('')===batch.text,'Unexpected text alignment');
    const collapsed=[];
    for(const m of batch.text.matchAll(/\S+/g)){
      const start=Math.min(...a.character_start_times_seconds.slice(m.index,m.index+m[0].length));
      const end=Math.max(...a.character_end_times_seconds.slice(m.index,m.index+m[0].length));
      if(end-start<.02)collapsed.push(m[0]);
    }
    await writeFile(`${root}/${stem}.mp3`,Buffer.from(result.audio_base64,'base64'));
    await save(`${stem}-alignment`,a);await save(`${stem}-checks`,{exactTextAlignment:true,collapsedWords:collapsed,pronunciationListeningReviewPending:true});
    assert(collapsed.length===0,'Collapsed words require review before assembly');
  }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Normal reading stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
